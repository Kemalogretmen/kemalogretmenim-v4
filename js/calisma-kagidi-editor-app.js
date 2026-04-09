(function() {
  'use strict';

  var FIELD_TYPES = {
    'dogru-yanlis': { label: 'Doğru / Yanlış' },
    'tek-secim': { label: 'Tek Seçim' },
    'coklu-secim': { label: 'Çoklu İşaretleme' },
    'eslestirme': { label: 'Eşleştirme' },
  };

  var state = {
    documents: [],
    documentId: '',
    documentRow: null,
    worksheet: null,
    fields: [],
    submissions: [],
    selectedFieldId: '',
    currentTool: 'select',
    pdfDoc: null,
    pageMeta: new Map(),
    isHydratingForm: false,
    renderTimer: null,
    drag: null,
    toastTimer: null,
    pdfWorkerReady: false,
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function getClient() {
    return window.kemalAdminAuth.getClient();
  }

  function ensurePdfWorker() {
    if (!window.pdfjsLib) {
      throw new Error('PDF kutuphanesi yuklenemedi.');
    }
    if (!state.pdfWorkerReady) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      state.pdfWorkerReady = true;
    }
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
    var combined = String((error && error.message) || '') + ' ' + String((error && error.details) || '') + ' ' + String((error && error.code) || '');
    var lowered = combined.toLowerCase();
    if (
      lowered.indexOf('calisma_kagitlari') !== -1 ||
      lowered.indexOf('calisma_kagidi_alanlari') !== -1 ||
      lowered.indexOf('submit_calisma_kagidi') !== -1
    ) {
      return 'Calisma kagidi tabloları henüz kurulmamış gorunuyor. `supabase-calisma-kagitlari.sql` dosyasını SQL Editor içinde çalıştırmalısın.';
    }
    if (lowered.indexOf('invalid login credentials') !== -1) {
      return window.kemalAdminAuth.humanizeError(error);
    }
    return (error && error.message) || 'İşlem sırasında beklenmeyen bir hata oluştu.';
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function percent(value) {
    return (Number(value || 0) * 100).toFixed(1);
  }

  function createId(prefix) {
    return window.kemalCalismaKagidiStore.createId(prefix);
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
      .slice(0, 40) || 'alan';
  }

  function copyToClipboard(text) {
    if (!text) {
      return Promise.resolve(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function() {
        return true;
      }).catch(function() {
        return false;
      });
    }
    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.top = '-9999px';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      area.remove();
      return Promise.resolve(ok);
    } catch (error) {
      return Promise.resolve(false);
    }
  }

  function getStudentUrl() {
    return window.location.origin + '/calisma-kagidi.html?id=' + encodeURIComponent(state.documentId);
  }

  function getViewerUrl() {
    return window.location.origin + '/dokuman.html?id=' + encodeURIComponent(state.documentId);
  }

  function getDocumentById(id) {
    return state.documents.find(function(item) {
      return item.id === id;
    }) || null;
  }

  function getSelectedField() {
    return state.fields.find(function(field) {
      return field.id === state.selectedFieldId;
    }) || null;
  }

  function buildDocumentLabel(row) {
    var gradeLabel = window.kemalDocumentStore.getGradeLabel(row.sinif);
    var subjectMeta = window.kemalDocumentStore.getSubjectMeta(row.ders);
    var subjectLabel = subjectMeta ? subjectMeta.label : row.ders;
    return gradeLabel + ' · ' + subjectLabel + ' · ' + row.baslik;
  }

  function parseLines(value, prefix) {
    return String(value || '')
      .split(/\r?\n/)
      .map(function(line) { return line.trim(); })
      .filter(Boolean)
      .map(function(label, index) {
        return {
          id: prefix + '-' + (index + 1),
          label: label,
        };
      });
  }

  function buildSingleDefaults(index) {
    return {
      ayar_json: {
        soru: 'Dogru cevabi isaretle.',
        yardim: '',
        secenekler: [
          { id: 'secenek-1', label: 'Secenek 1' },
          { id: 'secenek-2', label: 'Secenek 2' },
        ],
      },
      cevap_json: {
        dogru_secenek: 'secenek-1',
      },
      soru_etiketi: 'Soru ' + index,
    };
  }

  function buildMultiDefaults(index) {
    return {
      ayar_json: {
        soru: 'Dogru seceneklerin hepsini isaretle.',
        yardim: '',
        secenekler: [
          { id: 'secenek-1', label: 'Secenek 1' },
          { id: 'secenek-2', label: 'Secenek 2' },
          { id: 'secenek-3', label: 'Secenek 3' },
        ],
      },
      cevap_json: {
        dogru_secenekler: {
          'secenek-1': true,
        },
      },
      soru_etiketi: 'Soru ' + index,
    };
  }

  function buildTrueFalseDefaults(index) {
    return {
      ayar_json: {
        soru: 'Cumleyi okuyup dogru mu yanlis mi sec.',
        yardim: '',
        secenekler: [
          { id: 'dogru', label: 'Dogru' },
          { id: 'yanlis', label: 'Yanlis' },
        ],
      },
      cevap_json: {
        dogru_deger: 'dogru',
      },
      soru_etiketi: 'Soru ' + index,
    };
  }

  function buildMatchDefaults(index) {
    return {
      ayar_json: {
        soru: 'Dogru eslestirmeleri yap.',
        yardim: '',
        sol_maddeler: [
          { id: 'sol-1', label: '1. ifade' },
          { id: 'sol-2', label: '2. ifade' },
        ],
        sag_maddeler: [
          { id: 'sag-1', label: 'A secenegi' },
          { id: 'sag-2', label: 'B secenegi' },
        ],
      },
      cevap_json: {
        eslesmeler: {
          'sol-1': 'sag-1',
          'sol-2': 'sag-2',
        },
      },
      soru_etiketi: 'Soru ' + index,
    };
  }

  function createFieldForType(type, pageNo, rect, index) {
    var defaults;
    if (type === 'dogru-yanlis') {
      defaults = buildTrueFalseDefaults(index);
    } else if (type === 'coklu-secim') {
      defaults = buildMultiDefaults(index);
    } else if (type === 'eslestirme') {
      defaults = buildMatchDefaults(index);
    } else {
      defaults = buildSingleDefaults(index);
    }

    return {
      id: createId('alan'),
      soru_kodu: slugify(type + '-' + index),
      soru_etiketi: defaults.soru_etiketi,
      alan_tipi: type,
      sayfa_no: pageNo,
      x: rect.x,
      y: rect.y,
      genislik: rect.width,
      yukseklik: rect.height,
      puan: 10,
      zorunlu: true,
      sira: index,
      ayar_json: defaults.ayar_json,
      cevap_json: defaults.cevap_json,
    };
  }

  function getFieldSummary(field) {
    return FIELD_TYPES[field.alan_tipi] ? FIELD_TYPES[field.alan_tipi].label : field.alan_tipi;
  }

  function toOptionText(items) {
    return (Array.isArray(items) ? items : []).map(function(item) {
      return item.label || '';
    }).join('\n');
  }

  function toCorrectIndex(value, options) {
    var list = Array.isArray(options) ? options : [];
    var index = list.findIndex(function(item) {
      return item.id === value;
    });
    return index === -1 ? '' : String(index + 1);
  }

  function toCorrectIndexList(map, options) {
    var correctMap = map && typeof map === 'object' ? map : {};
    return (Array.isArray(options) ? options : []).map(function(item, index) {
      return correctMap[item.id] ? String(index + 1) : '';
    }).filter(Boolean).join(',');
  }

  function toMatchingText(field) {
    var settings = field.ayar_json || {};
    var leftItems = Array.isArray(settings.sol_maddeler) ? settings.sol_maddeler : [];
    var rightItems = Array.isArray(settings.sag_maddeler) ? settings.sag_maddeler : [];
    var pairs = field.cevap_json && field.cevap_json.eslesmeler ? field.cevap_json.eslesmeler : {};
    return leftItems.map(function(leftItem, leftIndex) {
      var rightId = pairs[leftItem.id];
      var rightIndex = rightItems.findIndex(function(rightItem) {
        return rightItem.id === rightId;
      });
      return String(leftIndex + 1) + '=' + String(rightIndex + 1);
    }).join('\n');
  }

  function showWorkspace(show) {
    qs('workspace').style.display = show ? 'block' : 'none';
    qs('emptyState').style.display = show ? 'none' : 'block';
  }

  function updateHeroMeta() {
    if (!state.documentRow) {
      qs('documentMeta').textContent = 'Bir PDF seçtikten sonra sayfalar burada düzenlemeye açılır.';
      return;
    }
    qs('documentMeta').textContent =
      buildDocumentLabel(state.documentRow) +
      ' · ' + Number(state.documentRow.sayfa_sayisi || 0) + ' sayfa';
  }

  function renderDocumentPicker() {
    var picker = qs('documentPicker');
    if (!state.documents.length) {
      picker.innerHTML = '<option value="">Doküman bulunamadı</option>';
      updateHeroMeta();
      return;
    }
    picker.innerHTML = ['<option value="">Doküman seç…</option>'].concat(state.documents.map(function(doc) {
      return '<option value="' + doc.id + '">' + buildDocumentLabel(doc) + '</option>';
    })).join('');
    if (state.documentId) {
      picker.value = state.documentId;
    }
    updateHeroMeta();
  }

  async function loadDocuments() {
    var response = await getClient()
      .from('dokumanlar')
      .select('*')
      .order('sinif', { ascending: true })
      .order('ders', { ascending: true })
      .order('baslik', { ascending: true });

    if (response.error) {
      throw response.error;
    }

    state.documents = (response.data || []).map(function(item) {
      return Object.assign({}, item, {
        dosyaUrl: window.kemalDocumentStore.getPublicFileUrl(item.dosya_yolu),
      });
    });
    renderDocumentPicker();
  }

  function setTool(tool) {
    state.currentTool = tool;
    Array.from(document.querySelectorAll('[data-tool]')).forEach(function(button) {
      button.classList.toggle('active', button.getAttribute('data-tool') === tool);
    });
    qs('editorDocMeta').textContent = tool === 'select'
      ? 'Kutuları seçip taşıyabilir veya sağ panelden ayrıntılarını düzenleyebilirsin.'
      : FIELD_TYPES[tool].label + ' alanı eklemek için PDF üzerinde sürükleyin.';
  }

  function renderToolButtons() {
    qs('toolButtons').innerHTML = [
      '<button class="tool-btn active" type="button" data-tool="select">Secim</button>',
      '<button class="tool-btn" type="button" data-tool="dogru-yanlis">Dogru / Yanlis</button>',
      '<button class="tool-btn" type="button" data-tool="tek-secim">Tek Secim</button>',
      '<button class="tool-btn" type="button" data-tool="coklu-secim">Coklu Isaretleme</button>',
      '<button class="tool-btn" type="button" data-tool="eslestirme">Eslestirme</button>'
    ].join('');
  }

  function syncWorksheetControls() {
    state.isHydratingForm = true;
    qs('worksheetInstructions').value = state.worksheet ? (state.worksheet.yonerge || '') : '';
    qs('passingScore').value = state.worksheet ? String(state.worksheet.gecis_notu || 60) : '60';
    qs('attemptLimit').value = state.worksheet ? String(state.worksheet.izinli_deneme || 0) : '0';
    qs('worksheetActive').checked = !state.worksheet || state.worksheet.aktif !== false;
    qs('worksheetPublished').checked = Boolean(state.worksheet && state.worksheet.yayinda);
    state.isHydratingForm = false;
    qs('publishBadge').textContent = state.worksheet && state.worksheet.yayinda ? 'Yayinda' : 'Taslak';
    qs('publishBadge').className = 'badge ' + (state.worksheet && state.worksheet.yayinda ? 'success' : 'warn');
    qs('saveTitle').textContent = state.worksheet && state.worksheet.yayinda ? 'Yayin canli' : 'Taslak hazir';
    qs('saveHint').textContent = state.worksheet && state.worksheet.yayinda
      ? 'Ogrenci linki acik. Yeni kayitlar bu duzen uzerinden puanlanir.'
      : 'Yayin anahtarini actiginda ogrenci sayfasi kullanima acilir.';
  }

  function syncSelectedFieldForm() {
    var field = getSelectedField();
    qs('fieldPlaceholder').style.display = field ? 'none' : 'block';
    qs('fieldFormWrap').style.display = field ? 'grid' : 'none';

    if (!field) {
      return;
    }

    state.isHydratingForm = true;
    qs('fieldLabel').value = field.soru_etiketi || '';
    qs('fieldType').value = field.alan_tipi;
    qs('fieldQuestion').value = field.ayar_json && field.ayar_json.soru ? field.ayar_json.soru : '';
    qs('fieldHelp').value = field.ayar_json && field.ayar_json.yardim ? field.ayar_json.yardim : '';
    qs('fieldPoints').value = String(field.puan || 10);
    qs('fieldRequired').checked = field.zorunlu !== false;
    qs('fieldX').value = percent(field.x);
    qs('fieldY').value = percent(field.y);
    qs('fieldWidth').value = percent(field.genislik);
    qs('fieldHeight').value = percent(field.yukseklik);
    qs('trueFalseAnswer').value = field.cevap_json && field.cevap_json.dogru_deger ? field.cevap_json.dogru_deger : 'dogru';
    qs('singleOptions').value = toOptionText(field.ayar_json && field.ayar_json.secenekler);
    qs('singleCorrect').value = toCorrectIndex(field.cevap_json && field.cevap_json.dogru_secenek, field.ayar_json && field.ayar_json.secenekler);
    qs('multiOptions').value = toOptionText(field.ayar_json && field.ayar_json.secenekler);
    qs('multiCorrect').value = toCorrectIndexList(field.cevap_json && field.cevap_json.dogru_secenekler, field.ayar_json && field.ayar_json.secenekler);
    qs('matchLeft').value = toOptionText(field.ayar_json && field.ayar_json.sol_maddeler);
    qs('matchRight').value = toOptionText(field.ayar_json && field.ayar_json.sag_maddeler);
    qs('matchPairs').value = toMatchingText(field);
    state.isHydratingForm = false;

    qs('typeConfigTrueFalse').style.display = field.alan_tipi === 'dogru-yanlis' ? 'block' : 'none';
    qs('typeConfigSingle').style.display = field.alan_tipi === 'tek-secim' ? 'block' : 'none';
    qs('typeConfigMulti').style.display = field.alan_tipi === 'coklu-secim' ? 'block' : 'none';
    qs('typeConfigMatch').style.display = field.alan_tipi === 'eslestirme' ? 'block' : 'none';
  }

  function renderFieldList() {
    var list = qs('fieldList');
    qs('fieldCountBadge').textContent = state.fields.length + ' alan';

    if (!state.fields.length) {
      list.innerHTML = '<div class="placeholder-box">Henuz soru alanı eklenmedi. Sagdaki araclardan birini secip PDF uzerinde sürükleyin.</div>';
      return;
    }

    list.innerHTML = state.fields.map(function(field, index) {
      return (
        '<div class="field-item' + (field.id === state.selectedFieldId ? ' active' : '') + '" data-field-item="' + field.id + '">' +
          '<strong>' + (field.soru_etiketi || ('Soru ' + (index + 1))) + '</strong>' +
          '<span>Sayfa ' + field.sayfa_no + ' · ' + getFieldSummary(field) + ' · ' + Math.round(Number(field.puan || 0)) + ' puan</span>' +
        '</div>'
      );
    }).join('');
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }
    try {
      return new Date(value).toLocaleString('tr-TR');
    } catch (error) {
      return value;
    }
  }

  function renderSubmissions() {
    var list = qs('submissionList');
    if (!list) {
      return;
    }

    if (!state.submissions.length) {
      list.innerHTML = '<div class="placeholder-box">Henüz bu PDF için gönderim oluşmadı.</div>';
      return;
    }

    list.innerHTML = state.submissions.map(function(item) {
      return (
        '<div class="field-item">' +
          '<strong>' + item.ad + ' ' + item.soyad + '</strong>' +
          '<span>' + item.sinif + '. sınıf / ' + item.sube + ' · ' + item.puan_100luk + '/100 · ' + formatDate(item.olusturma_tarihi) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderFieldBoxes() {
    state.pageMeta.forEach(function(meta) {
      if (!meta.overlay) {
        return;
      }
      meta.overlay.innerHTML = '';
      state.fields.filter(function(field) {
        return field.sayfa_no === meta.pageNo;
      }).forEach(function(field) {
        var box = document.createElement('div');
        box.className = 'field-box type-' + field.alan_tipi + (field.id === state.selectedFieldId ? ' selected' : '');
        box.style.left = percent(field.x) + '%';
        box.style.top = percent(field.y) + '%';
        box.style.width = percent(field.genislik) + '%';
        box.style.height = percent(field.yukseklik) + '%';
        box.setAttribute('data-field-id', field.id);
        box.innerHTML =
          '<strong>' + (field.soru_etiketi || 'Isimsiz alan') + '</strong>' +
          '<span>' + getFieldSummary(field) + ' · ' + Math.round(Number(field.puan || 0)) + ' puan</span>';
        meta.overlay.appendChild(box);
      });

      if (state.drag && state.drag.mode === 'create' && state.drag.pageNo === meta.pageNo && state.drag.draft) {
        var draft = document.createElement('div');
        draft.className = 'draft-box';
        draft.style.left = percent(state.drag.draft.x) + '%';
        draft.style.top = percent(state.drag.draft.y) + '%';
        draft.style.width = percent(state.drag.draft.width) + '%';
        draft.style.height = percent(state.drag.draft.height) + '%';
        meta.overlay.appendChild(draft);
      }
    });
  }

  function setSelectedField(fieldId) {
    state.selectedFieldId = fieldId || '';
    renderFieldList();
    renderFieldBoxes();
    syncSelectedFieldForm();
  }

  function parseIndexList(value) {
    return String(value || '')
      .split(',')
      .map(function(item) { return parseInt(item.trim(), 10); })
      .filter(function(item) { return Number.isFinite(item) && item > 0; });
  }

  function parseMatchLines(value, leftItems, rightItems) {
    var map = {};
    String(value || '')
      .split(/\r?\n/)
      .map(function(line) { return line.trim(); })
      .filter(Boolean)
      .forEach(function(line) {
        var parts = line.split('=');
        if (parts.length !== 2) {
          return;
        }
        var leftIndex = parseInt(parts[0].trim(), 10) - 1;
        var rightIndex = parseInt(parts[1].trim(), 10) - 1;
        if (leftItems[leftIndex] && rightItems[rightIndex]) {
          map[leftItems[leftIndex].id] = rightItems[rightIndex].id;
        }
      });
    return map;
  }

  function applyFieldTypeDefaults(field, type) {
    var fresh = createFieldForType(type, field.sayfa_no, {
      x: field.x,
      y: field.y,
      width: field.genislik,
      height: field.yukseklik,
    }, field.sira || 1);
    field.alan_tipi = type;
    field.ayar_json = fresh.ayar_json;
    field.cevap_json = fresh.cevap_json;
    field.soru_etiketi = field.soru_etiketi || fresh.soru_etiketi;
    field.soru_kodu = field.soru_kodu || fresh.soru_kodu;
  }

  function updateSelectedFieldFromForm() {
    if (state.isHydratingForm) {
      return;
    }
    var field = getSelectedField();
    if (!field) {
      return;
    }

    var type = window.kemalCalismaKagidiStore.normalizeFieldType(qs('fieldType').value);
    if (type !== field.alan_tipi) {
      applyFieldTypeDefaults(field, type);
    }

    field.soru_etiketi = qs('fieldLabel').value.trim() || field.soru_etiketi || 'Isimsiz alan';
    field.puan = Math.max(0, parseInt(qs('fieldPoints').value || '0', 10) || 0);
    field.zorunlu = qs('fieldRequired').checked;
    field.x = clamp((parseFloat(qs('fieldX').value || '0') || 0) / 100, 0, 0.96);
    field.y = clamp((parseFloat(qs('fieldY').value || '0') || 0) / 100, 0, 0.96);
    field.genislik = clamp((parseFloat(qs('fieldWidth').value || '0') || 0) / 100, 0.04, 1);
    field.yukseklik = clamp((parseFloat(qs('fieldHeight').value || '0') || 0) / 100, 0.04, 1);
    if (field.x + field.genislik > 1) {
      field.x = 1 - field.genislik;
    }
    if (field.y + field.yukseklik > 1) {
      field.y = 1 - field.yukseklik;
    }

    var question = qs('fieldQuestion').value.trim();
    var help = qs('fieldHelp').value.trim();

    if (field.alan_tipi === 'dogru-yanlis') {
      field.ayar_json = {
        soru: question || 'Dogru mu yanlis mi sec.',
        yardim: help,
        secenekler: [
          { id: 'dogru', label: 'Dogru' },
          { id: 'yanlis', label: 'Yanlis' },
        ],
      };
      field.cevap_json = {
        dogru_deger: qs('trueFalseAnswer').value === 'yanlis' ? 'yanlis' : 'dogru',
      };
    } else if (field.alan_tipi === 'tek-secim') {
      var singleOptions = parseLines(qs('singleOptions').value, 'secenek');
      field.ayar_json = {
        soru: question || 'Dogru secenegi isaretle.',
        yardim: help,
        secenekler: singleOptions,
      };
      var singleCorrectIndex = parseInt(qs('singleCorrect').value, 10) - 1;
      field.cevap_json = {
        dogru_secenek: singleOptions[singleCorrectIndex] ? singleOptions[singleCorrectIndex].id : '',
      };
    } else if (field.alan_tipi === 'coklu-secim') {
      var multiOptions = parseLines(qs('multiOptions').value, 'secenek');
      var correctIndexes = parseIndexList(qs('multiCorrect').value);
      var correctMap = {};
      correctIndexes.forEach(function(number) {
        if (multiOptions[number - 1]) {
          correctMap[multiOptions[number - 1].id] = true;
        }
      });
      field.ayar_json = {
        soru: question || 'Dogru seceneklerin hepsini isaretle.',
        yardim: help,
        secenekler: multiOptions,
      };
      field.cevap_json = {
        dogru_secenekler: correctMap,
      };
    } else {
      var leftItems = parseLines(qs('matchLeft').value, 'sol');
      var rightItems = parseLines(qs('matchRight').value, 'sag');
      field.ayar_json = {
        soru: question || 'Dogru eslestirmeleri yap.',
        yardim: help,
        sol_maddeler: leftItems,
        sag_maddeler: rightItems,
      };
      field.cevap_json = {
        eslesmeler: parseMatchLines(qs('matchPairs').value, leftItems, rightItems),
      };
    }

    renderFieldList();
    renderFieldBoxes();
    syncSelectedFieldForm();
  }

  function validateFields() {
    state.fields.forEach(function(field, index) {
      if (!field.soru_etiketi) {
        throw new Error((index + 1) + '. alanda etiket zorunlu.');
      }
      if (field.alan_tipi === 'tek-secim') {
        if (!Array.isArray(field.ayar_json.secenekler) || field.ayar_json.secenekler.length < 2) {
          throw new Error((index + 1) + '. tek secim alaninda en az 2 secenek olmali.');
        }
        if (!field.cevap_json.dogru_secenek) {
          throw new Error((index + 1) + '. tek secim alaninda dogru cevap secilmedi.');
        }
      }
      if (field.alan_tipi === 'coklu-secim') {
        if (!Array.isArray(field.ayar_json.secenekler) || field.ayar_json.secenekler.length < 2) {
          throw new Error((index + 1) + '. coklu secim alaninda en az 2 secenek olmali.');
        }
        if (!field.cevap_json.dogru_secenekler || !Object.keys(field.cevap_json.dogru_secenekler).length) {
          throw new Error((index + 1) + '. coklu secim alaninda en az 1 dogru secenek secilmelidir.');
        }
      }
      if (field.alan_tipi === 'eslestirme') {
        var leftItems = Array.isArray(field.ayar_json.sol_maddeler) ? field.ayar_json.sol_maddeler : [];
        var rightItems = Array.isArray(field.ayar_json.sag_maddeler) ? field.ayar_json.sag_maddeler : [];
        if (!leftItems.length || !rightItems.length) {
          throw new Error((index + 1) + '. eslestirme alaninda iki tarafta da maddeler olmali.');
        }
        if (Object.keys(field.cevap_json.eslesmeler || {}).length !== leftItems.length) {
          throw new Error((index + 1) + '. eslestirme alaninda her sol madde icin dogru eslesme girilmelidir.');
        }
      }
    });
  }

  function collectSavePayload() {
    updateSelectedFieldFromForm();
    validateFields();
    return {
      worksheet: state.worksheet,
      fields: state.fields.map(function(field, index) {
        return Object.assign({}, field, {
          sira: index + 1,
          soru_kodu: field.soru_kodu || slugify(field.soru_etiketi || ('alan-' + (index + 1))),
        });
      }),
    };
  }

  async function saveWorksheet() {
    if (!state.documentId) {
      toast('Once bir dokuman secmelisin.', 'error');
      return;
    }
    try {
      var saved = await window.kemalCalismaKagidiStore.saveWorksheet(getClient(), state.documentId, collectSavePayload());
      state.worksheet = saved.worksheet || state.worksheet;
      state.fields = saved.fields || [];
      if (state.selectedFieldId && !getSelectedField()) {
        state.selectedFieldId = state.fields[0] ? state.fields[0].id : '';
      }
      await loadRecentSubmissions();
      syncWorksheetControls();
      renderFieldList();
      renderFieldBoxes();
      syncSelectedFieldForm();
      toast('Calisma kagidi kaydedildi.', 'success');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  function syncWorksheetFromForm() {
    if (state.isHydratingForm || !state.worksheet) {
      return;
    }
    state.worksheet.yonerge = qs('worksheetInstructions').value.trim();
    state.worksheet.gecis_notu = clamp(parseInt(qs('passingScore').value || '60', 10) || 60, 0, 100);
    state.worksheet.izinli_deneme = Math.max(0, parseInt(qs('attemptLimit').value || '0', 10) || 0);
    state.worksheet.aktif = qs('worksheetActive').checked;
    state.worksheet.yayinda = qs('worksheetPublished').checked;
    syncWorksheetControls();
  }

  function getRenderWidth() {
    var stage = qs('pdfStage');
    var available = stage && stage.clientWidth ? stage.clientWidth - 40 : 860;
    return Math.max(360, Math.min(860, available));
  }

  function getNormalizedPoint(event, element) {
    var rect = element.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  function buildDraftRect(start, end) {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.max(0, Math.abs(end.x - start.x)),
      height: Math.max(0, Math.abs(end.y - start.y)),
    };
  }

  function handleDocumentMove(event) {
    if (!state.drag) {
      return;
    }

    if (state.drag.mode === 'create') {
      var pageMeta = state.pageMeta.get(state.drag.pageNo);
      if (!pageMeta) {
        return;
      }
      state.drag.current = getNormalizedPoint(event, pageMeta.overlay);
      state.drag.draft = buildDraftRect(state.drag.start, state.drag.current);
      renderFieldBoxes();
      return;
    }

    if (state.drag.mode === 'move') {
      var movingMeta = state.pageMeta.get(state.drag.pageNo);
      var field = getSelectedField();
      if (!movingMeta || !field) {
        return;
      }
      var pointer = getNormalizedPoint(event, movingMeta.overlay);
      field.x = clamp(pointer.x - state.drag.offsetX, 0, 1 - field.genislik);
      field.y = clamp(pointer.y - state.drag.offsetY, 0, 1 - field.yukseklik);
      renderFieldBoxes();
      syncSelectedFieldForm();
    }
  }

  function finishDrag() {
    if (!state.drag) {
      return;
    }
    if (state.drag.mode === 'create' && state.drag.draft) {
      if (state.drag.draft.width >= 0.04 && state.drag.draft.height >= 0.04) {
        var created = createFieldForType(state.currentTool, state.drag.pageNo, state.drag.draft, state.fields.length + 1);
        state.fields.push(created);
        setSelectedField(created.id);
      }
    }
    state.drag = null;
    renderFieldBoxes();
  }

  function bindOverlayEvents(pageMeta) {
    pageMeta.overlay.addEventListener('pointerdown', function(event) {
      var fieldNode = event.target.closest('[data-field-id]');
      if (fieldNode) {
        var fieldId = fieldNode.getAttribute('data-field-id');
        setSelectedField(fieldId);
        if (state.currentTool === 'select') {
          var field = getSelectedField();
          if (field) {
            var point = getNormalizedPoint(event, pageMeta.overlay);
            state.drag = {
              mode: 'move',
              pageNo: pageMeta.pageNo,
              fieldId: field.id,
              offsetX: point.x - field.x,
              offsetY: point.y - field.y,
            };
          }
        }
        event.preventDefault();
        return;
      }

      if (state.currentTool === 'select') {
        setSelectedField('');
        return;
      }

      state.drag = {
        mode: 'create',
        pageNo: pageMeta.pageNo,
        start: getNormalizedPoint(event, pageMeta.overlay),
        current: null,
        draft: null,
      };
      event.preventDefault();
    });
  }

  async function renderPdfPages() {
    if (!state.documentRow || !state.documentRow.dosyaUrl) {
      qs('pdfStage').innerHTML = '<div class="stage-empty"><span>⚠️</span><p>PDF dosyasi bulunamadi.</p></div>';
      return;
    }

    ensurePdfWorker();
    qs('pdfStage').innerHTML = '<div class="stage-loading"><span>⏳</span><p>PDF sayfalari hazirlaniyor…</p></div>';
    state.pageMeta.clear();
    state.pdfDoc = await window.pdfjsLib.getDocument(state.documentRow.dosyaUrl).promise;

    var stage = qs('pdfStage');
    stage.innerHTML = '';
    var targetWidth = getRenderWidth();

    for (var pageNo = 1; pageNo <= state.pdfDoc.numPages; pageNo += 1) {
      var page = await state.pdfDoc.getPage(pageNo);
      var baseViewport = page.getViewport({ scale: 1 });
      var scale = targetWidth / baseViewport.width;
      var viewport = page.getViewport({ scale: scale });

      var wrapper = document.createElement('article');
      wrapper.className = 'sheet-page';
      wrapper.style.width = viewport.width + 28 + 'px';

      var canvasWrap = document.createElement('div');
      canvasWrap.className = 'sheet-canvas-wrap';
      canvasWrap.style.width = viewport.width + 'px';
      canvasWrap.style.height = viewport.height + 'px';

      var canvas = document.createElement('canvas');
      canvas.className = 'sheet-canvas';
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      var overlay = document.createElement('div');
      overlay.className = 'sheet-overlay';
      overlay.setAttribute('data-page-no', String(pageNo));

      canvasWrap.appendChild(canvas);
      canvasWrap.appendChild(overlay);
      wrapper.appendChild(canvasWrap);

      var footer = document.createElement('div');
      footer.className = 'sheet-footer';
      footer.textContent = 'Sayfa ' + pageNo;
      wrapper.appendChild(footer);
      stage.appendChild(wrapper);

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: viewport,
      }).promise;

      var meta = {
        pageNo: pageNo,
        wrapper: wrapper,
        overlay: overlay,
      };
      state.pageMeta.set(pageNo, meta);
      bindOverlayEvents(meta);
    }

    renderFieldBoxes();
  }

  async function loadRecentSubmissions() {
    var response = await getClient()
      .from('calisma_kagidi_gonderimleri')
      .select('id,ad,soyad,sinif,sube,puan_100luk,olusturma_tarihi')
      .eq('dokuman_id', state.documentId)
      .order('olusturma_tarihi', { ascending: false })
      .limit(8);

    if (response.error) {
      throw response.error;
    }

    state.submissions = response.data || [];
    renderSubmissions();
  }

  async function loadWorksheet() {
    var response = await window.kemalCalismaKagidiStore.getWorksheetForAdmin(getClient(), state.documentId);
    state.worksheet = response.worksheet || {
      id: '',
      dokuman_id: state.documentId,
      yonerge: '',
      aktif: true,
      yayinda: false,
      gecis_notu: 60,
      izinli_deneme: 0,
    };
    state.fields = response.fields || [];
    state.selectedFieldId = state.fields[0] ? state.fields[0].id : '';
    syncWorksheetControls();
    renderFieldList();
    renderSubmissions();
    syncSelectedFieldForm();
  }

  async function openDocument(documentId) {
    if (!documentId) {
      state.documentId = '';
      state.documentRow = null;
      state.fields = [];
      state.submissions = [];
      state.selectedFieldId = '';
      showWorkspace(false);
      renderDocumentPicker();
      renderSubmissions();
      return;
    }

    var doc = getDocumentById(documentId);
    if (!doc) {
      toast('Secilen dokuman bulunamadi.', 'error');
      return;
    }

    state.documentId = documentId;
    state.documentRow = doc;
    history.replaceState({}, '', '/admin/calisma-kagidi-editor.html?dokumanId=' + encodeURIComponent(documentId));
    qs('documentPicker').value = documentId;
    qs('editorDocTitle').textContent = doc.baslik;
    qs('editorDocMeta').textContent = buildDocumentLabel(doc) + ' · Alan eklemek icin arac secip PDF uzerinde sürükleyin.';
    updateHeroMeta();
    showWorkspace(true);

    try {
      await loadWorksheet();
      await loadRecentSubmissions();
      await renderPdfPages();
    } catch (error) {
      qs('pdfStage').innerHTML = '<div class="stage-empty"><span>⚠️</span><p>' + humanizeError(error) + '</p></div>';
      toast(humanizeError(error), 'error');
    }
  }

  function bindUi() {
    renderToolButtons();
    setTool('select');

    qs('toolButtons').addEventListener('click', function(event) {
      var button = event.target.closest('[data-tool]');
      if (!button) {
        return;
      }
      setTool(button.getAttribute('data-tool'));
    });

    qs('loadDocumentBtn').addEventListener('click', function() {
      openDocument(qs('documentPicker').value);
    });

    qs('documentPicker').addEventListener('change', function(event) {
      updateHeroMeta();
      if (event.target.value) {
        openDocument(event.target.value);
      }
    });

    ['worksheetInstructions', 'passingScore', 'attemptLimit', 'worksheetActive', 'worksheetPublished'].forEach(function(id) {
      qs(id).addEventListener(id.indexOf('Active') !== -1 || id.indexOf('Published') !== -1 ? 'change' : 'input', syncWorksheetFromForm);
    });

    ['fieldLabel', 'fieldType', 'fieldQuestion', 'fieldHelp', 'fieldPoints', 'fieldRequired', 'fieldX', 'fieldY', 'fieldWidth', 'fieldHeight', 'trueFalseAnswer', 'singleOptions', 'singleCorrect', 'multiOptions', 'multiCorrect', 'matchLeft', 'matchRight', 'matchPairs'].forEach(function(id) {
      var node = qs(id);
      if (!node) {
        return;
      }
      node.addEventListener(node.type === 'checkbox' || node.tagName === 'SELECT' ? 'change' : 'input', updateSelectedFieldFromForm);
    });

    qs('fieldList').addEventListener('click', function(event) {
      var node = event.target.closest('[data-field-item]');
      if (!node) {
        return;
      }
      setSelectedField(node.getAttribute('data-field-item'));
    });

    qs('deleteFieldBtn').addEventListener('click', function() {
      var selected = getSelectedField();
      if (!selected) {
        return;
      }
      state.fields = state.fields.filter(function(field) {
        return field.id !== selected.id;
      });
      state.selectedFieldId = state.fields[0] ? state.fields[0].id : '';
      renderFieldList();
      renderFieldBoxes();
      syncSelectedFieldForm();
    });

    qs('saveWorksheetBtn').addEventListener('click', saveWorksheet);
    qs('openPdfBtn').addEventListener('click', function() {
      if (!state.documentId) {
        toast('Once bir dokuman secmelisin.', 'error');
        return;
      }
      window.open(getViewerUrl(), '_blank');
    });
    qs('openStudentBtn').addEventListener('click', function() {
      if (!state.documentId) {
        toast('Once bir dokuman secmelisin.', 'error');
        return;
      }
      window.open(getStudentUrl(), '_blank');
    });
    qs('copyStudentLinkBtn').addEventListener('click', function() {
      if (!state.documentId) {
        toast('Once bir dokuman secmelisin.', 'error');
        return;
      }
      copyToClipboard(getStudentUrl()).then(function(success) {
        toast(success ? 'Ogrenci linki kopyalandi.' : 'Link kopyalanamadi.', success ? 'success' : 'error');
      });
    });

    document.addEventListener('pointermove', handleDocumentMove);
    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);

    window.addEventListener('resize', function() {
      if (!state.documentRow || !state.pdfDoc) {
        return;
      }
      window.clearTimeout(state.renderTimer);
      state.renderTimer = window.setTimeout(function() {
        renderPdfPages().catch(function(error) {
          toast(humanizeError(error), 'error');
        });
      }, 160);
    });
  }

  async function doLogin() {
    var email = qs('loginEmail').value.trim();
    var password = qs('loginPass').value;
    var errorEl = qs('loginErr');

    if (!email || !password) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ E-posta ve şifre zorunlu.';
      return;
    }

    try {
      await window.kemalAdminAuth.signIn(email, password);
      errorEl.style.display = 'none';
      qs('loginScreen').style.display = 'none';
      qs('app').style.display = 'block';
      await loadDocuments();
      var params = new URLSearchParams(window.location.search);
      var documentId = params.get('dokumanId') || '';
      if (documentId) {
        openDocument(documentId);
      } else {
        showWorkspace(false);
      }
    } catch (error) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ ' + humanizeError(error);
      qs('loginPass').value = '';
    }
  }

  async function doLogout() {
    try {
      await window.kemalAdminAuth.signOut();
    } finally {
      window.location.reload();
    }
  }

  window.doLogin = doLogin;
  window.doLogout = doLogout;

  document.addEventListener('DOMContentLoaded', function() {
    bindUi();
  });
})();
