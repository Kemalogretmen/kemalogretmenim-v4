const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../js/akvaryum-cosmetics.js'),C=require('../js/akvaryum-core.js'),Sync=require('../js/akvaryum-sync-merge.js');
const clone=v=>JSON.parse(JSON.stringify(v));
test('old backups default to original appearance and unsafe style input cannot become HTML or a URL',()=>{
 const doc=C.initialState(),cl=doc.classes[0],s=C.newStudent('Ada');cl.students.push(s);delete cl.customization;delete s.cosmetics;
 let validated=C.validate(doc);assert.deepEqual(validated.classes[0].customization,{enabled:false,collectionUnlocked:false});assert.deepEqual(validated.classes[0].students[0].cosmetics,{accessory:'none',palette:'original'});
 s.cosmetics={accessory:'<img onerror=alert(1)>',palette:'url(https://external.invalid)',image:'private-file',color:'#ff0000'};
 assert.deepEqual(C.validate(doc).classes[0].students[0].cosmetics,{accessory:'none',palette:'original'});assert.equal(K.svg('constructor'),'');assert.equal(K.accessoryURL('javascript:alert(1)'),'');
});
test('only measured species can wear an accessory, including a safe reset after a species change',()=>{
 for(const s of C.SPECIES){const style=K.normalize({accessory:'sailor',palette:'cool'},s.id);assert.equal(style.accessory,K.PROFILES[s.id]?'sailor':'none');}
 assert.deepEqual(K.normalize({accessory:'sailor',palette:'cool'},'ray'),{accessory:'none',palette:'original'});
 assert.equal(K.normalize({accessory:'leaf'},'__proto__').accessory,'none');
});
test('turning customization off preserves saved choices but projects the original fish',()=>{
 const saved={accessory:'flower',palette:'pearl'},copy=clone(saved);
 assert.deepEqual(K.effective(saved,'betta',{enabled:false}),{accessory:'none',palette:'original'});assert.deepEqual(saved,copy);
 assert.deepEqual(K.effective(saved,'betta',{enabled:true}),saved);
 assert.equal(K.effective({accessory:'star'},'betta',{enabled:true}).accessory,'none');
 assert.equal(K.effective({accessory:'star'},'betta',{enabled:true,collectionUnlocked:true}).accessory,'star');
});
test('body tint preserves transparency, eye/head pixels, dark outlines and white markings',()=>{
 const width=100,height=100,pixels=new Uint8ClampedArray(width*height*4);for(let i=0;i<pixels.length;i+=4)pixels.set([140,100,70,255],i);
 const at=(x,y)=>(y*width+x)*4;
 pixels.set([0,0,0,0],at(57,50));pixels.set([250,250,250,255],at(56,50));pixels.set([10,10,10,255],at(58,50));
 const original=new Uint8ClampedArray(pixels);K.tintPixels(pixels,width,height,'clown','cool');
 for(const [x,y] of [[57,50],[56,50],[58,50],[89,45],[1,1]])assert.deepEqual(pixels.slice(at(x,y),at(x,y)+4),original.slice(at(x,y),at(x,y)+4));
 assert.notDeepEqual(pixels.slice(at(60,52),at(60,52)+3),original.slice(at(60,52),at(60,52)+3));
 for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],original[i]);
});
test('cached colors notify every fish once and fall back safely if Canvas is unavailable',()=>{
 const images=[],doc={createElement(tag){if(tag==='canvas')return {getContext:()=>null};const img={};images.push(img);return img;}};
 const painter=K.createPainter(doc);let a=0,b=0;
 assert.equal(painter.source('/fish.webp','clown','original'),'/fish.webp');assert.equal(images.length,0);
 painter.source('/fish.webp','clown','cool',()=>a++);painter.source('/fish.webp','clown','cool',()=>b++);assert.equal(images.length,1);
 images[0].onload();assert.equal(a,1);assert.equal(b,1);assert.equal(painter.source('/fish.webp','clown','cool'),'/fish.webp');
});
test('shared goal unlocks a collection equally, never spends points and survives corrections and seasons',()=>{
 const doc=C.initialState(),cl=doc.classes[0];cl.students=[C.newStudent('Ada'),C.newStudent('Ece')];cl.customization={enabled:true,collectionUnlocked:false};
 for(const s of cl.students)C.ensureDay(s,cl);C.startGoal(cl,'Birlikte kitap',1);
 const result=C.awardBehavior(cl.students[0],cl,C.dayKey(),cl.tasks[0].id);assert.equal(result.points,1);assert.equal(C.earned(cl.students[0]),1);assert.equal(cl.customization.collectionUnlocked,true);
 for(const s of cl.students)assert.ok(K.available('star',cl.customization.collectionUnlocked));
 const awarded=cl.students[0].days[C.dayKey()].tasks.find(t=>t.status==='done');C.correctAward(cl.students[0],C.dayKey(),awarded.id);
 assert.equal(cl.customization.collectionUnlocked,true);cl.students[1].cosmetics={accessory:'star',palette:'pearl'};
 C.startNewSeason(cl);const restored=C.validate(doc).classes[0];assert.equal(restored.customization.collectionUnlocked,true);assert.equal(restored.students[1].cosmetics.accessory,'star');
});
test('lowering a target or opening an already completed goal does not unlock a new collection',()=>{
 const doc=C.initialState(),cl=doc.classes[0],s=C.newStudent('Ada');cl.students=[s];C.ensureDay(s,cl);C.startGoal(cl,'Hedef',10);
 C.awardBehavior(s,cl,C.dayKey(),cl.tasks[0].id);cl.goal.target=1;assert.equal(C.validate(doc).classes[0].customization.collectionUnlocked,false);
 C.awardBehavior(s,cl,C.dayKey(),cl.tasks[0].id);assert.equal(cl.customization.collectionUnlocked,false);
});
test('offline appearance edits and independent score awards merge without overwriting either',()=>{
 const base=C.initialState(),cl=base.classes[0],s=C.newStudent('Ada');cl.students=[s];C.ensureDay(s,cl);cl.customization.enabled=true;
 const local=clone(base),remote=clone(base);local.classes[0].students[0].cosmetics={accessory:'shell',palette:'pearl'};
 C.awardBehavior(remote.classes[0].students[0],remote.classes[0],C.dayKey(),cl.tasks[0].id);
 const merged=Sync.reconcile(base,local,remote);assert.equal(C.earned(merged.classes[0].students[0]),1);assert.equal(merged.classes[0].students[0].cosmetics.accessory,'shell');
 assert.deepEqual(C.validate(clone(merged)),merged);assert.equal(base.classes[0].students[0].cosmetics.accessory,'none');
});
test('two separate offline awards reaching a shared goal unlock the collection after reconciliation',()=>{
 const base=C.initialState(),cl=base.classes[0];cl.students=[C.newStudent('Ada'),C.newStudent('Ece')];for(const s of cl.students)C.ensureDay(s,cl);C.startGoal(cl,'Birlikte',2);
 const local=clone(base),remote=clone(base);C.awardBehavior(local.classes[0].students[0],local.classes[0],C.dayKey(),cl.tasks[0].id);C.awardBehavior(remote.classes[0].students[1],remote.classes[0],C.dayKey(),cl.tasks[0].id);
 assert.equal(local.classes[0].customization.collectionUnlocked,false);assert.equal(remote.classes[0].customization.collectionUnlocked,false);
 assert.equal(Sync.reconcile(base,local,remote).classes[0].customization.collectionUnlocked,true);
});
