const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const R=require('../js/carpim-kanatlari-rules.js');

test('ten distinct islands cover every multiplication table from one through ten',()=>{
  assert.deepEqual(R.FACTORS,[1,2,3,4,5,6,7,8,9,10]);assert.equal(R.ISLANDS.length,10);assert.equal(new Set(R.ISLANDS.map(i=>i.kind)).size,10);
  for(let level=0;level<10;level++)for(let run=0;run<100;run++){
    const deck=R.deck(level);assert.equal(deck.length,6);assert.equal(new Set(deck.map(q=>q.b)).size,6);assert.equal(deck.filter(q=>q.b<=5).length,3);
    for(const q of deck){assert.equal(q.a,R.FACTORS[level]);assert.equal(q.answer,q.a*q.b);assert(q.b>=1&&q.b<=10);const answers=R.options(q);assert.equal(new Set(answers).size,3);assert(answers.includes(q.answer));assert(answers.every(n=>n>=0&&Number.isInteger(n)));}
  }
});
function harness({storageFail=false,initialStorage={},reducedMotion=false}={}){
  const {window,document}=parseHTML(fs.readFileSync('oyun/carpim-kanatlari.html','utf8'));
  const noop=()=>{};const gradient={addColorStop:noop};const ctx=new Proxy({createLinearGradient:()=>gradient},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
  window.HTMLElement.prototype.getBoundingClientRect=()=>({width:800,height:420,left:0,top:0});
  for(const c of document.querySelectorAll('canvas')){c.getContext=()=>ctx;c.getBoundingClientRect=()=>({width:800,height:420,left:0,top:0});}
  window.HTMLCanvasElement.prototype.getContext=()=>ctx;window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:800,height:420,left:0,top:0});
  window.HTMLCanvasElement.prototype.setPointerCapture=noop;window.HTMLCanvasElement.prototype.releasePointerCapture=noop;
  window.matchMedia=()=>({matches:reducedMotion});window.CarpimKanatlariRules=R;
  const storage=new Map(Object.entries(initialStorage));const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(storageFail)throw Error('storage denied');storage.set(k,v);}};
  let tick=0,callback;const sandbox={window,document,console,localStorage,requestAnimationFrame:fn=>(callback=fn,1),cancelAnimationFrame:noop,ResizeObserver:class{observe(){}},CustomEvent:window.CustomEvent};
  vm.runInNewContext(fs.readFileSync('js/carpim-kanatlari.js','utf8'),sandbox);
  function event(el,type,props={}){const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);el.dispatchEvent(e);}
  function frames(ms){for(let i=0;i<Math.ceil(ms/25);i++){tick+=25;callback(tick);}}
  const click=id=>event(document.getElementById(id),'click',{detail:0});
  function start(){click('ck-open-lobby');click('ck-start');frames(2000);}
  function aim(index,correct=true,props={}){const lane=document.querySelectorAll('.ck-lane')[index];const m=lane.querySelector('.ck-equation').textContent.match(/(\d+) × (\d+)/),product=Number(m[1])*Number(m[2]);const b=[...lane.querySelectorAll('.ck-target-label')].find(b=>!b.disabled&&(Number(b.textContent)===product)===correct);event(b,'pointerdown',{button:0,pointerId:index+1,isPrimary:index===0,...props});return b;}
  function shoot(index,correct=true){aim(index,correct);event(document.querySelectorAll('.ck-lane')[index].querySelector('.ck-fire'),'click');frames(6000);}
  return{document,storage,click,start,event,frames,aim,shoot,lanes:()=>[...document.querySelectorAll('.ck-lane')]};
}
test('mixed decks use only unique selected tables, cover every selection evenly and never repeat a pair',()=>{
  assert.deepEqual(R.normalizeFactors([1,2,3,5,5,'10',0,11,1.5,NaN]),[1,2,3,5,10]);assert.deepEqual(R.mixedDeck([]),[]);
  for(const factors of [[1],[10],[1,2,3,5,5],[2,7,9],R.FACTORS])for(let run=0;run<100;run++){
    const selected=R.normalizeFactors(factors),qs=R.mixedDeck(factors),counts=selected.map(a=>qs.filter(q=>q.a===a).length);assert.equal(qs.length,10);assert.equal(new Set(qs.map(q=>q.a+':'+q.b)).size,10);assert(Math.min(...counts)>=1);assert(Math.max(...counts)-Math.min(...counts)<=1);
    for(const q of qs){assert(selected.includes(q.a));assert(q.b>=1&&q.b<=10);assert.equal(q.answer,q.a*q.b);assert(R.options(q).includes(q.answer));}
  }
});
test('mixed table choices require at least one selection and survive mode changes',()=>{
  const h=harness(),el=id=>h.document.getElementById(id);h.click('ck-open-lobby');h.event(h.document.querySelector('[data-journey="mixed"]'),'click');assert(!el('ck-mixed-settings').hidden);
  const options=[...h.document.querySelectorAll('.ck-factor-option')];for(const b of options.filter(b=>b.getAttribute('aria-pressed')==='true'))h.event(b,'click');assert(el('ck-start').disabled);assert.match(el('ck-mixed-summary').textContent,/En az bir/);h.click('ck-start');h.frames(2000);assert(el('ck-arena').hidden);assert(el('ck-zoom').hidden);
  h.event(options[9],'click');assert(!el('ck-start').disabled);assert.equal(h.document.querySelectorAll('.ck-island:not(:disabled)').length,1);assert.match(el('ck-island-info').textContent,/10 ile çarpma/);
  h.event(h.document.querySelector('[data-journey="campaign"]'),'click');assert(el('ck-mixed-settings').hidden);assert.equal(h.document.querySelectorAll('.ck-island:not(:disabled)').length,1);assert.match(el('ck-island-info').textContent,/1 ile çarpma/);h.event(h.document.querySelector('[data-journey="mixed"]'),'click');assert.equal(options[9].getAttribute('aria-pressed'),'true');assert.match(el('ck-island-info').textContent,/10 ile çarpma/);
});
test('two-player mixed round shares all ten questions and leaves island progress and records untouched',()=>{
  const original=JSON.stringify({unlocked:3,best:{0:720,3:600}}),h=harness({initialStorage:{'kemal-carpim-kanatlari-v3':original}});h.event(h.document.querySelector('[data-journey="mixed"]'),'click');h.event(h.document.querySelector('[data-factor="4"]'),'click');h.start();const counts=new Map();
  for(let round=0;round<10;round++){
    const equation=h.lanes()[0].querySelector('.ck-equation').textContent;assert.equal(equation,h.lanes()[1].querySelector('.ck-equation').textContent);const a=Number(equation.match(/^(\d+)/)[1]);assert([1,2,3,5].includes(a));counts.set(a,(counts.get(a)||0)+1);assert.equal(h.lanes()[0].querySelector('.ck-island-badge').textContent,'×'+a);assert.equal(h.lanes()[0].querySelector('.ck-target-count').textContent,round+'/10');
    if(round===0){h.shoot(0,false);assert.equal(h.lanes()[0].querySelector('.ck-equation').textContent,equation);assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'4');}h.shoot(0);assert(h.document.getElementById('ck-result').hidden);h.shoot(1);
  }
  assert.deepEqual([...counts.keys()].sort(),[1,2,3,5]);assert(Math.max(...counts.values())-Math.min(...counts.values())<=1);assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 1180');assert.equal(h.lanes()[1].querySelector('.ck-score').textContent,'★ 1200');assert.match(h.document.getElementById('ck-result-title').textContent,/Oyuncu 2 kazandı/);assert(h.document.getElementById('ck-next').hidden);assert.equal(h.storage.get('kemal-carpim-kanatlari-v3'),original);h.click('ck-map');assert.equal(h.document.querySelector('[data-factor="4"]').getAttribute('aria-pressed'),'false');assert.equal(h.document.querySelector('[data-journey="mixed"]').getAttribute('aria-pressed'),'true');
});
test('single-table mixed solo supports ten unique questions, one joker and a complete retry without unlocking islands',()=>{
  const h=harness({storageFail:true});h.event(h.document.querySelector('[data-mode="1"]'),'click');h.event(h.document.querySelector('[data-journey="mixed"]'),'click');for(const b of h.document.querySelectorAll('.ck-factor-option')){if((b.getAttribute('aria-pressed')==='true')!==(b.dataset.factor==='10'))h.event(b,'click');}h.start();assert(h.lanes()[0].querySelector('.ck-equation').textContent.startsWith('10 ×'));h.event(h.lanes()[0].querySelector('.ck-power'),'click');h.frames(4000);assert.equal(h.lanes()[0].querySelector('.ck-target-count').textContent,'1/10');assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 0');assert(h.lanes()[0].querySelector('.ck-power').disabled);
  for(let q=1;q<10;q++){assert(h.lanes()[0].querySelector('.ck-equation').textContent.startsWith('10 ×'));h.shoot(0);}assert.match(h.document.getElementById('ck-result-title').textContent,/Karışık tur tamamlandı/);assert.match(h.document.getElementById('ck-result-cards').textContent,/10\/10 soru/);assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 1080');assert.equal(h.storage.size,0);h.click('ck-retry');assert.equal(h.lanes()[0].querySelector('.ck-target-count').textContent,'0/10');assert(!h.lanes()[0].querySelector('.ck-power').disabled);assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'5');assert(h.lanes()[0].querySelector('.ck-equation').textContent.startsWith('10 ×'));
});
test('cover disappears; preparation overlays the same map and zooms it before gameplay starts',()=>{
  const h=harness(),el=id=>h.document.getElementById(id);assert(el('ck-lobby').hidden);assert(el('ck-arena').hidden);h.click('ck-start');assert(el('ck-zoom').hidden);
  h.click('ck-open-lobby');assert(!el('ck-lobby').hidden);assert(el('ck-cover-layer').hidden);assert.equal(el('ck-stage').dataset.screen,'lobby');assert.equal(el('ck-open-lobby').getAttribute('aria-expanded'),'true');assert.equal(el('ck-atlas').parentElement,el('ck-lobby').parentElement);
  h.event(h.document.querySelector('[data-journey="all"]'),'click');h.event(h.document.querySelectorAll('.ck-island')[6],'click');el('ck-name-0').value='Deniz';h.click('ck-start');
  const sea=h.document.querySelector('.ck-sea');assert(!el('ck-zoom').hidden);assert(el('ck-lobby').hidden);assert.equal(el('ck-stage').dataset.screen,'zoom');assert(el('ck-arena').hidden);assert(el('ck-start').disabled);assert.equal(h.lanes().length,0);assert.match(el('ck-zoom-title').textContent,/×7/);
  h.frames(900);assert.equal(h.document.querySelector('.ck-sea'),sea);assert.match(sea.style.transform,/scale\([2-5]/);h.click('ck-start');assert(el('ck-arena').hidden);h.frames(1000);assert.equal(sea.style.transform,'');assert(el('ck-zoom').hidden);assert(!el('ck-arena').hidden);assert.equal(h.lanes().length,2);assert(h.lanes()[0].querySelector('.ck-equation').textContent.startsWith('7 ×'));assert.equal(h.lanes()[0].querySelector('.ck-player-head strong').textContent,'Deniz');assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 0');
});
test('flight can be cancelled and restarted without losing settings; game returns to preparation',()=>{
  const h=harness(),el=id=>h.document.getElementById(id);h.click('ck-open-lobby');h.event(h.document.querySelector('[data-mode="1"]'),'click');h.event(h.document.querySelector('[data-journey="all"]'),'click');h.event(h.document.querySelectorAll('.ck-island')[8],'click');h.click('ck-start');h.frames(400);h.event(h.document,'keydown',{key:'Escape'});h.frames(3000);
  assert(el('ck-zoom').hidden);assert(el('ck-arena').hidden);assert(!el('ck-start').disabled);assert.equal(el('main-content').inert,false);assert.equal(h.lanes().length,0);
  h.click('ck-start');h.frames(2000);assert.equal(h.lanes().length,1);assert(h.lanes()[0].querySelector('.ck-equation').textContent.startsWith('9 ×'));h.click('ck-menu');h.click('ck-leave');assert(el('ck-arena').hidden);assert(!el('ck-lobby').hidden);assert(el('ck-cover-layer').hidden);h.click('ck-cover');assert(el('ck-lobby').hidden);assert(!el('ck-cover-layer').hidden);assert.equal(el('ck-open-lobby').getAttribute('aria-expanded'),'false');h.click('ck-open-lobby');assert.equal(h.document.querySelector('.ck-island.selected').getAttribute('aria-label').startsWith('9. ada'),true);
});
test('settings can lift away to select an island on the underlying map and return without losing choices',()=>{
  const h=harness(),el=id=>h.document.getElementById(id);h.click('ck-open-lobby');assert.equal(el('ck-atlas').inert,true);el('ck-name-0').value='Ada';h.event(h.document.querySelector('[data-journey="all"]'),'click');h.click('ck-map-pick');assert(el('ck-settings-scroll').hidden);assert.equal(el('ck-atlas').inert,false);assert.equal(el('ck-toggle-settings').getAttribute('aria-expanded'),'false');h.event(h.document.querySelectorAll('.ck-island')[9],'click');h.click('ck-toggle-settings');assert(!el('ck-settings-scroll').hidden);assert.equal(el('ck-atlas').inert,true);assert.equal(el('ck-name-0').value,'Ada');assert.match(el('ck-island-info').textContent,/10 ile çarpma/);
});
test('reduced motion enters the selected island directly without camera motion',()=>{
  const h=harness({reducedMotion:true});h.click('ck-open-lobby');h.click('ck-start');assert(h.document.getElementById('ck-zoom').hidden);assert(!h.document.getElementById('ck-arena').hidden);assert.equal(h.lanes().length,2);
});
test('backgrounding the page cancels entry without starting an unseen game',()=>{
  const h=harness();h.click('ck-open-lobby');h.click('ck-start');h.frames(500);Object.defineProperty(h.document,'hidden',{value:true,configurable:true});h.event(h.document,'visibilitychange');h.frames(3000);Object.defineProperty(h.document,'hidden',{value:false});h.frames(3000);assert(h.document.getElementById('ck-zoom').hidden);assert(h.document.getElementById('ck-arena').hidden);assert(!h.document.getElementById('ck-start').disabled);assert.equal(h.lanes().length,0);
});
test('assisted aim physically reaches every tower at phone, landscape and tablet sizes',()=>{
  for(const size of [{w:320,h:146},{w:320,h:180},{w:282,h:179},{w:390,h:300},{w:421,h:245},{w:640,h:480},{w:800,h:420}])for(let i=0;i<3;i++){
    const g=R.geometry(size),shot=R.aimAt(g,i);assert(shot);assert.equal(R.trace(shot,g).impact,i);
    const real={...shot};let result;for(let step=0;step<240;step++){result=R.step(real,1/60,g);if(result.impact!==null||result.miss)break;}assert.equal(result.impact,i);
  }
});
test('free slingshot drag can reach all three towers on small phones as well as desktops',()=>{
  for(const size of[{w:320,h:146},{w:320,h:180},{w:390,h:284},{w:421,h:245},{w:640,h:480}]){
    const g=R.geometry(size),found=new Set();
    for(let dx=16;dx<=110;dx+=2)for(let dy=-10;dy<=g.sling-g.r;dy+=2){if(Math.hypot(dx,dy)>115)continue;const hit=R.trace(R.pullShot(g,{x:g.anchor.x-dx,y:g.anchor.y+dy}),g).impact;if(hit!==null)found.add(hit);}
    assert.deepEqual([...found].sort(),[0,1,2]);
  }
});
test('two simultaneous pointers drag independently; cancelled and empty shots do not cost a life',()=>{
  const h=harness();h.start();const [a,b]=h.lanes().map(l=>l.querySelector('.ck-world')),g=R.geometry({w:800,h:420});
  for(const[c,id]of[[a,1],[b,2]])h.event(c,'pointerdown',{button:0,pointerId:id,isPrimary:id===1,clientX:g.anchor.x,clientY:g.anchor.y});
  h.event(a,'pointercancel',{pointerId:1});h.event(b,'pointermove',{pointerId:2,clientX:g.anchor.x-15,clientY:g.anchor.y+10});h.event(b,'pointerup',{pointerId:2});
  assert.equal(h.lanes()[1].querySelector('.ck-fire').textContent,'Kanatlanıyor…');assert.equal(h.lanes()[0].querySelector('.ck-fire').textContent,'Nişan al ↗');h.frames(6000);
  assert(h.lanes().every(l=>l.querySelector('.ck-lives').dataset.remaining==='5'));assert(h.lanes().every(l=>l.querySelector('.ck-score').textContent==='★ 0'));
});
test('only actual collision scores; one wrong collision costs exactly one heart and keeps the question',()=>{
  const h=harness();h.start();const initial=h.lanes()[0].querySelector('.ck-equation').textContent;h.aim(0,false);assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'5');assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 0');
  h.event(h.lanes()[0].querySelector('.ck-fire'),'click');h.event(h.lanes()[0].querySelector('.ck-fire'),'click');h.click('ck-pause');h.frames(7000);assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'5');h.click('ck-resume');h.frames(6000);
  assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'4');assert.equal(h.lanes()[0].querySelector('.ck-equation').textContent,initial);assert(h.lanes()[0].querySelectorAll('.ck-target-label').every(b=>!b.disabled));
  h.shoot(0);assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 100');assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'4');
});
test('all-islands practice ends one island after both players finish; highest score wins',()=>{
  const h=harness();h.event(h.document.querySelector('[data-journey="all"]'),'click');h.start();
  for(let round=0;round<6;round++){
    assert.equal(h.lanes()[0].querySelector('.ck-equation').textContent,h.lanes()[1].querySelector('.ck-equation').textContent);
    if(round===0)h.shoot(0,false);h.shoot(0);
    assert(h.document.getElementById('ck-result').hidden);
    h.shoot(1);
  }
  assert.equal(h.document.getElementById('ck-result').hidden,false);assert.match(h.document.getElementById('ck-result-title').textContent,/Oyuncu 2 kazandı/);assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 700');assert.equal(h.lanes()[1].querySelector('.ck-score').textContent,'★ 720');
  const saved=JSON.parse(h.storage.get('kemal-carpim-kanatlari-v3'));assert.equal(saved.unlocked,0);assert.equal(saved.best[0],720);
  h.click('ck-next');assert(h.lanes()[0].querySelector('.ck-equation').textContent.startsWith('2 ×'));
});
test('five wrong towers end only that player; all-out does not unlock an island',()=>{
  const h=harness();h.start();for(let i=0;i<5;i++)h.shoot(0,false);assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'0');assert.equal(h.lanes()[0].querySelector('.ck-wait').hidden,false);assert.equal(h.lanes()[1].querySelector('.ck-wait').hidden,true);assert(h.document.getElementById('ck-result').hidden);for(let i=0;i<5;i++)h.shoot(1,false);assert.equal(h.document.getElementById('ck-result').hidden,false);assert(h.document.getElementById('ck-next').hidden);assert.equal(JSON.parse(h.storage.get('kemal-carpim-kanatlari-v3')).unlocked,0);
});
test('each player chooses an independent bird; music and effects have separate switches',()=>{
  const h=harness();h.event(h.document.querySelectorAll('.ck-bird-group')[0].querySelectorAll('button')[3],'click');h.event(h.document.querySelectorAll('.ck-bird-group')[1].querySelectorAll('button')[2],'click');h.click('ck-music-home');assert.equal(h.document.getElementById('ck-music').getAttribute('aria-pressed'),'false');assert.equal(h.document.getElementById('ck-sound').getAttribute('aria-pressed'),'true');h.start();assert.match(h.lanes()[0].querySelector('.ck-scene-note').textContent,/Menekşe/);assert.match(h.lanes()[1].querySelector('.ck-scene-note').textContent,/Limon/);
});
test('solo, all-islands practice and denied storage stay playable on the tenth table',()=>{
  const h=harness({storageFail:true});const mode=h.document.querySelector('[data-mode="1"]');h.event(mode,'click');h.event(h.document.querySelector('[data-journey="all"]'),'click');h.event(h.document.querySelectorAll('.ck-island')[9],'click');h.start();assert.equal(h.lanes().length,1);assert(h.lanes()[0].querySelector('.ck-equation').textContent.startsWith('10 ×'));
  for(let i=0;i<6;i++)h.shoot(0);
  assert.equal(h.document.getElementById('ck-result').hidden,false);assert.equal(h.document.getElementById('ck-next').hidden,true);assert.match(h.document.getElementById('ck-result-title').textContent,/Ada tamamlandı/);assert.match(h.document.getElementById('ck-save-note').textContent,/izin vermiyor/);h.click('ck-map');assert(h.document.getElementById('ck-arena').hidden);
});
test('explosion joker is independent, single-use per island, life-safe and does not award a learned-answer bonus',()=>{
  const h=harness();h.event(h.document.querySelector('[data-journey="all"]'),'click');h.start();const power=h.lanes()[0].querySelector('.ck-power');h.event(power,'click');h.event(power,'click');h.frames(4000);
  assert.equal(h.lanes()[0].querySelector('.ck-target-count').textContent,'1/6');assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 0');assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'5');assert(power.disabled);assert(!h.lanes()[1].querySelector('.ck-power').disabled);h.event(power,'click');h.frames(4000);assert.equal(h.lanes()[0].querySelector('.ck-target-count').textContent,'1/6');
  for(let i=0;i<5;i++)h.shoot(0);for(let i=0;i<6;i++)h.shoot(1);assert.match(h.document.getElementById('ck-result-cards').textContent,/Jokerle geçilenler:/);assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 600');
});
test('each bird travels independently to the next island; hearts and power reset, scores and selected bird stay',()=>{
  const h=harness();h.event(h.document.querySelectorAll('.ck-bird-group')[0].querySelectorAll('button')[3],'click');h.start();h.event(h.lanes()[0].querySelector('.ck-power'),'click');h.frames(4000);for(let i=0;i<5;i++)h.shoot(0);
  assert.equal(h.lanes()[0].dataset.island,'2');assert.equal(h.lanes()[1].dataset.island,'1');assert.equal(h.lanes()[0].querySelector('.ck-lives').dataset.remaining,'5');assert(!h.lanes()[0].querySelector('.ck-power').disabled);assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 600');assert.match(h.lanes()[0].querySelector('.ck-scene-note').textContent,/Menekşe/);assert(h.document.getElementById('ck-result').hidden);
  for(let i=0;i<6;i++)h.shoot(1);assert.equal(h.lanes()[1].dataset.island,'2');assert.equal(h.lanes()[0].querySelector('.ck-equation').textContent,h.lanes()[1].querySelector('.ck-equation').textContent);assert.equal(JSON.parse(h.storage.get('kemal-carpim-kanatlari-v3')).unlocked,1);
});
test('a complete staged journey reaches all ten islands without prematurely ending the game',()=>{
  const h=harness();h.event(h.document.querySelector('[data-mode="1"]'),'click');h.start();
  for(let island=1;island<=10;island++){assert.equal(h.lanes()[0].dataset.island,String(island));for(let q=0;q<6;q++)h.shoot(0);if(island<10)assert(h.document.getElementById('ck-result').hidden);}
  assert.equal(h.document.getElementById('ck-result').hidden,false);assert.match(h.document.getElementById('ck-result-title').textContent,/10 adalık macera tamamlandı/);assert.equal(h.lanes()[0].querySelector('.ck-score').textContent,'★ 7200');assert.equal(JSON.parse(h.storage.get('kemal-carpim-kanatlari-v3')).unlocked,9);assert(h.document.getElementById('ck-next').hidden);
});
test('legacy progress keeps the former tenth-table record on the tenth island and maps locks correctly',()=>{
  const h=harness({initialStorage:{'kemal-carpim-kanatlari-v2':JSON.stringify({unlocked:5,best:{0:720,5:600}})}});const nodes=h.document.querySelectorAll('.ck-island');assert.equal(nodes.length,10);assert(!nodes[5].disabled);assert(nodes[6].disabled);h.event(h.document.querySelector('[data-journey="all"]'),'click');assert.match(h.document.querySelectorAll('.ck-island')[9].textContent,/600/);assert(h.document.querySelectorAll('.ck-island').every(b=>!b.disabled));
});
