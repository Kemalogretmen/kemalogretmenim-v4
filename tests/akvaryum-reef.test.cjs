const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js');
const Merge=require('../js/akvaryum-sync-merge.js');
const Reef=C.reef;
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const doc=C.initialState(),cls=doc.classes[0],day=C.dayKey();
 cls.students=['Ada','Deniz'].map(name=>C.newStudent(name));
 cls.students.forEach(student=>C.ensureDay(student,cls,day));
 return {doc,cls,day};
}

test('reef stages only unlock from positive class awards and survive corrections and season changes',()=>{
 const {doc,cls,day}=fixture(),[student]=cls.students,task=cls.tasks[0];
 task.points=7;student.days[day].tasks[0].points=7;
 assert.equal(C.startReefGoal(cls,'Kayıp Gemi',[3,2,5,7]),false);
 assert.equal(C.startReefGoal(cls,'Kayıp Gemi',[1,5,10,15]),true);
 // Changing a target or displaying the collection cannot earn a piece.
 assert.equal(Reef.stage(cls.reefCollection),0);
 C.awardBehavior(student,cls,day,task.id);
 assert.equal(Reef.stage(cls.reefCollection),2);
 assert.equal(C.startReefGoal(cls,'Kayıp Gemi',[2,5,10,15]),false,'earned thresholds remain fixed');
 assert.equal(C.startReefGoal(cls,'Kayıp Gemi',[1,5,6,15]),false,'no retroactive unlock through threshold edit');
 const actual=student.days[day].tasks.find(t=>t.status==='done');
 assert.ok(C.correctAward(student,day,actual.id,true));
 assert.equal(Reef.stage(cls.reefCollection),2);
 C.awardBehavior(student,cls,day,task.id);
 const before=C.goalProgress(cls).points;
 assert.ok(C.startNewSeason(cls,day));
 assert.equal(C.goalProgress(cls).points,before);
 assert.equal(Reef.stage(C.validate(doc).classes[0].reefCollection),2);
 C.ensureDay(student,cls,day);
 C.awardBehavior(student,cls,day,task.id);
 assert.equal(Reef.stage(cls.reefCollection),3);
 C.awardBehavior(student,cls,day,task.id);
 assert.equal(Reef.stage(cls.reefCollection),4);
 C.startGoal(cls,'Kitap okuma saati',50);
 assert.deepEqual(Reef.publicView(cls.reefCollection),{version:1,stage:4,visible:true,side:'left',size:'medium'});
 assert.equal(Reef.news(cls.reefCollection,day,day).length,4);
});

test('paused construction freezes progress and resuming after a different goal keeps the last milestone',()=>{
 const {cls,day}=fixture(),[student]=cls.students,task=cls.tasks[0];
 const marks=[2,4,6,8];
 C.startReefGoal(cls,'Gemi',marks);
 for(let i=0;i<3;i++)C.awardBehavior(student,cls,day,task.id);
 C.startReefGoal(cls,'Gemi',marks,{enabled:false});
 for(let i=0;i<4;i++)C.awardBehavior(student,cls,day,task.id);
 assert.equal(C.goalProgress(cls).points,3);
 assert.equal(Reef.stage(cls.reefCollection),1);
 C.startReefGoal(cls,'Gemi',marks);
 C.awardBehavior(student,cls,day,task.id);
 assert.equal(C.goalProgress(cls).points,4);
 assert.equal(Reef.stage(cls.reefCollection),2);
 C.startGoal(cls,'Başka hedef',50);
 C.startReefGoal(cls,'Gemi',marks,{visible:false,side:'right',size:'small'});
 assert.equal(C.goalProgress(cls).points,4);
 assert.deepEqual(Reef.publicView(cls.reefCollection),{version:1,stage:2,visible:false,side:'right',size:'small'});
});

test('independent device awards combine to cross shared reef milestones, even when neither awarded alone reached them',()=>{
 const {doc,cls,day}=fixture();
 C.startReefGoal(cls,'Gemi',[1,2,3,4]);
 const left=clone(doc),right=clone(doc);
 for(const [i,copy] of [left,right].entries()){
  const c=copy.classes[0];C.awardBehavior(c.students[i],c,day,c.tasks[0].id);
  assert.equal(Reef.stage(c.reefCollection),1);
 }
 for(const combine of [Merge.merge,Merge.reconcile]){
  const merged=combine(doc,left,right).classes[0];
  assert.equal(C.goalProgress(merged).points,2);
  assert.equal(Reef.stage(merged.reefCollection),2);
 }
});
