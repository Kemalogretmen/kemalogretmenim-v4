const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js');
function setup(){const state=C.initialState(),cls=state.classes[0],s=C.newStudent('Örnek');cls.students.push(s);cls.tasks[0].points=30;const negative={id:C.uid(),title:'Söz sıramı beklemeliyim',icon:'🙋',points:-10};cls.tasks.push(negative);cls.growth={enabled:true,thresholds:C.defaultThresholds()};const date=C.dayKey();C.ensureDay(s,cls,date);return {state,cls,s,negative,date};}
test('development deductions shrink the existing growth stage, give no feed, and can be undone after a cloud roundtrip',()=>{
 const {state,cls,s,negative,date}=setup();
 C.awardBehavior(s,cls,date,cls.tasks[0].id);const size=C.growth(s,cls).scale;
 assert.equal(C.growth(s,cls).stage,3);
 assert.equal(s.days[date].tasks.some(t=>t.id===negative.id),false);
 assert.deepEqual(C.awardBehavior(s,cls,date,negative.id),{points:-10,fed:false});
 assert.equal(C.earned(s),20);assert.equal(C.growth(s,cls).stage,2);assert.ok(C.growth(s,cls).scale<size);
 assert.equal(s.feeds.length,1);assert.equal(C.completedCount(s),1);assert.equal(C.balance(s),0);
 const restored=C.validate(JSON.parse(JSON.stringify(state))),student=restored.classes[0].students[0],entry=student.days[date].tasks.at(-1);
 assert.equal(entry.points,-10);assert.equal(C.correctAward(student,date,entry.id),true);
 assert.equal(C.earned(student),30);assert.equal(C.growth(student,restored.classes[0]).scale,size);
 assert.equal(student.feeds[0].creditReversed,undefined);
});
test('deductions repeat, cap at available score, reject absent/zero-score awards, and deletion restores only the selected deduction',()=>{
 const {cls,s,negative,date}=setup();C.awardBehavior(s,cls,date,cls.tasks[0].id);
 negative.points=-20;assert.equal(C.awardBehavior(s,cls,date,negative.id).points,-20);
 assert.equal(C.awardBehavior(s,cls,date,negative.id).points,-10);
 assert.equal(C.earned(s),0);assert.equal(C.awardBehavior(s,cls,date,negative.id),null);
 const last=s.days[date].tasks.at(-1);C.correctAward(s,date,last.id,true);assert.equal(C.earned(s),10);
 s.days[date].absent=true;assert.equal(C.awardBehavior(s,cls,date,negative.id),null);
 assert.equal(s.feeds.length,1);assert.equal(s.feeds[0].creditReversed,undefined);
});
test('editing a behavior type preserves awarded history and never turns a deduction into feed credit or a bulk reward',()=>{
 const {state,cls,s,negative,date}=setup();C.awardBehavior(s,cls,date,cls.tasks[0].id);
 C.awardBehavior(s,cls,date,negative.id);const entry=s.days[date].tasks.at(-1);
 assert.equal(C.setTask(s,date,entry.id,'pending'),false);
 assert.deepEqual(C.rewardGroup(cls,date,negative.id,[s.id]),[]);
 C.updateTask(cls,negative.id,{title:'Yeni ad',icon:'🎯',points:-3},date);
 assert.equal(entry.points,-10);assert.equal(C.awardBehavior(s,cls,date,negative.id).points,-3);
 const pending=cls.tasks[1];C.updateTask(cls,pending.id,{title:pending.title,points:-2,icon:''},date);
 assert.equal(s.days[date].tasks.some(t=>t.id===pending.id),false);
 assert.equal(C.validate(state).classes[0].tasks.at(-1).points,-3);
 for(const value of [0,-1001,1.1,'-5',null,Infinity])assert.equal(C.validScore(value),false);
});
