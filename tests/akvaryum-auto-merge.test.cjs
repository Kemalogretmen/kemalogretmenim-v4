const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),{merge,reconcile}=require('../js/akvaryum-sync-merge.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const date='2026-10-21';
function initial(){
 const state=C.initialState(),classroom=state.classes[0];classroom.seasonStartedOn='2026-09-01';
 classroom.students=[C.newStudent('Ada'),C.newStudent('Ece')];
 classroom.students.forEach(student=>C.ensureDay(student,classroom,date));
 return state;
}
function award(state,behavior=0,pupil=0){
 const classroom=state.classes[0],student=classroom.students[pupil];C.ensureDay(student,classroom,date);
 return C.awardBehavior(student,classroom,date,classroom.tasks[behavior].id);
}
const pupil=state=>state.classes[0].students[0];
function legacyAward(state,behavior=0){
 const task=pupil(state).days[date].tasks.find(t=>t.id===state.classes[0].tasks[behavior].id);
 task.status='done';assert.equal(C.feed(pupil(state),date),true);
}

test('automatic reconciliation keeps independent first rewards and repeated awards without mutating snapshots',()=>{
 const b=initial(),l=copy(b),r=copy(b);award(l);award(r);
 l.settings.volume=.2;r.settings.volume=.8;l.classes[0].name='Tablet';r.classes[0].name='Tahta';
 const before=[b,l,r].map(copy),result=reconcile(b,l,r);
 assert.equal(C.earned(pupil(result)),2);assert.equal(pupil(result).feeds.length,2);assert.equal(C.balance(pupil(result)),0);
 assert.equal(result.settings.volume,.8);assert.equal(result.classes[0].name,'Tahta');assert.deepEqual([b,l,r],before);
 const left=copy(result),right=copy(result);award(left);award(right);
 const repeated=reconcile(result,left,right);assert.equal(C.earned(pupil(repeated)),4);assert.equal(pupil(repeated).feeds.length,4);
 assert.deepEqual(reconcile(result,left,repeated),repeated);
});

test('identical saved award and feed IDs are counted once across retries',()=>{
 const b=initial(),l=copy(b);award(l);const r=copy(l);r.settings.names=false;
 const result=reconcile(b,l,r);assert.equal(C.earned(pupil(result)),1);assert.equal(pupil(result).feeds.length,1);
 assert.deepEqual(reconcile(b,l,result),result);assert.deepEqual(reconcile(result,result,result),result);
});

test('known-base offline edits retain their additions while database deletions defeat stale edits',()=>{
 const b=initial(),l=copy(b),r=copy(b);award(l);r.classes[0].students=[];
 assert.deepEqual(reconcile(b,l,r).classes[0].students,[]);
 const second=C.newClass('İkinci');b.classes.push(second);l.classes.push(copy(second));r.classes.push(copy(second));
 l.classes[0].name='Silinmiş sınıfın eski adı';r.classes=r.classes.filter(c=>c.id!==b.classes[0].id);
 const removed=reconcile(b,l,r);assert.deepEqual(removed.classes.map(c=>c.id),[second.id]);assert.equal(removed.activeClassId,second.id);
 const base=initial(),left=copy(base),right=copy(base);const added=C.newStudent('Yeni öğrenci');left.classes[0].students.push(added);
 assert.ok(reconcile(base,left,right).classes[0].students.some(s=>s.id===added.id));
});

test('deleted awarded history is not restored by a stale edit to that award',()=>{
 const b=initial();award(b);const l=copy(b),r=copy(b),id=pupil(b).days[date].tasks.find(t=>t.status==='done').id;
 pupil(l).days[date].tasks.find(t=>t.id===id).title='Eski cihazdaki başlık';C.correctAward(pupil(r),date,id,true);
 const result=reconcile(b,l,r);assert.equal(C.earned(pupil(result)),0);assert.ok(!pupil(result).days[date].tasks.some(t=>t.id===id));
 assert.equal(pupil(result).feeds.filter(f=>!f.creditReversed).length,0);
});

test('independent corrections preserve both reversals and allow a new reward to feed immediately',()=>{
 const b=initial();award(b);award(b,1);const l=copy(b),r=copy(b),tasks=pupil(b).days[date].tasks.filter(t=>t.status==='done');
 C.correctAward(pupil(l),date,tasks[0].id);C.correctAward(pupil(r),date,tasks[1].id);
 const result=reconcile(b,l,r);assert.equal(C.earned(pupil(result)),0);assert.equal(pupil(result).feeds.filter(f=>!f.creditReversed).length,0);
 assert.equal(award(result).fed,true);assert.equal(C.earned(pupil(result)),1);
});

test('same-day first records merge attendance and independent rewards without losing either event',()=>{
 const b=initial();delete pupil(b).days[date];const l=copy(b),r=copy(b);award(l);award(r,1);
 const result=reconcile(b,l,r);assert.equal(C.earned(pupil(result)),2);assert.equal(pupil(result).feeds.length,2);
 assert.deepEqual(C.dailyChampions(result.classes[0],date),{points:2,ids:[pupil(result).id]});
 const left=copy(b),right=copy(b);C.ensureDay(pupil(left),left.classes[0],date).absent=true;award(right);
 const attendance=reconcile(b,left,right);assert.equal(pupil(attendance).days[date].absent,true);assert.equal(C.earned(pupil(attendance)),1);
});

test('separate legacy first awards proven by distinct new feeds become deterministic events',()=>{
 const b=initial(),l=copy(b),r=copy(b);legacyAward(l);legacyAward(r);
 const result=reconcile(b,l,r),done=pupil(result).days[date].tasks.filter(t=>t.status==='done');
 assert.equal(C.earned(pupil(result)),2);assert.equal(done.length,2);assert.equal(pupil(result).feeds.length,2);
 assert.equal(new Set(done.map(t=>t.id)).size,2);assert.ok(done.every(t=>t.sourceId===b.classes[0].tasks[0].id));
 assert.deepEqual(reconcile(b,l,r),result);assert.deepEqual(reconcile(b,l,result),result);
 const shared=copy(l);shared.settings.names=false;const deduped=reconcile(b,l,shared);
 assert.equal(C.earned(pupil(deduped)),1);assert.equal(pupil(deduped).feeds.length,1);
});

test('legacy records for a day created on both devices preserve independent first awards',()=>{
 const b=initial();delete pupil(b).days[date];const l=copy(b),r=copy(b);
 C.ensureDay(pupil(l),l.classes[0],date);C.ensureDay(pupil(r),r.classes[0],date);legacyAward(l);legacyAward(r);
 const result=reconcile(b,l,r);assert.equal(C.earned(pupil(result)),2);assert.equal(pupil(result).feeds.length,2);
});

test('legacy feed identity survives an array position shift without duplicating the same feeding',()=>{
 const b=initial();legacyAward(b);pupil(b).feeds.forEach(f=>delete f.id);const l=copy(b),r=copy(b);
 pupil(l).feeds.unshift({day:'2026-10-20',at:10});r.settings.names=false;
 const result=reconcile(b,l,r);assert.equal(pupil(result).feeds.length,2);assert.equal(pupil(result).feeds.filter(f=>f.at===10).length,1);
});

test('missing baseline uses the database and never resurrects deleted history, students or classes',()=>{
 const local=initial();award(local);const remote=copy(local),id=pupil(remote).days[date].tasks.find(t=>t.status==='done').id;
 C.correctAward(pupil(remote),date,id,true);remote.classes[0].students.pop();remote.settings.volume=.6;
 const deleted=C.newClass('Eski sınıf');local.classes.push(deleted);local.activeClassId=deleted.id;
 const before=[local,remote].map(copy),result=reconcile(null,local,remote);
 assert.deepEqual(result,C.validate(remote));assert.deepEqual([local,remote],before);
 assert.equal(C.earned(pupil(result)),0);assert.equal(result.classes[0].students.length,1);assert.equal(result.classes.length,1);
});

test('a deliberate season reset never imports stale points, even when the reset occurs on the same date',()=>{
 const b=initial();award(b);const l=copy(b),r=copy(b);C.startNewSeason(r.classes[0],date,1000);award(l,1);
 const result=reconcile(b,l,r);assert.equal(C.earned(pupil(result)),0);assert.equal(pupil(result).feeds.length,0);
 assert.equal(result.classes[0].seasons[0].id,r.classes[0].seasons[0].id);
 const left=copy(b),right=copy(b);C.startNewSeason(left.classes[0],date,1000);award(right,1);
 assert.equal(C.earned(pupil(reconcile(b,left,right))),0);
 const bothLeft=copy(r),bothRight=copy(r);C.startNewSeason(bothLeft.classes[0],date,2000);C.startNewSeason(bothRight.classes[0],date,3000);
 assert.deepEqual(reconcile(r,bothLeft,bothRight).classes[0],bothRight.classes[0]);
 assert.deepEqual(reconcile(null,l,r),C.validate(r));
});

test('a reset preserves entity deletions and never carries a new pupil old-season points across the boundary',()=>{
 const b=initial(),l=copy(b),r=copy(b);C.startNewSeason(l.classes[0],date,1000);
 const removed=r.classes[0].students.shift(),newStudent=C.newStudent('Yeni');r.classes[0].students.push(newStudent);
 C.ensureDay(newStudent,r.classes[0],date);C.awardBehavior(newStudent,r.classes[0],date,r.classes[0].tasks[0].id);
 r.classes[0].tasks.shift();
 const result=reconcile(b,l,r);assert.ok(!result.classes[0].students.some(s=>s.id===removed.id));
 assert.equal(C.earned(result.classes[0].students.find(s=>s.id===newStudent.id)),0);
 assert.deepEqual(result.classes[0].tasks,r.classes[0].tasks);
});

test('reconciliation validates aggregate limits atomically rather than dropping awarded events',()=>{
 const b=initial(),p=pupil(b);while(p.days[date].tasks.length<C.MAX_DAILY_TASKS-1)p.days[date].tasks.push({id:C.uid(),title:'Ödül',points:1,status:'done'});
 const l=copy(b),r=copy(b);award(l,1);award(l,1);award(r,2);award(r,2);const before=[b,l,r].map(copy);
 assert.throws(()=>reconcile(b,l,r),/Görev geçmişi/);assert.deepEqual([b,l,r],before);
});

test('manual conservative API remains available to existing callers',()=>{
 const b=initial(),l=copy(b),r=copy(b);l.settings.volume=.2;r.settings.volume=.8;
 assert.throws(()=>merge(b,l,r),/farklı değiştirildi/);assert.equal(reconcile(b,l,r).settings.volume,.8);
});
