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

test('stopwatch measures wall time across background gaps, pauses, resumes and can return to countdown',()=>{
 let now=1000;const t=T.create(()=>now);assert.ok(t.startStopwatch('Çalışma'));assert.equal(t.mode(),'stopwatch');
 now+=65432;assert.equal(t.read().remaining,65432);assert.equal(T.format(t.read().remaining,t.mode()),'01:05');
 t.pause();now+=100000;assert.equal(t.read().remaining,65432);t.resume();now+=5000;assert.equal(t.read().remaining,70432);
 t.reset();assert.equal(t.read().status,'idle');assert.ok(t.start(1,'Okuma'));assert.equal(t.mode(),'countdown');now+=60000;assert.equal(t.read().status,'done');
});
test('deleting a class preserves other classes and the last removal leaves a usable empty aquarium',()=>{
 const state=C.initialState(),first=state.classes[0],second=C.newClass('Diğer');second.students.push(C.newStudent('Ada'));state.classes.push(second);
 const before=JSON.stringify(second);assert.equal(C.removeClass(state,first.id),true);assert.equal(JSON.stringify(state.classes[0]),before);assert.equal(state.activeClassId,second.id);
 assert.equal(C.removeClass(state,'unknown'),false);C.removeClass(state,second.id);assert.equal(state.classes.length,1);assert.equal(state.classes[0].students.length,0);assert.doesNotThrow(()=>C.validate(state));
});
test('birthdays keep only a valid day/month, support leap days, and stay out of public snapshots',()=>{
 const state=C.initialState(),s=C.newStudent('Ada');s.birthday={day:29,month:2,year:2018};state.classes[0].students.push(s);
 const saved=C.validate(state);assert.deepEqual(saved.classes[0].students[0].birthday,{day:29,month:2});
 assert.equal(C.isBirthday(s,new Date(2028,1,29,23,50)),true);assert.equal(C.isBirthday(s,new Date(2027,1,28)),false);assert.equal(C.isBirthday(s,new Date(2028,2,1)),false);
 for(const birthday of [{day:31,month:4},{day:0,month:1},{day:10,month:13},{day:1.5,month:1}]) {s.birthday=birthday;assert.throws(()=>C.validate(state),/Doğum günü/);}
 s.birthday={day:9,month:10};const window={AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});assert.equal(JSON.stringify(window.AquariumSharing.snapshot(state.classes[0],state.settings)).includes('birthday'),false);
});
