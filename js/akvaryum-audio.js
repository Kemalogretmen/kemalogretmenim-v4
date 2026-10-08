/* Independently controlled audio layers; licenses in assets/akvaryum/muzikler/LISANS.md. */
(function () {
  'use strict';
  const S=window.AquariumSounds, titles=Object.fromEntries(S.catalogue.map(t=>[t.id,t.name])), tracks={off:'Sessiz',...titles};
  let channels=new Map(),generation=0,volume=.3,userPaused=false,mix=[];
  let context,master;
  function status(text){const el=document.getElementById('musicStatus');if(el)el.textContent=text;window.dispatchEvent(new CustomEvent('aquarium-audio-change'));}
  function dispose(channel){channel.audio.pause();channel.audio.removeAttribute('src');channel.audio.load();}
  function volumes(){const sum=Math.max(1,mix.reduce((n,t)=>n+t.volume,0));channels.forEach((c,id)=>{c.audio.volume=volume*(mix.find(t=>t.id===id)?.volume||0)/sum;});}
  function isPlaying(){return !userPaused&&Array.from(channels.values()).some(c=>c.loading||!c.audio.paused);}
  function describe(){return mix.length?mix.map(t=>titles[t.id]).join(' + '):'Bir ses seçin.';}
  function stop(){generation++;channels.forEach(dispose);channels.clear();mix=[];userPaused=false;status('Sesler durduruldu.');}
  async function startChannel(channel,request){
    channel.loading=true;
    try{await channel.audio.play();if(request!==generation||channels.get(channel.id)!==channel){if(userPaused||channels.get(channel.id)!==channel)channel.audio.pause();return false;}channel.loading=false;if(userPaused)channel.audio.pause();return !userPaused;}
    catch(e){if(request!==generation||channels.get(channel.id)!==channel)return false;channel.loading=false;channel.audio.pause();throw new Error(titles[channel.id]+' başlatılamadı. Yeniden Başlat’a basın.');}
  }
  async function playMix(value){
    const next=S.normalizeMix(value),wasPaused=userPaused;generation++;const request=generation;userPaused=false;
    channels.forEach((c,id)=>{if(!next.some(t=>t.id===id)){dispose(c);channels.delete(id);}});mix=next;
    if(!mix.length){stop();return false;}
    const pending=[];
    mix.forEach(t=>{let c=channels.get(t.id);if(!c){const track=S.catalogue.find(x=>x.id===t.id);const audio=new window.Audio('/assets/akvaryum/muzikler/'+track.file);audio.loop=true;audio.preload='none';c={id:t.id,audio,loading:false};channels.set(t.id,c);const channel=c;audio.addEventListener('error',()=>{if(channels.get(t.id)===channel){channel.loading=false;audio.pause();status(titles[t.id]+' yüklenemedi. Diğer sesler çalmaya devam eder.');}});}if(c.audio.paused||c.loading||wasPaused)pending.push(c);});
    volumes();status('Sesler yükleniyor…');
    const results=await Promise.allSettled(pending.map(c=>startChannel(c,request)));
    if(request!==generation)return false;
    const error=results.find(r=>r.status==='rejected');
    status(error?error.reason.message:(userPaused?'Duraklatıldı: ':'Çalıyor: ')+describe());
    if(error&&!isPlaying())throw error.reason;
    return isPlaying();
  }
  function pause(){generation++;userPaused=true;channels.forEach(c=>{c.loading=false;c.audio.pause();});status('Duraklatıldı: '+describe());}
  function resume(){return playMix(mix);}
  function play(id){return playMix(S.has(id)?[{id,volume:1}]:[]);}
  function toggle(selected){if(isPlaying()){pause();return Promise.resolve(false);}return channels.size?resume():(Array.isArray(selected)?playMix(selected):play(selected));}
  function setLayerVolume(id,value){const layer=mix.find(t=>t.id===id);if(layer)layer.volume=S.level(value);volumes();}
  async function feed() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context) { context = new AudioContext(); master = context.createGain(); master.connect(context.destination); }
    master.gain.value = volume; await context.resume();
    [523.25, 659.25, 783.99].forEach((frequency, i) => {
      const at = context.currentTime + i * .1, osc = context.createOscillator(), gain = context.createGain();
      osc.frequency.value = frequency; gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.16, at + .04); gain.gain.exponentialRampToValueAtTime(.0001, at + .3);
      osc.connect(gain); gain.connect(master); osc.start(at); osc.stop(at + .35);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }
  function setVolume(value){volume=S.level(value,0);volumes();if(master)master.gain.setTargetAtTime(volume,context.currentTime,.1);}
  // Background tabs retain playback; explicit pause or leaving this page stops it.
  window.addEventListener('pagehide',stop);
  window.AquariumAudio={tracks,titles,catalogue:S.catalogue,play,playMix,stop,pause,resume,toggle,feed,setVolume,setLayerVolume,describe,current:()=>mix[0]?.id||'off',isPlaying};
})();
