const {test}=require('node:test');
const assert=require('node:assert/strict');
const Calendar=require('../js/akvaryum-calendar.js');
const Newspaper=require('../js/akvaryum-newspaper.js');

test('Istanbul midnight, year rollover and leap-day reminders stay on the right date',()=>{
  assert.equal(Calendar.day(new Date('2026-12-31T21:00:00Z')),'2027-01-01');
  assert.equal(Calendar.shift('2026-12-31',1),'2027-01-01');
  assert.equal(Calendar.birthdayOn({month:1,day:1},'2026-12-31','2027-01-01'),'2027-01-01');
  assert.equal(Calendar.birthdayOn({month:2,day:29},'2027-02-27','2027-03-05'),'');
  assert.equal(Calendar.birthdayOn({month:2,day:29},'2028-02-28','2028-03-05'),'2028-02-29');
});

test('holidays have an eve reminder and no duplicate weekly greetings even across a month boundary',()=>{
  assert.equal(Calendar.sceneMessages('2027-03-08')[0].upcoming,true);
  assert.equal(Calendar.sceneMessages('2027-03-09')[0].upcoming,undefined);
  assert.deepEqual(Calendar.messages('2025-03-28','2025-04-02').map(g=>g.id),['ramazan']);
  assert.deepEqual(Calendar.messages('2026-12-28','2027-01-03').map(g=>g.id),['newyear']);
  assert.ok(Calendar.messages('2027-05-16','2027-05-22').some(g=>g.id==='youth'));
});

test('the newspaper places its own pupil greeting above the main story, filters future dates and escapes names',()=>{
  const raw={name:'Ada <3',weekStart:'2026-04-20',asOf:'2026-04-23',birthdayOn:'2026-04-22'};
  const html=Newspaper.markup(raw,{image:()=>'/fish.svg'});
  assert.ok(html.indexOf('İyi ki doğdun, Ada &lt;3!')<html.indexOf('news-story'));
  assert.ok(html.includes('23 Nisan kutlu olsun!'));
  assert.ok(!Newspaper.markup({...raw,asOf:'2026-04-21'},{image:()=>'/fish.svg'}).includes('news-greeting'));
});
