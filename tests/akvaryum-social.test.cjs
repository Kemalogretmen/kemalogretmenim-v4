const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),Social=require('../js/akvaryum-social.js');
test('support messages and paired greetings vary without repeats until each shuffled deck is exhausted',()=>{
 for(const value of [0,.23,.99]){
  const deck=Social.create(()=>value),messages=Array.from({length:Social.encouragements.length},()=>deck.encouragement());
  assert.equal(new Set(messages).size,16);const next=deck.encouragement();assert.notEqual(next,messages.at(-1));
  const greetings=Array.from({length:Social.greetings.length},()=>deck.greeting());
  assert.equal(new Set(greetings.map(p=>p.join(''))).size,12);assert.ok(greetings.every(p=>p.length===2));
  assert.notDeepEqual(deck.greeting(),greetings.at(-1));
 }
 const a=Social.create(()=>0),b=Social.create(()=>.99);assert.notEqual(a.encouragement(),b.encouragement());
});
test('daily champion uses only awarded net points today, shares ties and recomputes after corrections',()=>{
 const cl=C.newClass(),date=C.dayKey(),yesterday='2026-01-01';cl.students.push(C.newStudent('Ada'),C.newStudent('Ece'));
 const [a,b]=cl.students;C.ensureDay(a,cl,yesterday).tasks[0]={...cl.tasks[0],points:100,status:'done'};
 C.ensureDay(a,cl,date).tasks[0]={...cl.tasks[0],points:3,status:'done'};
 C.ensureDay(b,cl,date).tasks[0]={...cl.tasks[0],points:5,status:'done'};
 assert.deepEqual(C.dailyChampions(cl,date),{points:5,ids:[b.id]});assert.equal(C.earned(a),103);
 a.days[date].tasks.push({id:C.uid(),title:'Ek ödül',points:2,status:'done'});
 assert.deepEqual(C.dailyChampions(cl,date),{points:5,ids:[a.id,b.id]});
 b.days[date].tasks.push({id:C.uid(),title:'Kesinti',points:-2,status:'done'});
 assert.deepEqual(C.dailyChampions(cl,date),{points:5,ids:[a.id]});
 assert.equal(C.correctAward(b,date,b.days[date].tasks.at(-1).id),true);
 assert.deepEqual(C.dailyChampions(cl,date),{points:5,ids:[a.id,b.id]});
 C.startNewSeason(cl,date);assert.deepEqual(C.dailyChampions(cl,date),{points:0,ids:[]});
});
test('a new day, pending tasks and nonpositive daily totals have no daily champion',()=>{
 const cl=C.newClass(),s=C.newStudent('Ada'),date=C.dayKey();cl.students.push(s);C.ensureDay(s,cl,date);
 assert.deepEqual(C.dailyChampions(cl,date),{points:0,ids:[]});s.days[date].tasks.push({id:C.uid(),title:'Kesinti',points:-1,status:'done'});
 assert.deepEqual(C.dailyChampions(cl,date),{points:0,ids:[]});assert.deepEqual(C.dailyChampions(cl,'2030-01-01'),{points:0,ids:[]});
});
test('teacher praise, invitations and shared motivation use varied non-ranking messages and round-trip preferences',()=>{
 const deck=Social.create(()=>.3);
 for(const [key,items] of [['praise',Social.praises],['invitation',Social.invitations],['milestone',Social.milestones]]){
  const messages=Array.from({length:items.length},()=>deck[key]());assert.equal(new Set(messages).size,items.length);
  assert.notEqual(deck[key](),messages.at(-1));assert.ok(messages.every(s=>!s.match(/en iyi|birinci|puan|daha iyi|diğerlerinden/i)));
 }
 const state=C.initialState();for(const key of ['teacherPraise','teacherPicker','teacherGoal','teacherGlow']){assert.equal(state.settings[key],true);state.settings[key]=false;}
 const saved=C.validate(JSON.parse(JSON.stringify(state)));for(const key of ['teacherPraise','teacherPicker','teacherGoal','teacherGlow'])assert.equal(saved.settings[key],false);
});
