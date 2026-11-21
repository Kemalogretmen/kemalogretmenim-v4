(function() {
  'use strict';

  const NORMS = {
    1: { min: 40, hedef: 70, iyi: 90, maksimum: 180 },
    2: { min: 60, hedef: 90, iyi: 110, maksimum: 200 },
    3: { min: 80, hedef: 110, iyi: 130, maksimum: 220 },
    4: { min: 100, hedef: 130, iyi: 155, maksimum: 240 },
    5: { min: 120, hedef: 150, iyi: 175, maksimum: 260 },
    6: { min: 140, hedef: 165, iyi: 195, maksimum: 280 },
    7: { min: 155, hedef: 185, iyi: 215, maksimum: 300 },
    8: { min: 170, hedef: 200, iyi: 235, maksimum: 320 },
  };

  const CONFIG = window.kemalSiteStore
    ? (window.kemalSiteStore.getReadingConfig ? window.kemalSiteStore.getReadingConfig() : window.kemalSiteStore.getConfig())
    : {
      supabaseUrl: 'https://mwxcvlyrkptxrwgkmqum.supabase.co',
      supabaseAnonKey: 'sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY',
    };

  let readingClient;
  function getReadingClient() {
    readingClient ||= window.kemalUserAuth?.getClient?.() ||
      window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    return readingClient;
  }
  const PENDING_RESULTS_KEY = 'kemal_okuma_pending_results_v1';
  const LEVEL_LABELS = {
    baslangic: 'Başlangıç',
    gelisen: 'Gelişen',
    akici: 'Akıcı',
    ileri: 'İleri',
  };
  const TEXT_TYPE_LABELS = {
    hikaye: 'Hikaye',
    bilgilendirici: 'Bilgilendirici',
    masal: 'Masal',
    siir: 'Şiir',
    diyalog: 'Diyalog',
    egzersiz: 'Egzersiz',
  };

  function stripHtml(value) {
    return (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function parseOptionalJson(value) {
    if (!value) {
      return {};
    }
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  }

  function normalizeTrainingProfile(value) {
    const raw = parseOptionalJson(value);
    const profile = Object.assign({
      seviye: 'gelisen',
      tur: 'hikaye',
      tema: '',
      kazanim: '',
      tahmini_dk: 3,
      rsvp: {},
      gorsel: {
        url: '',
        alt: '',
        aciklama: '',
        konum: 'none',
        fit: 'cover',
      },
    }, raw || {});
    const visual = Object.assign({
      url: '',
      alt: '',
      aciklama: '',
      konum: 'none',
      fit: 'cover',
    }, profile.gorsel || {});
    profile.seviye = LEVEL_LABELS[profile.seviye] ? profile.seviye : 'gelisen';
    profile.tur = TEXT_TYPE_LABELS[profile.tur] ? profile.tur : 'hikaye';
    profile.tema = String(profile.tema || '').trim();
    profile.kazanim = String(profile.kazanim || '').trim();
    profile.tahmini_dk = Math.max(1, Math.min(30, parseInt(profile.tahmini_dk, 10) || 3));
    visual.url = String(visual.url || '').trim();
    visual.alt = String(visual.alt || '').trim();
    visual.aciklama = String(visual.aciklama || '').trim();
    visual.konum = ['none', 'top', 'cover'].includes(visual.konum) ? visual.konum : (visual.url ? 'top' : 'none');
    visual.fit = visual.fit === 'contain' ? 'contain' : 'cover';
    if (!visual.url) {
      visual.konum = 'none';
    }
    profile.gorsel = visual;
    return profile;
  }

  function getUserLocationLine(kullanici) {
    return [
      kullanici && kullanici.il ? kullanici.il : '',
      kullanici && kullanici.okul ? kullanici.okul : '',
    ].filter(Boolean).join(' · ');
  }

  function getRuntime() {
    const attemptId = sessionStorage.getItem('okuma_attempt_id') || '';
    const selection = parseOptionalJson(sessionStorage.getItem('okuma_secili_akis')) || {};
    const flow = attemptId && selection.attemptId === attemptId ? selection.flow : '';
    const getFlow = metin => flow || metin.readingFlow ||
      (metin.goruntuleme_modu === 'kelime' ? (metin.tikla_mod ? 'kelime-tikla' : 'kelime-otomatik') : 'tam');
    const main = {
      metin: JSON.parse(sessionStorage.getItem('okuma_metin') || 'null'),
      kullanici: JSON.parse(sessionStorage.getItem('okuma_kullanici') || 'null'),
      sureSn: parseFloat(sessionStorage.getItem('okuma_sure_sn') || '0'),
      wpm: parseInt(sessionStorage.getItem('okuma_wpm') || '0', 10),
      cevaplar: JSON.parse(sessionStorage.getItem('okuma_cevaplar') || 'null'),
      attemptId: attemptId,
      flow: flow,
    };

    if (main.metin && main.kullanici) {
      main.flow = getFlow(main.metin);
      sessionStorage.setItem('okuma_son_oturum', JSON.stringify({
        metin: main.metin,
        kullanici: main.kullanici,
      }));
      return main;
    }

    const backup = JSON.parse(sessionStorage.getItem('okuma_son_oturum') || 'null');
    if (!backup || !backup.metin || !backup.kullanici) {
      return null;
    }

    return {
      metin: backup.metin,
      kullanici: backup.kullanici,
      sureSn: parseFloat(sessionStorage.getItem('okuma_sure_sn') || '0'),
      wpm: parseInt(sessionStorage.getItem('okuma_wpm') || '0', 10),
      cevaplar: JSON.parse(sessionStorage.getItem('okuma_cevaplar') || 'null'),
      attemptId: attemptId,
      flow: getFlow(backup.metin),
    };
  }

  function getComprehensionSummary(runtime) {
    if (!runtime.cevaplar) {
      return { dogru: 0, yanlis: 0, toplam: 0, yuzde: 0, detay: [] };
    }

    const dogru = runtime.cevaplar.dogru || 0;
    const yanlis = runtime.cevaplar.yanlis || 0;
    const toplam = dogru + yanlis;
    const yuzde = toplam > 0 ? Math.round((dogru / toplam) * 100) : 0;
    const detay = Array.isArray(runtime.cevaplar.detay) ? runtime.cevaplar.detay : [];
    return { dogru: dogru, yanlis: yanlis, toplam: toplam, yuzde: yuzde, detay: detay };
  }

  function getPendingResults() {
    try {
      const raw = localStorage.getItem(PENDING_RESULTS_KEY);
      return dedupePendingResults(raw ? JSON.parse(raw) : []);
    } catch (error) {
      return [];
    }
  }

  function getPayloadAttemptId(payload) {
    return payload && payload.detay_json && payload.detay_json.attempt_id
      ? String(payload.detay_json.attempt_id)
      : '';
  }

  function dedupePendingResults(list) {
    const seenAttemptIds = new Set();
    return (Array.isArray(list) ? list : []).slice().reverse().filter(function(payload) {
      const attemptId = getPayloadAttemptId(payload);
      if (!attemptId) {
        return true;
      }
      if (seenAttemptIds.has(attemptId)) {
        return false;
      }
      seenAttemptIds.add(attemptId);
      return true;
    }).reverse();
  }

  function setPendingResults(list) {
    localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(dedupePendingResults(list || [])));
  }

  function setReadingSaveStatus(state, title, text) {
    const card = document.getElementById('readingSaveStatus');
    if (!card) return;
    const icon = document.getElementById('readingSaveStatusIcon');
    const titleEl = document.getElementById('readingSaveStatusTitle');
    const textEl = document.getElementById('readingSaveStatusText');
    const icons = {
      saving: '⏳',
      saved: '✅',
      queued: '📡',
      error: '⚠️',
    };
    card.dataset.state = state || 'saving';
    if (icon) icon.textContent = icons[state] || icons.saving;
    if (titleEl) titleEl.textContent = title || 'Sonuç kaydı kontrol ediliyor';
    if (textEl) textEl.textContent = text || '';
  }

  function shouldFallbackToDirectInsert(error) {
    const message = String(error && error.message ? error.message : '').toLowerCase();
    const details = String(error && error.details ? error.details : '').toLowerCase();
    const hint = String(error && error.hint ? error.hint : '').toLowerCase();
    const code = String(error && error.code ? error.code : '').toLowerCase();
    const combined = message + ' ' + details + ' ' + hint + ' ' + code;
    return combined.includes('submit_reading_result') ||
      combined.includes('pgrst202') ||
      combined.includes('schema cache') ||
      combined.includes('could not find the function') ||
      combined.includes('permission denied');
  }

  async function insertResultPayloadDirect(client, payload) {
    let response = await client.from('sonuclar').insert(payload);
    if (response.error && response.error.message && response.error.message.includes('detay_json')) {
      const fallbackPayload = Object.assign({}, payload);
      delete fallbackPayload.detay_json;
      response = await client.from('sonuclar').insert(fallbackPayload);
    }
    if (response.error) {
      throw response.error;
    }
    return null;
  }

  async function insertResultPayload(payload) {
    const client = getReadingClient();
    const rpcResponse = await client.rpc('submit_reading_result', { p_payload: payload });
    if (!rpcResponse.error) {
      return rpcResponse.data || null;
    }
    if (shouldFallbackToDirectInsert(rpcResponse.error)) {
      return insertResultPayloadDirect(client, payload);
    }
    throw rpcResponse.error;
  }

  async function flushPendingResults() {
    const pending = getPendingResults();
    if (!pending.length) {
      return { before: 0, after: 0 };
    }

    const remaining = [];
    for (let i = 0; i < pending.length; i += 1) {
      try {
        await insertResultPayload(pending[i]);
      } catch (error) {
        remaining.push(pending[i]);
      }
    }

    setPendingResults(remaining);
    return { before: pending.length, after: remaining.length };
  }


  function isTeacherSession() {
    const auth = window.kemalUserAuth && typeof window.kemalUserAuth.getState === 'function'
      ? window.kemalUserAuth.getState()
      : {};
    return !!(auth && auth.profile && auth.profile.role === 'teacher');
  }

  async function saveResult(runtime, hedefWpm, comprehension, kelimeSayisi) {
    setReadingSaveStatus(
      'saving',
      'Sonucun kaydediliyor',
      'Okuma sonucunu güvenli şekilde sisteme gönderiyoruz.'
    );
    if (sessionStorage.getItem('okuma_karne_kaydedildi') === runtime.attemptId) {
      setReadingSaveStatus(
        'saved',
        'Sonucun sistemde kayıtlı',
        'Bu okuma denemesi daha önce başarıyla kaydedilmiş.'
      );
      return;
    }
    if (isTeacherSession()) {
      setReadingSaveStatus(
        'saved',
        'Öğretmen önizlemesi',
        'Bu ekran öğretmen kontrolü için açıldı; öğrenci adına yeni sonuç kaydı oluşturulmadı.'
      );
      return;
    }

    const payload = {
      ad: runtime.kullanici.ad,
      soyad: runtime.kullanici.soyad,
      sinif: runtime.kullanici.sinif,
      sube: runtime.kullanici.sube,
      metin_id: runtime.metin.id,
      metin_adi: runtime.metin.baslik,
      okuma_suresi_sn: runtime.sureSn,
      kelime_sayisi: kelimeSayisi,
      dakika_kelime: runtime.wpm,
      hedef_hiz: hedefWpm,
      dogru_sayisi: comprehension.dogru,
      yanlis_sayisi: comprehension.yanlis,
      toplam_soru: comprehension.toplam,
      anlama_yuzdesi: comprehension.yuzde,
      detay_json: {
        attempt_status: 'completed',
        attempt_id: runtime.attemptId || '',
        cevaplar: comprehension.detay,
        goruntuleme_modu: runtime.flow ? (runtime.flow === 'tam' ? 'tam' : 'kelime') : runtime.metin.goruntuleme_modu,
        ...(runtime.flow ? { ogrenci_okuma_akisi: runtime.flow } : {}),
        egitim_profili: normalizeTrainingProfile(runtime.metin.egitim_json),
        completed_at: new Date().toISOString(),
        account_uid: runtime.kullanici.accountUid || '',
        email: runtime.kullanici.email || '',
        kullanici_bilgileri: {
          il: runtime.kullanici.il || '',
          okul: runtime.kullanici.okul || '',
        },
      },
    };

    try {
      const currentAttemptId = runtime.attemptId || '';
      const wasQueued = currentAttemptId && getPendingResults().some(function(item) {
        return getPayloadAttemptId(item) === currentAttemptId;
      });

      const flushReport = await flushPendingResults();
      if (wasQueued) {
        const stillQueued = getPendingResults().some(function(item) {
          return getPayloadAttemptId(item) === currentAttemptId;
        });
        if (!stillQueued) {
          sessionStorage.removeItem('okuma_karne_kuyrukta');
          sessionStorage.setItem('okuma_karne_kaydedildi', runtime.attemptId);
          setReadingSaveStatus(
            'saved',
            'Bekleyen sonuç gönderildi',
            'Bağlantı düzeldi ve okuma sonucun sisteme aktarıldı.'
          );
          return;
        }
      }

      await insertResultPayload(payload);
      const clearedCount = flushReport && flushReport.before > flushReport.after
        ? flushReport.before - flushReport.after
        : 0;
      setReadingSaveStatus(
        'saved',
        'Sonucun sisteme kaydedildi',
        clearedCount
          ? 'Okuma sonucun kaydedildi; ayrıca cihazda bekleyen ' + clearedCount + ' eski kayıt da gönderildi.'
          : 'Okuma sonucun güvenli şekilde sisteme işlendi.'
      );
    } catch (error) {
      const pending = getPendingResults();
      pending.push(payload);
      setPendingResults(pending);
      sessionStorage.setItem('okuma_karne_kuyrukta', runtime.attemptId);
      setReadingSaveStatus(
        'queued',
        'Sonucun cihazda güvende',
        'Bağlantı veya izin sorunu nedeniyle sonuç şimdilik cihazda bekliyor; sayfa tekrar açıldığında otomatik gönderilecek.'
      );
      console.warn('Sonuc kaydi gecici olarak yerel kuyruga alindi:', error.message);
      return;
    }

    sessionStorage.removeItem('okuma_karne_kuyrukta');
    sessionStorage.setItem('okuma_karne_kaydedildi', runtime.attemptId);
  }


  function repeatReading(runtime) {
    sessionStorage.setItem('okuma_metin', JSON.stringify(runtime.metin));
    sessionStorage.setItem('okuma_kullanici', JSON.stringify(runtime.kullanici));
    sessionStorage.removeItem('okuma_sure_sn');
    sessionStorage.removeItem('okuma_wpm');
    sessionStorage.removeItem('okuma_secili_akis');
    sessionStorage.removeItem('okuma_cevaplar');
    sessionStorage.removeItem('okuma_karne_kaydedildi');
    sessionStorage.removeItem('okuma_karne_kuyrukta');
    sessionStorage.setItem('okuma_attempt_id', 'attempt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    window.location.href = '/hizli-okuma/oku.html';
  }

  function markReadingCompleted(runtime, hedefWpm, comprehension, kelimeSayisi) {
    if (!window.kemalContentProgress || !runtime || !runtime.metin) {
      return;
    }

    window.kemalContentProgress.markCompleted({
      type: 'reading',
      id: runtime.metin.id,
      title: runtime.metin.baslik,
      href: '/hizli-okuma/index.html?metinId=' + encodeURIComponent(runtime.metin.id),
      grade: runtime.kullanici && runtime.kullanici.sinif ? runtime.kullanici.sinif : '',
      subject: 'okuma-anlama',
      meta: {
        accountUid: runtime.kullanici && runtime.kullanici.accountUid ? runtime.kullanici.accountUid : '',
        email: runtime.kullanici && runtime.kullanici.email ? runtime.kullanici.email : '',
        attemptId: runtime.attemptId || '',
        ...(runtime.flow ? { readingFlow: runtime.flow } : {}),
        ...(runtime.readingAttempts ? { readingAttempts: runtime.readingAttempts } : {}),
        wpm: runtime.wpm || 0,
        targetWpm: hedefWpm || 0,
        wordCount: kelimeSayisi || 0,
        comprehensionPercent: comprehension && comprehension.yuzde ? comprehension.yuzde : 0,
        correct: comprehension && comprehension.dogru ? comprehension.dogru : 0,
        wrong: comprehension && comprehension.yanlis ? comprehension.yanlis : 0,
        total: comprehension && comprehension.toplam ? comprehension.toplam : 0,
        durationSeconds: runtime.sureSn || 0,
        educationProfile: normalizeTrainingProfile(runtime.metin.egitim_json),
        date: new Date().toLocaleDateString('tr-TR'),
        readingResult: {
          ad: runtime.kullanici && runtime.kullanici.ad ? runtime.kullanici.ad : '',
          soyad: runtime.kullanici && runtime.kullanici.soyad ? runtime.kullanici.soyad : '',
          sinif: runtime.kullanici && runtime.kullanici.sinif ? runtime.kullanici.sinif : '',
          sube: runtime.kullanici && runtime.kullanici.sube ? runtime.kullanici.sube : '',
          metin_id: runtime.metin.id,
          metin_adi: runtime.metin.baslik,
          okuma_suresi_sn: runtime.sureSn || 0,
          kelime_sayisi: kelimeSayisi || 0,
          dakika_kelime: runtime.wpm || 0,
          hedef_hiz: hedefWpm || 0,
          dogru_sayisi: comprehension && comprehension.dogru ? comprehension.dogru : 0,
          yanlis_sayisi: comprehension && comprehension.yanlis ? comprehension.yanlis : 0,
          toplam_soru: comprehension && comprehension.toplam ? comprehension.toplam : 0,
          anlama_yuzdesi: comprehension && comprehension.yuzde ? comprehension.yuzde : 0,
          tarih: runtime.readingAttempts?.[0]?.date || new Date().toISOString(),
        },
      },
    });
  }

  function durationLabel(seconds) {
    const total = Math.max(0, Math.round(seconds || 0));
    return total >= 60 ? Math.floor(total / 60) + ' dk ' + (total % 60) + ' sn' : total + ' sn';
  }

  function renderReview(comprehension) {
    const list = document.getElementById('soruDetayList');
    document.getElementById('karneNoReview').textContent = comprehension.detay.length ? '' : comprehension.toplam
      ? 'Bu kayıt için soru ayrıntısı bulunmuyor.' : 'Bu okumada anlama puanı ölçülmedi.';
    comprehension.detay.forEach((item, index) => {
      const correct = item.isDogru ?? item.isDogu;
      const blank = item.secilen === null;
      const li = document.createElement('li');
      li.dataset.reportBlock = '';
      li.dataset.answer = correct ? 'correct' : blank ? 'blank' : 'incorrect';
      const title = document.createElement('strong');
      title.textContent = (index + 1) + '. ' + (item.soru || '');
      const answer = document.createElement('p');
      answer.textContent = (correct ? 'Doğru' : blank ? 'Boş' : 'Yanlış') + ' · Yanıtın: ' + (item.secilenMetin || '—');
      li.append(title, answer);
      if (!correct && item.dogruMetin && item.dogruMetin !== '—') {
        const expected = document.createElement('p');
        expected.textContent = 'Doğru yanıt: ' + item.dogruMetin;
        li.append(expected);
      }
      list.append(li);
    });
  }

  function coach(runtime, comprehension, hasTarget, target, autoPaced) {
    if (!comprehension.toplam) return ['Kısa bir özet yap', (autoPaced ? 'Gösterim temposu kendi okuma hızın değildir. ' : '') +
      'Bu metin için ölçülmüş bir anlama puanı yok. Metni kapatıp ana düşünceyi bir cümleyle söyle, sonra metinden bir ayrıntıyla kontrol et.'];
    if (comprehension.yuzde < 60) return ['Önce anlamı güçlendir', 'Yanlış veya boş bıraktığın bir soruyu seç. Yanıtını destekleyen cümleyi bulup kendi sözlerinle açıkla. İkinci okumada yetişmeye çalışmadan bu bölüme odaklan.'];
    if (comprehension.yuzde < 85) return ['Metinden kanıt bul', 'Bir soruda neden o şıkkı seçtiğini söyle. Sonra metindeki bir cümleyi kanıt olarak göster ve yanıt incelemesinden kontrol et.'];
    if (autoPaced) return ['Şimdi kendi temponu dene', 'Anlama sorularında iyi bir sonuç aldın. Metni tam metin görünümünde yeniden okuyup durakları ve geri dönüşleri kendin belirle.'];
    if (hasTarget && runtime.wpm < target) return ['Anlamı koruyarak akıcı oku', 'Anlama sonucun güçlü. Bir paragrafı önce sessizce, sonra anlam gruplarında kısa duraklarla sesli oku. İkinci denemede anlamı ve rahatlığı birlikte gözle.'];
    return ['Okuduğunu yorumla', 'Metnin ana fikrini iki cümlede anlat. Ardından “Yazar bunu hangi örnekle destekliyor?” sorusuna metinden bir kanıtla cevap ver.'];
  }

  async function compareReadings(runtime, snapshot, archive) {
    const auth = window.kemalUserAuth;
    if (!runtime.kullanici.accountUid || !auth?.ready || !snapshot.id) return;
    const state = await auth.ready();
    const userId = state?.user?.id;
    if (userId !== runtime.kullanici.accountUid || state?.profile?.role !== 'student') return;
    const tools = window.ReadingReportTools;
    const local = window.kemalContentProgress?.listRecords() || [];
    const current = { ...snapshot, title: runtime.metin.baslik };
    const past = tools.previousAttempts(local, userId, current);
    tools.renderHistory(past, current);
    if (!archive) {
      const currentRecord = local.find(record => record.type === 'reading' && String(record.id) === String(runtime.metin.id));
      const own = currentRecord ? tools.previousAttempts([currentRecord], userId, current) : [];
      // Keep earlier attempts in the existing per-text progress row; dashboards still see one row per text.
      runtime.readingAttempts = [snapshot, ...own.map(({ title, ...item }) => item)];
    }
    try {
      const query = auth.getClient().from('user_content_progress')
        .select('user_id,content_type,content_id,status,title,detail_json,completed_at,updated_at')
        .eq('user_id', userId).eq('content_type', 'reading').eq('status', 'completed')
        .order('completed_at', { ascending: false }).limit(24);
      const { data, error } = await (typeof query.abortSignal === 'function' ? query.abortSignal(AbortSignal.timeout(4500)) : query);
      if (error || auth.getState()?.user?.id !== userId) return;
      const all = tools.previousAttempts([...local, ...(data || [])], userId, current);
      tools.renderHistory(all, current);
      if (!archive && data?.length) {
        const matchingRows = data.filter(row => String(row.content_id) === String(runtime.metin.id));
        const snapshots = tools.previousAttempts([...matchingRows, ...local.filter(row => String(row.id) === String(runtime.metin.id))], userId, current);
        runtime.readingAttempts = [snapshot, ...snapshots.map(({ title, ...item }) => item)];
      }
    } catch (_) { /* Previously synced readings remain available locally. */ }
  }

  function render(runtime) {
    const byId = id => document.getElementById(id);
    const norm = NORMS[runtime.kullanici.sinif] || NORMS[4];
    const configured = Number(runtime.metin.hedef_hiz);
    const target = configured > 0 ? configured : norm.hedef;
    const words = Number(runtime.metin.kelime_sayisi) || stripHtml(runtime.metin.icerik_html || runtime.metin.icerik || '').split(/\s+/).filter(Boolean).length;
    const comprehension = getComprehensionSummary(runtime);
    const blank = comprehension.detay.filter(item => item.secilen === null).length;
    const autoPaced = runtime.flow === 'kelime-otomatik';
    const archive = new URLSearchParams(window.location.search).get('arsiv') === '1';
    const storedDate = archive ? runtime.metin.resultDate : sessionStorage.getItem('okuma_baslangic_tarihi');
    const day = storedDate && Number.isFinite(Date.parse(storedDate)) ? new Date(storedDate) : new Date();
    const locationLine = getUserLocationLine(runtime.kullanici);
    const grade = runtime.kullanici.sinif ? runtime.kullanici.sinif + '. sınıf' : '';

    byId('karneAd').textContent = [runtime.kullanici.ad, runtime.kullanici.soyad].filter(Boolean).join(' ');
    byId('karneSinifSube').textContent = [grade, runtime.kullanici.sube ? runtime.kullanici.sube + ' şubesi' : '', locationLine].filter(Boolean).join(' · ');
    byId('karneTarih').dateTime = day.toISOString();
    byId('karneTarih').textContent = day.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    byId('karneMetinAdi').textContent = runtime.metin.baslik;
    byId('karneDuration').textContent = durationLabel(runtime.sureSn);
    byId('karneWords').textContent = words ? words + ' kelime' : 'Kelime sayısı yok';
    byId('karneWpm').textContent = runtime.wpm > 0 ? String(runtime.wpm) : '—';
    byId('anlamaYuzde').textContent = comprehension.toplam ? '%' + comprehension.yuzde : '—';
    byId('karneAnswers').textContent = comprehension.toplam
      ? comprehension.dogru + '/' + comprehension.toplam + ' doğru · ' + Math.max(0, comprehension.yanlis - blank) + ' yanlış' + (blank ? ' · ' + blank + ' boş' : '')
      : 'Ölçülmedi';
    if (comprehension.toplam && comprehension.detay.length === comprehension.toplam) {
      const chart = byId('karneAnswerBreakdown');
      const legend = chart.querySelector('.rk-answer-legend');
      const segments = chart.querySelectorAll('.rk-answer-track span');
      const counts = [comprehension.dogru, Math.max(0, comprehension.yanlis - blank), blank];
      counts.forEach((value, index) => {
        segments[index].style.width = (value / comprehension.toplam * 100) + '%';
        const item = document.createElement('li');
        item.textContent = value + ' ' + ['doğru', 'yanlış', 'boş'][index];
        legend.append(item);
      });
      chart.hidden = false;
    }

    if (autoPaced) {
      byId('karneHizBaslik').textContent = 'Gösterim temposu';
      byId('karneHizEtiket').textContent = 'Gösterim temposu';
      byId('hizBarWrap').hidden = true;
      byId('karneAkisNotu').hidden = false;
    } else {
      const maximum = Math.max(1, runtime.wpm, target) * 1.15;
      const difference = runtime.wpm - target;
      byId('karneHizBaslik').textContent = configured > 0 ? 'Metnin hız hedefi' : 'Sınıf için referans hedef';
      byId('karneHedef').textContent = 'Hedef: ' + target + ' k/dk';
      byId('karneTempoValue').textContent = 'Bu okuma: ' + (runtime.wpm || '—') + ' k/dk';
      byId('hizBarHedef').style.width = (target / maximum * 100) + '%';
      byId('hizBarFill').style.width = (Math.max(0, runtime.wpm) / maximum * 100) + '%';
      byId('karneTempoNote').textContent = runtime.wpm <= 0 ? 'Hız ölçülemedi.' : difference === 0
        ? 'Bu okumada hedefe ulaştın.' : 'Bu okuma hedefin ' + Math.abs(difference) + ' k/dk ' + (difference > 0 ? 'üzerinde.' : 'altında.');
    }

    renderReview(comprehension);
    const [heading, advice] = coach(runtime, comprehension, configured > 0, target, autoPaced);
    byId('donutBaslik').textContent = heading;
    byId('donutMetin').textContent = advice;
    const profile = normalizeTrainingProfile(runtime.metin.egitim_json);
    if (profile.kazanim || profile.tema) {
      byId('karneFocus').textContent = 'Çalışma odağı: ' + (profile.kazanim || profile.tema);
      byId('karneFocus').hidden = false;
    }
    const tools = window.ReadingReportTools;
    const summary = ['Okuma Karnesi · ' + runtime.metin.baslik, 'Süre: ' + durationLabel(runtime.sureSn),
      (autoPaced ? 'Gösterim temposu: ' : 'Okuma hızı: ') + (runtime.wpm ? runtime.wpm + ' k/dk' : 'ölçülmedi'),
      'Anlama: ' + (comprehension.toplam ? '%' + comprehension.yuzde + ' (' + comprehension.dogru + '/' + comprehension.toplam + ')' : 'ölçülmedi')].join('\n');
    tools.bindExport();
    tools.bindShare(summary);
    byId('karneRepeat').addEventListener('click', () => {
      if (archive) window.location.href = '/hizli-okuma/index.html?metinId=' + encodeURIComponent(runtime.metin.id);
      else repeatReading(runtime);
    });
    const snapshot = { id: runtime.attemptId, date: day.toISOString(), mode: runtime.flow, speed: runtime.wpm,
      comprehension: comprehension.toplam ? comprehension.yuzde : null };
    if (archive) setReadingSaveStatus('saved', 'Arşivdeki karne', 'Bu görüntüleme yeni bir sonuç kaydı oluşturmaz.');
    else saveResult(runtime, target, comprehension, words);
    compareReadings(runtime, snapshot, archive).catch(() => {}).finally(() => {
      if (!archive && !isTeacherSession()) markReadingCompleted(runtime, target, comprehension, words);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    const runtime = getRuntime();
    if (!runtime || !runtime.metin || !runtime.kullanici) {
      window.location.href = '/hizli-okuma/index.html';
      return;
    }
    render(runtime);
  });
})();
