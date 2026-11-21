(function() {
  'use strict';

  function create(screen) {
    const frame = screen.querySelector('#readingPageWindow');
    const flow = screen.querySelector('#readingPageFlow');
    const paper = frame.parentElement;
    const surface = document.createElement('div');
    surface.className = 'reading-compact-surface reading-fragment';
    surface.hidden = true;
    frame.after(surface);
    const back = screen.querySelector('#readingPageBack');
    const next = screen.querySelector('#readingPageNext');
    const nextLabel = screen.querySelector('#readingPageNextLabel');
    const nextIcon = screen.querySelector('#readingPageNextIcon');
    const count = screen.querySelector('#readingPageCount');
    let page = 0;
    let sheets = [];
    let step = 0;
    let pageHeight = 0;
    let lineHeight = '';
    let lastAnchor;
    let leaf;
    let updateFrame;
    let touch;

    function pageOffset() {
      return (sheets[page]?.column || 0) * step;
    }

    function clearLeaf() {
      leaf?.remove();
      leaf = null;
    }

    function character(range, node, offset) {
      range.setStart(node, offset);
      range.setEnd(node, offset + 1);
      return range.getBoundingClientRect();
    }

    function pageAt(rect, left, stride) {
      return Math.max(0, Math.floor((rect.left - left + 1) / stride));
    }

    function collectSheets(left, stride) {
      const result = new Map();
      const range = document.createRange();
      const walker = document.createTreeWalker(flow, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.data.trim() || node.parentElement.closest('script, style, template') || getComputedStyle(node.parentElement).visibility === 'hidden') continue;
        for (const line of node.data.matchAll(/[^\r\n]+/g)) {
          const start = line[0].search(/[^\s\u200B-\u200D]/);
          if (start < 0) continue;
          const from = line.index + start;
          const to = line.index + line[0].replace(/[\s\u200B-\u200D]+$/, '').length;
          range.setStart(node, from);
          range.setEnd(node, to);
          const columns = new Set([...range.getClientRects()].filter(rect => rect.width > .5 && rect.height > 0).map(rect => pageAt(rect, left, stride)));
          const first = Math.min(...columns);
          for (const column of columns) {
            if (result.has(column)) continue;
            let offset = from;
            if (column !== first) {
              let end = to - 1;
              while (offset < end) {
                const mid = Math.floor((offset + end) / 2);
                if (pageAt(character(range, node, mid), left, stride) < column) offset = mid + 1;
                else end = mid;
              }
            }
            result.set(column, { column, node, offset });
          }
        }
      }
      for (const node of flow.querySelectorAll('img, svg, video, canvas, iframe, math')) {
        if (getComputedStyle(node).visibility === 'hidden') continue;
        for (const rect of node.getClientRects()) {
          if (!rect.width || !rect.height) continue;
          const column = pageAt(rect, left, stride);
          const previous = result.get(column);
          if (!previous || node.compareDocumentPosition(previous.node) & Node.DOCUMENT_POSITION_FOLLOWING) {
            result.set(column, { column, node });
          }
        }
      }
      return [...result.values()].sort((a, b) => a.column - b.column);
    }

    function placeOnPaper(element) {
      element.style.inset = frame.offsetTop + 'px auto auto ' + frame.offsetLeft + 'px';
      element.style.width = frame.clientWidth + 'px';
      element.style.height = frame.clientHeight + 'px';
    }

    function removeDuplicateIds(fragment) {
      fragment.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    }

    function drawCompactPage() {
      const compact = Boolean(step && innerHeight <= 500 && innerWidth > innerHeight && sheets.length);
      surface.hidden = !compact;
      flow.inert = compact;
      frame.classList.toggle('reading-compact-source', compact);
      if (!compact) return;
      const range = document.createRange();
      const current = sheets[page];
      const following = sheets[page + 1];
      surface.classList.toggle('reading-fragment-continuation', page > 0 && current.offset > 0);
      if (page === 0) range.setStart(flow, 0);
      else if (current.offset === undefined) range.setStartBefore(current.node);
      else range.setStart(current.node, current.offset);
      if (!following) range.setEnd(flow, flow.childNodes.length);
      else if (following.offset === undefined) range.setEndBefore(following.node);
      else range.setEnd(following.node, following.offset);

      let fragment = range.cloneContents();
      let parent = range.commonAncestorContainer;
      if (parent.nodeType === Node.TEXT_NODE) parent = parent.parentElement;
      for (; parent !== flow; parent = parent.parentElement) {
        const wrapper = parent.cloneNode(false);
        wrapper.append(fragment);
        fragment = wrapper;
      }
      removeDuplicateIds(fragment);
      if (fragment.nodeType === Node.ELEMENT_NODE) fragment.removeAttribute('id');
      placeOnPaper(surface);
      surface.style.setProperty('--reading-page-height', frame.clientHeight + 'px');
      surface.replaceChildren(fragment);
    }

    function paint() {
      const pages = sheets.length || 1;
      frame.scrollLeft = pageOffset();
      drawCompactPage();
      const label = (page + 1) + ' / ' + pages;
      if (count.textContent !== label) count.textContent = label;
      count.hidden = !step;
      back.disabled = page === 0;
      back.hidden = !step;
      nextLabel.textContent = page + 1 < pages ? 'Sonraki' : 'Okumam bitti';
      nextIcon.hidden = page + 1 >= pages;
    }

    function layout() {
      const anchor = sheets[page] || lastAnchor;
      const previousPage = page;
      const oldProgress = page / Math.max(1, sheets.length - 1);
      screen.classList.toggle('reading-paginated', window.innerHeight >= 235);
      const box = frame.getBoundingClientRect();
      if (window.innerHeight < 235 || box.height < 82 || !box.width) {
        screen.classList.remove('reading-paginated');
        clearLeaf();
        lastAnchor = anchor;
        page = 0;
        sheets = [];
        step = 0;
        pageHeight = 0;
        lineHeight = '';
        paint();
        return;
      }
      flow.style.setProperty('--reading-page-height', box.height + 'px');
      const gap = parseFloat(getComputedStyle(flow).columnGap) || 0;
      const nextStep = box.width + gap;
      const nextLineHeight = getComputedStyle(screen.querySelector('#tamMetinIcerik')).lineHeight;
      const sameSize = nextStep === step && box.height === pageHeight;
      if (!sameSize) clearLeaf();
      frame.scrollLeft = 0;
      sheets = collectSheets(box.left, nextStep);
      const rect = anchor && (anchor.offset === undefined
        ? anchor.node.getBoundingClientRect() : character(document.createRange(), anchor.node, anchor.offset));
      const column = rect?.height ? pageAt(rect, box.left, nextStep) : -1;
      const currentColumn = sameSize && anchor ? sheets.findIndex(sheet => sheet.column === anchor.column) : -1;
      const index = currentColumn >= 0 ? currentColumn : column < 0 ? -1 : sheets.findIndex(sheet => sheet.column >= column);
      const candidate = index < 0 ? Math.round(oldProgress * (sheets.length - 1)) : index;
      const shorter = nextStep === step && nextLineHeight === lineHeight && box.height < pageHeight;
      page = Math.max(0, Math.min(sheets.length - 1, shorter ? Math.max(previousPage, candidate) : candidate));
      step = nextStep;
      pageHeight = box.height;
      lineHeight = nextLineHeight;
      paint();
    }

    function queueLayout() {
      cancelAnimationFrame(updateFrame);
      updateFrame = requestAnimationFrame(() => { updateFrame = 0; layout(); });
    }

    function go(target, animate = true) {
      const destination = Math.min(Math.max(0, sheets.length - 1), Math.max(0, target));
      if (!step || destination === page) return;
      if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) turnLeaf(destination > page);
      else clearLeaf();
      page = destination;
      paint();
    }

    function turnLeaf(forward) {
      clearLeaf();
      if (flow.querySelector('iframe, video, audio, canvas')) return;
      const sheet = document.createElement('div');
      sheet.className = 'reading-leaf';
      sheet.setAttribute('aria-hidden', 'true');
      sheet.inert = true;
      placeOnPaper(sheet);
      const compact = !surface.hidden;
      const copy = (compact ? surface : flow).cloneNode(true);
      copy.removeAttribute('id');
      copy.className = compact ? 'reading-fragment reading-leaf-static' : 'reading-fragment reading-leaf-copy';
      if (compact && surface.classList.contains('reading-fragment-continuation')) copy.classList.add('reading-fragment-continuation');
      removeDuplicateIds(copy);
      if (compact) ['inset', 'width', 'height'].forEach(property => copy.style.removeProperty(property));
      else copy.style.left = -pageOffset() + 'px';
      const edge = document.createElement('span');
      edge.className = 'reading-leaf-fold';
      edge.dataset.direction = forward ? 'forward' : 'back';
      sheet.append(copy, edge);
      frame.after(sheet);
      leaf = sheet;
      const polygon = points => 'polygon(' + points.map(([x, y]) => (forward ? x : 100 - x) + '% ' + y + '%').join(', ') + ')';
      const fold = (top, middle, bottom) => polygon([[0, 0], [top, 0], [middle, 48], [bottom, 100], [0, 100]]);
      const rim = (top, middle, bottom) => polygon([
        [top - 10, 0], [top, 0], [middle, 48], [bottom, 100], [bottom - 14, 100], [middle - 17, 48],
      ]);
      const curve = [[0, 100, 100, 100], [.22, 86, 93, 100], [.55, 46, 63, 77], [.88, 0, 11, 24], [1, 0, 0, 0]];
      const timing = { duration: 260, easing: 'cubic-bezier(.32,.08,.26,1)', fill: 'both' };
      sheet.animate(curve.map(([offset, ...points]) => ({ offset, clipPath: fold(...points) })), timing)
        .onfinish = () => { if (leaf === sheet) clearLeaf(); };
      edge.animate(curve.map(([offset, ...points]) => ({ offset, clipPath: rim(...points), opacity: offset === 0 ? 0 : .96 })), timing);
    }

    back.addEventListener('click', () => go(page - 1));
    document.addEventListener('keydown', event => {
      if (!step || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
          event.target.closest?.('input, textarea, select, [contenteditable]')) return;
      const direction = ['ArrowRight', 'PageDown'].includes(event.key) ? 1 : ['ArrowLeft', 'PageUp'].includes(event.key) ? -1 : 0;
      if (!direction) return;
      event.preventDefault();
      if (!event.repeat) go(page + direction);
    });
    paper.addEventListener('touchstart', event => {
      touch = event.touches.length === 1 ? event.touches[0] : null;
    }, { passive: true });
    paper.addEventListener('touchend', event => {
      if (!touch) return;
      const finish = [...event.changedTouches].find(item => item.identifier === touch.identifier);
      if (finish) {
        const dx = finish.clientX - touch.clientX;
        const dy = finish.clientY - touch.clientY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5 && !getSelection()?.toString()) go(page + Math.sign(dx));
      }
      touch = null;
    }, { passive: true });
    paper.addEventListener('touchcancel', () => { touch = null; });
    flow.addEventListener('focusin', event => {
      if (!step) return;
      const column = pageAt(event.target.getBoundingClientRect(), frame.getBoundingClientRect().left - frame.scrollLeft, step);
      const index = sheets.findIndex(sheet => sheet.column === column);
      if (index >= 0 && index !== page) go(index, false);
      else paint();
    });

    window.addEventListener('resize', queueLayout, { passive: true });
    window.visualViewport?.addEventListener('resize', queueLayout, { passive: true });
    document.addEventListener('fullscreenchange', queueLayout);
    document.addEventListener('webkitfullscreenchange', queueLayout);
    if ('ResizeObserver' in window) new ResizeObserver(queueLayout).observe(frame);
    document.fonts?.ready.then(queueLayout);
    flow.addEventListener('load', queueLayout, true);
    layout();
    requestAnimationFrame(() => { layout(); next.disabled = false; });
    return { next() { if (page + 1 >= sheets.length) return false; go(page + 1); return true; } };
  }

  window.ReadingPages = { create };
})();
