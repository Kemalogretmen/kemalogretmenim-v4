const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const crypto=require('node:crypto');
function harness(){
 const media=[],events={},status={textContent:''};
 class Audio{constructor(src){this.src=src;this.paused=true;this.listeners={};media.push(this);}addEventListener(n,fn){this.listeners[n]=fn;}play(){this.paused=false;return this.pending||Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}
 const document={hidden:false,getElementById:()=>status,addEventListener:(n,fn)=>events[n]=fn};
 const window={Audio,addEventListener(){},dispatchEvent(){}};vm.runInNewContext(fs.readFileSync('js/akvaryum-audio.js','utf8'),{window,document,CustomEvent:class{}});return {api:window.AquariumAudio,media,document,events,status};
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
 assert.match(player.src,/ocean.wav$/);assert.equal(h.api.isPlaying(),true);
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
