const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../js/word-pairs-rules.js'),T=require('../js/word-tower-rules.js'),G=require('../js/word-jigsaw.js');
const empty=()=>Array.from({length:8},()=>Array(4).fill(null));
const pair=(id,a,b)=>({id,prompt:a,answer:b,example:a+' = '+b});
const block=(p,side)=>({pairId:p.id,side,word:side?p.answer:p.prompt,pair:p});
function settle(s){for(let i=0;i<12&&['clear','settle'].includes(s.players[0].phase);i++)R.advance(s,.7);}
test('Gerçek yapbozda komşu kenarlar birbirini tamamlar; dış kenarlar düzdür',()=>{
 for(const [cols,rows] of [[3,2],[4,3],[5,4]]){const shapes=G.create(cols,rows,342);assert.equal(shapes.length,cols*rows);for(const p of shapes){assert.match(p.d,/C /);assert.match(p.d,/Z$/);if(p.col<cols-1)assert.equal(p.edges.right,-shapes[p.index+1].edges.left);else assert.equal(p.edges.right,0);if(p.row<rows-1)assert.equal(p.edges.bottom,-shapes[p.index+cols].edges.top);else assert.equal(p.edges.bottom,0);if(!p.col)assert.equal(p.edges.left,0);if(!p.row)assert.equal(p.edges.top,0);assert.ok(p.bounds.width>p.w);}}
});
test('Yalnızca temas eden farklı eş anlamlar temizlenir; çaprazlar ve aynı sözcükler kalır',()=>{
 const p=pair('a','yıl','sene'),b=empty();b[7][0]=block(p,0);b[6][1]=block(p,1);assert.equal(T.findMatches(b).cells.length,0);b[6][1]=null;b[7][1]=block(p,0);assert.equal(T.findMatches(b).cells.length,0);b[7][1]=block(p,1);assert.equal(T.findMatches(b).cells.length,2);
});
test('Eşleşmeyen parça sabitlenir ve sonraki parça gelir; seçenek sınavı değildir',()=>{
 const s=R.create('blocks',{pace:0},21),p=s.players[0];p.board=empty();R.drop(s,0,1);assert.equal(p.phase,'settle');assert.equal(p.board.flat().filter(Boolean).length,2);settle(s);assert.equal(p.phase,'active');assert.equal(p.cursor,2);assert.equal(p.errors,0);
});
test('İlk iki sözcüğü uygun yere bırakmak iki çifti birden patlatır',()=>{
 const s=R.create('blocks',{pace:0},21),p=s.players[0];const result=R.drop(s,0,0);assert.equal(result.type,'match');assert.equal(result.pairs.length,2);assert.equal(p.score,200);assert.equal(p.pending.length,4);settle(s);assert.equal(p.board.flat().filter(Boolean).length,2);assert.equal(p.phase,'active');
});
test('Yerçekimi ikinci eşleşmeyi oluşturur, zincir puanı verir ve animasyon sonrası temizler',()=>{
 const s=R.create('blocks',{pace:0},12),p=s.players[0],a=pair('a','yıl','sene'),b=pair('b','ad','isim');p.board=empty();p.board[7][0]=block(a,0);p.board[7][1]=block(a,1);p.board[6][0]=block(b,0);p.board[5][1]=block(b,1);
 // The first pair is in its clear animation; gravity must create the next pair.
 p.phase='clear';p.pending=[{x:0,y:7},{x:1,y:7}];p.chain=1;p.matched=1;p.piece=null;p.settle=.1;R.advance(s,.2);assert.equal(p.phase,'clear');assert.equal(p.chain,2);assert.equal(p.feedback.pair.id,'b');assert.equal(p.feedback.points,125);assert.equal(p.pending.length,2);R.advance(s,.7);assert.equal(p.board.flat().filter(Boolean).length,0);
});
test('Duvar dönüşü, engel çarpışması ve sert bırakmanın konumu tutarlıdır',()=>{
 const s=R.create('blocks',{pace:0},8),p=s.players[0];p.board=empty();R.rotate(s,0);assert.ok(R.move(s,0,3));assert.ok(R.rotate(s,0));assert.ok(T.fits(p.board,p.piece));assert.equal(R.move(s,0,99),false);assert.equal(R.move(s,0,NaN),false);const ghost=T.landing(p.board,p.piece);assert.ok(T.fits(p.board,ghost));assert.equal(T.fits(p.board,{...ghost,y:ghost.y+1}),false);
});
test('Mola, süresiz mod ve kapalı oyuncunun zamanı korunur; başka oyuncu etkilenmez',()=>{
 const s=R.create('blocks',{players:2,pace:16},8);R.advance(s,1,[0]);assert.equal(s.players[0].elapsed,1);assert.equal(s.players[1].elapsed,0);s.paused=true;assert.equal(R.drop(s,0),null);assert.equal(R.rotate(s,0),false);assert.deepEqual(R.advance(s,1),[]);const manual=R.create('blocks',{pace:0});R.advance(manual,999);assert.equal(manual.players[0].piece.y,0);
});
test('Vinç yalnızca sıkışmada çalışır, uzaktaki eşleri öğretir ve yardımcı puan verir',()=>{
 const s=R.create('blocks',{pace:0},6),p=s.players[0],a=pair('a','yıl','sene');assert.equal(R.rescue(s,0),null);p.board=empty();p.board[7][0]=block(a,0);p.board[7][3]=block(a,1);p.phase='rescue';const r=R.rescue(s,0);assert.equal(r.type,'match');assert.equal(r.assisted,true);assert.equal(p.score,40);assert.equal(p.errors,1);assert.equal(p.hints,1);settle(s);assert.equal(p.phase,'active');
});
test('Her bölüm biter; bir oyuncunun bitişi diğerinin oyununu sonlandırmaz',()=>{
 const s=R.create('blocks',{players:2,pace:0},8);for(let level=0;level<3;level++)for(const p of s.players){const l=s.levels[p.level];p.board=empty();p.matched=l.goal-1;const a=pair('last','cevap','yanıt');p.board[7][0]=block(a,0);p.piece={x:0,y:0,rotation:1,tokens:[block(pair('other','ad','isim'),0),block(a,1)]};R.drop(s,p.id);for(let i=0;i<3&&p.phase==='clear';i++)R.advance(s,.7);assert.equal(p.phase,level===2?'done':'levelDone');if(level<2)R.next(s,p.id);}assert.equal(s.status,'done');
});
test('Gerçek parça sırası yalnızca taşıma/dönüş/bırakma ile üç bölümü yardımsız bitirebilir',()=>{
 function metric(p){let h=0,holes=0;for(let x=0;x<4;x++){let seen=false;for(let y=0;y<8;y++){if(p.board[y][x]){if(!seen)h+=8-y;seen=true;}else if(seen)holes++;}}return p.score*1000-h*15-holes*80-(p.phase==='rescue'?100000:0);}
 for(const seed of [1,7,12]){const s=R.create('blocks',{pace:0},seed);let turns=0;while(s.status!=='done'&&turns++<100){const p=s.players[0];if(p.phase==='levelDone'){R.next(s,0);continue;}assert.equal(p.phase,'active');let best;
  for(let rotation=0;rotation<4;rotation++)for(let x=0;x<4;x++){const candidate={...s,players:[JSON.parse(JSON.stringify(p))]};for(let r=0;r<rotation;r++)R.rotate(candidate,0);if(!R.move(candidate,0,x))continue;R.drop(candidate,0);settle(candidate);const value=metric(candidate.players[0]);if(!best||value>best.value)best={value,rotation,x};}
  assert.ok(best);for(let r=0;r<best.rotation;r++)R.rotate(s,0);R.move(s,0,best.x);R.drop(s,0);settle(s);
 }assert.equal(s.status,'done');assert.equal(s.players[0].hints,0);assert.ok(s.players[0].correct>=30);}
});
