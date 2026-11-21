(function() {
  'use strict';
  const content = window.ReadingAcademyContent;
  const auth = window.kemalAdminAuth;
  const byId = id => document.getElementById(id);
  const val = id => byId(id).value.trim();
  const esc = content.escapeHtml;
  const form = byId('acForm');
  const list = byId('acQuestionList');
  let rows = [];
  let current = null;
  let client;
  let editable = false;
  let insertable = false;
  let installed = false;
  let busy = false;
  let questionId = 0;

  function report(id, message, error = false) {
    const node = byId(id);
    node.textContent = message;
    node.classList.toggle('error', error);
  }

  function addQuestion(data = {}) {
    if (list.children.length >= 12) return;
    const row = document.createElement('fieldset');
    row.className = 'ac-question';
    const key = 'ac-q-' + (++questionId);
    const input = (suffix, name, length, value) => '<div class="ha-field"><label for="' + key + suffix + '">' + name +
      '</label><input id="' + key + suffix + '" data-field="' + suffix + '" maxlength="' + length + '" value="' + esc(value) + '"></div>';
    row.innerHTML = '<legend></legend>' + input('prompt', 'Soru metni', 450, data.prompt) +
      ['A', 'B', 'C', 'D'].map((letter, index) => input(letter, letter + ' seçeneği' + (index >= 2 ? ' (isteğe bağlı)' : ''), 240, data.options?.[index])).join('') +
      '<div class="ha-field"><label for="' + key + 'correct">Doğru seçenek</label><select id="' + key + 'correct" data-field="correct">' +
      '<option value="">Seçin</option><option>A</option><option>B</option><option>C</option><option>D</option></select></div>' +
      '<div class="ha-field"><label for="' + key + 'explain">Yanıt açıklaması (isteğe bağlı)</label><textarea id="' + key + 'explain" data-field="explain" maxlength="500" rows="2"></textarea></div>' +
      '<button class="ha-btn" type="button" data-remove-question><span data-ui-icon="cross"></span> Soruyu kaldır</button>';
    row.querySelector('[data-field="explain"]').value = data.explanation || '';
    row.querySelector('[data-field="correct"]').value = 'ABCD'[data.correct] || '';
    list.append(row);
    numberQuestions();
  }

  function numberQuestions() {
    [...list.children].forEach((row, index) => { row.querySelector('legend').textContent = (index + 1) + '. soru'; });
    byId('acAddQuestion').disabled = list.children.length >= 12;
  }

  function toggleFields() {
    const type = val('acType');
    byId('acSecondField').hidden = type !== 'repeat';
    byId('acQuestions').hidden = type === 'writing';
    byId('acWritingFields').hidden = type !== 'writing';
  }

  function updateButtons() {
    const canSave = installed && (current ? editable : insertable) && !busy;
    byId('acDraft').disabled = !canSave;
    byId('acPublish').disabled = !canSave;
    byId('acNew').disabled = !insertable || busy;
  }

  function renderList() {
    byId('acList').replaceChildren();
    if (!rows.length) {
      byId('acList').textContent = 'Henüz eklenen çalışma yok.';
      return;
    }
    rows.forEach(row => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ha-btn';
      button.disabled = busy;
      button.setAttribute('aria-current', row.id === current?.id ? 'true' : 'false');
      const title = document.createElement('span');
      title.textContent = row.title;
      const flag = document.createElement('small');
      flag.textContent = row.is_published ? 'Yayında' : 'Taslak';
      button.append(title, flag);
      button.addEventListener('click', () => edit(row));
      byId('acList').append(button);
    });
  }

  function edit(row = null) {
    current = row;
    const body = row?.body || {};
    const values = {
      acTitle: row?.title, acSkill: row?.skill, acLevel: row?.level_key || 'temel',
      acCategory: row?.category || 'comprehension', acType: row?.activity_type || 'quiz',
      acTask: body.task, acPassageTitle: body.passage?.title, acPassage: body.passage?.paragraphs?.join('\n\n'),
      acSecond: body.secondTask, acExample: body.sample, acCriteria: body.criteria?.join('\n'),
    };
    Object.entries(values).forEach(([id, value]) => { byId(id).value = value || ''; });
    list.replaceChildren();
    (body.questions?.length ? body.questions : [{}]).forEach(addQuestion);
    byId('acEditorTitle').textContent = row ? 'Çalışmayı düzenle' : 'Yeni çalışma';
    byId('acState').textContent = row?.is_published ? 'Yayında' : 'Taslak';
    byId('acDraft').textContent = row?.is_published ? 'Yayından al ve taslak yap' : 'Taslak olarak kaydet';
    report('acFormStatus', '');
    renderList();
    toggleFields();
    updateButtons();
  }

  function readForm() {
    return content.normalize({
      level_key: val('acLevel'), category: val('acCategory'), activity_type: val('acType'),
      title: val('acTitle'), skill: val('acSkill'),
      body: {
        task: val('acTask'), secondTask: val('acSecond'), sample: val('acExample'),
        passage: { title: val('acPassageTitle'), paragraphs: val('acPassage').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) },
        criteria: val('acCriteria').split('\n').map(text => text.trim()).filter(Boolean),
        questions: [...list.children].map(row => {
          const field = name => row.querySelector('[data-field="' + name + '"]').value.trim();
          const letters = [...'ABCD'].filter(letter => field(letter));
          return { prompt: field('prompt'), options: letters.map(field), correct: letters.indexOf(field('correct')), explanation: field('explain') };
        }),
      },
    });
  }

  function preview() {
    try {
      const { title, body } = readForm();
      byId('acPreviewBody').innerHTML = '<h3>' + esc(title) + '</h3><p>' + esc(body.task) + '</p>' +
        (body.passage ? '<h4>' + esc(body.passage.title) + '</h4>' + body.passage.paragraphs.map(p => '<p>' + esc(p) + '</p>').join('') : '') +
        (body.secondTask ? '<p><strong>İkinci okuma:</strong> ' + esc(body.secondTask) + '</p>' : '') +
        (body.questions ? '<ol>' + body.questions.map(q => '<li><strong>' + esc(q.prompt) + '</strong><ul>' +
          q.options.map((option, i) => '<li>' + esc(option) + (q.correct === i ? ' ✓' : '') + '</li>').join('') +
          '</ul><p>' + esc(q.explanation) + '</p></li>').join('') + '</ol>' :
          '<p><strong>Örnek yanıt:</strong> ' + esc(body.sample) + '</p><ul>' + body.criteria.map(text => '<li>' + esc(text) + '</li>').join('') + '</ul>');
      byId('acPreviewDialog').showModal();
      report('acFormStatus', '');
    } catch (error) { report('acFormStatus', error.message, true); }
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !installed || !(current ? editable : insertable)) return;
    const publish = event.submitter?.id === 'acPublish';
    try {
      const data = readForm();
      if (publish && !window.confirm('“' + data.title + '” öğrenci sayfasında yayımlansın mı?')) return;
      busy = true;
      updateButtons();
      renderList();
      report('acFormStatus', 'Kaydediliyor…');
      const payload = { ...data, is_published: publish, updated_at: new Date().toISOString() };
      const table = client.from(content.table);
      const query = current ? table.update(payload).eq('id', current.id) : table.insert(payload);
      const { data: saved, error } = await query.select(content.columns).single();
      if (error) throw error;
      rows = [saved, ...rows.filter(item => item.id !== saved.id)];
      edit(saved);
      report('acFormStatus', publish ? 'Yayınlandı. Öğrenci kataloğunda yer alır.' : 'Taslak kaydedildi. Öğrenci kataloğunda görünmez.');
    } catch (error) {
      report('acFormStatus', error.message || 'Çalışma kaydedilemedi.', true);
    } finally {
      busy = false;
      updateButtons();
      renderList();
    }
  }

  async function load() {
    const access = await auth.ensureCurrentPageAccess();
    insertable = auth.hasAnyPermission(['okuma_metinleri', 'okuma_metni_ekleme'], access);
    editable = auth.hasAnyPermission(['okuma_metinleri', 'okuma_metni_duzenleme'], access);
    client = auth.getClient();
    window.KemalAdminShell?.initStandalone({
      appId: 'academyManager', activeKey: 'academy-admin', homeHref: '/admin/index.html', homeLabel: 'Yönetim Paneli',
      permissionProfile: access, onLogout: async () => { await auth.signOut(); window.location.reload(); },
    });
    byId('academyLogin').hidden = true;
    byId('academyManager').hidden = false;
    const { data, error } = await client.from(content.table).select(content.columns).order('updated_at', { ascending: false });
    if (error) {
      report('acStatus', ['42P01', 'PGRST205'].includes(error.code)
        ? 'Akademi içerik tablosu henüz kurulu değil. supabase-okuma-akademisi-20261114.sql dosyasını uygulayın.'
        : 'Çalışmalar yüklenemedi: ' + error.message, true);
      return;
    }
    installed = true;
    rows = data || [];
    edit(!insertable && rows.length ? rows[0] : null);
    report('acStatus', '');
  }

  [['acLevel', content.levels], ['acCategory', content.categories], ['acType', content.types]].forEach(([id, values]) => {
    byId(id).replaceChildren(...Object.entries(values).map(([key, label]) => new Option(label, key)));
  });
  byId('acType').addEventListener('change', toggleFields);
  function questionRowsWithContent() {
    return [...list.children].filter(row => [...row.querySelectorAll('[data-field]')].some(field => field.value.trim()));
  }
  window.ReadingQuestionImport?.mount(byId('bulkAcademyQuestions'), {
    minOptions: 2,
    maxOptions: 4,
    existing: () => questionRowsWithContent().map(row => ({
      prompt: row.querySelector('[data-field="prompt"]').value,
      options: [...'ABCD'].map(letter => row.querySelector('[data-field="' + letter + '"]').value).filter(text => text.trim()),
    })),
    capacity: () => 12 - questionRowsWithContent().length,
    append: questions => {
      const occupied = questionRowsWithContent();
      [...list.children].filter(row => !occupied.includes(row)).forEach(row => row.remove());
      const first = list.children.length;
      questions.forEach(addQuestion);
      window.requestAnimationFrame(() => list.children[first]?.querySelector('input')?.focus());
    },
  });
  byId('acAddQuestion').addEventListener('click', () => { addQuestion(); list.lastElementChild.querySelector('input').focus(); });
  list.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-question]');
    if (!remove) return;
    remove.closest('.ac-question').remove();
    numberQuestions();
    byId('acAddQuestion').focus();
  });
  byId('acPreview').addEventListener('click', preview);
  byId('acNew').addEventListener('click', () => { edit(); byId('acTitle').focus(); });
  form.addEventListener('submit', save);
  byId('academyLogin').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      await auth.signIn(val('acEmail'), byId('acPassword').value);
      byId('acPassword').value = '';
      await load();
    } catch (error) {
      report(byId('academyManager').hidden ? 'acLoginStatus' : 'acStatus', error.message, true);
    } finally { if (button) button.disabled = false; }
  });
  document.addEventListener('DOMContentLoaded', async () => {
    edit();
    try {
      if (await auth.getSession()) await load();
      else byId('academyLogin').hidden = false;
    } catch (error) {
      if (byId('academyManager').hidden) byId('academyLogin').hidden = false;
      report(byId('academyManager').hidden ? 'acLoginStatus' : 'acStatus', error.message, true);
    }
  });
})();
