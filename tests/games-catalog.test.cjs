const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const C=require('../js/games-catalog-data.js');
const html=fs.readFileSync('oyun/oyunlar.html','utf8');
function setup({rows=[],fail=false,pending=false,dynamic=[]}={}){
  const {window,document}=parseHTML(html);
  Object.defineProperty(window,'location',{value:{origin:'https://kemalogretmenim.com.tr'},configurable:true});
  const events=[];
  window.kemalSite={getPopularGames:()=>pending?new Promise(()=>{}):fail?Promise.reject(new Error('RPC missing')):Promise.resolve(rows),trackGameEvent:(...args)=>events.push(args)};
  window.matchMedia=()=>({matches:true});
  Object.defineProperty(document.getElementById('gameSort'),'value',{value:'newest',writable:true});
  const context={window,document,console,URL,GameCatalog:C,localStorage:{getItem:()=>JSON.stringify(dynamic)}};
  vm.createContext(context);
  const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  vm.runInContext(inline,context);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],visible=()=>all('.game-card[data-hidden="false"]');
  function search(q){$('#gameSearch').value=q;$('#gameSearch').dispatchEvent(new window.Event('input'));}
  function sort(s){$('#gameSort').value=s;$('#gameSort').dispatchEvent(new window.Event('change'));}
  return {window,document,context,$,all,visible,search,sort,events,settle:()=>new Promise(r=>setImmediate(r))};
}
test('Clean URLs, HTML uzantısı ve sorgular aynı oyunla eşleşir; dış adresler alınmaz',()=>{
  for(const path of ['kizma_birader.html','/oyun/kizma_birader','https://kemalogretmenim.com.tr/oyun/kizma_birader/?utm_source=test'])assert.equal(C.normalizePath(path),'kizma_birader.html');
  for(const path of ['https://example.com/oyun/kizma_birader.html','#','/index.html','/oyun/oyunlar','javascript:alert(1)'])assert.equal(C.normalizePath(path),'');
  assert.equal(C.normalizePath('/oyun/iframe-oyun.html?id=test%20a'),'iframe-oyun.html?id=test%20a');
});
test('Sayaçlar yalnızca gerçek, geçerli pozitif oturumlardan gelir; URL takma adları toplanmaz',()=>{
  const rows=C.normalizeRows([{game_path:'/oyun/onluk-basket',starts:12000,popularity_score:50},{game_path:'/oyun/onluk-basket.html',starts:10000,popularity_score:45},{game_path:'/oyun/carpim-kanatlari',starts:null},{game_path:'/oyun/esini-bul-hafiza',starts:-1},{game_path:'/oyun/kizma_birader',starts:0}]);
  assert.equal(rows.length,1);assert.equal(rows[0].starts,12000);assert.equal(C.formatCount(12000),'12 B');
  for(const n of [null,undefined,-1,Infinity,NaN,true,'bad',1.2])assert.equal(C.formatCount(n),'');
  assert.equal(C.formatCount(999),'999');assert.equal(C.formatCount(1234567),'1,2 Mn');
});
test('Her statik oyuna ayrı kapak atanır; oyun bağlantıları ve yerel varlıklar mevcuttur',()=>{
  const h=setup();const imgs=h.all('.game-card .gc-cover');assert.equal(imgs.length,32);
  assert.equal(new Set(imgs.map(x=>x.src)).size,32);
  h.all('.game-card').forEach(card=>assert.ok(fs.existsSync('oyun/'+card.getAttribute('href')),card.getAttribute('href')));
  Object.values(C.covers).forEach(p=>assert.ok(fs.statSync('assets/game-covers/'+p).size<100000));
  assert.equal(h.$('.gc-preview'),null);assert.equal(h.$('.gc-banner-em'),null);
});
test('RPC hatasında üç başlangıç oyunu gösterilir; hiçbir oynanma sayısı uydurulmaz',async()=>{
  const h=setup({fail:true});await h.settle();assert.equal(h.all('.popular-game-card').length,3);
  assert.equal(h.$('#popularGamesGrid').getAttribute('aria-busy'),'false');assert.equal(h.all('.gc-play-count').length,0);
  assert.doesNotMatch(h.$('#popularGamesGrid').textContent,/kez oynandı/);assert.equal(h.$('#sortPopular').disabled,true);
  assert.equal(h.$('.popular-game-card').getAttribute('href'),'onluk-basket.html');
});
test('Ağ isteği beklerken de vitrin kullanılabilir',()=>{const h=setup({pending:true});assert.equal(h.all('.popular-game-card').length,3);});
test('Bir veya iki ölçülmüş oyun olsa da gerçek istatistik gösterilir, bilinmeyen oyunlar alınmaz',async()=>{
  const h=setup({rows:[{game_path:'/oyun/kizma_birader',starts:12340,popularity_score:200},{game_path:'/oyun/esini-bul-hafiza.html',starts:50,popularity_score:100},{game_path:'/oyun/bilinmeyen',starts:90000}]});
  await h.settle();assert.equal(h.all('.popular-game-card').length,2);assert.match(h.$('#popularGamesGrid').textContent,/12,3 B kez oynandı/);
  assert.equal(h.$('.popular-game-card').getAttribute('href'),'kizma_birader.html');assert.equal(h.$('#sortPopular').disabled,false);
  h.sort('popular');assert.equal(h.visible()[0].getAttribute('href'),'kizma_birader.html');
});
test('Arama Türkçe harfler, birden fazla kelime ve becerilerle çalışır',()=>{
  const h=setup();h.search('carpim');assert.equal(h.visible().length,1);assert.match(h.visible()[0].textContent,/Çarpım Kanatları/);
  h.search('hece');assert.equal(h.visible().length,2);
  h.search('onluk birlik');assert.equal(h.visible().length,1);
  h.search('olmayanxxx');assert.equal(h.visible().length,0);assert.ok(h.$('#emptyFilter').classList.contains('show'));
  h.$('#resetGames').click();assert.equal(h.visible().length,12);assert.equal(h.$('#gameSearch').value,'');
});
test('Kategori, alfabetik sıralama ve sayfalama birlikte çalışır',()=>{
  const h=setup();vm.runInContext("filterGames('hafıza', document.querySelectorAll('.filter-btn')[7])",h.context);
  assert.equal(h.visible().length,3);assert.ok(h.visible().every(c=>c.dataset.cat==='hafıza'));assert.equal(h.$('#paginationBar').hidden,true);
  vm.runInContext("filterGames('tümü', document.querySelector('.filter-btn'))",h.context);h.sort('az');
  assert.equal(h.visible()[0].querySelector('.gc-title').textContent,'Besin Avcısı');
  vm.runInContext('currentPage=3; renderGames()',h.context);assert.equal(h.visible().length,8);assert.equal(h.$('[aria-current="page"]').textContent,'3');
  h.search('basket');assert.equal(h.visible().length,1);assert.equal(h.$('[aria-current="page"]').textContent,'1');
});
test('Yönetimden eklenen oyunlar korunur ve iframe bağlantısı kodlanır',()=>{
  const h=setup({dynamic:[{aktif:true,tip:'iframe',id:'oyun a',ad:'Yeni Deneme',kat:'Türkçe',createdAt:'2026-10-29'}]});
  assert.equal(h.all('.game-card').length,33);assert.equal(C.normalizePath(h.visible()[0].getAttribute('href')),'iframe-oyun.html?id=oyun%20a');
  h.search('deneme');assert.equal(h.visible().length,1);assert.ok(h.visible()[0].querySelector('.gc-cover'));
});
test('Oyun kartına tıklama bir başlatma olayı üretir; vitrin etiketi korunur',async()=>{
  const h=setup();await h.settle();h.$('.popular-game-card').click();assert.equal(h.events.length,1);assert.equal(h.events[0][1].source,'popular_games');assert.equal(h.events[0][1].gameId,'onluk-basket.html');
});
