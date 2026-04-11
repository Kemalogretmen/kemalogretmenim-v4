(function() {
  'use strict';

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
      lowered.indexOf('calisma_kagitlari') !== -1 ||
      lowered.indexOf('calisma_kagidi_alanlari') !== -1 ||
      lowered.indexOf('submit_calisma_kagidi') !== -1
    ) {
      return 'Bu calisma kagidi henuz yayinlanmamis ya da sistem kurulumu tamamlanmamis gorunuyor.';
    }
    return (error && error.message) || 'Beklenmeyen bir hata oluştu.';
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
      canvas.width = viewport.width;
      canvas.height = viewport.height;

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

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: viewport,
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
    return {
      ad: qs('studentName').value.trim(),
      soyad: qs('studentSurname').value.trim(),
      sinif: qs('studentGrade').value.trim(),
      sube: qs('studentSection').value.trim(),
    };
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
        score100: result && result.puan_100luk ? result.puan_100luk : 0,
        passed: Boolean(result && result.gecti),
      },
    });
  }

  async function submitWorksheet() {
    try {
      qs('submitBtn').disabled = true;
      var result = await window.kemalCalismaKagidiStore.submitWorksheet(state.documentId, getStudentPayload(), state.answers);
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

    if (!state.documentId) {
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
    loadData()
      .then(renderPages)
      .catch(function(error) {
        qs('worksheetStage').innerHTML = '<div class="stage-empty"><span>⚠️</span><p>' + humanizeError(error) + '</p></div>';
        qs('worksheetTitle').textContent = 'Calisma kagidi acilamadi';
        qs('worksheetDesc').textContent = 'Baglantiyi kontrol edip yeniden deneyebilirsin.';
      });
  });
})();
