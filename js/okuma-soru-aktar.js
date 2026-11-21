(function(root) {
  'use strict';

  const letters = 'ABCDE';
  const maxLength = 100000;
  const answerLabel = 'do[ğg]ru\\s+cevap|cevap|yan[ıi]t';
  const keyHeading = /^(?:cevap|yan[ıi]t)\s+anahtar[ıi]\s*:?\s*/imu;

  function parse(source, limits = {}) {
    const min = limits.minOptions ?? 3;
    const max = limits.maxOptions ?? 5;
    if (source.length > maxLength) throw new Error('Metin çok uzun. Soruları daha küçük gruplar halinde yapıştırın.');
    let text = source.replace(/\r\n?/g, '\n').replace(/[\u200b\ufeff]/g, '').replace(/\u00a0/g, ' ')
      .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, bold, underline) => bold ?? underline)
      .replace(/^\s*[-*_]{3,}[ \t]*$/gm, '').trim();
    if (!text) throw new Error('Önce soru ve seçenekleri yapıştırın.');

    const answers = new Map();
    function addAnswer(number, letter) {
      const normalized = letter.toUpperCase();
      if (answers.has(number) && answers.get(number) !== normalized) throw new Error(number + '. soru için birbiriyle çelişen cevaplar var.');
      answers.set(number, normalized);
    }

    const key = keyHeading.exec(text);
    if (key) {
      const keyText = text.slice(key.index + key[0].length);
      const pair = /(?:^|[\s,;|])([1-9]\d{0,3})[ \t]*[-:.)=][ \t]*\(?([A-E])\)?(?=$|[\s,;|.])/gi;
      const entries = [...keyText.matchAll(pair)];
      if (!entries.length || keyText.replace(pair, '').replace(/[\s.,;|]+/g, '')) {
        throw new Error('Cevap anahtarı okunamadı. Örnek: 1-B, 2-C, 3-A.');
      }
      entries.forEach(entry => addAnswer(Number(entry[1]), entry[2]));
      text = text.slice(0, key.index);
    }

    const starts = [...text.matchAll(/^[ \t]*(?:[-•][ \t]+)?(?:soru[ \t]+)?([1-9]\d{0,3})[.):][ \t]+/gim)];
    if (!starts.length) throw new Error('Her soruya yeni satırda bir numara ile başlayın. Örnek: 1. Soru metni');
    if (starts.length > 80) throw new Error('Bir seferde en fazla 80 soru aktarılabilir.');
    if (text.slice(0, starts[0].index).trim()) throw new Error('İlk sorudan önceki başlık veya açıklamayı kaldırın.');
    const seenNumbers = new Set();
    const questions = starts.map((start, i) => {
      const number = Number(start[1]);
      if (seenNumbers.has(number)) throw new Error(number + '. soru numarası birden fazla kez kullanılmış.');
      seenNumbers.add(number);
      let block = text.slice(start.index + start[0].length, starts[i + 1]?.index ?? text.length).trim();
      const inlineAnswer = new RegExp('(?:^|\\s)(\\(?(?:' + answerLabel + ')\\s*:\\s*([A-E])\\)?)[.!]?$', 'iu').exec(block);
      if (inlineAnswer) {
        addAnswer(number, inlineAnswer[2]);
        block = block.slice(0, inlineAnswer.index).trimEnd();
      }
      const markers = [...block.matchAll(/(?:^|\s)(?:\(([A-E])\)|([A-E])[).:])(?=\s|$)/g)];
      const prompt = block.slice(0, markers[0]?.index ?? block.length).trim().replace(/\s+/g, ' ');
      if (!prompt || markers.length < min || markers.length > max) {
        throw new Error(number + '. soru: soru metni ve ' + min + '–' + max + ' seçenek gerekli (A), B), C) …).');
      }
      const options = markers.map((marker, index) => {
        if ((marker[1] || marker[2]) !== letters[index]) {
          throw new Error(number + '. soru: seçenekler A’dan başlayarak sıralı ve tekrarsız olmalı.');
        }
        const value = block.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? block.length).trim().replace(/\s+/g, ' ');
        if (!value) throw new Error(number + '. soru: ' + letters[index] + ' seçeneği boş.');
        return value;
      });
      const correct = letters.indexOf(answers.get(number) || ' ');
      if (correct >= options.length) throw new Error(number + '. soru: cevap anahtarındaki şık seçeneklerde yok.');
      return { number, prompt, options, correct };
    });
    for (const number of answers.keys()) {
      if (!seenNumbers.has(number)) throw new Error('Cevap anahtarındaki ' + number + '. soru metinde yok.');
    }
    return questions;
  }

  function questionKey(question) {
    const normalize = text => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
    return JSON.stringify([normalize(question.prompt), question.options.map(normalize).sort()]);
  }

  function skipDuplicates(questions, existing) {
    const keys = new Set(existing.map(questionKey));
    return questions.filter(question => {
      const key = questionKey(question);
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
  }

  function asReadingQuestion(question) {
    return {
      soru_tipi: 'coktan-secmeli', soru_metni: question.prompt,
      secenekler: question.options.map((text, index) => ({
        secenek_metni: text, dogru_mu: question.correct === index, sira: index + 1,
      })),
    };
  }

  function mount(button, config) {
    const dialog = document.createElement('dialog');
    dialog.className = 'reading-import';
    dialog.setAttribute('aria-labelledby', 'readingImportTitle');
    dialog.innerHTML = `
      <header class="reading-import-head">
        <h2 id="readingImportTitle">Soruları toplu yapıştır</h2>
        <button type="button" class="reading-import-close" aria-label="Kapat" title="Kapat"><span data-ui-icon="cross"></span></button>
      </header>
      <div class="reading-import-body">
        <label for="readingImportText">Numaralı test soruları</label>
        <textarea id="readingImportText" rows="7" maxlength="${maxLength}" aria-describedby="readingImportHint" placeholder="1. Soru metni? A) İlk şık B) İkinci şık C) Üçüncü şık"></textarea>
        <p id="readingImportHint">Şıklar aynı satırda veya ayrı satırlarda olabilir. İsteğe bağlı son satır: <strong>Cevap Anahtarı: 1-B, 2-C</strong></p>
        <p class="reading-import-status" role="status"></p>
        <ol class="reading-import-results" aria-label="Soru önizlemesi"></ol>
      </div>
      <footer class="reading-import-actions">
        <button type="button" data-parse>Önizle</button>
        <button type="button" data-append disabled>Soruları ekle</button>
      </footer>`;
    document.body.appendChild(dialog);
    const input = dialog.querySelector('textarea');
    const status = dialog.querySelector('[role="status"]');
    const results = dialog.querySelector('ol');
    const append = dialog.querySelector('[data-append]');
    let pending = [];

    function report(message, error = false) {
      status.textContent = message;
      status.classList.toggle('is-error', error);
    }

    function clearPreview() {
      pending = [];
      results.replaceChildren();
      append.disabled = true;
      append.textContent = 'Soruları ekle';
      report('');
    }

    button.addEventListener('click', () => {
      clearPreview();
      dialog.showModal();
      input.focus();
    });
    dialog.querySelector('.reading-import-close').addEventListener('click', () => dialog.close());
    input.addEventListener('input', clearPreview);
    dialog.querySelector('[data-parse]').addEventListener('click', () => {
      clearPreview();
      try {
        const all = parse(input.value, config);
        pending = skipDuplicates(all, config.existing());
        const capacity = config.capacity?.() ?? Infinity;
        if (pending.length > capacity) throw new Error('Bu çalışmaya en fazla ' + capacity + ' yeni soru eklenebilir.');
        const skipped = all.length - pending.length;
        const missing = pending.filter(question => question.correct < 0).length;
        report(pending.length + ' yeni soru' + (skipped ? ' · ' + skipped + ' tekrar atlandı' : '') +
          (missing ? '. Doğru cevabı burada veya ekledikten sonra seçebilirsiniz.' : '.'));
        for (const question of pending) {
          const item = document.createElement('li');
          item.value = question.number;
          const title = document.createElement('strong');
          title.textContent = question.prompt;
          const options = document.createElement('ul');
          const select = document.createElement('select');
          select.setAttribute('aria-label', question.number + '. sorunun doğru cevabı');
          select.add(new Option('Doğru cevap seçilmedi', '-1'));
          question.options.forEach((option, index) => {
            const row = document.createElement('li');
            row.textContent = letters[index] + ') ' + option;
            options.appendChild(row);
            select.add(new Option(letters[index] + ' şıkkı', String(index)));
          });
          select.value = String(question.correct);
          select.addEventListener('change', () => { question.correct = Number(select.value); });
          item.append(title, options, select);
          results.appendChild(item);
        }
        append.disabled = !pending.length;
        if (pending.length) append.textContent = pending.length + ' soru ekle';
      } catch (error) {
        pending = [];
        report(error.message, true);
      }
    });
    append.addEventListener('click', () => {
      if (!pending.length) return;
      config.append(pending);
      dialog.close();
      input.value = '';
      clearPreview();
    });
  }

  const api = { parse, skipDuplicates, asReadingQuestion, mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReadingQuestionImport = api;
})(globalThis);
