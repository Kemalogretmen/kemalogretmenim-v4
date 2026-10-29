const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),R=require('../js/akvaryum-rewards.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){const state=C.initialState(),cls=state.classes[0],date=C.dayKey();cls.students.push(C.newStudent('Ada'));C.ensureDay(cls.students[0],cls,date);return {state,cls,s:cls.students[0],date};}
test('every species has a bounded, finite gesture that returns exactly to neutral',()=>{
 const signatures=new Set();
 for(const s of C.SPECIES){
  const p=R.profile(s.id);assert.ok(p.duration>=2.8&&p.duration<=5);
  const poses=Array.from({length:30},(_,i)=>R.pose(s.id,i*p.duration/30));
  signatures.add(JSON.stringify(poses));assert.ok(poses.some(p=>p.amount>.8));
  for(const pose of poses){assert.ok(Object.values(pose).every(v=>typeof v==='boolean'||Number.isFinite(v)));assert.ok(Math.abs(pose.x)<=5&&Math.abs(pose.y)<=11&&Math.abs(pose.bank)<=8);assert.ok(pose.scaleX>.9&&pose.scaleY>.9);}
  for(const elapsed of [-1,NaN,p.duration,p.duration+10])assert.deepEqual(R.pose(s.id,elapsed),R.pose(s.id,NaN));
  const start=R.pose(s.id,0);assert.equal(start.x,0);assert.equal(Math.abs(start.y),0);assert.equal(start.bank,0);assert.equal(start.scaleX,1);assert.equal(start.scaleY,1);
 }
 assert.ok(signatures.size>=15,'jointed species and fish families have distinguishable gestures');
});
test('egg and resting collective gestures stay in their nest or resting place',()=>{
 for(let t=0;t<4.6;t+=.1){
  const egg=R.pose('ray',t,{egg:true});assert.equal(egg.x,0);assert.equal(egg.y,0);assert.ok(Math.abs(egg.bank)<=2);
  const collective=R.pose('ray',t,{collective:true,resting:true});assert.equal(collective.x,0);assert.equal(collective.y,0);
 }
});
test('tracker seeds quietly, recognizes separate awards and never changes the saved document',()=>{
 const {state,cls,s,date}=fixture(),tracker=R.createTracker();assert.deepEqual(tracker.observe(state,date),{awards:[],goals:[]});
 C.awardBehavior(s,cls,date,cls.tasks[0].id);const before=JSON.stringify(state),first=tracker.observe(state,date);
 assert.equal(first.awards.length,1);assert.equal(first.awards[0].studentId,s.id);assert.equal(JSON.stringify(state),before);
 assert.equal(tracker.observe(copy(state),date).awards.length,0);
 C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.equal(tracker.observe(state,date).awards.length,1);
});
test('reversals, restored old awards, deductions, imported pupils and old-day records never become new rewards',()=>{
 const {state,cls,s,date}=fixture(),tracker=R.createTracker();C.awardBehavior(s,cls,date,cls.tasks[0].id);tracker.observe(state,date);
 const award=s.days[date].tasks.find(t=>t.status==='done');award.status='pending';assert.equal(tracker.observe(state,date).awards.length,0);
 award.status='done';assert.equal(tracker.observe(state,date).awards.length,0);
 cls.tasks.push({id:C.uid(),title:'Geliştirme',points:-1});C.ensureDay(s,cls,date);C.awardBehavior(s,cls,date,cls.tasks.at(-1).id);assert.equal(tracker.observe(state,date).awards.length,0);
 const imported=C.newStudent('Yeni');cls.students.push(imported);C.ensureDay(imported,cls,date);C.awardBehavior(imported,cls,date,cls.tasks[0].id);
 C.ensureDay(s,cls,'2020-01-01');C.awardBehavior(s,cls,'2020-01-01',cls.tasks[0].id);assert.equal(tracker.observe(state,date).awards.length,0);
 assert.equal(tracker.observe(state,'2099-01-01').awards.length,0);
});
test('a shared goal celebrates once, on a positive award crossing the existing target',()=>{
 const {state,cls,s,date}=fixture();C.startGoal(cls,'Birlikte okuma',2);const tracker=R.createTracker();tracker.observe(state,date);
 C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.equal(tracker.observe(state,date).goals.length,0);
 C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.equal(tracker.observe(state,date).goals.length,1);
 assert.equal(tracker.observe(copy(state),date).goals.length,0);
 const done=s.days[date].tasks.filter(t=>t.status==='done');done[0].status='pending';tracker.observe(state,date);
 C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.equal(tracker.observe(state,date).goals.length,0,'a later recrossing is not a second completion');
 C.startGoal(cls,'Yeni ortak hedef',1);tracker.observe(state,date);C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.equal(tracker.observe(state,date).goals.length,1);
});
test('already-complete goals, lower target edits and new seasons cannot trigger a celebration',()=>{
 const {state,cls,s,date}=fixture();C.startGoal(cls,'Birlikte',20);C.awardBehavior(s,cls,date,cls.tasks[0].id);const tracker=R.createTracker();tracker.observe(state,date);
 cls.goal.target=1;assert.equal(tracker.observe(state,date).goals.length,0);
 assert.deepEqual(R.createTracker().observe(copy(state),date),{awards:[],goals:[]});
 C.startNewSeason(cls);assert.deepEqual(tracker.observe(state,date),{awards:[],goals:[]});
});
test('disabling and re-enabling celebration settings survives validation and cloud copies',()=>{
 const {state}=fixture();assert.equal(state.settings.rewardMotion,true);state.settings.rewardMotion=false;
 assert.equal(C.validate(copy(state)).settings.rewardMotion,false);
 delete state.settings.rewardMotion;assert.equal(C.validate(copy(state)).settings.rewardMotion,true);
});
test('restoring an existing-class backup seeds its history silently while subsequent new awards still celebrate',()=>{
 const {state,cls,s,date}=fixture(),tracker=R.createTracker();tracker.observe(state,date);
 const restored=copy(state),rc=restored.classes[0],rs=rc.students[0];C.awardBehavior(rs,rc,date,rc.tasks[0].id);
 tracker.reset(restored,date);assert.deepEqual(tracker.observe(restored,date),{awards:[],goals:[]});
 C.awardBehavior(rs,rc,date,rc.tasks[0].id);assert.equal(tracker.observe(restored,date).awards.length,1);
});
test('mentor goal milestones are fresh, once-only crossings; edits, corrections and restored history stay quiet',()=>{
 const {state,cls,s,date}=fixture();C.startGoal(cls,'Birlikte',20);
 const awards=R.createTracker(),milestones=R.createMilestoneTracker();
 const observe=()=>milestones.observe(state,date,awards.observe(state,date).awards);
 assert.deepEqual(observe(),[]);
 C.updateTaskPoints(cls,cls.tasks[0].id,5);
 for(const level of [25,50,75]){C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.equal(observe()[0].level,level);assert.deepEqual(observe(),[]);}
 C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.deepEqual(observe(),[]);
 const award=s.days[date].tasks.find(t=>t.status==='done');award.status='pending';observe();C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.deepEqual(observe(),[]);
 assert.deepEqual(R.createMilestoneTracker().observe(copy(state),date,[{classId:cls.id}]),[]);
 C.startGoal(cls,'Yeni hedef',100);observe();cls.goal.target=10;assert.deepEqual(observe(),[]);
 cls.goal.enabled=false;observe();cls.goal.enabled=true;assert.deepEqual(observe(),[]);
 assert.deepEqual(observe(),[]);
});
