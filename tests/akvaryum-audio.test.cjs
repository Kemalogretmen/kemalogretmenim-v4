const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const crypto=require('node:crypto');
function harness(){
 const media=[],events={},status={textContent:''};
 class Audio{constructor(src){this.src=src;this.paused=true;this.listeners={};media.push(this);}addEventListener(n,fn){this.listeners[n]=fn;}play(){this.paused=false;return this.pending||Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}
 const document={hidden:false,getElementById:()=>status,addEventListener:(n,fn)=>events[n]=fn};
 const window={AquariumSounds:require('../js/akvaryum-sounds.js'),Audio,addEventListener:(n,fn)=>events[n]=fn,dispatchEvent(){}};vm.runInNewContext(fs.readFileSync('js/akvaryum-audio.js','utf8'),{window,document,CustomEvent:class{}});return {api:window.AquariumAudio,media,document,events,status};
}
test('switching recordings stops the previous track; volume and stop apply to the current player',async()=>{
 const h=harness();h.api.setVolume(.25);await h.api.play('peace');assert.equal(h.media[0].volume,.25);assert.equal(h.media[0].loop,true);
 await h.api.play('focus');assert.equal(h.media[0].paused,true);assert.equal(h.media[0].src,'');assert.equal(h.api.current(),'focus');
 h.api.setVolume(2);assert.equal(h.media[1].volume,1);h.api.stop();assert.equal(h.api.current(),'off');assert.equal(h.media[1].paused,true);
});
test('music continues across tab changes; explicit pause and stop remain authoritative',async()=>{
 const h=harness();await h.api.play('fun');h.document.hidden=true;h.events.visibilitychange?.();assert.equal(h.media[0].paused,false);
 h.document.hidden=false;h.events.visibilitychange?.();assert.equal(h.media[0].paused,false);
 h.api.stop();h.document.hidden=true;h.events.visibilitychange?.();h.document.hidden=false;h.events.visibilitychange?.();assert.equal(h.media[0].paused,true);
});
test('all four downloaded tracks match recorded source checksums and contain MP3 data',()=>{
 const manifest=JSON.parse(fs.readFileSync('assets/akvaryum/muzikler/kaynaklar.json'));
 assert.equal(manifest.length,4);
 for(const track of manifest){const data=fs.readFileSync('assets/akvaryum/muzikler/'+track.filename);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),track.sha256);assert.ok(data.length>50000);assert.equal(track.license,'CC BY 4.0');assert.match(track.source,/^https:\/\/incompetech.com\//);}
});

test('one-touch pause/resume keeps the chosen track and playback position',async()=>{
 const h=harness();await h.api.toggle('ocean');const player=h.media[0];player.currentTime=4;
 assert.match(player.src,/ocean-calm.mp3$/);assert.equal(h.api.isPlaying(),true);
 await h.api.toggle('ocean');assert.equal(player.paused,true);assert.equal(h.api.current(),'ocean');assert.equal(h.api.isPlaying(),false);
 h.document.hidden=true;h.events.visibilitychange?.();h.document.hidden=false;h.events.visibilitychange?.();assert.equal(player.paused,true);
 await h.api.toggle('ocean');assert.equal(h.media.length,1);assert.equal(player.currentTime,4);assert.equal(h.api.isPlaying(),true);
});
test('a pending play cannot override a user pause or a newer track',async()=>{
 const h=harness();let resolve;
 const first=h.api.play('peace');await first;
 h.media[0].pending=new Promise(r=>resolve=r);
 h.api.pause();const resumed=h.api.resume();h.api.pause();resolve();await resumed;
 assert.equal(h.media[0].paused,true);assert.equal(h.api.isPlaying(),false);
 let resolveOld;h.media[0].pending=new Promise(r=>resolveOld=r);
 const stale=h.api.resume();await h.api.play('ocean');resolveOld();await stale;
 assert.equal(h.api.current(),'ocean');assert.equal(h.media[0].paused,true);assert.equal(h.api.isPlaying(),true);
});
test('ocean recording has documented CC0 sources and verified PCM WAV content',()=>{
 const meta=JSON.parse(fs.readFileSync('assets/akvaryum/muzikler/okyanus-kaynak.json'));
 const data=fs.readFileSync('assets/akvaryum/muzikler/'+meta.filename);
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
 assert.equal(meta.license,'CC0 1.0');assert.equal(meta.sources.length,4);
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),meta.sha256);
});


test('play and resume completing in a background tab keep the selected music running',async()=>{
 const h=harness();h.document.hidden=true;await h.api.play('peace');assert.equal(h.api.isPlaying(),true);
 h.api.pause();let resolve;h.media[0].pending=new Promise(r=>resolve=r);
 const pending=h.api.resume();resolve();await pending;
 assert.equal(h.media[0].paused,false);assert.equal(h.api.isPlaying(),true);
 h.api.pause();h.document.hidden=false;h.events.visibilitychange?.();assert.equal(h.api.isPlaying(),false);
});

test('music and nature layers play together, preserve position, and pause/resume as one mix',async()=>{
 const h=harness();h.api.setVolume(.5);await h.api.playMix([{id:'peace',volume:.8},{id:'rain',volume:.4}]);assert.equal(h.media.length,2);assert.ok(h.media.every(m=>!m.paused));assert.ok(h.media.reduce((n,m)=>n+m.volume,0)<=.50001);
 h.media[0].currentTime=12;await h.api.playMix([{id:'peace',volume:.8},{id:'birds',volume:.2}]);assert.equal(h.media[0].currentTime,12);assert.equal(h.media[1].paused,true);assert.equal(h.media.length,3);
 h.api.pause();assert.ok(h.media.every(m=>m.paused));await h.api.resume();assert.equal(h.media[0].currentTime,12);assert.equal(h.media[0].paused,false);assert.equal(h.media[2].paused,false);
});
test('malformed layers and favorites are sanitized and legacy sound settings migrate',()=>{
 const S=require('../js/akvaryum-sounds.js'),C=require('../js/akvaryum-core.js');assert.deepEqual(S.normalizeMix([{id:'rain',volume:6},{id:'rain',volume:1},{id:'bad',volume:1}]),[{id:'rain',volume:1}]);
 assert.deepEqual(C.settingsOf({sound:'peace'}).mix,[{id:'peace',volume:1}]);assert.equal(S.favorites([{id:'__proto__',name:'bad'}]).length,0);
 const state=C.initialState();state.settings.favorites=[{id:'test',name:'Yağmur',volume:.4,mix:[{id:'rain',volume:.2}]}];assert.deepEqual(C.validate(state).settings.favorites,state.settings.favorites);
});
test('each selectable recording exists with documented provenance and matching checksum',()=>{
 const S=require('../js/akvaryum-sounds.js');const manifest=[...JSON.parse(fs.readFileSync('assets/akvaryum/muzikler/kaynaklar.json')),...JSON.parse(fs.readFileSync('assets/akvaryum/muzikler/karisim-kaynaklar.json')),...JSON.parse(fs.readFileSync('assets/akvaryum/muzikler/mevsimlik-kaynaklar.json'))];
 assert.equal(S.catalogue.length,13);for(const track of S.catalogue){const m=manifest.find(m=>m.filename===track.file);assert.ok(m,track.file);const data=fs.readFileSync('assets/akvaryum/muzikler/'+track.file);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),m.sha256);}
});

test('timer melody is scheduled on the audio clock, independent of music volume, and cancellation stops every note',async()=>{
 const notes=[],events={};let resume=()=>Promise.resolve();
 class Context {constructor(){this.currentTime=100;this.destination={};this.state='running';}resume(){return resume();}createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(v){this.peak=v;},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}createOscillator(){const n={frequency:{},connect(g){this.gain=g;},disconnect(){},start(at){this.at=at;},stop(at){if(at===undefined)this.cancelled=true;}};notes.push(n);return n;}}
 class Audio{constructor(src){this.src=src;this.paused=true;this.listeners={};media.push(this);}addEventListener(n,fn){this.listeners[n]=fn;}play(){this.paused=false;return this.pending||Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}
 const window={AquariumSounds:require('../js/akvaryum-sounds.js'),AudioContext:Context,Audio,addEventListener:(n,f)=>events[n]=f,dispatchEvent(){}};
 vm.runInNewContext(fs.readFileSync('js/akvaryum-audio.js','utf8'),{window,document:{getElementById:()=>null},CustomEvent:class{}});
 const a=window.AquariumAudio;a.setVolume(0);await a.scheduleTimer(60000,.7);assert.equal(notes.length,12);assert.ok(notes.every(n=>n.at>=159.9));assert.ok(notes.some(n=>n.gain.gain.peak>0));
 a.cancelTimer();assert.ok(notes.every(n=>n.cancelled));const count=notes.length;let release;resume=()=>new Promise(r=>release=r);const pending=a.scheduleTimer(30000);a.cancelTimer();release();await pending;assert.equal(notes.length,count);
 resume=()=>Promise.resolve();await a.scheduleTimer(0);events.pagehide();assert.ok(notes.every(n=>n.cancelled));
});

function pickerHarness(){
 const notes=[],gains=[],media=[],events={};let contexts=0,resume=()=>Promise.resolve();
 const param=()=>({value:0,setValueAtTime(value,at){this.value=value;this.at=at;},linearRampToValueAtTime(value){this.peak=value;},exponentialRampToValueAtTime(){},setTargetAtTime(value){this.value=value;}});
 class Context {
  constructor(){contexts++;this.currentTime=10;this.destination={};this.state='running';}
  resume(){return resume();}
  createGain(){const gain={gain:param(),connect(to){this.to=to;},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;}
  createOscillator(){const osc={frequency:param(),connect(to){this.to=to;},disconnect(){this.disconnected=true;},start(at){this.at=at;},stop(at){if(at===undefined)this.cancelled=true;else this.end=at;}};notes.push(osc);return osc;}
 }
 class Audio{constructor(src){this.src=src;this.paused=true;this.listeners={};media.push(this);}addEventListener(n,fn){this.listeners[n]=fn;}play(){this.paused=false;return this.pending||Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}
 const window={AquariumSounds:require('../js/akvaryum-sounds.js'),AudioContext:Context,Audio,addEventListener:(n,f)=>events[n]=f,dispatchEvent(){}};
 vm.runInNewContext(fs.readFileSync('js/akvaryum-audio.js','utf8'),{window,document:{getElementById:()=>null},CustomEvent:class{}});
 return {api:window.AquariumAudio,notes,gains,media,events,contexts:()=>contexts,delayResume:fn=>resume=fn};
}
test('picker wheel clicks slow down, stay bounded and share the user volume without downloading audio',async()=>{
 const h=pickerHarness();h.api.setVolume(.4);await h.api.pickerSound(false);
 const clicks=h.notes.filter(n=>n.type==='triangle');assert.ok(clicks.length>10&&clicks.length<30);
 assert.ok(clicks.every(n=>n.end-n.at<.1&&n.at<12.42));
 assert.ok(clicks.at(-1).at-clicks.at(-2).at>(clicks[1].at-clicks[0].at)*2);
 assert.equal(h.gains[0].gain.value,.4);assert.ok(h.notes.every(n=>n.to.to===h.gains[0]));
 h.api.setVolume(0);assert.equal(h.gains[0].gain.value,0);
 h.api.cancelPicker();assert.ok(h.notes.every(n=>n.cancelled&&n.disconnected));
 const silent=pickerHarness();silent.api.setVolume(0);await silent.api.pickerSound(false);await silent.api.pickerSound(true);
 assert.equal(silent.contexts(),0);assert.equal(silent.notes.length,0);
});
test('picker reveal replaces the wheel, cleans up notes, and never cancels the independent timer alarm',async()=>{
 const h=pickerHarness();await h.api.scheduleTimer(60000);const alarm=[...h.notes];
 await h.api.pickerSound(false);const ticks=h.notes.slice(alarm.length);await h.api.pickerSound(true);
 assert.ok(ticks.every(n=>n.cancelled));assert.ok(alarm.every(n=>!n.cancelled));
 const win=h.notes.slice(alarm.length+ticks.length);assert.equal(win.length,8);
 assert.ok(win.every(n=>n.end<11));assert.equal(win[0].frequency.value,523.25);
 win.forEach(n=>n.onended());assert.ok(win.every(n=>n.disconnected&&n.to.disconnected));
 h.events.pagehide();assert.ok(alarm.every(n=>n.cancelled));
});
test('cancel or a newer reveal prevents a late audio resume from resurrecting a stale wheel',async()=>{
 const h=pickerHarness();let release;h.delayResume(()=>new Promise(r=>release=r));
 const pending=h.api.pickerSound(false);h.api.cancelPicker();release();await pending;assert.equal(h.notes.length,0);
 let oldRelease;h.delayResume(()=>new Promise(r=>oldRelease=r));const old=h.api.pickerSound(false);
 h.delayResume(()=>Promise.resolve());await h.api.pickerSound(true);oldRelease();await old;
 assert.equal(h.notes.length,8);h.events.pagehide();assert.ok(h.notes.every(n=>n.cancelled));
});

test('positive behavior uses the supplied MP3 and respects volume without altering background playback',async()=>{
 const h=harness();h.api.setVolume(.4);await h.api.play('peace');const background=h.media[0];background.currentTime=23;
 await h.api.feed();const positive=h.media[1];assert.equal(positive.src,'/assets/akvaryum/sesler/olumlu.mp3');assert.equal(positive.loop,false);assert.equal(positive.volume,.4);assert.equal(positive.paused,false);
 h.api.setVolume(.15);assert.equal(positive.volume,.15);assert.equal(background.paused,false);assert.equal(background.currentTime,23);
 positive.listeners.ended();assert.equal(positive.paused,true);assert.equal(positive.src,'');assert.equal(background.paused,false);
 assert.equal(fs.readFileSync('assets/akvaryum/sesler/olumlu.mp3').length,67200);
});
test('rapid positive awards replace one-shot sound; cancellation and leaving stop it, without late-play resurrection',async()=>{
 const h=harness();await h.api.feed();const first=h.media[0];await h.api.feed();assert.equal(first.paused,true);assert.equal(first.src,'');
 const second=h.media[1];h.api.cancelFeed();assert.equal(second.paused,true);assert.equal(second.src,'');
 await h.api.feed();h.events.pagehide();assert.equal(h.media[2].paused,true);
 h.api.setVolume(0);const count=h.media.length;await h.api.feed();assert.equal(h.media.length,count);
});
test('a stale rejected positive play is ignored while a current playback failure is actionable',async()=>{
 const media=[],events={};
 class Audio{constructor(src){this.src=src;this.paused=true;media.push(this);}addEventListener(){}play(){this.paused=false;return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}
 const window={AquariumSounds:require('../js/akvaryum-sounds.js'),Audio,addEventListener:(n,f)=>events[n]=f,dispatchEvent(){}};
 vm.runInNewContext(fs.readFileSync('js/akvaryum-audio.js','utf8'),{window,document:{getElementById:()=>null},CustomEvent:class{}});
 const a=window.AquariumAudio,old=a.feed();const current=a.feed();media[0].reject(Error('old abort'));await old;media[1].resolve();await current;assert.equal(media[0].paused,true);assert.equal(media[1].paused,false);
 const failed=a.feed();media[2].reject(Error('decode failed'));await assert.rejects(failed,/Olumlu davranış sesi/);assert.equal(media[2].paused,true);
 const late=a.feed();a.cancelFeed();media[3].paused=false;media[3].resolve();await late;assert.equal(media[3].paused,true);
});

test('negative behavior plays its own supplied MP3 and replaces positive feedback at the same volume',async()=>{
 const h=harness();h.api.setVolume(.25);await h.api.feed();const positive=h.media[0];await h.api.negative();
 assert.equal(positive.paused,true);assert.equal(positive.src,'');assert.equal(h.media[1].src,'/assets/akvaryum/sesler/olumsuz.mp3');assert.equal(h.media[1].volume,.25);assert.equal(h.media[1].loop,false);
 h.api.cancelFeed();assert.equal(h.media[1].paused,true);h.api.setVolume(0);const count=h.media.length;await h.api.negative();assert.equal(h.media.length,count);assert.equal(fs.readFileSync('assets/akvaryum/sesler/olumsuz.mp3').length,18319);
});

test('supplied pop recording replaces the generated pop and cancels independently of alarm and picker audio',async()=>{
 const data=fs.readFileSync('assets/akvaryum/sesler/baloncuk-patlama.mp3');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),'1118f13c7aea5cb326ee201d2773fc61aa72b1d9d9c5a7f5e8f9255d33b41a9e');
 const h=pickerHarness();await h.api.scheduleTimer(60000);const alarm=[...h.notes];h.api.setVolume(.4);await h.api.bubblePop();const pop=h.media[0];
 assert.equal(pop.src,'/assets/akvaryum/sesler/baloncuk-patlama.mp3');assert.equal(pop.volume,.4);assert.equal(pop.loop,false);assert.equal(h.notes.length,alarm.length);h.api.setVolume(.15);assert.equal(pop.volume,.15);
 await h.api.bubblePop('finish');assert.equal(pop.paused,true);const result=h.notes.slice(alarm.length);assert.equal(result.length,3);h.api.cancelGame();assert.ok(result.every(n=>n.cancelled));assert.ok(alarm.every(n=>!n.cancelled));h.api.setVolume(0);const count=h.media.length;await h.api.bubblePop();assert.equal(h.media.length,count);h.events.pagehide();assert.ok(alarm.every(n=>n.cancelled));
});
test('piano keys use stable harmonics, overlapping voices and bounded polyphony',async()=>{
 const h=pickerHarness();for(let i=0;i<4;i++)await h.api.bubblePop('tone-'+i);assert.equal(h.notes.length,12);assert.deepEqual(h.notes.filter((_,i)=>i%3===0).map(n=>n.frequency.value),[293.66,329.63,349.23,392]);assert.ok(h.notes.every(n=>!n.cancelled));assert.ok(h.notes.every(n=>n.end-n.at>.25&&n.end-n.at<.9));
 await h.api.bubblePop('tone-0');assert.ok(h.notes.slice(0,3).every(n=>n.cancelled));assert.equal(h.notes.filter(n=>!n.cancelled).length,12);h.api.cancelGame();assert.ok(h.notes.every(n=>n.cancelled));h.api.setVolume(0);const total=h.notes.length;await h.api.bubblePop('tone-0');assert.equal(h.notes.length,total);
});
test('wrong answers use a quiet descending cue instead of the pop recording',async()=>{
 const h=pickerHarness();await h.api.bubblePop('wrong');assert.equal(h.media.length,0);assert.deepEqual(h.notes.map(n=>n.frequency.value),[220,174.61]);assert.ok(h.notes.every(n=>n.to.gain.peak<=.075));h.api.cancelGame();assert.ok(h.notes.every(n=>n.cancelled));
});
test('rapid pops, pending playback and a closed game never resurrect old sound',async()=>{
 const h=harness();await h.api.bubblePop('select');const first=h.media[0];await h.api.bubblePop('correct');assert.equal(first.paused,true);assert.equal(first.src,'');h.api.cancelGame();assert.equal(h.media[1].paused,true);
 let release;const proto=first.constructor.prototype,original=proto.play;proto.play=function(){this.paused=false;return new Promise(r=>release=r);};
 const pending=h.api.bubblePop(),late=h.media.at(-1);h.api.cancelGame();late.paused=false;release();await pending;assert.equal(late.paused,true);proto.play=original;
 await h.api.bubblePop();const final=h.media.at(-1);final.listeners.ended();assert.equal(final.paused,true);assert.equal(final.src,'');
});

test('birthday music finishes within the celebration and respects mute and cancellation',async()=>{
 const h=pickerHarness();h.api.setVolume(.3);await h.api.birthday();
 assert.equal(h.notes.length,25);
 assert.ok(h.notes.every(n=>n.end<=19.4&&n.to.to===h.gains[0]));
 h.api.cancelBirthday();assert.ok(h.notes.every(n=>n.cancelled&&n.disconnected&&n.to.disconnected));
 const silent=pickerHarness();silent.api.setVolume(0);await silent.api.birthday();assert.equal(silent.contexts(),0);
});
