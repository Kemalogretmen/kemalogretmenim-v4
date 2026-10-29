/* Presentation and navigation for the mathematics studio. Mathematical tools
   retain their original DOM nodes and event handlers. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const tools = [
    { id: 'calc', name: 'Hesap makinesi', hint: 'İşlemleri birlikte çözün.', category: 'numbers', view: 'mathCalcView', key: 'C', description: 'Dört işlem, parantezler ve ondalık sayılarla hesaplayın.' },
    { id: 'rng', name: 'Zar ve yazı tura', hint: 'Olasılıkları keşfedin.', category: 'numbers', view: 'mathRngView', description: 'Bir, iki veya üç zar atın; yazı tura ile olasılık deneyleri yapın.' },
    { id: 'wheel', name: 'Sayı çarkı', hint: 'Yeni sayılar oluşturun.', category: 'numbers', view: 'mathWheelView', description: 'Basamak sayısını seçin ve çarklarla yeni sayılar oluşturun.' },
    { id: 'frac', name: 'Kesir modelleri', hint: 'Parça ve bütünü görün.', category: 'numbers', view: 'mathFracView', key: 'K', description: 'Payı ve paydayı değiştirerek parça ile bütün arasındaki ilişkiyi inceleyin.' },
    { id: 'nl', name: 'Sayı doğrusu', hint: 'Sayılar arasında gezinin.', category: 'numbers', view: 'mathNlView', key: 'L', description: 'İleri ve geri hareket ederek sayıların yerini ve aralarındaki uzaklığı inceleyin.' },
    { id: 'convert', name: 'Birim çeviriciler', hint: 'Ölçüleri karşılaştırın.', category: 'measure', view: 'mathConvertView', description: 'Uzunluk, alan, kütle ve sıvı ölçülerini birimler arasında dönüştürün.' },
    { id: 'geo', name: 'Geometri', hint: 'GeoGebra ile çizin.', category: 'geometry', view: 'mathGeoView', description: 'GeoGebra araçlarıyla çizimler yapın, açıları ve geometrik ilişkileri keşfedin.' }
  ];
  const external = {
    'birim-kup-uygulamasi.html': { icon: 'cube', name: 'Birim küpler', hint: 'Yapı kurun, görünüm çıkarın.' },
    '3d-yapi-atolyesi.html': { icon: 'builder', name: 'Yapı atölyesi', hint: '2B şekiller ve 3B cisimler.' },
    'geometrik-cisimler-acilimlar.html': { icon: 'nets', name: 'Cisim açılımları', hint: 'Açın, katlayın ve keşfedin.' },
    'simetri.html': { icon: 'symmetry', name: 'Simetri aynası', hint: 'Çizin, yansıtın, karşılaştırın.' }
  };
  const paths = {
    calc: '<rect x="5" y="3" width="22" height="27" rx="4"/><path d="M10 8h12v5H10Zm0 11h1m5 0h1m5 0h1M10 24h1m5 0h1m5 0h1"/>',
    rng: '<rect x="4" y="5" width="22" height="22" rx="5"/><circle cx="10" cy="11" r="1"/><circle cx="20" cy="11" r="1"/><circle cx="15" cy="16" r="1"/><circle cx="10" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>',
    wheel: '<circle cx="16" cy="17" r="12"/><path d="M16 5v12l10 6M16 17 6 23m10-6L6 10m10 7 10-7M12 2h8l-4 5Z"/><circle cx="16" cy="17" r="2" fill="currentColor"/>',
    frac: '<circle cx="16" cy="16" r="12"/><path d="M16 4v12h12M16 16l-8.5 8.5"/><path d="M16 4a12 12 0 0 1 12 12H16Z" fill="currentColor" fill-opacity=".16"/>',
    nl: '<path d="M3 17h26m-4-4 4 4-4 4M7 13v8m7-8v8m7-8v8"/><circle cx="14" cy="17" r="3" fill="currentColor"/><path d="M14 5v4"/>',
    convert: '<path d="M5 10h22m-5-5 5 5-5 5M27 22H5m5-5-5 5 5 5"/>',
    geo: '<path d="M4 27 27 4v23ZM13 23h10V13ZM8 23l2 2m3-7 2 2m3-7 2 2"/>',
    cube: '<path d="m16 3 12 7v13l-12 7-12-7V10Zm0 14L4 10m12 7 12-7M16 17v13"/><path d="m4 10 12-7 12 7-12 7Z" fill="currentColor" fill-opacity=".12"/>',
    builder: '<path d="m16 2 8 5v9l-8 5-8-5V7Zm0 10L8 7m8 5 8-5M16 12v9M8 17l-6 4v7l7 4 7-4v-7m8-4 6 4v7l-7 4-7-4m-14-7 7 4 7-4m14 0-7 4-7-4M9 25v7m14-7v7"/>',
    nets: '<path d="M12 2h8v8h8v8h-8v12h-8V18H4v-8h8Zm0 8h8v8h-8Zm0 8v6h8M12 10V2"/>',
    symmetry: '<path d="M16 2v28" stroke-dasharray="3 3"/><path d="m12 7-8 9 8 9Zm8 0 8 9-8 9Z"/><path d="m20 7 8 9-8 9Z" fill="currentColor" fill-opacity=".12"/>',
    search: '<circle cx="13" cy="13" r="8"/><path d="m19 19 8 8"/>',
    arrow: '<path d="m11 5 10 11-10 11"/>',
    keyboard: '<rect x="3" y="7" width="26" height="19" rx="3"/><path d="M8 12h1m5 0h1m5 0h1m5 0h0M8 17h1m5 0h1m5 0h1m5 0h0M10 22h12"/>',
    chevron: '<path d="m7 12 9 9 9-9"/>',
    books: '<rect x="4" y="4" width="8" height="24" rx="2"/><path d="M4 10h8M4 22h8m3-17 7-2 7 24-8 2Z"/>'
  };
  function node(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function icon(id) { const svg = document.createElementNS(NS, 'svg'); Object.entries({ viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'math-ui-icon' }).forEach(([k,v]) => svg.setAttribute(k,v)); svg.innerHTML = paths[id] || paths.geo; return svg; }
  function init() {
    const oldMenu = document.querySelector('#mathWorkspace .mode-tabs'), measure = document.querySelector('#mathWorkspace .measure-shell'), head = document.querySelector('#mathWorkspace .panel-head');
    if (!oldMenu || !measure || !head || measure.querySelector('.math-studio-layout')) return;
    const layout = node('div', 'math-studio-layout');
    const library = node('aside', 'math-library'); library.id = 'mathToolLibrary'; library.setAttribute('aria-label', 'Matematik araç kütüphanesi');
    const libraryHeading = node('div', 'math-library-heading'); libraryHeading.append(icon('books'), node('span', '', 'Araç kütüphanesi'), node('small', '', '11'));
    const searchBox = node('label', 'math-library-search'); searchBox.append(icon('search')); const search = node('input'); search.id = 'mathToolSearch'; search.type = 'search'; search.placeholder = 'Araç ara…'; search.setAttribute('aria-label', 'Matematik araçlarında ara'); search.setAttribute('autocomplete', 'off'); searchBox.append(search);
    const results = node('p', 'math-library-empty', 'Bu aramaya uygun araç bulunamadı.'); results.hidden = true; results.setAttribute('role', 'status');
    library.append(libraryHeading, searchBox);
    const localGroup = node('div', 'math-library-group'); const localLabel = node('p', 'math-library-group-label', 'SAYILAR VE ÖLÇÜLER');
    const list = node('div', 'math-mode-list'); list.setAttribute('role', 'tablist'); list.setAttribute('aria-orientation', 'vertical'); list.setAttribute('aria-label', 'Etkileşimli matematik araçları'); localGroup.append(localLabel, list);
    const items = [];
    tools.forEach(tool => {
      const button = oldMenu.querySelector(`[data-math-mode="${tool.id}"]`); if (!button) return;
      button.className = `mode-tab math-nav-item${button.classList.contains('active') ? ' active' : ''}`; button.id = `math-tab-${tool.id}`; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', tool.view); button.title = tool.name;
      const image = node('span', 'math-nav-icon'); image.append(icon(tool.id)); const copy = node('span', 'math-nav-copy'); copy.append(node('strong', '', tool.name), node('small', '', tool.hint));
      button.replaceChildren(image, copy); if (tool.key) { const key = node('kbd', '', tool.key); key.setAttribute('aria-hidden', 'true'); button.append(key); }
      list.append(button); items.push({ element: button, group: localGroup, label: `${tool.name} ${tool.hint}` });
      const view = document.getElementById(tool.view); if (view) { view.setAttribute('role', 'tabpanel'); view.setAttribute('aria-labelledby', button.id); view.setAttribute('tabindex', '0'); }
      button.addEventListener('keydown', event => {
        const keys = ['ArrowUp', 'ArrowDown', 'Home', 'End']; if (!keys.includes(event.key)) return;
        const visible = [...list.querySelectorAll('button')].filter(b => !b.hidden); const index = visible.indexOf(button); if (index < 0 || visible.length === 0) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length;
        visible[next].click(); visible[next].focus();
      });
    });
    const externalGroup = node('nav', 'math-library-group'); externalGroup.setAttribute('aria-label', 'Geometri atölyeleri'); externalGroup.append(node('p', 'math-library-group-label', 'GEOMETRİ ATÖLYELERİ'));
    [...oldMenu.querySelectorAll('a')].forEach(link => {
      const meta = external[link.getAttribute('href')]; if (!meta) return;
      link.className = 'math-nav-item math-nav-link'; link.removeAttribute('style'); const image = node('span', 'math-nav-icon'); image.append(icon(meta.icon)); const copy = node('span', 'math-nav-copy'); copy.append(node('strong', '', meta.name), node('small', '', meta.hint)); const arrow = node('span', 'math-link-arrow'); arrow.append(icon('arrow')); link.replaceChildren(image, copy, arrow); externalGroup.append(link); items.push({ element: link, group: externalGroup, label: `${meta.name} ${meta.hint}` });
    });
    library.append(localGroup, externalGroup, results);
    const workbench = node('div', 'math-workbench'); const titleBlock = node('div', 'math-workbench-title'); const activeIcon = node('span', 'math-active-icon'); activeIcon.id = 'mathActiveIcon';
    const titleCopy = node('div', 'math-workbench-copy'); const oldTitle = head.querySelector('h2'); oldTitle.id = 'mathActiveTitle'; const description = node('p'); description.id = 'mathActiveDescription'; titleCopy.append(oldTitle, description); titleBlock.append(activeIcon, titleCopy); head.prepend(titleBlock);
    const help = head.querySelector('.shortcut-help-btn'); if (help) { help.replaceChildren(icon('keyboard')); help.title = 'Klavye kısayolları'; help.setAttribute('aria-label', 'Klavye kısayollarını göster'); }
    workbench.append(head);
    const views = node('div', 'math-view-body'); tools.forEach(tool => { const view = document.getElementById(tool.view); if (view) views.append(view); }); workbench.append(views);
    const trigger = node('button', 'math-library-trigger'); trigger.type = 'button'; trigger.setAttribute('aria-controls', library.id); trigger.setAttribute('aria-expanded', 'false'); trigger.append(icon('calc'), node('span', '', 'Araç değiştir'), icon('chevron'));
    function closeLibrary() { library.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); syncResponsive(); }
    function syncResponsive() { const mobile = window.innerWidth <= 860; library.inert = mobile && !library.classList.contains('is-open'); }
    trigger.addEventListener('click', () => { const open = library.classList.toggle('is-open'); trigger.setAttribute('aria-expanded', String(open)); syncResponsive(); });
    layout.append(trigger, library, workbench); measure.replaceChildren(layout);
    document.querySelector('#mathWorkspace .panel').removeAttribute('style'); document.querySelector('#mathWorkspace .display-stage').removeAttribute('style');
    const calc = document.querySelector('#mathCalcView .calc-wrapper');
    if (calc) {
      const calcLayout = node('div', 'math-calc-layout'); const notes = node('aside', 'math-calculator-notes');
      const tag = node('p', 'math-note-eyebrow', 'İŞLEM ATÖLYESİ'); notes.append(tag, node('h3', '', 'Düşün, hesapla, karşılaştır.'), node('p', '', 'Bir işlemi farklı yollarla çözün. Önce sonucu tahmin edin, sonra birlikte kontrol edin.'));
      const noteList = node('ul'); ['Dört işlemle hesaplayın', 'İşlem sırasını parantezlerle inceleyin', 'Ondalık sayılarla çalışın'].forEach(text => noteList.append(node('li', '', text))); notes.append(noteList);
      const exampleLabel = node('span', 'math-example-label', 'ÖRNEK İŞLEMLER'), examples = node('div', 'math-example-chips');
      [['24 ÷ 6', '24/6'], ['8 × 7', '8*7'], ['(12 + 8) × 3', '(12+8)*3']].forEach(([label, value]) => { const b = node('button', '', label); b.type = 'button'; b.title = 'Örnek işlemi hesapla'; b.addEventListener('click', () => { if (typeof window.mathCalc !== 'function') return; window.mathCalc('C'); window.mathCalc(value); window.mathCalc('='); }); examples.append(b); });
      notes.append(exampleLabel, examples); calc.before(calcLayout); calcLayout.append(calc, notes);
      const screen = calc.querySelector('#calcScreen'); screen?.setAttribute('aria-live', 'polite'); screen?.setAttribute('aria-label', 'Hesap makinesi ekranı');
    }
    function normalize(text) { return text.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function filter() {
      const query = normalize(search.value.trim()); let found = 0;
      items.forEach(item => { const match = !query || normalize(item.label).includes(query); item.element.hidden = !match; if (match) found++; });
      [localGroup, externalGroup].forEach(group => { group.hidden = !items.some(item => item.group === group && !item.element.hidden); }); results.hidden = found > 0;
      const visibleTabs = [...list.querySelectorAll('button')].filter(button => !button.hidden);
      const tabStop = visibleTabs.find(button => button.classList.contains('active')) || visibleTabs[0];
      list.querySelectorAll('button').forEach(button => { button.tabIndex = button === tabStop ? 0 : -1; });
    }
    library.addEventListener('keydown', event => { if (event.key === 'Escape' && window.innerWidth <= 860) { closeLibrary(); trigger.focus(); } });
    search.addEventListener('input', filter); search.addEventListener('keydown', event => { if (event.key === 'Escape') { search.value = ''; filter(); search.blur(); } });
    function sync(mode) {
      const tool = tools.find(t => t.id === mode) || tools[0]; oldTitle.textContent = tool.name; description.textContent = tool.description; activeIcon.replaceChildren(icon(tool.id));
      list.querySelectorAll('button').forEach(b => { const selected = b.dataset.mathMode === tool.id; b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1; });
      trigger.replaceChildren(icon(tool.id), node('span', '', tool.name), icon('chevron')); closeLibrary();
    }
    document.addEventListener('mathmodechange', event => sync(event.detail.mode));
    window.addEventListener('resize', syncResponsive); sync(oldMenu.querySelector('.active')?.dataset.mathMode || list.querySelector('.active')?.dataset.mathMode || 'calc');
    window.MathToolsUI = { filter, sync };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
