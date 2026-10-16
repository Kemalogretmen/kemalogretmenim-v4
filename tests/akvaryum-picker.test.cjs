const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js');

test('random draws give every present student one equal slot regardless of points, species or growth',()=>{
  const cls=C.newClass('Sınıf'),date='2026-10-15';
  cls.students=['Ada','Ece','Deniz'].map((name,i)=>C.newStudent(name,['clown','jellyfish','turtle'][i]));
  cls.teacher={enabled:true,name:'Öğretmen',species:'turtle'};
  cls.growth={enabled:true,thresholds:C.defaultThresholds()};
  cls.students.forEach(s=>C.ensureDay(s,cls,date));
  C.completeAndFeed(cls.students[1],date,cls.tasks[0].id);
  const original=JSON.stringify(cls);
  for(let i=0;i<3;i++)assert.equal(C.pickStudent(cls,date,[],()=>((i+.5)/3)).id,cls.students[i].id);
  const used=[];
  for(let i=0;i<3;i++){
    const draw=C.pickStudent(cls,date,used,()=>.999999);
    assert.equal(draw.reset,false);assert.ok(!used.includes(draw.id));used.push(draw.id);
    assert.equal(draw.remaining,2-i);
  }
  assert.equal(C.pickStudent(cls,date,used,()=>0).reset,true);
  assert.equal(JSON.stringify(cls),original,'picking must not modify attendance, scores, feed or tasks');
});
test('absent pupils are excluded while unhatched, unfed and newly added pupils stay eligible',()=>{
  const cls=C.newClass('Sınıf'),date='2026-10-15';
  cls.students=['Ada','Ece'].map(name=>C.newStudent(name));
  C.ensureDay(cls.students[0],cls,date).absent=true;
  assert.equal(C.pickStudent(cls,date,[],()=>0).id,cls.students[1].id);
  assert.equal(C.pickStudent(cls,date,[cls.students[0].id],()=>0).reset,false);
  C.ensureDay(cls.students[1],cls,date).absent=true;
  assert.equal(C.pickStudent(cls,date),null);
  assert.equal(C.pickStudent(cls,'2026-10-16',[],()=>0).eligible,2);
  assert.equal(C.pickStudent({...cls,students:[]},date),null);
});
test('invalid random sources cannot select an out of range pupil',()=>{
  const cls=C.newClass('Sınıf');cls.students=[C.newStudent('Ada')];
  for(const number of [-1,1,NaN,Infinity])assert.equal(C.pickStudent(cls,C.dayKey(),[],()=>number),null);
});
