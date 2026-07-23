(function() {
  'use strict';

  const BUCKET_NAME = window.kemalDocumentStore.getBucketName();
  const HOMEPAGE_SLIDES_TABLE = 'homepage_slides';
  const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
  const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;
  const MAX_SHOWCASE_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
  const MIN_OPTIMIZED_SAVINGS_RATIO = 0.95;
  const DOCUMENT_IMAGE_WEBP_QUALITY = 0.94;
  const SHOWCASE_IMAGE_WEBP_QUALITY = 0.9;
  const DOCUMENT_IMAGE_MAX_LONG_EDGE = 3600;
  const SHOWCASE_IMAGE_MAX_LONG_EDGE = 1800;
  const PDF_OPTIMIZE_MIN_BYTES = 4 * 1024 * 1024;
  const PDF_RENDER_LONG_EDGE = 2200;
  const PDF_JPEG_QUALITY = 0.88;
  const ALLOWED_FILE_TYPES = {
    pdf: { mime: 'application/pdf', extensions: ['pdf'], label: 'PDF' },
    jpeg: { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], label: 'JPEG' },
    png: { mime: 'image/png', extensions: ['png'], label: 'PNG' },
    webp: { mime: 'image/webp', extensions: ['webp'], label: 'WebP' },
  };

  const state = {
    documents: [],
    showcaseSlides: [],
    editingId: null,
    editingSlideId: null,
    selectedDocument: null,
    currentPdfMeta: null,
    contentKind: 'document',
    documentSource: 'supabase',
    targets: [],
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

  function can(permissionKey) {
    return !window.kemalAdminAuth || typeof window.kemalAdminAuth.hasPermission !== 'function'
      ? true
      : window.kemalAdminAuth.hasPermission(permissionKey);
  }

  function requirePermission(permissionKey, label) {
    if (can(permissionKey)) {
      return true;
    }
    toast((label || 'Bu işlem') + ' için yetkin yok.', 'error');
    return false;
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

    if (combined.includes('hedefler') || combined.includes('icerik_turu') || combined.includes('video_embed_url') || combined.includes('gizli') || combined.includes('dosya_kaynak')) {
      return 'Doküman/video şeması için Supabase yapısını güncellemelisin. `supabase-dokumanlar.sql` dosyasını SQL Editor içinde tekrar çalıştır.';
    }

    if (
      combined.includes('homepage_slides') ||
      combined.includes('relation "public.homepage_slides" does not exist') ||
      combined.includes('makale_html')
    ) {
      return 'Ana sayfa vitrini için Supabase yapısını kurmalısın. `supabase-ana-sayfa-vitrin.sql` dosyasını SQL Editor içinde çalıştır.';
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

  function isMissingRpcFunction(error, functionName) {
    const message = String(error && error.message ? error.message : '');
    const details = String(error && error.details ? error.details : '');
    const hint = String(error && error.hint ? error.hint : '');
    const code = String(error && error.code ? error.code : '');
    const combined = (message + ' ' + details + ' ' + hint + ' ' + code).toLowerCase();
    return (
      combined.includes('pgrst202') ||
      combined.includes('schema cache') ||
      combined.includes('could not find the function') ||
      (
        combined.includes(String(functionName || '').toLowerCase()) &&
        (combined.includes('does not exist') || combined.includes('not found'))
      )
    );
  }

  async function deleteDocumentWithLegacyFlow(item, isSupabaseDocument) {
    const documentId = item && item.id;
    if (!documentId) {
      return false;
    }

    const response = await getClient().from('dokumanlar').delete().eq('id', documentId);
    if (response.error) {
      toast(humanizeSupabaseError(response.error), 'error');
      return false;
    }

    if (isSupabaseDocument && item.dosya_yolu) {
      const storageResponse = await getClient().storage.from(BUCKET_NAME).remove([item.dosya_yolu]);
      if (storageResponse.error) {
        toast('Kayıt silindi fakat Supabase dosyası temizlenemedi: ' + humanizeSupabaseError(storageResponse.error), 'error');
        return true;
      }
    }

    return true;
  }

  function getStoragePathFromDeleteResult(data, item) {
    if (data && typeof data === 'object' && typeof data.storagePath === 'string' && data.storagePath.trim()) {
      return data.storagePath.trim();
    }
    if (item && typeof item.dosya_yolu === 'string' && item.dosya_yolu.trim()) {
      return item.dosya_yolu.trim();
    }
    return '';
  }

  async function removeDocumentStorageFile(path) {
    if (!path) {
      return true;
    }
    const storageResponse = await getClient().storage.from(BUCKET_NAME).remove([path]);
    if (storageResponse.error) {
      toast('Doküman kaydı silindi fakat Supabase dosyası temizlenemedi: ' + humanizeSupabaseError(storageResponse.error), 'error');
      return false;
    }
    return true;
  }

  async function removeDocumentStorageFiles(paths) {
    const unique = {};
    const list = (Array.isArray(paths) ? paths : [])
      .map(function(path) { return String(path || '').trim(); })
      .filter(function(path) {
        if (!path || unique[path]) {
          return false;
        }
        unique[path] = true;
        return true;
      });
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const response = await getClient().storage.from(BUCKET_NAME).remove(chunk);
      if (response.error) {
        throw response.error;
      }
    }
    return list.length;
  }

  async function cleanupOrphanDocumentStorage() {
    if (!requirePermission('dokuman_silme', 'Depo temizliği')) {
      return;
    }

    try {
      const listResponse = await getClient().rpc('list_orphan_dokuman_storage');
      if (listResponse.error) {
        throw listResponse.error;
      }

      const rows = Array.isArray(listResponse.data) ? listResponse.data : [];
      const paths = rows.map(function(row) { return row && row.name; }).filter(Boolean);
      if (!paths.length) {
        const artifactResponse = await getClient().rpc('cleanup_deleted_dokuman_artifacts');
        if (artifactResponse.error) {
          console.warn('Eski iz kayıtları temizlenemedi:', artifactResponse.error);
        }
        toast('Boşa düşmüş Supabase doküman dosyası bulunmadı.', 'success');
        return;
      }

      const preview = paths.slice(0, 8).join('\n');
      const extra = paths.length > 8 ? '\n… +' + (paths.length - 8) + ' dosya daha' : '';
      const ok = window.confirm(
        paths.length + ' kullanılmayan Supabase dosyası silinecek.\n\n' +
        preview + extra +
        '\n\nBu dosyalar doküman kayıtlarında veya ana sayfa vitrininde kullanılmıyor görünüyor. Devam edilsin mi?'
      );
      if (!ok) {
        return;
      }

      const removedCount = await removeDocumentStorageFiles(paths);
      const artifactResponse = await getClient().rpc('cleanup_deleted_dokuman_artifacts');
      if (artifactResponse.error) {
        console.warn('Eski iz kayıtları temizlenemedi:', artifactResponse.error);
      }
      toast(removedCount + ' kullanılmayan Supabase dosyası silindi.', 'success');
    } catch (error) {
      toast('Depo temizliği yapılamadı: ' + humanizeSupabaseError(error), 'error');
    }
  }

  async function cleanupMissingDocumentStorageRecords() {
    if (!requirePermission('dokuman_silme', 'Kırık kayıt temizliği')) {
      return;
    }

    try {
      const listResponse = await getClient().rpc('list_missing_dokuman_storage');
      if (listResponse.error) {
        throw listResponse.error;
      }

      const rows = Array.isArray(listResponse.data) ? listResponse.data : [];
      if (!rows.length) {
        toast('Storage dosyası eksik olan doküman kaydı bulunmadı.', 'success');
        return;
      }

      const preview = rows.slice(0, 8).map(function(row) {
        return (row.baslik || row.dosya_adi || row.id) + '\n  ' + (row.dosya_yolu || '');
      }).join('\n');
      const extra = rows.length > 8 ? '\n… +' + (rows.length - 8) + ' kayıt daha' : '';
      const ok = window.confirm(
        rows.length + ' doküman kaydının Storage dosyası eksik görünüyor.\n\n' +
        preview + extra +
        '\n\nBu kayıtlar siteden kaldırılacak ve bağlı ilerleme/tepki/çalışma kağıdı izleri temizlenecek. Devam edilsin mi?'
      );
      if (!ok) {
        return;
      }

      const cleanupResponse = await getClient().rpc('cleanup_missing_dokuman_storage_records');
      if (cleanupResponse.error) {
        throw cleanupResponse.error;
      }

      const deletedCount = cleanupResponse.data && Number(cleanupResponse.data.deletedRecords || 0);
      toast((deletedCount || rows.length) + ' kırık doküman kaydı temizlendi.', 'success');
      await loadDocuments();
    } catch (error) {
      toast('Kırık kayıt temizliği yapılamadı: ' + humanizeSupabaseError(error), 'error');
    }
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

  function getFileExtension(fileName) {
    const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function getDocumentFileKind(file) {
    const mime = String(file && file.type ? file.type : '').toLowerCase();
    const extension = getFileExtension(file && file.name);
    return Object.keys(ALLOWED_FILE_TYPES).find(function(key) {
      const item = ALLOWED_FILE_TYPES[key];
      return item.mime === mime || item.extensions.includes(extension);
    }) || '';
  }

  function validateDocumentFile(file) {
    if (!file) {
      return;
    }

    if (!getDocumentFileKind(file)) {
      throw new Error('Yalnızca PDF, JPEG, PNG veya WebP dosyası yükleyebilirsin.');
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new Error('Dosya en fazla ' + formatBytes(MAX_DOCUMENT_SIZE_BYTES) + ' olabilir.');
    }
  }

  function validateShowcaseImage(file) {
    if (!file) {
      return;
    }
    const kind = getDocumentFileKind(file);
    if (!['jpeg', 'png', 'webp'].includes(kind)) {
      throw new Error('Vitrin görseli için yalnızca JPEG, PNG veya WebP yükleyebilirsin.');
    }
    if (file.size > MAX_SHOWCASE_IMAGE_SIZE_BYTES) {
      throw new Error('Vitrin görseli en fazla ' + formatBytes(MAX_SHOWCASE_IMAGE_SIZE_BYTES) + ' olabilir.');
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

  function stripHtml(value) {
    const div = document.createElement('div');
    div.innerHTML = String(value || '');
    return div.textContent || div.innerText || '';
  }

  function sanitizeRichHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    const allowedTags = {
      A: true,
      B: true,
      BR: true,
      DIV: true,
      EM: true,
      FONT: true,
      I: true,
      LI: true,
      OL: true,
      P: true,
      SPAN: true,
      STRONG: true,
      U: true,
      UL: true,
    };
    function isSafeRichStyle(value) {
      const parts = String(value || '').split(';').map(function(part) {
        return part.trim();
      }).filter(Boolean);
      if (!parts.length) {
        return false;
      }
      return parts.every(function(part) {
        return /^color:\s*#[0-9a-f]{3,6}$/i.test(part) ||
          /^font-size:\s*(1[0-9]|2[0-9]|3[0-9]|4[0-8])px$/i.test(part);
      });
    }

    function clean(node) {
      Array.from(node.childNodes).forEach(function(child) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!allowedTags[child.tagName]) {
            child.replaceWith(document.createTextNode(child.textContent || ''));
            return;
          }

          Array.from(child.attributes).forEach(function(attr) {
            const name = attr.name.toLowerCase();
            if (child.tagName === 'A' && name === 'href') {
              if (/^(https?:\/\/|\/|#)/i.test(attr.value)) {
                child.setAttribute('target', '_blank');
                child.setAttribute('rel', 'noopener noreferrer');
              } else {
                child.removeAttribute(attr.name);
              }
              return;
            }
            if (child.tagName === 'FONT' && name === 'color') {
              return;
            }
            if (child.tagName === 'FONT' && name === 'size') {
              return;
            }
            if (child.tagName === 'SPAN' && name === 'style' && isSafeRichStyle(attr.value)) {
              return;
            }
            child.removeAttribute(attr.name);
          });
          clean(child);
        } else if (child.nodeType !== Node.TEXT_NODE) {
          child.remove();
        }
      });
    }

    clean(template.content);
    return template.innerHTML.trim();
  }

  function getSelectedFile() {
    const input = document.getElementById('fPdf');
    return input && input.files && input.files.length ? input.files[0] : null;
  }

  function getContentKind(item) {
    return item && item.icerik_turu === 'video' ? 'video' : 'document';
  }

  function isVideoMode() {
    return state.contentKind === 'video';
  }

  function getDocumentSource(item) {
    if (!item) {
      return state.documentSource || 'supabase';
    }
    const raw = String(item.dosya_kaynak_turu || item.dosyaKaynakTuru || '').trim().toLowerCase();
    if (raw) {
      return raw === 'storage' ? 'supabase' : raw;
    }
    return /^https?:\/\//i.test(String(item.dosya_yolu || '')) ? 'external' : 'supabase';
  }

  function isExternalSource() {
    return state.documentSource === 'external';
  }

  function extractIframeSrc(value) {
    const match = String(value || '').match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
    return match ? match[1] : '';
  }

  function parseYouTubeId(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) {
      return '';
    }
    try {
      const url = new URL(value, window.location.origin);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'youtu.be') {
        return url.pathname.split('/').filter(Boolean)[0] || '';
      }
      if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
        if (url.pathname === '/watch') {
          return url.searchParams.get('v') || '';
        }
        const parts = url.pathname.split('/').filter(Boolean);
        const marker = ['embed', 'shorts', 'live'].find(function(key) {
          return parts[0] === key;
        });
        if (marker && parts[1]) {
          return parts[1];
        }
      }
    } catch (error) {
      return '';
    }
    return '';
  }

  function normalizeVideoInput(value) {
    const raw = String(value || '').trim();
    const src = extractIframeSrc(raw) || raw;
    if (!src) {
      return null;
    }
    const youtubeId = parseYouTubeId(src);
    if (youtubeId) {
      return {
        originalUrl: raw,
        embedUrl: 'https://www.youtube.com/embed/' + encodeURIComponent(youtubeId),
        provider: 'youtube',
        fileName: 'YouTube videosu',
      };
    }
    try {
      const url = new URL(src, window.location.origin);
      return {
        originalUrl: raw,
        embedUrl: url.href,
        provider: 'iframe',
        fileName: 'Video bağlantısı',
      };
    } catch (error) {
      throw new Error('Video için geçerli bir YouTube linki veya iframe src değeri girmelisin.');
    }
  }

  function getUrlExtension(rawUrl) {
    try {
      const url = new URL(String(rawUrl || '').trim(), window.location.origin);
      return getFileExtension(url.pathname);
    } catch (error) {
      return getFileExtension(rawUrl);
    }
  }

  function getExternalProvider(url) {
    const host = String(url.hostname || '').replace(/^www\./, '').toLowerCase();
    if (host === 'drive.google.com' || host === 'docs.google.com') {
      return 'google-drive';
    }
    if (host.includes('.r2.dev') || host.includes('r2.cloudflarestorage.com')) {
      return 'cloudflare-r2';
    }
    return 'direct-url';
  }

  function parseGoogleDriveFileId(url) {
    const parts = url.pathname.split('/').filter(Boolean);
    const fileIndex = parts.indexOf('d');
    if (fileIndex >= 0 && parts[fileIndex + 1]) {
      return parts[fileIndex + 1];
    }
    return url.searchParams.get('id') || '';
  }

  function normalizeExternalDocumentInput(value) {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    let url;
    try {
      url = new URL(raw);
    } catch (error) {
      throw new Error('Harici doküman için geçerli bir bağlantı girmelisin.');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Harici doküman bağlantısı http veya https ile başlamalı.');
    }

    const provider = getExternalProvider(url);
    if (provider === 'google-drive') {
      if (url.pathname.indexOf('/folders/') !== -1) {
        throw new Error('Google Drive klasör linki değil, PDF/görsel dosyasının kendi paylaşım linkini eklemelisin.');
      }
      const fileId = parseGoogleDriveFileId(url);
      if (!fileId) {
        throw new Error('Google Drive dosya kimliği okunamadı. Dosyanın paylaşım linkini kopyalayıp tekrar dene.');
      }
      return {
        provider: provider,
        originalUrl: raw,
        directUrl: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(fileId),
        embedUrl: 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/preview',
        fileName: 'Google Drive dosyası.pdf',
        pageCount: 0,
        fileSize: 0,
      };
    }

    const extension = getUrlExtension(raw);
    if (!['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      throw new Error('Harici link PDF, JPG, PNG veya WebP dosyasına doğrudan gitmeli. R2 kullanıyorsan public object URL kopyalanmalı.');
    }
    return {
      provider: provider,
      originalUrl: raw,
      directUrl: url.href,
      embedUrl: url.href,
      fileName: decodeURIComponent((url.pathname.split('/').pop() || 'harici-dokuman.' + extension).split('?')[0]) || 'harici-dokuman.' + extension,
      pageCount: extension === 'pdf' ? 0 : 1,
      fileSize: 0,
    };
  }

  function syncContentKindUi() {
    const video = isVideoMode();
    const fileBox = document.getElementById('fileBox');
    const videoBox = document.getElementById('videoBox');
    const localUploadBox = document.getElementById('localUploadBox');
    const externalUrlBox = document.getElementById('externalUrlBox');
    const contentHint = document.getElementById('contentHint');
    const interactionBtn = document.getElementById('interactionQuickBtn');
    const worksheetBtn = document.getElementById('worksheetQuickBtn');
    const magnifierRow = document.getElementById('magnifierSwitchRow');
    const answersRow = document.getElementById('answersSwitchRow');
    const saveHint = document.getElementById('saveHint');

    Array.from(document.querySelectorAll('[data-content-kind]')).forEach(function(button) {
      button.classList.toggle('active', button.getAttribute('data-content-kind') === state.contentKind);
    });
    Array.from(document.querySelectorAll('[data-document-source]')).forEach(function(button) {
      button.classList.toggle('active', button.getAttribute('data-document-source') === state.documentSource);
    });
    if (fileBox) fileBox.classList.toggle('is-hidden', video);
    if (videoBox) videoBox.classList.toggle('is-hidden', !video);
    if (localUploadBox) localUploadBox.classList.toggle('is-hidden', video || isExternalSource());
    if (externalUrlBox) externalUrlBox.classList.toggle('is-hidden', video || !isExternalSource());
    if (magnifierRow) magnifierRow.classList.toggle('is-hidden', video);
    if (answersRow) answersRow.classList.toggle('is-hidden', video);
    if (worksheetBtn) worksheetBtn.classList.toggle('is-hidden', video);
    if (interactionBtn) {
      interactionBtn.textContent = video ? 'Video Üstünde Çizim Yap' : 'Büyüteç / Cevap Alanı Hazırla';
    }
    if (contentHint) {
      contentHint.textContent = video
        ? 'Video kayıtları dosya yüklemez; YouTube linki veya iframe adresi kaydedilir. Video, ders sayfasında ayrı “Ders Videoları” bölümünde görünür.'
        : (isExternalSource()
          ? 'Harici kaynakta dosya Supabase kotasını kullanmaz. R2 ve CORS açık doğrudan linkler mevcut doküman araçlarıyla çalışır; Drive için dosya linki gerekir.'
          : 'PDF ve görseller yüklemeden önce otomatik optimize edilir; sonuç gerçekten küçülmezse orijinal dosya korunur. Üst sınır 50 MB.');
    }
    if (saveHint) {
      saveHint.textContent = video
        ? 'Kaydedince video ilgili ders sayfasındaki Ders Videoları bölümünde listelenir.'
        : 'Kaydedince belge ilgili ders sayfasında listelenmeye hazır olur.';
    }
  }

  function setContentKind(kind) {
    state.contentKind = kind === 'video' ? 'video' : 'document';
    state.currentPdfMeta = null;
    const input = document.getElementById('fPdf');
    if (isVideoMode() && input) {
      input.value = '';
    }
    syncContentKindUi();
    updateSummary();
  }

  function setDocumentSource(source) {
    state.documentSource = source === 'external' ? 'external' : 'supabase';
    state.currentPdfMeta = null;
    const input = document.getElementById('fPdf');
    if (isExternalSource() && input) {
      input.value = '';
    }
    syncContentKindUi();
    updateSummary();
  }

  function getDocumentById(id) {
    return state.documents.find(function(item) {
      return item.id === id;
    }) || null;
  }

  function getDocumentTargets(item) {
    if (window.kemalDocumentStore && typeof window.kemalDocumentStore.getDocumentTargets === 'function') {
      return window.kemalDocumentStore.getDocumentTargets(item);
    }
    return item && item.sinif && item.ders ? [{ sinif: Number(item.sinif), ders: item.ders }] : [];
  }

  function normalizeTarget(target) {
    const grade = parseInt(target && target.sinif, 10);
    const subject = window.kemalDocumentStore.normalizeSubjectKey(target && target.ders);
    if (!grade || !subject) {
      return null;
    }
    return { sinif: grade, ders: subject };
  }

  function getTargetKey(target) {
    return String(target.sinif) + '::' + target.ders;
  }

  function getTargetLabel(target) {
    const subjectMeta = window.kemalDocumentStore.getSubjectMeta(target.ders, target.sinif);
    return window.kemalDocumentStore.getGradeLabel(target.sinif) + ' · ' + (subjectMeta ? subjectMeta.label : target.ders);
  }

  function dedupeTargets(targets) {
    const seen = {};
    return (Array.isArray(targets) ? targets : []).map(normalizeTarget).filter(Boolean).filter(function(target) {
      const key = getTargetKey(target);
      if (seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function renderTargetList() {
    const list = document.getElementById('targetList');
    if (!list) {
      return;
    }
    if (!state.targets.length) {
      list.innerHTML = '<div class="target-empty">Henüz hedef eklenmedi.</div>';
      return;
    }
    list.innerHTML = state.targets.map(function(target) {
      return (
        '<span class="target-chip">' +
          escHtml(getTargetLabel(target)) +
          '<button type="button" aria-label="Hedefi kaldır" onclick="hedefSil(\'' + escHtml(getTargetKey(target)) + '\')">×</button>' +
        '</span>'
      );
    }).join('');
  }

  function setTargets(targets) {
    state.targets = dedupeTargets(targets);
    const first = state.targets[0];
    if (first) {
      document.getElementById('fSinif').value = String(first.sinif);
      syncSubjectSelectForGrade('fDers', first.sinif, first.ders);
      document.getElementById('fDers').value = first.ders;
    }
    renderTargetList();
    updateSummary();
  }

  function addTargetFromControls() {
    const target = normalizeTarget({
      sinif: document.getElementById('fSinif').value,
      ders: document.getElementById('fDers').value,
    });
    if (!target) {
      toast('Sınıf ve ders seçmelisin.', 'error');
      return;
    }
    const exists = state.targets.some(function(item) {
      return getTargetKey(item) === getTargetKey(target);
    });
    if (exists) {
      toast('Bu hedef zaten eklendi.', 'error');
      return;
    }
    setTargets(state.targets.concat([target]));
  }

  function removeTarget(key) {
    setTargets(state.targets.filter(function(target) {
      return getTargetKey(target) !== key;
    }));
  }

  function getViewerUrl(id) {
    return window.location.origin + window.kemalDocumentStore.buildViewerUrl(id);
  }

  function setFileInfo(message) {
    document.getElementById('fileInfo').textContent = message;
  }

  function getInteractionSettings(doc) {
    const source = doc && doc.etkilesim_json && typeof doc.etkilesim_json === 'object' ? doc.etkilesim_json : {};
    return {
      magnifierEnabled: source.magnifierEnabled !== false,
      answersEnabled: source.answersEnabled !== false,
    };
  }

  function buildInteractionPayload(existing, data) {
    const source = existing && existing.etkilesim_json && typeof existing.etkilesim_json === 'object' ? existing.etkilesim_json : {};
    return Object.assign({
      version: 1,
      answersHidden: true,
      hotspots: [],
    }, source, {
      magnifierEnabled: data.magnifierEnabled !== false,
      answersEnabled: data.answersEnabled !== false,
    });
  }

  function updateSummary() {
    const title = document.getElementById('fBaslik').value.trim();
    const activeLabel = document.getElementById('fAktif').checked
      ? (document.getElementById('fGizli').checked ? 'Gizli yayın' : 'Aktif yayın')
      : 'Pasif kayıt';
    const existing = state.editingId ? getDocumentById(state.editingId) : null;
    const file = getSelectedFile();
    const meta = state.currentPdfMeta || existing;
    const targets = state.targets.slice();
    const videoInput = document.getElementById('fVideoInput') ? document.getElementById('fVideoInput').value.trim() : '';
    const externalInput = document.getElementById('fExternalUrl') ? document.getElementById('fExternalUrl').value.trim() : '';
    const pendingTarget = normalizeTarget({
      sinif: document.getElementById('fSinif').value,
      ders: document.getElementById('fDers').value,
    });

    document.getElementById('summaryTitle').textContent = title || 'Henüz başlık girilmedi.';
    document.getElementById('summaryRoute').textContent =
      targets.length
        ? targets.map(getTargetLabel).join(' | ') + ' altında listelenecek. (' + activeLabel + ')'
        : (pendingTarget ? getTargetLabel(pendingTarget) + ' seçili. Çoklu yayın için Hedef Ekle ile listeye ekleyebilirsin. (' + activeLabel + ')' : 'Yayın hedefi eklediğinde yayın yolları burada görünür.');

    if (isVideoMode()) {
      let videoMetaText = 'Video linki girildiğinde ders videosu olarak kaydedilir.';
      if (videoInput) {
        try {
          const video = normalizeVideoInput(videoInput);
          videoMetaText = (video.provider === 'youtube' ? 'YouTube videosu' : 'Video bağlantısı') + ' · Ders videolarında listelenecek.';
        } catch (error) {
          videoMetaText = 'Video bağlantısı kontrol edilmeli.';
        }
      } else if (existing && getContentKind(existing) === 'video') {
        videoMetaText = (existing.video_provider === 'youtube' ? 'YouTube videosu' : 'Video bağlantısı') + ' · Mevcut bağlantı korunacak.';
      }
      document.getElementById('summaryMeta').textContent = videoMetaText;
      return;
    }

    if (isExternalSource()) {
      if (externalInput) {
        try {
          const external = normalizeExternalDocumentInput(externalInput);
          const providerLabel = external.provider === 'google-drive'
            ? 'Google Drive'
            : (external.provider === 'cloudflare-r2' ? 'Cloudflare R2' : 'Harici link');
          document.getElementById('summaryMeta').textContent =
            providerLabel + ' · ' + external.fileName + (external.pageCount ? ' · ' + external.pageCount + ' sayfa' : ' · Sayfa sayısı görüntüleyicide okunacak');
        } catch (error) {
          document.getElementById('summaryMeta').textContent = error.message;
        }
      } else if (existing && getDocumentSource(existing) !== 'supabase') {
        document.getElementById('summaryMeta').textContent =
          (existing.harici_provider || 'Harici link') + ' · ' + (existing.dosya_adi || 'Mevcut bağlantı');
      } else {
        document.getElementById('summaryMeta').textContent = 'Harici PDF/görsel bağlantısı girildiğinde burada görünecek.';
      }
      return;
    }

    if (file) {
      document.getElementById('summaryMeta').textContent =
        file.name + ' · ' +
        formatBytes(file.size) +
        (meta && meta.pageCount ? ' · ' + meta.pageCount + ' sayfa' : ' · Sayfa sayısı okunuyor…');
      return;
    }

    if (existing) {
      document.getElementById('summaryMeta').textContent =
        (existing.dosya_adi || 'Mevcut dosya') +
        ' · ' + formatBytes(existing.dosya_boyutu || 0) +
        ((existing.sayfa_sayisi || 0) ? ' · ' + existing.sayfa_sayisi + ' sayfa' : '');
      return;
    }

    document.getElementById('summaryMeta').textContent = 'Dosya seçildiğinde tür, sayfa sayısı ve boyut bilgisi hesaplanır.';
  }

  function showListPanel() {
    document.getElementById('panelShowcaseList').style.display = 'none';
    document.getElementById('panelShowcaseEdit').style.display = 'none';
    document.getElementById('panelEdit').style.display = 'none';
    document.getElementById('panelList').style.display = 'block';
  }

  function showEditPanel() {
    document.getElementById('panelList').style.display = 'none';
    document.getElementById('panelShowcaseList').style.display = 'none';
    document.getElementById('panelShowcaseEdit').style.display = 'none';
    document.getElementById('panelEdit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showShowcaseListPanel() {
    document.getElementById('panelList').style.display = 'none';
    document.getElementById('panelEdit').style.display = 'none';
    document.getElementById('panelShowcaseEdit').style.display = 'none';
    document.getElementById('panelShowcaseList').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showShowcaseEditPanel() {
    document.getElementById('panelList').style.display = 'none';
    document.getElementById('panelEdit').style.display = 'none';
    document.getElementById('panelShowcaseList').style.display = 'none';
    document.getElementById('panelShowcaseEdit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    state.editingId = null;
    state.selectedDocument = null;
    state.currentPdfMeta = null;
    state.contentKind = 'document';
    state.documentSource = 'supabase';
    state.targets = [];
    document.getElementById('editTitle').textContent = 'Yeni Doküman';
    document.getElementById('editStatus').textContent = 'Yeni bir PDF, görsel veya ders videosunu birden fazla sınıf ve dersle eşleştirebilirsin.';
    document.getElementById('fBaslik').value = '';
    document.getElementById('fAciklama').value = '';
    document.getElementById('fSinif').value = '1';
    syncSubjectSelectForGrade('fDers', 1);
    document.getElementById('fSiralama').value = '0';
    document.getElementById('fKapakRenk').value = '#6C3DED';
    document.getElementById('fAktif').checked = true;
    document.getElementById('fGizli').checked = false;
    document.getElementById('fMagnifierEnabled').checked = true;
    document.getElementById('fAnswersEnabled').checked = true;
    document.getElementById('fOturumGerekli').checked = false;
    document.getElementById('fPdf').value = '';
    document.getElementById('fVideoInput').value = '';
    document.getElementById('fExternalUrl').value = '';
    setFileInfo('Henüz bir dosya seçilmedi. Yeni kayıt için PDF veya görsel zorunludur, düzenlemede istersen mevcut dosyayı koruyabilirsin.');
    renderTargetList();
    syncContentKindUi();
    updateSummary();
  }

  function populateSelects() {
    document.getElementById('fSinif').innerHTML = GRADES.map(function(grade) {
      return '<option value="' + grade + '">' + window.kemalDocumentStore.getGradeLabel(grade) + '</option>';
    }).join('');

    syncSubjectSelectForGrade('fDers', document.getElementById('fSinif').value || 1);
    syncFilterSubjectOptions();
  }

  function buildSubjectOptions(grade) {
    const subjects = window.kemalDocumentStore.getSubjects(grade);
    return subjects.map(function(subject) {
      return '<option value="' + subject.key + '">' + subject.icon + ' ' + subject.label + '</option>';
    }).join('');
  }

  function syncSubjectSelectForGrade(selectId, grade, preferredValue) {
    const select = document.getElementById(selectId);
    if (!select) {
      return;
    }
    const currentValue = preferredValue || select.value;
    const subjectOptions = buildSubjectOptions(grade);
    select.innerHTML = subjectOptions;
    const hasCurrent = Array.from(select.options).some(function(option) {
      return option.value === currentValue;
    });
    if (hasCurrent) {
      select.value = currentValue;
    } else if (select.options.length) {
      select.selectedIndex = 0;
    }
  }

  function syncFilterSubjectOptions() {
    const select = document.getElementById('filterSubject');
    if (!select) {
      return;
    }
    const grade = document.getElementById('filterGrade') ? document.getElementById('filterGrade').value : '';
    const currentValue = select.value;
    select.innerHTML = '<option value="">Tüm dersler</option>' + buildSubjectOptions(grade);
    const hasCurrent = Array.from(select.options).some(function(option) {
      return option.value === currentValue;
    });
    select.value = hasCurrent ? currentValue : '';
  }

  function renderDocuments() {
    const grade = state.filters.grade;
    const subject = state.filters.subject;
    const status = state.filters.status;
    const grid = document.getElementById('documentGrid');

    const filtered = state.documents.filter(function(item) {
      const targets = getDocumentTargets(item);
      if (grade && !targets.some(function(target) { return String(target.sinif) === String(grade); })) {
        return false;
      }
      if (subject && !targets.some(function(target) { return target.ders === subject; })) {
        return false;
      }
      if (grade && subject && !targets.some(function(target) {
        return String(target.sinif) === String(grade) && target.ders === subject;
      })) {
        return false;
      }
      if (status === 'active' && !item.aktif) {
        return false;
      }
      if (status === 'inactive' && item.aktif) {
        return false;
      }
      if (status === 'hidden' && item.gizli !== true) {
        return false;
      }
      return true;
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1;"><span>📭</span><p>Seçili filtrelerde doküman bulunamadı.</p></div>';
      return;
    }

    grid.innerHTML = filtered.map(function(item) {
      const targets = getDocumentTargets(item);
      const contentKind = getContentKind(item);
      const isVideo = contentKind === 'video';
      const source = getDocumentSource(item);
      const sourceLabel = source === 'supabase'
        ? 'Supabase'
        : (item.harici_provider === 'cloudflare-r2' ? 'Cloudflare R2' : (item.harici_provider === 'google-drive' ? 'Google Drive' : 'Harici link'));
      const badges = targets.length
        ? targets.slice(0, 4).map(function(target) {
          return '<div class="doc-badge">' + escHtml(getTargetLabel(target)) + '</div>';
        }).join('') + (targets.length > 4 ? '<div class="doc-badge">+' + (targets.length - 4) + ' hedef</div>' : '')
        : '<div class="doc-badge">Hedef yok</div>';
      const metaHtml = isVideo
        ? (
          '<span>🎬 ' + escHtml(item.video_provider === 'youtube' ? 'YouTube videosu' : 'Video bağlantısı') + '</span>' +
          '<span>✍️ Video üstü çizim</span>' +
          '<span>📍 Ders videoları</span>'
        )
        : (
          '<span>📄 ' + escHtml(item.dosya_adi || 'Dosya') + '</span>' +
          '<span>🔗 ' + escHtml(sourceLabel) + '</span>' +
          '<span>📚 ' + Number(item.sayfa_sayisi || 0) + ' sayfa</span>' +
          '<span>📦 ' + formatBytes(item.dosya_boyutu || 0) + '</span>'
        );
      return (
        '<article class="doc-card">' +
          '<div class="doc-top">' +
            '<div class="doc-badges">' + badges + '</div>' +
            '<div class="doc-status ' + (item.aktif ? 'on' : 'off') + '">' + (item.aktif ? (item.gizli ? 'Gizli' : 'Aktif') : 'Pasif') + '</div>' +
          '</div>' +
          '<div class="doc-meta"><span>' + (item.oturum_gerekli ? '🔐 Kayıtlı Kullanıcı' : '🌍 Herkese Açık') + '</span>' + (item.gizli ? '<span>👁️‍🗨️ Linkle erişim</span>' : '') + '</div>' +
          '<div class="doc-title">' + escHtml(item.baslik) + '</div>' +
          '<div class="doc-desc">' + escHtml(item.aciklama || 'Açıklama eklenmedi.') + '</div>' +
          '<div class="doc-meta">' + metaHtml + '</div>' +
          '<div class="doc-actions">' +
            (can('dokuman_duzenleme') ? '<button class="btn-edit" type="button" onclick="dokumanDuzenle(\'' + item.id + '\')">Düzenle</button>' : '') +
            '<a class="btn-open" href="' + escHtml(window.kemalDocumentStore.buildViewerUrl(item.id)) + '" target="_blank" rel="noreferrer">Aç</a>' +
            (can('dokuman_duzenleme') && !isVideo ? '<button class="btn-worksheet" type="button" onclick="calismaKagidiDuzenle(\'' + item.id + '\')">Çalışma Kağıdı</button>' : '') +
          '</div>' +
          '<div class="doc-actions">' +
            (can('dokuman_duzenleme') ? '<button class="btn-open" type="button" onclick="durumDegistir(\'' + item.id + '\')">' + (item.aktif ? 'Pasife Al' : 'Aktife Al') + '</button>' : '') +
            (can('dokuman_duzenleme') ? '<button class="btn-open" type="button" onclick="gizlilikDegistir(\'' + item.id + '\')">' + (item.gizli ? 'Listede Göster' : 'Gizle') + '</button>' : '') +
            (can('dokuman_silme') ? '<button class="btn-delete" type="button" onclick="dokumanSil(\'' + item.id + '\')">Sil</button>' : '') +
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

  function isImageFile(file) {
    const kind = getDocumentFileKind(file);
    return kind === 'jpeg' || kind === 'png' || kind === 'webp';
  }

  function replaceFileExtension(fileName, extension) {
    const cleanExtension = String(extension || '').replace(/^\./, '') || 'bin';
    const base = String(fileName || 'dosya').replace(/\.[a-z0-9]+$/i, '') || 'dosya';
    return base + '.' + cleanExtension;
  }

  function buildOptimizedFile(blob, originalFile, extension, mimeType) {
    return new File(
      [blob],
      replaceFileExtension(originalFile && originalFile.name, extension),
      {
        type: mimeType,
        lastModified: originalFile && originalFile.lastModified ? originalFile.lastModified : Date.now(),
      }
    );
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Görsel çıktısı oluşturulamadı.'));
        }
      }, mimeType, quality);
    });
  }

  async function loadImageElement(file) {
    return new Promise(function(resolve, reject) {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = function() {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Görsel okunamadı.'));
      };
      image.src = url;
    });
  }

  async function optimizeImageFile(file, options) {
    const settings = Object.assign({
      quality: DOCUMENT_IMAGE_WEBP_QUALITY,
      maxLongEdge: DOCUMENT_IMAGE_MAX_LONG_EDGE,
      forceWebp: true,
    }, options || {});
    const kind = getDocumentFileKind(file);
    if (!['jpeg', 'png', 'webp'].includes(kind)) {
      return { file: file, optimized: false, note: '' };
    }
    if (kind === 'webp' && file.size <= 1024 * 1024) {
      return { file: file, optimized: false, note: '' };
    }

    try {
      const image = await loadImageElement(file);
      const sourceWidth = image.naturalWidth || image.width || 0;
      const sourceHeight = image.naturalHeight || image.height || 0;
      if (!sourceWidth || !sourceHeight) {
        return { file: file, optimized: false, note: '' };
      }
      const longEdge = Math.max(sourceWidth, sourceHeight);
      const scale = settings.maxLongEdge && longEdge > settings.maxLongEdge
        ? settings.maxLongEdge / longEdge
        : 1;
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);

      const outputType = settings.forceWebp ? 'image/webp' : file.type || 'image/webp';
      const outputExtension = outputType === 'image/webp' ? 'webp' : getFileExtension(file.name);
      const blob = await canvasToBlob(canvas, outputType, settings.quality);
      canvas.width = 1;
      canvas.height = 1;
      if (blob.size >= file.size * MIN_OPTIMIZED_SAVINGS_RATIO) {
        return { file: file, optimized: false, note: '' };
      }

      const optimizedFile = buildOptimizedFile(blob, file, outputExtension, outputType);
      const resizedText = scale < 1 ? ' · ' + sourceWidth + '×' + sourceHeight + ' px → ' + width + '×' + height + ' px' : '';
      return {
        file: optimizedFile,
        optimized: true,
        note: 'Görsel WebP olarak optimize edildi: ' + formatBytes(file.size) + ' → ' + formatBytes(optimizedFile.size) + resizedText,
      };
    } catch (error) {
      console.warn('Görsel optimizasyonu atlandı:', error);
      return { file: file, optimized: false, note: '' };
    }
  }

  async function optimizePdfFile(file) {
    if (file.size < PDF_OPTIMIZE_MIN_BYTES || !window.PDFLib) {
      return { file: file, optimized: false, note: '' };
    }
    try {
      ensurePdfWorker();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const outputPdf = await window.PDFLib.PDFDocument.create();

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const longEdge = Math.max(baseViewport.width, baseViewport.height);
        const scale = Math.min(2.6, Math.max(1.4, PDF_RENDER_LONG_EDGE / longEdge));
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

        const blob = await canvasToBlob(canvas, 'image/jpeg', PDF_JPEG_QUALITY);
        const imageBytes = await blob.arrayBuffer();
        const embeddedImage = await outputPdf.embedJpg(imageBytes);
        const outputPage = outputPdf.addPage([baseViewport.width, baseViewport.height]);
        outputPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: baseViewport.width,
          height: baseViewport.height,
        });
        canvas.width = 1;
        canvas.height = 1;
      }

      const bytes = await outputPdf.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      if (blob.size >= file.size * MIN_OPTIMIZED_SAVINGS_RATIO) {
        return { file: file, optimized: false, note: '' };
      }

      const optimizedFile = buildOptimizedFile(blob, file, 'pdf', 'application/pdf');
      return {
        file: optimizedFile,
        optimized: true,
        note: 'PDF optimize edildi: ' + formatBytes(file.size) + ' → ' + formatBytes(optimizedFile.size) + '. Not: büyük PDF sayfaları görüntü tabanlı yeniden paketlenir.',
      };
    } catch (error) {
      console.warn('PDF optimizasyonu atlandı:', error);
      return { file: file, optimized: false, note: '' };
    }
  }

  async function prepareDocumentFileForUpload(file) {
    const kind = getDocumentFileKind(file);
    const result = ['jpeg', 'png', 'webp'].includes(kind)
      ? await optimizeImageFile(file)
      : (kind === 'pdf' ? await optimizePdfFile(file) : { file: file, optimized: false, note: '' });
    const meta = await extractDocumentMeta(result.file);
    return Object.assign({ meta: meta }, result);
  }

  async function extractImageMeta(file) {
    validateDocumentFile(file);
    return new Promise(function(resolve, reject) {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = function() {
        URL.revokeObjectURL(url);
        resolve({
          pageCount: 1,
          size: file.size || 0,
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0,
        });
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Görsel okunamadı.'));
      };
      image.src = url;
    });
  }

  async function extractDocumentMeta(file) {
    validateDocumentFile(file);
    if (isImageFile(file)) {
      return extractImageMeta(file);
    }
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
        setFileInfo('Henüz bir dosya seçilmedi. Yeni kayıt için PDF veya görsel zorunludur, düzenlemede istersen mevcut dosyayı koruyabilirsin.');
      }
      updateSummary();
      return;
    }

    try {
      validateDocumentFile(file);
    } catch (error) {
      document.getElementById('fPdf').value = '';
      setFileInfo(error.message + ' Dosya seçimi temizlendi.');
      toast(error.message, 'error');
      updateSummary();
      return;
    }

    setFileInfo(file.name + ' seçildi. Dosya bilgisi hesaplanıyor…');
    updateSummary();

    try {
      const meta = await extractDocumentMeta(file);
      state.currentPdfMeta = meta;
      const imageInfo = meta.width && meta.height ? ' · ' + meta.width + '×' + meta.height + ' px' : '';
      setFileInfo(file.name + ' · ' + formatBytes(file.size) + ' · ' + meta.pageCount + ' sayfa' + imageInfo + ' · Yüklemede otomatik optimizasyon denenir.');
      updateSummary();
    } catch (error) {
      setFileInfo(file.name + ' seçildi fakat dosya okunamadı.');
      toast('Dosya bilgisi okunamadı: ' + error.message, 'error');
    }
  }

  function buildStoragePath(documentId, title, grade, subject, fileName) {
    const baseName = slugify(title || fileName || 'dokuman');
    const extension = getFileExtension(fileName) || 'pdf';
    return [
      String(grade || 'genel'),
      slugify(subject || 'dokuman'),
      documentId,
      Date.now() + '-' + baseName + '.' + extension,
    ].join('/');
  }

  async function uploadDocumentFile(documentId, file, grade, subject, title) {
    validateDocumentFile(file);
    const path = buildStoragePath(documentId, title, grade, subject, file.name);
    const kind = getDocumentFileKind(file);
    const contentType = (ALLOWED_FILE_TYPES[kind] && ALLOWED_FILE_TYPES[kind].mime) || file.type || 'application/octet-stream';
    const response = await getClient().storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: contentType,
    });

    if (response.error) {
      throw response.error;
    }

    return path;
  }

  function getShowcaseById(id) {
    return state.showcaseSlides.find(function(item) {
      return item.id === id;
    }) || null;
  }

  function getSelectedShowcaseImage() {
    const input = document.getElementById('sImage');
    return input && input.files && input.files.length ? input.files[0] : null;
  }

  function getSelectedShowcaseTextImage() {
    const input = document.getElementById('sTextImage');
    return input && input.files && input.files.length ? input.files[0] : null;
  }

  function getStoragePublicUrl(path) {
    if (!path) {
      return '';
    }
    if (/^https?:\/\//i.test(String(path))) {
      return String(path);
    }
    const response = getClient().storage.from(BUCKET_NAME).getPublicUrl(path);
    return response && response.data && response.data.publicUrl ? response.data.publicUrl : '';
  }

  function getShowcaseTypeLabel(type) {
    const map = {
      text: 'Mini yazı',
      image: 'Görsel',
      youtube: 'YouTube',
      document: 'Doküman',
    };
    return map[type] || 'Slayt';
  }

  function getShowcaseMediaUrl(item) {
    if (!item) {
      return '';
    }
    if (item.icerik_turu === 'image' || item.icerik_turu === 'text') {
      return item.media_url || getStoragePublicUrl(item.media_path);
    }
    if (item.icerik_turu === 'youtube' && item.youtube_video_id) {
      return 'https://img.youtube.com/vi/' + encodeURIComponent(item.youtube_video_id) + '/hqdefault.jpg';
    }
    return '';
  }

  function syncShowcaseTypeUi() {
    const type = document.getElementById('sType') ? document.getElementById('sType').value : 'text';
    const textBox = document.getElementById('sTextExtraBox');
    if (textBox) {
      textBox.classList.toggle('active', type === 'text');
    }
    ['Image', 'Youtube', 'Document'].forEach(function(name) {
      const box = document.getElementById('s' + name + 'Box');
      if (box) {
        box.classList.toggle('active', type === name.toLowerCase());
      }
    });
    updateShowcasePreview();
  }

  function populateShowcaseDocumentSelect(selectedId) {
    const select = document.getElementById('sDocumentId');
    if (!select) {
      return;
    }
    const options = state.documents
      .filter(function(item) { return item.aktif !== false; })
      .map(function(item) {
        return '<option value="' + escHtml(item.id) + '">' + escHtml(item.baslik || 'Başlıksız doküman') + '</option>';
      });
    select.innerHTML = options.length ? options.join('') : '<option value="">Aktif doküman bulunamadı</option>';
    if (selectedId && Array.from(select.options).some(function(option) { return option.value === selectedId; })) {
      select.value = selectedId;
    }
  }

  function updateDocumentLinkField() {
    const type = document.getElementById('sType') ? document.getElementById('sType').value : '';
    if (type !== 'document') {
      return;
    }
    const doc = getDocumentById(document.getElementById('sDocumentId').value);
    const linkInput = document.getElementById('sLinkUrl');
    if (doc && linkInput) {
      linkInput.value = window.kemalDocumentStore.buildViewerUrl(doc.id);
    }
    updateShowcasePreview();
  }

  function updateShowcasePreview() {
    const box = document.getElementById('sPreviewBox');
    const icon = document.getElementById('sPreviewIcon');
    const title = document.getElementById('sPreviewTitle');
    const desc = document.getElementById('sPreviewDesc');
    if (!box || !title || !desc) {
      return;
    }

    const type = document.getElementById('sType').value;
    const current = state.editingSlideId ? getShowcaseById(state.editingSlideId) : null;
    const currentIcon = document.getElementById('sIcon').value.trim() || '⭐';
    const currentTitle = document.getElementById('sBaslik').value.trim() || 'Başlık bekleniyor.';
    const richHtml = sanitizeRichHtml(document.getElementById('sDescriptionEditor').innerHTML);
    const imageFile = getSelectedShowcaseImage();
    const textImageFile = getSelectedShowcaseTextImage();
    box.className = 'showcase-preview';
    box.style.borderColor = document.getElementById('sColor').value || '#E2D9FF';

    title.textContent = currentTitle;
    desc.innerHTML = richHtml || 'Açıklama yazıldığında burada görünür.';

    if (type === 'text') {
      const imageUrl = textImageFile
        ? URL.createObjectURL(textImageFile)
        : (current && current.icerik_turu === 'text' && !document.getElementById('sRemoveImage').checked ? getShowcaseMediaUrl(current) : '');
      if (imageUrl) {
        box.innerHTML = '<img alt="">';
        box.querySelector('img').src = imageUrl;
        if (textImageFile) {
          box.querySelector('img').onload = function() { URL.revokeObjectURL(imageUrl); };
        }
        return;
      }
    }

    if (type === 'image') {
      box.classList.toggle('cover', document.getElementById('sMediaFit').value === 'cover');
      const imageUrl = imageFile
        ? URL.createObjectURL(imageFile)
        : (current && current.icerik_turu === 'image' && !document.getElementById('sRemoveMainImage').checked ? getShowcaseMediaUrl(current) : '');
      if (imageUrl) {
        box.innerHTML = '<img alt="">';
        box.querySelector('img').src = imageUrl;
        if (imageFile) {
          box.querySelector('img').onload = function() { URL.revokeObjectURL(imageUrl); };
        }
        return;
      }
    }

    if (type === 'youtube') {
      let video = null;
      const value = document.getElementById('sYoutubeInput').value.trim();
      try {
        video = value ? normalizeVideoInput(value) : null;
      } catch (error) {
        video = null;
      }
      const youtubeId = video && video.provider === 'youtube'
        ? parseYouTubeId(video.embedUrl || video.originalUrl)
        : (current && current.youtube_video_id);
      if (youtubeId) {
        box.innerHTML = '<img alt=""><span class="showcase-preview-emoji" style="position:absolute;">▶</span>';
        box.querySelector('img').src = 'https://img.youtube.com/vi/' + encodeURIComponent(youtubeId) + '/hqdefault.jpg';
        box.classList.add('cover');
        return;
      }
    }

    box.innerHTML = '<span class="showcase-preview-emoji" id="sPreviewIcon"></span>';
    box.querySelector('.showcase-preview-emoji').textContent = type === 'document' ? '📄' : currentIcon;
  }

  function resetShowcaseForm() {
    state.editingSlideId = null;
    document.getElementById('showcaseEditTitle').textContent = 'Yeni Vitrin Slaytı';
    document.getElementById('showcaseEditStatus').textContent = 'Ana sayfada otomatik akışın yanında görünecek kontrollü bir slayt hazırla.';
    document.getElementById('sType').value = 'text';
    document.getElementById('sBaslik').value = '';
    document.getElementById('sDescriptionEditor').innerHTML = '';
    document.getElementById('sTextImage').value = '';
    document.getElementById('sRemoveImage').checked = false;
    document.getElementById('sArticleEditor').innerHTML = '';
    document.getElementById('sImage').value = '';
    document.getElementById('sRemoveMainImage').checked = false;
    document.getElementById('sMediaFit').value = 'contain';
    document.getElementById('sYoutubeInput').value = '';
    populateShowcaseDocumentSelect();
    document.getElementById('sSiralama').value = '0';
    document.getElementById('sDuration').value = '4000';
    document.getElementById('sIcon').value = '⭐';
    document.getElementById('sColor').value = '#6C3DED';
    document.getElementById('sLinkLabel').value = 'İncele';
    document.getElementById('sLinkUrl').value = '';
    document.getElementById('sActive').checked = true;
    syncShowcaseTypeUi();
  }

  function renderShowcaseSlides() {
    const grid = document.getElementById('showcaseGrid');
    if (!grid) {
      return;
    }
    if (!state.showcaseSlides.length) {
      grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1;"><span>✨</span><p>Henüz ana sayfa vitrin slaytı eklenmedi.</p></div>';
      return;
    }

    grid.innerHTML = state.showcaseSlides.map(function(item) {
      const mediaUrl = getShowcaseMediaUrl(item);
      const preview = mediaUrl
        ? '<div class="showcase-preview ' + (item.media_fit === 'cover' || item.icerik_turu === 'youtube' ? 'cover' : '') + '"><img src="' + escHtml(mediaUrl) + '" alt=""></div>'
        : '<div class="showcase-preview"><span class="showcase-preview-emoji" style="color:' + escHtml(item.tema_renk || '#6C3DED') + '">' + escHtml(item.ikon || (item.icerik_turu === 'document' ? '📄' : '⭐')) + '</span></div>';
      const desc = sanitizeRichHtml(item.aciklama_html || '');
      return (
        '<article class="showcase-card">' +
          preview +
          '<div class="doc-top">' +
            '<div class="doc-badges"><span class="doc-badge">' + escHtml(getShowcaseTypeLabel(item.icerik_turu)) + '</span><span class="doc-badge">' + Number(item.gecis_suresi_ms || 4000) / 1000 + ' sn</span></div>' +
            '<div class="doc-status ' + (item.aktif ? 'on' : 'off') + '">' + (item.aktif ? 'Aktif' : 'Pasif') + '</div>' +
          '</div>' +
          '<div class="showcase-card-title">' + escHtml(item.baslik || 'Başlıksız slayt') + '</div>' +
          '<div class="showcase-card-desc">' + (desc || 'Açıklama eklenmedi.') + '</div>' +
          '<div class="doc-meta"><span>↕️ Sıra ' + Number(item.siralama || 0) + '</span>' + (item.link_url ? '<span>🔗 Link var</span>' : '') + (item.makale_html ? '<span>📝 Makale var</span>' : '') + '</div>' +
          '<div class="doc-actions">' +
            (can('dokuman_duzenleme') ? '<button class="btn-edit" type="button" onclick="vitrinDuzenle(\'' + item.id + '\')">Düzenle</button>' : '') +
            (can('dokuman_duzenleme') ? '<button class="btn-open" type="button" onclick="vitrinDurumDegistir(\'' + item.id + '\')">' + (item.aktif ? 'Pasife Al' : 'Aktife Al') + '</button>' : '') +
            (can('dokuman_silme') ? '<button class="btn-delete" type="button" onclick="vitrinSil(\'' + item.id + '\')">Sil</button>' : '') +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  async function loadShowcaseSlides() {
    const grid = document.getElementById('showcaseGrid');
    if (grid) {
      grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1;"><span>⏳</span><p>Vitrin slaytları yükleniyor…</p></div>';
    }

    const result = await getClient()
      .from(HOMEPAGE_SLIDES_TABLE)
      .select('*')
      .order('siralama', { ascending: true })
      .order('olusturma_tarihi', { ascending: false });

    if (result.error) {
      state.showcaseSlides = [];
      if (grid) {
        grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1;"><span>⚠️</span><p>Vitrin tablosu hazır değil.</p></div>';
      }
      toast(humanizeSupabaseError(result.error), 'error');
      return;
    }

    state.showcaseSlides = result.data || [];
    renderShowcaseSlides();
  }

  function buildShowcaseImagePath(slideId, title, fileName) {
    const extension = getFileExtension(fileName) || 'jpg';
    return [
      'homepage-vitrin',
      slideId,
      Date.now() + '-' + slugify(title || fileName || 'vitrin') + '.' + extension,
    ].join('/');
  }

  async function uploadShowcaseImage(slideId, file, title) {
    validateShowcaseImage(file);
    const optimized = await optimizeImageFile(file, {
      quality: SHOWCASE_IMAGE_WEBP_QUALITY,
      maxLongEdge: SHOWCASE_IMAGE_MAX_LONG_EDGE,
      forceWebp: true,
    });
    const uploadFile = optimized.file;
    const path = buildShowcaseImagePath(slideId, title, uploadFile.name);
    const kind = getDocumentFileKind(uploadFile);
    const contentType = (ALLOWED_FILE_TYPES[kind] && ALLOWED_FILE_TYPES[kind].mime) || uploadFile.type || 'image/webp';
    const response = await getClient().storage.from(BUCKET_NAME).upload(path, uploadFile, {
      cacheControl: '3600',
      upsert: true,
      contentType: contentType,
    });
    if (response.error) {
      throw response.error;
    }
    return {
      path: path,
      url: getStoragePublicUrl(path),
    };
  }

  async function listShowcaseStoragePaths(slideId) {
    const folder = 'homepage-vitrin/' + slideId;
    const response = await getClient().storage.from(BUCKET_NAME).list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (response.error) {
      throw response.error;
    }
    return (response.data || [])
      .filter(function(item) { return item && item.name && item.id !== null; })
      .map(function(item) { return folder + '/' + item.name; });
  }

  async function cleanupShowcaseStorage(slideId, keepPath, knownPaths) {
    let paths = Array.isArray(knownPaths) ? knownPaths.slice() : [];
    try {
      paths = paths.concat(await listShowcaseStoragePaths(slideId));
    } catch (error) {
      console.warn('Vitrin klasoru listelenemedi:', error);
    }
    const unique = {};
    const removable = paths.filter(Boolean).filter(function(path) {
      if (path === keepPath || unique[path]) {
        return false;
      }
      unique[path] = true;
      return true;
    });
    if (!removable.length) {
      return true;
    }
    const response = await getClient().storage.from(BUCKET_NAME).remove(removable);
    if (response.error) {
      console.warn('Vitrin gorselleri silinemedi:', response.error);
      return false;
    }
    return true;
  }

  function collectShowcasePayload() {
    const type = document.getElementById('sType').value;
    const title = document.getElementById('sBaslik').value.trim();
    const existing = state.editingSlideId ? getShowcaseById(state.editingSlideId) : null;
    const image = getSelectedShowcaseImage();
    const textImage = getSelectedShowcaseTextImage();
    const removeTextImage = document.getElementById('sRemoveImage').checked;
    const removeMainImage = document.getElementById('sRemoveMainImage').checked;
    const active = document.getElementById('sActive').checked;
    const activeCount = state.showcaseSlides.filter(function(item) {
      return item.aktif && item.id !== state.editingSlideId;
    }).length;

    if (!title) {
      throw new Error('Vitrin slaytı için başlık zorunlu.');
    }
    if (active && activeCount >= 5) {
      throw new Error('Ana sayfa vitrininde en fazla 5 aktif slayt olabilir. Önce bir slaytı pasife al.');
    }

    let youtube = null;
    if (type === 'youtube') {
      const input = document.getElementById('sYoutubeInput').value.trim();
      youtube = input ? normalizeVideoInput(input) : null;
      if (!youtube && !(existing && existing.icerik_turu === 'youtube' && existing.youtube_embed_url)) {
        throw new Error('YouTube slaytı için geçerli bir YouTube linki veya iframe kodu girmelisin.');
      }
    }

    let selectedDocument = null;
    if (type === 'document') {
      selectedDocument = getDocumentById(document.getElementById('sDocumentId').value);
      if (!selectedDocument && !(existing && existing.dokuman_id)) {
        throw new Error('Doküman slaytı için bir doküman seçmelisin.');
      }
    }

    if (type === 'image') {
      if (image) {
        validateShowcaseImage(image);
      } else if (removeMainImage || !(existing && existing.icerik_turu === 'image' && (existing.media_path || existing.media_url))) {
        throw new Error('Görsel slaytı için bir görsel seçmelisin.');
      }
    }
    if (type === 'text' && textImage) {
      validateShowcaseImage(textImage);
    }

    const linkInput = document.getElementById('sLinkUrl').value.trim();
    const documentLink = selectedDocument ? window.kemalDocumentStore.buildViewerUrl(selectedDocument.id) : '';

    return {
      existing: existing,
      type: type,
      title: title,
      descriptionHtml: sanitizeRichHtml(document.getElementById('sDescriptionEditor').innerHTML),
      articleHtml: type === 'text' ? sanitizeRichHtml(document.getElementById('sArticleEditor').innerHTML) : '',
      icon: document.getElementById('sIcon').value.trim() || '⭐',
      color: document.getElementById('sColor').value || '#6C3DED',
      sortOrder: parseInt(document.getElementById('sSiralama').value || '0', 10) || 0,
      duration: parseInt(document.getElementById('sDuration').value || '4000', 10) || 4000,
      active: active,
      linkLabel: document.getElementById('sLinkLabel').value.trim() || 'İncele',
      linkUrl: type === 'document' ? documentLink : linkInput,
      mediaFit: document.getElementById('sMediaFit').value === 'cover' ? 'cover' : 'contain',
      image: image,
      textImage: textImage,
      removeTextImage: removeTextImage,
      removeMainImage: removeMainImage,
      youtube: youtube,
      selectedDocument: selectedDocument,
    };
  }

  async function saveShowcaseSlide() {
    if (!requirePermission(state.editingSlideId ? 'dokuman_duzenleme' : 'dokuman_ekleme', state.editingSlideId ? 'Vitrin düzenleme' : 'Vitrin ekleme')) {
      return;
    }
    let uploadedPathForRollback = '';
    let rollbackSlideId = '';
    try {
      const data = collectShowcasePayload();
      const slideId = state.editingSlideId || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'slide_' + Date.now());
      rollbackSlideId = slideId;
      let mediaPath = data.existing ? data.existing.media_path : null;
      let mediaUrl = data.existing ? data.existing.media_url : null;
      const oldMediaPath = data.existing ? data.existing.media_path : '';

      const uploadFile = data.type === 'image' ? data.image : (data.type === 'text' ? data.textImage : null);
      if ((data.type === 'image' || data.type === 'text') && uploadFile) {
        const uploaded = await uploadShowcaseImage(slideId, uploadFile, data.title);
        mediaPath = uploaded.path;
        mediaUrl = uploaded.url;
        uploadedPathForRollback = uploaded.path;
      } else if (
        (data.type === 'text' && data.removeTextImage) ||
        (data.type === 'image' && data.removeMainImage) ||
        (data.type !== 'text' && data.type !== 'image')
      ) {
        mediaPath = null;
        mediaUrl = null;
      }

      const payload = {
        baslik: data.title,
        aciklama_html: data.descriptionHtml,
        makale_html: data.articleHtml || null,
        icerik_turu: data.type,
        ikon: data.icon,
        tema_renk: data.color,
        media_url: mediaUrl,
        media_path: mediaPath,
        media_fit: data.mediaFit,
        youtube_url: data.type === 'youtube'
          ? ((data.youtube && data.youtube.originalUrl) || (data.existing && data.existing.youtube_url) || null)
          : null,
        youtube_embed_url: data.type === 'youtube'
          ? ((data.youtube && data.youtube.embedUrl) || (data.existing && data.existing.youtube_embed_url) || null)
          : null,
        youtube_video_id: data.type === 'youtube'
          ? parseYouTubeId((data.youtube && data.youtube.embedUrl) || (data.existing && data.existing.youtube_embed_url) || '')
          : null,
        dokuman_id: data.type === 'document'
          ? ((data.selectedDocument && data.selectedDocument.id) || (data.existing && data.existing.dokuman_id) || null)
          : null,
        link_url: data.linkUrl || null,
        link_label: data.linkLabel,
        gecis_suresi_ms: Math.max(3000, Math.min(10000, data.duration)),
        siralama: data.sortOrder,
        aktif: data.active,
        guncelleme_tarihi: new Date().toISOString(),
      };

      let response;
      if (state.editingSlideId) {
        response = await getClient()
          .from(HOMEPAGE_SLIDES_TABLE)
          .update(payload)
          .eq('id', state.editingSlideId)
          .select()
          .single();
      } else {
        response = await getClient()
          .from(HOMEPAGE_SLIDES_TABLE)
          .insert(Object.assign({
            id: slideId,
            olusturma_tarihi: new Date().toISOString(),
          }, payload))
          .select()
          .single();
      }

      if (response.error) {
        throw response.error;
      }

      uploadedPathForRollback = '';
      const cleanupOk = await cleanupShowcaseStorage(slideId, mediaPath, [oldMediaPath]);

      toast(
        cleanupOk
          ? 'Vitrin slaytı kaydedildi.'
          : 'Vitrin slaytı kaydedildi; eski görsel temizliği Supabase Storage üzerinde kontrol edilmeli.',
        cleanupOk ? 'success' : 'error'
      );
      await loadShowcaseSlides();
      openShowcaseEditor(getShowcaseById(response.data.id) || response.data);
    } catch (error) {
      if (uploadedPathForRollback) {
        await cleanupShowcaseStorage(
          rollbackSlideId,
          '',
          [uploadedPathForRollback]
        );
      }
      toast(humanizeSupabaseError(error), 'error');
    }
  }

  async function toggleShowcaseActive(slideId) {
    if (!requirePermission('dokuman_duzenleme', 'Vitrin düzenleme')) {
      return;
    }
    const item = getShowcaseById(slideId);
    if (!item) {
      return;
    }
    if (!item.aktif) {
      const activeCount = state.showcaseSlides.filter(function(slide) { return slide.aktif; }).length;
      if (activeCount >= 5) {
        toast('En fazla 5 aktif slayt olabilir. Önce bir slaytı pasife al.', 'error');
        return;
      }
    }

    const response = await getClient()
      .from(HOMEPAGE_SLIDES_TABLE)
      .update({
        aktif: !item.aktif,
        guncelleme_tarihi: new Date().toISOString(),
      })
      .eq('id', slideId);

    if (response.error) {
      toast(humanizeSupabaseError(response.error), 'error');
      return;
    }

    toast(item.aktif ? 'Vitrin slaytı pasife alındı.' : 'Vitrin slaytı aktifleştirildi.', 'success');
    await loadShowcaseSlides();
  }

  async function deleteShowcaseSlide(slideId) {
    if (!requirePermission('dokuman_silme', 'Vitrin silme')) {
      return;
    }
    const item = getShowcaseById(slideId);
    if (!item) {
      return;
    }
    if (!window.confirm('"' + item.baslik + '" vitrin slaytını silmek istiyor musun?')) {
      return;
    }

    const response = await getClient().from(HOMEPAGE_SLIDES_TABLE).delete().eq('id', slideId);
    if (response.error) {
      toast(humanizeSupabaseError(response.error), 'error');
      return;
    }
    const cleanupOk = await cleanupShowcaseStorage(slideId, '', [item.media_path]);
    toast(
      cleanupOk
        ? 'Vitrin slaytı ve görselleri silindi.'
        : 'Vitrin slaytı silindi; Supabase Storage görsel temizliği kontrol edilmeli.',
      cleanupOk ? 'success' : 'error'
    );
    if (state.editingSlideId === slideId) {
      resetShowcaseForm();
      showShowcaseListPanel();
    }
    await loadShowcaseSlides();
  }

  function openShowcaseEditor(item) {
    const slide = item || null;
    resetShowcaseForm();
    showShowcaseEditPanel();
    if (!slide) {
      return;
    }

    state.editingSlideId = slide.id;
    document.getElementById('showcaseEditTitle').textContent = 'Düzenle: ' + slide.baslik;
    document.getElementById('showcaseEditStatus').textContent = 'ID: ' + slide.id.slice(0, 8) + '… · Ana sayfa vitrin kaydı.';
    document.getElementById('sType').value = slide.icerik_turu || 'text';
    document.getElementById('sBaslik').value = slide.baslik || '';
    document.getElementById('sDescriptionEditor').innerHTML = sanitizeRichHtml(slide.aciklama_html || '');
    document.getElementById('sTextImage').value = '';
    document.getElementById('sRemoveImage').checked = false;
    document.getElementById('sArticleEditor').innerHTML = sanitizeRichHtml(slide.makale_html || '');
    document.getElementById('sImage').value = '';
    document.getElementById('sRemoveMainImage').checked = false;
    document.getElementById('sMediaFit').value = slide.media_fit || 'contain';
    document.getElementById('sYoutubeInput').value = slide.youtube_url || slide.youtube_embed_url || '';
    populateShowcaseDocumentSelect(slide.dokuman_id || '');
    document.getElementById('sSiralama').value = String(slide.siralama || 0);
    document.getElementById('sDuration').value = String(slide.gecis_suresi_ms || 4000);
    document.getElementById('sIcon').value = slide.ikon || '⭐';
    document.getElementById('sColor').value = slide.tema_renk || '#6C3DED';
    document.getElementById('sLinkLabel').value = slide.link_label || 'İncele';
    document.getElementById('sLinkUrl').value = slide.link_url || '';
    document.getElementById('sActive').checked = slide.aktif !== false;
    syncShowcaseTypeUi();
  }

  function execShowcaseCommand(command, value) {
    const articleEditor = document.getElementById('sArticleEditor');
    const editor = document.activeElement === articleEditor
      ? articleEditor
      : document.getElementById('sDescriptionEditor');
    if (!editor) {
      return;
    }
    editor.focus();
    document.execCommand(command, false, value || null);
    updateShowcasePreview();
  }

  function applyShowcaseFontSize(value) {
    const size = String(value || '').trim();
    if (!/^((1[0-9])|(2[0-9])|(3[0-9])|(4[0-8]))px$/.test(size)) {
      return;
    }
    const editor = document.activeElement === document.getElementById('sArticleEditor')
      ? document.getElementById('sArticleEditor')
      : document.getElementById('sDescriptionEditor');
    if (!editor) {
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }
    if (range.collapsed) {
      document.execCommand('fontSize', false, '4');
      Array.from(editor.querySelectorAll('font[size="4"]')).forEach(function(font) {
        const span = document.createElement('span');
        span.style.fontSize = size;
        span.innerHTML = font.innerHTML;
        font.replaceWith(span);
      });
    } else {
      const span = document.createElement('span');
      span.style.fontSize = size;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      range.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.getElementById('sFontSize').value = '';
    updateShowcasePreview();
  }

  function addShowcaseLink() {
    const url = window.prompt('Link adresi');
    if (!url) {
      return;
    }
    if (!/^(https?:\/\/|\/|#)/i.test(url)) {
      toast('Link http, https, / veya # ile başlamalı.', 'error');
      return;
    }
    execShowcaseCommand('createLink', url);
  }

  function collectPayload() {
    const title = document.getElementById('fBaslik').value.trim();
    const description = document.getElementById('fAciklama').value.trim();
    const targets = dedupeTargets(state.targets.length ? state.targets : [{
      sinif: document.getElementById('fSinif').value,
      ders: document.getElementById('fDers').value,
    }]);
    const primaryTarget = targets[0] || null;
    const sortOrder = parseInt(document.getElementById('fSiralama').value || '0', 10) || 0;
    const coverColor = document.getElementById('fKapakRenk').value || '#6C3DED';
    const active = document.getElementById('fAktif').checked;
    const hidden = document.getElementById('fGizli').checked;
    const sessionRequired = document.getElementById('fOturumGerekli').checked;
    const magnifierEnabled = document.getElementById('fMagnifierEnabled').checked;
    const answersEnabled = document.getElementById('fAnswersEnabled').checked;
    const file = getSelectedFile();
    const existing = state.editingId ? getDocumentById(state.editingId) : null;
    const contentKind = state.contentKind;
    const documentSource = contentKind === 'document' ? state.documentSource : 'supabase';
    const externalInput = document.getElementById('fExternalUrl').value.trim();
    const externalDocument = contentKind === 'document' && documentSource === 'external'
      ? (externalInput ? normalizeExternalDocumentInput(externalInput) : (existing && getDocumentSource(existing) !== 'supabase' ? {
        provider: existing.harici_provider || 'direct-url',
        originalUrl: existing.harici_url || existing.dosya_yolu || '',
        directUrl: existing.dosya_yolu || existing.harici_url || '',
        embedUrl: existing.harici_embed_url || existing.harici_url || existing.dosya_yolu || '',
        fileName: existing.dosya_adi || 'Harici doküman',
        pageCount: Number(existing.sayfa_sayisi || 0),
        fileSize: Number(existing.dosya_boyutu || 0),
      } : null))
      : null;
    const videoInput = document.getElementById('fVideoInput').value.trim();
    const video = contentKind === 'video'
      ? (videoInput ? normalizeVideoInput(videoInput) : (existing && getContentKind(existing) === 'video' ? {
        originalUrl: existing.video_url || existing.video_embed_url || existing.dosya_yolu || '',
        embedUrl: existing.video_embed_url || existing.video_url || existing.dosya_yolu || '',
        provider: existing.video_provider || 'iframe',
        fileName: existing.dosya_adi || 'Video bağlantısı',
      } : null))
      : null;

    if (!title) {
      throw new Error(contentKind === 'video' ? 'Ders videosu başlığı zorunlu.' : 'Doküman başlığı zorunlu.');
    }
    if (!targets.length || !primaryTarget) {
      throw new Error('En az bir yayın hedefi eklemelisin.');
    }
    if (contentKind === 'video' && !video) {
      throw new Error('Ders videosu için YouTube linki veya iframe kodu girmelisin.');
    }
    if (contentKind === 'document' && existing && getContentKind(existing) === 'video' && !file) {
      if (documentSource !== 'external' || !externalDocument) {
        throw new Error('Video kaydını dokümana çevirmek için PDF/görsel dosyası seçmeli veya harici doküman linki girmelisin.');
      }
    }
    if (contentKind === 'document' && documentSource === 'external' && !externalDocument) {
      throw new Error('Harici doküman için PDF/görsel bağlantısı girmelisin.');
    }
    if (contentKind === 'document' && documentSource === 'supabase' && existing && getDocumentSource(existing) !== 'supabase' && !file) {
      throw new Error('Harici kayıt Supabase yüklemesine çevrilecekse yeni PDF veya görsel dosyası seçmelisin.');
    }
    if (contentKind === 'document' && documentSource === 'supabase' && !existing && !file) {
      throw new Error('Yeni kayıt için bir PDF veya görsel yüklemelisin.');
    }
    if (contentKind === 'document' && documentSource === 'supabase' && file) {
      validateDocumentFile(file);
    }

    return {
      contentKind: contentKind,
      documentSource: documentSource,
      title: title,
      description: description,
      grade: primaryTarget.sinif,
      subject: primaryTarget.ders,
      targets: targets,
      sortOrder: sortOrder,
      coverColor: coverColor,
      active: active,
      hidden: hidden,
      sessionRequired: sessionRequired,
      magnifierEnabled: magnifierEnabled,
      answersEnabled: answersEnabled,
      file: file,
      externalDocument: externalDocument,
      video: video,
      existing: existing,
    };
  }

  async function save(options) {
    if (!requirePermission(state.editingId ? 'dokuman_duzenleme' : 'dokuman_ekleme', state.editingId ? 'Doküman düzenleme' : 'Doküman ekleme')) {
      return;
    }
    let uploadedPathForRollback = '';
    try {
      const shouldPrepare = Boolean(options && options.openInteractionEditor);
      const data = collectPayload();
      const documentId = state.editingId || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'doc_' + Date.now());
      const oldSupabasePath = data.existing && getContentKind(data.existing) === 'document' && getDocumentSource(data.existing) === 'supabase'
        ? String(data.existing.dosya_yolu || '').trim()
        : '';
      let filePath = data.existing ? data.existing.dosya_yolu : '';
      let fileName = data.existing ? data.existing.dosya_adi : '';
      let fileSize = data.existing ? Number(data.existing.dosya_boyutu || 0) : 0;
      let pageCount = data.existing ? Number(data.existing.sayfa_sayisi || 0) : 0;
      let externalProvider = data.existing ? (data.existing.harici_provider || null) : null;
      let externalUrl = data.existing ? (data.existing.harici_url || null) : null;
      let externalEmbedUrl = data.existing ? (data.existing.harici_embed_url || null) : null;

      if (data.contentKind === 'video') {
        filePath = data.video.embedUrl || data.video.originalUrl;
        fileName = data.video.fileName || 'Video bağlantısı';
        fileSize = 0;
        pageCount = 1;
        externalProvider = null;
        externalUrl = null;
        externalEmbedUrl = null;
      } else if (data.documentSource === 'external') {
        filePath = data.externalDocument.directUrl || data.externalDocument.originalUrl;
        fileName = data.externalDocument.fileName || 'Harici doküman';
        fileSize = data.externalDocument.fileSize || 0;
        pageCount = data.externalDocument.pageCount || 0;
        externalProvider = data.externalDocument.provider || 'direct-url';
        externalUrl = data.externalDocument.originalUrl || filePath;
        externalEmbedUrl = data.externalDocument.embedUrl || filePath;
      } else if (data.file) {
        document.getElementById('editStatus').textContent = 'Dosya optimize ediliyor ve yüklemeye hazırlanıyor…';
        const prepared = await prepareDocumentFileForUpload(data.file);
        const uploadFile = prepared.file;
        const meta = prepared.meta;
        if (prepared.note) {
          document.getElementById('editStatus').textContent = prepared.note + ' Yükleniyor…';
        }
        filePath = await uploadDocumentFile(documentId, uploadFile, data.grade, data.subject, data.title);
        uploadedPathForRollback = filePath;
        fileName = uploadFile.name;
        fileSize = uploadFile.size || 0;
        pageCount = meta.pageCount || 0;
        externalProvider = null;
        externalUrl = null;
        externalEmbedUrl = null;
      }

      const payload = {
        baslik: data.title,
        aciklama: data.description,
        sinif: data.grade,
        ders: data.subject,
        hedefler: data.targets,
        dosya_yolu: filePath,
        dosya_adi: fileName,
        dosya_boyutu: fileSize,
        sayfa_sayisi: pageCount,
        icerik_turu: data.contentKind,
        dosya_kaynak_turu: data.contentKind === 'document' ? data.documentSource : 'video',
        harici_url: externalUrl,
        harici_provider: externalProvider,
        harici_embed_url: externalEmbedUrl,
        video_url: data.contentKind === 'video' ? data.video.originalUrl : null,
        video_embed_url: data.contentKind === 'video' ? data.video.embedUrl : null,
        video_provider: data.contentKind === 'video' ? data.video.provider : null,
        video_html: data.contentKind === 'video' && data.video.originalUrl.indexOf('<iframe') !== -1 ? data.video.originalUrl : null,
        kapak_renk: data.coverColor,
        siralama: data.sortOrder,
        aktif: data.active,
        gizli: data.hidden,
        oturum_gerekli: data.sessionRequired,
        etkilesim_json: data.contentKind === 'video'
          ? (data.existing && data.existing.etkilesim_json && typeof data.existing.etkilesim_json === 'object' ? data.existing.etkilesim_json : {})
          : buildInteractionPayload(data.existing, data),
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

      uploadedPathForRollback = '';
      const shouldRemoveOldFile = oldSupabasePath && oldSupabasePath !== String(response.data.dosya_yolu || '').trim();
      let oldFileRemoved = true;
      if (shouldRemoveOldFile) {
        oldFileRemoved = await removeDocumentStorageFile(oldSupabasePath);
      }

      state.editingId = response.data.id;
      state.selectedDocument = response.data;
      document.getElementById('editTitle').textContent = 'Düzenle: ' + response.data.baslik;
      document.getElementById('editStatus').textContent = 'Kayıt tamamlandı. İstersen bağlantıyı hemen açabilir veya listeye dönebilirsin.';
      toast(
        oldFileRemoved
          ? (data.contentKind === 'video' ? 'Ders videosu kaydedildi.' : 'Doküman kaydedildi.')
          : 'Kayıt güncellendi; eski Supabase dosyası temizliği için Storage kontrol edilmeli.',
        oldFileRemoved ? 'success' : 'error'
      );
      await loadDocuments();
      openEditor(getDocumentById(response.data.id) || response.data);
      if (shouldPrepare) {
        window.location.href = window.kemalDocumentStore.buildViewerUrl(response.data.id) + '&edit=1';
      }
    } catch (error) {
      if (uploadedPathForRollback) {
        await removeDocumentStorageFile(uploadedPathForRollback);
      }
      toast(humanizeSupabaseError(error), 'error');
    }
  }

  async function toggleActive(documentId) {
    if (!requirePermission('dokuman_duzenleme', 'Doküman düzenleme')) {
      return;
    }
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

  async function toggleHidden(documentId) {
    if (!requirePermission('dokuman_duzenleme', 'Doküman düzenleme')) {
      return;
    }
    const item = getDocumentById(documentId);
    if (!item) {
      return;
    }

    const response = await getClient()
      .from('dokumanlar')
      .update({
        gizli: item.gizli !== true,
        guncelleme_tarihi: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (response.error) {
      toast(humanizeSupabaseError(response.error), 'error');
      return;
    }

    toast(item.gizli ? 'İçerik listelerde gösterilecek.' : 'İçerik gizlendi, doğrudan linkle açılabilir.', 'success');
    await loadDocuments();
  }

  async function deleteDocument(documentId) {
    if (!requirePermission('dokuman_silme', 'Doküman silme')) {
      return;
    }
    const item = getDocumentById(documentId);
    if (!item) {
      return;
    }

    const isVideo = getContentKind(item) === 'video';
    const isSupabaseDocument = !isVideo && getDocumentSource(item) === 'supabase';
    const ok = window.confirm('"' + item.baslik + '" ' + (isVideo ? 'ders videosunu' : 'dokümanını') + ' silmek istiyor musun?' + (isSupabaseDocument ? ' Bu işlem yüklenen Supabase dosyasını da kaldırır.' : ''));
    if (!ok) {
      return;
    }

    const rpcResponse = await getClient().rpc('delete_dokuman_with_cleanup', {
      p_dokuman_id: documentId,
    });
    let deleted = false;
    let usedLegacyFlow = false;
    let storageFileRemoved = !isSupabaseDocument;

    if (rpcResponse.error) {
      if (!isMissingRpcFunction(rpcResponse.error, 'delete_dokuman_with_cleanup')) {
        toast(humanizeSupabaseError(rpcResponse.error), 'error');
        return;
      }
      usedLegacyFlow = true;
      deleted = await deleteDocumentWithLegacyFlow(item, isSupabaseDocument);
      if (!deleted) {
        return;
      }
    } else {
      deleted = true;
      if (isSupabaseDocument) {
        storageFileRemoved = await removeDocumentStorageFile(getStoragePathFromDeleteResult(rpcResponse.data, item));
      }
    }

    if (state.editingId === documentId) {
      resetForm();
      showListPanel();
    }
    toast(
      usedLegacyFlow
        ? 'Doküman silindi. Tam veritabanı temizliği için `supabase-dokumanlar.sql` dosyasını SQL Editor içinde tekrar çalıştır.'
        : (storageFileRemoved
          ? 'Doküman, bağlı kayıtlar ve varsa Supabase dosyası silindi.'
          : 'Doküman ve bağlı kayıtlar silindi. Supabase dosyası için Storage temizliği uyarısını kontrol et.'),
      storageFileRemoved ? 'success' : 'error'
    );
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
    state.contentKind = getContentKind(doc);
    state.documentSource = state.contentKind === 'document' ? getDocumentSource(doc) : 'supabase';
    syncContentKindUi();
    document.getElementById('editTitle').textContent = 'Düzenle: ' + doc.baslik;
    document.getElementById('editStatus').textContent = 'ID: ' + doc.id.slice(0, 8) + '… · Görüntüleme bağlantısı hazır.';
    document.getElementById('fBaslik').value = doc.baslik || '';
    document.getElementById('fAciklama').value = doc.aciklama || '';
    setTargets(getDocumentTargets(doc));
    document.getElementById('fSiralama').value = String(doc.siralama || 0);
    document.getElementById('fKapakRenk').value = doc.kapak_renk || '#6C3DED';
    document.getElementById('fAktif').checked = Boolean(doc.aktif);
    document.getElementById('fGizli').checked = doc.gizli === true;
    const interactionSettings = getInteractionSettings(doc);
    document.getElementById('fMagnifierEnabled').checked = interactionSettings.magnifierEnabled;
    document.getElementById('fAnswersEnabled').checked = interactionSettings.answersEnabled;
    document.getElementById('fOturumGerekli').checked = Boolean(doc.oturum_gerekli);
    document.getElementById('fVideoInput').value = getContentKind(doc) === 'video' ? (doc.video_url || doc.video_embed_url || doc.dosya_yolu || '') : '';
    document.getElementById('fExternalUrl').value = state.contentKind === 'document' && state.documentSource !== 'supabase'
      ? (doc.harici_url || doc.dosya_yolu || '')
      : '';
    if (getContentKind(doc) === 'video') {
      setFileInfo('Video kaydı düzenleniyor. PDF/görsel yükleme alanı video modunda kapalıdır.');
    } else if (state.documentSource !== 'supabase') {
      setFileInfo('Harici kaynak: ' + (doc.harici_provider || 'Bağlantı') + ' · ' + (doc.dosya_adi || 'Harici doküman'));
    } else {
      setFileInfo('Mevcut dosya: ' + (doc.dosya_adi || 'Dosya') + ' · ' + formatBytes(doc.dosya_boyutu || 0) + ' · ' + (doc.sayfa_sayisi || 0) + ' sayfa');
    }
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
    syncFilterSubjectOptions();
    state.filters.grade = document.getElementById('filterGrade').value;
    state.filters.subject = document.getElementById('filterSubject').value;
    state.filters.status = document.getElementById('filterStatus').value;
    renderDocuments();
  }

  function clearFilters() {
    document.getElementById('filterGrade').value = '';
    document.getElementById('filterSubject').value = '';
    document.getElementById('filterStatus').value = '';
    syncFilterSubjectOptions();
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
        await loadDocuments();
        if (window.location.hash === '#vitrin') {
          showShowcaseListPanel();
          await loadShowcaseSlides();
        } else {
          showListPanel();
        }
        return;
      }
    } catch (error) {
      console.warn('Oturum okunamadi:', error);
    }

    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  function bindEvents() {
    ['fBaslik', 'fAciklama', 'fSinif', 'fDers', 'fSiralama', 'fKapakRenk', 'fAktif', 'fGizli', 'fMagnifierEnabled', 'fAnswersEnabled', 'fVideoInput', 'fExternalUrl'].forEach(function(id) {
      const element = document.getElementById(id);
      if (!element) {
        return;
      }
      const eventName = id === 'fKapakRenk' || id === 'fAktif' || id === 'fGizli' || id === 'fMagnifierEnabled' || id === 'fAnswersEnabled' ? 'input' : 'input';
      element.addEventListener(eventName, updateSummary);
      if (id === 'fSinif') {
        element.addEventListener('change', function() {
          syncSubjectSelectForGrade('fDers', element.value);
          updateSummary();
        });
      } else if (id === 'fDers') {
        element.addEventListener('change', updateSummary);
      }
    });

    document.getElementById('fPdf').addEventListener('change', handleFileChange);
    ['sBaslik', 'sIcon', 'sColor', 'sSiralama', 'sDuration', 'sLinkLabel', 'sLinkUrl', 'sMediaFit', 'sYoutubeInput', 'sActive', 'sRemoveImage', 'sRemoveMainImage'].forEach(function(id) {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', updateShowcasePreview);
        element.addEventListener('change', updateShowcasePreview);
      }
    });
    const showcaseEditor = document.getElementById('sDescriptionEditor');
    if (showcaseEditor) {
      showcaseEditor.addEventListener('input', updateShowcasePreview);
    }
    const showcaseArticleEditor = document.getElementById('sArticleEditor');
    if (showcaseArticleEditor) {
      showcaseArticleEditor.addEventListener('input', updateShowcasePreview);
    }
    const showcaseImage = document.getElementById('sImage');
    if (showcaseImage) {
      showcaseImage.addEventListener('change', function() {
        const file = getSelectedShowcaseImage();
        try {
          validateShowcaseImage(file);
        } catch (error) {
          showcaseImage.value = '';
          toast(error.message, 'error');
        }
        updateShowcasePreview();
      });
    }
    const showcaseTextImage = document.getElementById('sTextImage');
    if (showcaseTextImage) {
      showcaseTextImage.addEventListener('change', function() {
        const file = getSelectedShowcaseTextImage();
        try {
          validateShowcaseImage(file);
        } catch (error) {
          showcaseTextImage.value = '';
          toast(error.message, 'error');
        }
        updateShowcasePreview();
      });
    }
    const showcaseDocument = document.getElementById('sDocumentId');
    if (showcaseDocument) {
      showcaseDocument.addEventListener('change', updateDocumentLinkField);
    }
    Array.from(document.querySelectorAll('[data-content-kind]')).forEach(function(button) {
      button.addEventListener('click', function() {
        setContentKind(button.getAttribute('data-content-kind'));
      });
    });
    Array.from(document.querySelectorAll('[data-document-source]')).forEach(function(button) {
      button.addEventListener('click', function() {
        setDocumentSource(button.getAttribute('data-document-source'));
      });
    });
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
        const res = await dynClient.from('menu_ogeler').select('ders_key,label,icon,sinif,sort_order').eq('active', true);
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
  window.yeniVideo = function() {
    resetForm();
    setContentKind('video');
    document.getElementById('editTitle').textContent = 'Yeni Ders Videosu';
    document.getElementById('editStatus').textContent = 'YouTube linki veya iframe kodu ekleyip videoyu sınıf ve derslere yayınlayabilirsin.';
    showEditPanel();
  };
  window.listeye = function() {
    showListPanel();
    loadDocuments();
  };
  window.dokumanListesineGit = function() {
    if (window.location.hash === '#vitrin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    showListPanel();
    loadDocuments();
  };
  window.vitrineGit = async function() {
    if (window.location.hash !== '#vitrin') {
      window.history.replaceState(null, '', '#vitrin');
    }
    showShowcaseListPanel();
    await loadShowcaseSlides();
  };
  window.yeniVitrinSlayti = function() {
    resetShowcaseForm();
    showShowcaseEditPanel();
  };
  window.vitrinTurDegisti = function() {
    syncShowcaseTypeUi();
    updateDocumentLinkField();
  };
  window.vitrinKomut = execShowcaseCommand;
  window.vitrinRenkUygula = function(color) {
    execShowcaseCommand('foreColor', color);
  };
  window.vitrinFontBoyutuUygula = applyShowcaseFontSize;
  window.vitrinLinkEkle = addShowcaseLink;
  window.vitrinKaydet = saveShowcaseSlide;
  window.vitrinDuzenle = function(id) {
    const item = getShowcaseById(id);
    if (item) {
      openShowcaseEditor(item);
    }
  };
  window.vitrinDurumDegistir = toggleShowcaseActive;
  window.vitrinSil = deleteShowcaseSlide;
  window.uygulaFiltre = applyFilters;
  window.filtreTemizle = clearFilters;
  window.depoTemizle = cleanupOrphanDocumentStorage;
  window.kirikKayitTemizle = cleanupMissingDocumentStorageRecords;
  window.hedefEkle = addTargetFromControls;
  window.hedefSil = removeTarget;
  window.dokumanDuzenle = function(id) {
    const item = getDocumentById(id);
    if (item) {
      openEditor(item);
    }
  };
  window.durumDegistir = toggleActive;
  window.gizlilikDegistir = toggleHidden;
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
