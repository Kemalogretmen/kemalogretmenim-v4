(function() {
  'use strict';

  const BUCKET = 'e-kitaplar';
  const QUEUE_KEY = 'kemal_e_kitap_result_queue_v1';
  const VISITOR_KEY = 'kemal_e_kitap_visitor_v1';
  const config = window.kemalSiteStore.getReadingConfig
    ? window.kemalSiteStore.getReadingConfig()
    : window.kemalSiteStore.getConfig();
  const sb = window.kemalUserAuth && typeof window.kemalUserAuth.getClient === 'function'
    ? window.kemalUserAuth.getClient()
    : window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const bookId = new URLSearchParams(window.location.search).get('id') || '';
  const TURKEY_CITIES = window.kemalSiteStore && window.kemalSiteStore.getTurkeyCities
    ? window.kemalSiteStore.getTurkeyCities()
    : [];
  const SCHOOL_MISSING_VALUE = '__manual_school__';
  const state = {
    book: null,
    pages: [],
    questions: [],
    pageUrls: [],
    coverUrl: '',
    pageFlip: null,
    fallbackMode: false,
    externalFrameMode: false,
    currentPage: 0,
    maxPageVisited: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    drag: null,
    reader: null,
    activeMs: 0,
    lastTick: 0,
    timerId: 0,
    progressTimer: 0,
    readingActive: false,
    attemptId: '',
    answers: [],
    quizIndex: 0,
    result: null,
    benchmark: null,
    speedChart: null,
    comprehensionChart: null,
    social: { liked: false, like_count: 0, comment_count: 0 },
    authState: null,
    saved: false,
  };

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, function(char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char];
    });
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function capitalizeWords(value) {
    return clean(value).split(' ').map(function(word) {
      return word ? word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR') : '';
    }).join(' ');
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(char) {
      const random = Math.random() * 16 | 0;
      const value = char === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function getVisitorId() {
    try {
      const current = localStorage.getItem(VISITOR_KEY);
      if (current) return current;
      const next = uuid();
      localStorage.setItem(VISITOR_KEY, next);
      return next;
    } catch (error) {
      return 'session-' + uuid();
    }
  }

  function getBookGrades() {
    if (!state.book) return [];
    const grades = Array.isArray(state.book.siniflar) && state.book.siniflar.length
      ? state.book.siniflar
      : [state.book.sinif];
    return grades.map(Number).filter(Number.isFinite).sort(function(a, b) { return a - b; });
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function setStage(name) {
    ['introStage', 'loadingStage', 'errorStage', 'bookStage', 'quizStage', 'reportStage'].forEach(function(id) {
      const node = document.getElementById(id);
      if (node) node.classList.toggle('active', id === name);
    });
    refreshIcons();
  }

  function showError(title, message, externalUrl) {
    stopTimer();
    document.getElementById('errorTitle').textContent = title || 'Kitap açılamadı';
    document.getElementById('errorText').textContent = message || 'Lütfen daha sonra tekrar deneyin.';
    const externalButton = document.getElementById('externalOpenButton');
    if (externalUrl) {
      externalButton.href = externalUrl;
      externalButton.style.display = 'inline-flex';
    } else {
      externalButton.style.display = 'none';
    }
    setStage('errorStage');
  }

  function setLoading(title, text, percent) {
    document.getElementById('loadingTitle').textContent = title || 'Kitap hazırlanıyor';
    document.getElementById('loadingText').textContent = text || '';
    document.getElementById('loadingProgress').style.width = Math.max(0, Math.min(100, Number(percent || 0))) + '%';
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(total / 60);
    const remain = total % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remain).padStart(2, '0');
  }

  function updateTimerDisplay() {
    document.getElementById('readerTimer').textContent = formatDuration(state.activeMs / 1000);
  }

  function tickTimer() {
    const now = performance.now();
    if (state.readingActive && !document.hidden && state.lastTick) {
      state.activeMs += Math.max(0, Math.min(1000, now - state.lastTick));
      updateTimerDisplay();
    }
    state.lastTick = now;
  }

  function startTimer() {
    state.readingActive = true;
    state.lastTick = performance.now();
    window.clearInterval(state.timerId);
    state.timerId = window.setInterval(tickTimer, 250);
    window.clearInterval(state.progressTimer);
    state.progressTimer = window.setInterval(saveProgress, 10000);
  }

  function stopTimer() {
    tickTimer();
    state.readingActive = false;
    state.lastTick = 0;
    window.clearInterval(state.timerId);
    window.clearInterval(state.progressTimer);
  }

  function getProgressItem() {
    return {
      type: 'ebook',
      id: state.book ? state.book.id : bookId,
      title: state.book ? state.book.baslik : 'E-Kitap',
      href: '/hizli-okuma/e-kitap-oku.html?id=' + encodeURIComponent(state.book ? state.book.id : bookId),
      grade: state.reader ? state.reader.sinif : (state.book ? state.book.sinif : ''),
      subject: 'E-Kitaplık',
    };
  }

  function saveProgress(completed) {
    if (!state.book || !window.kemalContentProgress) return;
    const authUser = state.authState && state.authState.user;
    const existing = window.kemalContentProgress.getRecord(getProgressItem()) || {};
    window.kemalContentProgress.upsertRecord(getProgressItem(), {
      status: completed ? 'completed' : 'started',
      score: completed && state.result ? Number(state.result.anlama_yuzdesi || 0) : null,
      meta: {
        accountUid: authUser ? authUser.id : '',
        currentPage: state.currentPage + 1,
        maxPageVisited: state.maxPageVisited + 1,
        totalPages: Number(state.book.sayfa_sayisi || state.pageUrls.length || 1),
        activeSeconds: Math.round(state.activeMs / 1000),
        saved: Boolean(existing.meta && existing.meta.saved),
        favorite: Boolean(existing.meta && existing.meta.favorite),
        completedAt: completed ? new Date().toISOString() : '',
      },
    });
  }

  function restoreProgress() {
    if (!window.kemalContentProgress || !state.book) return;
    const record = window.kemalContentProgress.getRecord(getProgressItem());
    if (!record || !record.meta) return;
    state.currentPage = Math.max(0, Number(record.meta.currentPage || 1) - 1);
    state.maxPageVisited = Math.max(state.currentPage, Number(record.meta.maxPageVisited || 1) - 1);
    state.activeMs = Math.max(0, Number(record.meta.activeSeconds || 0) * 1000);
    state.saved = Boolean(record.meta.saved);
    updateSaveButton();
    updateTimerDisplay();
    if (state.currentPage > 0) {
      const button = document.querySelector('.reader-start');
      if (button) button.textContent = 'Kaldığım Yerden Devam Et';
    }
  }

  function updateSaveButton() {
    const button = document.getElementById('saveBookAction');
    button.classList.toggle('primary', state.saved);
    button.title = state.saved ? 'Kitap kaydedildi' : 'Kitabı kaydet';
    const label = button.querySelector('span');
    if (label) label.textContent = state.saved ? 'Kaydedildi' : 'Kaydet';
  }

  async function toggleSave() {
    await ensureAuth();
    if (!state.authState || !state.authState.user) {
      window.location.href = '/giris.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    if (!window.kemalContentProgress) return;
    const existing = window.kemalContentProgress.getRecord(getProgressItem()) || {};
    state.saved = !(existing.meta && existing.meta.saved);
    window.kemalContentProgress.upsertRecord(getProgressItem(), {
      status: existing.status || 'read',
      meta: {
        accountUid: state.authState.user.id,
        saved: state.saved,
        favorite: state.saved,
        savedAt: state.saved ? new Date().toISOString() : '',
      },
    });
    updateSaveButton();
  }

  async function ensureAuth() {
    if (!window.kemalUserAuth || typeof window.kemalUserAuth.ready !== 'function') return null;
    await window.kemalUserAuth.ready();
    state.authState = window.kemalUserAuth.getState();
    return state.authState;
  }

  async function loadCover(path, target) {
    if (!path || !target) return;
    try {
      const response = await sb.storage.from(BUCKET).download(path);
      if (response.error) throw response.error;
      state.coverUrl = URL.createObjectURL(response.data);
      target.innerHTML = '<img src="' + esc(state.coverUrl) + '" alt="">';
    } catch (error) {}
  }

  function normalizeQuestions(rows) {
    return (rows || []).slice().sort(function(a, b) {
      return Number(a.sira || 0) - Number(b.sira || 0);
    }).map(function(question) {
      return Object.assign({}, question, {
        e_kitap_secenekleri: (question.e_kitap_secenekleri || []).slice().sort(function(a, b) {
          return Number(a.sira || 0) - Number(b.sira || 0);
        }),
      });
    });
  }

  async function loadBook() {
    if (!bookId) {
      showError('Kitap seçilmedi', 'E-Kitaplıktan bir kitap seçerek yeniden deneyin.');
      return;
    }
    await ensureAuth();
    const responses = await Promise.all([
      sb.from('e_kitaplar').select('*').eq('id', bookId).eq('aktif', true).maybeSingle(),
      sb.from('e_kitap_sayfalari').select('*').eq('e_kitap_id', bookId).order('sayfa_no'),
      sb.from('e_kitap_sorulari').select('*,e_kitap_secenekleri(*)').eq('e_kitap_id', bookId).order('sira'),
    ]);
    if (responses[0].error || !responses[0].data) {
      const signedIn = Boolean(state.authState && state.authState.user);
      showError(
        signedIn ? 'Kitap bulunamadı' : 'Giriş gerekebilir',
        signedIn
          ? 'Bu kitap yayından kaldırılmış veya bağlantısı değişmiş olabilir.'
          : 'Bu kitap yalnızca kayıtlı kullanıcılara açık olabilir. Giriş yaptıktan sonra tekrar deneyin.'
      );
      return;
    }
    if (responses[1].error || responses[2].error) {
      showError('Kitap verileri yüklenemedi', (responses[1].error || responses[2].error).message);
      return;
    }
    state.book = responses[0].data;
    state.pages = responses[1].data || [];
    state.questions = normalizeQuestions(responses[2].data || []);
    state.answers = state.questions.map(function(question) {
      return { soru_id: question.id, secenek_id: '', metin: '' };
    });
    document.title = state.book.baslik + ' - E-Kitap';
    document.getElementById('topBookTitle').textContent = state.book.baslik;
    document.getElementById('topBookMeta').textContent = (state.book.yazar || 'Kemal Öğretmenim') + ' · ' + getBookGrades().join(', ') + '. Sınıf';
    document.getElementById('introTitle').textContent = state.book.baslik;
    document.getElementById('introAuthor').textContent = state.book.yazar || 'Kemal Öğretmenim';
    document.getElementById('introDescription').textContent = state.book.aciklama || 'Kitabı tamamladıktan sonra anlama sorularına geçeceksin.';
    document.getElementById('introPages').textContent = Number(state.book.sayfa_sayisi || state.pages.length || 0);
    document.getElementById('introWords').textContent = Number(state.book.kelime_sayisi || 0);
    document.getElementById('introTarget').textContent = Number(state.book.hedef_hiz || 0);
    document.getElementById('introMinutes').textContent = Number(state.book.tahmini_dk || 5);
    document.getElementById('introCover').style.setProperty('--cover', state.book.kapak_renk || '#0F9F8F');
    populateReaderGrades();
    await prefillReader();
    restoreProgress();
    loadCover(state.book.kapak_yolu, document.getElementById('introCover'));
    await loadSocial();
    setStage('introStage');
  }

  function populateReaderGrades() {
    const select = document.getElementById('readerGrade');
    select.innerHTML = '<option value="">Seç</option>' + getBookGrades().map(function(grade) {
      return '<option value="' + grade + '">' + grade + '. Sınıf</option>';
    }).join('');
    if (getBookGrades().length === 1) select.value = String(getBookGrades()[0]);
  }

  function setSelectValue(id, value) {
    const select = document.getElementById(id);
    const raw = clean(value);
    if (!select || !raw) return false;
    const option = Array.from(select.options).find(function(item) {
      return clean(item.value).toLocaleLowerCase('tr-TR') === raw.toLocaleLowerCase('tr-TR') ||
        clean(item.textContent).toLocaleLowerCase('tr-TR') === raw.toLocaleLowerCase('tr-TR');
    });
    if (!option) return false;
    select.value = option.value;
    return true;
  }

  function populateReaderCities() {
    const select = document.getElementById('readerCity');
    if (!select) return;
    select.innerHTML = '<option value="">Seç</option>' + TURKEY_CITIES.map(function(city) {
      return '<option value="' + esc(city) + '">' + esc(city) + '</option>';
    }).join('');
  }

  function syncManualSchoolField() {
    const district = document.getElementById('readerDistrict');
    const school = document.getElementById('readerSchool');
    const checkbox = document.getElementById('readerSchoolMissing');
    const field = document.getElementById('readerManualSchoolField');
    const input = document.getElementById('readerSchoolManual');
    const isManual = Boolean(checkbox && checkbox.checked) || Boolean(school && school.value === SCHOOL_MISSING_VALUE);
    if (checkbox) checkbox.checked = isManual;
    if (field) field.hidden = !isManual;
    if (input) {
      input.disabled = !isManual;
      input.required = isManual;
      if (!isManual) input.value = '';
    }
    if (school) school.disabled = isManual || !clean(district && district.value);
  }

  async function populateReaderDistricts() {
    const city = clean(document.getElementById('readerCity').value);
    const district = document.getElementById('readerDistrict');
    const school = document.getElementById('readerSchool');
    const checkbox = document.getElementById('readerSchoolMissing');
    const checkboxLabel = document.getElementById('readerSchoolMissingLabel');
    district.disabled = true;
    district.innerHTML = city ? '<option value="">İlçeler yükleniyor...</option>' : '<option value="">Önce il seçin</option>';
    school.disabled = true;
    school.innerHTML = '<option value="">Önce il ve ilçe seçin</option>';
    checkbox.checked = false;
    checkbox.disabled = true;
    checkboxLabel.classList.add('disabled');
    syncManualSchoolField();
    if (!city || !window.kemalMebSchools) return;
    try {
      const rows = await window.kemalMebSchools.getDistricts(city);
      district.innerHTML = '<option value="">İlçe seçin</option>' + rows.map(function(item) {
        return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
      }).join('');
      district.disabled = !rows.length;
    } catch (error) {
      district.innerHTML = '<option value="">İlçeler yüklenemedi</option>';
    }
  }

  function enableManualSchoolOption() {
    const school = document.getElementById('readerSchool');
    const checkbox = document.getElementById('readerSchoolMissing');
    const checkboxLabel = document.getElementById('readerSchoolMissingLabel');
    school.insertAdjacentHTML('beforeend', '<option value="' + SCHOOL_MISSING_VALUE + '">Okulum listede yok</option>');
    checkbox.disabled = false;
    checkboxLabel.classList.remove('disabled');
    school.disabled = false;
    syncManualSchoolField();
  }

  async function populateReaderSchools() {
    const city = clean(document.getElementById('readerCity').value);
    const district = clean(document.getElementById('readerDistrict').value);
    const school = document.getElementById('readerSchool');
    const checkbox = document.getElementById('readerSchoolMissing');
    const checkboxLabel = document.getElementById('readerSchoolMissingLabel');
    school.disabled = true;
    school.innerHTML = district ? '<option value="">Okullar yükleniyor...</option>' : '<option value="">Önce il ve ilçe seçin</option>';
    checkbox.checked = false;
    checkbox.disabled = true;
    checkboxLabel.classList.add('disabled');
    syncManualSchoolField();
    if (!city || !district) return;
    let rows = [];
    try {
      rows = window.kemalMebSchools
        ? await window.kemalMebSchools.loadSchools({ city: city, district: district })
        : [];
      if (!rows.length) {
        const response = await sb
          .from('schools')
          .select('name,type')
          .eq('city', city.toLocaleUpperCase('tr-TR'))
          .eq('district', district.toLocaleUpperCase('tr-TR'))
          .eq('active', true)
          .order('name', { ascending: true })
          .limit(500);
        if (!response.error) rows = response.data || [];
      }
    } catch (error) {
      rows = [];
    }
    school.innerHTML = '<option value="">Okul seçin</option>' + rows.map(function(item) {
      const name = item.name || '';
      const label = name + (item.type ? ' - ' + item.type : '');
      return '<option value="' + esc(name) + '">' + esc(label) + '</option>';
    }).join('');
    enableManualSchoolOption();
  }

  function getSelectedSchool() {
    const school = document.getElementById('readerSchool');
    const checkbox = document.getElementById('readerSchoolMissing');
    if (checkbox.checked || school.value === SCHOOL_MISSING_VALUE) {
      return clean(document.getElementById('readerSchoolManual').value);
    }
    return clean(school.value);
  }

  async function prefillReader() {
    await ensureAuth();
    if (!state.authState || !state.authState.user || !window.kemalUserAuth.getStudentInfo) return;
    const info = window.kemalUserAuth.getStudentInfo();
    document.getElementById('readerFirstName').value = info.firstName || '';
    document.getElementById('readerLastName').value = info.lastName || '';
    if (getBookGrades().includes(Number(info.grade))) {
      document.getElementById('readerGrade').value = String(info.grade);
    }
    document.getElementById('readerBranch').value = info.sube || (info.role === 'teacher' ? 'Öğretmen' : '');
    if (setSelectValue('readerCity', info.city)) {
      await populateReaderDistricts();
      if (setSelectValue('readerDistrict', info.district)) {
        await populateReaderSchools();
        if (!setSelectValue('readerSchool', info.school) && clean(info.school)) {
          document.getElementById('readerSchoolMissing').checked = true;
          syncManualSchoolField();
          document.getElementById('readerSchoolManual').value = clean(info.school);
        }
      }
    }
  }

  function readReaderForm() {
    const firstName = clean(document.getElementById('readerFirstName').value);
    const lastName = clean(document.getElementById('readerLastName').value);
    const grade = Number(document.getElementById('readerGrade').value);
    const branch = clean(document.getElementById('readerBranch').value);
    const city = clean(document.getElementById('readerCity').value);
    const district = clean(document.getElementById('readerDistrict').value);
    const school = getSelectedSchool();
    if (!firstName || !lastName || !grade || !branch || !city || !district || !school) {
      throw new Error('Ad, soyad, sınıf, şube, il, ilçe ve okul bilgilerini tamamlamalısın.');
    }
    const info = window.kemalUserAuth && window.kemalUserAuth.getStudentInfo
      ? window.kemalUserAuth.getStudentInfo()
      : {};
    return {
      ad: capitalizeWords(firstName),
      soyad: capitalizeWords(lastName),
      sinif: grade,
      sube: branch,
      il: capitalizeWords(city),
      ilce: capitalizeWords(district),
      okul: school,
      accountUid: info.accountUid || '',
    };
  }

  function blobToObjectUrl(blob) {
    const url = URL.createObjectURL(blob);
    state.pageUrls.push(url);
    return url;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        if (blob) resolve(blob);
        else reject(new Error('PDF sayfası görüntüye dönüştürülemedi.'));
      }, type, quality);
    });
  }

  async function renderPdfPages(bytes) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const urls = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setLoading(
        'Kitap hazırlanıyor',
        pageNumber + ' / ' + pdf.numPages + ' sayfa yüksek kalitede hazırlanıyor.',
        (pageNumber - 1) / pdf.numPages * 100
      );
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const target = window.innerWidth <= 700 ? 1200 : 1600;
      const scale = Math.min(2.5, Math.max(1.2, target / Math.max(base.width, base.height)));
      const viewport = page.getViewport({ scale: scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      const blob = await canvasToBlob(canvas, 'image/webp', 0.95);
      urls.push(blobToObjectUrl(blob));
      canvas.width = 1;
      canvas.height = 1;
    }
    setLoading('Kitap hazır', 'Okuyucu açılıyor.', 100);
    return urls;
  }

  async function loadSupabasePdf() {
    setLoading('PDF indiriliyor', 'Kitap güvenli depodan alınıyor.', 8);
    const response = await sb.storage.from(BUCKET).download(state.book.dosya_yolu);
    if (response.error) throw response.error;
    return renderPdfPages(await response.data.arrayBuffer());
  }

  function normalizeExternalUrl(url, preview) {
    const raw = clean(url);
    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || raw.match(/[?&]id=([^&]+)/i);
    if (driveMatch) {
      return preview
        ? 'https://drive.google.com/file/d/' + driveMatch[1] + '/preview'
        : 'https://drive.google.com/uc?export=download&id=' + driveMatch[1];
    }
    return raw;
  }

  async function loadExternalPdf() {
    const directUrl = normalizeExternalUrl(state.book.harici_url, false);
    setLoading('Harici PDF kontrol ediliyor', 'Bağlantı flipbook görünümü için hazırlanıyor.', 10);
    try {
      const response = await fetch(directUrl, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const blob = await response.blob();
      if (!/pdf/i.test(blob.type || '') && !/\.pdf(?:$|[?#])/i.test(directUrl)) {
        throw new Error('Bağlantı PDF döndürmedi.');
      }
      return renderPdfPages(await blob.arrayBuffer());
    } catch (error) {
      state.externalFrameMode = true;
      document.getElementById('externalFrame').src = normalizeExternalUrl(state.book.harici_url, true);
      document.getElementById('externalFrameWrap').classList.add('active');
      document.getElementById('bookRoot').style.display = 'none';
      document.getElementById('thumbnailButton').disabled = true;
      document.getElementById('toolbarPrevious').disabled = true;
      document.getElementById('toolbarNext').disabled = true;
      document.getElementById('previousPage').disabled = true;
      document.getElementById('nextPage').disabled = true;
      document.getElementById('pageIndicator').textContent = 'Harici PDF';
      return [];
    }
  }

  async function loadImagePages() {
    const urls = [];
    for (let index = 0; index < state.pages.length; index += 1) {
      setLoading(
        'Görsel sayfalar yükleniyor',
        (index + 1) + ' / ' + state.pages.length + ' sayfa hazırlanıyor.',
        index / Math.max(1, state.pages.length) * 100
      );
      const response = await sb.storage.from(BUCKET).download(state.pages[index].dosya_yolu);
      if (response.error) throw response.error;
      urls.push(blobToObjectUrl(response.data));
    }
    setLoading('Kitap hazır', 'Okuyucu açılıyor.', 100);
    return urls;
  }

  async function getImageSize(url) {
    return new Promise(function(resolve) {
      const image = new Image();
      image.onload = function() {
        resolve({ width: image.naturalWidth || 600, height: image.naturalHeight || 800 });
      };
      image.onerror = function() { resolve({ width: 600, height: 800 }); };
      image.src = url;
    });
  }

  function buildThumbnails(urls) {
    const grid = document.getElementById('thumbnailGrid');
    grid.innerHTML = urls.map(function(url, index) {
      return '<button class="thumbnail ' + (index === state.currentPage ? 'active' : '') + '" type="button" data-page="' + index + '">' +
        '<img src="' + esc(url) + '" alt="Sayfa ' + (index + 1) + '">' +
        '<span>' + (index + 1) + '. sayfa</span>' +
      '</button>';
    }).join('');
  }

  async function buildBook(urls) {
    state.pageUrls = urls;
    if (!urls.length && state.externalFrameMode) return;
    const root = document.getElementById('bookRoot');
    root.style.display = 'block';
    root.innerHTML = urls.map(function(url, index) {
      return '<div class="ebook-page" data-density="' + (index === 0 || index === urls.length - 1 ? 'hard' : 'soft') + '">' +
        '<img src="' + esc(url) + '" alt="Sayfa ' + (index + 1) + '">' +
      '</div>';
    }).join('');
    buildThumbnails(urls);
    const size = await getImageSize(urls[0]);
    const ratio = Math.max(0.62, Math.min(0.82, size.width / Math.max(1, size.height)));
    const baseHeight = 800;
    const baseWidth = Math.round(baseHeight * ratio);

    if (window.St && window.St.PageFlip) {
      state.pageFlip = new window.St.PageFlip(root, {
        width: baseWidth,
        height: baseHeight,
        size: 'stretch',
        minWidth: 250,
        maxWidth: 720,
        minHeight: 340,
        maxHeight: 980,
        maxShadowOpacity: 0.28,
        showCover: true,
        mobileScrollSupport: false,
        usePortrait: true,
        autoSize: true,
        flippingTime: 650,
        startPage: Math.min(state.currentPage, urls.length - 1),
      });
      state.pageFlip.loadFromHTML(root.querySelectorAll('.ebook-page'));
      state.pageFlip.on('flip', function(event) {
        updateCurrentPage(Number(event.data || 0));
      });
    } else {
      state.fallbackMode = true;
      root.style.display = 'none';
      document.getElementById('fallbackPage').classList.add('active');
      renderFallbackPage();
    }
    updateCurrentPage(state.currentPage);
  }

  function renderFallbackPage() {
    const node = document.getElementById('fallbackPage');
    const url = state.pageUrls[state.currentPage];
    node.innerHTML = url ? '<img src="' + esc(url) + '" alt="Sayfa ' + (state.currentPage + 1) + '">' : '';
  }

  function updateCurrentPage(index) {
    const total = Number(state.book?.sayfa_sayisi || state.pageUrls.length || 1);
    state.currentPage = Math.max(0, Math.min(Math.max(0, total - 1), Number(index || 0)));
    state.maxPageVisited = Math.max(state.maxPageVisited, state.currentPage);
    document.getElementById('pageIndicator').textContent = (state.currentPage + 1) + ' / ' + total;
    document.querySelectorAll('.thumbnail').forEach(function(node) {
      node.classList.toggle('active', Number(node.dataset.page) === state.currentPage);
    });
    if (state.fallbackMode) renderFallbackPage();
    saveProgress(false);
  }

  function goToPage(index) {
    const total = state.pageUrls.length || Number(state.book?.sayfa_sayisi || 1);
    const target = Math.max(0, Math.min(total - 1, Number(index || 0)));
    if (state.pageFlip) {
      state.pageFlip.flip(target, 'top');
    } else {
      updateCurrentPage(target);
    }
    document.getElementById('thumbnailDrawer').classList.remove('open');
  }

  function previousPage() {
    if (state.externalFrameMode) return;
    if (state.pageFlip) state.pageFlip.flipPrev('top');
    else goToPage(state.currentPage - 1);
  }

  function nextPage() {
    if (state.externalFrameMode) return;
    if (state.pageFlip) state.pageFlip.flipNext('top');
    else goToPage(state.currentPage + 1);
  }

  function applyTransform() {
    const scale = document.getElementById('bookScale');
    scale.style.transform = 'translate(' + state.panX + 'px,' + state.panY + 'px) scale(' + state.zoom + ')';
    document.getElementById('bookRoot').style.pointerEvents = state.zoom > 1 ? 'none' : 'auto';
  }

  function setZoom(next) {
    state.zoom = Math.max(1, Math.min(2.5, Number(next || 1)));
    if (state.zoom === 1) {
      state.panX = 0;
      state.panY = 0;
    }
    applyTransform();
  }

  async function prepareReader() {
    setStage('loadingStage');
    setLoading('Kitap hazırlanıyor', 'Dosya kaynağı kontrol ediliyor.', 3);
    try {
      let urls = [];
      if (state.book.kaynak_turu === 'images') {
        urls = await loadImagePages();
      } else if (state.book.kaynak_turu === 'external_pdf') {
        urls = await loadExternalPdf();
      } else {
        urls = await loadSupabasePdf();
      }
      await buildBook(urls);
      setStage('bookStage');
      startTimer();
    } catch (error) {
      console.error(error);
      showError(
        'Kitap görüntülenemedi',
        'Dosya indirilemedi veya PDF biçimi tarayıcı tarafından okunamadı.',
        state.book.kaynak_turu === 'external_pdf' ? state.book.harici_url : ''
      );
    }
  }

  async function startReading(event) {
    event.preventDefault();
    try {
      state.reader = readReaderForm();
      state.attemptId = state.attemptId || uuid();
      await prepareReader();
    } catch (error) {
      window.alert(error.message);
    }
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  async function requestReaderFullscreen() {
    const stage = document.getElementById('bookStage');
    const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (typeof request !== 'function') return;
    await request.call(stage);
  }

  async function exitFullscreenIfNeeded() {
    if (!getFullscreenElement()) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (typeof exit !== 'function') return;
    try {
      await exit.call(document);
    } catch (error) {}
  }

  async function finishReading() {
    const total = Number(state.book.sayfa_sayisi || state.pageUrls.length || 1);
    const lastReached = state.externalFrameMode || state.maxPageVisited >= total - 2;
    const message = lastReached
      ? 'Kitabı bitirip anlama sorularına geçmek istiyor musun? Okuma süresi duracak.'
      : 'Henüz son sayfalara ulaşmadın. Yine de kitabı bitirip sorulara geçmek istiyor musun?';
    if (!window.confirm(message)) return;
    await exitFullscreenIfNeeded();
    stopTimer();
    saveProgress(false);
    if (state.questions.length) {
      state.quizIndex = 0;
      renderQuiz();
      setStage('quizStage');
    } else {
      saveResult();
    }
  }

  function getAnswer(index) {
    return state.answers[index] || { soru_id: state.questions[index]?.id, secenek_id: '', metin: '' };
  }

  function answerIsFilled(index) {
    const question = state.questions[index];
    const answer = getAnswer(index);
    return question.soru_tipi === 'bosluk-doldurma'
      ? Boolean(clean(answer.metin))
      : Boolean(answer.secenek_id);
  }

  function renderQuiz() {
    const question = state.questions[state.quizIndex];
    const answer = getAnswer(state.quizIndex);
    const total = state.questions.length;
    document.getElementById('quizCounter').textContent = (state.quizIndex + 1) + ' / ' + total;
    document.getElementById('quizNumber').textContent = 'Soru ' + (state.quizIndex + 1);
    document.getElementById('quizQuestion').textContent = question.soru_metni;
    document.getElementById('quizProgress').style.width = ((state.quizIndex + 1) / total * 100) + '%';
    const options = document.getElementById('quizOptions');
    if (question.soru_tipi === 'bosluk-doldurma') {
      options.innerHTML = '<input class="quiz-fill" id="quizFillAnswer" type="text" value="' + esc(answer.metin) + '" placeholder="Cevabını yaz" autocomplete="off">';
    } else {
      options.innerHTML = question.e_kitap_secenekleri.map(function(option, index) {
        return '<button class="quiz-option ' + (answer.secenek_id === option.id ? 'selected' : '') + '" type="button" data-option-id="' + esc(option.id) + '">' +
          '<span class="quiz-option-key">' + String.fromCharCode(65 + index) + '</span>' +
          '<span>' + esc(option.secenek_metni) + '</span>' +
        '</button>';
      }).join('');
    }
    document.getElementById('quizPrevious').disabled = state.quizIndex === 0;
    const nextButton = document.getElementById('quizNext');
    nextButton.innerHTML = state.quizIndex === total - 1
      ? 'Karnemi Hazırla<i data-lucide="chart-no-axes-column-increasing"></i>'
      : 'Sonraki<i data-lucide="arrow-right"></i>';
    refreshIcons();
  }

  function selectQuizOption(optionId) {
    state.answers[state.quizIndex] = {
      soru_id: state.questions[state.quizIndex].id,
      secenek_id: optionId,
      metin: '',
    };
    renderQuiz();
  }

  function syncFillAnswer() {
    const input = document.getElementById('quizFillAnswer');
    if (!input) return;
    state.answers[state.quizIndex] = {
      soru_id: state.questions[state.quizIndex].id,
      secenek_id: '',
      metin: input.value,
    };
  }

  function nextQuiz() {
    syncFillAnswer();
    if (!answerIsFilled(state.quizIndex)) {
      window.alert('Bu soruyu cevapladıktan sonra devam edebilirsin.');
      return;
    }
    if (state.quizIndex >= state.questions.length - 1) {
      saveResult();
      return;
    }
    state.quizIndex += 1;
    renderQuiz();
  }

  function previousQuiz() {
    syncFillAnswer();
    if (state.quizIndex <= 0) return;
    state.quizIndex -= 1;
    renderQuiz();
  }

  function localEvaluation() {
    let correct = 0;
    const evaluated = state.questions.map(function(question, index) {
      const answer = getAnswer(index);
      let isCorrect = false;
      let selectedText = answer.metin || '';
      let correctText = question.dogru_metin || '';
      if (question.soru_tipi === 'bosluk-doldurma') {
        isCorrect = clean(answer.metin).toLocaleLowerCase('tr-TR') === clean(question.dogru_metin).toLocaleLowerCase('tr-TR');
      } else {
        const selected = question.e_kitap_secenekleri.find(function(option) { return option.id === answer.secenek_id; });
        const correctOption = question.e_kitap_secenekleri.find(function(option) { return option.dogru_mu; });
        selectedText = selected ? selected.secenek_metni : '';
        correctText = correctOption ? correctOption.secenek_metni : '';
        isCorrect = Boolean(selected && selected.dogru_mu);
      }
      if (isCorrect) correct += 1;
      return {
        soru_id: question.id,
        soru_metni: question.soru_metni,
        cevap_metni: selectedText,
        dogru_metin: correctText,
        dogru_mu: isCorrect,
      };
    });
    const total = state.questions.length;
    const seconds = Math.max(1, state.activeMs / 1000);
    return {
      result: {
        attempt_id: state.attemptId,
        e_kitap_id: state.book.id,
        e_kitap_adi: state.book.baslik,
        ad: state.reader.ad,
        soyad: state.reader.soyad,
        sinif: state.reader.sinif,
        sube: state.reader.sube,
        okuma_suresi_sn: seconds,
        toplam_sayfa: Number(state.book.sayfa_sayisi || state.pageUrls.length || 1),
        kelime_sayisi: Number(state.book.kelime_sayisi || 0),
        dakika_kelime: Math.round(Number(state.book.kelime_sayisi || 0) / (seconds / 60)),
        hedef_hiz: Number(state.book.hedef_hiz || 0),
        dogru_sayisi: correct,
        yanlis_sayisi: Math.max(0, total - correct),
        toplam_soru: total,
        anlama_yuzdesi: total ? Math.round(correct / total * 100) : 0,
        cevaplar_json: evaluated,
      },
      benchmark: {
        reader_count: 0,
        average_wpm: 0,
        average_comprehension: 0,
        average_duration_sec: 0,
        average_pages_per_minute: 0,
      },
    };
  }

  function resultPayload() {
    return {
      attempt_id: state.attemptId,
      e_kitap_id: state.book.id,
      visitor_id: getVisitorId(),
      ad: state.reader.ad,
      soyad: state.reader.soyad,
      sinif: state.reader.sinif,
      sube: state.reader.sube,
      il: state.reader.il || '',
      ilce: state.reader.ilce || '',
      okul: state.reader.okul || '',
      okuma_suresi_sn: Math.max(1, Math.round(state.activeMs / 10) / 100),
      tamamlanan_sayfa: Number(state.book.sayfa_sayisi || state.pageUrls.length || 1),
      cevaplar: state.answers,
      detay_json: {
        source_type: state.book.kaynak_turu,
        max_page_visited: state.maxPageVisited + 1,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      },
    };
  }

  function queuePayload(payload) {
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      const filtered = (Array.isArray(queue) ? queue : []).filter(function(item) {
        return item && item.attempt_id !== payload.attempt_id;
      });
      filtered.push(payload);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered.slice(-20)));
    } catch (error) {}
  }

  async function flushQueue() {
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch (error) {
      return;
    }
    if (!Array.isArray(queue) || !queue.length) return;
    const remaining = [];
    for (const payload of queue) {
      const response = await sb.rpc('save_e_kitap_result', { p_payload: payload });
      if (response.error) remaining.push(payload);
    }
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining)); } catch (error) {}
  }

  async function saveResult() {
    setStage('loadingStage');
    setLoading('Karne hazırlanıyor', 'Okuma hızı ve anlama sonuçları hesaplanıyor.', 60);
    const payload = resultPayload();
    const local = localEvaluation();
    let saved = false;
    try {
      const response = await sb.rpc('save_e_kitap_result', { p_payload: payload });
      if (response.error) throw response.error;
      state.result = response.data.result || local.result;
      state.benchmark = response.data.benchmark || local.benchmark;
      saved = true;
    } catch (error) {
      console.warn('E-kitap sonucu sıraya alındı:', error);
      queuePayload(payload);
      state.result = local.result;
      state.benchmark = local.benchmark;
    }
    renderReport(saved);
    saveProgress(true);
    setStage('reportStage');
  }

  function renderReport(saved) {
    const result = state.result;
    const benchmark = state.benchmark || {};
    const seconds = Number(result.okuma_suresi_sn || 0);
    const pages = Number(result.toplam_sayfa || state.book.sayfa_sayisi || 1);
    const ppm = seconds > 0 ? pages / (seconds / 60) : 0;
    document.getElementById('reportStudent').textContent = result.ad + ' ' + result.soyad;
    document.getElementById('reportBook').textContent = state.book.baslik + ' · ' + result.sinif + '. Sınıf';
    document.getElementById('reportComprehension').textContent = Number(result.anlama_yuzdesi || 0) + '%';
    document.getElementById('reportWpm').textContent = Number(result.dakika_kelime || 0);
    document.getElementById('reportDuration').textContent = formatDuration(seconds);
    document.getElementById('reportCorrect').textContent = Number(result.dogru_sayisi || 0) + '/' + Number(result.toplam_soru || 0);
    document.getElementById('reportPpm').textContent = ppm.toFixed(1);
    const saveNode = document.getElementById('resultSaveState');
    saveNode.className = 'save-state ' + (saved ? '' : 'queued');
    saveNode.textContent = saved
      ? 'Sonucun güvenli olarak sisteme kaydedildi.'
      : 'Bağlantı kurulamadı. Sonucun bu cihazda korundu ve bağlantı geldiğinde yeniden gönderilecek.';

    const readerCount = Number(benchmark.reader_count || 0);
    const groupAvailable = readerCount >= 3;
    const speedDeltaTarget = Number(result.dakika_kelime || 0) - Number(result.hedef_hiz || state.book.hedef_hiz || 0);
    const speedText = speedDeltaTarget >= 0
      ? 'Öğretmen hedefinin ' + Math.abs(speedDeltaTarget) + ' kelime/dk üzerindesin.'
      : 'Öğretmen hedefine ulaşmak için ' + Math.abs(speedDeltaTarget) + ' kelime/dk gelişim alanın var.';
    document.getElementById('benchmarkNote').textContent = groupAvailable
      ? speedText + ' Aynı kitabı ' + result.sinif + '. sınıf düzeyinde okuyan ' + readerCount + ' okuyucunun ortalaması ' + Number(benchmark.average_wpm || 0) + ' kelime/dk ve anlama ortalaması %' + Number(benchmark.average_comprehension || 0) + '.'
      : speedText + ' Sınıf bazlı okuyucu ortalaması en az 3 tamamlanmış okuma sonrasında gösterilecek.';

    renderAnswerReview();
    renderCharts(groupAvailable);
    refreshIcons();
  }

  function renderAnswerReview() {
    const node = document.getElementById('answerReview');
    const rows = localEvaluation().result.cevaplar_json;
    if (!rows.length) {
      node.innerHTML = '<div class="answer-row"><strong>Bu kitapta anlama sorusu bulunmuyor.</strong><span>Karne okuma hızı ve süre üzerinden hazırlandı.</span></div>';
      return;
    }
    node.innerHTML = rows.map(function(row, index) {
      return '<div class="answer-row ' + (row.dogru_mu ? '' : 'wrong') + '">' +
        '<strong>' + (index + 1) + '. ' + esc(row.soru_metni) + '</strong>' +
        '<span>Senin cevabın: ' + esc(row.cevap_metni || 'Boş') + (row.dogru_mu ? ' · Doğru' : ' · Doğru cevap: ' + esc(row.dogru_metin || '-')) + '</span>' +
      '</div>';
    }).join('');
  }

  function renderCharts(groupAvailable) {
    if (!window.Chart) return;
    if (state.speedChart) state.speedChart.destroy();
    if (state.comprehensionChart) state.comprehensionChart.destroy();
    const result = state.result;
    const benchmark = state.benchmark || {};
    state.speedChart = new window.Chart(document.getElementById('speedChart'), {
      type: 'bar',
      data: {
        labels: ['Sen', 'Öğretmen Hedefi', 'Okuyucu Ortalaması'],
        datasets: [{
          label: 'Kelime / dakika',
          data: [
            Number(result.dakika_kelime || 0),
            Number(result.hedef_hiz || state.book.hedef_hiz || 0),
            groupAvailable ? Number(benchmark.average_wpm || 0) : null,
          ],
          backgroundColor: ['#6C3DED', '#FF6052', '#00A995'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Okuma Hızı Kıyaslaması' } },
        scales: { y: { beginAtZero: true } },
      },
    });
    state.comprehensionChart = new window.Chart(document.getElementById('comprehensionChart'), {
      type: 'bar',
      data: {
        labels: ['Sen', 'Okuyucu Ortalaması'],
        datasets: [{
          label: 'Anlama yüzdesi',
          data: [
            Number(result.anlama_yuzdesi || 0),
            groupAvailable ? Number(benchmark.average_comprehension || 0) : null,
          ],
          backgroundColor: ['#6C3DED', '#00A995'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Anlama Puanı Kıyaslaması' } },
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });
  }

  async function downloadReport() {
    const button = document.getElementById('downloadReportButton');
    button.disabled = true;
    const old = button.innerHTML;
    button.textContent = 'PDF hazırlanıyor...';
    try {
      const canvas = await window.html2canvas(document.getElementById('reportCard'), {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const jsPDF = window.jspdf.jsPDF;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 190;
      const pageHeight = 277;
      const imageHeight = canvas.height * pageWidth / canvas.width;
      const imageData = canvas.toDataURL('image/jpeg', 0.94);
      let position = 10;
      let remaining = imageHeight;
      pdf.addImage(imageData, 'JPEG', 10, position, pageWidth, imageHeight);
      remaining -= pageHeight;
      while (remaining > 0) {
        position = 10 - (imageHeight - remaining);
        pdf.addPage();
        pdf.addImage(imageData, 'JPEG', 10, position, pageWidth, imageHeight);
        remaining -= pageHeight;
      }
      pdf.save(clean(state.book.baslik).replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+/g, '-') + '-okuma-karnesi.pdf');
    } catch (error) {
      window.alert('PDF hazırlanamadı. Yazdır seçeneğini kullanabilirsin.');
    } finally {
      button.disabled = false;
      button.innerHTML = old;
      refreshIcons();
    }
  }

  async function loadSocial() {
    if (!state.book) return;
    const response = await sb.rpc('get_e_kitap_social', { p_e_kitap_id: state.book.id });
    if (!response.error && response.data) {
      state.social = Object.assign(state.social, response.data);
    }
    updateSocialButtons();
  }

  function updateSocialButtons() {
    const count = Number(state.social.like_count || state.social.count || 0);
    const countNode = document.getElementById('likeCount');
    const likeButton = document.getElementById('likeBookAction');
    if (countNode) countNode.textContent = count;
    if (likeButton) likeButton.classList.toggle('primary', Boolean(state.social.liked));
  }

  async function toggleLike() {
    await ensureAuth();
    if (!state.authState || !state.authState.user) {
      window.location.href = '/giris.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    const response = await sb.rpc('toggle_e_kitap_begeni', { p_e_kitap_id: state.book.id });
    if (response.error) {
      window.alert(response.error.message);
      return;
    }
    state.social.liked = Boolean(response.data.liked);
    state.social.like_count = Number(response.data.count || 0);
    updateSocialButtons();
  }

  function bindPan() {
    const viewport = document.getElementById('bookViewport');
    viewport.addEventListener('pointerdown', function(event) {
      if (state.zoom <= 1) return;
      state.drag = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', function(event) {
      if (!state.drag) return;
      state.panX = state.drag.panX + (event.clientX - state.drag.x);
      state.panY = state.drag.panY + (event.clientY - state.drag.y);
      applyTransform();
    });
    function endDrag() { state.drag = null; }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
  }

  function bindEvents() {
    document.getElementById('readerForm').addEventListener('submit', startReading);
    document.getElementById('retryButton').addEventListener('click', function() {
      if (state.reader) prepareReader();
      else loadBook();
    });
    ['previousPage', 'toolbarPrevious'].forEach(function(id) {
      document.getElementById(id).addEventListener('click', previousPage);
    });
    ['nextPage', 'toolbarNext'].forEach(function(id) {
      document.getElementById(id).addEventListener('click', nextPage);
    });
    document.getElementById('thumbnailButton').addEventListener('click', function() {
      document.getElementById('thumbnailDrawer').classList.toggle('open');
    });
    document.getElementById('closeThumbnails').addEventListener('click', function() {
      document.getElementById('thumbnailDrawer').classList.remove('open');
    });
    document.getElementById('thumbnailGrid').addEventListener('click', function(event) {
      const button = event.target.closest('[data-page]');
      if (button) goToPage(Number(button.dataset.page));
    });
    document.getElementById('zoomInButton').addEventListener('click', function() { setZoom(state.zoom + 0.25); });
    document.getElementById('zoomOutButton').addEventListener('click', function() { setZoom(state.zoom - 0.25); });
    document.getElementById('fitButton').addEventListener('click', function() { setZoom(1); });
    document.getElementById('fullscreenButton').addEventListener('click', async function() {
      try {
        if (!getFullscreenElement()) await requestReaderFullscreen();
        else await exitFullscreenIfNeeded();
      } catch (error) {}
    });
    document.getElementById('finishReadingButton').addEventListener('click', finishReading);
    document.getElementById('quizOptions').addEventListener('click', function(event) {
      const button = event.target.closest('[data-option-id]');
      if (button) selectQuizOption(button.dataset.optionId);
    });
    document.getElementById('quizOptions').addEventListener('input', syncFillAnswer);
    document.getElementById('quizPrevious').addEventListener('click', previousQuiz);
    document.getElementById('quizNext').addEventListener('click', nextQuiz);
    document.getElementById('printReportButton').addEventListener('click', function() { window.print(); });
    document.getElementById('downloadReportButton').addEventListener('click', downloadReport);
    document.getElementById('saveBookAction').addEventListener('click', toggleSave);
    document.getElementById('likeBookAction').addEventListener('click', toggleLike);
    document.getElementById('readerCity').addEventListener('change', populateReaderDistricts);
    document.getElementById('readerDistrict').addEventListener('change', populateReaderSchools);
    document.getElementById('readerSchool').addEventListener('change', syncManualSchoolField);
    document.getElementById('readerSchoolMissing').addEventListener('change', function() {
      const school = document.getElementById('readerSchool');
      if (!this.checked && school.value === SCHOOL_MISSING_VALUE) school.value = '';
      syncManualSchoolField();
    });
    function syncFullscreenButton() {
      const button = document.getElementById('fullscreenButton');
      if (!button) return;
      button.title = getFullscreenElement() ? 'Tam ekrandan çık' : 'Tam ekran';
      button.innerHTML = getFullscreenElement()
        ? '<i data-lucide="minimize"></i>'
        : '<i data-lucide="maximize"></i>';
      refreshIcons();
    }
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
    document.addEventListener('keydown', function(event) {
      if (!document.getElementById('bookStage').classList.contains('active') || event.target.matches('input,textarea,select')) return;
      if (event.key === 'ArrowLeft') previousPage();
      if (event.key === 'ArrowRight') nextPage();
      if (event.key === 'Escape') document.getElementById('thumbnailDrawer').classList.remove('open');
    });
    document.addEventListener('visibilitychange', function() {
      state.lastTick = performance.now();
      if (document.hidden) saveProgress(false);
    });
    window.addEventListener('pagehide', function() {
      saveProgress(false);
      stopTimer();
    });
    bindPan();
  }

  document.addEventListener('DOMContentLoaded', async function() {
    populateReaderCities();
    bindEvents();
    refreshIcons();
    setStage('loadingStage');
    setLoading('E-kitap yükleniyor', 'Kitap bilgileri hazırlanıyor.', 12);
    await flushQueue();
    await loadBook();
  });

  window.addEventListener('beforeunload', function() {
    state.pageUrls.forEach(function(url) {
      try { URL.revokeObjectURL(url); } catch (error) {}
    });
    if (state.coverUrl) {
      try { URL.revokeObjectURL(state.coverUrl); } catch (error) {}
    }
  });
})();
