const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js');
function fixture(){const state=C.initialState(),cls=state.classes[0],s=C.newStudent('Deniz');cls.students.push(s);cls.tasks[0].points=10;C.ensureDay(s,cls);return {state,cls,s};}
test('history reversal adjusts totals and permits a genuinely new feeding without erasing feeding history',()=>{
 const {cls,s}=fixture(),date=C.dayKey();
 C.startGoal(cls,'Birlikte',20);C.completeAndFeed(s,date,cls.tasks[0].id);
 assert.equal(C.correctAward(s,date,cls.tasks[0].id),true);
 assert.equal(C.earned(s),0);assert.equal(C.goalProgress(cls).points,0);assert.equal(C.balance(s),0);
 assert.equal(C.hungerDays(s),0);assert.equal(s.feeds.length,1);
 assert.equal(C.correctAward(s,date,cls.tasks[0].id),false);
 assert.equal(C.completeAndFeed(s,date,cls.tasks[1].id).fed,true);assert.equal(C.earned(s),1);
 assert.equal(C.completeAndFeed(s,date,cls.tasks[0].id).fed,true);assert.equal(C.earned(s),11);assert.equal(C.balance(s),0);
});
test('deleting one history entry preserves templates, other days and unspent feeding credit',()=>{
 const {state,cls,s}=fixture(),date=C.dayKey();
 C.ensureDay(s,cls,'2020-01-01');C.setTask(s,date,cls.tasks[0].id,'done');
 assert.equal(C.balance(s),1);assert.equal(C.correctAward(s,date,cls.tasks[0].id,true),true);
 assert.equal(C.balance(s),0);assert.equal(s.feeds.length,0);assert.equal(cls.tasks.length,3);
 assert.equal(s.days['2020-01-01'].tasks.length,3);assert.equal(s.days[date].tasks.length,2);
 assert.equal(C.correctAward(s,date,cls.tasks[0].id,true),false);
 assert.deepEqual(C.validate(state),state);
});
test('all ten growth milestones use personal weighted totals, with 10 percent steps ending at native size',()=>{
 const {cls,s}=fixture();cls.growth={enabled:true,thresholds:C.defaultThresholds()};
 assert.equal(C.growth(s,cls).egg,true);assert.equal(C.growth(s,cls).next,10);
 let previous=0;
 for(let i=1;i<=10;i++){
  const date='2020-01-'+String(i).padStart(2,'0');C.ensureDay(s,cls,date);C.completeAndFeed(s,date,cls.tasks[0].id);
  const g=C.growth(s,cls);assert.equal(g.stage,i);assert.equal(g.egg,false);
  if(previous) assert.ok(Math.abs(g.scale/previous-1.1)<.000001);previous=g.scale;
 }
 assert.equal(previous,1);assert.equal(C.growth(s,cls).trophy,true);assert.equal(C.growth(s,cls).next,null);
 s.feeds.forEach(f=>f.at=0);assert.equal(C.growth(s,cls).stage,10,'hunger does not regress growth');
 const other=C.newStudent('Ege');cls.students.push(other);assert.equal(C.growth(other,cls).stage,0);
 C.correctAward(s,'2020-01-10',cls.tasks[0].id);assert.equal(C.growth(s,cls).stage,9);
 cls.growth.enabled=false;assert.equal(C.growth(s,cls).scale,1);assert.equal(C.earned(s),90);assert.equal(C.growth(s,cls).trophy,false);
});
test('growth, separate teacher and corrections roundtrip; malformed thresholds are rejected',()=>{
 const {state,cls,s}=fixture();cls.growth={enabled:true,thresholds:C.defaultThresholds()};cls.teacher={enabled:true,name:'Öğretmenim',species:'turtle'};
 C.completeAndFeed(s,C.dayKey(),cls.tasks[0].id);C.correctAward(s,C.dayKey(),cls.tasks[0].id);
 assert.deepEqual(C.validate(state),state);
 for(const thresholds of [[10],Array(10).fill(10),[-1,...C.defaultThresholds().slice(1)],[.5,...C.defaultThresholds().slice(1)],[...C.defaultThresholds().slice(0,9),1000001]]){
  cls.growth.thresholds=thresholds;assert.throws(()=>C.validate(state),/10 hedef/);
 }
});
