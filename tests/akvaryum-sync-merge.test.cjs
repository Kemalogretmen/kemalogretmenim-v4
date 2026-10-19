const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),{merge}=require('../js/akvaryum-sync-merge.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function initial(){const s=C.initialState(),c=s.classes[0];c.students.push(C.newStudent('Ada'));C.ensureDay(c.students[0],c);return s;}
function award(s,behavior=0,date=C.dayKey()){const c=s.classes[0];C.ensureDay(c.students[0],c,date);return C.awardBehavior(c.students[0],c,date,c.tasks[behavior].id);}
test('new-day independent awards and repeated rewards retain every event and leave input copies unchanged',()=>{
 const b=initial(),l=copy(b),r=copy(b),date='2026-11-03';award(l,0,date);award(r,1,date);
 const before=[b,l,r].map(copy),result=merge(b,l,r),p=result.classes[0].students[0];
 assert.equal(C.earned(p),2);assert.equal(p.feeds.length,2);assert.deepEqual([b,l,r],before);
 const left=copy(result),right=copy(result);award(left,0,date);award(right,0,date);
 const repeated=merge(result,left,right).classes[0].students[0];assert.equal(C.earned(repeated),4);assert.equal(repeated.feeds.length,4);
 assert.equal(new Set(repeated.feeds.map(f=>f.id)).size,4);
});
test('correction and an independent pupil award merge; divergent corrections sharing a feed credit require review',()=>{
 const b=initial();award(b);award(b,1);const c=b.classes[0];c.students.push(C.newStudent('Ece'));C.ensureDay(c.students[1],c);
 const l=copy(b),r=copy(b);C.correctAward(l.classes[0].students[0],C.dayKey(),c.tasks[0].id);
 C.awardBehavior(r.classes[0].students[1],r.classes[0],C.dayKey(),c.tasks[0].id);
 const result=merge(b,l,r).classes[0].students;assert.deepEqual(result.map(C.earned),[1,1]);assert.equal(C.balance(result[0]),0);
 const other=copy(b);C.correctAward(other.classes[0].students[0],C.dayKey(),c.tasks[1].id);
 assert.throws(()=>merge(b,l,other),/farklı değiştirildi/);
});
test('season reset, deletion versus edit, and conflicting settings never discard concurrent points',()=>{
 const b=initial(),l=copy(b),r=copy(b);C.startNewSeason(l.classes[0]);award(r);
 assert.throws(()=>merge(b,l,r),/farklı değiştirildi/);
 const deleted=copy(b);deleted.classes[0].students=[];assert.throws(()=>merge(b,deleted,r),/farklı değiştirildi/);
 const first=copy(b),second=copy(b);first.settings.volume=.2;second.settings.volume=.8;
 assert.throws(()=>merge(b,first,second),/farklı değiştirildi/);
});
test('merging independent additions still enforces the daily history bound atomically',()=>{
 const b=initial(),c=b.classes[0],p=c.students[0],date=C.dayKey();
 while(p.days[date].tasks.length<C.MAX_DAILY_TASKS-1)p.days[date].tasks.push({id:C.uid(),title:'Eski kayıt',points:1,status:'done'});
 const l=copy(b),r=copy(b);award(l,1);award(r,2);
 // First rewards reuse pending template slots, so add distinct recorded repeats.
 award(l,1);award(r,2);
 assert.throws(()=>merge(b,l,r),/Görev geçmişi/);
});
