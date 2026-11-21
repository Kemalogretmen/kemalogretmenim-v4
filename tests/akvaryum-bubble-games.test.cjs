const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),{parseHTML}=require('linkedom'),G=require('../js/akvaryum-bubble-games.js');
function seeded(seed=1){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('five games generate unique, answerable choices at all levels and both syllable modes',()=>{
 assert.equal(G.CATALOG.length,10);assert.equal(new Set(G.CATALOG.map(g=>g.id)).size,10);
 for(const game of G.CATALOG.slice(0,5))for(const level of ['easy','medium','hard'])for(const mode of ['count','build']){
  const random=seeded(93),used=new Set();
  for(let i=0;i<40;i++){
   const q=G.generate(game.id,{level,mode,random,used});used.add(q.key);
   assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.value)).size,4);assert.equal(q.options.filter(o=>o.value===q.answer).length,1);
   if(game.id==='multiply'){const [a,b]=q.stem.split(' × ').map(Number);assert.equal(Number(q.answer),a*b);}
   if(game.id==='rounding'){assert.equal(Number(q.answer),Math.round(q.number/q.step)*q.step);assert.ok(q.options.every(o=>Number(o.value)>=0&&Number(o.value)%q.step===0));}
   if(game.id==='syllables'){const word=G.WORDS.find(w=>w.word===q.stem);assert.equal(word.parts.join(''),q.stem);assert.equal((q.stem.match(/[aeıioöuü]/g)||[]).length,word.parts.length);if(mode==='count')assert.equal(Number(q.answer),word.parts.length);}
   if(['synonyms','antonyms'].includes(game.id)){const pairs=game.id==='synonyms'?G.SYNONYMS:G.ANTONYMS;assert.ok(pairs.some(p=>p.includes(q.stem)&&p.includes(q.answer)));}
  }
 }
});
test('word banks cover every syllable and never treat word characters as syllables',()=>{
 assert.ok(G.WORDS.length>=40);assert.ok(G.SYNONYMS.length>=30);assert.ok(G.ANTONYMS.length>=30);
 for(const w of G.WORDS){assert.equal(w.parts.join(''),w.word);assert.ok(w.parts.every(p=>(p.match(/[aeıioöuü]/g)||[]).length===1),w.word);}
});
test('correct answers score once, wrong attempts cost nothing, stale and unknown answers are ignored',()=>{
 let time=0;const session=G.createSession({now:()=>time,random:seeded()});session.start('multiply',{duration:60});let s=session.state();
 const bad=s.question.options.find(o=>o.value!==s.question.answer),right=s.question.options.find(o=>o.value===s.question.answer);
 assert.equal(session.answer('not-an-option',s.token).status,'ignored');assert.equal(session.answer(bad.id,s.token).status,'wrong');assert.equal(session.state().score,0);assert.equal(session.answer(bad.id,s.token).status,'ignored');
 assert.equal(session.answer(right.id,s.token).status,'correct');assert.equal(session.state().score,10);assert.equal(session.answer(right.id,s.token).status,'ignored');assert.equal(session.state().wrong,1);
 session.advance();assert.equal(session.answer(right.id,s.token).status,'ignored');assert.equal(session.state().score,10);
 time=60000;const current=session.state();assert.equal(session.answer(current.question.options[0].id,current.token).status,'ignored');assert.equal(session.state().phase,'result');assert.equal(session.state().score,10);
});
test('syllable craft awards one completed word, not a point per intermediate syllable',()=>{
 const game=G.createSession({now:()=>0,random:seeded(50)});game.start('syllables',{level:'hard',mode:'build',duration:0});let state=game.state();const parts=state.question.parts;
 assert.ok(parts.length>=3);
 for(let i=0;i<parts.length;i++){
  state=game.state();assert.equal(state.question.answer,parts[i]);const option=state.question.options.find(o=>o.value===parts[i]);const result=game.answer(option.id,state.token);
  assert.equal(result.status,i===parts.length-1?'correct':'part');assert.equal(game.state().score,i===parts.length-1?10:0);if(i<parts.length-1)game.advance();
 }
 assert.equal(game.state().correct,1);assert.equal(game.state().remaining,Infinity);assert.equal(game.finish(),true);assert.equal(game.state().phase,'result');
});
test('pausing freezes the clock and pending question; elapsed time and finished rounds cannot resume or score',()=>{
 let time=1000;const game=G.createSession({now:()=>time,random:seeded()});game.start('rounding',{duration:60});time+=12000;game.pause();assert.equal(game.state().remaining,48000);
 time+=3600000;assert.equal(game.state().remaining,48000);assert.equal(game.state().phase,'paused');assert.equal(game.answer('answer-0',game.state().token).status,'ignored');
 game.resume();time+=47999;assert.equal(game.tick().phase,'playing');time++;assert.equal(game.tick().phase,'result');assert.equal(game.resume(),false);assert.equal(game.finish(),false);
 game.menu();assert.equal(game.state().phase,'menu');game.start('synonyms',{duration:0});time+=1e9;assert.equal(game.tick().phase,'playing');
});
function harness({motion=true,cancelSound=()=>{}}={}){
 const {document,window}=parseHTML('<main id="aquarium"><section id="root" hidden></section></main>');
 let time=0,id=0;const jobs=new Map(),sounds=[];const scheduler={setTimeout(fn,ms){const k=++id;jobs.set(k,{fn,ms,interval:false});return k;},clearTimeout(k){jobs.delete(k);},setInterval(fn,ms){const k=++id;jobs.set(k,{fn,ms,interval:true});return k;},clearInterval(k){jobs.delete(k);}};
 document.getElementById('aquarium').getBoundingClientRect=()=>({top:100,left:0,bottom:800,width:1100,height:700});
 const root=document.getElementById('root');const api=G.create({root,now:()=>time,random:seeded(12),scheduler,motion:()=>motion,cancelSound,sound:kind=>sounds.push(kind)});
 const click=selector=>{const b=root.querySelector(selector);assert.ok(b,selector);b.dispatchEvent(new window.Event('click',{bubbles:true}));};
 const run=ms=>{const entry=[...jobs].find(([,j])=>!j.interval&&j.ms===ms);if(entry){jobs.delete(entry[0]);entry[1].fn();}};
 return {document,window,root,api,click,run,jobs,sounds,setTime(value){time=value;},tick(){for(const j of [...jobs.values()])if(j.interval)j.fn();}};
}
test('menu bubbles pop before starting, pause and finish preserve score, closing cancels every game timer',()=>{
 const h=harness();h.api.open();assert.equal(h.root.querySelectorAll('[data-game-id]').length,5);h.click('[data-game-id="multiply"]');assert.equal(h.root.querySelectorAll('.answer-orb').length,0);assert.equal(h.root.querySelectorAll('.menu-orb-popped').length,1);h.run(280);assert.equal(h.root.querySelectorAll('.answer-orb').length,4);
 const stem=h.root.querySelector('.bubble-question h3').textContent,[a,b]=stem.split(' × ').map(Number),answer=[...h.root.querySelectorAll('.answer-orb')].find(bubble=>bubble.textContent===String(a*b));
 answer.dispatchEvent(new h.window.Event('click',{bubbles:true}));answer.dispatchEvent(new h.window.Event('click',{bubbles:true}));assert.equal(h.root.querySelector('[data-game-score]').textContent,'10');h.click('[data-game-action="pause"]');assert.equal(h.root.querySelector('.bubble-game-pause').hidden,false);
 h.setTime(900000);h.tick();assert.notEqual(h.root.querySelector('[data-game-clock]').textContent,'0:00');h.click('[data-game-action="resume"]');h.run(950);h.click('[data-game-action="finish"]');assert.equal(h.root.querySelector('.result-orb strong').textContent,'10');assert.match(h.root.textContent,/1 başarılı adım/);h.api.close();assert.equal(h.root.hidden,true);assert.equal(h.jobs.size,0);assert.equal(h.root.innerHTML,'');
});
test('a hidden tab pauses instead of spending the class time and never resumes automatically',()=>{
 const h=harness({motion:false});h.api.open();assert.ok(h.root.classList.contains('bubble-game-still'));h.click('[data-game-id="antonyms"]');h.setTime(15000);Object.defineProperty(h.document,'hidden',{value:true,configurable:true});h.document.dispatchEvent(new h.window.Event('visibilitychange'));assert.equal(h.root.querySelector('.bubble-game-pause').hidden,false);
 h.setTime(600000);h.tick();assert.equal(h.root.querySelector('[data-game-clock]').textContent,'0:45');Object.defineProperty(h.document,'hidden',{value:false,configurable:true});h.document.dispatchEvent(new h.window.Event('visibilitychange'));assert.equal(h.root.querySelector('.bubble-game-pause').hidden,false);h.api.dispose();assert.equal(h.jobs.size,0);
});
test('the game has no teacher account or network dependency; local score storage is injected',()=>{
 const source=fs.readFileSync('js/akvaryum-bubble-games.js','utf8');assert.ok(!/localStorage|indexedDB|fetch\(|\.rpc\(|AquariumCore|AquariumSharing|awardBehavior|completeAndFeed/.test(source));
 const html=fs.readFileSync('ogretmen/akvaryum.html','utf8');assert.match(html,/id="bubbleGames"[^>]*hidden/);assert.match(html,/akvaryum-bubble-games.js/);
});
test('picked pupil is escaped, survives a round and is cleared on an ordinary opening',()=>{
 const h=harness({motion:false});h.api.open(null,{playerName:'Ada <img src=x onerror=bad>'});assert.equal(h.root.querySelector('.bubble-game-player strong').textContent,'Ada <img src=x onerror=bad>');assert.equal(h.root.querySelector('img[src="x"]'),null);
 h.click('[data-game-id="multiply"]');h.click('[data-game-action="finish"]');assert.match(h.root.querySelector('.bubble-game-player').textContent,/Ada/);h.api.close();h.api.open();assert.equal(h.root.querySelector('.bubble-game-player strong').textContent,'Deniz dostu');h.api.dispose();
});
test('membrane fragments and droplets animate briefly and every canvas frame is removed on close',()=>{
 const h=harness(),frames=new Map(),draws=[];let frameId=0;
 h.window.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};h.window.cancelAnimationFrame=id=>frames.delete(id);
 const create=h.document.createElement.bind(h.document);h.document.createElement=(tag,...args)=>{const el=create(tag,...args);if(tag==='canvas')el.getContext=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||((...args)=>draws.push([key,...args]))});return el;};
 h.api.open();h.root.getBoundingClientRect=()=>({left:10,top:20,width:500,height:400});const button=h.root.querySelector('[data-game-id="multiply"]');button.getBoundingClientRect=()=>({left:80,top:90,width:120,height:120});h.click('[data-game-id="multiply"]');assert.ok(h.document.getElementById('bubbleGamesPop'));assert.equal(frames.size,1);
 const frame=stamp=>{const [id,fn]=[...frames][0];frames.delete(id);fn(stamp);};frame(0);frame(100);assert.ok(draws.filter(d=>d[0]==='ellipse').length>=44);assert.ok(draws.filter(d=>d[0]==='stroke').length>=11);
 h.run(280);assert.ok(h.document.getElementById('bubbleGamesPop'),'effect survives the menu to question transition');h.api.close();assert.equal(frames.size,0);assert.equal(h.document.getElementById('bubbleGamesPop'),null);
 h.api.open();const again=h.root.querySelector('[data-game-id="multiply"]');again.getBoundingClientRect=button.getBoundingClientRect;h.click('[data-game-id="multiply"]');frame(0);frame(600);assert.equal(h.document.getElementById('bubbleGamesPop'),null);assert.equal(frames.size,0);h.api.dispose();
});
test('grades three and four include the nine times table and explicit nearest hundred questions',()=>{
 for(const grade of [3,4]){const random=seeded(93),used=new Set(),seen=new Set();for(let i=0;i<81;i++){const q=G.generate('multiply',{grade,level:'hard',random,used});used.add(q.key);const [a,b]=q.stem.split(' × ').map(Number);assert.ok(a<=9&&b<=9&&a>=1&&b>=1);seen.add(a);seen.add(b);}assert.ok(seen.has(9));
 for(let i=0;i<50;i++){const q=G.generate('rounding',{grade,roundingStep:100,random});assert.equal(q.step,100);assert.equal(Number(q.answer),Math.round(q.number/100)*100);}}
 assert.equal(G.generate('rounding',{grade:2,roundingStep:100}).step,10);
});
test('duel accepts only the first correct answer to a shared question and isolates wrong attempts',()=>{
 let time=0;const s=G.createSession({now:()=>time,random:seeded()});s.start('multiply',{duel:true,grade:4,duration:60});let q=s.state(),right=q.question.options.find(o=>o.value===q.question.answer),wrong=q.question.options.find(o=>o.value!==q.question.answer);
 assert.equal(s.answer(wrong.id,q.token,0).status,'wrong');assert.equal(s.answer(right.id,q.token,1).status,'correct');assert.equal(s.answer(right.id,q.token,0).status,'ignored');assert.deepEqual(s.state().scores,[0,10]);s.advance();assert.equal(s.answer(right.id,q.token,1).status,'ignored');time=60000;assert.equal(s.tick().phase,'result');assert.deepEqual(s.state().scores,[0,10]);
});
test('memory has exactly twelve pairs, independent duel boards, no double scoring and a complete ending',()=>{
 const s=G.createSession({now:()=>0,random:seeded()});s.start('memory',{duel:true,duration:60});const state=s.state();assert.equal(state.deck.length,24);const pairs=new Map();state.deck.forEach((id,i)=>pairs.set(id,[...(pairs.get(id)||[]),i]));assert.equal(pairs.size,12);assert.ok([...pairs.values()].every(p=>p.length===2));
 for(const indices of pairs.values()){assert.equal(s.flip(indices[0],state.token,1).status,'reveal');assert.equal(s.flip(indices[0],state.token,1).status,'ignored');assert.equal(s.flip(indices[1],state.token,1).status,'match');s.resolve(1);}
 assert.equal(s.state().phase,'result');assert.deepEqual(s.state().scores,[0,120]);assert.equal(s.state().boards[0].matched.length,0);
});
test('memory mismatch locks only that player until resolution and pauses protect state',()=>{
 const s=G.createSession({now:()=>0,random:seeded()});s.start('memory',{duel:true});const q=s.state(),a=0,b=q.deck.findIndex(x=>x!==q.deck[a]);s.flip(a,q.token,0);assert.equal(s.flip(b,q.token,0).status,'mismatch');assert.equal(s.flip(4,q.token,0).status,'ignored');assert.equal(s.flip(a,q.token,1).status,'reveal');s.pause();assert.equal(s.resolve(0),false);s.resume();s.resolve(0);assert.deepEqual(s.state().boards[0].open,[]);assert.deepEqual(s.state().scores,[0,0]);
});
test('the familiar melody grows in order and a wrong note immediately ends that player round',()=>{
 const s=G.createSession({now:()=>0,random:seeded()});s.start('lights',{duel:true,duration:0});let q=s.state();assert.deepEqual(q.pattern,G.MELODY.notes.slice(0,2));assert.equal(s.interact(q.pattern[0],q.token,0).status,'ignored');s.revealReady(q.token);const failure=s.interact((q.pattern[0]+1)%4,q.token,0);assert.equal(failure.terminal,true);assert.equal(s.state().phase,'result');assert.equal(s.state().endReason,'wrong-note');assert.equal(s.state().failedPlayer,0);assert.deepEqual(s.state().scores,[0,0]);assert.equal(s.interact(q.pattern[0],q.token,1).status,'ignored');
 s.start('lights',{duration:0});for(let round=1;round<=7;round++){q=s.state();assert.deepEqual(q.pattern,G.MELODY.notes.slice(0,round+1));s.revealReady(q.token);q.pattern.forEach(note=>s.interact(note,q.token));s.advance();}assert.equal(s.state().phase,'result');assert.equal(s.state().endReason,'melody-complete');assert.equal(s.state().score,70);
});
test('shell positions remain a permutation and only the hidden pearl wins; stale and duplicate hits cannot score',()=>{
 const s=G.createSession({now:()=>0,random:seeded()});s.start('shells',{duel:true});const q=s.state();assert.deepEqual([...q.slots].sort(),[0,1,2]);assert.notDeepEqual(q.slots,[0,1,2]);assert.equal(s.interact(q.target,q.token,1).status,'ignored');s.revealReady(q.token);assert.equal(s.interact((q.target+1)%3,q.token,0).status,'wrong');assert.equal(s.interact(q.target,q.token,1).status,'correct');assert.equal(s.interact(q.target,q.token,0).status,'ignored');assert.deepEqual(s.state().scores,[0,10]);
});
test('cleanup rises, scores only litter, preserves fish and coral and ends at the timer',()=>{
 let time=0;const s=G.createSession({now:()=>time});s.start('cleanup',{duel:true,duration:60});const q=s.state(),trash=q.activities[0].bubbles.find(b=>!b.protectedLife),safe=q.activities[0].bubbles.find(b=>b.type==='fish'),coral=q.activities[0].bubbles.find(b=>b.type==='coral');
 assert.equal(s.interact(trash.id,q.token,0).status,'clean');assert.equal(s.interact(trash.id,q.token,0).status,'ignored');assert.equal(s.interact(safe.id,q.token,0).status,'protected');assert.equal(s.interact(coral.id,q.token,0).status,'protected');assert.deepEqual(s.state().scores,[10,0]);assert.ok(s.state().activities[0].bubbles.filter(b=>b.protectedLife).every(b=>!b.popped));assert.equal(s.state().phase,'playing');
 const start=q.activities[0].bubbles[2].progress;for(let i=0;i<30;i++){time+=50;s.step();}assert.ok(s.state().activities[0].bubbles.find(b=>b.id===2).progress>start);assert.ok(s.state().activities[0].bubbles.some(b=>b.id>=6));assert.ok(s.state().activities.every(a=>a.bubbles.length<=12));s.pause();const paused=s.state().activities[0].bubbles[0].progress;time+=10000;s.step();assert.equal(s.state().activities[0].bubbles[0].progress,paused);s.resume();time+=60000;assert.equal(s.tick().phase,'result');
});
test('surf press rises, release sinks and pause prevents movement and time jumps',()=>{
 let time=0;const s=G.createSession({now:()=>time});s.start('surf',{duel:true});let q=s.state();s.interact(true,q.token,0);time=100;s.step();assert.ok(s.state().activities[0].y<.5);assert.ok(s.state().activities[1].y>.5);s.pause();const y=s.state().activities[0].y;time=60000;s.step();assert.equal(s.state().activities[0].y,y);s.resume();s.interact(false,q.token,0);time+=100;s.step();assert.ok(s.state().activities[0].y>y);for(let i=0;i<20;i++){time+=100;s.step();}assert.ok(s.state().activities[0].obstacles.length>0);
});
test('local first five keeps one best score per player and separates game settings and storage scopes',()=>{
 const rows=new Map(),storage={getItem:k=>rows.get(k),setItem:(k,v)=>rows.set(k,v)},a=G.createLeaderboard({storage,key:'only-a'});
 for(let i=0;i<9;i++)a.record('multiply|3',[{id:'p'+i,name:'Öğrenci '+i,image:'https://evil.invalid/x.png'}],[i*10]);assert.equal(a.list('multiply|3').length,5);assert.deepEqual(a.list('multiply|3').map(x=>x.score),[80,70,60,50,40]);a.record('multiply|3',[{id:'p8',name:'Ada'}],[20]);assert.equal(a.list('multiply|3')[0].score,80);assert.ok(a.list('multiply|3').every(p=>p.image.startsWith('/assets/')));
 assert.equal(G.createLeaderboard({storage,key:'only-a'}).list('multiply|3').length,5);assert.equal(G.createLeaderboard({storage,key:'only-b'}).list('multiply|3').length,0);assert.equal(a.list('memory|3').length,0);assert.equal(G.createLeaderboard({storage:{getItem(){throw Error();},setItem(){throw Error();}}}).record('g',[{id:'a'}],[10]),false);
});
test('second page has exactly five entertainment games and duel renders equal answer sets for both pupils',()=>{
 const h=harness({motion:false});h.api.open(null,{duel:true,players:[{id:'a',name:'Ada'},{id:'b',name:'Ece'}]});h.click('[data-page="1"]');assert.deepEqual([...h.root.querySelectorAll('[data-game-id]')].map(b=>b.dataset.gameId),['memory','cleanup','shells','surf','lights']);h.click('[data-page="0"]');h.click('[data-game-id="rounding"]');assert.equal(h.root.querySelectorAll('.reef-player-lane').length,2);const lanes=[...h.root.querySelectorAll('.reef-player-lane')];assert.deepEqual([...lanes[0].querySelectorAll('.answer-orb')].map(b=>b.textContent),[...lanes[1].querySelectorAll('.answer-orb')].map(b=>b.textContent));h.api.dispose();assert.equal(h.jobs.size,0);
});
test('light demonstration timers clear on pause and close and cannot accept a double pointer click',()=>{
 const h=harness({motion:false});h.api.open();h.click('[data-page="1"]');h.click('[data-game-id="lights"]');assert.ok(h.jobs.size>3);h.click('[data-game-action="pause"]');assert.equal([...h.jobs.values()].filter(j=>!j.interval).length,0);h.click('[data-game-action="resume"]');assert.ok(h.jobs.size>3);h.api.close();assert.equal(h.jobs.size,0);
});
test('a light pointer press followed by its generated click counts as a single sequence step',()=>{
 const h=harness({motion:false});h.api.open();h.click('[data-page="1"]');h.click('[data-game-id="lights"]');h.run(400);h.run(920);const notes=h.sounds.filter(x=>x.startsWith('tone-')).map(x=>Number(x.slice(-1)));assert.equal(notes.length,2);h.run(1620);
 const first=h.root.querySelector('.light-'+notes[0]),down=new h.window.Event('pointerdown',{bubbles:true,cancelable:true});first.dispatchEvent(down);const click=new h.window.Event('click',{bubbles:true});click.detail=1;first.dispatchEvent(click);h.click('.light-'+notes[1]);assert.equal(h.root.querySelector('[data-game-score]').textContent,'10');h.api.dispose();
});
test('a matching pair dissolves both bubbles before removal and scores exactly once',()=>{
 const h=harness({motion:false}),reference=G.createSession({random:seeded(12),now:()=>0});reference.start('memory',{duration:0});const deck=reference.state().deck,a=0,b=deck.findIndex((id,i)=>i!==a&&id===deck[a]);
 h.api.open();h.click('[data-page="1"]');h.click('[data-game-id="memory"]');h.click('[data-index="'+a+'"]');h.click('[data-index="'+b+'"]');assert.equal(h.root.querySelectorAll('.memory-popped').length,2);assert.equal(h.root.querySelector('[data-game-score]').textContent,'10');h.run(850);assert.equal(h.root.querySelectorAll('.memory-matched').length,2);h.api.dispose();assert.equal(h.jobs.size,0);
});
test('wrong answer stays intact, briefly shakes its contents and uses only the contrasting cue',()=>{
 for(const motion of [true,false]){
 const h=harness({motion});h.api.open();h.click('[data-game-id="multiply"]');if(motion)h.run(280);const [a,b]=h.root.querySelector('.bubble-question h3').textContent.split(' × ').map(Number),wrong=[...h.root.querySelectorAll('.answer-orb')].find(el=>el.textContent!==String(a*b));wrong.dispatchEvent(new h.window.Event('click',{bubbles:true}));
 assert.equal(h.root.querySelectorAll('.answer-orb').length,4);assert.equal(wrong.classList.contains('answer-retry'),true);assert.equal(wrong.classList.contains('answer-popped'),false);assert.equal(wrong.classList.contains('game-rejected'),motion);assert.equal(h.root.querySelector('[data-game-score]').textContent,'0');assert.equal(h.sounds.at(-1),'wrong');assert.ok(!h.sounds.includes('correct'));if(motion){h.run(320);assert.equal(wrong.classList.contains('game-rejected'),false);}h.api.dispose();assert.equal(h.jobs.size,0);
 }
});
test('memory mismatches stay intact but an incorrect light note pops all keys and ends the game',()=>{
 const h=harness({motion:false}),reference=G.createSession({random:seeded(12),now:()=>0});reference.start('memory',{duration:0});const deck=reference.state().deck,b=deck.findIndex(id=>id!==deck[0]);h.api.open();h.click('[data-page="1"]');h.click('[data-game-id="memory"]');h.click('[data-index="0"]');h.click('[data-index="'+b+'"]');assert.equal(h.sounds.at(-1),'wrong');assert.equal(h.root.querySelectorAll('.memory-popped').length,0);assert.equal(h.root.querySelectorAll('.memory-orb').length,24);h.run(850);assert.equal(h.root.querySelectorAll('.memory-revealed').length,0);h.api.dispose();
 const lights=harness({motion:false});lights.api.open();lights.click('[data-page="1"]');lights.click('[data-game-id="lights"]');lights.run(400);lights.run(920);const first=Number(lights.sounds.find(x=>x.startsWith('tone-')).slice(-1));lights.run(1620);lights.click('.light-'+((first+1)%4));assert.equal(lights.sounds.at(-1),'correct');assert.equal(lights.root.querySelector('[data-game-score]').textContent,'0');assert.equal(lights.root.querySelectorAll('.light-popped').length,4);lights.run(950);assert.match(lights.root.querySelector('.bubble-result h3').textContent,/Yanlış nota/);assert.equal(lights.sounds.at(-1),'wrong');lights.api.dispose();
});

test('opening a game preserves the complete menu pop sound across the scene transition',()=>{
 let cancellations=0;const h=harness({cancelSound:()=>cancellations++});h.api.open();h.click('[data-game-id="multiply"]');const before=cancellations;assert.equal(h.sounds.at(-1),'select');h.run(280);assert.equal(cancellations,before);h.api.close();assert.ok(cancellations>before);
});
test('shells make sequential two-shell swaps with continuous positions and increasing speed',()=>{
 const s=G.createSession({now:()=>0,random:seeded(7)});s.start('shells',{duration:0});let previousSpeed=Infinity;
 for(let round=1;round<=12;round++){
  const q=s.state();assert.equal(q.round,round);assert.ok(q.shellMoves.length>=3&&q.shellMoves.length<=8);let positions=[0,1,2];
  for(const move of q.shellMoves){assert.deepEqual(move.from,positions);assert.equal(move.pair.length,2);assert.deepEqual([...move.to].sort(),[0,1,2]);assert.equal(move.to[move.pair[0]],move.from[move.pair[1]]);assert.equal(move.to[move.pair[1]],move.from[move.pair[0]]);positions=move.to;assert.ok(move.duration>=190);}
  assert.deepEqual(positions,q.slots);assert.ok(q.shellMoves[0].duration<=previousSpeed);previousSpeed=q.shellMoves[0].duration;s.revealReady(q.token);assert.equal(s.interact(q.target,q.token).status,'correct');s.advance();
 }
});
test('cleanup UI contains clickable rising trash and protected life, with no drag bin',()=>{
 const h=harness({motion:false});h.api.open();h.click('[data-page="1"]');h.click('[data-game-id="cleanup"]');assert.equal(h.root.querySelectorAll('.reef-floating-orb').length,6);assert.equal(h.root.querySelector('.reef-bin'),null);
 const litter=h.root.querySelector('.reef-litter-orb'),life=h.root.querySelector('.reef-life-orb');litter.dispatchEvent(new h.window.Event('click',{bubbles:true}));assert.equal(litter.classList.contains('cleanup-popped'),true);assert.equal(h.root.querySelector('[data-game-score]').textContent,'10');life.dispatchEvent(new h.window.Event('click',{bubbles:true}));assert.equal(life.classList.contains('cleanup-popped'),false);assert.equal(life.classList.contains('reef-life-protected'),true);assert.equal(h.root.querySelector('[data-game-score]').textContent,'10');assert.equal(h.sounds.at(-1),'wrong');h.api.dispose();
});
test('shell animation gates input until every swap finishes, then exposes position-based keys',()=>{
 const h=harness({motion:false});h.api.open();h.click('[data-page="1"]');h.click('[data-game-id="shells"]');assert.ok([...h.root.querySelectorAll('.reef-shell')].every(b=>b.disabled));
 const jobs=[...h.jobs].filter(([,j])=>!j.interval).sort((a,b)=>a[1].ms-b[1].ms);for(const [id,job] of jobs){h.jobs.delete(id);job.fn();}assert.ok([...h.root.querySelectorAll('.reef-shell')].every(b=>!b.disabled));assert.deepEqual([...h.root.querySelectorAll('.shell-number')].map(b=>b.textContent).sort(),['1','2','3']);h.api.dispose();assert.equal(h.jobs.size,0);
});
