(function() {
  'use strict';

  const BUCKET_NAME = window.kemalDocumentStore.getBucketName();
  const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
  const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

  const state = {
    documents: [],
    editingId: null,
    selectedDocument: null,
    currentPdfMeta: null,
    filters: {
      grade: '',
      subject: '',
      status: '',
    },
  };

  let toastTimer = null;
  let pdfWorkerReady = false;

  function getClient() {
    return window.kemalAdminAuth.getClient();
  }

  function escHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(message, type) {
    const el = document.getElementById('toast');
    if (!el) {
      return;
    }
    el.textContent = message;
    el.className = 'toast ' + (type || 'success') + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      el.classList.remove('show');
    }, 3200);
  }

  function humanizeSupabaseError(error) {
    const message = String(error && error.message ? error.message : '');
    const details = String(error && error.details ? error.details : '');
    const hint = String(error && error.hint ? error.hint : '');
    const code = String(error && error.code ? error.code : '');
    const combined = (message + ' ' + details + ' ' + hint + ' ' + code).toLowerCase();

    if (combined.includes('bucket not found')) {
      return 'Supabase bucket bulunamadı. `supabase-dokumanlar.sql` dosyasını SQL Editor içinde çalıştırıp `dokumanlar` bucket\'ını oluşturmalısın.';
    }

    if (
      combined.includes('could not find the table') ||
      combined.includes('schema cache') ||
      combined.includes('relation "public.dokumanlar" does not exist') ||
      combined.includes('pgrst205')
    ) {
      return 'Supabase `dokumanlar` tablosu bulunamadı. `supabase-dokumanlar.sql` dosyasını doğru projede çalıştırman gerekiyor.';
    }

    return message || 'İşlem sırasında beklenmeyen bir hata oluştu.';
  }

  function ensurePdfWorker() {
    if (!window.pdfjsLib) {
      throw new Error('PDF kutuphanesi yuklenemedi.');
    }
    if (!pdfWorkerReady) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfWorkerReady = true;
    }
  }

  function formatBytes(value) {
    const num = Number(value || 0);
    if (!num) {
      return '0 KB';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = num;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return size.toFixed(size >= 10 || unit === 0 ? 0 : 1) + ' ' + units[unit];
  }

  function validatePdfFile(file) {
    if (!file) {
      return;
    }

    const name = String(file.name || '').toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    if (!isPdf) {
      throw new Error('Yalnızca PDF dosyası yükleyebilirsin.');
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      throw new Error('PDF dosyası en fazla ' + formatBytes(MAX_PDF_SIZE_BYTES) + ' olabilir.');
    }
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'dokuman';
  }

  function getSelectedFile() {
    const input = document.getElementById('fPdf');
    return input && input.files && input.files.length ? input.files[0] : null;
  }

  function getDocumentById(id) {
    return state.documents.find(function(item) {
      return item.id === id;
    }) || null;
  }

  function getViewerUrl(id) {
    return window.location.origin + window.kemalDocumentStore.buildViewerUrl(id);
  }

  function getSelectedSubjectMeta() {
    return window.kemalDocumentStore.getSubjectMeta(document.getElementById('fDers').value);
  }

  function setFileInfo(message) {
    document.getElementById('fileInfo').textContent = message;
  }

  function updateSummary() {
    const title = document.getElementById('fBaslik').value.trim();
    const grade = document.getElementById('fSinif').value;
    const subject = document.getElementById('fDers').value;
    const subjectMeta = getSelectedSubjectMeta();
    const gradeLabel = grade ? window.kemalDocumentStore.getGradeLabel(grade) : 'Sınıf seçilmedi';
    const subjectLabel = subjectMeta ? subjectMeta.label : 'Ders seçilmedi';
    const activeLabel = document.getElementById('fAktif').checked ? 'Aktif yayın' : 'Pasif kayıt';
    const existing = state.editingId ? getDocumentById(state.editingId) : null;
    const file = getSelectedFile();
    const meta = state.currentPdfMeta || existing;

    document.getElementById('summaryTitle').textContent = title || 'Henüz başlık girilmedi.';
    document.getElementById('summaryRoute').textContent =
      grade && subject
        ? gradeLabel + ' → ' + subjectLabel + ' altında listelenecek. (' + activeLabel + ')'
        : 'Sınıf ve ders seçildiğinde yayın yolu burada görünür.';

    if (file) {
      document.getElementById('summaryMeta').textContent =
        file.name + ' · ' +
        formatBytes(file.size) +
        (meta && meta.pageCount ? ' · ' + meta.pageCount + ' sayfa' : ' · Sayfa sayısı okunuyor…');
      return;
    }

    if (existing) {
      document.getElementById('summaryMeta').textContent =
        (existing.dosya_adi || 'Mevcut PDF') +
        ' · ' + formatBytes(existing.dosya_boyutu || 0) +
        ((existing.sayfa_sayisi || 0) ? ' · ' + existing.sayfa_sayisi + ' sayfa' : '');
      return;
    }

    document.getElementById('summaryMeta').textContent = 'Dosya seçildiğinde sayfa sayısı ve boyut bilgisi hesaplanır.';
  }

  function showListPanel() {
    document.getElementById('panelEdit').style.display = 'none';
    document.getElementById('panelList').style.display = 'block';
  }

  function showEditPanel() {
    document.getElementById('panelList').style.display = 'none';
    document.getElementById('panelEdit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    state.editingId = null;
    state.selectedDocument = null;
    state.currentPdfMeta = null;
    document.getElementById('editTitle').textContent = 'Yeni Doküman';
    document.getElementById('editStatus').textContent = 'Yeni bir PDF yükleyip sınıf ve dersle eşleştirebilirsin.';
    document.getElementById('fBaslik').value = '';
    document.getElementById('fAciklama').value = '';
    document.getElementById('fSinif').value = '1';
    document.getElementById('fDers').value = (window.kemalDocumentStore.getSubjects()[0] || {}).key || '';
    document.getElementById('fSiralama').value = '0';
    document.getElementById('fKapakRenk').value = '#6C3DED';
    document.getElementById('fAktif').checked = true;
    document.getElementById('fOturumGerekli').checked = false;
    document.getElementById('fPdf').value = '';
    setFileInfo('Henüz bir dosya seçilmedi. Yeni kayıt için PDF zorunludur, düzenlemede istersen mevcut dosyayı koruyabilirsin.');
    updateSummary();
  }

  function populateSelects() {
    const subjects = window.kemalDocumentStore.getSubjects();
    document.getElementById('fSinif').innerHTML = GRADES.map(function(grade) {
      return '<option value="' + grade + '">' + window.kemalDocumentStore.getGradeLabel(grade) + '</option>';
    }).join('');

    const subjectOptions = subjects.map(function(subject) {
      return '<option value="' + subject.key + '">' + subject.icon + ' ' + subject.label + '</option>';
    }).join('');

    document.getElementById('fDers').innerHTML = subjectOptions;
    document.getElementById('filterSubject').innerHTML =
      '<option value="">Tüm dersler</option>' + subjectOptions;
  }

  function renderDocuments() {
    const grade = state.filters.grade;
    const subject = state.filters.subject;
    const status = state.filters.status;
    const grid = document.getElementById('documentGrid');

    const filtered = state.documents.filter(function(item) {
      if (grade && String(item.sinif) !== String(grade)) {
        return false;
      }
      if (subject && item.ders !== subject) {
        return false;
      }
      if (status === 'active' && !item.aktif) {
        return false;
      }
      if (status === 'inactive' && item.aktif) {
        return false;
      }
      return true;
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1;"><span>📭</span><p>Seçili filtrelerde doküman bulunamadı.</p></div>';
      return;
    }

    grid.innerHTML = filtered.map(function(item) {
      const subjectMeta = window.kemalDocumentStore.getSubjectMeta(item.ders);
      return (
        '<article class="doc-card">' +
          '<div class="doc-top">' +
            '<div class="doc-badge">' + window.kemalDocumentStore.getGradeLabel(item.sinif) + ' · ' + escHtml(subjectMeta ? subjectMeta.label : item.ders) + '</div>' +
            '<div class="doc-status ' + (item.aktif ? 'on' : 'off') + '">' + (item.aktif ? 'Aktif' : 'Pasif') + '</div>' +
          '</div>' +
          '<div class="doc-title">' + escHtml(item.baslik) + '</div>' +
          '<div class="doc-desc">' + escHtml(item.aciklama || 'Açıklama eklenmedi.') + '</div>' +
          '<div class="doc-meta">' +
            '<span>📄 ' + escHtml(item.dosya_adi || 'PDF') + '</span>' +
            '<span>📚 ' + Number(item.sayfa_sayisi || 0) + ' sayfa</span>' +
            '<span>📦 ' + formatBytes(item.dosya_boyutu || 0) + '</span>' +
          '</div>' +
          '<div class="doc-actions">' +
            '<button class="btn-edit" type="button" onclick="dokumanDuzenle(\'' + item.id + '\')">Düzenle</button>' +
            '<a class="btn-open" href="' + escHtml(window.kemalDocumentStore.buildViewerUrl(item.id)) + '" target="_blank" rel="noreferrer">Aç</a>' +
            '<button class="btn-worksheet" type="button" onclick="calismaKagidiDuzenle(\'' + item.id + '\')">Çalışma Kağıdı</button>' +
          '</div>' +
          '<div class="doc-actions">' +
            '<button class="btn-open" type="button" onclick="durumDegistir(\'' + item.id + '\')">' + (item.aktif ? 'Pasife Al' : 'Aktife Al') + '</button>' +
            '<button class="btn-delete" type="button" onclick="dokumanSil(\'' + item.id + '\')">Sil</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  async function loadDocuments() {
    const grid = document.getElementById('documentGrid');
    grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1;"><span>⏳</span><p>Dokümanlar yükleniyor…</p></div>';

    const result = await getClient()
      .from('dokumanlar')
      .select('*')
      .order('siralama', { ascending: true })
      .order('olusturma_tarihi', { ascending: false });

    if (result.error) {
      grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1;"><span>⚠️</span><p>Dokümanlar yüklenemedi.</p></div>';
      toast(humanizeSupabaseError(result.error), 'error');
      return;
    }

    state.documents = result.data || [];
    renderDocuments();
  }

  async function extractPdfMeta(file) {
    validatePdfFile(file);
    ensurePdfWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return {
      pageCount: pdf.numPages || 0,
      size: file.size || 0,
    };
  }

  async function handleFileChange() {
    const file = getSelectedFile();
    state.currentPdfMeta = null;

    if (!file) {
      const existing = state.editingId ? getDocumentById(state.editingId) : null;
      if (existing) {
        setFileInfo('Mevcut dosya korunacak: ' + existing.dosya_adi + ' · ' + formatBytes(existing.dosya_boyutu) + ' · ' + (existing.sayfa_sayisi || 0) + ' sayfa');
      } else {
        setFileInfo('Henüz bir dosya seçilmedi. Yeni kayıt için PDF zorunludur, düzenlemede istersen mevcut dosyayı koruyabilirsin.');
      }
      updateSummary();
      return;
    }

    try {
      validatePdfFile(file);
    } catch (error) {
      document.getElementById('fPdf').value = '';
      setFileInfo(error.message + ' Dosya seçimi temizlendi.');
      toast(error.message, 'error');
      updateSummary();
      return;
    }

    setFileInfo(file.name + ' seçildi. Sayfa sayısı hesaplanıyor…');
    updateSummary();

    try {
      const meta = await extractPdfMeta(file);
      state.currentPdfMeta = meta;
      setFileInfo(file.name + ' · ' + formatBytes(file.size) + ' · ' + meta.pageCount + ' sayfa');
      updateSummary();
    } catch (error) {
      setFileInfo(file.name + ' seçildi fakat PDF okunamadı.');
      toast('PDF bilgisi okunamadı: ' + error.message, 'error');
    }
  }

  function buildStoragePath(documentId, title, grade, subject, fileName) {
    const baseName = slugify(title || fileName || 'dokuman');
    return [
      String(grade || 'genel'),
      slugify(subject || 'dokuman'),
      documentId,
      Date.now() + '-' + baseName + '.pdf',
    ].join('/');
  }

  async function uploadPdf(documentId, file, grade, subject, title) {
    const path = buildStoragePath(documentId, title, grade, subject, file.name);
    const response = await getClient().storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });

    if (response.error) {
      throw response.error;
    }

    return path;
  }

  function collectPayload() {
    const title = document.getElementById('fBaslik').value.trim();
    const description = document.getElementById('fAciklama').value.trim();
    const grade = parseInt(document.getElementById('fSinif').value, 10);
    const subject = window.kemalDocumentStore.normalizeSubjectKey(document.getElementById('fDers').value);
    const sortOrder = parseInt(document.getElementById('fSiralama').value || '0', 10) || 0;
    const coverColor = document.getElementById('fKapakRenk').value || '#6C3DED';
    const active = document.getElementById('fAktif').checked;
    const file = getSelectedFile();
    const existing = state.editingId ? getDocumentById(state.editingId) : null;

    if (!title) {
      throw new Error('Doküman başlığı zorunlu.');
    }
    if (!grade || !subject) {
      throw new Error('Sınıf ve ders seçmelisin.');
    }
    if (!existing && !file) {
      throw new Error('Yeni kayıt için bir PDF yüklemelisin.');
    }
    if (file) {
      validatePdfFile(file);
    }

    return {
      title: title,
      description: description,
      grade: grade,
      subject: subject,
      sortOrder: sortOrder,
      coverColor: coverColor,
      active: active,
      file: file,
      existing: existing,
    };
  }

  async function save(options) {
    try {
      const shouldPrepare = Boolean(options && options.openInteractionEditor);
      const data = collectPayload();
      const documentId = state.editingId || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'doc_' + Date.now());
      let filePath = data.existing ? data.existing.dosya_yolu : '';
      let fileName = data.existing ? data.existing.dosya_adi : '';
      let fileSize = data.existing ? Number(data.existing.dosya_boyutu || 0) : 0;
      let pageCount = data.existing ? Number(data.existing.sayfa_sayisi || 0) : 0;

      if (data.file) {
        const meta = state.currentPdfMeta || await extractPdfMeta(data.file);
        filePath = await uploadPdf(documentId, data.file, data.grade, data.subject, data.title);
        fileName = data.file.name;
        fileSize = data.file.size || 0;
        pageCount = meta.pageCount || 0;
      }

      const payload = {
        baslik: data.title,
        aciklama: data.description,
        sinif: data.grade,
        ders: data.subject,
        dosya_yolu: filePath,
        dosya_adi: fileName,
        dosya_boyutu: fileSize,
        sayfa_sayisi: pageCount,
        kapak_renk: data.coverColor,
        siralama: data.sortOrder,
        aktif: data.active,
        oturum_gerekli: false,
        guncelleme_tarihi: new Date().toISOString(),
      };

      let response;
      if (state.editingId) {
        response = await getClient()
          .from('dokumanlar')
          .update(payload)
          .eq('id', state.editingId)
          .select()
          .single();
      } else {
        response = await getClient()
          .from('dokumanlar')
          .insert(Object.assign({
            id: documentId,
            olusturma_tarihi: new Date().toISOString(),
          }, payload))
          .select()
          .single();
      }

      if (response.error) {
        throw response.error;
      }

      state.editingId = response.data.id;
      state.selectedDocument = response.data;
      document.getElementById('editTitle').textContent = 'Düzenle: ' + response.data.baslik;
      document.getElementById('editStatus').textContent = 'Kayıt tamamlandı. İstersen bağlantıyı hemen açabilir veya listeye dönebilirsin.';
      toast('Doküman kaydedildi.', 'success');
      await loadDocuments();
      openEditor(getDocumentById(response.data.id) || response.data);
      if (shouldPrepare) {
        window.location.href = window.kemalDocumentStore.buildViewerUrl(response.data.id) + '&edit=1';
      }
    } catch (error) {
      toast(humanizeSupabaseError(error), 'error');
    }
  }

  async function toggleActive(documentId) {
    const item = getDocumentById(documentId);
    if (!item) {
      return;
    }

    const response = await getClient()
      .from('dokumanlar')
      .update({
        aktif: !item.aktif,
        guncelleme_tarihi: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (response.error) {
      toast(humanizeSupabaseError(response.error), 'error');
      return;
    }

    toast(item.aktif ? 'Doküman pasife alındı.' : 'Doküman aktifleştirildi.', 'success');
    await loadDocuments();
  }

  async function deleteDocument(documentId) {
    const item = getDocumentById(documentId);
    if (!item) {
      return;
    }

    const ok = window.confirm('"' + item.baslik + '" dokümanını silmek istiyor musun? Bu işlem PDF kaydını da kaldırır.');
    if (!ok) {
      return;
    }

    const response = await getClient().from('dokumanlar').delete().eq('id', documentId);
    if (response.error) {
      toast(humanizeSupabaseError(response.error), 'error');
      return;
    }

    if (item.dosya_yolu) {
      await getClient().storage.from(BUCKET_NAME).remove([item.dosya_yolu]);
    }

    if (state.editingId === documentId) {
      resetForm();
      showListPanel();
    }
    toast('Doküman silindi.', 'success');
    await loadDocuments();
  }

  function openEditor(item) {
    const doc = item || null;
    resetForm();
    showEditPanel();

    if (!doc) {
      updateSummary();
      return;
    }

    state.editingId = doc.id;
    state.selectedDocument = doc;
    document.getElementById('editTitle').textContent = 'Düzenle: ' + doc.baslik;
    document.getElementById('editStatus').textContent = 'ID: ' + doc.id.slice(0, 8) + '… · Görüntüleme bağlantısı hazır.';
    document.getElementById('fBaslik').value = doc.baslik || '';
    document.getElementById('fAciklama').value = doc.aciklama || '';
    document.getElementById('fSinif').value = String(doc.sinif || 1);
    document.getElementById('fDers').value = doc.ders || (window.kemalDocumentStore.getSubjects()[0] || {}).key || '';
    document.getElementById('fSiralama').value = String(doc.siralama || 0);
    document.getElementById('fKapakRenk').value = doc.kapak_renk || '#6C3DED';
    document.getElementById('fAktif').checked = Boolean(doc.aktif);
    document.getElementById('fOturumGerekli').checked = Boolean(doc.oturum_gerekli);
    setFileInfo('Mevcut dosya: ' + (doc.dosya_adi || 'PDF') + ' · ' + formatBytes(doc.dosya_boyutu || 0) + ' · ' + (doc.sayfa_sayisi || 0) + ' sayfa');
    updateSummary();
  }

  async function copyToClipboard(text) {
    if (!text) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        document.body.appendChild(area);
        area.select();
        const success = document.execCommand('copy');
        area.remove();
        return success;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  async function copyViewerLink() {
    if (!state.editingId) {
      toast('Önce dokümanı kaydetmelisin.', 'error');
      return;
    }
    const success = await copyToClipboard(getViewerUrl(state.editingId));
    toast(success ? 'Görüntüleme linki kopyalandı.' : 'Link kopyalanamadı.', success ? 'success' : 'error');
  }

  function openViewer() {
    if (!state.editingId) {
      toast('Önce dokümanı kaydetmelisin.', 'error');
      return;
    }
    window.open(window.kemalDocumentStore.buildViewerUrl(state.editingId), '_blank');
  }

  function openInteractionEditor() {
    if (!state.editingId) {
      toast('Önce dokümanı kaydetmelisin.', 'error');
      return;
    }
    window.open(window.kemalDocumentStore.buildViewerUrl(state.editingId) + '&edit=1', '_blank');
  }

  function openWorksheetBuilder(documentId) {
    if (!documentId) {
      toast('Önce dokümanı kaydetmelisin.', 'error');
      return;
    }
    window.location.href = '/admin/calisma-kagidi-editor.html?dokumanId=' + encodeURIComponent(documentId);
  }

  function applyFilters() {
    state.filters.grade = document.getElementById('filterGrade').value;
    state.filters.subject = document.getElementById('filterSubject').value;
    state.filters.status = document.getElementById('filterStatus').value;
    renderDocuments();
  }

  function clearFilters() {
    document.getElementById('filterGrade').value = '';
    document.getElementById('filterSubject').value = '';
    document.getElementById('filterStatus').value = '';
    applyFilters();
  }

  async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('loginErr');

    if (!email || !password) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ E-posta ve şifre zorunlu.';
      return;
    }

    try {
      await window.kemalAdminAuth.signIn(email, password);
      errorEl.style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      showListPanel();
      await loadDocuments();
    } catch (error) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ ' + window.kemalAdminAuth.humanizeError(error);
      document.getElementById('loginPass').value = '';
    }
  }

  async function doLogout() {
    try {
      await window.kemalAdminAuth.signOut();
    } finally {
      window.location.reload();
    }
  }

  async function initAuth() {
    try {
      const session = await window.kemalAdminAuth.getSession();
      if (session) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        showListPanel();
        await loadDocuments();
        return;
      }
    } catch (error) {
      console.warn('Oturum okunamadi:', error);
    }

    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  function bindEvents() {
    ['fBaslik', 'fAciklama', 'fSinif', 'fDers', 'fSiralama', 'fKapakRenk', 'fAktif'].forEach(function(id) {
      const element = document.getElementById(id);
      const eventName = id === 'fKapakRenk' || id === 'fAktif' ? 'input' : 'input';
      element.addEventListener(eventName, updateSummary);
      if (id === 'fSinif' || id === 'fDers') {
        element.addEventListener('change', updateSummary);
      }
    });

    document.getElementById('fPdf').addEventListener('change', handleFileChange);
    document.getElementById('loginEmail').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });
    document.getElementById('loginPass').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async function() {
    // Dinamik ders listesini Supabase'den yükle
    try {
      const cfg = window.kemalDocumentStore.getConfig();
      if (cfg && cfg.supabaseUrl && window.supabase) {
        const dynClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
        });
        const res = await dynClient.from('menu_ogeler').select('ders_key,label,icon').eq('active', true);
        if (!res.error && window.kemalDocumentStore.mergeMenuItems) {
          window.kemalDocumentStore.mergeMenuItems(res.data || []);
        }
      }
    } catch (e) { /* tablo yoksa atla */ }

    populateSelects();
    bindEvents();
    resetForm();
    await initAuth();
  });

  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.yeniDokuman = function() {
    resetForm();
    showEditPanel();
  };
  window.listeye = function() {
    showListPanel();
    loadDocuments();
  };
  window.uygulaFiltre = applyFilters;
  window.filtreTemizle = clearFilters;
  window.dokumanDuzenle = function(id) {
    const item = getDocumentById(id);
    if (item) {
      openEditor(item);
    }
  };
  window.durumDegistir = toggleActive;
  window.dokumanSil = deleteDocument;
  window.kaydet = save;
  window.kaydetVeHazirla = function() {
    save({ openInteractionEditor: true });
  };
  window.viewerAc = openViewer;
  window.etkilesimEditorAc = openInteractionEditor;
  window.linkKopyala = copyViewerLink;
  window.calismaKagidiDuzenle = openWorksheetBuilder;
  window.calismaKagidiAc = function() {
    openWorksheetBuilder(state.editingId);
  };
})();
