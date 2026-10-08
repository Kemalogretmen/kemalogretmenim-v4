const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/akvaryum-core.js');
const fs = require('node:fs');
const path = require('node:path');
const TODAY = '2026-10-01';
function setup() {
  const state = C.initialState(), cls = state.classes[0], student = C.newStudent('Deniz');
  cls.students.push(student); const day = C.ensureDay(student, cls, TODAY);
  return { state, cls, student, day };
}
test('each completed task earns exactly one feed, including repeated clicks and undo after feeding', () => {
  const { student, day } = setup();
  assert.equal(C.feed(student, TODAY), false);
  C.setTask(student, TODAY, day.tasks[0].id, 'done');
  C.setTask(student, TODAY, day.tasks[0].id, 'done');
  assert.equal(C.balance(student), 1);
  assert.equal(C.feed(student, TODAY), true);
  assert.equal(C.feed(student, TODAY), false);
  C.setTask(student, TODAY, day.tasks[0].id, 'pending');
  C.setTask(student, TODAY, day.tasks[0].id, 'done');
  assert.equal(C.balance(student), 0, 'Toggling a consumed task cannot manufacture more food.');
});
test('missed tasks slow the fish, completion recovers it, and feeding makes it happy', () => {
  const { student, day } = setup();
  const calmSpeed = C.mood(student, TODAY).speed;
  C.setTask(student, TODAY, day.tasks[0].id, 'missed');
  assert.equal(C.mood(student, TODAY).id, 'sad');
  assert(C.mood(student, TODAY).speed < calmSpeed);
  C.setTask(student, TODAY, day.tasks[0].id, 'done');
  assert.equal(C.mood(student, TODAY).id, 'ready');
  C.feed(student, TODAY);
  assert.equal(C.mood(student, TODAY).id, 'happy');
  assert(C.mood(student, TODAY).speed > calmSpeed);
});
test('an absent student rests, cannot earn or spend food, and recovers when attendance is restored', () => {
  const { student, day } = setup();
  C.setTask(student, TODAY, day.tasks[0].id, 'done'); day.absent = true;
  assert.equal(C.balance(student), 0);
  assert.equal(C.mood(student, TODAY).id, 'resting');
  assert.equal(C.setTask(student, TODAY, day.tasks[1].id, 'done'), false);
  assert.equal(C.feed(student, TODAY), false);
  day.absent = false;
  assert.equal(C.balance(student), 1);
});
test('a new day retains yesterday’s earned food and recovers from yesterday’s incomplete tasks', () => {
  const { student, cls, day } = setup();
  C.setTask(student, TODAY, day.tasks[0].id, 'done');
  const next = C.ensureDay(student, cls, '2026-10-02');
  assert.equal(C.balance(student), 1);
  assert.equal(C.mood(student, '2026-10-02').id, 'sad');
  assert.equal(next.tasks[0].status, 'pending');
  C.setTask(student, '2026-10-02', next.tasks[0].id, 'done');
  assert.equal(C.mood(student, '2026-10-02').id, 'ready');
  assert.equal(C.balance(student), 2);
});
test('unopened dates are not invented and absent days do not introduce penalties', () => {
  const { student, cls, day } = setup(); day.absent = true;
  C.ensureDay(student, cls, '2026-10-05');
  assert.deepEqual(Object.keys(student.days), [TODAY, '2026-10-05']);
  assert.equal(C.mood(student, '2026-10-05').id, 'calm');
});
test('changing task templates never rewrites saved day snapshots', () => {
  const { student, cls, day } = setup();
  C.setTask(student, TODAY, day.tasks[0].id, 'done');
  cls.tasks = [{ id: C.uid(), title: 'Yeni görev' }];
  assert.equal(C.ensureDay(student, cls, TODAY).tasks.length, 3);
  assert.equal(C.ensureDay(student, cls, '2026-10-02').tasks[0].title, 'Yeni görev');
  assert.equal(C.earned(student), 1);
});
test('backup round-trip preserves species, attendance, tasks, food and classroom selection', () => {
  const { state, cls, student, day } = setup();
  student.species = 'turtle'; cls.theme = 'grotto'; C.setTask(student, TODAY, day.tasks[0].id, 'done'); C.feed(student, TODAY);
  const extra = C.newClass('2-A'); state.classes.push(extra); state.activeClassId = extra.id;
  const restored = C.validate(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored, state);
});
test('invalid, duplicated, oversized and prototype-shaped backup data are rejected', () => {
  assert.throws(() => C.validate({ version: 2, classes: [] }));
  const { state, student } = setup();
  state.classes[0].students.push(student);
  assert.throws(() => C.validate(state));
  const a = setup(); a.student.id = '__proto__'; assert.throws(() => C.validate(a.state));
  const b = setup(); b.student.days[TODAY].tasks.push(b.day.tasks[0]); assert.throws(() => C.validate(b.state));
  const c = setup(); c.student.days[TODAY].tasks[0].status = 'invented'; assert.throws(() => C.validate(c.state));
  const d = setup(); d.cls.students = Array.from({ length: 61 }, () => C.newStudent('A')); assert.throws(() => C.validate(d.state));
});
test('classes and students keep independent balances and immutable task templates', () => {
  const { student, cls, day } = setup(); const other = C.newStudent('Ada'); C.ensureDay(other, cls, TODAY);
  C.setTask(student, TODAY, day.tasks[0].id, 'done');
  assert.equal(C.balance(other), 0); assert.equal(cls.tasks[0].status, undefined);
  assert.equal(C.setTask(student, TODAY, 'unknown', 'done'), false);
});
test('local date keys do not shift late-night work into another calendar day', () => {
  const local = new Date(2026, 9, 1, 23, 59);
  assert.equal(C.dayKey(local), TODAY);
});
test('all generated species have real alpha channels and all scene assets exist', () => {
  for (const s of C.SPECIES) {
    const buffer = fs.readFileSync(path.join(__dirname, '../assets/akvaryum/canlilar', s.file));
    assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
    assert.equal(buffer[25], 6, s.name + ' must be RGBA PNG');
  }
  for (const t of C.THEMES) assert(fs.statSync(path.join(__dirname, '../assets/akvaryum/arka-planlar', t.file)).size > 10000);
});

test('weighted positive behavior awards its score but consumes only one food, without duplicate rewards', () => {
  const { student, cls, day } = setup();
  assert.equal(C.updateTaskPoints(cls, day.tasks[0].id, 7, TODAY), true);
  assert.deepEqual(C.completeAndFeed(student, TODAY, day.tasks[0].id), {points:7,fed:true});
  assert.equal(C.earned(student),7); assert.equal(C.balance(student),0); assert.equal(student.feeds.length,1);
  assert.equal(C.completeAndFeed(student, TODAY, day.tasks[0].id), null);
  assert.equal(student.feeds.length,1); assert.equal(C.earned(student),7);
  C.setTask(student,TODAY,day.tasks[0].id,'pending');
  assert.equal(C.earned(student),0);
  assert.deepEqual(C.completeAndFeed(student,TODAY,day.tasks[0].id),{points:7,fed:false});
  assert.equal(student.feeds.length,1);
});
test('changing point values preserves already awarded scores and all older daily snapshots', () => {
  const { student, cls, day } = setup();
  const other=C.newStudent('Ada');cls.students.push(other);C.ensureDay(other,cls,TODAY);
  C.completeAndFeed(student,TODAY,day.tasks[0].id);
  C.updateTaskPoints(cls,day.tasks[0].id,15,TODAY);
  assert.equal(C.earned(student),1);assert.equal(day.tasks[0].points,1);
  assert.equal(other.days[TODAY].tasks[0].points,15);
  const tomorrow=C.ensureDay(student,cls,'2026-10-02');
  assert.equal(tomorrow.tasks[0].points,15);
  C.updateTaskPoints(cls,day.tasks[0].id,20,'2026-10-02');
  assert.equal(other.days[TODAY].tasks[0].points,15);
  C.completeAndFeed(student,'2026-10-02',day.tasks[0].id);
  assert.equal(C.earned(student),21);
});
test('positive behavior cannot reward an absent student or an unknown task',()=>{
  const {student,day}=setup();day.absent=true;
  assert.equal(C.completeAndFeed(student,TODAY,day.tasks[0].id),null);
  assert.equal(C.completeAndFeed(student,TODAY,'unknown'),null);
  assert.equal(C.earned(student),0);assert.equal(student.feeds.length,0);
});
test('invalid behavior points are rejected without mutation and legacy points migrate to one',()=>{
  for(const value of [0,-1,1.5,1001,NaN,Infinity,'5',null]) {
    const {state,cls,day}=setup();
    assert.equal(C.updateTaskPoints(cls,day.tasks[0].id,value,TODAY),false);
    assert.equal(day.tasks[0].points,1);
    cls.tasks[0].points=value;assert.throws(()=>C.validate(state));
  }
  const {state,cls,student,day}=setup();
  delete student.createdAt;
  cls.tasks.forEach(t=>delete t.points);day.tasks.forEach(t=>delete t.points);
  day.tasks[0].status='done';student.feeds.push({day:TODAY,at:12345});
  const copy=C.validate(JSON.parse(JSON.stringify(state)));
  assert.equal(C.earned(copy.classes[0].students[0]),1);
  assert.equal(C.balance(copy.classes[0].students[0]),0);
  assert.equal(copy.classes[0].tasks[0].points,1);
});
test('weighted scores, creation time and feed timestamps survive backup round trips',()=>{
  const {state,cls,student,day}=setup();
  C.updateTaskPoints(cls,day.tasks[0].id,25,TODAY);C.completeAndFeed(student,TODAY,day.tasks[0].id);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(state))),state);
});
test('hunger starts only after 24 hours, advances to two days and resets after feeding',()=>{
  const {student,day}=setup(), now=Date.now(), hour=3600000;
  student.createdAt=now-23*hour; assert.equal(C.hungerDays(student,now),0);
  student.createdAt=now-24*hour; assert.equal(C.hungerDays(student,now),1);
  student.createdAt=now-48*hour; assert.equal(C.hungerDays(student,now),2);
  student.feeds=[{day:TODAY,at:now-49*hour},{day:TODAY,at:now-25*hour}];
  assert.equal(C.hungerDays(student,now),1);
  student.feeds=[];C.completeAndFeed(student,TODAY,day.tasks[0].id);
  assert.equal(C.hungerDays(student,Date.now()),0);
  assert.equal(C.hungerDays(student,now-100*hour),0);
});
test('legacy never-fed students use first known date and midnight alone is not a hungry day',()=>{
  const {student}=setup();delete student.createdAt;
  const baseline=new Date(TODAY+'T00:00:00').getTime();
  assert.equal(C.hungerDays(student,baseline+86400000),1);
  student.feeds=[{day:TODAY,at:new Date(TODAY+'T23:59:00').getTime()}];
  assert.equal(C.hungerDays(student,new Date('2026-10-02T00:01:00').getTime()),0);
});


test('repeated behavior awards have independent weighted history, feeds, corrections and backup records', () => {
  const {student, cls, day, state}=setup(), id=day.tasks[0].id;
  C.updateTaskPoints(cls,id,7,TODAY);
  for(let i=0;i<25;i++) assert.deepEqual(C.awardBehavior(student,cls,TODAY,id),{points:7,fed:true});
  assert.equal(C.earned(student),175);assert.equal(student.feeds.length,25);assert.equal(C.balance(student),0);
  assert.equal(C.behaviorChoices(student,cls,TODAY).length,3);
  assert.equal(C.behaviorChoices(student,cls,TODAY)[0].count,25);
  const extra=day.tasks.find(t=>t.sourceId===id);
  assert.notEqual(extra.id,id);assert.ok(extra.awardedAt>0);
  C.correctAward(student,TODAY,extra.id);
  assert.equal(C.earned(student),168);assert.equal(C.balance(student),0);
  C.correctAward(student,TODAY,day.tasks.at(-1).id,true);
  assert.equal(C.earned(student),161);
  C.updateTaskPoints(cls,id,9,TODAY);
  assert.deepEqual(C.awardBehavior(student,cls,TODAY,id),{points:9,fed:true});
  assert.equal(C.earned(student),170);assert.equal(day.tasks[0].points,7);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(state))),state);
  for(const field of [{sourceId:'__proto__'},{sourceId:8},{awardedAt:-1}]) {
    const bad=JSON.parse(JSON.stringify(state));Object.assign(bad.classes[0].students[0].days[TODAY].tasks.at(-1),field);
    assert.throws(()=>C.validate(bad));
  }
  const before=JSON.stringify(student);assert.equal(C.awardBehavior(student,cls,TODAY,'missing'),null);assert.equal(JSON.stringify(student),before);
  day.absent=true;assert.equal(C.awardBehavior(student,cls,TODAY,id),null);
});
