/* Independently controlled audio layers; licenses in assets/akvaryum/muzikler/LISANS.md. */
(function () {
  'use strict';
  const S=window.AquariumSounds, titles=Object.fromEntries(S.catalogue.map(t=>[t.id,t.name])), tracks={off:'Sessiz',...titles};
  let channels=new Map(),generation=0,volume=.3,userPaused=false,mix=[];
  let context,master;
  let feedPlayer=null,feedGeneration=0;
  let gameNodes=[],gameGeneration=0,gamePlayer=null,pianoRequest=0,pianoPlayed=0;
  let alarmNodes=[],alarmGeneration=0;
  let pickerNodes=[],pickerGeneration=0;
  let birthdayNotes=[],birthdayGeneration=0;
  function ensureContext() {
    const Type=window.AudioContext||window.webkitAudioContext;
    if(!Type) throw Error('Bu tarayıcı uyarı sesini desteklemiyor.');
    if(!context) {context=new Type();master=context.createGain();master.connect(context.destination);}
    return context;
  }
  function cancelTimer() {
    alarmGeneration++;
    alarmNodes.forEach(({osc,gain})=>{try{osc.stop();}catch(e){}osc.disconnect();gain.disconnect();});alarmNodes=[];
  }
  async function scheduleTimer(milliseconds,level=.65) {
    cancelTimer();const request=alarmGeneration,deadline=Date.now()+Math.max(0,milliseconds);
    const ctx=ensureContext();await ctx.resume();if(request!==alarmGeneration)return;
    if(ctx.state==='suspended') throw Error('Uyarı sesi başlatılamadı; ses düğmesine yeniden dokunun.');
    const start=ctx.currentTime+Math.max(0,deadline-Date.now())/1000;
    // Original bell phrase: gentle attack, clear harmonic notes, about four seconds.
    [523.25,659.25,783.99,1046.5,783.99,1046.5].forEach((frequency,i)=>{
      [1,2].forEach((harmonic,j)=>{
        const at=start+i*.43,osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type='sine';osc.frequency.value=frequency*harmonic;
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(S.level(level)*(.27/(j+1)),at+.025);
        gain.gain.exponentialRampToValueAtTime(.0001,at+1.35);
        osc.connect(gain);gain.connect(ctx.destination);const node={osc,gain};alarmNodes.push(node);
        osc.onended=()=>{osc.disconnect();gain.disconnect();alarmNodes=alarmNodes.filter(n=>n!==node);};
        osc.start(at);osc.stop(at+1.4);
      });
    });
  }
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
  function cancelPicker() {
    pickerGeneration++;
    pickerNodes.forEach(({osc,gain})=>{try{osc.stop();}catch(e){}osc.disconnect();gain.disconnect();});
    pickerNodes=[];
  }
  function pickerNote(ctx,at,frequency,type,peak,duration) {
    const osc=ctx.createOscillator(),gain=ctx.createGain(),node={osc,gain};
    osc.type=type;osc.frequency.setValueAtTime(frequency,at);
    if(type==='triangle')osc.frequency.exponentialRampToValueAtTime(frequency*.55,at+duration);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(peak,at+.004);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain);gain.connect(master);pickerNodes.push(node);
    osc.onended=()=>{osc.disconnect();gain.disconnect();pickerNodes=pickerNodes.filter(n=>n!==node);};
    osc.start(at);osc.stop(at+duration+.02);
  }
  async function pickerSound(result=false,milliseconds=2400) {
    cancelPicker();
    if(volume===0)return;
    const request=pickerGeneration,ctx=ensureContext();master.gain.value=volume;
    // Called directly from the selection gesture to unlock mobile/board audio.
    await ctx.resume();if(request!==pickerGeneration)return;
    if(ctx.state==='suspended')throw Error('Seçim sesi başlatılamadı; ses anahtarını açıp yeniden seçin.');
    const start=ctx.currentTime+.015;
    if(result) {
      [523.25,659.25,783.99,1046.5].forEach((frequency,i)=>{
        pickerNote(ctx,start+i*.09,frequency,'sine',.32,.5);
        pickerNote(ctx,start+i*.09,frequency*2,'sine',.055,.35);
      });
      return;
    }
    const duration=Math.max(.2,Math.min(3,Number.isFinite(milliseconds)?milliseconds/1000:2.4));
    // Short wooden clicks slow down with the same cadence as the fish previews.
    for(let t=0;t<duration;t+=.09+.24*Math.pow(t/duration,2)) {
      pickerNote(ctx,start+t,1500-t/duration*400,'triangle',.5,.045);
      pickerNote(ctx,start+t,260,'sine',.2,.065);
    }
  }
  function cancelGame(){
    gameGeneration++;
    if(gamePlayer){dispose({audio:gamePlayer});gamePlayer=null;}
    gameNodes.forEach(({osc,gain})=>{try{osc.stop();}catch(e){}osc.disconnect();gain.disconnect();});gameNodes=[];
  }
  async function pianoNote(index){
    if(volume===0)return;
    const request=gameGeneration,order=++pianoRequest,ctx=ensureContext();master.gain.value=volume;
    if(gamePlayer){dispose({audio:gamePlayer});gamePlayer=null;}
    await ctx.resume();if(request!==gameGeneration||order<pianoPlayed)return;pianoPlayed=order;
    // A short hammer attack with independently decaying harmonics, no pitch glide.
    // Four overlapping voices allow successive notes to form a connected phrase.
    while(gameNodes.length>9){const node=gameNodes.shift();try{node.osc.stop();}catch(e){}node.osc.disconnect();node.gain.disconnect();}
    const frequency=[293.66,329.63,349.23,392][index],start=ctx.currentTime;
    [[1,.17,.82],[2,.05,.48],[3,.02,.29]].forEach(([harmonic,peak,length])=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain(),node={osc,gain,piano:true};osc.type='sine';osc.frequency.setValueAtTime(frequency*harmonic,start);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(peak,start+.006);gain.gain.exponentialRampToValueAtTime(peak*.32,start+.13);gain.gain.exponentialRampToValueAtTime(.0001,start+length);
      osc.connect(gain);gain.connect(master);gameNodes.push(node);osc.onended=()=>{osc.disconnect();gain.disconnect();gameNodes=gameNodes.filter(n=>n!==node);};osc.start(start);osc.stop(start+length+.025);
    });
  }
  async function bubblePop(kind='correct'){
    if(/^tone-[0-3]$/.test(kind))return pianoNote(Number(kind.slice(-1)));
    cancelGame();if(volume===0)return;
    const request=gameGeneration;
    if(kind==='correct'||kind==='select'){
      const audio=new window.Audio('/assets/akvaryum/sesler/baloncuk-patlama.mp3');gamePlayer=audio;audio.loop=false;audio.preload='auto';audio.volume=volume;
      audio.addEventListener('ended',()=>{if(gamePlayer===audio){gamePlayer=null;dispose({audio});}});
      try{await audio.play();if(request!==gameGeneration||gamePlayer!==audio)audio.pause();}
      catch(e){if(request!==gameGeneration||gamePlayer!==audio)return;cancelGame();throw Error('Baloncuk patlama sesi çalınamadı.');}
      return;
    }
    const ctx=ensureContext();master.gain.value=volume;await ctx.resume();if(request!==gameGeneration)return;
    const frequencies=kind==='wrong'?[220,174.61]:kind==='finish'?[523.25,659.25,783.99]:[/^tone-[0-3]$/.test(kind)?[261.63,329.63,392,523.25][Number(kind.slice(-1))]:kind==='select'?680:880],start=ctx.currentTime;
    frequencies.forEach((frequency,i)=>{
      const at=start+i*.09,osc=ctx.createOscillator(),gain=ctx.createGain(),node={osc,gain};
      osc.type='sine';osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(frequency*.72,at+.14);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(kind==='wrong'?.075:.18,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+.19);
      osc.connect(gain);gain.connect(master);gameNodes.push(node);osc.onended=()=>{osc.disconnect();gain.disconnect();gameNodes=gameNodes.filter(n=>n!==node);};osc.start(at);osc.stop(at+.21);
    });
  }
  function cancelBirthday(){
    birthdayGeneration++;
    for(const {osc,gain} of birthdayNotes){try{osc.stop();}catch(e){}osc.disconnect();gain.disconnect();}
    birthdayNotes=[];
  }
  async function birthday(){
    cancelBirthday();if(volume===0)return;
    const request=birthdayGeneration,ctx=ensureContext();master.gain.value=volume;
    await ctx.resume();if(request!==birthdayGeneration||ctx.state==='suspended')return;
    // Familiar birthday melody, played as a short instrumental on the shared volume control.
    const notes=[67,67,69,67,72,71,67,67,69,67,74,72,67,67,79,76,72,71,69,77,77,76,72,74,72];
    const lengths=[.5,.5,1,1,1,1.5,.5,.5,1,1,1,1.5,.5,.5,1,1,1,1,1.5,.5,.5,1,1,1,2];
    let at=ctx.currentTime+.025;
    for(const [i,note] of notes.entries()){
      const duration=lengths[i]*.36,frequency=440*2**((note-69)/12);
      const osc=ctx.createOscillator(),gain=ctx.createGain(),node={osc,gain};
      osc.type='triangle';osc.frequency.setValueAtTime(frequency,at);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.20,at+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration+.045);
      osc.connect(gain);gain.connect(master);birthdayNotes.push(node);
      osc.onended=()=>{osc.disconnect();gain.disconnect();birthdayNotes=birthdayNotes.filter(other=>other!==node);};
      osc.start(at);osc.stop(at+duration+.055);at+=duration;
    }
  }
  function cancelFeed() {
    feedGeneration++;
    if(feedPlayer){dispose({audio:feedPlayer});feedPlayer=null;}
  }
  async function feedback(negative=false) {
    cancelFeed();
    if(volume===0)return;
    const request=feedGeneration,audio=new window.Audio('/assets/akvaryum/sesler/'+(negative?'olumsuz':'olumlu')+'.mp3');
    feedPlayer=audio;audio.loop=false;audio.preload='auto';audio.volume=volume;
    audio.addEventListener('ended',()=>{if(feedPlayer===audio){feedPlayer=null;dispose({audio});}});
    try{
      await audio.play();
      if(request!==feedGeneration||feedPlayer!==audio)audio.pause();
    }catch(e){
      if(request!==feedGeneration||feedPlayer!==audio)return;
      cancelFeed();throw Error((negative?'Olumsuz':'Olumlu')+' davranış sesi çalınamadı. Ses ayarını ve bağlantınızı kontrol edin.');
    }
  }
  const feed=()=>feedback(false),negative=()=>feedback(true);
  function setVolume(value){volume=S.level(value,0);volumes();if(feedPlayer)feedPlayer.volume=volume;if(gamePlayer)gamePlayer.volume=volume;if(master)master.gain.setTargetAtTime(volume,context.currentTime,.1);}
  // Background tabs retain playback; explicit pause or leaving this page stops it.
  window.addEventListener('pagehide',()=>{stop();cancelTimer();cancelPicker();cancelFeed();cancelGame();cancelBirthday();});
  window.AquariumAudio={tracks,titles,catalogue:S.catalogue,play,playMix,stop,pause,resume,toggle,feed,negative,cancelFeed,bubblePop,cancelGame,birthday,cancelBirthday,setVolume,setLayerVolume,describe,scheduleTimer,cancelTimer,pickerSound,cancelPicker,current:()=>mix[0]?.id||'off',isPlaying};
})();
