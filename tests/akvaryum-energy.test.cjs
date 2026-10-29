const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),E=require('../js/akvaryum-energy.js'),Social=require('../js/akvaryum-social.js');
const now=new Date('2026-10-28T12:00:00+03:00').getTime(),date='2026-10-28';
function pupil(feeds,points=feeds,ago=0){const s=C.newStudent('Örnek');s.createdAt=now;s.days[date]={absent:false,tasks:[{id:C.uid(),status:'done',points}]};s.feeds=Array.from({length:feeds},()=>({id:C.uid(),day:date,at:now-ago}));return s;}
test('daily energy gives the five most-fed fish 40%, others 20–30%, with equal boosts for ties',()=>{
 const cl={students:[8,7,6,5,4,3,2,1].map(n=>pupil(n,n*5))},stats=E.measure(cl,date,now);
 const factors=cl.students.map(s=>E.factor(stats.get(s.id),now));assert.ok(factors.slice(0,5).every(f=>Math.abs(f-1.4)<1e-8));
 assert.ok(factors.slice(5).every(f=>f>=1.2&&f<=1.3));assert.ok(factors[5]>factors[7]);
 cl.students.push(pupil(4,20));const tied=E.measure(cl,date,now);assert.equal(E.factor(tied.get(cl.students[4].id),now),E.factor(tied.get(cl.students[8].id),now));
 const reversed=E.measure({students:[...cl.students].reverse()},date,now);for(const s of cl.students)assert.deepEqual(tied.get(s.id),reversed.get(s.id));
});
test('boost fades continuously over 25 minutes, resets on the next day, and cannot depend on lifetime points',()=>{
 const s=pupil(4,20),cl={students:[s]},stats=E.measure(cl,date,now).get(s.id);let before=1.4;
 for(let elapsed=0;elapsed<=E.BOOST_MS;elapsed+=1000){const factor=E.factor(stats,now+elapsed);assert.ok(factor<=before+1e-10&&factor>=1);before=factor;}
 assert.equal(E.factor(stats,now+E.BOOST_MS),1);assert.equal(E.factor(stats,now+3600000),1);
 s.days['2026-10-20']={tasks:[{status:'done',points:100000}],absent:false};assert.deepEqual(E.measure(cl,date,now).get(s.id),stats);
 assert.equal(E.factor(E.measure(cl,'2026-10-29',now).get(s.id),now),1);
});
test('one day unfed is 28% slower and two days remains stopped; absent fish and pending/reversed rewards add no boost',()=>{
 const s=pupil(0,0),cl={students:[s]};s.createdAt=now-86400000-1000;
 assert.equal(E.factor(E.measure(cl,date,now).get(s.id),now),.72);s.createdAt=now-2*86400000-1000;assert.equal(E.factor(E.measure(cl,date,now).get(s.id),now),0);
 const fed=pupil(2,7);fed.days[date].absent=true;assert.equal(E.factor(E.measure({students:[fed]},date,now).get(fed.id),now),0);
 fed.days[date].absent=false;fed.days[date].tasks[0].status='pending';assert.equal(E.factor(E.measure({students:[fed]},date,now).get(fed.id),now),1);
 fed.days[date].tasks[0].status='done';fed.feeds.forEach(f=>f.creditReversed=true);assert.equal(E.factor(E.measure({students:[fed]},date,now).get(fed.id),now),1);
});
test('speed changes settle gently; hunger scheduling is sparse, fair and deferred after tab hiding',()=>{
 let current=.65;for(let i=0;i<180;i++){const next=E.approach(current,.91,1/60);assert.ok(next>=current&&next-current<.007);current=next;}assert.ok(current>.9&&current<.91);
 const schedule=Social.createHungerSchedule(()=>0),a={id:'a'},b={id:'b'};schedule.reset(100);
 assert.equal(schedule.pick(60099,[a,b]),null);assert.equal(schedule.pick(60100,[a,b]),a);assert.equal(schedule.pick(240099,[a,b]),null);assert.equal(schedule.pick(240100,[a,b]),b);assert.equal(schedule.pick(420100,[a,b]),null);
 schedule.defer(660000);assert.equal(schedule.pick(719999,[a,b]),null);assert.equal(schedule.pick(720000,[a,b]),a);
 const deck=Social.create(()=>0);assert.equal(new Set(Array.from({length:3},()=>deck.hunger())).size,3);
});
test('new icons cover seven groups while each rendered group remains small and all icons are valid',()=>{
 assert.equal(C.TASK_ICON_GROUPS.length,7);assert.ok(C.TASK_ICONS.length>=140);assert.equal(new Set(C.TASK_ICONS).size,C.TASK_ICONS.length);
 for(const group of C.TASK_ICON_GROUPS){assert.ok(group.icons.length<=24);for(const icon of group.icons)assert.equal(C.taskIcon(icon),icon);}
});
