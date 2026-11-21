(function () {
  'use strict';

  const engine = window.KemalExamAnalysis;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const rate = value => '%' + Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 });

  function meter(row) {
    return `<div class="ea-meter" aria-hidden="true"><i style="width:${row.correctRate}%"></i><i style="width:${row.wrongRate}%"></i><i style="width:${row.blankRate}%"></i></div>`;
  }

  function stats(row) {
    return `<dl class="ea-stats"><div><dt>Doğru</dt><dd>${row.correct} <small>${rate(row.correctRate)}</small></dd></div>
      <div><dt>Yanlış</dt><dd>${row.wrong} <small>${rate(row.wrongRate)}</small></dd></div>
      <div><dt>Boş</dt><dd>${row.blank} <small>${rate(row.blankRate)}</small></dd></div></dl>`;
  }

  function open({ title = 'Sınav analizi', scope = '', load }) {
    document.querySelector('.ea-dialog')?.close();
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'ea-dialog';
    dialog.setAttribute('aria-labelledby', 'examAnalysisTitle');
    dialog.innerHTML = `<header class="ea-header"><div><h2 id="examAnalysisTitle">${esc(title)}</h2><p>${esc(scope)}</p></div>
      <button type="button" data-close aria-label="Sınav analizini kapat">×</button></header><main class="ea-body" aria-busy="true"><p role="status">Analiz hazırlanıyor…</p></main>`;
    document.body.append(dialog);
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { dialog.remove(); previousFocus?.focus({ preventScroll: true }); }, { once: true });
    dialog.showModal();
    const body = dialog.querySelector('.ea-body');
    let report, lessonIndex = '', outcomeIndex = '', sortBy = 'wrongRate';

    function groupRows(rows, kind) {
      return `<div class="ea-table-wrap"><table><thead><tr><th>${kind === 'lesson' ? 'Ders' : 'Kazanım'}</th><th>Doğru</th><th>Yanlış</th><th>Boş</th></tr></thead><tbody>${engine.rank(rows, 'wrongRate').map(row => {
        const index = rows.indexOf(row);
        return `<tr><th><button type="button" data-group="${kind}" data-index="${index}">${esc(row.label)}</button>
          ${row.lesson ? `<small>${esc(row.lesson)}</small>` : ''}<small>${row.questionKeys.length} soru · ${row.total} cevap</small></th>
          <td>${row.correct} <small>${rate(row.correctRate)}</small></td><td>${row.wrong} <small>${rate(row.wrongRate)}</small></td><td>${row.blank} <small>${rate(row.blankRate)}</small></td></tr>`;
      }).join('')}</tbody></table></div>`;
    }

    function highlight(rows, field, label) {
      const first = engine.rank(rows, field)[0];
      if (!first) return '';
      const top = rows.filter(row => row[field] === first[field]);
      return `<article class="ea-highlight"><h4>${label}</h4><p>${top.map(row => esc(row.number ? row.number + '. soru' : row.label)).join(' · ')}</p><strong>${rate(first[field])}</strong></article>`;
    }

    function render() {
      const { coverage, totals } = report;
      body.setAttribute('aria-busy', 'false');
      body.innerHTML = `<section class="ea-summary" aria-label="Analiz kapsamı">
        <p><strong>${coverage.students} öğrenci kaydı</strong> · ${coverage.withDetails} kayıtta soru ayrıntısı · ${report.questions.length} soru/sürüm</p>
        <p>Her öğrencinin son tamamlanan denemesi kullanılır. Oranlar her satırdaki değerlendirilen cevap sayısına göredir.</p>
        <p>${coverage.observedResponses}/${coverage.expectedResponses} soru cevabı değerlendirildi. ${coverage.withoutDetails ? `${coverage.withoutDetails} kayıtta kullanılabilir soru ayrıntısı yok. ` : ''}${coverage.invalidDetails ? `${coverage.invalidDetails} tekrarlı veya geçersiz soru ayrıntısı dışarıda bırakıldı. ` : ''}${coverage.omittedAttempts ? `${coverage.omittedAttempts} önceki deneme dışarıda bırakıldı. ` : ''}</p>
        ${coverage.anonymousRecords ? `<p>${coverage.anonymousRecords} kayıtta öğrenci kimlik anahtarı eksik. Bu kayıtlar ayrı ayrı değerlendirildi.</p>` : ''}
        ${report.metadataUnavailable ? '<p>Güncel soru bilgileri yüklenemedi. Analiz, sonuçlara kaydedilmiş ders ve kazanım ayrıntılarını kullanıyor.</p>' : ''}
        ${coverage.unknownSelections ? `<p>${coverage.unknownSelections} cevabın D/Y bilgisi var, seçilen şık kaydedilmemiş. Şık dağılımında ayrıca gösterilir.</p>` : ''}
        ${stats(totals)}${meter(totals)}<p class="ea-legend"><span>● Doğru</span><span>● Yanlış</span><span>● Boş</span></p>
      </section>
      ${!report.questions.length ? '<p class="ea-empty">Bu grupta soru ayrıntısı bulunan tamamlanmış sınav kaydı yok. Yeni soru bazlı sonuçlar kaydedildiğinde rapor oluşur.</p>' : `
      <section aria-labelledby="eaFindings"><h3 id="eaFindings">Öne çıkan sonuçlar</h3><div class="ea-highlights">
        ${highlight(report.lessons, 'wrongRate', 'En yüksek yanlış oranı · ders')}${highlight(report.lessons, 'correctRate', 'En yüksek doğru oranı · ders')}
        ${highlight(report.questions, 'wrongRate', 'En yüksek yanlış oranı · soru')}${highlight(report.questions, 'correctRate', 'En yüksek doğru oranı · soru')}
      </div></section>
      <section><h3>Derslere göre analiz</h3>${groupRows(report.lessons, 'lesson')}</section>
      <section><h3>Kazanımlara göre analiz</h3>${report.outcomes.length ? `${groupRows(report.outcomes, 'outcome')}<div class="ea-highlights">${highlight(report.outcomes, 'wrongRate', 'En yüksek yanlış oranı · kazanım')}${highlight(report.outcomes, 'correctRate', 'En yüksek doğru oranı · kazanım')}</div>` : '<p>Kazanım bilgisi kaydedilmemiş.</p>'}
        ${coverage.untagged ? `<p class="ea-note">${coverage.untagged} cevapta kazanım bilgisi yok. Ders ve soru analizine dahil edildi.</p>` : ''}</section>
      <section aria-labelledby="eaQuestions"><h3 id="eaQuestions">Sorular ve çeldiriciler</h3>
        <div class="ea-filters"><label>Ders<select data-lesson><option value="">Tüm dersler</option>${report.lessons.map((row, index) => `<option value="${index}">${esc(row.label)}</option>`).join('')}</select></label>
        <label>Kazanım<select data-outcome><option value="">Tüm kazanımlar</option>${report.outcomes.map((row, index) => `<option value="${index}">${esc(row.lesson + ' · ' + row.label)}</option>`).join('')}</select></label>
        <label>Sırala<select data-sort><option value="wrongRate">Yanlış oranı · yüksekten</option><option value="wrong">Yanlış sayısı · yüksekten</option><option value="correctRate">Doğru oranı · yüksekten</option><option value="blankRate">Boş oranı · yüksekten</option></select></label></div>
        <p class="ea-note">Bir soruyu seçerek önizlemesini ve şık dağılımını inceleyin. Farklı soru veya cevap anahtarı sürümleri ayrı satırlardadır.</p>
        <div class="ea-inspect"><div class="ea-questions" role="group" aria-label="Soru listesi"></div><div class="ea-detail" aria-live="polite"></div></div>
      </section>`}`;
      body.querySelector('[data-lesson]')?.addEventListener('change', event => { lessonIndex = event.target.value; outcomeIndex = ''; body.querySelector('[data-outcome]').value = ''; renderQuestions(); });
      body.querySelector('[data-outcome]')?.addEventListener('change', event => { outcomeIndex = event.target.value; renderQuestions(); });
      body.querySelector('[data-sort]')?.addEventListener('change', event => { sortBy = event.target.value; renderQuestions(); });
      body.querySelectorAll('[data-group]').forEach(button => button.addEventListener('click', () => {
        const index = button.dataset.index;
        lessonIndex = button.dataset.group === 'lesson' ? index : '';
        outcomeIndex = button.dataset.group === 'outcome' ? index : '';
        body.querySelector('[data-lesson]').value = lessonIndex;
        body.querySelector('[data-outcome]').value = outcomeIndex;
        renderQuestions();
        body.querySelector('#eaQuestions').scrollIntoView({ block: 'start', behavior: 'smooth' });
        body.querySelector('.ea-questions button')?.focus({ preventScroll: true });
      }));
      renderQuestions();
    }

    function renderQuestions() {
      const list = body.querySelector('.ea-questions');
      if (!list) return;
      const lesson = report.lessons[lessonIndex];
      const outcome = report.outcomes[outcomeIndex];
      const rows = engine.rank(report.questions.filter(row => (!lesson || lesson.questionKeys.includes(row.key)) && (!outcome || outcome.questionKeys.includes(row.key))), sortBy);
      list.innerHTML = rows.length ? rows.map(row => `<button type="button" data-question="${report.questions.indexOf(row)}" aria-pressed="false">
        <strong>${row.number}. soru · ${esc(row.lesson)}</strong><span>Yanlış ${row.wrong} (${rate(row.wrongRate)}) · Doğru ${row.correct} (${rate(row.correctRate)}) · Boş ${row.blank} (${rate(row.blankRate)})</span>${meter(row)}</button>`).join('') : '<p>Bu ders ve kazanım için soru yok.</p>';
      list.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {
        showQuestion(Number(button.dataset.question));
        if (window.matchMedia('(max-width: 680px)').matches) body.querySelector('.ea-detail').scrollIntoView({ block: 'start', behavior: 'smooth' });
      }));
      if (rows.length) showQuestion(report.questions.indexOf(rows[0]));
      else body.querySelector('.ea-detail').replaceChildren();
    }

    function showQuestion(index) {
      const row = report.questions[index];
      body.querySelectorAll('[data-question]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.question) === index)));
      const detail = body.querySelector('.ea-detail');
      const strongest = row.distractors.filter(choice => row.topDistractors.includes(choice.letter));
      const feedback = strongest.length
        ? `${strongest.map(choice => `${choice.letter} şıkkı ${choice.count} kez (${rate(choice.rate)})`).join(', ')} seçildi. Bu şıklar yanlış yanıtların ${rate(strongest.reduce((sum, choice) => sum + choice.count, 0) * 100 / row.wrong)}'ini oluşturuyor. Bu seçenekleri doğru cevapla karşılaştırarak sınıfta tartışın.`
        : row.wrong ? 'Seçilen şık ayrıntısı veya cevap anahtarı eksik olduğu için baskın çeldirici belirlenemedi.' : 'Kaydedilen cevaplarda yanlış yanıt yok.';
      detail.innerHTML = `<h4>${row.number}. soru · ${esc(row.lesson)}</h4>${row.learningOutcome ? `<p>${esc(row.learningOutcome)}</p>` : ''}
        <div class="ea-question-detail"><div class="ea-preview">${row.imageUrl ? '<img alt="Soru önizlemesi" loading="lazy"><p class="ea-note" data-image-state></p>' : '<p class="ea-empty">Bu soru sürümüne ait görsele ulaşılamıyor.</p>'}</div>
        <div><p><strong>Doğru cevap ${esc(row.correctAnswer || 'kayıtlı değil')}</strong> · ${row.total} cevap</p>${stats(row)}
          <h5>Şık dağılımı</h5><p class="ea-note">Yüzdeler boşlar dahil ${row.total} cevap üzerinden hesaplanır.</p>
          <ul class="ea-choices">${Object.entries(row.choices).sort().map(([letter, count]) => `<li class="${letter === row.correctAnswer ? 'ea-correct' : count && row.correctAnswer ? 'ea-distractor' : ''}"><div><strong>${letter}</strong><span>${letter === row.correctAnswer ? 'Doğru seçenek' : row.correctAnswer ? 'Çeldirici' : 'Seçenek'}</span><b>${count} · ${rate(engine.percent(count, row.total))}</b></div><progress max="${row.total}" value="${count}">${count}</progress></li>`).join('')}
            <li><div><strong>Boş</strong><b>${row.blank} · ${rate(row.blankRate)}</b></div></li>${row.unknown ? `<li><div>Şıkkı kayıtlı değil <b>${row.unknown}</b></div></li>` : ''}</ul>
          <p class="ea-feedback">${esc(feedback)}</p>${row.blank ? `<p class="ea-feedback">${row.blank} cevap (${rate(row.blankRate)}) boş. Konuyu yeniden ele alırken öğrencilerin bu soruyu tamamlamasını sağlayın.</p>` : ''}
        </div></div>`;
      const image = detail.querySelector('img');
      if (image) {
        const message = detail.querySelector('[data-image-state]');
        image.addEventListener('error', () => { image.hidden = true; message.textContent = 'Soru görseli yüklenemedi. İstatistikler aşağıda yer alıyor.'; }, { once: true });
        if (row.currentImage) message.textContent = 'Güncel soru görseli';
        image.src = row.imageUrl;
      }
    }

    async function reload() {
      body.setAttribute('aria-busy', 'true');
      body.innerHTML = '<p role="status">Analiz hazırlanıyor…</p>';
      try {
        const data = await load();
        if (!dialog.isConnected) return;
        report = engine.build(data);
        dialog.querySelector('h2').textContent = data.exam.title + ' · Sınav analizi';
        render();
      } catch (error) {
        if (!dialog.isConnected) return;
        body.setAttribute('aria-busy', 'false');
        body.innerHTML = '<p role="alert">Analiz verileri yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.</p><button type="button" data-retry>Yeniden dene</button>';
        body.querySelector('[data-retry]').addEventListener('click', reload);
      }
    }
    reload();
    return dialog;
  }

  window.KemalExamAnalysisView = { open };
})();
