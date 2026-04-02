(function() {
  'use strict';

  const OPTIONAL_METIN_COLUMNS = ['baslik_stil_json', 'plain_text'];
  const PAGE_SIZE = 10;
  const FONT_LABELS = {
    nunito: 'Nunito',
    georgia: 'Georgia',
    arial: 'Arial',
    'times-new-roman': 'Times New Roman',
    'courier-new': 'Courier New',
  };
  const FONT_STACKS = {
    nunito: 'Nunito, sans-serif',
    georgia: 'Georgia, serif',
    arial: 'Arial, sans-serif',
    'times-new-roman': '"Times New Roman", serif',
    'courier-new': '"Courier New", monospace',
  };
  const SIZE_VALUES = ['14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px'];

  const state = {
    editingId: null,
    currentMode: 'tam',
    questionCounter: 0,
    allTexts: [],
    activeFilter: 0,
    activePage: 1,
    quill: null,
  };

  let toastTimer = null;

  function getClient() {
    return window.kemalAdminAuth.getClient();
  }

  function escHtml(value) {
    return (value || '')
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
    }, 3000);
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

  function getReadingShareUrl(textId) {
    return window.location.origin + '/hizli-okuma/index.html?metinId=' + encodeURIComponent(textId);
  }

  function parseOptionalJson(value, fallback) {
    if (value && typeof value === 'object') {
      return value;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return fallback;
      }
    }
    return fallback;
  }

  function normalizeFontKey(value) {
    const raw = String(value || '').trim();
    const map = {
      Nunito: 'nunito',
      nunito: 'nunito',
      'Georgia,serif': 'georgia',
      Georgia: 'georgia',
      georgia: 'georgia',
      'Arial,sans-serif': 'arial',
      Arial: 'arial',
      arial: 'arial',
      '"Times New Roman", serif': 'times-new-roman',
      "'Times New Roman',serif": 'times-new-roman',
      'Times New Roman': 'times-new-roman',
      'times-new-roman': 'times-new-roman',
      'Courier New,monospace': 'courier-new',
      'Courier New': 'courier-new',
      'courier-new': 'courier-new',
    };
    return map[raw] || 'nunito';
  }

  function getSelectedGrades() {
    const grades = [];
    for (let i = 1; i <= 8; i += 1) {
      const checkbox = document.getElementById('sc_' + i);
      if (checkbox && checkbox.checked) {
        grades.push(i);
      }
    }
    return grades;
  }

  function getWordCount(text) {
    const clean = (text || '').trim();
    return clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  }

  function normalizeEditorHtml(html) {
    const clean = (html || '')
      .replace(/<p><br><\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .trim();
    return clean;
  }

  function getPlainText() {
    if (!state.quill) {
      return '';
    }
    return state.quill.getText().replace(/\u00a0/g, ' ').trim();
  }

  function updateWordCount() {
    const counter = document.getElementById('kwCount');
    if (!counter) {
      return;
    }
    counter.textContent = String(getWordCount(getPlainText()));
  }

  function getTitleStyle() {
    return {
      renk: document.getElementById('fBaslikRenk').value,
      boyut: parseInt(document.getElementById('fBaslikBoyut').value, 10) || 28,
      hiza: document.getElementById('fBaslikHiza').value,
    };
  }

  function applyTitleStylePreview() {
    const input = document.getElementById('fBaslik');
    const titleStyle = getTitleStyle();
    input.style.color = titleStyle.renk;
    input.style.fontSize = titleStyle.boyut + 'px';
    input.style.textAlign = titleStyle.hiza;
  }

  function applyEditorDefaultStyle() {
    if (!state.quill) {
      return;
    }
    const fontKey = normalizeFontKey(document.getElementById('fYaziTipi').value || 'nunito');
    const size = parseInt(document.getElementById('fYaziBoyutu').value, 10) || 18;
    const color = document.getElementById('fYaziRengi').value || '#1A1040';
    state.quill.root.style.fontFamily = FONT_STACKS[fontKey] || FONT_STACKS.nunito;
    state.quill.root.style.fontSize = size + 'px';
    state.quill.root.style.color = color;
    state.quill.root.dataset.defaultFont = fontKey;
  }

  function configureQuillFonts() {
    if (!window.Quill) {
      return;
    }

    const FontStyle = window.Quill.import('attributors/style/font');
    FontStyle.whitelist = Object.keys(FONT_STACKS);
    window.Quill.register(FontStyle, true);

    const SizeStyle = window.Quill.import('attributors/style/size');
    SizeStyle.whitelist = SIZE_VALUES;
    window.Quill.register(SizeStyle, true);
  }

  function initQuill() {
    if (!window.Quill) {
      throw new Error('Zengin metin editörü yüklenemedi.');
    }

    configureQuillFonts();

    state.quill = new window.Quill('#fIcerik', {
      modules: {
        toolbar: '#editorToolbar',
      },
      placeholder: 'Metni buraya yaz veya yapıştır. İstediğin bölümü seçip renklendirebilir, büyütebilir, kalınlaştırabilirsin.',
      theme: 'snow',
    });

    state.quill.on('text-change', updateWordCount);
    applyEditorDefaultStyle();
    updateWordCount();
  }

  function setCheckedGrades(grades, legacyGrade) {
    const safeGrades = Array.isArray(grades) && grades.length ? grades : legacyGrade ? [legacyGrade] : [];
    for (let i = 1; i <= 8; i += 1) {
      const checkbox = document.getElementById('sc_' + i);
      const wrapper = document.getElementById('sc' + i);
      const selected = safeGrades.includes(i);
      if (checkbox) {
        checkbox.checked = selected;
      }
      if (wrapper) {
        wrapper.classList.toggle('checked', selected);
      }
    }
  }

  function resetQuestionList() {
    state.questionCounter = 0;
    document.getElementById('soruList').innerHTML = '';
  }

  function fillForm(text) {
    state.editingId = text && text.id ? text.id : null;
    document.getElementById('editTitle').textContent = text ? 'Düzenle: ' + text.baslik : 'Yeni Metin';
    document.getElementById('editingIdLabel').textContent = state.editingId ? 'ID: ' + state.editingId.slice(0, 8) + '…' : '';
    document.getElementById('editingIdLabel2').textContent = state.editingId ? 'ID: ' + state.editingId.slice(0, 8) + '…' : '';

    document.getElementById('fBaslik').value = text && text.baslik ? text.baslik : '';
    document.getElementById('fAktif').value = text && typeof text.aktif === 'boolean' ? String(text.aktif) : 'true';

    const titleStyle = parseOptionalJson(text && text.baslik_stil_json, {
      renk: '#1A1040',
      boyut: 28,
      hiza: 'center',
    });
    document.getElementById('fBaslikRenk').value = titleStyle.renk || '#1A1040';
    document.getElementById('fBaslikBoyut').value = String(titleStyle.boyut || 28);
    document.getElementById('fBaslikHiza').value = titleStyle.hiza || 'center';
    applyTitleStylePreview();

    setCheckedGrades(text && text.siniflar, text && text.sinif);

    const html = normalizeEditorHtml(text && (text.icerik_html || text.icerik) ? (text.icerik_html || text.icerik) : '');
    state.quill.setContents([]);
    if (html) {
      state.quill.clipboard.dangerouslyPasteHTML(html);
    }

    document.getElementById('fYaziTipi').value = normalizeFontKey(text && text.yazi_tipi ? text.yazi_tipi : 'nunito');
    document.getElementById('fYaziBoyutu').value = String(text && text.yazi_boyutu ? text.yazi_boyutu : 18);
    document.getElementById('fYaziRengi').value = text && text.yazi_rengi ? text.yazi_rengi : '#1A1040';
    applyEditorDefaultStyle();
    updateWordCount();

    setMode(text && text.goruntuleme_modu ? text.goruntuleme_modu : 'tam');
    document.getElementById('fHedefHiz').value = String(text && text.hedef_hiz ? text.hedef_hiz : 80);
    document.getElementById('hedefHizVal').textContent = document.getElementById('fHedefHiz').value + ' k/dk';
    document.getElementById('fKelimeMs').value = String(text && text.kelime_ms ? text.kelime_ms : 500);
    updateWordIntervalText();
    document.getElementById(text && text.tikla_mod ? 'ilerTikla' : 'ilerOto').checked = true;
    updateProgressMode();

    resetQuestionList();
    (text && text.sorular ? text.sorular : []).forEach(function(question) {
      addQuestion(question);
    });
  }

  function showListPanel() {
    document.getElementById('panelEdit').style.display = 'none';
    document.getElementById('panelList').style.display = 'block';
    document.getElementById('kaydetBar').style.display = 'none';
  }

  function showEditPanel() {
    document.getElementById('panelList').style.display = 'none';
    document.getElementById('panelEdit').style.display = 'block';
    document.getElementById('kaydetBar').style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadTexts() {
    const grid = document.getElementById('metinCardGrid');
    grid.innerHTML = '<div class="loading-txt">⏳ Metinler yükleniyor…</div>';

    const { data, error } = await getClient()
      .from('metinler')
      .select('id,baslik,siniflar,sinif,goruntuleme_modu,aktif,kelime_sayisi,olusturma_tarihi')
      .order('olusturma_tarihi', { ascending: false });

    if (error) {
      grid.innerHTML = '<div class="bos-durum"><span>⚠️</span><p>Metinler yüklenemedi.</p></div>';
      toast('Metinler yüklenemedi: ' + error.message, 'error');
      return;
    }

    state.allTexts = data || [];
    applyFilterDirect(state.activeFilter);
  }

  function renderTextCards(list) {
    const grid = document.getElementById('metinCardGrid');
    const pagination = document.getElementById('pagination');

    if (!list.length) {
      grid.innerHTML = '<div class="bos-durum"><span>📭</span><p>Henüz metin eklenmemiş.</p></div>';
      pagination.innerHTML = '';
      return;
    }

    const pageCount = Math.ceil(list.length / PAGE_SIZE);
    if (state.activePage > pageCount) {
      state.activePage = 1;
    }
    const start = (state.activePage - 1) * PAGE_SIZE;
    const page = list.slice(start, start + PAGE_SIZE);

    grid.innerHTML = page.map(function(text) {
      const grades = Array.isArray(text.siniflar) && text.siniflar.length
        ? text.siniflar
        : text.sinif
          ? [text.sinif]
          : [];
      const gradeBadges = grades.length
        ? grades.map(function(grade) {
            return '<span class="mk-sinif-badge">' + grade + '. Sınıf</span>';
          }).join('')
        : '<span class="mk-sinif-badge">Sınıf yok</span>';
      const modeClass = text.goruntuleme_modu === 'kelime' ? 'kelime' : 'tam';
      const modeLabel = text.goruntuleme_modu === 'kelime' ? '⚡ Kelime Kelime' : '📄 Tam Metin';
      const activeClass = text.aktif ? 'ac' : 'kap';
      const activeLabel = text.aktif ? '✅ Yayında' : '⏸️ Taslak';
      const shareButton = text.aktif
        ? '<button class="mk-btn-share" onclick="metinLinkKopyala(\'' + text.id + '\')">🔗 Kopyala</button>'
        : '';
      return (
        '<div class="metin-kart">' +
          '<span class="mk-kw-chip">' + (text.kelime_sayisi || 0) + ' kelime</span>' +
          '<div class="mk-sinif-badges">' + gradeBadges + '</div>' +
          '<div class="mk-title">' + escHtml(text.baslik) + '</div>' +
          '<div class="mk-meta">' +
            '<span class="mk-mod ' + modeClass + '">' + modeLabel + '</span>' +
            '<span class="mk-aktif ' + activeClass + '">' + activeLabel + '</span>' +
          '</div>' +
          '<div class="mk-actions">' +
            '<button class="mk-btn-edit" onclick="metinYukle(\'' + text.id + '\')">✏️ Düzenle</button>' +
            shareButton +
            '<button class="mk-btn-del" onclick="metinSil(\'' + text.id + '\', \'' + escHtml(text.baslik) + '\')">🗑️</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    if (pageCount <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let html = '<button class="pg-btn" onclick="sayfaDegis(' + (state.activePage - 1) + ')" ' + (state.activePage === 1 ? 'disabled' : '') + '>←</button>';
    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      if (pageIndex === 1 || pageIndex === pageCount || Math.abs(pageIndex - state.activePage) <= 1) {
        html += '<button class="pg-btn ' + (pageIndex === state.activePage ? 'active' : '') + '" onclick="sayfaDegis(' + pageIndex + ')">' + pageIndex + '</button>';
      } else if (Math.abs(pageIndex - state.activePage) === 2) {
        html += '<span class="pg-info">…</span>';
      }
    }
    html += '<button class="pg-btn" onclick="sayfaDegis(' + (state.activePage + 1) + ')" ' + (state.activePage === pageCount ? 'disabled' : '') + '>→</button>';
    html += '<span class="pg-info">' + list.length + ' metin · Sayfa ' + state.activePage + '/' + pageCount + '</span>';
    pagination.innerHTML = html;
  }

  function applyFilterDirect(filter) {
    let filtered = state.allTexts.slice();
    if (filter > 0) {
      filtered = filtered.filter(function(text) {
        const grades = Array.isArray(text.siniflar) && text.siniflar.length
          ? text.siniflar
          : text.sinif
            ? [text.sinif]
            : [];
        return grades.includes(filter);
      });
    }
    renderTextCards(filtered);
  }

  function applyFilter(filter, button) {
    state.activeFilter = filter;
    state.activePage = 1;
    document.querySelectorAll('.f-sinif-btn').forEach(function(node) {
      node.classList.remove('active');
    });
    if (button) {
      button.classList.add('active');
    }
    applyFilterDirect(filter);
  }

  async function openEditor(text) {
    fillForm(text || null);
    showEditPanel();
  }

  async function loadTextById(id) {
    toast('Metin yükleniyor…');
    const client = getClient();
    const { data: text, error } = await client.from('metinler').select('*').eq('id', id).single();
    if (error || !text) {
      toast('Metin yüklenemedi.', 'error');
      return;
    }

    const { data: questions } = await client
      .from('sorular')
      .select('id,soru_metni,sira,secenekler(id,secenek_metni,dogru_mu,sira)')
      .eq('metin_id', id)
      .order('sira');

    text.sorular = (questions || []).map(function(question) {
      return Object.assign({}, question, {
        secenekler: (question.secenekler || []).sort(function(a, b) {
          return (a.sira || 0) - (b.sira || 0);
        }),
      });
    });

    openEditor(text);
  }

  async function deleteQuestionsForText(textId) {
    const client = getClient();
    const { data: existing } = await client.from('sorular').select('id').eq('metin_id', textId);
    const ids = (existing || []).map(function(row) { return row.id; });
    if (ids.length) {
      await client.from('secenekler').delete().in('soru_id', ids);
    }
    await client.from('sorular').delete().eq('metin_id', textId);
  }

  async function deleteText(id, title) {
    const confirmed = window.confirm(
      '"' + title + '"\nBu metni silersen bağlı sorular ve bu metne ait okuma sonuçları da kaldırılacak.'
    );
    if (!confirmed) {
      return;
    }

    const client = getClient();
    await client.from('sonuclar').delete().eq('metin_id', id);
    await deleteQuestionsForText(id);
    const { error } = await client.from('metinler').delete().eq('id', id);
    if (error) {
      toast('Metin silinemedi: ' + error.message, 'error');
      return;
    }

    state.allTexts = state.allTexts.filter(function(text) {
      return text.id !== id;
    });
    applyFilterDirect(state.activeFilter);
    toast('Metin silindi.', 'success');
  }

  async function copyReadingLink(id) {
    const success = await copyToClipboard(getReadingShareUrl(id));
    toast(success ? 'Metin bağlantısı kopyalandı.' : 'Bağlantı kopyalanamadı.', success ? 'success' : 'error');
  }

  function setMode(mode) {
    state.currentMode = mode;
    document.getElementById('modTamKart').classList.toggle('active', mode === 'tam');
    document.getElementById('modKwKart').classList.toggle('active', mode === 'kelime');
    document.getElementById('optTam').classList.toggle('show', mode === 'tam');
    document.getElementById('optKelime').classList.toggle('show', mode === 'kelime');
  }

  function updateProgressMode() {
    const automatic = document.getElementById('ilerOto').checked;
    document.getElementById('otoOptions').style.display = automatic ? 'block' : 'none';
  }

  function updateWordIntervalText() {
    const value = parseInt(document.getElementById('fKelimeMs').value, 10) || 500;
    document.getElementById('kelimeMsVal').textContent = value + 'ms';
    document.getElementById('kelimeMsAcik').textContent = 'Her kelime yaklaşık ' + (value / 1000).toFixed(2) + ' saniye ekranda kalır.';
  }

  function renumberQuestions() {
    document.querySelectorAll('#soruList .soru-item').forEach(function(item, index) {
      const badge = item.querySelector('.soru-no-badge');
      if (badge) {
        badge.textContent = String(index + 1);
      }
    });
  }

  function buildChoiceRows(choiceName, choices) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    return choices.map(function(choice, index) {
      return (
        '<div class="sik-row">' +
          '<span class="sik-harf">' + letters[index] + '</span>' +
          '<input type="text" placeholder="Şık ' + letters[index] + '…" value="' + escHtml(choice.secenek_metni || '') + '">' +
          '<input type="radio" name="' + choiceName + '" title="Doğru cevap" ' + (choice.dogru_mu ? 'checked' : '') + '>' +
          '<button class="sik-del" onclick="sikSil(this)" type="button">✕</button>' +
        '</div>'
      );
    }).join('');
  }

  function addQuestion(data) {
    state.questionCounter += 1;
    const questionId = 'soru_' + state.questionCounter;
    const questionList = document.getElementById('soruList');
    const wrapper = document.createElement('div');
    const initialChoices = data && Array.isArray(data.secenekler) && data.secenekler.length
      ? data.secenekler.slice(0, 5)
      : [
          { secenek_metni: '', dogru_mu: true },
          { secenek_metni: '', dogru_mu: false },
          { secenek_metni: '', dogru_mu: false },
        ];
    wrapper.className = 'soru-item';
    wrapper.id = questionId;
    wrapper.innerHTML =
      '<div class="soru-item-header">' +
        '<span class="soru-no-badge">' + (questionList.children.length + 1) + '</span>' +
        '<input type="text" placeholder="Soru metnini yaz…" value="' + escHtml(data && data.soru_metni ? data.soru_metni : '') + '" class="soru-input" style="flex:1;margin-bottom:0;">' +
      '</div>' +
      '<div class="sik-list">' + buildChoiceRows('dogru_' + questionId, initialChoices) + '</div>' +
      '<button class="btn-sik-ekle" onclick="sikEkle(\'' + questionId + '\')" type="button">+ Şık Ekle</button>' +
      '<button class="btn-soru-sil" onclick="soruSil(\'' + questionId + '\')" type="button">🗑️ Soruyu Sil</button>';

    questionList.appendChild(wrapper);
    renumberQuestions();
  }

  function addChoice(questionId) {
    const item = document.getElementById(questionId);
    const list = item.querySelector('.sik-list');
    if (list.children.length >= 5) {
      toast('Bir soru için en fazla 5 şık eklenebilir.', 'error');
      return;
    }
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const index = list.children.length;
    const row = document.createElement('div');
    row.className = 'sik-row';
    row.innerHTML =
      '<span class="sik-harf">' + letters[index] + '</span>' +
      '<input type="text" placeholder="Şık ' + letters[index] + '…">' +
      '<input type="radio" name="dogru_' + questionId + '" title="Doğru cevap">' +
      '<button class="sik-del" onclick="sikSil(this)" type="button">✕</button>';
    list.appendChild(row);
  }

  function deleteChoice(button) {
    const row = button.closest('.sik-row');
    const list = row.closest('.sik-list');
    if (list.children.length <= 3) {
      toast('Bir soruda en az 3 şık bulunmalı.', 'error');
      return;
    }
    row.remove();
    const letters = ['A', 'B', 'C', 'D', 'E'];
    list.querySelectorAll('.sik-harf').forEach(function(node, index) {
      node.textContent = letters[index] || String(index + 1);
    });
  }

  function deleteQuestion(questionId) {
    const item = document.getElementById(questionId);
    if (item) {
      item.remove();
      renumberQuestions();
    }
  }

  function collectQuestions() {
    const items = Array.from(document.querySelectorAll('#soruList .soru-item'));
    const questions = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const questionText = (item.querySelector('.soru-input').value || '').trim();
      const rows = Array.from(item.querySelectorAll('.sik-row'));
      const filledChoices = rows.map(function(row) {
        return {
          text: (row.querySelector('input[type="text"]').value || '').trim(),
          correct: row.querySelector('input[type="radio"]').checked,
        };
      }).filter(function(choice) {
        return choice.text;
      });

      const hasAnyChoiceText = filledChoices.length > 0;
      if (!questionText && !hasAnyChoiceText) {
        continue;
      }
      if (!questionText) {
        throw new Error((i + 1) + '. sorunun metni boş bırakılamaz.');
      }
      if (rows.some(function(row) { return !(row.querySelector('input[type="text"]').value || '').trim(); })) {
        throw new Error((i + 1) + '. soruda boş şık bırakılamaz.');
      }
      if (filledChoices.length < 3) {
        throw new Error((i + 1) + '. soru için en az 3 şık gerekli.');
      }
      if (filledChoices.length > 5) {
        throw new Error((i + 1) + '. soru için en fazla 5 şık kullanılabilir.');
      }
      const correctCount = filledChoices.filter(function(choice) { return choice.correct; }).length;
      if (correctCount !== 1) {
        throw new Error((i + 1) + '. soruda tam olarak 1 doğru cevap seçilmelidir.');
      }

      questions.push({
        soru_metni: questionText,
        sira: i + 1,
        secenekler: filledChoices.map(function(choice, index) {
          return {
            secenek_metni: choice.text,
            dogru_mu: choice.correct,
            sira: index + 1,
          };
        }),
      });
    }

    return questions;
  }

  function getMetinPayload(active) {
    const title = document.getElementById('fBaslik').value.trim();
    const plainText = getPlainText();
    const html = normalizeEditorHtml(state.quill.root.innerHTML);
    const grades = getSelectedGrades();

    if (!title) {
      throw new Error('Başlık zorunlu.');
    }
    if (!plainText) {
      throw new Error('Metin içeriği zorunlu.');
    }
    if (!grades.length) {
      throw new Error('En az bir sınıf seçmelisin.');
    }

    return {
      baslik: title,
      baslik_stil_json: getTitleStyle(),
      plain_text: plainText,
      icerik: plainText,
      icerik_html: html,
      sinif: grades[0],
      siniflar: grades,
      aktif: typeof active === 'boolean' ? active : document.getElementById('fAktif').value === 'true',
      goruntuleme_modu: state.currentMode,
      hedef_hiz: parseInt(document.getElementById('fHedefHiz').value, 10) || 80,
      kelime_ms: parseInt(document.getElementById('fKelimeMs').value, 10) || 500,
      tikla_mod: document.getElementById('ilerTikla').checked,
      yazi_tipi: normalizeFontKey(document.getElementById('fYaziTipi').value || 'nunito'),
      yazi_boyutu: parseInt(document.getElementById('fYaziBoyutu').value, 10) || 18,
      yazi_rengi: document.getElementById('fYaziRengi').value || '#1A1040',
      kelime_sayisi: getWordCount(plainText),
    };
  }

  async function saveMetinRecord(payload) {
    const client = getClient();

    if (state.editingId) {
      let response = await client.from('metinler').update(payload).eq('id', state.editingId).select().single();
      if (!response.error) {
        return response.data;
      }
      if (OPTIONAL_METIN_COLUMNS.some(function(column) { return response.error.message.includes(column); })) {
        const fallback = Object.assign({}, payload);
        OPTIONAL_METIN_COLUMNS.forEach(function(column) {
          delete fallback[column];
        });
        response = await client.from('metinler').update(fallback).eq('id', state.editingId).select().single();
        if (!response.error) {
          toast('Başlık stili için ek SQL güncellemesi gerekiyor; temel kayıt yapıldı.', 'error');
          return response.data;
        }
      }
      throw response.error;
    }

    let insertResponse = await client.from('metinler').insert(payload).select().single();
    if (!insertResponse.error) {
      return insertResponse.data;
    }
    if (OPTIONAL_METIN_COLUMNS.some(function(column) { return insertResponse.error.message.includes(column); })) {
      const fallbackInsert = Object.assign({}, payload);
      OPTIONAL_METIN_COLUMNS.forEach(function(column) {
        delete fallbackInsert[column];
      });
      insertResponse = await client.from('metinler').insert(fallbackInsert).select().single();
      if (!insertResponse.error) {
        toast('Başlık stili için ek SQL güncellemesi gerekiyor; temel kayıt yapıldı.', 'error');
        return insertResponse.data;
      }
    }
    throw insertResponse.error;
  }

  async function saveQuestions(textId, questions) {
    const client = getClient();
    await deleteQuestionsForText(textId);

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      const { data, error } = await client
        .from('sorular')
        .insert({
          metin_id: textId,
          soru_metni: question.soru_metni,
          sira: question.sira,
        })
        .select()
        .single();

      if (error || !data) {
        throw error || new Error('Soru kaydedilemedi.');
      }

      const choices = question.secenekler.map(function(choice) {
        return {
          soru_id: data.id,
          secenek_metni: choice.secenek_metni,
          dogru_mu: choice.dogru_mu,
          sira: choice.sira,
        };
      });

      const { error: choiceError } = await client.from('secenekler').insert(choices);
      if (choiceError) {
        throw choiceError;
      }
    }
  }

  async function save(active) {
    try {
      const payload = getMetinPayload(active);
      const questions = collectQuestions();
      const savedText = await saveMetinRecord(payload);
      state.editingId = savedText.id;
      document.getElementById('editingIdLabel').textContent = 'ID: ' + savedText.id.slice(0, 8) + '…';
      document.getElementById('editingIdLabel2').textContent = 'ID: ' + savedText.id.slice(0, 8) + '…';
      await saveQuestions(savedText.id, questions);
      document.getElementById('kaydetDurum').style.display = 'block';
      setTimeout(function() {
        document.getElementById('kaydetDurum').style.display = 'none';
      }, 2600);
      toast(questions.length ? 'Metin ve sorular kaydedildi.' : 'Metin kaydedildi.', 'success');
      await loadTexts();
    } catch (error) {
      toast(error.message || 'Kaydetme sırasında bir sorun oluştu.', 'error');
    }
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
      await loadTexts();
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
        await loadTexts();
        return;
      }
    } catch (error) {
      console.warn('Oturum okunamadi:', error);
    }

    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  function bindEvents() {
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

    document.getElementById('fBaslikRenk').addEventListener('input', applyTitleStylePreview);
    document.getElementById('fBaslikBoyut').addEventListener('change', applyTitleStylePreview);
    document.getElementById('fBaslikHiza').addEventListener('change', applyTitleStylePreview);

    document.getElementById('fYaziTipi').addEventListener('change', applyEditorDefaultStyle);
    document.getElementById('fYaziBoyutu').addEventListener('change', applyEditorDefaultStyle);
    document.getElementById('fYaziRengi').addEventListener('input', applyEditorDefaultStyle);
  }

  document.addEventListener('DOMContentLoaded', async function() {
    try {
      initQuill();
      bindEvents();
      await initAuth();
      fillForm(null);
    } catch (error) {
      toast(error.message || 'Editör başlatılamadı.', 'error');
    }
  });

  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.listeye = function() {
    showListPanel();
    loadTexts();
  };
  window.editAc = function(text) {
    openEditor(text || null);
  };
  window.filtreUygula = applyFilter;
  window.filtreUygulaDirect = applyFilterDirect;
  window.sayfaDegis = function(page) {
    state.activePage = page;
    applyFilterDirect(state.activeFilter);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };
  window.metinYukle = loadTextById;
  window.metinSil = deleteText;
  window.metinLinkKopyala = copyReadingLink;
  window.sinifToggle = function(grade) {
    const checkbox = document.getElementById('sc_' + grade);
    const wrapper = document.getElementById('sc' + grade);
    window.setTimeout(function() {
      if (wrapper && checkbox) {
        wrapper.classList.toggle('checked', checkbox.checked);
      }
    }, 0);
  };
  window.modSec = setMode;
  window.ilerModDegis = updateProgressMode;
  window.kelimeMsDegis = updateWordIntervalText;
  window.soruEkle = function(data) { addQuestion(data); };
  window.soruSil = deleteQuestion;
  window.sikEkle = addChoice;
  window.sikSil = deleteChoice;
  window.kaydet = save;
  window.baslikStiliUygula = applyTitleStylePreview;
})();
