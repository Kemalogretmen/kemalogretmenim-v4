/* Present existing lesson cells without duplicating records or changing the plan. */
(function () {
  if (window.KemalPlannerViewReady) return;
  window.KemalPlannerViewReady = true;
  var root = document.documentElement;
  var embedded=window.parent && window.parent!==window;
  if (embedded) root.classList.add('agenda-embedded');
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
  var mode = '';
  var media = window.matchMedia ? window.matchMedia('(max-width:700px)') : null;
  var switcher = document.createElement('div');
  switcher.className = 'planner-view-switch';
  switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Program görünümü');
  [['week','Hafta'],['day','Gün']].forEach(function(item) {
    var button=document.createElement('button');button.type='button';button.textContent=item[1];button.dataset.plannerMode=item[0];
    button.addEventListener('click',function(){mode=item[0];applyView();});switcher.appendChild(button);
  });
  var controls=document.querySelector('.planner-controls > .form-row');
  if(controls)controls.appendChild(switcher);else host.insertBefore(switcher,picker);
  var lastHeight=0, heightQueued=false;
  function applyView() {
    var view=mode || (media ? media.matches ? 'day' : 'week' : 'day');
    root.dataset.plannerView=view;
    switcher.querySelectorAll('button').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.plannerMode===view));});
    reportHeight();
  }
  if(media) {
    if(media.addEventListener)media.addEventListener('change',applyView);
    else if(media.addListener)media.addListener(applyView);
  }
  function reportHeight() {
    if(!embedded || heightQueued)return;
    heightQueued=true;
    (window.requestAnimationFrame || function(callback){callback();})(function(){
      heightQueued=false;
      var height=Math.ceil(document.body.getBoundingClientRect().height+16);
      if(!Number.isFinite(height) || height<100 || height>20000 || Math.abs(height-lastHeight)<2)return;
      lastHeight=height;
      window.parent.postMessage({type:'kemal-lesson-planner-height',height:height},window.location.origin==='null'?'*':window.location.origin);
    });
  }
  if(window.ResizeObserver)new ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('resize',reportHeight);
  window.addEventListener('message',function(event){
    if(event.source!==window.parent || event.origin!==window.location.origin)return;
    if(event.data?.type==='kemal-ajanda-measure') {lastHeight=0;reportHeight();}
  });
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
      var shortDay = {Pazartesi:'Pzt',Salı:'Sal',Çarşamba:'Çar',Perşembe:'Per',Cuma:'Cum',Cumartesi:'Cmt',Pazar:'Paz'}[day] || day.slice(0,3);
      button.textContent = shortDay + (date ? '\n' + date[0].replace(/\.\d{4}$/, '') : '');
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
    reportHeight();
  }
  new MutationObserver(repaint).observe(container, { childList: true });
  repaint();
  applyView();
})();
