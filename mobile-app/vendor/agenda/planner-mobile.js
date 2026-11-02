/* Phone view presents the selected day's existing table cells without copying or
   rewriting any state. All record mutation stays in the reviewed planner engine. */
(function () {
  document.querySelectorAll('.tab-btn').forEach(function (button) { button.textContent = (button.textContent || '').replace(/^[^\p{L}\p{N}]+/u, ''); });
  var selectedKey = '';
  var observedFocus = '';
  var container = document.getElementById('weekly-plan-container');
  if (!container) return;
  var picker = document.createElement('nav');
  picker.className = 'kemal-day-picker';
  picker.setAttribute('aria-label', 'Ders günü');
  var caption = document.createElement('div');
  caption.className = 'kemal-day-caption';
  var host = document.getElementById('weekly-plan-card');
  host.insertBefore(caption, container); host.insertBefore(picker, caption);
  function dateKey(text) {
    var found = /(\d{1,2})\.(\d{1,2})\.(\d{4})\b/.exec(text || '');
    return found ? found[3] + '-' + found[2].padStart(2, '0') + '-' + found[1].padStart(2, '0') : '';
  }
  function repaint() {
    var table = container.querySelector('.plan-table');
    picker.replaceChildren(); caption.textContent = '';
    if (!table) return;
    var columns = Array.from(table.querySelectorAll('thead th')).slice(1);
    var focused = '';
    try { focused = state.lastFocusDate || ''; } catch (error) {}
    if (focused !== observedFocus) { selectedKey = focused; observedFocus = focused; }
    var desired = selectedKey;
    if (!columns.some(function (cell) { return dateKey(cell.textContent) === desired; })) {
      try { desired = state.lastFocusDate || ''; } catch (error) { desired = ''; }
      if (!columns.some(function (cell) { return dateKey(cell.textContent) === desired; })) {
        var now = new Date(); desired = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      }
    }
    var index = columns.findIndex(function (cell) { return dateKey(cell.textContent) === desired; });
    if (index < 0) index = 0;
    selectedKey = columns[index] ? dateKey(columns[index].textContent) : '';
    columns.forEach(function (cell, i) {
      var button = document.createElement('button'); button.type = 'button';
      var text = cell.textContent.trim();
      var day = text.replace(/\d.*$/, '').trim();
      var date = /\d{1,2}\.\d{1,2}\.\d{4}\b/.exec(text);
      button.textContent = day.slice(0, 3) + (date ? '\n' + date[0].replace(/\.\d{4}$/, '') : '');
      button.style.whiteSpace = 'pre-line';
      button.setAttribute('aria-label', day + ' ' + (date ? date[0] : ''));
      button.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      button.addEventListener('click', function () { selectedKey = dateKey(cell.textContent); repaint(); });
      picker.appendChild(button);
    });
    if (columns[index]) {
      var selectedText = columns[index].textContent.trim();
      var selectedDate = /\d{1,2}\.\d{1,2}\.\d{4}/.exec(selectedText);
      caption.textContent = selectedText.replace(/\d.*$/, '').trim() + (selectedDate ? ' · ' + selectedDate[0] : '');
    }
    table.querySelectorAll('tbody tr').forEach(function (row) {
      Array.from(row.children).forEach(function (cell, i) { cell.classList.toggle('kemal-active-day', i === index + 1); });
    });
  }
  new MutationObserver(repaint).observe(container, { childList: true });
  repaint();
})();
