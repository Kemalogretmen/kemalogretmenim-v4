const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const Fit=require('../js/game-viewport.js');
test('viewport budget reserves the actual navigation and dock, including a short laptop',()=>{
  assert.equal(Fit.budget(720,110,99),495);
  assert.equal(Fit.budget(844,108,105),615);
  assert.equal(Fit.budget(568,108,105),339);
});
test('36 memory cards choose a readable wide grid on laptops and a 6×6 grid on phones',()=>{
  const desktop=Fit.memoryLayout(1170,285,18,6),phone=Fit.memoryLayout(364,430,18,6);
  assert.equal(desktop.cols,12);assert.equal(desktop.rows,3);assert.ok(desktop.cell>=70);
  assert.equal(phone.cols,6);assert.equal(phone.rows,6);assert.ok(phone.cell>=50);
  for(const [width,height] of [[280,170],[364,430],[730,190],[1024,330],[1920,650]]){
    const layout=Fit.memoryLayout(width,height,18,6);
    assert.equal(layout.cols*layout.rows,36);assert.ok(layout.width<=width);assert.ok(layout.height<=height);
  }
});
test('younger levels keep every pair and fit both width and height',()=>{
  for(const [pairs,cols] of [[6,4],[8,4],[10,5]])for(const [w,h] of [[280,180],[350,420],[950,320]]){
    const fit=Fit.memoryLayout(w,h,pairs,cols);assert.equal(fit.cols,cols);assert.equal(fit.cols*fit.rows,pairs*2);assert.ok(fit.width<=w);assert.ok(fit.height<=h);
  }
});
test('viewport watcher recalculates after resizing and excludes a hidden shortcut bar',()=>{
  const {window,document}=parseHTML('<html><body><div id="kemalNavMount"></div><div id="shortcutDockBar"></div><main></main></body></html>');
  const nav=document.getElementById('kemalNavMount'),dock=document.getElementById('shortcutDockBar'),host=document.querySelector('main');
  window.innerHeight=720;let hidden=false;window.getComputedStyle=el=>({display:el===dock&&hidden?'none':'block',visibility:'visible'});
  nav.getBoundingClientRect=()=>({height:110,width:1280,bottom:110});dock.getBoundingClientRect=()=>({height:81,width:900,top:627});
  const frames=[];window.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};window.cancelAnimationFrame=()=>{};
  const watcher=Fit.watch(window,host);watcher.fit();assert.equal(host.style.getPropertyValue('--play-height'),'495px');
  hidden=true;watcher.fit();assert.equal(host.style.getPropertyValue('--play-height'),'586px');
  window.innerHeight=568;watcher.fit();assert.equal(host.style.getPropertyValue('--play-height'),'434px');watcher.stop();
});
function memory(){
  const {window,document}=parseHTML(fs.readFileSync('oyun/esini-bul-hafiza.html','utf8'));
  const timers=[];window.setTimeout=fn=>{timers.push(fn);return timers.length;};window.setInterval=()=>1;window.clearInterval=()=>{};
  const ctx={document,window,console,GameViewport:{...Fit,watch(){return {};}}};vm.createContext(ctx);
  const scripts=[...fs.readFileSync('oyun/esini-bul-hafiza.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  vm.runInContext(scripts,ctx);return {window,document,ctx,timers};
}
test('memory level 7 keeps matched symbols visible, scores the right player and switches only on a miss',()=>{
  const h=memory();h.document.querySelector('[data-age="7"]').click();h.document.querySelector('[data-mode="duo"]').click();
  h.document.getElementById('startGameBtn').click();
  const cards=h.document.querySelectorAll('.card-btn');assert.equal(cards.length,36);
  const pair=vm.runInContext('state.cards.findIndex((c,i)=>i>0&&c.pair===state.cards[0].pair)',h.ctx);
  cards[0].click();cards[pair].click();h.timers.shift()();
  assert.equal(h.document.querySelectorAll('.is-found').length,2);assert.equal(h.document.getElementById('pairText').textContent,'1/18');
  assert.match(h.document.getElementById('turnName').textContent,/Oyuncu 1/);assert.match(h.document.querySelector('.is-found').getAttribute('aria-label'),/Bulundu/);
  const miss=vm.runInContext('(()=>{const a=state.cards.findIndex(c=>!c.found);const b=state.cards.findIndex(c=>!c.found&&c.pair!==state.cards[a].pair);return [a,b]})()',h.ctx);
  cards[miss[0]].click();cards[miss[1]].click();h.timers.shift()();assert.match(h.document.getElementById('turnName').textContent,/Oyuncu 2/);
});
test('memory starts explicitly from settings, preserving age/mode and unlocking the board',()=>{
  const h=memory(),$=id=>h.document.getElementById(id);
  assert.equal($('setupScreen').classList.contains('hidden'),false);
  h.document.querySelector('.card-btn').click();assert.equal(h.document.querySelectorAll('.card-btn.is-open').length,0);
  h.document.querySelector('[data-age="7"]').click();h.document.querySelector('[data-mode="duo"]').click();
  $('startGameBtn').click();assert.ok($('setupScreen').classList.contains('hidden'));assert.equal($('setupToggle').getAttribute('aria-expanded'),'false');
  assert.equal(h.document.querySelector('.board-wrap').inert,false);assert.equal(h.document.querySelectorAll('.card-btn').length,36);assert.match($('turnName').textContent,/Oyuncu 1/);
  h.document.querySelector('.card-btn').click();assert.equal(h.document.querySelectorAll('.card-btn.is-open').length,1);
  $('setupToggle').click();assert.equal(h.document.querySelector('.board-wrap').inert,true);assert.equal($('setupScreen').classList.contains('hidden'),false);
  $('startGameBtn').click();assert.equal(h.document.querySelectorAll('.card-btn.is-open').length,0);assert.equal($('moveText').textContent,'0');
});
test('a new start cancels the previous pending pair check',()=>{
  const h=memory();h.document.getElementById('startGameBtn').click();
  const cards=h.document.querySelectorAll('.card-btn');cards[0].click();cards[1].click();
  h.document.getElementById('startGameBtn').click();h.timers.shift()();
  assert.equal(h.document.getElementById('pairText').textContent,'0/6');assert.equal(h.document.getElementById('moveText').textContent,'0');
  assert.equal(h.document.querySelectorAll('.card-btn.is-found').length,0);
});
test('game pages retain shared site chrome and load the height fitting module',()=>{
  for(const path of ['oyun/kizma_birader.html','oyun/esini-bul-hafiza.html']){
    const html=fs.readFileSync(path,'utf8');assert.match(html,/game-viewport\.css/);assert.match(html,/game-viewport\.js/);assert.match(html,/\/js\/site\.js/);
    for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);
  }
});
