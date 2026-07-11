(function() {
  'use strict';

  var PDF_RENDER_BOOST = 2.25;

  var state = {
    documentId: '',
    documentRow: null,
    worksheet: null,
    fields: [],
    answers: {},
    pdfDoc: null,
    toastTimer: null,
    pdfWorkerReady: false,
    renderTimer: null,
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function toast(message, type) {
    var el = qs('toast');
    if (!el) {
      return;
    }
    el.textContent = message;
    el.className = 'toast ' + (type || 'success') + ' show';
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function() {
      el.classList.remove('show');
    }, 3200);
  }

  function humanizeError(error) {
    var combined = String((error && error.message) || '') + ' ' + String((error && error.code) || '');
    var lowered = combined.toLowerCase();
    if (
      lowered.indexOf('dokuman kimligi bulunamadi') !== -1 ||
      lowered.indexOf('doküman kimliği bulunamadı') !== -1 ||
      lowered.indexOf('invalid input syntax for type uuid') !== -1
    ) {
      return 'Bu sayfa tek başına açılmaz. Önce bir doküman seçip o dokümana bağlı çalışma kağıdını açmalısın.';
    }
    if (
      lowered.indexOf('calisma_kagitlari') !== -1 ||
      lowered.indexOf('calisma_kagidi_alanlari') !== -1 ||
      lowered.indexOf('submit_calisma_kagidi') !== -1
    ) {
      return 'Bu çalışma kağıdı henüz yayınlanmamış ya da sistem kurulumu tamamlanmamış görünüyor.';
    }
    return (error && error.message) || 'Beklenmeyen bir hata oluştu.';
  }

  function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function showMissingDocumentState() {
    qs('worksheetStage').innerHTML = [
      '<div class="stage-empty">',
        '<span>🧩</span>',
        '<p>Çalışma kağıdı açmak için önce bir doküman seçmelisin.</p>',
        '<p style="margin-top:10px;font-size:13px;color:#64748B;">Öğretmensen editörden çalışma kağıdı hazırlayabilir, öğrenciler için paylaşım bağlantısını doküman üzerinden açabilirsin.</p>',
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px;">',
          '<a href="/admin/calisma-kagidi-editor.html" style="display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border-radius:999px;background:#6C3DED;color:white;text-decoration:none;font-weight:800;">Editörü Aç</a>',
          '<a href="/admin/dokuman-yonetimi.html" style="display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border-radius:999px;background:white;color:#6C3DED;text-decoration:none;font-weight:800;border:2px solid #E2D9FF;">Doküman Yönetimi</a>',
        '</div>',
      '</div>'
    ].join('');
    qs('worksheetTitle').textContent = 'Çalışma kağıdı seçilmedi';
    qs('worksheetDesc').textContent = 'Bu ekran belirli bir dokümana bağlı çalışma kağıdını çözdürmek için kullanılır.';
    qs('worksheetPill').textContent = '🧩 Çalışma Kağıdı';
    qs('backToDocumentLink').href = '/admin/calisma-kagidi-editor.html';
    qs('backToDocumentLink').textContent = 'Editörü aç';
    qs('submitBtn').disabled = true;
    qs('worksheetInstructions').textContent = 'Bir doküman seçildiğinde yönergeler burada görünür.';
  }

  function ensurePdfWorker() {
    if (!window.pdfjsLib) {
      throw new Error('PDF görüntüleyici yüklenemedi.');
    }
    if (!state.pdfWorkerReady) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      state.pdfWorkerReady = true;
    }
  }

  function getCanvasRenderBoost() {
    return Math.min(PDF_RENDER_BOOST, Math.max(2, window.devicePixelRatio || 1));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function percent(value) {
    return (Number(value || 0) * 100).toFixed(1);
  }

  function getFieldQuestion(field) {
    return field.ayar_json && field.ayar_json.soru ? field.ayar_json.soru : (field.soru_etiketi || 'Soru');
  }

  function getFieldHelp(field) {
    return field.ayar_json && field.ayar_json.yardim ? field.ayar_json.yardim : '';
  }

  function getStageWidth() {
    var stage = qs('worksheetStage');
    var width = stage && stage.clientWidth ? stage.clientWidth - 40 : 860;
    return Math.max(340, Math.min(860, width));
  }

  function buildFieldBoxClass(field) {
    if (field.alan_tipi === 'dogru-yanlis') {
      return 'answer-box box-truefalse';
    }
    if (field.alan_tipi === 'coklu-secim') {
      return 'answer-box box-multi';
    }
    if (field.alan_tipi === 'eslestirme') {
      return 'answer-box box-match';
    }
    return 'answer-box box-single';
  }

  function buildTrueFalseHtml(field) {
    var value = state.answers[field.id] || '';
    return [
      '<div class="answer-options">',
      '<label><input type="radio" name="field_' + field.id + '" value="dogru" ' + (value === 'dogru' ? 'checked' : '') + '> Dogru</label>',
      '<label><input type="radio" name="field_' + field.id + '" value="yanlis" ' + (value === 'yanlis' ? 'checked' : '') + '> Yanlis</label>',
      '</div>'
    ].join('');
  }

  function buildSingleHtml(field) {
    var options = Array.isArray(field.ayar_json && field.ayar_json.secenekler) ? field.ayar_json.secenekler : [];
    var value = state.answers[field.id] || '';
    return '<div class="answer-options">' + options.map(function(option) {
      return '<label><input type="radio" name="field_' + field.id + '" value="' + option.id + '" ' + (value === option.id ? 'checked' : '') + '> ' + option.label + '</label>';
    }).join('') + '</div>';
  }

  function buildMultiHtml(field) {
    var options = Array.isArray(field.ayar_json && field.ayar_json.secenekler) ? field.ayar_json.secenekler : [];
    var value = state.answers[field.id] && typeof state.answers[field.id] === 'object' ? state.answers[field.id] : {};
    return '<div class="answer-options">' + options.map(function(option) {
      return '<label><input type="checkbox" data-option-id="' + option.id + '" ' + (value[option.id] ? 'checked' : '') + '> ' + option.label + '</label>';
    }).join('') + '</div>';
  }

  function buildMatchHtml(field) {
    var settings = field.ayar_json || {};
    var leftItems = Array.isArray(settings.sol_maddeler) ? settings.sol_maddeler : [];
    var rightItems = Array.isArray(settings.sag_maddeler) ? settings.sag_maddeler : [];
    var value = state.answers[field.id] && typeof state.answers[field.id] === 'object' ? state.answers[field.id] : {};
    return '<div class="answer-options">' + leftItems.map(function(leftItem) {
      return (
        '<div class="match-row">' +
          '<span>' + leftItem.label + '</span>' +
          '<select data-left-id="' + leftItem.id + '">' +
            '<option value="">Sec</option>' +
            rightItems.map(function(rightItem) {
              return '<option value="' + rightItem.id + '" ' + (value[leftItem.id] === rightItem.id ? 'selected' : '') + '>' + rightItem.label + '</option>';
            }).join('') +
          '</select>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  function buildFieldHtml(field) {
    if (field.alan_tipi === 'dogru-yanlis') {
      return buildTrueFalseHtml(field);
    }
    if (field.alan_tipi === 'coklu-secim') {
      return buildMultiHtml(field);
    }
    if (field.alan_tipi === 'eslestirme') {
      return buildMatchHtml(field);
    }
    return buildSingleHtml(field);
  }

  function syncHero() {
    qs('worksheetTitle').textContent = state.documentRow ? state.documentRow.baslik : 'Calisma kagidi';
    qs('worksheetDesc').textContent = state.documentRow && state.documentRow.aciklama
      ? state.documentRow.aciklama
      : 'PDF uzerindeki kutulari doldurup calismayi tamamla.';
    qs('worksheetPill').textContent = state.documentRow
      ? '🧩 ' + state.documentRow.sinifLabel + ' · ' + state.documentRow.dersLabel
      : '🧩 Etkileşimli Calisma Kagidi';
    qs('backToDocumentLink').href = '/dokuman.html?id=' + encodeURIComponent(state.documentId);
    document.title = (state.documentRow && state.documentRow.baslik ? state.documentRow.baslik + ' Çalışma Kağıdı' : 'Çalışma Kağıdı') + ' | Kemal Öğretmenim';
    if (window.kemalSeo) {
      window.kemalSeo.update({
        title: document.title,
        description: qs('worksheetDesc').textContent,
      });
    }
    mountWorksheetReaction();
  }

  function mountWorksheetReaction() {
    var target = document.querySelector('.hero-inner > div');
    if (!target || !state.documentId || !state.documentRow || !window.kemalContentReactions) {
      return;
    }
    var existing = target.querySelector('.worksheet-reaction-slot');
    if (existing) {
      existing.remove();
    }
    window.kemalContentReactions.mount(target, {
      contentType: 'worksheet',
      contentId: state.documentId,
      title: state.documentRow.baslik || 'Calisma kagidi',
      href: '/calisma-kagidi.html?id=' + encodeURIComponent(state.documentId),
      grade: state.documentRow.sinifLabel || '',
      subject: state.documentRow.dersLabel || '',
      sourceLabel: 'Çalışma Kağıdı',
    }, { className: 'worksheet-reaction-slot' });
  }

  function syncInfoCards() {
    qs('worksheetFieldStat').textContent = state.fields.length + ' alan';
    qs('worksheetPassStat').textContent = 'Gecme ' + (state.worksheet ? state.worksheet.gecis_notu : 60);
    qs('worksheetInstructions').textContent = state.worksheet && state.worksheet.yonerge
      ? state.worksheet.yonerge
      : 'Kutularin icindeki sorulari okuyup cevaplarini sec. Sonunda sistemi gondererek puanini gorebilirsin.';
  }

  function bindFieldInputs(field, box) {
    if (field.alan_tipi === 'dogru-yanlis' || field.alan_tipi === 'tek-secim') {
      box.querySelectorAll('input[type="radio"]').forEach(function(input) {
        input.addEventListener('change', function() {
          state.answers[field.id] = input.value;
        });
      });
      return;
    }

    if (field.alan_tipi === 'coklu-secim') {
      box.querySelectorAll('input[type="checkbox"]').forEach(function(input) {
        input.addEventListener('change', function() {
          var current = state.answers[field.id] && typeof state.answers[field.id] === 'object'
            ? Object.assign({}, state.answers[field.id])
            : {};
          var optionId = input.getAttribute('data-option-id');
          if (input.checked) {
            current[optionId] = true;
          } else {
            delete current[optionId];
          }
          state.answers[field.id] = current;
        });
      });
      return;
    }

    if (field.alan_tipi === 'eslestirme') {
      box.querySelectorAll('select[data-left-id]').forEach(function(select) {
        select.addEventListener('change', function() {
          var current = state.answers[field.id] && typeof state.answers[field.id] === 'object'
            ? Object.assign({}, state.answers[field.id])
            : {};
          var leftId = select.getAttribute('data-left-id');
          if (select.value) {
            current[leftId] = select.value;
          } else {
            delete current[leftId];
          }
          state.answers[field.id] = current;
        });
      });
    }
  }

  async function renderPages() {
    ensurePdfWorker();
    qs('worksheetStage').innerHTML = '<div class="stage-loading"><span>⏳</span><p>PDF sayfalari hazirlaniyor…</p></div>';
    state.pdfDoc = await window.pdfjsLib.getDocument(state.documentRow.dosyaUrl).promise;

    var stage = qs('worksheetStage');
    stage.innerHTML = '';
    var targetWidth = getStageWidth();

    for (var pageNo = 1; pageNo <= state.pdfDoc.numPages; pageNo += 1) {
      var page = await state.pdfDoc.getPage(pageNo);
      var baseViewport = page.getViewport({ scale: 1 });
      var scale = targetWidth / baseViewport.width;
      var viewport = page.getViewport({ scale: scale });

      var pageEl = document.createElement('article');
      pageEl.className = 'sheet-page';
      pageEl.style.width = viewport.width + 28 + 'px';

      var wrap = document.createElement('div');
      wrap.className = 'sheet-wrap';
      wrap.style.width = viewport.width + 'px';
      wrap.style.height = viewport.height + 'px';

      var canvas = document.createElement('canvas');
      canvas.className = 'sheet-canvas';
      var renderBoost = getCanvasRenderBoost();
      canvas.width = Math.round(viewport.width * renderBoost);
      canvas.height = Math.round(viewport.height * renderBoost);
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';

      var overlay = document.createElement('div');
      overlay.className = 'sheet-overlay';

      wrap.appendChild(canvas);
      wrap.appendChild(overlay);
      pageEl.appendChild(wrap);

      var footer = document.createElement('div');
      footer.className = 'sheet-footer';
      footer.textContent = 'Sayfa ' + pageNo;
      pageEl.appendChild(footer);

      stage.appendChild(pageEl);

      var context = canvas.getContext('2d', { alpha: false });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      await page.render({
        canvasContext: context,
        viewport: viewport,
        transform: renderBoost > 1 ? [renderBoost, 0, 0, renderBoost, 0, 0] : null,
      }).promise;

      state.fields.filter(function(field) {
        return field.sayfa_no === pageNo;
      }).forEach(function(field) {
        var box = document.createElement('div');
        box.className = buildFieldBoxClass(field);
        box.style.left = percent(field.x) + '%';
        box.style.top = percent(field.y) + '%';
        box.style.width = percent(field.genislik) + '%';
        box.style.height = percent(field.yukseklik) + '%';
        box.innerHTML =
          '<div class="points">' + Math.round(Number(field.puan || 0)) + ' puan</div>' +
          '<strong>' + getFieldQuestion(field) + '</strong>' +
          (getFieldHelp(field) ? '<p>' + getFieldHelp(field) + '</p>' : '') +
          buildFieldHtml(field);
        overlay.appendChild(box);
        bindFieldInputs(field, box);
      });
    }
  }

  function getStudentPayload() {
    var authInfo = window.kemalUserAuth && window.kemalUserAuth.getStudentInfo
      ? window.kemalUserAuth.getStudentInfo()
      : null;
    return {
      accountUid: authInfo && authInfo.role === 'student' ? authInfo.accountUid : '',
      email: authInfo && authInfo.role === 'student' ? authInfo.email : '',
      ad: qs('studentName').value.trim(),
      soyad: qs('studentSurname').value.trim(),
      sinif: qs('studentGrade').value.trim(),
      sube: qs('studentSection').value.trim(),
    };
  }

  function validateSafeStudentPayload(payload) {
    if (!window.kemalContentSafety || typeof window.kemalContentSafety.validateFields !== 'function') {
      return true;
    }
    var result = window.kemalContentSafety.validateFields([
      { element: qs('studentName'), label: 'ogrenci_adi', value: payload.ad },
      { element: qs('studentSurname'), label: 'ogrenci_soyadi', value: payload.soyad },
      { element: qs('studentSection'), label: 'sube', value: payload.sube },
    ], { surface: 'worksheet_student_info' });
    if (!result.ok) {
      toast(result.message, 'error');
      return false;
    }
    return true;
  }

  function setValueIfEmpty(id, value) {
    var el = qs(id);
    if (el && !el.value && value) {
      el.value = value;
    }
  }

  function prefillStudentFromAccount() {
    if (!window.kemalUserAuth || typeof window.kemalUserAuth.ready !== 'function') {
      return;
    }
    window.kemalUserAuth.ready().then(function() {
      var info = window.kemalUserAuth.getStudentInfo ? window.kemalUserAuth.getStudentInfo() : null;
      if (!info || info.role !== 'student') {
        return;
      }
      setValueIfEmpty('studentName', info.firstName);
      setValueIfEmpty('studentSurname', info.lastName);
      setValueIfEmpty('studentGrade', info.grade);
      setValueIfEmpty('studentSection', info.sube);
    });
  }

  function showResult(result) {
    var card = qs('resultCard');
    var passed = Boolean(result && result.gecti);
    card.style.display = 'block';
    card.classList.toggle('fail', !passed);
    qs('resultScore').textContent = String(result.puan_100luk || 0) + '/100';
    qs('resultCopy').innerHTML =
      '<strong>' + (passed ? 'Harika, baraji gectin.' : 'Calisma tamamlandi.') + '</strong>' +
      'Dogru: ' + (result.dogru_sayisi || 0) +
      ' · Yanlis: ' + (result.yanlis_sayisi || 0) +
      ' · Toplam alan: ' + (result.toplam_alan || 0);
    qs('resultHint').textContent = 'Gonderim kaydedildi. Istersen yeni bir deneme yapabilirsin.';
  }

  function markWorksheetCompleted(result) {
    if (!window.kemalContentProgress || !state.documentId || !state.documentRow) {
      return;
    }

    window.kemalContentProgress.markCompleted({
      type: 'worksheet',
      id: state.documentId,
      title: state.documentRow.baslik || 'Calisma kagidi',
      href: '/calisma-kagidi.html?id=' + encodeURIComponent(state.documentId),
      grade: state.documentRow.sinif || '',
      subject: state.documentRow.ders || '',
      meta: {
        accountUid: getStudentPayload().accountUid || '',
        score100: result && result.puan_100luk ? result.puan_100luk : 0,
        passed: Boolean(result && result.gecti),
      },
    });
  }

  async function submitWorksheet() {
    try {
      qs('submitBtn').disabled = true;
      var studentPayload = getStudentPayload();
      if (!validateSafeStudentPayload(studentPayload)) return;
      var result = await window.kemalCalismaKagidiStore.submitWorksheet(state.documentId, studentPayload, state.answers);
      showResult(result || {});
      markWorksheetCompleted(result || {});
      toast('Calisma kagidi gonderildi.', 'success');
    } catch (error) {
      toast(humanizeError(error), 'error');
    } finally {
      qs('submitBtn').disabled = false;
    }
  }

  async function loadData() {
    var params = new URLSearchParams(window.location.search);
    state.documentId = params.get('id') || '';

    if (!state.documentId || !isValidUuid(state.documentId)) {
      throw new Error('Dokuman kimligi bulunamadi.');
    }

    var documentRow = await window.kemalDocumentStore.getDocumentById(state.documentId);
    if (!documentRow) {
      throw new Error('Dokuman bulunamadi ya da erişime kapali.');
    }

    var worksheetBundle = await window.kemalCalismaKagidiStore.getPublishedWorksheet(state.documentId);
    if (!worksheetBundle || !worksheetBundle.worksheet) {
      throw new Error('Bu PDF icin yayinlanmis bir calisma kagidi henuz yok.');
    }

    state.documentRow = documentRow;
    state.worksheet = worksheetBundle.worksheet;
    state.fields = worksheetBundle.fields || [];
    syncHero();
    syncInfoCards();
  }

  function bindUi() {
    qs('submitBtn').addEventListener('click', submitWorksheet);
    window.addEventListener('resize', function() {
      if (!state.documentRow || !state.pdfDoc) {
        return;
      }
      window.clearTimeout(state.renderTimer);
      state.renderTimer = window.setTimeout(function() {
        renderPages().catch(function(error) {
          toast(humanizeError(error), 'error');
        });
      }, 160);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    bindUi();
    prefillStudentFromAccount();
    window.addEventListener('kemal-user-auth-changed', prefillStudentFromAccount);
    loadData()
      .then(renderPages)
      .catch(function(error) {
        if (!state.documentId || !isValidUuid(state.documentId)) {
          showMissingDocumentState();
          return;
        }
        qs('worksheetStage').innerHTML = '<div class="stage-empty"><span>⚠️</span><p>' + humanizeError(error) + '</p></div>';
        qs('worksheetTitle').textContent = 'Çalışma kağıdı açılamadı';
        qs('worksheetDesc').textContent = 'Bağlantıyı kontrol edip yeniden deneyebilirsin.';
      });
  });
})();
