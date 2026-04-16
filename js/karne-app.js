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

  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  const PENDING_RESULTS_KEY = 'kemal_okuma_pending_results_v1';
  const READING_RESULT_ID_KEY = 'kemal_okuma_result_id';

  function stripHtml(value) {
    return (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function escHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function getUserLocationLine(kullanici) {
    return [
      kullanici && kullanici.il ? kullanici.il : '',
      kullanici && kullanici.okul ? kullanici.okul : '',
    ].filter(Boolean).join(' · ');
  }

  function getRuntime() {
    const main = {
      metin: JSON.parse(sessionStorage.getItem('okuma_metin') || 'null'),
      kullanici: JSON.parse(sessionStorage.getItem('okuma_kullanici') || 'null'),
      sureSn: parseFloat(sessionStorage.getItem('okuma_sure_sn') || '0'),
      wpm: parseInt(sessionStorage.getItem('okuma_wpm') || '0', 10),
      cevaplar: JSON.parse(sessionStorage.getItem('okuma_cevaplar') || 'null'),
      attemptId: sessionStorage.getItem('okuma_attempt_id') || '',
    };

    if (main.metin && main.kullanici) {
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
      attemptId: sessionStorage.getItem('okuma_attempt_id') || '',
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
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function setPendingResults(list) {
    localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(list || []));
  }

  async function insertResultPayload(payload) {
    let response = await client.from('sonuclar').insert(payload).select('id').maybeSingle();
    if (response.error && response.error.message && response.error.message.includes('detay_json')) {
      const fallbackPayload = Object.assign({}, payload);
      delete fallbackPayload.detay_json;
      response = await client.from('sonuclar').insert(fallbackPayload).select('id').maybeSingle();
    }
    if (response.error) {
      throw response.error;
    }
    return response.data || null;
  }

  async function updateResultPayload(id, payload) {
    let response = await client.from('sonuclar').update(payload).eq('id', id).select('id').maybeSingle();
    if (response.error && response.error.message && response.error.message.includes('detay_json')) {
      const fallbackPayload = Object.assign({}, payload);
      delete fallbackPayload.detay_json;
      response = await client.from('sonuclar').update(fallbackPayload).eq('id', id).select('id').maybeSingle();
    }
    if (response.error) {
      throw response.error;
    }
    if (!response.data || !response.data.id) {
      throw new Error('Baslatilan okuma kaydi guncellenemedi.');
    }
  }

  async function flushPendingResults() {
    const pending = getPendingResults();
    if (!pending.length) {
      return;
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
  }

  function createStableIndex(base, listLength) {
    let hash = 0;
    for (let i = 0; i < base.length; i += 1) {
      hash = ((hash << 5) - hash) + base.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % listLength;
  }

  function chooseMessage(list, seed) {
    return list[createStableIndex(seed, list.length)];
  }

  function getFeedback(runtime, hedefWpm, comprehension) {
    const ad = runtime.kullanici.ad;
    const hizOran = hedefWpm ? runtime.wpm / hedefWpm : 0;
    const anlama = comprehension.toplam ? comprehension.yuzde : -1;
    const hizDurum = hizOran >= 1.15 ? 'yuksek' : hizOran >= 0.85 ? 'denge' : 'gelisiyor';
    const anlamaDurum = anlama < 0 ? 'yok' : anlama >= 80 ? 'guclu' : anlama >= 55 ? 'orta' : 'gelisiyor';
    const anahtar = hizDurum + '_' + anlamaDurum;

    const headings = {
      yuksek_guclu: 'Harika bir denge kurdun',
      yuksek_orta: 'Hızın çok güçlü, anlama daha da yükselebilir',
      yuksek_gelisiyor: 'Çok hızlısın, şimdi kaliteyi güçlendirelim',
      denge_guclu: 'Sağlam bir okuma performansı',
      denge_orta: 'İyi bir temel oluşturdun',
      denge_gelisiyor: 'Hedefe çok yakınsın',
      gelisiyor_guclu: 'Anlama yönün çok güçlü',
      gelisiyor_orta: 'Düzenli çalışmayla hızlı ilerlersin',
      gelisiyor_gelisiyor: 'Başlangıç sağlam, devamı gelecek',
      yuksek_yok: 'Hız performansın dikkat çekici',
      denge_yok: 'Okuma hızın iyi bir çizgide',
      gelisiyor_yok: 'Hızını adım adım yükseltebilirsin',
    };

    const speedMessages = {
      yuksek: [
        ad + ', hedef hızın üstüne çıkarak oldukça güçlü bir tempo yakaladın.',
        ad + ', okuma hızında sınıf hedefinin üzerinde bir performans gösterdin.',
      ],
      denge: [
        ad + ', hız bölümünde hedefe oldukça yakın ya da hedef bandında bir okuma yaptın.',
        ad + ', okuma hızın dengeli; küçük bir düzenli pratikle daha da yukarı çıkabilir.',
      ],
      gelisiyor: [
        ad + ', hızın şu an gelişim aşamasında; düzenli kısa çalışmalarla belirgin biçimde artabilir.',
        ad + ', bugünkü tempo sana iyi bir başlangıç veriyor; istikrar kurarsan hızın hızlı yükselir.',
      ],
    };

    const comprehensionMessages = {
      guclu: [
        'Anlama bölümünde ayrıntıları iyi yakalamışsın ve metni dikkatle takip etmişsin.',
        'Sorulardaki başarın, okurken anlamı koruyabildiğini gösteriyor.',
      ],
      orta: [
        'Anlama bölümünde temel fikri yakalamışsın; birkaç ayrıntıyı kaçırmış olabilirsin.',
        'Genel kavrayışın iyi, ama önemli detaylarda biraz daha dikkat sana ek puan kazandırır.',
      ],
      gelisiyor: [
        'Anlama kısmında biraz daha yavaş ve dikkatli okumak sana ciddi katkı sağlayacak.',
        'Bazı kritik noktaları atlamış görünüyorsun; paragraf sonlarında kısa iç tekrarlar iyi gelebilir.',
      ],
      yok: [
        'Bu metinde soru olmadığı için yalnızca hız verisi üzerinden değerlendirme yapıldı.',
      ],
    };

    const actionMessages = {
      yuksek_guclu: [
        'Bir sonraki adımda daha uzun metinlerle aynı dengeyi korumayı deneyebilirsin.',
        'Zorlayıcı metin türlerine geçmek artık senin için uygun görünüyor.',
      ],
      yuksek_orta: [
        'Hızını korurken her paragraf sonunda kısa bir zihinsel özet yapman anlama puanını artırır.',
        'Bir tık daha yavaşlayıp anahtar kelimeleri zihninde işaretlemek iyi sonuç verir.',
      ],
      yuksek_gelisiyor: [
        'Bir sonraki okumada hızını biraz düşürüp anlam odaklı ilerlemen daha dengeli sonuç verebilir.',
        'Hız gücünü korurken cümle sonlarında kısa duraklamalar eklemek işini kolaylaştırır.',
      ],
      denge_guclu: [
        'Bu çizgiyi korumak için düzenli günlük okuma rutini çok işe yarar.',
        'Aynı disiplini sürdürürsen hem hız hem anlama birlikte yükselecek.',
      ],
      denge_orta: [
        'Ayrıntı takibini güçlendirmek için önemli kelimeleri zihninde öne çıkarmayı dene.',
        'Okurken “kim, ne yaptı, neden yaptı?” sorularını akılda tutmak yardımcı olur.',
      ],
      denge_gelisiyor: [
        'Kısa metinlerde anlam takibini güçlendirip sonra tekrar hızlanmak iyi bir yol olur.',
        'Önce anlaşılabilir tempoyu bulup sonra süre çalışmaları eklemek sana daha çok kazandırır.',
      ],
      gelisiyor_guclu: [
        'Anlama becerin güçlü olduğu için şimdi odak noktanı akıcılığı artırmaya çevirebilirsin.',
        'Göz hareketi ve süreli okuma çalışmaları hızını yukarı taşımaya hazır görünüyor.',
      ],
      gelisiyor_orta: [
        'Her gün 10 dakikalık süreli okuma ve ardından kısa özet çalışması iyi bir denge kurar.',
        'Akıcılığı artırırken anlamı korumak için kısa ama düzenli tekrarlar yeterli olabilir.',
      ],
      gelisiyor_gelisiyor: [
        'Şimdilik en önemli şey düzenli tekrar; kısa ama sürekli okuma çalışması en etkili yol.',
        'Her yeni okuma seni biraz daha ileri taşır; küçük adımlar burada çok değerlidir.',
      ],
      yuksek_yok: [
        'Aynı metni tekrar okuyup kendi hızını geçmeye çalışman güzel bir egzersiz olur.',
      ],
      denge_yok: [
        'Bir sonraki okumada kendi süreni biraz daha aşağı çekmeyi hedefleyebilirsin.',
      ],
      gelisiyor_yok: [
        'Kısa günlük alıştırmalarla hızını güvenli biçimde yükseltmek en iyi adım olur.',
      ],
    };

    const speed = chooseMessage(speedMessages[hizDurum], runtime.attemptId + '_speed');
    const comprehensionText = chooseMessage(comprehensionMessages[anlamaDurum], runtime.attemptId + '_comp');
    const action = chooseMessage(actionMessages[anahtar], runtime.attemptId + '_action');

    return {
      heading: headings[anahtar] || 'Okuma performansın değerlendirildi',
      html:
        '<strong>Okuma Hızı:</strong> ' + speed + '<br><br>' +
        '<strong>Anlama:</strong> ' + comprehensionText + '<br><br>' +
        '<strong>Sana Önerim:</strong> ' + action,
    };
  }

  async function saveResult(runtime, hedefWpm, comprehension, kelimeSayisi) {
    if (
      sessionStorage.getItem('okuma_karne_kaydedildi') === runtime.attemptId ||
      sessionStorage.getItem('okuma_karne_kuyrukta') === runtime.attemptId
    ) {
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
        cevaplar: comprehension.detay,
        goruntuleme_modu: runtime.metin.goruntuleme_modu,
        kullanici_bilgileri: {
          il: runtime.kullanici.il || '',
          okul: runtime.kullanici.okul || '',
        },
      },
    };

    try {
      await flushPendingResults();
      const existingId = sessionStorage.getItem(READING_RESULT_ID_KEY) || '';
      if (existingId) {
        await updateResultPayload(existingId, payload);
      } else {
        const inserted = await insertResultPayload(payload);
        if (inserted && inserted.id) {
          sessionStorage.setItem(READING_RESULT_ID_KEY, String(inserted.id));
        }
      }
    } catch (error) {
      const pending = getPendingResults();
      pending.push(payload);
      setPendingResults(pending);
      sessionStorage.setItem('okuma_karne_kuyrukta', runtime.attemptId);
      console.warn('Sonuc kaydi gecici olarak yerel kuyruga alindi:', error.message);
      return;
    }

    sessionStorage.removeItem('okuma_karne_kuyrukta');
    sessionStorage.setItem('okuma_karne_kaydedildi', runtime.attemptId);
  }

  async function downloadPdf() {
    const button = document.getElementById('indirBtn');
    const card = document.getElementById('karneKart');
    const altButtons = document.querySelector('.karne-govde-alt');

    button.disabled = true;
    button.textContent = '⏳ PDF hazırlanıyor…';
    if (altButtons) {
      altButtons.style.display = 'none';
    }

    try {
      const canvas = await window.html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const pdfLib = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
      if (!pdfLib) {
        throw new Error('PDF kütüphanesi yüklenemedi.');
      }

      const pdf = new pdfLib('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imageWidth = pageWidth - (margin * 2);
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const imageData = canvas.toDataURL('image/png');

      let heightLeft = imageHeight;
      let position = margin;
      pdf.addImage(imageData, 'PNG', margin, position, imageWidth, imageHeight);
      heightLeft -= (pageHeight - (margin * 2));

      while (heightLeft > 0) {
        position = heightLeft - imageHeight + margin;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, position, imageWidth, imageHeight);
        heightLeft -= (pageHeight - (margin * 2));
      }

      const fileName = 'karne_' + (document.getElementById('karneAd').textContent || 'ogrenci').replace(/\s+/g, '_') + '.pdf';
      pdf.save(fileName);
      button.textContent = '✅ PDF indirildi';
    } catch (error) {
      console.error(error);
      button.textContent = '❌ PDF oluşturulamadı';
    } finally {
      if (altButtons) {
        altButtons.style.display = '';
      }
      setTimeout(function() {
        button.disabled = false;
        button.textContent = '📄 PDF İndir';
      }, 1800);
    }
  }

  function repeatReading(runtime) {
    sessionStorage.setItem('okuma_metin', JSON.stringify(runtime.metin));
    sessionStorage.setItem('okuma_kullanici', JSON.stringify(runtime.kullanici));
    sessionStorage.removeItem('okuma_sure_sn');
    sessionStorage.removeItem('okuma_wpm');
    sessionStorage.removeItem('okuma_cevaplar');
    sessionStorage.removeItem('okuma_karne_kaydedildi');
    sessionStorage.removeItem(READING_RESULT_ID_KEY);
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
        attemptId: runtime.attemptId || '',
        wpm: runtime.wpm || 0,
        targetWpm: hedefWpm || 0,
        wordCount: kelimeSayisi || 0,
        comprehensionPercent: comprehension && comprehension.yuzde ? comprehension.yuzde : 0,
      },
    });
  }

  function render(runtime) {
    const sinif = runtime.kullanici.sinif;
    const norm = NORMS[sinif] || NORMS[4];
    const hedefWpm = runtime.metin.hedef_hiz || norm.hedef;
    const kelimeSayisi = runtime.metin.kelime_sayisi || stripHtml(runtime.metin.icerik_html || runtime.metin.icerik || '').split(/\s+/).filter(Boolean).length;
    const comprehension = getComprehensionSummary(runtime);
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const locationLine = getUserLocationLine(runtime.kullanici);

    document.getElementById('karneAd').textContent = runtime.kullanici.ad + ' ' + runtime.kullanici.soyad;
    document.getElementById('karneSinifSube').textContent = runtime.kullanici.sinif + '. Sınıf / ' + runtime.kullanici.sube + ' Şubesi' + (locationLine ? ' · ' + locationLine : '');
    document.getElementById('karneTarih').textContent = today;
    document.getElementById('karneMetinAdi').textContent = runtime.metin.baslik;
    document.getElementById('karneWpm').textContent = String(runtime.wpm);
    document.getElementById('karneHedef').textContent = String(hedefWpm);

    const star = runtime.wpm >= hedefWpm * 1.2 ? '🌟🌟🌟' : runtime.wpm >= hedefWpm ? '⭐⭐⭐' : runtime.wpm >= hedefWpm * 0.7 ? '⭐⭐' : '⭐';
    document.getElementById('karneWpmStar').textContent = star;

    const barMax = norm.maksimum;
    const fillPercent = Math.min(100, Math.round((runtime.wpm / barMax) * 100));
    const targetPercent = Math.min(98, Math.round((hedefWpm / barMax) * 100));
    document.getElementById('hizBarOrta').textContent = hedefWpm + ' k/dk';
    document.getElementById('hizBarHedef').style.left = targetPercent + '%';
    document.getElementById('hizBarFill').style.background =
      runtime.wpm >= hedefWpm ? 'linear-gradient(90deg,#00C9B1,#55EFC4)' :
      runtime.wpm >= hedefWpm * 0.75 ? 'linear-gradient(90deg,#FFD93D,#FF9F43)' :
      'linear-gradient(90deg,#FF6052,#FF9F43)';
    window.setTimeout(function() {
      document.getElementById('hizBarFill').style.width = fillPercent + '%';
    }, 350);

    if (!comprehension.toplam) {
      document.getElementById('anlamaSeksiyon').innerHTML =
        '<div style="text-align:center;color:var(--muted);padding:20px;">Bu metin için anlama sorusu eklenmemiş.</div>';
      document.getElementById('anlamaBolme').style.display = 'none';
    } else {
      const color = comprehension.yuzde >= 80 ? '#00C9B1' : comprehension.yuzde >= 55 ? '#FFD93D' : '#FF6052';
      const circle = document.getElementById('anlamaDaire');
      circle.style.background = 'conic-gradient(' + color + ' ' + (comprehension.yuzde * 3.6) + 'deg, #F0EBFF 0deg)';
      circle.style.boxShadow = '0 0 0 8px #F0EBFF, 0 6px 20px rgba(0,0,0,.1)';
      document.getElementById('anlamaYuzde').textContent = comprehension.yuzde + '%';
      document.getElementById('anlamaYuzde').style.color = color;
      document.getElementById('anlamaSoruRow').innerHTML =
        '<div class="anlama-kutu dogru">✅ ' + comprehension.dogru + ' Doğru</div>' +
        '<div class="anlama-kutu yanlis">❌ ' + comprehension.yanlis + ' Yanlış</div>' +
        '<div class="anlama-kutu dogru" style="background:#EFF7FF;color:var(--purple);">📊 ' + comprehension.yuzde + '% Başarı</div>';
      document.getElementById('soruDetayList').innerHTML = comprehension.detay.map(function(item, index) {
        const isCorrect = item.isDogru != null ? item.isDogru : item.isDogu;
        return (
          '<div class="soru-detay-item ' + (isCorrect ? 'dogru' : 'yanlis') + '">' +
            '<div class="sdi-soru">' + (index + 1) + '. ' + escHtml(item.soru) + '</div>' +
            '<div class="sdi-sec ' + (isCorrect ? 'dogru' : 'yanlis') + '">' +
              (isCorrect ? '✅' : '❌') + ' Cevabın: ' + escHtml(item.secilenMetin || '—') +
              (!isCorrect ? '<br>✅ Doğru Cevap: ' + escHtml(item.dogruMetin || '—') : '') +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    const feedback = getFeedback(runtime, hedefWpm, comprehension);
    document.getElementById('donutBaslik').textContent = '💡 ' + feedback.heading;
    document.getElementById('donutMetin').innerHTML = feedback.html;
    document.getElementById('karneSubTitle').textContent = runtime.kullanici.ad + ' için hız ve anlama değerlendirmesi hazır.';

    markReadingCompleted(runtime, hedefWpm, comprehension, kelimeSayisi);
    saveResult(runtime, hedefWpm, comprehension, kelimeSayisi);

    window.karnePdfIndir = downloadPdf;
    window.tekrarOku = function() {
      repeatReading(runtime);
    };
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
