(function() {
  'use strict';

  const levels = window.ReadingAcademyLevels;
  const catalog = window.ReadingAcademyContent;
  const esc = catalog.escapeHtml;
  const storageKey = 'kemal-okuma-akademi-v1';
  const byId = id => document.getElementById(id);
  const view = byId('raPractice');
  const body = byId('raBody');
  const title = byId('raPracticeTitle');
  const icon = name => '<span data-ui-icon="' + name + '"></span>';
  const button = (id, label, primary = false) => '<button type="button" id="' + id + '" class="ra-btn' + (primary ? ' ra-btn-primary' : '') + '">' + label + '</button>';
  const onClick = (id, fn) => byId(id).addEventListener('click', fn);
  const format = value => value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  let level = levels[0];
  let progress = {};
  let activity;
  let run;
  let clockId;
  let category = '';

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) progress = saved;
  } catch (_) { /* The practice still works without storage. */ }

  function renderCatalog() {
    byId('raLevelTitle').textContent = level.name;
    byId('raFocus').textContent = level.focus;
    byId('raProgress').textContent = level.activities.filter(item => progress[item.id]).length + ' / ' + level.activities.length + ' tamamlandı';
    const items = level.activities.filter(item => !category || item.category === category);
    byId('raActivities').innerHTML = items.map(item => {
      const completed = Boolean(progress[item.id]);
      return '<button class="ra-activity" type="button" id="ra-activity-' + item.id + '" data-activity="' + item.id + '">' +
        '<span class="ra-activity-mark" data-ui-icon="' + item.icon + '"></span>' +
        '<span><strong>' + esc(item.title) + '</strong><small>' + esc(item.skill) + (completed ? ' · Tamamlandı' : '') + '</small></span>' +
        icon(completed ? 'check' : 'arrow') + '</button>';
    }).join('') || '<p class="ra-empty">Bu çalışma alanında henüz etkinlik yok.</p>';
  }

  function passageMarkup(passage, focusable = false) {
    return '<div class="ra-passage"><h3>' + esc(passage.title) + '</h3>' +
      passage.paragraphs.map((paragraph, index) => '<p' + (focusable ? ' data-paragraph="' + index + '"' : '') + '>' + esc(paragraph) + '</p>').join('') + '</div>';
  }

  function reviewMarkup() {
    return activity.passage ? '<details class="ra-review"><summary>Metne dön</summary>' + passageMarkup(activity.passage) + '</details>' : '';
  }

  function focus(id) {
    byId(id).focus({ preventScroll: true });
  }

  function resetViewport() {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function openActivity(item) {
    activity = item;
    run = { pass: 0, position: 0, correct: 0, seconds: [], focusMode: false, sentenceFocus: activity.focus === 'sentence', timed: false, paragraph: 0 };
    byId('raCatalog').hidden = true;
    view.hidden = false;
    view.dataset.level = level.id;
    title.textContent = activity.title;
    byId('raSkill').textContent = activity.skill;
    if (activity.repeat) renderReadingSetup();
    else if (activity.sample) renderWriting();
    else if (activity.passage) renderPassage();
    else renderQuestion();
    resetViewport();
    title.focus({ preventScroll: true });
  }

  function showCatalog() {
    window.clearInterval(clockId);
    const previousId = activity.id;
    view.hidden = true;
    byId('raCatalog').hidden = false;
    renderCatalog();
    byId('ra-activity-' + previousId).focus();
  }

  function renderReadingSetup() {
    byId('raStep').textContent = 'Okuma 1 / 2';
    body.innerHTML = '<p class="ra-task">' + esc(activity.task) + '</p><h3>' + esc(activity.passage.title) + '</h3>' +
      '<div class="ra-actions">' + button('raTimed', icon('timer') + ' Süreli başla', true) +
      button('raUntimed', icon('book') + ' Süresiz başla') + '</div>';
    onClick('raTimed', () => { run.timed = true; renderPassage(); });
    onClick('raUntimed', renderPassage);
  }

  function renderPassage() {
    const repeat = activity.repeat;
    const phase = run.pass === 0 ? 'İlk okuma' : 'Tekrar okuma';
    byId('raStep').textContent = repeat ? 'Okuma ' + (run.pass + 1) + ' / 2' : 'Metin';
    run.paragraph = 0;
    body.innerHTML = '<p class="ra-task">' + esc(run.pass === 1 ? activity.secondTask : activity.task) + '</p>' +
      '<div class="ra-actions ra-passage-tools"><button type="button" class="ra-btn" id="raFocusMode" aria-pressed="' +
      run.focusMode + '">' + icon('layers') + ' Paragraf odağı</button>' +
      '<button type="button" class="ra-btn" id="raSentenceMode" aria-pressed="' + run.sentenceFocus + '">' + icon('file') + ' Cümle odağı</button>' +
      (repeat && run.timed ? '<span class="ra-clock" id="raClock" role="timer" aria-label="' + phase + ' süresi">0:00</span>' : '') + '</div>' +
      passageMarkup(activity.passage, true) +
      '<div id="raParagraphNav" class="ra-actions" hidden>' + button('raPrevParagraph', '<span class="ra-arrow-back" data-ui-icon="arrow"></span> Önceki') +
      '<span id="raParagraphCount" aria-live="polite"></span>' + button('raNextParagraph', 'Sonraki ' + icon('arrow')) + '</div>' +
      '<div class="ra-actions">' + button('raReadDone', repeat ? 'Okumayı bitir' : 'Sorulara geç', true) + '</div>';

    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('tr', { granularity: 'sentence' }) : null;
    const sentences = activity.passage.paragraphs.flatMap(paragraph => segmenter
      ? Array.from(segmenter.segment(paragraph), item => item.segment.trim()).filter(Boolean)
      : paragraph.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/u));
    const sentence = document.createElement('p');
    body.querySelector('.ra-passage').append(sentence);
    const unitCount = () => run.sentenceFocus ? sentences.length : activity.passage.paragraphs.length;
    const updateFocus = () => {
      const count = unitCount();
      body.querySelectorAll('[data-paragraph]').forEach((paragraph, index) => {
        paragraph.hidden = run.sentenceFocus || (run.focusMode && index !== run.paragraph);
      });
      sentence.hidden = !run.sentenceFocus;
      sentence.textContent = run.sentenceFocus ? sentences[run.paragraph] : '';
      byId('raFocusMode').setAttribute('aria-pressed', String(run.focusMode));
      byId('raSentenceMode').setAttribute('aria-pressed', String(run.sentenceFocus));
      byId('raParagraphNav').hidden = !run.focusMode && !run.sentenceFocus;
      byId('raParagraphCount').textContent = (run.paragraph + 1) + ' / ' + count;
      byId('raPrevParagraph').disabled = run.paragraph === 0;
      byId('raNextParagraph').disabled = run.paragraph === count - 1;
    };
    onClick('raFocusMode', () => { run.focusMode = !run.focusMode; run.sentenceFocus = false; run.paragraph = 0; updateFocus(); });
    onClick('raSentenceMode', () => { run.sentenceFocus = !run.sentenceFocus; run.focusMode = false; run.paragraph = 0; updateFocus(); });
    onClick('raPrevParagraph', () => {
      run.paragraph -= 1;
      updateFocus();
      if (byId('raPrevParagraph').disabled) focus('raNextParagraph');
    });
    onClick('raNextParagraph', () => {
      run.paragraph += 1;
      updateFocus();
      if (byId('raNextParagraph').disabled) focus('raPrevParagraph');
    });
    updateFocus();
    const started = performance.now();
    if (repeat && run.timed) {
      clockId = window.setInterval(() => {
        const seconds = Math.floor((performance.now() - started) / 1000);
        byId('raClock').textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
      }, 250);
    }
    onClick('raReadDone', () => {
      window.clearInterval(clockId);
      if (repeat && run.timed) run.seconds.push((performance.now() - started) / 1000);
      if (repeat && run.pass === 0) {
        run.pass = 1;
        byId('raStep').textContent = 'Okuma 2 / 2';
        body.innerHTML = '<p class="ra-task">' + esc(activity.secondTask) + '</p><div class="ra-actions">' +
          button('raSecond', 'İkinci okumaya başla', true) + '</div>';
        onClick('raSecond', renderPassage);
        focus('raSecond');
      } else {
        renderQuestion();
      }
      resetViewport();
    });
    resetViewport();
    focus('raFocusMode');
  }

  function renderQuestion() {
    const total = activity.questions.length;
    const question = activity.questions[run.position];
    const last = run.position + 1 === total;
    byId('raStep').textContent = 'Soru ' + (run.position + 1) + ' / ' + total;
    body.innerHTML = '<p class="ra-task">' + (activity.repeat ? 'Okuduğun metne göre yanıtla.' : esc(activity.task)) + '</p>' +
      '<h3 id="raPrompt" tabindex="-1">' + esc(question.prompt) + '</h3>' + reviewMarkup() +
      '<div class="ra-answers" role="group" aria-labelledby="raPrompt">' + question.options.map((option, i) =>
        '<button type="button" class="ra-answer" data-answer="' + i + '">' + esc(option) + '</button>').join('') + '</div>' +
      '<div class="ra-feedback" role="status" id="raFeedback" hidden></div>' +
      '<div class="ra-actions" id="raContinue" hidden>' + button('raNext', last ? 'Sonucu gör' : 'Sonraki soru', true) + '</div>';
    const answers = [...body.querySelectorAll('[data-answer]')];
    answers.forEach((answer, index) => answer.addEventListener('click', () => {
      const correct = index === question.correct;
      if (correct) run.correct += 1;
      answers.forEach(item => { item.disabled = true; });
      if (!correct) answer.dataset.result = 'retry';
      answers[question.correct].dataset.result = 'correct';
      const feedback = byId('raFeedback');
      feedback.dataset.result = correct ? 'correct' : 'retry';
      feedback.hidden = false;
      feedback.textContent = (correct ? 'Doğru.' : 'Doğru yanıt: ' + question.options[question.correct] + '.') +
        (question.explanation ? ' ' + question.explanation : '');
      byId('raContinue').hidden = false;
      focus('raNext');
    }));
    onClick('raNext', () => {
      run.position += 1;
      if (last) renderResult();
      else renderQuestion();
      resetViewport();
    });
    focus('raPrompt');
  }

  function renderWriting() {
    byId('raStep').textContent = 'Yaz ve karşılaştır';
    body.innerHTML = '<p class="ra-task">' + esc(activity.task) + '</p>' + reviewMarkup() +
      '<form id="raWriting"><label for="raDraft"><strong>Kendi yanıtın</strong></label>' +
      '<textarea id="raDraft" maxlength="900" required></textarea><div class="ra-actions">' +
      '<button type="submit" class="ra-btn ra-btn-primary">Örnek yanıtla karşılaştır</button></div></form>' +
      '<div id="raExample" hidden><div class="ra-passage"><h3>Örnek yanıt</h3><p>' + esc(activity.sample) + '</p></div>' +
      '<fieldset class="ra-criteria"><legend>Kendi yanıtımı kontrol ediyorum</legend>' + activity.criteria.map(criterion =>
        '<label><input type="checkbox"> ' + esc(criterion) + '</label>').join('') + '</fieldset>' +
      '<div class="ra-actions">' + button('raFinishWriting', 'Tamamla', true) + '</div></div>';
    byId('raWriting').addEventListener('submit', event => {
      event.preventDefault();
      if (!byId('raDraft').value.trim()) {
        byId('raDraft').focus();
        return;
      }
      byId('raExample').hidden = false;
      body.querySelector('.ra-criteria input').focus();
    });
    onClick('raFinishWriting', () => {
      run.checked = body.querySelectorAll('.ra-criteria input:checked').length;
      renderResult();
      resetViewport();
    });
  }

  function renderResult() {
    progress[activity.id] = true;
    let stored = true;
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
    catch (_) { stored = false; }
    const metric = (label, value) => '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>';
    let stats = activity.questions
      ? metric('Doğru yanıt', run.correct + ' / ' + activity.questions.length)
      : metric('Kendi kontrol listen', run.checked + ' / ' + activity.criteria.length);
    if (run.seconds.length === 2) {
      const wordCount = activity.passage.paragraphs.join(' ').trim().split(/\s+/).length;
      run.seconds.forEach((seconds, index) => {
        const value = seconds < 1 ? '1 sn altında' : format(seconds) + ' sn · ' + format(Math.round(wordCount * 60 / seconds)) + ' k/dk';
        stats += metric(index === 0 ? 'İlk okuma' : 'Tekrar okuma', value);
      });
    }
    byId('raStep').textContent = 'Sonuç';
    body.innerHTML = '<h3 id="raResult" tabindex="-1">Çalışma tamamlandı</h3><dl class="ra-results">' + stats + '</dl>' +
      (run.seconds.length ? '<p class="ra-task">Tempo aynı metindeki iki okumayı karşılaştırır; doğru okunan kelime sayısını ölçmez.</p>' : '') +
      (!stored ? '<p class="ra-task" role="status">Tarayıcıya kaydedilemedi. Bu ilerleme yalnızca açık sayfada kalır.</p>' : '') +
      '<div class="ra-actions">' + button('raAgain', 'Tekrar çalış') + button('raDone', 'Çalışmalara dön', true) + '</div>';
    onClick('raAgain', () => openActivity(activity));
    onClick('raDone', showCatalog);
    focus('raResult');
  }

  byId('raLevels').innerHTML = levels.map((item, index) =>
    '<label class="ra-level"><input type="radio" name="raLevel" value="' + item.id + '"' +
    (index === 0 ? ' checked' : '') + '> ' + item.grades + '</label>').join('');
  byId('raLevels').addEventListener('change', event => {
    level = levels.find(item => item.id === event.target.value) || levels[0];
    byId('raCategory').value = category = '';
    renderCatalog();
  });
  byId('raCategory').innerHTML = '<option value="">Tüm çalışmalar</option>' +
    Object.entries(catalog.categories).map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('');
  byId('raCategory').addEventListener('change', event => { category = event.target.value; renderCatalog(); });
  byId('raActivities').addEventListener('click', event => {
    const choice = event.target.closest('[data-activity]');
    if (choice) openActivity(level.activities.find(item => item.id === choice.dataset.activity));
  });
  onClick('raBack', showCatalog);
  renderCatalog();
  catalog.loadPublished(window.kemalSiteStore.getReadingConfig()).then(items => {
    items.forEach(item => levels.find(itemLevel => itemLevel.id === item.levelKey)?.activities.push(item));
    if (!byId('raActivities').contains(document.activeElement)) renderCatalog();
  }).catch(() => {});
})();
