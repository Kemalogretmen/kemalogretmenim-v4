const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const R = require('../js/onluk-basket-rules.js');
function rng(seed=31) { return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}; }
test('Türkçe 0–99 okunuşları ve onluk sınırları',()=>{
  const samples={0:'sıfır',10:'on',14:'on dört',20:'yirmi',37:'otuz yedi',40:'kırk',60:'altmış',70:'yetmiş',80:'seksen',99:'doksan dokuz'};
  for(const [n,text] of Object.entries(samples)) assert.equal(R.read(Number(n)),text);
  for(const bad of [-1,100,3.5,NaN,'10']) assert.throws(()=>R.read(bad),RangeError);
});
test('Her sayı için dört farklı, sınır içinde ve tek doğru seçenek',()=>{
  for(const max of [30,60,99]) for(let n=10;n<=max;n++) for(let seed=1;seed<=20;seed++){
    const options=R.options(n,max,rng(seed));assert.equal(options.length,4);assert.equal(new Set(options).size,4);
    assert.equal(options.filter(v=>v===n).length,1);assert.ok(options.every(v=>Number.isInteger(v)&&v>=10&&v<=max));
  }
});
test('Karışık soru sırası bütün kipleri içerir ve tüm sayılar bir kez gelir',()=>{
  for(const max of [30,60,99]) {
    const deck=R.deck(max,'mixed',rng());assert.equal(deck.length,max-9);
    assert.equal(new Set(deck.map(q=>q.number)).size,max-9);
    assert.deepEqual(new Set(deck.map(q=>q.mode)),new Set(['place','blocks','reading']));
    deck.forEach(q=>{assert.equal(q.tens*10+q.units,q.number);assert.ok(q.units>=0&&q.units<=9);});
  }
});
test('Sabit kip korunur ve rastgele dizi giriş verisini değiştirmez',()=>{
  for(const mode of ['place','blocks','reading'])assert.ok(R.deck(99,mode,rng()).every(q=>q.mode===mode));
  const list=[1,2,3];R.shuffle(list,rng());assert.deepEqual(list,[1,2,3]);
  assert.throws(()=>R.deck(100));assert.throws(()=>R.deck(30,'bad'));assert.throws(()=>R.options(9,30));
});
const initial=()=>({question:{number:37},choices:[37,73,36,38],done:false,busy:false,attempts:0,mistakes:0,score:0,solved:0,streak:0});
test('Doğru cevap +10, yanlışta aynı soru ve puan korunur',()=>{
  const p=initial(), bad=R.answer(p,73);assert.equal(bad.score,0);assert.equal(bad.mistakes,1);assert.equal(bad.question.number,37);assert.equal(bad.solved,0);
  const good=R.answer({...bad,busy:false},37);assert.equal(good.score,10);assert.equal(good.solved,1);assert.equal(good.attempts,2);assert.equal(p.attempts,0);
});
test('Çift atış, bitmiş oyuncu ve seçenek dışı cevap puan kazandırmaz',()=>{
  const p=R.answer(initial(),37);assert.equal(R.answer(p,37).score,10);
  assert.equal(R.answer({...initial(),done:true},37).score,0);assert.equal(R.answer(initial(),99).attempts,0);
});
test('Oyuncuların puanları bağımsızdır; eşitlik birden çok kazanan döndürür',()=>{
  const a=initial(),b=initial();R.answer(a,37);assert.equal(b.score,0);
  assert.deepEqual(R.winners([{name:'A',score:10},{name:'B',score:10},{name:'C',score:0}]),['A','B']);
});
test('Tarayıcı sözleşmesi: gerçek site kabuğu, bağımsız pointer capture, iptal ve zaman sınırı',()=>{
  const html=fs.readFileSync('oyun/onluk-basket.html','utf8'), js=fs.readFileSync('js/onluk-basket.js','utf8'), css=fs.readFileSync('css/onluk-basket.css','utf8');
  new vm.Script(js);new vm.Script(fs.readFileSync('js/onluk-basket-rules.js','utf8'));
  assert.match(html,/\/js\/site\.js/);assert.match(html,/\/js\/site-data\.js/);
  assert.match(js,/setPointerCapture\(e.pointerId\)/);assert.match(js,/pointercancel/);assert.match(js,/visibilitychange/);
  assert.match(js,/remaining<=0/);assert.match(js,/prefers-reduced-motion/);assert.match(css,/touch-action:none/);
  assert.match(css,/grid-template-rows:repeat\(var\(--players,2\),minmax\(0,1fr\)\)/);
});
