(function() {
  'use strict';

  const BUCKET = 'e-kitaplar';
  const MAX_FILE_BYTES = 50 * 1024 * 1024;
  const IMAGE_LONG_EDGE = 2400;
  const IMAGE_QUALITY = 0.94;
  const state = {
    books: [],
    stats: {},
    editingId: null,
    existing: null,
    existingPages: [],
    sourceType: 'supabase_pdf',
    imageFiles: [],
    questions: [],
    saving: false,
    objectUrls: [],
  };

  let toastTimer = 0;

  function client() {
    return window.kemalAdminAuth.getClient();
  }

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

  function safeFileName(value) {
    const raw = String(value || 'dosya')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return raw || 'dosya';
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function toast(message, type) {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.className = 'toast ' + (type === 'error' ? 'error' : '') + ' show';
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function() {
      node.classList.remove('show');
    }, 4200);
  }

  function showUploadStatus(message) {
    const node = document.getElementById('uploadStatus');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('show', Boolean(message));
  }

  function releaseObjectUrls() {
    state.objectUrls.forEach(function(url) {
      try { URL.revokeObjectURL(url); } catch (error) {}
    });
    state.objectUrls = [];
  }

  function createObjectUrl(blob) {
    const url = URL.createObjectURL(blob);
    state.objectUrls.push(url);
    return url;
  }

  function populateGrades() {
    const filter = document.getElementById('filterGrade');
    const grid = document.getElementById('gradeGrid');
    if (filter) {
      filter.innerHTML = '<option value="">Tüm sınıflar</option>' +
        Array.from({ length: 8 }, function(_, index) {
          const grade = index + 1;
          return '<option value="' + grade + '">' + grade + '. Sınıf</option>';
        }).join('');
    }
    if (grid) {
      grid.innerHTML = Array.from({ length: 8 }, function(_, index) {
        const grade = index + 1;
        return '<label class="grade-check"><input type="checkbox" name="grade" value="' + grade + '"><span>' + grade + '</span></label>';
      }).join('');
    }
  }

  function getSelectedGrades() {
    return Array.from(document.querySelectorAll('input[name="grade"]:checked'))
      .map(function(input) { return Number(input.value); })
      .filter(Number.isFinite)
      .sort(function(a, b) { return a - b; });
  }

  function setSelectedGrades(grades) {
    const selected = (Array.isArray(grades) ? grades : []).map(Number);
    document.querySelectorAll('input[name="grade"]').forEach(function(input) {
      input.checked = selected.includes(Number(input.value));
    });
  }

  function getSourceLabel(type) {
    if (type === 'images') return 'Çoklu görsel';
    if (type === 'external_pdf') return 'Harici PDF';
    return 'Supabase PDF';
  }

  function setSourceType(type) {
    state.sourceType = ['supabase_pdf', 'images', 'external_pdf'].includes(type)
      ? type
      : 'supabase_pdf';
    document.querySelectorAll('[data-source]').forEach(function(button) {
      button.classList.toggle('active', button.dataset.source === state.sourceType);
    });
    document.querySelectorAll('[data-source-box]').forEach(function(box) {
      box.classList.toggle('active', box.dataset.sourceBox === state.sourceType);
    });
    updateSummary();
  }

  function defaultQuestion(type) {
    const questionType = type || 'coktan-secmeli';
    if (questionType === 'dogru-yanlis') {
      return {
        id: uuid(),
        soru_tipi: questionType,
        soru_metni: '',
        dogru_metin: '',
        aciklama: '',
        secenekler: [
          { id: uuid(), secenek_metni: 'Doğru', dogru_mu: true, sira: 1 },
          { id: uuid(), secenek_metni: 'Yanlış', dogru_mu: false, sira: 2 },
        ],
      };
    }
    if (questionType === 'bosluk-doldurma') {
      return {
        id: uuid(),
        soru_tipi: questionType,
        soru_metni: '',
        dogru_metin: '',
        aciklama: '',
        secenekler: [],
      };
    }
    return {
      id: uuid(),
      soru_tipi: 'coktan-secmeli',
      soru_metni: '',
      dogru_metin: '',
      aciklama: '',
      secenekler: [
        { id: uuid(), secenek_metni: '', dogru_mu: true, sira: 1 },
        { id: uuid(), secenek_metni: '', dogru_mu: false, sira: 2 },
        { id: uuid(), secenek_metni: '', dogru_mu: false, sira: 3 },
      ],
    };
  }

  function normalizeQuestion(row) {
    const type = row.soru_tipi || 'coktan-secmeli';
    const options = (row.e_kitap_secenekleri || row.secenekler || [])
      .slice()
      .sort(function(a, b) { return Number(a.sira || 0) - Number(b.sira || 0); })
      .map(function(option, index) {
        return {
          id: option.id || uuid(),
          secenek_metni: option.secenek_metni || '',
          dogru_mu: Boolean(option.dogru_mu),
          sira: index + 1,
        };
      });
    const question = {
      id: row.id || uuid(),
      soru_tipi: type,
      soru_metni: row.soru_metni || '',
      dogru_metin: row.dogru_metin || '',
      aciklama: row.aciklama || '',
      secenekler: options,
    };
    if (type === 'dogru-yanlis' && options.length !== 2) {
      return defaultQuestion(type);
    }
    return question;
  }

  function renderQuestions() {
    const list = document.getElementById('questionList');
    if (!list) return;
    if (!state.questions.length) {
      list.innerHTML = '<div class="empty" style="padding:28px 18px">Henüz soru eklenmedi. Kitap soru olmadan da yayınlanabilir.</div>';
      updateSummary();
      return;
    }
    list.innerHTML = state.questions.map(function(question, questionIndex) {
      const isFill = question.soru_tipi === 'bosluk-doldurma';
      const options = isFill ? (
        '<div class="question-options">' +
          '<label>Doğru cevap</label>' +
          '<input type="text" data-question-index="' + questionIndex + '" data-question-field="dogru_metin" value="' + esc(question.dogru_metin) + '" placeholder="Beklenen doğru cevap">' +
        '</div>'
      ) : (
        '<div class="question-options">' +
          question.secenekler.map(function(option, optionIndex) {
            return '<div class="option-row">' +
              '<input type="radio" name="correct-' + question.id + '" data-question-index="' + questionIndex + '" data-option-index="' + optionIndex + '" data-option-correct ' + (option.dogru_mu ? 'checked' : '') + ' aria-label="Doğru cevap">' +
              '<input type="text" data-question-index="' + questionIndex + '" data-option-index="' + optionIndex + '" data-option-field="secenek_metni" value="' + esc(option.secenek_metni) + '" placeholder="Seçenek">' +
              (question.soru_tipi === 'coktan-secmeli'
                ? '<button class="icon-btn" type="button" data-remove-option data-question-index="' + questionIndex + '" data-option-index="' + optionIndex + '" title="Seçeneği sil">×</button>'
                : '<span></span>') +
            '</div>';
          }).join('') +
          (question.soru_tipi === 'coktan-secmeli'
            ? '<button class="btn btn-secondary" type="button" data-add-option data-question-index="' + questionIndex + '" style="justify-self:start;min-height:34px;font-size:12px">+ Seçenek</button>'
            : '') +
        '</div>'
      );
      return '<article class="question-card">' +
        '<div class="question-top">' +
          '<div class="question-number">' + (questionIndex + 1) + '</div>' +
          '<textarea data-question-index="' + questionIndex + '" data-question-field="soru_metni" placeholder="Soru metni">' + esc(question.soru_metni) + '</textarea>' +
          '<select data-question-index="' + questionIndex + '" data-question-field="soru_tipi">' +
            '<option value="coktan-secmeli" ' + (question.soru_tipi === 'coktan-secmeli' ? 'selected' : '') + '>Test</option>' +
            '<option value="dogru-yanlis" ' + (question.soru_tipi === 'dogru-yanlis' ? 'selected' : '') + '>Doğru / Yanlış</option>' +
            '<option value="bosluk-doldurma" ' + (question.soru_tipi === 'bosluk-doldurma' ? 'selected' : '') + '>Boşluk Doldurma</option>' +
          '</select>' +
          '<button class="btn btn-danger" type="button" data-remove-question data-question-index="' + questionIndex + '" style="min-height:38px;padding:8px 10px">Sil</button>' +
        '</div>' +
        options +
        '<div class="question-options"><label>Doğru cevap açıklaması (isteğe bağlı)</label>' +
          '<input type="text" data-question-index="' + questionIndex + '" data-question-field="aciklama" value="' + esc(question.aciklama) + '" placeholder="Karne veya cevap incelemesinde gösterilecek kısa açıklama">' +
        '</div>' +
      '</article>';
    }).join('');
    updateSummary();
  }

  function handleQuestionInput(event) {
    const element = event.target;
    const questionIndex = Number(element.dataset.questionIndex);
    if (!Number.isInteger(questionIndex) || !state.questions[questionIndex]) return;
    const question = state.questions[questionIndex];

    if (element.dataset.questionField) {
      const field = element.dataset.questionField;
      if (field === 'soru_tipi' && event.type === 'change') {
        const replacement = defaultQuestion(element.value);
        replacement.id = question.id || uuid();
        replacement.soru_metni = question.soru_metni;
        replacement.aciklama = question.aciklama;
        state.questions[questionIndex] = replacement;
        renderQuestions();
        return;
      }
      question[field] = element.value;
    }

    const optionIndex = Number(element.dataset.optionIndex);
    if (Number.isInteger(optionIndex) && question.secenekler[optionIndex]) {
      if (element.hasAttribute('data-option-field')) {
        question.secenekler[optionIndex][element.dataset.optionField] = element.value;
      }
      if (element.hasAttribute('data-option-correct')) {
        question.secenekler.forEach(function(option, index) {
          option.dogru_mu = index === optionIndex;
        });
      }
    }
    updateSummary();
  }

  function handleQuestionClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const questionIndex = Number(button.dataset.questionIndex);
    if (button.hasAttribute('data-remove-question') && state.questions[questionIndex]) {
      state.questions.splice(questionIndex, 1);
      renderQuestions();
      return;
    }
    if (button.hasAttribute('data-add-option') && state.questions[questionIndex]) {
      const options = state.questions[questionIndex].secenekler;
      if (options.length >= 5) {
        toast('Bir soruda en fazla 5 seçenek olabilir.', 'error');
        return;
      }
      options.push({
        id: uuid(),
        secenek_metni: '',
        dogru_mu: options.length === 0,
        sira: options.length + 1,
      });
      renderQuestions();
      return;
    }
    if (button.hasAttribute('data-remove-option') && state.questions[questionIndex]) {
      const optionIndex = Number(button.dataset.optionIndex);
      const options = state.questions[questionIndex].secenekler;
      if (options.length <= 2) {
        toast('Test sorusunda en az 2 seçenek olmalı.', 'error');
        return;
      }
      const removedWasCorrect = Boolean(options[optionIndex] && options[optionIndex].dogru_mu);
      options.splice(optionIndex, 1);
      if (removedWasCorrect && options[0]) options[0].dogru_mu = true;
      renderQuestions();
    }
  }

  function validateQuestions() {
    return state.questions.map(function(question, index) {
      const text = clean(question.soru_metni);
      if (!text) throw new Error((index + 1) + '. sorunun metni boş.');
      if (question.soru_tipi === 'bosluk-doldurma') {
        if (!clean(question.dogru_metin)) {
          throw new Error((index + 1) + '. sorunun doğru cevabı boş.');
        }
        return {
          soru_metni: text,
          soru_tipi: question.soru_tipi,
          dogru_metin: clean(question.dogru_metin),
          aciklama: clean(question.aciklama),
          sira: index + 1,
          secenekler: [],
        };
      }
      const options = question.secenekler.map(function(option, optionIndex) {
        const optionText = clean(option.secenek_metni);
        if (!optionText) {
          throw new Error((index + 1) + '. sorunun ' + (optionIndex + 1) + '. seçeneği boş.');
        }
        return {
          secenek_metni: optionText,
          dogru_mu: Boolean(option.dogru_mu),
          sira: optionIndex + 1,
        };
      });
      if (options.length < 2 || options.filter(function(option) { return option.dogru_mu; }).length !== 1) {
        throw new Error((index + 1) + '. soruda tam bir doğru seçenek bulunmalı.');
      }
      return {
        soru_metni: text,
        soru_tipi: question.soru_tipi,
        dogru_metin: null,
        aciklama: clean(question.aciklama),
        sira: index + 1,
        secenekler: options,
      };
    });
  }

  function renderImageOrder() {
    const list = document.getElementById('imageOrder');
    if (!list) return;
    list.innerHTML = state.imageFiles.map(function(item, index) {
      return '<div class="image-row">' +
        '<img src="' + esc(item.previewUrl) + '" alt="Sayfa ' + (index + 1) + '">' +
        '<strong>' + (index + 1) + '. ' + esc(item.file.name) + '</strong>' +
        '<div class="mini-actions">' +
          '<button class="icon-btn" type="button" data-image-up="' + index + '" title="Yukarı">↑</button>' +
          '<button class="icon-btn" type="button" data-image-down="' + index + '" title="Aşağı">↓</button>' +
          '<button class="icon-btn" type="button" data-image-remove="' + index + '" title="Sil">×</button>' +
        '</div>' +
      '</div>';
    }).join('');
    updateSummary();
  }

  function handleImagesSelected(files) {
    state.imageFiles.forEach(function(item) {
      try { URL.revokeObjectURL(item.previewUrl); } catch (error) {}
    });
    state.imageFiles = Array.from(files || []).slice(0, 80).map(function(file) {
      return { file: file, previewUrl: URL.createObjectURL(file) };
    });
    renderImageOrder();
  }

  function handleImageOrderClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const up = button.dataset.imageUp;
    const down = button.dataset.imageDown;
    const remove = button.dataset.imageRemove;
    if (up !== undefined) {
      const index = Number(up);
      if (index > 0) {
        const item = state.imageFiles.splice(index, 1)[0];
        state.imageFiles.splice(index - 1, 0, item);
      }
    } else if (down !== undefined) {
      const index = Number(down);
      if (index < state.imageFiles.length - 1) {
        const item = state.imageFiles.splice(index, 1)[0];
        state.imageFiles.splice(index + 1, 0, item);
      }
    } else if (remove !== undefined) {
      const item = state.imageFiles.splice(Number(remove), 1)[0];
      if (item) URL.revokeObjectURL(item.previewUrl);
    }
    renderImageOrder();
  }

  function updateSummary() {
    const node = document.getElementById('editorSummary');
    if (!node) return;
    const grades = getSelectedGrades();
    const sourceCount = state.sourceType === 'images'
      ? (state.imageFiles.length || state.existingPages.length)
      : Number(document.getElementById('fExternalPages')?.value || state.existing?.sayfa_sayisi || 0);
    node.innerHTML =
      '<span>Kaynak: <strong>' + esc(getSourceLabel(state.sourceType)) + '</strong></span>' +
      '<span>Sınıf: <strong>' + (grades.length ? grades.join(', ') : 'Seçilmedi') + '</strong></span>' +
      '<span>Kelime: <strong>' + esc(document.getElementById('fWordCount')?.value || '0') + '</strong></span>' +
      '<span>Hedef: <strong>' + esc(document.getElementById('fTargetWpm')?.value || '0') + ' kelime/dk</strong></span>' +
      '<span>Sayfa: <strong>' + sourceCount + '</strong></span>' +
      '<span>Soru: <strong>' + state.questions.length + '</strong></span>';
  }

  function resetForm() {
    state.editingId = null;
    state.existing = null;
    state.existingPages = [];
    state.questions = [];
    state.imageFiles.forEach(function(item) {
      try { URL.revokeObjectURL(item.previewUrl); } catch (error) {}
    });
    state.imageFiles = [];
    document.getElementById('editorTitle').textContent = 'Yeni E-Kitap';
    document.getElementById('fTitle').value = '';
    document.getElementById('fAuthor').value = '';
    document.getElementById('fDescription').value = '';
    document.getElementById('fColor').value = '#0F9F8F';
    document.getElementById('fPdf').value = '';
    document.getElementById('fImages').value = '';
    document.getElementById('fExternalUrl').value = '';
    document.getElementById('fExternalPages').value = '10';
    document.getElementById('fWordCount').value = '200';
    document.getElementById('fTargetWpm').value = '45';
    document.getElementById('fEstimatedMinutes').value = '5';
    document.getElementById('fOrder').value = '0';
    document.getElementById('fActive').checked = true;
    document.getElementById('fHidden').checked = false;
    document.getElementById('fLoginRequired').checked = false;
    setSelectedGrades([1]);
    setSourceType('supabase_pdf');
    renderImageOrder();
    renderQuestions();
    showUploadStatus('');
  }

  function showList() {
    document.getElementById('panelList').style.display = 'block';
    document.getElementById('panelEdit').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showEditor() {
    document.getElementById('panelList').style.display = 'none';
    document.getElementById('panelEdit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function downloadCover(path, target) {
    if (!path || !target) return;
    try {
      const response = await client().storage.from(BUCKET).download(path);
      if (response.error) throw response.error;
      const image = document.createElement('img');
      image.src = createObjectUrl(response.data);
      image.alt = '';
      target.innerHTML = '';
      target.appendChild(image);
    } catch (error) {
      target.textContent = '▤';
    }
  }

  function filteredBooks() {
    const grade = Number(document.getElementById('filterGrade').value || 0);
    const status = document.getElementById('filterStatus').value;
    const search = clean(document.getElementById('filterSearch').value).toLocaleLowerCase('tr-TR');
    return state.books.filter(function(book) {
      const grades = Array.isArray(book.siniflar) && book.siniflar.length ? book.siniflar.map(Number) : [Number(book.sinif)];
      if (grade && !grades.includes(grade)) return false;
      if (status === 'active' && !book.aktif) return false;
      if (status === 'draft' && book.aktif) return false;
      if (search && !(book.baslik + ' ' + (book.yazar || '')).toLocaleLowerCase('tr-TR').includes(search)) return false;
      return true;
    });
  }

  function renderBooks() {
    releaseObjectUrls();
    const grid = document.getElementById('bookGrid');
    const rows = filteredBooks();
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Bu filtreye uygun e-kitap bulunamadı.</div>';
      return;
    }
    grid.innerHTML = rows.map(function(book) {
      const grades = Array.isArray(book.siniflar) && book.siniflar.length ? book.siniflar : [book.sinif];
      const stats = state.stats[book.id];
      const statsHtml = stats && stats.readerCount
        ? '<div class="book-stats">' +
            '<div class="book-stat"><strong>' + stats.readerCount + '</strong><span>Okuyucu</span></div>' +
            '<div class="book-stat"><strong>' + stats.averageWpm + '</strong><span>Kelime / dk</span></div>' +
            '<div class="book-stat"><strong>%' + stats.averageComprehension + '</strong><span>Anlama</span></div>' +
          '</div>' +
          '<div class="book-grade-stats">' +
            Object.keys(stats.byGrade || {}).sort(function(a, b) { return Number(a) - Number(b); }).map(function(grade) {
              const row = stats.byGrade[grade];
              return '<div class="book-grade-stat">' + grade + '. sınıf: ' + row.readerCount + ' okuyucu · ' +
                row.averageWpm + ' kelime/dk · %' + row.averageComprehension + ' anlama</div>';
            }).join('') +
          '</div>'
        : '<div class="book-stats empty-stats">Henüz tamamlanmış okuma yok.</div>';
      return '<article class="book-card">' +
        '<div class="book-cover" data-cover="' + esc(book.kapak_yolu || '') + '" style="--cover:' + esc(book.kapak_renk || '#0F9F8F') + '">▤</div>' +
        '<div class="book-main">' +
          '<div class="book-title" title="' + esc(book.baslik) + '">' + esc(book.baslik) + '</div>' +
          '<div class="book-author">' + esc(book.yazar || 'Yazar belirtilmedi') + '</div>' +
          '<div class="badges">' +
            grades.map(function(grade) { return '<span class="badge">' + grade + '. Sınıf</span>'; }).join('') +
            '<span class="badge ' + (book.aktif ? '' : 'off') + '">' + (book.aktif ? 'Yayında' : 'Taslak') + '</span>' +
          '</div>' +
          '<div class="book-meta"><span>' + Number(book.sayfa_sayisi || 0) + ' sayfa</span><span>' + Number(book.kelime_sayisi || 0) + ' kelime</span><span>Hedef ' + Number(book.hedef_hiz || 0) + '</span><span>' + esc(getSourceLabel(book.kaynak_turu)) + '</span></div>' +
          statsHtml +
        '</div>' +
        '<div class="card-actions">' +
          '<a class="btn btn-secondary" href="/hizli-okuma/e-kitap-oku.html?id=' + encodeURIComponent(book.id) + '" target="_blank" rel="noopener">Önizle</a>' +
          '<button class="btn btn-primary" type="button" data-edit-book="' + esc(book.id) + '">Düzenle</button>' +
          '<button class="btn btn-danger" type="button" data-delete-book="' + esc(book.id) + '">Sil</button>' +
        '</div>' +
      '</article>';
    }).join('');
    grid.querySelectorAll('[data-cover]').forEach(function(node) {
      if (node.dataset.cover) downloadCover(node.dataset.cover, node);
    });
  }

  async function loadBooks() {
    const grid = document.getElementById('bookGrid');
    grid.innerHTML = '<div class="empty">E-kitaplar yükleniyor...</div>';
    const responses = await Promise.all([
      client()
        .from('e_kitaplar')
        .select('*')
        .order('siralama', { ascending: true })
        .order('olusturma_tarihi', { ascending: false }),
      client()
        .rpc('get_e_kitap_admin_stats'),
    ]);
    const response = responses[0];
    if (response.error) {
      grid.innerHTML = '<div class="empty">E-kitap tabloları hazır değil. Önce <strong>supabase-e-kitaplar-2026-07-25.sql</strong> dosyasını çalıştır.</div>';
      toast(response.error.message || 'E-kitaplar yüklenemedi.', 'error');
      return;
    }
    state.books = response.data || [];
    state.stats = {};
    if (!responses[1].error) {
      const groups = {};
      (responses[1].data || []).forEach(function(row) {
        if (!row.e_kitap_id) return;
        if (!groups[row.e_kitap_id]) {
          groups[row.e_kitap_id] = {
            readerCount: 0,
            totalWpm: 0,
            totalComprehension: 0,
            byGrade: {},
          };
        }
        const group = groups[row.e_kitap_id];
        const grade = String(Number(row.sinif || 0));
        const readerCount = Number(row.reader_count || 0);
        group.readerCount += readerCount;
        group.totalWpm += Number(row.average_wpm || 0) * readerCount;
        group.totalComprehension += Number(row.average_comprehension || 0) * readerCount;
        group.byGrade[grade] = {
          readerCount: readerCount,
          averageWpm: Number(row.average_wpm || 0),
          averageComprehension: Number(row.average_comprehension || 0),
        };
      });
      Object.keys(groups).forEach(function(bookId) {
        const group = groups[bookId];
        state.stats[bookId] = {
          readerCount: group.readerCount,
          averageWpm: Math.round(group.totalWpm / group.readerCount),
          averageComprehension: Math.round(group.totalComprehension / group.readerCount),
          byGrade: group.byGrade,
        };
      });
    }
    renderBooks();
  }

  async function editBook(id) {
    const book = state.books.find(function(item) { return item.id === id; });
    if (!book) return;
    const responses = await Promise.all([
      client().from('e_kitap_sayfalari').select('*').eq('e_kitap_id', id).order('sayfa_no'),
      client().from('e_kitap_sorulari').select('*,e_kitap_secenekleri(*)').eq('e_kitap_id', id).order('sira'),
    ]);
    if (responses[0].error || responses[1].error) {
      toast((responses[0].error || responses[1].error).message, 'error');
      return;
    }

    resetForm();
    state.editingId = id;
    state.existing = Object.assign({}, book);
    state.existingPages = responses[0].data || [];
    state.questions = (responses[1].data || []).map(normalizeQuestion);
    document.getElementById('editorTitle').textContent = 'E-Kitabı Düzenle';
    document.getElementById('fTitle').value = book.baslik || '';
    document.getElementById('fAuthor').value = book.yazar || '';
    document.getElementById('fDescription').value = book.aciklama || '';
    document.getElementById('fColor').value = book.kapak_renk || '#0F9F8F';
    document.getElementById('fExternalUrl').value = book.harici_url || '';
    document.getElementById('fExternalPages').value = book.sayfa_sayisi || 1;
    document.getElementById('fWordCount').value = book.kelime_sayisi || 1;
    document.getElementById('fTargetWpm').value = book.hedef_hiz || 45;
    document.getElementById('fEstimatedMinutes').value = book.tahmini_dk || 5;
    document.getElementById('fOrder').value = book.siralama || 0;
    document.getElementById('fActive').checked = Boolean(book.aktif);
    document.getElementById('fHidden').checked = Boolean(book.gizli);
    document.getElementById('fLoginRequired').checked = Boolean(book.oturum_gerekli);
    setSelectedGrades(Array.isArray(book.siniflar) && book.siniflar.length ? book.siniflar : [book.sinif]);
    setSourceType(book.kaynak_turu || 'supabase_pdf');
    renderQuestions();
    showEditor();
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        if (blob) resolve(blob);
        else reject(new Error('Görsel çıktısı oluşturulamadı.'));
      }, type, quality);
    });
  }

  function loadImageFile(file) {
    return new Promise(function(resolve, reject) {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = function() {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error(file.name + ' görseli okunamadı.'));
      };
      image.src = url;
    });
  }

  async function optimizeImage(file, outputName) {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type || '')) {
      throw new Error(file.name + ' desteklenen bir görsel değil.');
    }
    const image = await loadImageFile(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, IMAGE_LONG_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, 'image/webp', IMAGE_QUALITY);
    canvas.width = 1;
    canvas.height = 1;
    const useOriginal = file.type === 'image/webp' && scale === 1 && blob.size >= file.size * 0.98;
    return {
      file: useOriginal
        ? file
        : new File([blob], outputName || safeFileName(file.name.replace(/\.[^.]+$/, '')) + '.webp', { type: 'image/webp' }),
      width: width,
      height: height,
      optimized: !useOriginal,
    };
  }

  async function extractPdf(file) {
    if (!window.pdfjsLib) throw new Error('PDF okuyucu yüklenemedi.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const bytes = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(1, 1100 / Math.max(base.width, base.height)));
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const coverBlob = await canvasToBlob(canvas, 'image/webp', 0.9);
    canvas.width = 1;
    canvas.height = 1;
    return { pageCount: pdf.numPages, coverBlob: coverBlob };
  }

  async function uploadFile(path, file, contentType) {
    const response = await client().storage.from(BUCKET).upload(path, file, {
      cacheControl: '31536000',
      contentType: contentType || file.type || undefined,
      upsert: false,
    });
    if (response.error) throw response.error;
    return response.data.path;
  }

  function getOldPaths() {
    const paths = [];
    if (state.existing) {
      if (state.existing.dosya_yolu) paths.push(state.existing.dosya_yolu);
      if (state.existing.kapak_yolu) paths.push(state.existing.kapak_yolu);
    }
    state.existingPages.forEach(function(page) {
      if (page.dosya_yolu) paths.push(page.dosya_yolu);
    });
    return Array.from(new Set(paths));
  }

  async function cleanupPaths(paths) {
    const filtered = Array.from(new Set((paths || []).filter(Boolean)));
    if (!filtered.length) return;
    const response = await client().storage.from(BUCKET).remove(filtered);
    if (response.error) console.warn('Eski e-kitap dosyaları temizlenemedi:', response.error);
  }

  function getSourceValidation() {
    const pdf = document.getElementById('fPdf').files[0];
    const externalUrl = clean(document.getElementById('fExternalUrl').value);
    if (state.sourceType === 'supabase_pdf') {
      if (!pdf && !(state.existing && state.existing.kaynak_turu === 'supabase_pdf' && state.existing.dosya_yolu)) {
        throw new Error('Bir PDF dosyası seçmelisin.');
      }
      if (pdf && pdf.size > MAX_FILE_BYTES) throw new Error('PDF 50 MB sınırını aşıyor.');
    }
    if (state.sourceType === 'images') {
      if (!state.imageFiles.length && !(state.existing && state.existing.kaynak_turu === 'images' && state.existingPages.length)) {
        throw new Error('En az bir sayfa görseli seçmelisin.');
      }
    }
    if (state.sourceType === 'external_pdf') {
      if (!externalUrl) throw new Error('Harici PDF bağlantısını girmelisin.');
      try { new URL(externalUrl); } catch (error) { throw new Error('Harici PDF bağlantısı geçerli değil.'); }
    }
  }

  async function saveBook() {
    if (state.saving) return;
    const title = clean(document.getElementById('fTitle').value);
    const grades = getSelectedGrades();
    const wordCount = Number(document.getElementById('fWordCount').value);
    const targetWpm = Number(document.getElementById('fTargetWpm').value);
    if (!title) {
      toast('Kitap adını girmelisin.', 'error');
      return;
    }
    if (!grades.length) {
      toast('En az bir sınıf düzeyi seçmelisin.', 'error');
      return;
    }
    if (!Number.isFinite(wordCount) || wordCount < 1) {
      toast('Toplam kelime sayısını girmelisin.', 'error');
      return;
    }
    if (!Number.isFinite(targetWpm) || targetWpm < 10) {
      toast('Hedef okuma hızını girmelisin.', 'error');
      return;
    }

    let questions;
    try {
      getSourceValidation();
      questions = validateQuestions();
    } catch (error) {
      toast(error.message, 'error');
      return;
    }

    state.saving = true;
    const saveButton = document.getElementById('saveButton');
    saveButton.disabled = true;
    saveButton.textContent = 'Hazırlanıyor...';
    const bookId = state.editingId || uuid();
    const stamp = Date.now();
    const oldPaths = getOldPaths();
    const newPaths = [];
    const uploadedDuringAttempt = [];
    let pages = state.existingPages.map(function(page) {
      return {
        sayfa_no: page.sayfa_no,
        dosya_yolu: page.dosya_yolu,
        dosya_adi: page.dosya_adi,
        dosya_boyutu: page.dosya_boyutu,
        genislik: page.genislik,
        yukseklik: page.yukseklik,
      };
    });
    let sourcePath = state.existing ? state.existing.dosya_yolu : null;
    let coverPath = state.existing ? state.existing.kapak_yolu : null;
    let fileName = state.existing ? state.existing.dosya_adi : '';
    let fileSize = state.existing ? Number(state.existing.dosya_boyutu || 0) : 0;
    let pageCount = state.existing ? Number(state.existing.sayfa_sayisi || 0) : 0;
    let mimeType = state.existing ? state.existing.mime_type : 'application/pdf';

    try {
      if (state.sourceType === 'supabase_pdf') {
        const file = document.getElementById('fPdf').files[0];
        pages = [];
        if (file) {
          showUploadStatus('PDF inceleniyor ve kapak hazırlanıyor...');
          const pdfMeta = await extractPdf(file);
          const sourceName = safeFileName(file.name);
          sourcePath = bookId + '/source/' + stamp + '-' + sourceName;
          showUploadStatus('PDF yükleniyor: ' + formatBytes(file.size));
          await uploadFile(sourcePath, file, 'application/pdf');
          uploadedDuringAttempt.push(sourcePath);
          coverPath = bookId + '/cover/' + stamp + '.webp';
          await uploadFile(coverPath, new File([pdfMeta.coverBlob], 'cover.webp', { type: 'image/webp' }), 'image/webp');
          uploadedDuringAttempt.push(coverPath);
          fileName = file.name;
          fileSize = file.size;
          pageCount = pdfMeta.pageCount;
          mimeType = 'application/pdf';
        }
        if (sourcePath) newPaths.push(sourcePath);
        if (coverPath) newPaths.push(coverPath);
      } else if (state.sourceType === 'images') {
        sourcePath = null;
        mimeType = 'image/webp';
        if (state.imageFiles.length) {
          pages = [];
          fileSize = 0;
          for (let index = 0; index < state.imageFiles.length; index += 1) {
            const item = state.imageFiles[index];
            showUploadStatus((index + 1) + ' / ' + state.imageFiles.length + ' sayfa optimize ediliyor...');
            const optimized = await optimizeImage(item.file, String(index + 1).padStart(3, '0') + '.webp');
            const extension = optimized.file.type === 'image/webp'
              ? 'webp'
              : (safeFileName(optimized.file.name).split('.').pop() || 'webp');
            const path = bookId + '/pages/' + stamp + '-' + String(index + 1).padStart(3, '0') + '.' + extension;
            showUploadStatus((index + 1) + ' / ' + state.imageFiles.length + ' sayfa yükleniyor...');
            await uploadFile(path, optimized.file, optimized.file.type);
            uploadedDuringAttempt.push(path);
            newPaths.push(path);
            fileSize += optimized.file.size;
            pages.push({
              sayfa_no: index + 1,
              dosya_yolu: path,
              dosya_adi: item.file.name,
              dosya_boyutu: optimized.file.size,
              genislik: optimized.width,
              yukseklik: optimized.height,
            });
          }
          coverPath = pages[0] ? pages[0].dosya_yolu : null;
          fileName = state.imageFiles.length + ' görsel sayfa';
          pageCount = pages.length;
        } else {
          pages.forEach(function(page) { if (page.dosya_yolu) newPaths.push(page.dosya_yolu); });
        }
        if (coverPath) newPaths.push(coverPath);
      } else {
        sourcePath = null;
        coverPath = null;
        pages = [];
        fileName = clean(document.getElementById('fExternalUrl').value).split('/').pop() || 'harici-kitap.pdf';
        fileSize = 0;
        pageCount = Math.max(1, Number(document.getElementById('fExternalPages').value || 1));
        mimeType = 'application/pdf';
      }

      const bookPayload = {
        id: bookId,
        baslik: title,
        yazar: clean(document.getElementById('fAuthor').value),
        aciklama: clean(document.getElementById('fDescription').value),
        sinif: grades[0],
        siniflar: grades,
        kelime_sayisi: Math.round(wordCount),
        hedef_hiz: Math.round(targetWpm),
        tahmini_dk: Math.max(1, Number(document.getElementById('fEstimatedMinutes').value || 5)),
        kaynak_turu: state.sourceType,
        dosya_yolu: sourcePath,
        harici_url: state.sourceType === 'external_pdf' ? clean(document.getElementById('fExternalUrl').value) : null,
        dosya_adi: fileName,
        dosya_boyutu: fileSize,
        mime_type: mimeType,
        sayfa_sayisi: pageCount,
        kapak_yolu: coverPath,
        kapak_renk: document.getElementById('fColor').value || '#0F9F8F',
        kaynak_meta: {
          image_quality: state.sourceType === 'images' ? IMAGE_QUALITY : null,
          image_long_edge: state.sourceType === 'images' ? IMAGE_LONG_EDGE : null,
        },
        aktif: document.getElementById('fActive').checked,
        gizli: document.getElementById('fHidden').checked,
        oturum_gerekli: document.getElementById('fLoginRequired').checked,
        siralama: Number(document.getElementById('fOrder').value || 0),
      };

      showUploadStatus('Kitap ve sorular güvenli olarak kaydediliyor...');
      const response = await client().rpc('save_e_kitap_admin', {
        p_book: bookPayload,
        p_pages: pages,
        p_questions: questions,
      });
      if (response.error) throw response.error;

      const stalePaths = oldPaths.filter(function(path) { return !newPaths.includes(path); });
      await cleanupPaths(stalePaths);
      showUploadStatus('');
      toast('E-kitap ve ' + questions.length + ' soru kaydedildi.');
      await loadBooks();
      showList();
    } catch (error) {
      await cleanupPaths(uploadedDuringAttempt);
      console.error(error);
      showUploadStatus('');
      toast(error.message || 'E-kitap kaydedilemedi.', 'error');
    } finally {
      state.saving = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Kaydet ve Yayınla';
    }
  }

  async function deleteBook(id) {
    const book = state.books.find(function(item) { return item.id === id; });
    if (!book || !window.confirm('"' + book.baslik + '" kitabını, sorularını ve sonuç bağlantılarını silmek istediğine emin misin?')) {
      return;
    }
    const pageResponse = await client().from('e_kitap_sayfalari').select('dosya_yolu').eq('e_kitap_id', id);
    const paths = [book.dosya_yolu, book.kapak_yolu]
      .concat((pageResponse.data || []).map(function(page) { return page.dosya_yolu; }))
      .filter(Boolean);
    const response = await client().from('e_kitaplar').delete().eq('id', id);
    if (response.error) {
      toast(response.error.message, 'error');
      return;
    }
    await cleanupPaths(paths);
    toast('E-kitap silindi.');
    await loadBooks();
  }

  async function signIn() {
    const email = clean(document.getElementById('loginEmail').value);
    const password = document.getElementById('loginPass').value;
    const errorNode = document.getElementById('loginErr');
    if (!email || !password) {
      errorNode.style.display = 'block';
      errorNode.textContent = 'E-posta ve şifre zorunlu.';
      return;
    }
    try {
      await window.kemalAdminAuth.signIn(email, password);
      errorNode.style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      await loadBooks();
    } catch (error) {
      errorNode.style.display = 'block';
      errorNode.textContent = window.kemalAdminAuth.humanizeError(error);
    }
  }

  async function initAuth() {
    try {
      const session = await window.kemalAdminAuth.getSession();
      if (session) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        await loadBooks();
        return;
      }
    } catch (error) {
      console.warn(error);
    }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  function bindEvents() {
    document.getElementById('loginButton').addEventListener('click', signIn);
    document.getElementById('logoutButton').addEventListener('click', async function() {
      await window.kemalAdminAuth.signOut();
      window.location.reload();
    });
    ['loginEmail', 'loginPass'].forEach(function(id) {
      document.getElementById(id).addEventListener('keydown', function(event) {
        if (event.key === 'Enter') signIn();
      });
    });
    document.getElementById('newBookButton').addEventListener('click', function() {
      resetForm();
      showEditor();
    });
    document.getElementById('refreshButton').addEventListener('click', loadBooks);
    document.getElementById('backButton').addEventListener('click', showList);
    document.getElementById('cancelButton').addEventListener('click', showList);
    document.getElementById('saveButton').addEventListener('click', saveBook);
    document.getElementById('addQuestionButton').addEventListener('click', function() {
      state.questions.push(defaultQuestion('coktan-secmeli'));
      renderQuestions();
    });
    document.querySelectorAll('[data-source]').forEach(function(button) {
      button.addEventListener('click', function() { setSourceType(button.dataset.source); });
    });
    document.getElementById('fImages').addEventListener('change', function(event) {
      handleImagesSelected(event.target.files);
    });
    document.getElementById('imageOrder').addEventListener('click', handleImageOrderClick);
    document.getElementById('questionList').addEventListener('input', handleQuestionInput);
    document.getElementById('questionList').addEventListener('change', handleQuestionInput);
    document.getElementById('questionList').addEventListener('click', handleQuestionClick);
    document.getElementById('bookGrid').addEventListener('click', function(event) {
      const edit = event.target.closest('[data-edit-book]');
      const remove = event.target.closest('[data-delete-book]');
      if (edit) editBook(edit.dataset.editBook);
      if (remove) deleteBook(remove.dataset.deleteBook);
    });
    ['filterGrade', 'filterStatus'].forEach(function(id) {
      document.getElementById(id).addEventListener('change', renderBooks);
    });
    document.getElementById('filterSearch').addEventListener('input', renderBooks);
    document.querySelectorAll('#panelEdit input, #panelEdit textarea, #panelEdit select').forEach(function(input) {
      input.addEventListener('input', updateSummary);
      input.addEventListener('change', updateSummary);
    });
  }

  document.addEventListener('DOMContentLoaded', async function() {
    populateGrades();
    bindEvents();
    resetForm();
    await initAuth();
  });
})();
