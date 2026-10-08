const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../js/akvaryum-core.js');
const T=require('../js/akvaryum-timer.js');
const date='2026-10-07';
function classroom(){const cls=C.newClass('2-A');cls.tasks[0].points=5;cls.students=['Ada','Deniz','Ege'].map(n=>C.newStudent(n));cls.students.forEach(s=>C.ensureDay(s,cls,date));return cls;}
test('group rewards only selected eligible students, including repeat awards, using weighted points and one food each',()=>{
 const cls=classroom(),[a,b,c]=cls.students,id=cls.tasks[0].id;
 b.days[date].absent=true;
 const result=C.rewardGroup(cls,date,id,[a.id,a.id,b.id,'missing']);
 assert.deepEqual(result,[{id:a.id,points:5,fed:true}]);
 assert.equal(C.earned(a),5);assert.equal(C.earned(b),0);assert.equal(C.earned(c),0);assert.equal(a.feeds.length,1);
 assert.deepEqual(C.rewardGroup(cls,date,id,[a.id,b.id]),[{id:a.id,points:5,fed:true}]);assert.equal(a.feeds.length,2);assert.equal(C.earned(a),10);
 assert.deepEqual(C.rewardGroup(cls,'2026-10-06',id,[c.id]),[]);assert.deepEqual(C.rewardGroup(cls,date,'unknown',[c.id]),[]);
});
test('new goals count net new contributions, preserve scores, track corrections and include new students',()=>{
 const cls=classroom(),a=cls.students[0],id=cls.tasks[0].id;
 C.completeAndFeed(a,date,id);const before=JSON.stringify(cls.students);
 assert.equal(C.startGoal(cls,'Birlikte hikâye saati',10),true);assert.equal(JSON.stringify(cls.students),before);assert.equal(C.goalProgress(cls).points,0);
 C.rewardGroup(cls,date,id,cls.students.slice(1).map(s=>s.id));assert.deepEqual(C.goalProgress(cls),{points:10,target:10,percent:100,complete:true});
 C.setTask(cls.students[1],date,id,'pending');assert.equal(C.goalProgress(cls).points,5);
 C.setTask(a,date,id,'pending');assert.equal(C.goalProgress(cls).points,5);
 const newcomer=C.newStudent('Ece');cls.students.push(newcomer);C.ensureDay(newcomer,cls,date);C.completeAndFeed(newcomer,date,id);assert.equal(C.goalProgress(cls).points,10);
 cls.goal.target=20;assert.equal(C.goalProgress(cls).percent,50);
 const total=cls.students.reduce((n,s)=>n+C.earned(s),0);C.startGoal(cls,'Yeni hedef',30);assert.equal(C.goalProgress(cls).points,0);assert.equal(cls.students.reduce((n,s)=>n+C.earned(s),0),total);
});
test('legacy backups remain valid; goals round-trip and never enter public or parent snapshots',()=>{
 const state=C.initialState();state.classes=[classroom()];state.activeClassId=state.classes[0].id;
 assert.equal(C.validate(state).classes[0].goal,undefined);
 C.startGoal(state.classes[0],'Sınıf oyunu',50);assert.deepEqual(C.validate(JSON.parse(JSON.stringify(state))),state);
 const window={AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
 const snap=window.AquariumSharing.snapshot(state.classes[0],state.settings);
 assert.equal(snap.goal,undefined);assert.equal(JSON.stringify(snap).includes('baseline'),false);assert.equal(JSON.stringify(snap).includes('Sınıf oyunu'),false);
});
test('malformed goal imports fail without changing original student data',()=>{
 const state=C.initialState();state.classes=[classroom()];state.activeClassId=state.classes[0].id;C.startGoal(state.classes[0],'Hedef',20);
 const before=JSON.stringify(state);assert.equal(C.startGoal(state.classes[0],'',10),false);assert.equal(C.startGoal(state.classes[0],'Hedef',-1),false);assert.equal(JSON.stringify(state),before);
 for(const mutate of [g=>g.target=NaN,g=>g.target=1.5,g=>g.enabled='yes',g=>g.baseline=[],g=>g.baseline=JSON.parse('{"__proto__":3}'),g=>g.baseline={x:-1},g=>g.baseline={x:Infinity}]){
  const bad=JSON.parse(before);mutate(bad.classes[0].goal);assert.throws(()=>C.validate(bad),/hedef/);assert.equal(JSON.stringify(state),before);
 }
});
test('timer uses elapsed time after throttling, pauses/resumes correctly and reset removes the deadline',()=>{
 let now=0;const timer=T.create(()=>now);assert.equal(timer.read().status,'idle');assert.equal(timer.start(3,'Okuma'),true);
 now=1000;assert.equal(timer.read().remaining,179000);assert.equal(T.format(timer.read().remaining),'02:59');
 timer.pause();now=120000;assert.equal(timer.read().remaining,179000);assert.equal(timer.read().status,'paused');
 timer.resume();now+=178500;assert.equal(T.format(timer.read().remaining),'00:01');
 now+=60000;assert.deepEqual(timer.read(),{status:'done',remaining:0,title:'Okuma'});timer.resume();assert.equal(timer.read().status,'done');
 timer.reset();assert.deepEqual(timer.read(),{status:'idle',remaining:0,title:''});
 timer.start(1,'Geçiş');now+=70000;timer.pause();assert.equal(timer.read().status,'done');
});
test('invalid timer input never replaces a running session',()=>{
 const timer=T.create(()=>0);timer.start(10,'Okuma');const before=timer.read();
 for(const minutes of [0,-1,1.5,61,NaN,Infinity]) assert.equal(timer.start(minutes,'Yeni'),false);
 assert.equal(timer.start(1,''),false);assert.deepEqual(timer.read(),before);
});
