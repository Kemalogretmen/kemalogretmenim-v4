const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../js/word-pairs-rules.js'),D=require('../js/word-pairs-data.js');
test('İki sözcük bankası gerçek çiftler, benzersiz sözcükler ve bağlam cümleleri içerir',()=>{
 for(const kind of ['puzzle','blocks'])for(const grade of [2,3]){const rows=D.rows(kind,grade),words=rows.flatMap(p=>[p.a,p.b]);assert.equal(words.length,new Set(words).size);assert.ok(rows.length>=24);rows.forEach(p=>{assert.ok(p.example.includes(p.a)||p.example.includes(p.b));assert.ok(p.tip.length>5);assert.notEqual(p.a,p.b);});}
 assert.ok(D.rows('blocks',3).length>D.rows('blocks',2).length);
});
test('İki oyuncuya aynı karışık görevler, tüm seviyelerde tek geçerli eş verilir',()=>{
 for(let seed=1;seed<=80;seed++)for(const kind of ['puzzle','blocks']){
  const s=R.create(kind,{players:2},seed);assert.deepEqual(s.levels,R.create(kind,{players:1},seed).levels);
  s.levels.forEach(l=>{if(kind==='puzzle'){assert.equal(l.slots.length,l.cols*l.rows);assert.deepEqual([...l.tray].sort(),l.slots.map(p=>p.id).sort());assert.equal(new Set(l.slots.map(x=>x.answer)).size,l.goal);}else {assert.ok(l.queue.length>20);l.queue.forEach(piece=>{assert.equal(piece.length,2);assert.notEqual(piece[0].pairId,piece[1].pairId);});}});
 }
});
test('Yapboz yanlış parçada açılmaz; doğru parça kaybolmaz ve tekrar puan vermez',()=>{
 const s=R.create('puzzle',{rounds:1},42),p=s.players[0],l=s.levels[0];
 assert.equal(R.puzzle(s,0,l.slots[1].id,0).type,'miss');assert.equal(p.solved[0],false);assert.equal(p.errors,1);
 assert.equal(R.puzzle(s,0,l.slots[0].id,0).points,60);assert.equal(p.solved[0],true);assert.equal(R.puzzle(s,0,l.slots[0].id,0),null);assert.equal(p.score,60);
 assert.equal(R.puzzle(s,0,'unknown',1),null);assert.equal(R.puzzle(s,0,l.slots[0].id,1),null);
});
test('İpucu seçilen parçayı öğretir ve aynı ipucu bir kez sayılır',()=>{
 const s=R.create('puzzle',{},2),p=s.players[0],pair=s.levels[0].slots[2];p.selected=pair.id;assert.equal(R.puzzleHint(s,0).id,pair.id);R.puzzleHint(s,0);assert.equal(p.hints,1);assert.equal(R.puzzle(s,0,pair.id,2).points,40);
});
test('Bir oyuncunun bitişi rakibi durdurmaz; aynı görevler bitmeden sonuç oluşmaz',()=>{
 const s=R.create('puzzle',{players:2,rounds:1},5),l=s.levels[0];l.slots.forEach((r,i)=>R.puzzle(s,0,r.id,i));assert.equal(s.players[0].phase,'done');assert.equal(s.status,'playing');l.slots.forEach((r,i)=>R.puzzle(s,1,r.id,i));assert.equal(s.status,'done');assert.deepEqual(R.winners(s),['Oyuncu 1','Oyuncu 2']);
});
test('Yapboz istenen 2×3, 3×4 ve 4×5 bölümlerine ilerler',()=>{
 const s=R.create('puzzle',{players:2},91);assert.deepEqual(s.levels.map(l=>[l.rows,l.cols,l.goal]),[[2,3,6],[3,4,12],[4,5,20]]);
 for(let level=0;level<3;level++)for(const p of s.players){const l=s.levels[p.level];l.slots.forEach((pair,i)=>R.puzzle(s,p.id,pair.id,i));if(level<2)R.next(s,p.id);}
 assert.equal(s.status,'done');assert.ok(s.players.every(p=>p.score===3800));
});
