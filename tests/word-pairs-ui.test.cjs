const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),R=require('../js/word-pairs-rules.js'),D=require('../js/word-pairs-data.js');
function setup(kind='puzzle',players=2){
 const requireGeometry=require('../js/word-jigsaw.js'),requireTowers=require('../js/word-tower-rules.js');
 const html=fs.readFileSync('oyun/'+(kind==='puzzle'?'zitlar-atolyesi':'es-anlam-kuleleri')+'.html','utf8'),{window,document}=parseHTML(html),timeouts=[],frames=[];let state;
 const $=s=>document.querySelector(s);document.elementFromPoint=()=>null;window.WordJigsaw=requireGeometry;window.WordTowers=requireTowers;window.WordPairsData=D;window.WordPairsRules={...R,create:(kind,options)=>state=R.create(kind,options,54)};window.matchMedia=q=>({matches:q.includes('reduced-motion')});window.innerWidth=1280;window.innerHeight=800;window.SVGElement.prototype.click=function(){this.dispatchEvent(new window.Event('click',{bubbles:true}));};window.GameViewport={watch:()=>{}};
 for(const id of ['wg-grade','wg-rounds','wg-pace'])Object.defineProperty(document.getElementById(id),'value',{writable:true,value:id==='wg-grade'?'2':id==='wg-rounds'?'3':'0'});
 const ro=class{observe(){}};window.ResizeObserver=ro;
 const raf=fn=>{frames.push(fn);return frames.length;};const context={window,document,console,CustomEvent:window.CustomEvent,ResizeObserver:ro,requestAnimationFrame:raf,setTimeout:fn=>timeouts.push(fn),performance:{now:()=>0}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/word-pairs-games.js','utf8'),context);
 function event(el,type,props={}){const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);el.dispatchEvent(e);}
 function start(){const radios=[...document.querySelectorAll('input[name="players"]')];radios.forEach(r=>{if(r.value===String(players)){r.setAttribute('checked','');r.checked=true;}else{r.removeAttribute('checked');r.checked=false;}});event($('#wg-settings'),'submit');}
 return {$,window,document,start,event,state:()=>state,runTimers:()=>timeouts.splice(0).forEach(f=>f()),frame:t=>frames.splice(0).forEach(f=>f(t))};
}
test('Her oyun ayrı sayfada, gerçek site çerçevesiyle ve açık bir başlatma düğmesiyle açılır',()=>{
 for(const kind of ['puzzle','blocks']){const h=setup(kind);assert.equal(h.$('body').dataset.wordGame,kind);assert.ok(h.$('script[src^="/js/site.js"]'));assert.match(h.$('#wg-settings button[type="submit"]').textContent,/Oyunu Başlat/);assert.doesNotMatch(h.document.toString(),/__[A-Z_]+__/);h.$('#wg-open-settings').click();assert.equal(h.$('#wg-setup').hidden,false);assert.equal(h.$('#wg-cover').hidden,true);h.start();assert.equal(h.$('#wg-arena').hidden,false);assert.equal(h.$('#wg-setup').hidden,true);assert.equal(h.document.querySelectorAll('.wg-lane').length,2);}
});
test('Dokunarak seçme ve yerleştirme resmi açık tutar; rakibin seçimi korunur',()=>{
 const h=setup();h.start();const s=h.state(),pair=s.levels[0].slots[0],other=s.levels[0].slots[1];h.$('[data-player="1"] [data-piece="'+other.id+'"]').click();h.$('[data-player="0"] [data-piece="'+pair.id+'"]').click();h.$('[data-player="0"] [data-slot="0"]').click();assert.ok(h.$('[data-player="0"] [data-slot="0"]').classList.contains('solved'));assert.ok(h.$('[data-player="0"] [data-piece="'+pair.id+'"]').classList.contains('placed'));assert.equal(h.$('[data-player="1"] [data-piece="'+other.id+'"]').getAttribute('aria-pressed'),'true');assert.match(h.$('[data-player="0"] .wg-score').textContent,/100/);
});
test('İki eşzamanlı sürükleme birbirinin hedefini ve puanını değiştirmez',()=>{
 const h=setup();h.start();const pair=h.state().levels[0].slots[0];const targets=[0,1].map(id=>h.$('[data-player="'+id+'"] [data-piece="'+pair.id+'"]'));
 targets.forEach((el,id)=>h.event(el,'pointerdown',{button:0,pointerId:id+1,clientX:10,clientY:10}));targets.forEach((el,id)=>h.event(el,'pointermove',{pointerId:id+1,clientX:100,clientY:80}));assert.equal(h.document.querySelectorAll('.wg-drag-ghost').length,2);
 h.document.elementFromPoint=()=>h.$('[data-player="0"] [data-slot="0"]');h.event(targets[0],'pointerup',{pointerId:1,clientX:100,clientY:80});assert.equal(h.state().players[0].score,100);assert.equal(h.state().players[1].score,0);
 h.document.elementFromPoint=()=>h.$('[data-player="1"] [data-slot="0"]');h.event(targets[1],'pointerup',{pointerId:2,clientX:100,clientY:80});assert.equal(h.state().players[1].score,100);assert.equal(h.document.querySelectorAll('.wg-drag-ghost').length,0);
});
test('Sürüklemeyi iptal etme ve rakibin alanına bırakma hata sayılmaz',()=>{
 const h=setup();h.start();const pair=h.state().levels[0].slots[0],el=h.$('[data-player="0"] [data-piece="'+pair.id+'"]');h.event(el,'pointerdown',{button:0,pointerId:1,clientX:0,clientY:0});h.event(el,'pointermove',{pointerId:1,clientX:50,clientY:50});h.event(el,'pointercancel',{pointerId:1});assert.equal(h.state().players[0].errors,0);assert.equal(h.document.querySelectorAll('.wg-drag-ghost').length,0);
 h.event(el,'pointerdown',{button:0,pointerId:2,clientX:0,clientY:0});h.event(el,'pointermove',{pointerId:2,clientX:50,clientY:50});h.document.elementFromPoint=()=>h.$('[data-player="1"] [data-slot="0"]');h.event(el,'pointerup',{pointerId:2,clientX:50,clientY:50});assert.equal(h.state().players[0].errors,0);
});
test('Tetris parçası iki sözcükten oluşur, dönüş ve yığılma gerçek tahtayı değiştirir',()=>{
 const h=setup('blocks');h.start();const s=h.state(),p=s.players[0];assert.equal(h.document.querySelectorAll('[data-player="0"] .is-falling').length,2);assert.equal(h.$('.wg-base-row'),null);h.$('[data-player="0"] [data-rotate]').click();assert.equal(p.piece.rotation,1);h.$('[data-player="0"] [data-drop]').click();assert.ok(['clear','settle'].includes(p.phase));assert.ok(p.board.flat().filter(Boolean).length>=4);assert.equal(s.players[1].drops,0);
});
test('Mola oyunu engeller; devam ve menüden yeni oyuna geçiş doğru çalışır',()=>{
 const h=setup('blocks');h.start();h.$('#wg-pause').click();assert.equal(h.state().paused,true);assert.equal(h.$('#wg-overlay').hidden,false);assert.equal(h.$('#wg-arena').inert,true);h.$('#wg-overlay-actions button').click();assert.equal(h.state().paused,false);h.$('#wg-menu').click();h.$('#wg-overlay-actions button:nth-child(2)').click();assert.equal(h.$('#wg-setup').hidden,false);assert.equal(h.$('#wg-arena').hidden,true);
});
test('Adlar HTML olarak yorumlanmaz ve sonuç ekranı tekrar sözcüklerini gösterir',()=>{
 const h=setup('puzzle',1);h.$('#wg-name-1').value='<img src=x onerror=alert(1)>';h.$('#wg-rounds').value='1';h.start();const s=h.state();assert.equal(h.document.querySelectorAll('.wg-player-name img').length,0);const l=s.levels[0];l.slots.forEach((pair,i)=>{h.$('[data-player="0"] [data-piece="'+pair.id+'"]').click();h.$('[data-player="0"] [data-slot="'+i+'"]').click();});h.runTimers();assert.equal(h.$('#wg-overlay').hidden,false);assert.match(h.$('#wg-overlay-content').textContent,/600 puan/);assert.ok(h.$('.wg-review-list').textContent.includes(l.slots[0].example));
});
test('Telefonda 12 ve 20 parçada oyuncu alanları okunaklı tek alan düzenine geçer',()=>{
 const h=setup();h.window.innerWidth=390;h.window.innerHeight=844;h.start();const s=h.state();s.levels[0].slots.forEach((pair,i)=>{h.$('[data-player="0"] [data-piece="'+pair.id+'"]').click();h.$('[data-player="0"] [data-slot="'+i+'"]').click();});h.$('[data-player="0"] .wg-lane-finish button').click();h.frame(1);assert.ok(h.$('#wg-arena').classList.contains('is-focus'));h.$('[data-player="1"] .wg-open-lane').click();assert.equal(h.$('#wg-arena').dataset.focus,'1');
});
test('İkinci oyuncu da bitince bekleme yazısı kalkar ve ortak sonuç açılır',()=>{
 const h=setup();h.$('#wg-rounds').value='1';h.start();const s=h.state();for(let id=0;id<2;id++)s.levels[0].slots.forEach((pair,i)=>{h.$('[data-player="'+id+'"] [data-piece="'+pair.id+'"]').click();h.$('[data-player="'+id+'"] [data-slot="'+i+'"]').click();});assert.doesNotMatch(h.$('#wg-arena').textContent,/Arkadaşın kendi/);h.runTimers();assert.equal(h.$('#wg-overlay-title').textContent,'Birlikte Zirvedesiniz!');
});
