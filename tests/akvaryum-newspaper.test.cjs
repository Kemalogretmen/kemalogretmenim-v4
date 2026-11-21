const {test}=require('node:test');
const assert=require('node:assert/strict');
const N=require('../js/akvaryum-newspaper.js');
const C=require('../js/akvaryum-core.js');
const M=require('../js/akvaryum-sync-merge.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const start='2026-11-16',today='2026-11-18';
function fixture(){const doc=C.initialState(),cls=doc.classes[0],s=C.newStudent('Ada');cls.students=[s,C.newStudent('Ece')];return {doc,cls,s};}
test('weeks use the Istanbul calendar across UTC midnight, year changes and invalid dates',()=>{
 assert.equal(N.day(new Date('2026-11-15T22:00:00Z')),start);assert.equal(N.week('2026-11-22'),start);
 assert.equal(N.week('2027-01-01'),'2026-12-28');assert.match(N.label('2026-12-28'),/2026.*2027/);assert.equal(N.isWeek('2026-02-30'),false);assert.equal(N.isWeek('2026-11-17'),false);
 assert.equal(N.weeks(today).length,12);assert.equal(N.weeks(today,4)[0],'2026-12-14');
});
test('weekly facts exclude pending, reversed, negative, future and peer events and include own archived records',()=>{
 const {cls,s}=fixture();s.days={'2026-11-16':{tasks:[{title:'Okudum',points:5,status:'done'},{title:'Geri alındı',points:99,status:'pending'},{title:'Düzeltme',points:-2,status:'done'}]},'2026-11-20':{tasks:[{title:'Gelecek',points:10,status:'done'}]}};
 cls.seasons=[{awards:[{studentId:s.id,date:'2026-11-17',title:'Okudum',points:3,status:'done'},{studentId:cls.students[1].id,date:'2026-11-17',title:'PRIVATE PEER',points:500,status:'done'}]}];
 const r=N.localReport(cls,s,start,today,C);assert.equal(r.positiveCount,2);assert.equal(r.activeDays,2);assert.equal(r.earned,8);assert.equal(r.highlights.length,1);assert.equal(r.highlights[0].count,2);assert.equal(r.currentTotal,13);assert.ok(!JSON.stringify(r).includes('PRIVATE PEER'));
});
test('draft announcements and goals never appear in parent output; published targets are own-child-only',()=>{
 const {cls,s}=fixture(),peer=cls.students[1];cls.newspaper={enabled:true,weeks:{[start]:{title:'Duyuru',body:'Sınıf etkinliği',published:false,targets:{[s.id]:'Ada hedefi',[peer.id]:'PRIVATE TARGET'}}}};
 assert.equal(N.localReport(cls,s,start,today,C).target,'');assert.equal(N.localReport(cls,s,start,today,C).announcement,null);
 cls.newspaper.weeks[start].published=true;cls.newspaper.weeks[start].publication={...cls.newspaper.weeks[start],id:'edition-a'};const r=N.localReport(cls,s,start,today,C);assert.equal(r.target,'Ada hedefi');assert.equal(r.announcement.body,'Sınıf etkinliği');assert.ok(!JSON.stringify(r).includes('PRIVATE TARGET'));
});
test('backup validation preserves announcement newlines, removes deleted-pupil targets and rejects unsafe or oversized configuration',()=>{
 const {doc,cls,s}=fixture();cls.newspaper={weeks:{[start]:{title:'Başlık',body:'Satır 1\nSatır 2',published:true,targets:{[s.id]:'Hedef',deleted:'Kaldır'}}}};
 const valid=C.validate(doc).classes[0].newspaper;assert.equal(valid.weeks[start].body,'Satır 1\nSatır 2');assert.equal(valid.weeks[start].targets.deleted,undefined);
 cls.newspaper.weeks[start].body='x'.repeat(1801);assert.throws(()=>C.validate(doc),/Gazete/);
 assert.throws(()=>N.validate({weeks:{'2026-11-17':{}}}),/Gazete/);
 const bad=JSON.parse('{"weeks":{"2026-11-16":{"title":"","body":"","published":false,"targets":{"__proto__":"bad"}}}}');assert.throws(()=>N.validate(bad),/hedefi/);
});
test('newspaper edits and offline points merge without altering score or another pupil target',()=>{
 const {doc,cls,s}=fixture();cls.newspaper={weeks:{[start]:{title:'',body:'',published:false,targets:{}}}};
 const local=clone(doc),remote=clone(doc);local.classes[0].newspaper.weeks[start].body='Yeni duyuru';remote.classes[0].newspaper.weeks[start].targets[s.id]='Yeni hedef';C.ensureDay(remote.classes[0].students[0],remote.classes[0],today);C.awardBehavior(remote.classes[0].students[0],remote.classes[0],today,remote.classes[0].tasks[0].id);
 for(const method of ['merge','reconcile']){const out=M[method](doc,local,remote),cl=out.classes[0];assert.equal(cl.newspaper.weeks[start].body,'Yeni duyuru');assert.equal(cl.newspaper.weeks[start].targets[s.id],'Yeni hedef');assert.equal(C.earned(cl.students[0]),1);}
});
test('news escapes every user field, has a truthful empty state and keeps current rewards distinct from weekly awards',()=>{
 const raw={weekStart:start,name:'<script>alert(1)</script>',species:'clown',positiveCount:0,currentTotal:7,characterUnlocked:true,highlights:[{title:'<img onerror=x>',count:2}],target:'<b>Hedef</b>',announcement:{title:'<i>Duyuru</i>',body:'<script>X</script>'}};
 const html=N.markup(raw,{image:()=>'/fish.png'});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror'));assert.match(html,/henüz olumlu davranış kaydı bulunmuyor/);assert.match(html,/100 puanlık karakter koleksiyonu açık/);assert.match(html,/GÜNCEL DURUM/);assert.match(html,/&lt;b&gt;Hedef/);
});

test('activation and an explicit sent edition gate publication; later drafts leave the sent content intact',()=>{
 const {doc,cls,s}=fixture(),issue={title:'Taslak',body:'Taslak metin',targets:{[s.id]:'Taslak hedef'},published:false};cls.newspaper={enabled:false,weeks:{[start]:issue}};
 assert.equal(N.localReport(cls,s,start,today,C).available,false);cls.newspaper.enabled=true;assert.equal(N.localReport(cls,s,start,today,C).available,false);
 issue.published=true;issue.publication={id:'edition-1',title:'Gönderilen başlık',body:'Gönderilen metin',targets:{[s.id]:'Gönderilen hedef'}};issue.body='Sonraki taslak';
 let r=N.localReport(cls,s,start,today,C);assert.equal(r.available,true);assert.equal(r.announcement.body,'Gönderilen metin');assert.equal(r.target,'Gönderilen hedef');assert.deepEqual(r.publishedWeeks,[start]);
 const preview=N.localReport(cls,s,start,today,C,{draft:true});assert.equal(preview.announcement.body,'Sonraki taslak');
 cls.newspaper.enabled=false;assert.equal(N.localReport(cls,s,start,today,C).announcement,null);assert.equal(C.validate(doc).classes[0].newspaper.version,2);
});
