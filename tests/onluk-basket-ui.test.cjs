const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const R = require('../js/onluk-basket-rules.js');
function setup({count=2,seconds=0,mode='place',portrait=false,start=true}={}) {
  const {window,document}=parseHTML(fs.readFileSync('oyun/onluk-basket.html','utf8'));
  let clock=100,frame; const captured=new WeakMap();
  for(const [id,value] of Object.entries({'ob-players':count,'ob-duration':seconds,'ob-mode':mode,'ob-range':99}))
    Object.defineProperty(document.getElementById(id),'value',{value:String(value),writable:true,configurable:true});
  document.getElementById('ob-audio').checked=false;
  window.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:100,height:60};};
  window.HTMLElement.prototype.setPointerCapture=function(id){captured.set(this,id);};
  window.HTMLElement.prototype.hasPointerCapture=function(id){return captured.get(this)===id;};
  window.HTMLElement.prototype.releasePointerCapture=function(){captured.delete(this);};
  window.HTMLElement.prototype.animate=function(){return {cancel(){},pause(){},play(){}};};
  window.OnlukBasketRules=R;
  const context={window,document,matchMedia:q=>({matches:q.includes('orientation')?portrait:false}),
    performance:{now:()=>clock},requestAnimationFrame:cb=>{frame=cb;},
    localStorage:{getItem:()=>null,setItem(){}},console};
  vm.runInNewContext(fs.readFileSync('js/onluk-basket.js','utf8'),context);
  function event(node,type,props={}) {const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);}
  function advance(ms) {for(let t=0;t<ms;t+=20){clock+=Math.min(20,ms-t);frame(clock);}}
  const $=s=>document.querySelector(s), lanes=()=>[...document.querySelectorAll('.ob-lane')];
  const correct=lane=>{
    const text=lane.querySelector('.ob-question').textContent, digits=text.match(/\d+/g).map(Number);
    return digits[0]*10+digits[1];
  };
  function answer(lane,n=correct(lane)) {
    [...lane.querySelectorAll('.ob-answer')].find(b=>Number(b.textContent)===n).click();
  }
  function launch(){document.getElementById('ob-open-settings').click();event(document.getElementById('ob-settings'),'submit');}
  if(start)launch();
  return {document,$,lanes,event,advance,answer,correct,captured,launch};
}
test('Gerçek denetleyici: eşzamanlı atışlar, çift atış kilidi ve bağımsız soru ilerlemesi',()=>{
  const h=setup();const [a,b]=h.lanes();h.answer(a);h.answer(a);h.answer(b);
  h.advance(1800);
  assert.equal(a.querySelector('.ob-score').textContent,'10 puan');assert.equal(b.querySelector('.ob-score').textContent,'10 puan');
  assert.equal(a.querySelector('.ob-question').textContent,b.querySelector('.ob-question').textContent);
  h.answer(a);h.advance(1800);assert.equal(a.querySelector('.ob-score').textContent,'20 puan');assert.equal(b.querySelector('.ob-score').textContent,'10 puan');
});
test('Yanlış atış aynı soruda kalır; kartlar ipucu sonrasında tekrar açılır',()=>{
  const h=setup(),a=h.lanes()[0],original=a.querySelector('.ob-question').textContent;
  const bad=[...a.querySelectorAll('.ob-answer')].find(b=>Number(b.textContent)!==h.correct(a));
  h.answer(a,Number(bad.textContent));h.advance(2800);
  assert.equal(a.querySelector('.ob-score').textContent,'0 puan');assert.equal(a.querySelector('.ob-question').textContent,original);
  assert.match(a.querySelector('.ob-feedback').textContent,/Tekrar dene/);assert.ok([...a.querySelectorAll('.ob-answer')].every(b=>!b.disabled));
});
test('Mola atış süresini durdurur; geri dönüş site kabuğunu erişilebilir yapar',()=>{
  const h=setup(),a=h.lanes()[0];h.answer(a);h.$('#ob-pause').click();h.advance(5000);
  assert.equal(a.querySelector('.ob-score').textContent,'0 puan');assert.equal(h.$('#main-content').inert,true);
  h.$('#ob-resume').click();h.advance(1800);assert.equal(a.querySelector('.ob-score').textContent,'10 puan');
  h.$('#ob-pause').click();h.$('#ob-leave').click();assert.equal(h.$('#main-content').inert,false);assert.equal(h.$('#ob-arena').hidden,true);
});
test('Süresiz tam tur tamamlanır, eşitlik gösterilir ve tekrar oyunu sıfırlar',()=>{
  const h=setup();
  for(let i=0;i<10;i++){h.lanes().forEach(l=>h.answer(l));h.advance(1800);}
  assert.equal(h.$('#ob-result').hidden,false);assert.equal(h.$('#ob-result-title').textContent,'Dostluk kazandı!');
  assert.equal(h.document.querySelectorAll('.ob-result-card').length,2);
  h.$('#ob-retry').click();assert.equal(h.$('#ob-result').hidden,true);assert.equal(h.$('.ob-score').textContent,'0 puan');assert.equal(h.$('#ob-courts').inert,false);
});
test('Süre bitince yeni atış yok, son atış tamamlanır ve sonuç ekranı açılır',()=>{
  const h=setup({count:1,seconds:60}),a=h.lanes()[0];
  h.advance(59500);h.answer(a);h.advance(2500);
  assert.equal(h.$('#ob-result').hidden,false);assert.match(h.$('.ob-result-card').textContent,/10 puan/);
  assert.equal(h.$('#ob-clock').textContent,'0 sn');
});
test('İki dokunma farklı topları yakalar; iptal puan kazandırmaz, bırakma bağımsızdır',()=>{
  const h=setup(),[a,b]=h.lanes(),ballA=a.querySelector('.ob-ball'),ballB=b.querySelector('.ob-ball');
  h.event(ballA,'pointerdown',{pointerId:11,clientY:10,clientX:10,pointerType:'touch'});
  h.event(ballB,'pointerdown',{pointerId:12,clientY:10,clientX:10,pointerType:'touch'});
  assert.equal(h.captured.get(ballA),11);assert.equal(h.captured.get(ballB),12);
  h.event(ballA,'pointercancel');assert.equal(h.captured.get(ballA),undefined);assert.equal(h.captured.get(ballB),12);
  h.event(ballB,'pointermove',{pointerId:12,clientY:35,clientX:50});
  h.event(ballB,'pointerup',{pointerId:12,clientY:35,clientX:50});h.advance(900);
  assert.equal(a.querySelector('.ob-score').textContent,'0 puan');assert.notEqual(b.querySelector('.ob-feedback').textContent,'Sayıya dokun, top otomatik atılsın!');
});
test('Blok kipinde her onluk tam 10 küptür ve üç oyuncuda aynı model gösterilir',()=>{
  const h=setup({count:3,mode:'blocks',portrait:true});const labels=h.lanes().map(l=>l.querySelector('.ob-blocks').getAttribute('aria-label'));
  assert.equal(new Set(labels).size,1);h.lanes().forEach(l=>{l.querySelectorAll('.ob-rod').forEach(r=>assert.equal(r.children.length,10));});
});
test('Tek bir sayı tıklaması atışı başlatır; ek atış düğmesi yoktur',()=>{
  const h=setup(),a=h.lanes()[0];assert.equal(h.$('.ob-shoot'),null);
  h.answer(a);assert.equal(a.querySelector('.ob-feedback').textContent,'Top havada…');
  assert.ok([...a.querySelectorAll('.ob-answer')].every(b=>b.disabled));
  h.advance(900);assert.equal(a.querySelector('.ob-score').textContent,'10 puan');
});
test('Yanlış cevaba tek dokunuş da aynı atış akışındadır; doğru seçenek davranışla ele verilmez',()=>{
  const h=setup(),a=h.lanes()[0];const bad=[...a.querySelectorAll('.ob-answer')].find(b=>Number(b.textContent)!==h.correct(a));
  bad.click();assert.equal(a.querySelector('.ob-feedback').textContent,'Top havada…');
  h.advance(2800);assert.equal(a.querySelector('.ob-score').textContent,'0 puan');h.answer(a);h.advance(1800);
  assert.equal(a.querySelector('.ob-score').textContent,'10 puan');
});
test('Ok tuşuyla nişan alma kendiliğinden atış yapmaz; boşluk tuşu atar',()=>{
  const h=setup(),a=h.lanes()[0],ball=a.querySelector('.ob-ball');
  h.event(ball,'keydown',{key:'ArrowRight'});assert.match(a.querySelector('.ob-feedback').textContent,/seçildi/);
  assert.ok([...a.querySelectorAll('.ob-answer')].every(b=>!b.disabled));
  h.event(ball,'keydown',{key:' '});assert.equal(a.querySelector('.ob-feedback').textContent,'Top havada…');
});
test('Katmanlı kapak ve ayarlar birbirinin yerine açılır, geri dönüş tercihleri korur',()=>{
  const h=setup({start:false});
  assert.equal(h.$('#ob-stage').dataset.screen,'cover');assert.equal(h.$('#ob-prep').hidden,true);
  h.$('#ob-open-settings').click();assert.equal(h.$('#ob-cover').hidden,true);assert.equal(h.$('#ob-prep').hidden,false);
  assert.equal(h.$('#ob-open-settings').getAttribute('aria-expanded'),'true');
  h.$('#ob-names input').value='Deniz';h.$('#ob-back-cover').click();assert.equal(h.$('#ob-cover').hidden,false);assert.equal(h.$('#ob-prep').hidden,true);
  h.$('#ob-open-settings').click();assert.equal(h.$('#ob-names input').value,'Deniz');
  h.event(h.document,'keydown',{key:'Escape'});assert.equal(h.$('#ob-stage').dataset.screen,'cover');
  assert.ok(h.$('#ob-stage').contains(h.$('#ob-cover'))&&h.$('#ob-stage').contains(h.$('#ob-prep')));
});
test('Gizli kapaktan form gönderilmez; ayarlardan maça ve ayarlara dönüş çalışır',()=>{
  const h=setup({start:false});h.event(h.$('#ob-settings'),'submit');assert.equal(h.$('#ob-arena').hidden,true);
  h.launch();assert.equal(h.lanes().length,2);h.event(h.$('#ob-settings'),'submit');assert.equal(h.lanes().length,2);
  h.$('#ob-pause').click();h.$('#ob-leave').click();assert.equal(h.$('#ob-stage').dataset.screen,'settings');assert.equal(h.$('#ob-cover').hidden,true);
  assert.equal(h.$('#ob-prep').hidden,false);assert.equal(h.$('#ob-arena').hidden,true);
});
test('Maç özeti seçilen oyuncu sayısı ve süreye göre güncellenir',()=>{
  const h=setup({count:3,seconds:120,start:false});h.event(h.$('#ob-players'),'change');
  assert.equal(h.$('#ob-names').children[2].hidden,false);assert.equal(h.$('#ob-match-summary').textContent,'3 oyuncu · 120 saniye · 10–99');
});
