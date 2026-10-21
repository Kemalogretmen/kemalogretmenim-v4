const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {parseHTML}=require('linkedom');
const S=require('../js/akvaryum-seasonal.js');
const C=require('../js/akvaryum-core.js');
test('seasonal offers follow Istanbul dates, respect year boundaries and never alter a classroom',()=>{
 const state=C.initialState(),before=JSON.stringify(state);
 for(const date of ['2026-10-28T20:59:59Z','2026-10-29T21:00:00Z','2026-12-19T20:59:59Z','2027-01-07T21:00:00Z','2026-03-01T10:00:00Z'])assert.equal(S.suggestion(new Date(date)),null,date);
 assert.equal(S.suggestion(new Date('2026-10-28T21:00:00Z')).theme,'republic-day');
 assert.equal(S.suggestion(new Date('2026-10-29T20:59:59Z')).key,'republic-2026');
 const first=S.suggestion(new Date('2026-12-19T21:00:00Z'));
 assert.equal(first.theme,'new-year');assert.equal(first.key,'new-year-2026');
 assert.equal(S.suggestion(new Date('2027-01-07T20:59:59Z')).key,first.key);
 assert.equal(S.suggestion(new Date('2027-12-20T00:00:00Z')).key,'new-year-2027');
 assert.equal(JSON.stringify(state),before);
});
function fixture(){
 const {document}=parseHTML('<div id="area"><img id="snowman" data-src="/assets/akvaryum/dekor/kardan-adam-kirmizi-sapka.webp" data-png="/assets/akvaryum/dekor/kardan-adam-kirmizi-sapka.png"></div><div id="snow"></div><aside></aside>');
 const snowman=document.getElementById('snowman'),snow=document.getElementById('snow'),republic=document.querySelector('aside');
 snowman.getBoundingClientRect=()=>({left:650,top:250,width:360,height:360});snowman.parentElement.getBoundingClientRect=()=>({left:20,top:150,width:1100,height:500});
 return {snowman,snow,republic,document,scene:S.create(snowman,snow,{republic})};
}
test('the exact supplied snowman is lazy loaded and snowfall is pooled without a collision obstacle',()=>{
 const h=fixture();h.scene.update('reef');assert.equal(h.snowman.getAttribute('src'),null);
 h.scene.update('new-year');assert.equal(h.snowman.hidden,false);assert.equal(h.snow.children.length,40);assert.match(h.snowman.getAttribute('src'),/kirmizi-sapka.webp$/);
 const first=h.snow.firstElementChild;h.scene.update('new-year');assert.equal(h.snow.firstElementChild,first);assert.equal(h.scene.obstacles,undefined);
 assert.equal(h.snow.style.getPropertyValue('--snow-fall'),'532px');
 h.scene.update('new-year',{lite:true,reduced:true});assert.equal([...h.snow.children].filter(f=>!f.hidden).length,18);assert.equal(h.snow.classList.contains('is-paused'),true);
 h.scene.update('new-year',{motion:false});assert.equal(h.snow.classList.contains('is-paused'),true);
 h.scene.update('republic-day');assert.equal(h.snowman.hidden,true);assert.equal(h.snow.hidden,true);assert.equal(h.republic.hidden,false);
 h.scene.update('reef');assert.equal(h.republic.hidden,true);
});
test('the supplied snowman uses PNG if WebP fails without changing its transparency or pose',()=>{
 const h=fixture();h.scene.update('new-year');h.snowman.dispatchEvent(new h.document.defaultView.Event('error'));assert.match(h.snowman.getAttribute('src'),/kirmizi-sapka.png$/);
 h.scene.update('reef');assert.equal(h.snowman.hidden,true);h.scene.update('new-year');assert.equal(h.snowman.hidden,false);assert.match(h.snowman.getAttribute('src'),/kirmizi-sapka.png$/);
});
test('original-photo ripple stays subtle and its crop aligns with centered cover on every aspect ratio',()=>{
 for(const lite of [false,true]){
  const first=S.clothGeometry(600,330,0,lite),next=S.clothGeometry(600,330,3,lite);assert.equal(first.length,lite?24:48);assert.notDeepEqual(first,next);
  assert.ok(Math.abs(first[0].y-next[0].y)<.05);for(const s of next){assert.ok(Object.values(s).every(Number.isFinite));assert.ok(Math.abs(s.y)<330*.01);assert.ok(s.shade>=0&&s.shade<.025);}
 }
 for(const [w,h] of [[1672,941],[1200,600],[390,650],[1920,900]]){
  const p=S.flagPlacement(w,h),scale=Math.max(w/1672,h/941);
  assert.equal(p.x,(w-1672*scale)/2+686*scale);assert.equal(p.y,(h-941*scale)/2+125*scale);assert.equal(p.width,452*scale);assert.equal(p.height,246*scale);
 }
});
test('photographic flag shares the aquarium clock, respects reduced motion and keeps phase through panel updates',()=>{
 const {document}=parseHTML('<div><img id="snowman"></div><div id="snow"></div><div id="flag"><img data-src="/assets/akvaryum/arka-planlar/cumhuriyet-29-ekim.jpg" hidden><canvas hidden></canvas></div>');
 const flag=document.getElementById('flag'),image=flag.querySelector('img'),canvas=flag.querySelector('canvas');let draws=0;const positions=[],sources=[];
 flag.getBoundingClientRect=()=>({width:1200,height:600});Object.defineProperty(image,'complete',{value:true});Object.defineProperty(image,'naturalWidth',{value:1672});Object.defineProperty(image,'naturalHeight',{value:941});
 canvas.getContext=()=>({clearRect(){},drawImage(...args){draws++;positions.push(args[6]);sources.push(args.slice(1,5));},fillRect(){}});
 const scene=S.create(document.getElementById('snowman'),document.getElementById('snow'),{flag});
 scene.update('republic-day');assert.equal(scene.active(),true);const count=draws;scene.draw(100);assert.ok(draws>count);const before=positions.slice(-48);scene.draw(120);assert.deepEqual(positions.slice(-48),before,'capped FPS');scene.draw(220);assert.notDeepEqual(positions.slice(-48),before);
 assert.equal(sources[0][0],686);assert.equal(sources[0][1],125);assert.equal(canvas.style.left,S.flagPlacement(1200,600).x+'px');
 const phase=positions.slice(-48);scene.update('republic-day');assert.deepEqual(positions.slice(-48),phase,'settings/panel update must not restart the cloth');
 scene.update('republic-day',{reduced:true});assert.equal(scene.active(),false);const stopped=draws;scene.draw(2000);assert.equal(draws,stopped);
 scene.update('reef');assert.equal(flag.hidden,true);scene.draw(3000);assert.equal(draws,stopped);
});
test('new assets survive validation and preserve the scene layer contract',()=>{
 const state=C.initialState(),cls=state.classes[0];cls.theme='new-year';cls.students.push(C.newStudent('Safiye','safiye'),C.newStudent('Kılıç','swordfish'));
 const checked=C.validate(state);assert.equal(checked.classes[0].theme,'new-year');assert.deepEqual(checked.classes[0].students.map(s=>s.species),['safiye','swordfish']);
 assert.equal(C.THEMES.length,8);for(const theme of C.THEMES){assert.ok(fs.existsSync('assets/akvaryum/arka-planlar/'+theme.file));}
 const html=fs.readFileSync('ogretmen/akvaryum.html','utf8'),css=fs.readFileSync('css/akvaryum.css','utf8');
 assert.ok(html.indexOf('/js/akvaryum-seasonal.js')<html.indexOf('/js/akvaryum.js?'));
 assert.match(css,/\.seasonal-snowman\{[^}]*z-index:2;pointer-events:none/);
 assert.doesNotMatch(fs.readFileSync('js/akvaryum-seasonal.js','utf8'),/requestAnimationFrame|setInterval/);
 assert.match(html,/aria-label="CUMHURİYET 103 YAŞINDA"/);assert.match(css,/\.republic-decor\{[^}]*z-index:2;pointer-events:none/);
 assert.doesNotMatch(html,/akvaryum-seasonal-model.js/);assert.doesNotMatch(html,/turkiye-bayragi.svg/);assert.match(html,/<b>CUMHURİYET 103 YAŞINDA<\/b>/);
 assert.equal(C.THEMES.find(t=>t.id==='republic-day').file,'cumhuriyet-29-ekim.jpg');
});
