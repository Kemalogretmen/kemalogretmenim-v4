const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { setTimeout: nodeSetTimeout, clearTimeout: nodeClearTimeout, setImmediate: nodeSetImmediate } = require('node:timers');
const { parseHTML } = require('linkedom');

const tick = () => new Promise(resolve => nodeSetImmediate(resolve));

function item(id, type, grade = 2, accessScope = 'public') {
  return {
    uid: `${type}:${id}`, id, type, contentType: type,
    title: `Kaynak ${id}`, href: `/dokuman.html?id=${id}`,
    grade, grades: [grade], gradeLabel: `${grade}. Sınıf`,
    subject: 'matematik', subjectLabel: 'Matematik',
    contentTypeLabel: type, sourceLabel: type, accessScope,
    createdAtValue: 1000, createdAt: '2026-10-29T09:00:00Z',
  };
}

async function setup(t, { items = [], lockedGrade = null, feedError = false, feedResult, manualTimers = false } = {}) {
  const { window, document } = parseHTML(fs.readFileSync('index.html', 'utf8'));
  const searches = [], feedCalls = [], lockedChecks = [], timers = new Map();
  window.location = { origin: 'https://fixture.test', href: 'https://fixture.test/' };
  // linkedom exposes only a getter for select.value; browsers also provide
  // the setter used to synchronise an authenticated student's grade.
  document.querySelectorAll('select').forEach(select => {
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() { return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? ''; },
      set(value) {
        this.querySelectorAll('option').forEach(option => {
          option.toggleAttribute('selected', option.value === String(value));
        });
      },
    });
  });
  window.kemalSite = { ready: Promise.resolve() };
  window.kemalSiteSearch = { open: query => searches.push(query) };
  window.kemalUserAuth = { ready: async () => {}, getStudentGradeLevel: () => lockedGrade };
  const matchesGrade = (entry, grade) => !grade || entry.grades.includes(Number(grade));
  window.kemalContentFeed = {
    getAllItems: async options => {
      feedCalls.push(options);
      if (feedError) throw new Error('fixture network unavailable');
      return feedResult === undefined ? items : feedResult;
    },
    matchesGrade,
    matchesLockedGrade: (entry, grade) => {
      lockedChecks.push({ id: entry.id, grade });
      return entry.accessScope === 'public' || matchesGrade(entry, grade);
    },
    matchesSubject: (entry, subject) => !subject || entry.subject === subject,
    isPublicItem: entry => entry.accessScope === 'public',
    getGradeMeta: grade => ({ label: `${grade}. Sınıf` }),
    getContentTypeMeta: type => ({ label: {
      reading: 'Okuma', document: 'Doküman', video: 'Ders Videosu',
      exam: 'Sınav', game: 'Oyun',
    }[type] || 'İçerik' }),
  };
  const schedule = (fn, delay) => {
    if (manualTimers) {
      const timer = {};
      timers.set(timer, { fn, delay });
      return timer;
    }
    const timer = nodeSetTimeout(() => { timers.delete(timer); fn(); }, delay);
    timers.set(timer, { fn, delay });
    return timer;
  };
  const unschedule = timer => { if (!manualTimers) nodeClearTimeout(timer); timers.delete(timer); };
  window.setTimeout = schedule;
  window.clearTimeout = unschedule;
  t.after(() => { if (!manualTimers) timers.forEach((_, timer) => nodeClearTimeout(timer)); });
  const staticLinks = Array.from(document.querySelectorAll('#homeResourceGrid a'), node => node.getAttribute('href'));
  vm.runInNewContext(fs.readFileSync('js/home.js', 'utf8'), {
    window, document, console, URL, URLSearchParams,
    CustomEvent: window.CustomEvent,
    setTimeout: schedule, clearTimeout: unschedule,
  });
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  for (let i = 0; i < 5; i++) await tick();
  return {
    window, document, searches, feedCalls, lockedChecks, staticLinks,
    fireTimer(delay) {
      assert.equal(manualTimers, true, 'Explicit timer firing requires the controlled clock');
      const pending = Array.from(timers).find(([, entry]) => entry.delay === delay);
      assert.ok(pending, `Expected a pending ${delay}ms deadline`);
      timers.delete(pending[0]);
      pending[1].fn();
    },
  };
}

const resourceLinks = document => Array.from(document.querySelectorAll('#homeResourceGrid a'), node => node.getAttribute('href'));
const liveLinks = document => Array.from(document.querySelectorAll('#heroLiveList a'), node => node.getAttribute('href'));
const click = (document, selector) => {
  const node = document.querySelector(selector);
  assert.ok(node, `Expected control ${selector}`);
  node.click();
  return node;
};

test('homepage search and suggestions open the shared search with a trimmed query', async t => {
  const h = await setup(t);
  h.document.getElementById('homeSearchInput').value = '  kesir çalışması  ';
  const event = new h.window.Event('submit', { bubbles: true, cancelable: true });
  h.document.getElementById('homeSearchForm').dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.searches.at(-1), 'kesir çalışması');
  click(h.document, '[data-search-query="çarpma"]');
  assert.equal(h.searches.at(-1), 'çarpma');
});

test('fraction controls update the diagram, selected button and accessible explanation together', async t => {
  const h = await setup(t);
  for (const [numerator, word] of [[1, 'biri'], [3, 'üçü'], [4, 'dördü']]) {
    click(h.document, `[data-fraction="${numerator}"]`);
    const parts = Array.from(h.document.querySelectorAll('[data-fraction-part]'));
    const selectedColor = parts[0].getAttribute('fill');
    assert.equal(parts.filter(part => part.getAttribute('fill') === selectedColor).length, numerator);
    assert.equal(h.document.getElementById('fractionNumerator').textContent, String(numerator));
    const pressed = h.document.querySelectorAll('[data-fraction][aria-pressed="true"]');
    assert.equal(pressed.length, 1);
    assert.equal(pressed[0].getAttribute('data-fraction'), String(numerator));
    const explanation = h.document.getElementById('fractionStatus').textContent;
    assert.match(explanation, new RegExp(`${word} boyalı`, 'i'));
    assert.equal(h.document.getElementById('fractionDiagram').getAttribute('aria-label').replace(/\.$/, ''), explanation.replace(/\.$/, ''));
  }
});

test('library filters the complete catalog before limiting results and includes video in resources', async t => {
  const items = Array.from({ length: 8 }, (_, index) => item(`reading-${index}`, 'reading'));
  items.push(item('document-later', 'document'), item('video-later', 'video'));
  const h = await setup(t, { items });
  assert.ok(h.feedCalls.length >= 1);
  assert.ok(h.feedCalls.every(options => options.homeFeedOnly === true));
  assert.equal(resourceLinks(h.document).length, 6);
  click(h.document, '[data-content-type="document"]');
  await tick();
  const links = resourceLinks(h.document);
  assert.equal(links.length, 2);
  assert.ok(links.some(href => href.endsWith('id=document-later')));
  assert.ok(links.some(href => href.endsWith('id=video-later')));
});

test('student library applies the existing locked-grade policy and preserves access scopes', async t => {
  const h = await setup(t, { lockedGrade: 2, items: [
    item('same-grade', 'document', 2, 'registered'),
    item('other-registered', 'document', 3, 'registered'),
    item('other-public', 'document', 3, 'public'),
  ] });
  const select = h.document.getElementById('homeGradeFilter');
  assert.equal(select.disabled, true);
  assert.equal(select.value, '2');
  assert.ok(h.lockedChecks.some(entry => entry.id === 'other-registered' && Number(entry.grade) === 2));
  const links = resourceLinks(h.document);
  assert.ok(links.some(href => href.endsWith('id=same-grade')));
  assert.ok(links.some(href => href.endsWith('id=other-public')));
  assert.ok(!links.some(href => href.endsWith('id=other-registered')));
  const same = h.document.querySelector('#homeResourceGrid a[href$="id=same-grade"]');
  const other = h.document.querySelector('#homeResourceGrid a[href$="id=other-public"]');
  assert.equal(same.getAttribute('data-access-scope'), 'registered');
  assert.equal(other.getAttribute('data-access-scope'), 'public');
});

test('an empty filter result offers a working way to clear the selection', async t => {
  const h = await setup(t, { items: [item('reading-only', 'reading')] });
  click(h.document, '[data-content-type="exam"]');
  await tick();
  assert.equal(resourceLinks(h.document).length, 0);
  const reset = Array.from(h.document.querySelectorAll('#homeResourceGrid button, #homeLibraryStatus button'))
    .find(node => /temizle|sıfırla|tüm.*göster/i.test(node.textContent));
  assert.ok(reset, 'Empty results should offer a clear-filters control');
  reset.click();
  await tick();
  assert.equal(resourceLinks(h.document).length, 1);
  assert.equal(h.document.querySelector('[data-content-type="all"]').getAttribute('aria-pressed'), 'true');
});

test('feed failure keeps real static destinations and makes unavailable filters inert', async t => {
  const h = await setup(t, { feedError: true });
  assert.deepEqual(resourceLinks(h.document), h.staticLinks);
  assert.equal(h.document.getElementById('homeResourceGrid').getAttribute('aria-busy'), 'false');
  assert.equal(h.document.getElementById('homeGradeFilter').disabled, true);
  assert.ok(Array.from(h.document.querySelectorAll('[data-content-type]')).every(button => button.disabled));
  assert.match(h.document.getElementById('homeLibraryStatus').textContent, /yüklenem|görüntülenem|ulaşılam|bağlantı/i);
  const live = h.document.getElementById('heroLiveList');
  assert.equal(live.getAttribute('aria-busy'), 'false');
  assert.match(live.textContent, /görüntülenem/i);
  assert.deepEqual(liveLinks(h.document), ['/sinif-kaynaklari.html']);
});

test('demo records and unsafe destinations cannot replace useful static fallback links', async t => {
  const h = await setup(t, { items: [
    { ...item('default-demo', 'content'), title: 'Default placeholder' },
    { ...item('unsafe-link', 'reading'), href: 'javascript:alert(1)' },
  ] });
  assert.deepEqual(resourceLinks(h.document), h.staticLinks);
  assert.equal(h.document.getElementById('homeResourceGrid').textContent.includes('Default placeholder'), false);
  assert.equal(h.document.getElementById('homeGradeFilter').disabled, true);
});

test('a stalled catalog falls back at the deadline and late recovery restores real cards and filters', async t => {
  let resolveCatalog;
  const catalog = new Promise(resolve => { resolveCatalog = resolve; });
  const h = await setup(t, { feedResult: catalog, manualTimers: true });
  assert.equal(h.document.getElementById('homeResourceGrid').getAttribute('aria-busy'), 'true');
  assert.equal(h.document.getElementById('heroLiveList').getAttribute('aria-busy'), 'true');
  h.fireTimer(10000);
  assert.deepEqual(resourceLinks(h.document), h.staticLinks);
  assert.equal(h.document.getElementById('homeResourceGrid').getAttribute('aria-busy'), 'false');
  assert.equal(h.document.getElementById('homeGradeFilter').disabled, true);
  assert.ok(Array.from(h.document.querySelectorAll('[data-content-type]')).every(button => button.disabled));
  assert.match(h.document.getElementById('homeLibraryStatus').textContent, /görüntülenem/i);
  assert.equal(h.document.getElementById('heroLiveList').getAttribute('aria-busy'), 'false');
  assert.deepEqual(liveLinks(h.document), ['/sinif-kaynaklari.html']);

  resolveCatalog([item('recovered-document', 'document')]);
  for (let i = 0; i < 5; i++) await tick();
  const links = resourceLinks(h.document);
  assert.equal(links.length, 1);
  assert.ok(links[0].endsWith('id=recovered-document'));
  assert.equal(liveLinks(h.document).length, 1);
  assert.ok(liveLinks(h.document)[0].endsWith('id=recovered-document'));
  assert.equal(h.document.getElementById('heroLiveList').getAttribute('aria-busy'), 'false');
  assert.equal(h.document.getElementById('homeResourceGrid').getAttribute('aria-busy'), 'false');
  assert.equal(h.document.getElementById('homeGradeFilter').disabled, false);
  assert.ok(Array.from(h.document.querySelectorAll('[data-content-type]')).every(button => !button.disabled));
  click(h.document, '[data-content-type="reading"]');
  assert.equal(resourceLinks(h.document).length, 0, 'Recovered filters should respond to user input');
  assert.ok(liveLinks(h.document)[0].endsWith('id=recovered-document'), 'Library filters must not alter the recovered live feed');
  assert.equal(h.feedCalls.length, 1, 'Late recovery must reuse the original request');
});

test('live feed shows the five newest items from the shared request and ignores library filters', async t => {
  const types = ['reading', 'document', 'video', 'exam', 'game'];
  const items = [20, 28, 21, 27, 22, 26, 23, 25].map((day, index) => {
    const createdAt = `2026-10-${day}T09:00:00Z`;
    return {
      ...item(`live-${day}`, types[index % types.length], 2, index % 2 ? 'registered' : 'public'),
      createdAt, createdAtValue: Date.parse(createdAt),
    };
  });
  const h = await setup(t, { items });
  const expectedIds = ['live-28', 'live-27', 'live-26', 'live-25', 'live-23'];
  const before = liveLinks(h.document);
  assert.deepEqual(before.map(href => new URL(href).searchParams.get('id')), expectedIds);
  assert.equal(h.document.getElementById('heroLiveList').getAttribute('aria-busy'), 'false');
  for (const link of h.document.querySelectorAll('#heroLiveList a')) {
    const source = items.find(entry => entry.id === new URL(link.getAttribute('href')).searchParams.get('id'));
    assert.equal(link.getAttribute('data-access-scope'), source.accessScope);
  }
  assert.equal(h.feedCalls.length, 1);
  assert.equal(h.feedCalls[0].homeFeedOnly, true);
  click(h.document, '[data-content-type="game"]');
  assert.equal(resourceLinks(h.document).length, 1);
  assert.deepEqual(liveLinks(h.document), before);
  assert.equal(h.feedCalls.length, 1, 'The top feed must not issue a separate catalog request');
});

test('student live feed excludes other-grade registered items before limiting while retaining public items', async t => {
  const excluded = Array.from({ length: 6 }, (_, index) => ({
    ...item(`hidden-other-${index}`, 'document', 3, 'registered'), createdAtValue: 5000 - index,
  }));
  const allowed = [
    item('student-own', 'reading', 2, 'registered'),
    item('student-public-other', 'game', 3, 'public'),
    item('student-own-2', 'document', 2, 'registered'),
    item('student-public-other-2', 'exam', 4, 'public'),
    item('student-own-3', 'video', 2, 'registered'),
    item('student-own-older', 'reading', 2, 'registered'),
  ].map((entry, index) => ({ ...entry, createdAtValue: 4000 - index }));
  const h = await setup(t, { lockedGrade: 2, items: excluded.concat(allowed) });
  const ids = liveLinks(h.document).map(href => new URL(href).searchParams.get('id'));
  assert.deepEqual(ids, allowed.slice(0, 5).map(entry => entry.id));
  assert.ok(!ids.some(id => id.startsWith('hidden-other')));
  const publicLink = h.document.querySelector('#heroLiveList a[href$="id=student-public-other"]');
  const ownLink = h.document.querySelector('#heroLiveList a[href$="id=student-own"]');
  assert.equal(publicLink.getAttribute('data-access-scope'), 'public');
  assert.equal(ownLink.getAttribute('data-access-scope'), 'registered');
  assert.equal(h.feedCalls.length, 1);
});
