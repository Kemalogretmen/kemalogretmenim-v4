(function(){
  'use strict';
  const R=window.CarpimKanatlariRules,$=id=>document.getElementById(id);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SAVE='kemal-carpim-kanatlari-v3',COLORS=['#ee7955','#20a5a1'];
  let saved={unlocked:0,best:{}},mode=2,journey='campaign',level=0,decks=[],selected=[0,1],players=[],running=false,paused=false,clock=0,last=0,raf=0,introSize={w:800,h:420};
  let sound=true,music=true,audio=null,musicGain=null,musicIndex=0,nextNote=0;
  let entering=null;
  let mixedFactors=[1,2,3,4,5];
  try{const data=JSON.parse(localStorage.getItem(SAVE)||'null');if(data&&Number.isInteger(data.unlocked))saved={unlocked:Math.max(0,Math.min(9,data.unlocked)),best:data.best&&typeof data.best==='object'?data.best:{}};
    else{const old=JSON.parse(localStorage.getItem('kemal-carpim-kanatlari-v2')||localStorage.getItem('kemal-carpim-kanatlari-v1')||'null');if(old&&Number.isInteger(old.unlocked)){saved.unlocked=Math.max(0,Math.min(5,old.unlocked));if(old.best)Object.keys(old.best).forEach(key=>{if(Number(key)>=0&&Number(key)<=5)saved.best[Number(key)===5?9:Number(key)]=Number(old.best[key])||0;});}}
  }catch(_){}
  const sounds={launch:[[500,.13,100]],hit:[[196,.07],[392,.08],[784,.13]],try:[[330,.08],[261,.16]],miss:[[390,.12,270]],win:[[523,.12],[659,.12],[784,.12],[1047,.35]]};
  function unlockAudio(){
    if(!sound&&!music)return;
    try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio=new Audio();musicGain=audio.createGain();musicGain.gain.value=music ? .027 : 0;musicGain.connect(audio.destination);nextNote=audio.currentTime+.05;}
      if(audio.state==='suspended')audio.resume().catch(()=>{});
    }catch(_){audio=null;}
  }
  function tone(freq,time,duration,gain,type='sine',destination,end){
    if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);if(end)o.frequency.exponentialRampToValueAtTime(end,time+duration);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+.015);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(destination||audio.destination);o.start(time);o.stop(time+duration+.02);
  }
  function play(name){if(!sound||audio?.state!=='running')return;try{let delay=0;for(const[freq,duration,end]of sounds[name]){tone(freq,audio.currentTime+delay,duration,.055,name==='hit'?'triangle':'sine',null,end);delay+=duration*.8;}}catch(_){};}
  // Düşük sesli özgün pentatonik döngü. Duraklatıldığında yeni nota üretilmez.
  function updateMusic(){
    if(!music||!running||paused||document.hidden||audio?.state!=='running'||!$('ck-result').hidden)return;
    const melody=[523,659,784,659,587,659,523,0,659,784,880,784,659,587,523,0];
    if(nextNote<audio.currentTime-.1)nextNote=audio.currentTime+.04;
    try{while(nextNote<audio.currentTime+.18){const note=melody[musicIndex%melody.length];if(note)tone(note,nextNote,.28,.4,'sine',musicGain);if(musicIndex%4===0)tone([130.81,146.83,164.81,130.81][Math.floor(musicIndex/4)%4],nextNote,.6,.28,'triangle',musicGain);musicIndex++;nextNote+=.34;}}catch(_){}
  }
  function updateAudioButtons(){
    $('ck-sound-home').textContent=sound?'◖ Efekt açık':'◖ Efekt kapalı';$('ck-music-home').textContent=music?'♫ Müzik açık':'♫ Müzik kapalı';
    for(const id of['ck-sound','ck-sound-home'])$(id).setAttribute('aria-pressed',String(sound));for(const id of['ck-music','ck-music-home'])$(id).setAttribute('aria-pressed',String(music));
    $('ck-sound').setAttribute('aria-label',sound?'Ses efektlerini kapat':'Ses efektlerini aç');$('ck-music').setAttribute('aria-label',music?'Arka plan müziğini kapat':'Arka plan müziğini aç');$('ck-sound').classList.toggle('muted',!sound);$('ck-music').classList.toggle('muted',!music);
    if(audio&&musicGain){musicGain.gain.setTargetAtTime(music ? .027 : 0,audio.currentTime,.04);if(music)nextNote=audio.currentTime+.05;}
  }
  for(const id of['ck-sound','ck-sound-home'])$(id).addEventListener('click',()=>{sound=!sound;unlockAudio();updateAudioButtons();});
  for(const id of['ck-music','ck-music-home'])$(id).addEventListener('click',()=>{music=!music;unlockAudio();updateAudioButtons();});
  function saveProgress(){try{localStorage.setItem(SAVE,JSON.stringify(saved));}catch(_){$('ck-save-note').textContent='Tarayıcı kaydetmeye izin vermiyor; bu oturumda oynamaya devam edebilirsin.';}}
  function renderMap(){
    if(journey==='campaign'&&level>saved.unlocked)level=saved.unlocked;
    if(journey==='mixed'&&mixedFactors.length&&!mixedFactors.includes(R.FACTORS[level]))level=mixedFactors[0]-1;
    $('ck-route-mode').textContent=journey==='campaign'?'Kademeli rota · 10 ada':journey==='mixed'?'Karışık sor · 10 soru':'Tüm adalar açık';
    $('ck-mixed-settings').hidden=journey!=='mixed';$('ck-start').disabled=!!entering||(journey==='mixed'&&!mixedFactors.length);
    $('ck-question-fact').textContent=journey==='mixed'?'Karışık turda 10 soru':'Her adada 6 soru';
    $('ck-power-info').textContent=journey==='mixed'?'Karışık turda 5 canın ve 1 patlama jokerin var. Joker bir soruyu puansız geçirir.':'Ada başına bir kez doğru kuleye otomatik uçup bir soruyu puansız geçebilirsin. Her yeni adada 5 canın ve jokerin yenilenir.';
    $('ck-route').replaceChildren();R.FACTORS.forEach((factor,i)=>{
      const island=R.ISLANDS[i],b=document.createElement('button'),included=journey==='mixed'&&mixedFactors.includes(factor);b.className='ck-island'+(level===i?' selected':'')+(i<saved.unlocked&&journey!=='mixed'?' completed':'')+(included?' mixed-included':'');b.disabled=journey==='campaign'&&i>saved.unlocked||journey==='mixed'&&!included;b.type='button';b.setAttribute('aria-label',(i+1)+'. ada: '+factor+' ile çarpma — '+island.name+(b.disabled?(journey==='mixed'?' — karışık tur için seçilmedi':' — önceki adayı tamamla'):''));b.setAttribute('aria-pressed',String(level===i));b.style.setProperty('--map-x',island.x+'%');b.style.setProperty('--map-y',island.y+'%');b.style.setProperty('--mobile-x',island.mx+'%');b.style.setProperty('--mobile-y',island.my+'%');
      b.style.setProperty('--compact-x',(i<5?10+i*20:90-(i-5)*20)+'%');b.style.setProperty('--compact-y',(i<5?25:75)+'%');
      const art=document.createElement('canvas');art.width=560;art.height=360;art.setAttribute('aria-hidden','true');const artCtx=art.getContext('2d');artCtx.scale(2,2);paintIsland(artCtx,140,115,100,island);
      const title=document.createElement('b');title.textContent=R.tableName(factor);const name=document.createElement('span');name.className='ck-island-name';name.textContent=island.name;const note=document.createElement('small');note.textContent=journey==='mixed'?(included?'KARIŞIK TURDA':'SEÇİLMEDİ'):b.disabled?'KİLİTLİ':i<saved.unlocked?'✓ GEÇİLDİ':saved.best[i]?'★ '+saved.best[i]:'KEŞFET';
      b.append(art,title,name,note);if(level===i){const crew=document.createElement('span');crew.className='ck-map-crew';for(let n=0;n<mode;n++){const c=document.createElement('canvas');c.width=80;c.height=70;bird(c.getContext('2d'),38,40,24,R.BIRDS[selected[n]]);crew.appendChild(c);}b.appendChild(crew);}
      b.addEventListener('click',()=>{level=i;renderMap();});$('ck-route').appendChild(b);
    });$('ck-island-info').textContent=journey==='mixed'?(mixedFactors.length?'Karışık: '+mixedFactors.join(', ')+' ile çarpma · 10 soru · 5 can':'Başlamak için en az bir çarpım tablosu seç.'):R.NAMES[level]+' · '+R.FACTORS[level]+' ile çarpma · '+(journey==='campaign'?(level+1)+'. adadan 10. adaya yolculuk':'6 soru · 5 can');
  }
  function renderMixedFactors(){
    $('ck-mixed-factors').replaceChildren();R.FACTORS.forEach(factor=>{const b=document.createElement('button');b.type='button';b.className='ck-factor-option';b.dataset.factor=String(factor);b.textContent=factor;b.setAttribute('aria-label',factor+' ile çarpma');b.setAttribute('aria-pressed',String(mixedFactors.includes(factor)));b.addEventListener('click',()=>{mixedFactors=R.normalizeFactors(mixedFactors.includes(factor)?mixedFactors.filter(n=>n!==factor):mixedFactors.concat(factor));document.querySelectorAll('.ck-factor-option').forEach(x=>x.setAttribute('aria-pressed',String(mixedFactors.includes(Number(x.dataset.factor)))));updateMixedSummary();renderMap();});$('ck-mixed-factors').appendChild(b);});updateMixedSummary();
  }
  function updateMixedSummary(){
    $('ck-mixed-summary').textContent=mixedFactors.length?'Seçilenler: '+mixedFactors.join(', ')+' · Her tablo sorulur, toplam 10 soru.':'En az bir çarpım tablosu seçmelisin.';$('ck-mixed-summary').classList.toggle('error',!mixedFactors.length);
  }
  function renderBirds(){
    $('ck-bird-pickers').replaceChildren();for(let index=0;index<mode;index++){
      const group=document.createElement('div');group.className='ck-bird-group';group.setAttribute('role','group');group.setAttribute('aria-label',(index+1)+'. oyuncu kuş seçimi');const title=document.createElement('strong');title.textContent=(index+1)+'. oyuncunun kanat arkadaşı';const grid=document.createElement('div');grid.className='ck-bird-grid';
      R.BIRDS.forEach((b,i)=>{const button=document.createElement('button');button.className='ck-bird-option'+(selected[index]===i?' selected':'');button.type='button';button.setAttribute('aria-label',b.name+' — '+b.tag);button.title=b.power+' · Ada başına 1 joker';button.setAttribute('aria-pressed',String(selected[index]===i));const c=document.createElement('canvas');c.width=128;c.height=96;c.setAttribute('aria-hidden','true');bird(c.getContext('2d'),62,55,30,b,0,false);const name=document.createElement('span');name.textContent=b.name;button.append(c,name);button.addEventListener('click',()=>{selected[index]=i;renderBirds();renderMap();});grid.appendChild(button);});group.append(title,grid);$('ck-bird-pickers').appendChild(group);
    }
  }
  document.querySelectorAll('.ck-mode').forEach(b=>b.addEventListener('click',()=>{mode=Number(b.dataset.mode);document.querySelectorAll('.ck-mode').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});$('ck-second-name').hidden=mode===1;renderBirds();renderMap();}));
  document.querySelectorAll('.ck-journey-mode').forEach(b=>b.addEventListener('click',()=>{journey=b.dataset.journey;document.querySelectorAll('.ck-journey-mode').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});renderMap();}));
  $('ck-open-lobby').addEventListener('click',()=>showLobby());
  $('ck-cover').addEventListener('click',()=>{$('ck-lobby').hidden=true;$('ck-cover-layer').hidden=false;$('ck-stage').dataset.screen='cover';$('ck-atlas').inert=true;$('ck-open-lobby').setAttribute('aria-expanded','false');resizeAll();$('ck-open-lobby').focus({preventScroll:true});});
  $('ck-toggle-settings').addEventListener('click',()=>setSettingsVisible($('ck-settings-scroll').hidden));
  $('ck-map-pick').addEventListener('click',()=>{setSettingsVisible(false);document.querySelector('.ck-island.selected')?.focus({preventScroll:true});});
  $('ck-cancel-flight').addEventListener('click',cancelFlight);
  $('ck-start').addEventListener('click',beginLaunch);$('ck-menu').addEventListener('click',()=>pause(true));$('ck-pause').addEventListener('click',()=>pause(true));$('ck-resume').addEventListener('click',()=>pause(false));$('ck-leave').addEventListener('click',home);$('ck-map').addEventListener('click',home);$('ck-retry').addEventListener('click',start);$('ck-next').addEventListener('click',()=>{level=Math.min(9,level+1);start();});
  $('ck-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('ck-arena').requestFullscreen?.();}catch(_){};});if(!$('ck-arena').requestFullscreen)$('ck-fullscreen').hidden=true;
  function pause(value){
    if(!running||players.every(p=>p.phase==='finished'))return;paused=value;players.forEach(p=>{if(p.drag){p.drag=null;p.aim=null;updateAim(p);}});$('ck-pause-screen').hidden=!value;
    if(value){$('ck-resume').focus();if(audio?.state==='running')audio.suspend().catch(()=>{});}else{unlockAudio();$('ck-pause').focus();}
  }
  function setSettingsVisible(visible){$('ck-settings-scroll').hidden=!visible;$('ck-atlas').inert=visible;$('ck-toggle-settings').textContent=visible?'Adaları gör':'Ayarları göster';$('ck-toggle-settings').setAttribute('aria-expanded',String(visible));$('ck-lobby-title').textContent=visible?'Ekibini hazırla':'Adanı seç';}
  function showLobby(focus=true){$('ck-cover-layer').hidden=true;$('ck-lobby').hidden=false;$('ck-stage').dataset.screen='lobby';$('ck-open-lobby').setAttribute('aria-expanded','true');setSettingsVisible(true);if(focus)$('ck-lobby-title').focus({preventScroll:true});}
  function beginLaunch(){
    if(running||entering||$('ck-lobby').hidden||(journey==='mixed'&&!mixedFactors.length))return;
    // Ses bağlamı dokunma anında açılır; sorular ve puanlama kamera inişini bekler.
    unlockAudio();if(reduced){start();return;}
    entering={elapsed:0,level,settingsVisible:!$('ck-settings-scroll').hidden};$('ck-start').disabled=true;$('ck-lobby').hidden=true;$('ck-atlas').inert=true;$('ck-stage').dataset.screen='zoom';$('ck-zoom').hidden=false;$('ck-zoom-title').textContent=journey==='mixed'?'Karışık tur · '+mixedFactors.join(', '):R.NAMES[level]+' · ×'+R.FACTORS[level];$('ck-zoom-progress').style.width='0%';drawLanding();$('ck-cancel-flight').focus({preventScroll:true});
  }
  function cancelFlight(){
    if(!entering)return;const settingsVisible=entering.settingsVisible;entering=null;resetLanding();$('ck-start').disabled=false;$('main-content').inert=false;showLobby(false);setSettingsVisible(settingsVisible);if(audio?.state==='running')audio.suspend().catch(()=>{});$('ck-start').focus({preventScroll:true});
  }
  function home(){running=false;paused=false;if(journey==='campaign'&&players.length)level=Math.min(saved.unlocked,Math.max(...players.map(p=>p.level)));players.forEach(p=>p.drag=null);$('ck-arena').hidden=true;$('ck-pause-screen').hidden=true;$('main-content').inert=false;$('main-content').removeAttribute('aria-hidden');document.body.classList.remove('ck-playing');if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});if(audio?.state==='running')audio.suspend().catch(()=>{});renderMap();showLobby(false);$('ck-start').focus({preventScroll:true});}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(entering)cancelFlight();if(running)pause(true);if(audio?.state==='running')audio.suspend().catch(()=>{});}});
  document.addEventListener('keydown',e=>{
    if(entering){if(e.key==='Escape'){e.preventDefault();cancelFlight();}else if(e.key==='Tab'){e.preventDefault();$('ck-cancel-flight').focus();}return;}
    if(!running)return;
    if(e.key==='Tab'){const root=!$('ck-result').hidden?$('ck-result'):!$('ck-pause-screen').hidden?$('ck-pause-screen'):$('ck-arena'),controls=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length),first=controls[0],end=controls.at(-1);if(first&&((e.shiftKey&&e.target===first)||(!e.shiftKey&&e.target===end)||!root.contains(e.target))){e.preventDefault();(e.shiftKey?end:first).focus();}return;}
    if(e.key==='Escape'){e.preventDefault();if($('ck-result').hidden)pause(!paused);return;}
    if(paused||!$('ck-result').hidden||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea,select'))return;
    const key=e.key.toLocaleLowerCase('tr-TR');for(const[index,keys,fire,power]of[[0,['a','s','d'],'q','e'],[1,['j','k','l'],'u','o']]){const p=players[index];if(!p)continue;const n=keys.indexOf(key);if(n>=0){e.preventDefault();aimTarget(p,n);}if(key===fire){e.preventDefault();launch(p);}if(key===power){e.preventDefault();usePower(p);}}
  });
  function start(){
    if(journey==='mixed'&&!mixedFactors.length)return;
    resetLanding();paused=false;running=true;clock=0;unlockAudio();if(audio)nextNote=audio.currentTime+.06;musicIndex=0;
    $('ck-result').hidden=true;$('ck-pause-screen').hidden=true;$('ck-arena').hidden=false;document.body.classList.add('ck-playing');$('ck-lanes').classList.toggle('solo',mode===1);$('ck-level-title').textContent=journey==='campaign'?'Kademeli yolculuk · 10 ada':journey==='mixed'?'Karışık sor · '+mixedFactors.join(', ')+' ile çarpma':(level+1)+'. ada · '+R.NAMES[level]+' · ×'+R.FACTORS[level];$('ck-lanes').replaceChildren();decks=R.FACTORS.map((_,i)=>R.deck(i));const questions=journey==='mixed'?R.mixedDeck(mixedFactors):decks[level];
    players=Array.from({length:mode},(_,i)=>{const p={index:i,name:$('ck-name-'+i).value.trim()||'Oyuncu '+(i+1),bird:R.BIRDS[selected[i]],level,questions:questions.map(q=>({...q})),round:0,score:0,islandScore:0,lives:5,firstTry:0,correctTotal:0,jokerTotal:0,jokerUsed:false,cleared:[],skipped:[],mistakes:0,questionWrong:0,phase:'aiming',aim:null,drag:null,flight:null,effect:null,particles:[],missed:[],size:{w:800,h:420}};buildLane(p);newQuestion(p);return p;});resizeAll();$('ck-pause').focus();$('main-content').inert=true;$('main-content').setAttribute('aria-hidden','true');
  }
  function buildLane(p){
    const lane=document.createElement('article');lane.className='ck-lane';lane.dataset.player=p.index;lane.setAttribute('aria-label',p.name+' oyun alanı');
    lane.innerHTML='<div class="ck-player-head"><canvas class="ck-avatar" width="80" height="70" aria-hidden="true"></canvas><strong class="ck-player-name"></strong><span class="ck-island-badge"></span><span class="ck-target-count"></span><span class="ck-lives"></span><span class="ck-score"></span></div><div class="ck-scene"><canvas class="ck-world" width="800" height="420" role="img"></canvas><div class="ck-targets" role="group"></div><span class="ck-scene-note"></span><div class="ck-aim-meter"><span>ATIŞ GÜCÜ</span><i><b></b></i></div><button class="ck-power">✹ Patlat · 1</button><button class="ck-fire" disabled>Nişan al ↗</button></div><div class="ck-question"><div class="ck-readout"><strong class="ck-equation"></strong><span class="ck-question-label"></span></div><p class="ck-feedback" role="status" aria-live="polite"></p></div><div class="ck-wait" hidden><span>✦</span><h3></h3><p></p></div>';
    p.lane=lane;p.canvas=lane.querySelector('.ck-world');p.ctx=p.canvas.getContext('2d');p.feedback=lane.querySelector('.ck-feedback');p.fire=lane.querySelector('.ck-fire');p.equation=lane.querySelector('.ck-equation');p.note=lane.querySelector('.ck-scene-note');p.targetsWrap=lane.querySelector('.ck-targets');p.meter=lane.querySelector('.ck-aim-meter b');lane.querySelector('.ck-player-name').textContent=p.name;bird(lane.querySelector('.ck-avatar').getContext('2d'),37,40,21,p.bird);p.canvas.setAttribute('aria-label',p.name+' sapanı: kuşu geriye çekip doğru sonuç yazan kuleye fırlat. Kuleye dokunup Uçur düğmesini de kullanabilirsin.');p.targetsWrap.setAttribute('aria-label',p.name+' sonuç kuleleri');p.fire.addEventListener('click',()=>launch(p));
    p.power=lane.querySelector('.ck-power');p.power.setAttribute('aria-label',p.bird.power+' jokerini kullan');p.power.title=p.bird.power+(journey==='mixed'?' · Tur başına 1':' · Ada başına 1')+' · Puansız geç';p.power.addEventListener('click',()=>usePower(p));
    p.canvas.addEventListener('pointerdown',e=>{if(paused||!running||p.phase!=='aiming'||p.drag||e.button>0)return;const pos=pointer(p,e),g=R.geometry(p.size);if(Math.hypot(pos.x-g.anchor.x,pos.y-g.anchor.y)>Math.max(g.r*2,50/(p.size.w/800)))return;e.preventDefault();unlockAudio();p.drag={id:e.pointerId,x:g.anchor.x,y:g.anchor.y};p.aim=null;try{p.canvas.setPointerCapture(e.pointerId);}catch(_){};updateAim(p);});
    p.canvas.addEventListener('pointermove',e=>{if(!p.drag||p.drag.id!==e.pointerId)return;e.preventDefault();const pos=pointer(p,e),g=R.geometry(p.size);let dx=Math.min(0,pos.x-g.anchor.x),dy=Math.max(-15,pos.y-g.anchor.y),len=Math.hypot(dx,dy);if(len>115){dx*=115/len;dy*=115/len;}p.drag.x=Math.max(g.r,g.anchor.x+dx);p.drag.y=Math.min(g.ground-g.r,g.anchor.y+dy);p.aim=R.pullShot(g,p.drag);updateAim(p);});
    p.canvas.addEventListener('pointerup',e=>{if(!p.drag||p.drag.id!==e.pointerId)return;const g=R.geometry(p.size),length=Math.hypot(p.drag.x-g.anchor.x,p.drag.y-g.anchor.y);p.drag=null;if(length>12&&p.aim?.vx>30)launch(p);else{p.aim=null;updateAim(p);}try{p.canvas.releasePointerCapture(e.pointerId);}catch(_){};});
    const cancel=e=>{if(p.drag?.id===e.pointerId){p.drag=null;p.aim=null;updateAim(p);}};p.canvas.addEventListener('pointercancel',cancel);p.canvas.addEventListener('lostpointercapture',cancel);$('ck-lanes').appendChild(lane);
  }
  function pointer(p,e){const rect=p.canvas.getBoundingClientRect(),scale=rect.width/800;return{x:(e.clientX-rect.left)/scale,y:(e.clientY-rect.top)/scale};}
  function layoutTargets(p){const g=R.geometry(p.size);p.buttons.forEach((b,i)=>{b.style.left=(g.targets[i].center/8)+'%';b.style.top=(g.targets[i].y/g.H*100)+'%';});}
  function newQuestion(p){
    p.phase='aiming';p.reloadStart=clock;p.questionWrong=0;p.flight=null;p.effect=null;p.aim=null;p.drag=null;p.particles=[];p.travel=null;p.targetsWrap.hidden=false;p.fire.hidden=false;p.power.hidden=false;p.lane.querySelector('.ck-aim-meter').hidden=false;const q=p.questions[p.round];p.values=R.options(q);p.equation.textContent=q.a+' × '+q.b+' = ?';p.lane.querySelector('.ck-question-label').textContent='SORU '+(p.round+1)+' / '+p.questions.length;p.targetsWrap.replaceChildren();
    p.buttons=p.values.map((value,i)=>{const b=document.createElement('button');b.className='ck-target-label';b.type='button';b.textContent=value;b.setAttribute('aria-label',value+' sonuçlu kuleye nişan al');b.setAttribute('aria-pressed','false');b.addEventListener('pointerdown',e=>{if(e.button>0)return;e.preventDefault();aimTarget(p,i);});b.addEventListener('click',e=>{if(e.detail===0)aimTarget(p,i);});p.targetsWrap.appendChild(b);return b;});
    p.feedback.classList.remove('error');p.feedback.textContent='Sonucu bul; kuşu çekip doğru kuleye fırlat.';p.note.textContent=p.bird.name+' · Çek, nişan al, bırak!';layoutTargets(p);updateAim(p);updateHead(p);
  }
  function aimTarget(p,index){
    if(!running||paused||p.phase!=='aiming'||p.drag)return;unlockAudio();p.aim=R.aimAt(R.geometry(p.size),index);p.aimIndex=index;updateAim(p);if(p.aim){p.feedback.classList.remove('error');p.feedback.textContent='Nişan: '+p.values[index]+'. Hazırsan Uçur’a dokun!';}
  }
  function updateAim(p){
    const active=p.phase==='aiming';p.fire.disabled=!active||!p.aim||p.aim.vx<30;p.fire.textContent=active?(p.aim?'Uçur ↗':'Nişan al ↗'):'Kanatlanıyor…';const trace=active&&p.aim?R.trace(p.aim,R.geometry(p.size)):null;p.prediction=trace;
    p.buttons?.forEach((b,i)=>{b.disabled=!active;b.classList.toggle('aimed',trace?.impact===i);b.setAttribute('aria-pressed',String(trace?.impact===i));});p.meter.style.width=(p.aim?Math.min(100,Math.hypot(p.aim.vx,p.aim.vy)/9):0)+'%';p.power.disabled=!active||p.jokerUsed;p.power.textContent=p.jokerUsed?'✹ Kullanıldı':'✹ Patlat · 1';
  }
  function launch(p,special){
    if(!running||paused||p.phase!=='aiming'||!p.aim||p.aim.vx<30)return;unlockAudio();p.phase='flying';p.flight={...p.aim,trail:[],spring:p.aim.release&&!reduced?{...p.aim.release,start:clock}:null};p.drag=null;p.prediction=null;p.effect=null;updateAim(p);p.feedback.textContent='Kuşun hedefe doğru uçuyor…';p.note.textContent='Haydi '+p.bird.name+'!';play('launch');
    if(special){p.flight.special=true;p.flight.target=special.index;p.flight.start=clock;p.feedback.textContent=p.bird.power+'! Kuşun doğru kuleye uçuyor…';p.note.textContent='✹ Patlama jokeri · Puansız geçiş';}
  }
  function usePower(p){
    if(!running||paused||p.phase!=='aiming'||p.drag||p.jokerUsed||p.lives===0)return;
    const index=p.values.indexOf(p.questions[p.round].answer),g=R.geometry(p.size);if(index<0)return;p.jokerUsed=true;p.aim={x:g.anchor.x,y:g.anchor.y,vx:300,vy:0,age:0};launch(p,{index});
  }
  function burst(p,index,correct,special=false){
    const g=R.geometry(p.size),target=g.targets[index],center={x:target.center,y:target.y+target.h*.5};for(let i=0;i<(reduced?12:special?70:34);i++)p.particles.push({x:center.x+(Math.random()-.5)*target.w,y:center.y+(Math.random()-.5)*target.h,vx:(Math.random()-.5)*(special?450:270),vy:-70-Math.random()*(special?340:220),life:0,duration:.8+Math.random()*.5,color:special?(i%3?p.bird.color:'#fff3b4'):correct?(i%4?'#d4a16b':'#ffdf79'):'#eca37e',size:correct?8+Math.random()*21:4+Math.random()*7,rot:Math.random()*6,wood:correct&&!special&&i%4!==0});
  }
  function resolveShot(p,index){
    if(p.phase!=='flying')return;p.phase='resolving';const q=p.questions[p.round],correct=index!==null&&p.values[index]===q.answer,special=!!p.flight?.special;p.effect={start:clock,index,special,kind:index===null?'miss':correct?'correct':'wrong',position:p.flight?{x:p.flight.x,y:p.flight.y}:R.geometry(p.size).anchor};p.flight=null;p.aim=null;
    if(index===null){p.feedback.classList.remove('error');p.feedback.textContent='Az kaldı! Canın duruyor. Çizgiyi izleyip yeniden nişan al.';p.note.textContent='Bir deneme daha!';play('miss');}
    else if(correct){p.points=special?0:R.points(p.questionWrong);p.score+=p.points;p.islandScore+=p.points;if(special){p.jokerTotal++;p.skipped.push(q);}else{p.correctTotal++;if(p.questionWrong===0)p.firstTry++;}p.buttons[index].classList.add('correct');p.equation.textContent=q.a+' × '+q.b+' = '+q.answer;p.feedback.classList.remove('error');p.feedback.textContent=special?'Jokerle geçildi: '+q.a+' × '+q.b+' = '+q.answer+' · Puan yok.':'Doğru kule! +'+p.points+' puan'+(p.questionWrong===0?' · İlk deneme bonusu!':'');p.note.textContent=special?p.bird.power+'!':'Kule yıkılıyor!';burst(p,index,true,special);play('hit');}
    else{p.lives=Math.max(0,p.lives-1);p.mistakes++;p.questionWrong++;if(!p.missed.some(x=>x.a===q.a&&x.b===q.b))p.missed.push(q);p.buttons[index].classList.add('wrong');p.feedback.classList.add('error');p.feedback.textContent=p.lives?'Bu sonuç değil. '+q.b+' tane '+q.a+' düşün; aynı soruyu tekrar dene.':'Bu turdaki 5 canın bitti. Tekrar çalışıp yeniden kanatlanabilirsin.';p.note.textContent=p.lives?'Bir can azaldı · Yeniden dene':'Uçuş tamamlandı';burst(p,index,false);play('try');}
    updateHead(p);p.fire.disabled=true;p.power.disabled=true;
  }
  function afterEffect(p){const kind=p.effect.kind;if(kind==='correct'){p.round++;if(p.round===p.questions.length){completeIsland(p);return;}newQuestion(p);return;}if(p.lives===0){endPlayer(p);return;}p.effect=null;p.phase='aiming';p.reloadStart=clock;p.aim=null;p.drag=null;p.buttons.forEach(b=>b.classList.remove('wrong','correct'));updateAim(p);}
  function completeIsland(p){
    if(journey==='mixed'){endPlayer(p);return;}
    p.cleared.push(p.level);saved.best[p.level]=Math.max(Number(saved.best[p.level])||0,p.islandScore);if(journey==='campaign')saved.unlocked=Math.max(saved.unlocked,Math.min(9,p.level+1));saveProgress();
    if(journey!=='campaign'||p.level===9){endPlayer(p);return;}
    p.phase='travelling';p.travel={start:clock,from:p.level,to:p.level+1};p.aim=null;p.flight=null;p.effect=null;p.targetsWrap.hidden=true;p.fire.hidden=true;p.power.hidden=true;p.lane.querySelector('.ck-aim-meter').hidden=true;p.equation.textContent=R.tableName(R.FACTORS[p.level+1])+' Adası →';p.note.textContent='Ada tamamlandı! '+p.bird.name+' yeni adaya uçuyor.';p.feedback.textContent=R.NAMES[p.level+1]+' · Yeni adada 5 can ve 1 joker seni bekliyor.';updateHead(p);play('win');
  }
  function arrive(p){p.level=p.travel.to;p.travel=null;p.round=0;p.lives=5;p.jokerUsed=false;p.islandScore=0;p.questions=decks[p.level].map(q=>({...q}));newQuestion(p);}
  function endPlayer(p){
    p.phase='finished';p.flight=null;p.aim=null;updateHead(p);p.buttons.forEach(b=>b.disabled=true);p.fire.disabled=true;p.power.disabled=true;if(journey!=='mixed'){saved.best[p.level]=Math.max(Number(saved.best[p.level])||0,p.islandScore);saveProgress();}const wait=p.lane.querySelector('.ck-wait');wait.hidden=false;wait.querySelector('h3').textContent=p.lives?(journey==='campaign'?'Takımadalar keşfedildi!':'Harika uçuş!'):'Bu tur burada bitti';wait.querySelector('span').textContent=p.lives?'✦':'☁';wait.querySelector('p').textContent=mode===2?'Puanın: '+p.score+'. Arkadaşının uçuşu devam ediyor.':'Puanın: '+p.score+'. Yeni bir uçuş seni bekliyor.';if(players.every(x=>x.phase==='finished'))finish();
  }
  function updateHead(p){p.lane.dataset.island=R.FACTORS[p.level];p.lane.dataset.phase=p.phase;const factor=journey==='mixed'?p.questions[Math.min(p.round,p.questions.length-1)].a:R.FACTORS[p.level];p.lane.querySelector('.ck-island-badge').textContent='×'+factor;p.lane.querySelector('.ck-island-badge').setAttribute('aria-label',journey==='mixed'?'Karışık mod: '+factor+' ile çarpma':(p.level+1)+'. ada: '+R.NAMES[p.level]);p.lane.querySelector('.ck-score').textContent='★ '+p.score;p.lane.querySelector('.ck-target-count').textContent=p.round+'/'+p.questions.length;const lives=p.lane.querySelector('.ck-lives');lives.textContent='♥'.repeat(p.lives)+'♡'.repeat(5-p.lives);lives.setAttribute('aria-label',p.lives+' can kaldı');lives.dataset.remaining=p.lives;}
  function finish(){
    const mixed=journey==='mixed',completed=players.some(p=>mixed?p.round===p.questions.length:p.cleared.includes(journey==='campaign'?9:level)),winner=mode===1?players[0]:players[0].score===players[1].score?null:players.reduce((a,b)=>a.score>b.score?a:b);
    $('ck-result-title').textContent=mode===1?(completed?(mixed?'Karışık tur tamamlandı!':journey==='campaign'?'10 adalık macera tamamlandı!':'Ada tamamlandı!'):'Yeni bir uçuşa hazır mısın?'):winner?winner.name+' kazandı!':'Berabere! İki harika pilot!';
    $('ck-result-subtitle').textContent=mixed?'Seçilen tablolar: '+mixedFactors.join(', ')+'. Bu tur ada kilitlerini ve ada rekorlarını değiştirmez.':completed?(journey==='campaign'?'Kuşunla takımadaların sonuna ulaştın. Şimdi istediğin adaya yeniden dönebilirsin.':'Adadaki görevler tamamlandı. İstersen sıradaki adayı keşfet.'):'Öğrendiklerin yanında! Aşağıdaki çarpımları hatırlayıp yeni bir yolculuğa çıkabilirsin.';
    $('ck-result-cards').replaceChildren();players.forEach(p=>{
      const card=document.createElement('div');card.className='ck-result-player';const title=document.createElement('h3');title.textContent=p.name+' · '+p.bird.name+' · ★ '+p.score;title.style.color=COLORS[p.index];
      const summary=document.createElement('p');summary.textContent=(mixed?p.round+'/'+p.questions.length+' soru':p.cleared.length+' ada')+' · '+p.correctTotal+' doğru kule · '+p.jokerTotal+' joker · '+p.lives+' can';
      const review=document.createElement('p');review.className='ck-review';review.textContent=p.missed.length?'Birlikte tekrar edelim: '+p.missed.map(q=>q.a+' × '+q.b+' = '+q.answer).join(' · '):'Doğru kuleleri buldun. Harika dikkat!';card.append(title,summary,review);
      if(p.skipped.length){const assisted=document.createElement('p');assisted.textContent='Jokerle geçilenler: '+p.skipped.map(q=>q.a+' × '+q.b+' = '+q.answer).join(' · ');card.appendChild(assisted);}$('ck-result-cards').appendChild(card);
    });
    $('ck-next').hidden=journey!=='all'||!completed||level===9;$('ck-retry').textContent=mixed?'Karışık turu tekrar oyna':'Aynı adada tekrar';$('ck-result').hidden=false;($('ck-next').hidden?$('ck-retry'):$('ck-next')).focus();play('win');
    window.dispatchEvent(new CustomEvent('kemal-game-complete',{detail:{source:'carpim_kanatlari',journey,tables:mixed?mixedFactors.slice():undefined,level:Math.max(...players.map(p=>p.level))+1,completed,score:Math.max(...players.map(p=>p.score))}}));
  }

  function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function ellipse(ctx,x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function cloud(ctx,x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(ctx,0,0,50,15,'#ffffffb0');ellipse(ctx,-20,-8,24,18,'#ffffffc8');ellipse(ctx,13,-15,28,23,'#ffffffc8');ellipse(ctx,37,-3,24,15,'#ffffffb0');ctx.restore();}
  function tree(ctx,x,y,size,color){ctx.save();ctx.translate(x,y);rounded(ctx,-size*.045,-size*.55,size*.09,size*.55,4,'#8a7957');ellipse(ctx,0,-size*.73,size*.35,size*.45,color);ellipse(ctx,-size*.2,-size*.55,size*.26,size*.28,color);ellipse(ctx,size*.2,-size*.54,size*.27,size*.28,color);ctx.restore();}
  function star(ctx,x,y,r,color,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,rad=i%2?r*.46:r;const px=Math.cos(angle)*rad,py=Math.sin(angle)*rad;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
  function landmark(ctx,x,y,size,island){
    ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ctx.lineCap='round';
    if(island.kind==='palm'){
      ctx.strokeStyle='#946c40';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,8);ctx.quadraticCurveTo(20,-32,2,-68);ctx.stroke();
      for(const [dx,dy]of[[-47,-9],[-43,16],[-16,-28],[26,-25],[46,-3],[33,22]]){ctx.beginPath();ctx.moveTo(2,-68);ctx.quadraticCurveTo(dx*.7,-84+dy*.4,dx,-68+dy);ctx.quadraticCurveTo(dx*.35,-57,2,-68);ctx.fillStyle=dx<0?'#418963':'#65a766';ctx.fill();}
      ellipse(ctx,1,-64,7,7,'#bc8a43');ellipse(ctx,12,-63,6,6,'#d09d56');
    }else if(island.kind==='forest'){tree(ctx,-23,2,73,'#3f7651');tree(ctx,24,6,80,'#599164');tree(ctx,0,-8,98,'#3f855f');}
    else if(island.kind==='coral'){
      ctx.strokeStyle='#e890a5';ctx.lineWidth=13;for(const[dx,h]of[[-29,-35],[0,-66],[28,-44]]){ctx.beginPath();ctx.moveTo(dx*.4,7);ctx.quadraticCurveTo(dx,h*.4,dx,h);ctx.moveTo(dx,h*.6);ctx.lineTo(dx-13,h*.8);ctx.moveTo(dx,h*.4);ctx.lineTo(dx+15,h*.65);ctx.stroke();}ellipse(ctx,0,6,45,11,'#d2b4ad');
    }else if(island.kind==='wind'){
      ctx.fillStyle='#f9f4df';ctx.beginPath();ctx.moveTo(-21,6);ctx.lineTo(-10,-59);ctx.lineTo(11,-59);ctx.lineTo(23,6);ctx.fill();rounded(ctx,-25,2,50,8,3,'#9ea8a0');ctx.strokeStyle='#a58b67';ctx.lineWidth=4;for(let i=0;i<4;i++){ctx.save();ctx.translate(0,-56);ctx.rotate(i*Math.PI/2+.2);ctx.fillStyle='#fff6d8';ctx.fillRect(2,-5,38,13);ctx.strokeRect(2,-5,38,13);ctx.restore();}ellipse(ctx,0,-56,7,7,'#debd73');
    }else if(island.kind==='cactus'){
      ctx.strokeStyle='#79966a';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(0,-61);ctx.moveTo(0,-22);ctx.lineTo(-26,-22);ctx.lineTo(-26,-44);ctx.moveTo(0,-35);ctx.lineTo(24,-35);ctx.lineTo(24,-60);ctx.stroke();star(ctx,0,-67,11,'#ffe29c');star(ctx,24,-65,8,'#f3c784');
    }else if(island.kind==='crystal'){
      for(const[dx,h,color]of[[-24,48,'#b89adf'],[24,60,'#9cbcea'],[0,88,'#c3b1f4']]){ctx.beginPath();ctx.moveTo(dx-18,2);ctx.lineTo(dx-15,-h*.66);ctx.lineTo(dx,-h);ctx.lineTo(dx+17,-h*.65);ctx.lineTo(dx+17,2);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.beginPath();ctx.moveTo(dx,-h);ctx.lineTo(dx,2);ctx.lineTo(dx+17,2);ctx.lineTo(dx+17,-h*.65);ctx.closePath();ctx.fillStyle='#ffffff55';ctx.fill();}
    }else if(island.kind==='mushroom'){
      for(const[dx,s]of[[-28,.55],[25,.7],[0,1]]){ctx.save();ctx.translate(dx,4);ctx.scale(s,s);rounded(ctx,-9,-45,18,50,5,'#fff0cc');ctx.beginPath();ctx.moveTo(-42,-38);ctx.quadraticCurveTo(-30,-98,0,-91);ctx.quadraticCurveTo(30,-98,42,-38);ctx.closePath();ctx.fillStyle='#c96c70';ctx.fill();ellipse(ctx,-15,-61,8,6,'#fff4df');ellipse(ctx,15,-55,9,6,'#fff4df');ellipse(ctx,2,-78,6,5,'#fff4df');ctx.restore();}
    }else if(island.kind==='snow'){
      for(const[dx,h]of[[-25,65],[25,87]]){ctx.beginPath();ctx.moveTo(dx-36,5);ctx.lineTo(dx,-h);ctx.lineTo(dx+37,5);ctx.closePath();ctx.fillStyle='#8db7c8';ctx.fill();ctx.beginPath();ctx.moveTo(dx-15,-h*.57);ctx.lineTo(dx,-h);ctx.lineTo(dx+17,-h*.56);ctx.lineTo(dx+4,-h*.62);ctx.lineTo(dx-4,-h*.49);ctx.closePath();ctx.fillStyle='#f5ffff';ctx.fill();}
    }else if(island.kind==='volcano'){
      ctx.beginPath();ctx.moveTo(-54,8);ctx.lineTo(-16,-68);ctx.lineTo(16,-68);ctx.lineTo(55,8);ctx.closePath();ctx.fillStyle='#726b70';ctx.fill();ellipse(ctx,0,-67,18,6,'#f49b64');ctx.strokeStyle='#f6b06c';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(3,-62);ctx.lineTo(-5,-40);ctx.lineTo(15,-23);ctx.lineTo(9,4);ctx.stroke();ellipse(ctx,-9,-84,14,11,'#e1cfbd');ellipse(ctx,5,-100,20,13,'#efe2d7');
    }else{
      rounded(ctx,-37,-35,74,42,6,'#b48049','#87603d');rounded(ctx,-37,-49,74,24,8,'#e3b65b','#9c763e');ctx.fillStyle='#f6d576';ctx.fillRect(-22,-48,8,54);ctx.fillRect(16,-48,8,54);rounded(ctx,-6,-29,13,15,3,'#f8e48f');star(ctx,0,-76,18,'#ffe59b',.2);
    }
    ctx.restore();
  }
  function paintIsland(ctx,x,y,size,island){
    ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ellipse(ctx,0,22,110,40,'#153b5c22');ellipse(ctx,0,12,118,45,'#9ce4db99');
    ctx.beginPath();ctx.moveTo(-105,-5);ctx.bezierCurveTo(-96,-39,-56,-43,-28,-41);ctx.bezierCurveTo(5,-68,58,-42,79,-26);ctx.bezierCurveTo(117,-8,108,20,79,30);ctx.bezierCurveTo(40,51,-2,42,-28,42);ctx.bezierCurveTo(-67,45,-108,26,-105,-5);ctx.closePath();ctx.fillStyle=island.sand;ctx.fill();
    ctx.save();ctx.scale(.84,.76);ctx.translate(0,-9);ctx.beginPath();ctx.moveTo(-105,-5);ctx.bezierCurveTo(-96,-39,-56,-43,-28,-41);ctx.bezierCurveTo(5,-68,58,-42,79,-26);ctx.bezierCurveTo(117,-8,108,20,79,30);ctx.bezierCurveTo(40,51,-2,42,-28,42);ctx.bezierCurveTo(-67,45,-108,26,-105,-5);ctx.closePath();ctx.fillStyle=island.land;ctx.fill();ctx.restore();
    ellipse(ctx,-57,-14,14,6,'#ffffff22');ellipse(ctx,55,12,17,7,'#ffffff22');landmark(ctx,0,-15,65,island);ctx.restore();
  }
  function resetLanding(){document.querySelector('.ck-sea').style.transform='';document.querySelector('.ck-sea').style.transformOrigin='';$('ck-landing-flash').style.opacity='0';$('ck-zoom').hidden=true;}
  function drawLanding(){
    if(!entering)return;
    // Kamera yeni bir harita çizmez: kapağın ve ayarların altındaki gerçek ada katmanına yaklaşır.
    const sea=document.querySelector('.ck-sea'),box=sea.getBoundingClientRect(),target=document.querySelector('.ck-island.selected');
    // Dönüşüm uygulanmış DOM ölçüleri yerine sabit yerleşim ölçülerini kullan.
    if(!entering.camera){const tile=target.getBoundingClientRect();entering.camera={w:box.width,h:box.height,x:tile.left+tile.width/2-box.left,y:tile.top+tile.width*115/280-box.top};}
    const camera=entering.camera,u=Math.min(1,entering.elapsed/1800),t=Math.max(0,Math.min(1,(u-.12)/.76)),ease=t*t*(3-2*t),scale=1+ease*5;
    sea.style.transformOrigin=camera.x+'px '+camera.y+'px';sea.style.transform='translate('+((camera.w*.5-camera.x)*ease)+'px,'+((camera.h*.5-camera.y)*ease)+'px) scale('+scale+')';
    $('ck-zoom-progress').style.width=Math.round(u*100)+'%';$('ck-landing-flash').style.opacity=String(Math.max(0,(u-.89)/.11));
  }
  function drawJourney(ctx,size,p){
    const H=size.h/(size.w/800),u=Math.min(1,(clock-p.travel.start)/(reduced?200:2200));ctx.save();ctx.scale(size.w/800,size.w/800);const sea=ctx.createLinearGradient(0,0,800,H);sea.addColorStop(0,'#278da9');sea.addColorStop(1,'#65bfbd');ctx.fillStyle=sea;ctx.fillRect(0,0,800,H);
    ctx.strokeStyle='#b7f1e440';ctx.lineWidth=2;for(let i=0;i<14;i++){const y=H*.18+i*H*.06;ctx.beginPath();ctx.moveTo((i%2)*30,y);ctx.bezierCurveTo(210,y-20,440,y+20,800,y);ctx.stroke();}
    const s=Math.min(105,H*.25),base=H*.68;paintIsland(ctx,210,base,s,R.ISLANDS[p.travel.from]);paintIsland(ctx,600,base,s,R.ISLANDS[p.travel.to]);ctx.textAlign='center';ctx.font='900 23px Nunito,sans-serif';ctx.fillStyle='#fff8de';ctx.fillText(R.tableName(R.FACTORS[p.travel.from]),210,Math.min(H-15,base+s*.62));ctx.fillText(R.tableName(R.FACTORS[p.travel.to]),600,Math.min(H-15,base+s*.62));
    for(let i=1;i<12;i++){const t=i/12;ellipse(ctx,210+390*t,base-40-Math.sin(t*Math.PI)*Math.min(120,H*.36),3.5,3.5,'#fff4cb88');}bird(ctx,210+390*u,base-40-Math.sin(u*Math.PI)*Math.min(120,H*.36),27,p.bird,Math.sin(u*Math.PI*2)*.15);ctx.font='900 24px Nunito,sans-serif';ctx.fillStyle='#fffaf0';ctx.fillText(R.NAMES[p.travel.to]+' seni bekliyor!',400,Math.max(34,H*.14));ctx.restore();
  }
  function bird(ctx,x,y,r,b=R.BIRDS[0],angle=0,blink=false){
    if(!ctx)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ellipse(ctx,0,r*.94,r*.82,r*.16,'#224e4722');ctx.fillStyle=b.color;
    if(b.kind==='owl'){ctx.beginPath();ctx.moveTo(-r*.7,-r*.3);ctx.lineTo(-r*.9,-r*1.26);ctx.lineTo(-r*.15,-r*.7);ctx.lineTo(r*.85,-r*1.24);ctx.lineTo(r*.8,-r*.25);ctx.fill();}
    else if(b.kind==='fluffy'){ellipse(ctx,-r*.35,-r*.88,r*.27,r*.37,b.color);ellipse(ctx,0,-r*1.05,r*.25,r*.4,b.color);ellipse(ctx,r*.27,-r*.87,r*.24,r*.32,b.color);}
    else{ctx.beginPath();ctx.moveTo(-r*.65,-r*.4);ctx.lineTo(-r*.8,-r*1.3);ctx.quadraticCurveTo(-r*.1,-r*1.2,0,-r*.55);if(b.kind!=='round'){ctx.lineTo(r*.02,-r*1.32);ctx.quadraticCurveTo(r*.72,-r*1.18,r*.6,-r*.52);}ctx.closePath();ctx.fill();}
    const grad=ctx.createLinearGradient(-r,-r,r,r);grad.addColorStop(0,b.color);grad.addColorStop(1,b.shade);if(b.kind==='swift'){ctx.beginPath();ctx.moveTo(-r,-r*.1);ctx.quadraticCurveTo(-r*.2,-r*1.55,r*.95,r*.2);ctx.quadraticCurveTo(r*.8,r*.95,-r*.55,r*.83);ctx.closePath();ctx.fillStyle=grad;ctx.fill();}else ellipse(ctx,0,0,r,r*.92,grad);
    ellipse(ctx,0,r*.38,r*.71,r*.43,b.kind==='owl'?'#e8d9ec':'#ffedc9');ellipse(ctx,-r*.68,r*.05,r*.33,r*.4,b.shade);ellipse(ctx,-r*.2,-r*.55,r*.32,r*.12,'#ffffff40');const eye=b.kind==='owl' ? .32 : .25;ellipse(ctx,r*.08,-r*.19,r*eye,r*.31,'#fffdf4');ellipse(ctx,r*.56,-r*.2,r*eye,r*.3,'#fffdf4');
    if(blink){ctx.strokeStyle='#314b4c';ctx.lineWidth=r*.07;ctx.beginPath();ctx.moveTo(-r*.05,-r*.2);ctx.lineTo(r*.24,-r*.2);ctx.moveTo(r*.38,-r*.2);ctx.lineTo(r*.67,-r*.2);ctx.stroke();}else{ellipse(ctx,r*.18,-r*.14,r*.09,r*.15,'#214a4b');ellipse(ctx,r*.62,-r*.16,r*.09,r*.15,'#214a4b');ellipse(ctx,r*.2,-r*.2,r*.03,r*.04,'white');ellipse(ctx,r*.64,-r*.22,r*.03,r*.04,'white');}
    ctx.fillStyle='#f3a82d';ctx.beginPath();ctx.moveTo(r*.34,-r*.02);ctx.lineTo(r*(b.kind==='swift'?1.17:.94),r*.14);ctx.lineTo(r*.35,r*.32);ctx.closePath();ctx.fill();ellipse(ctx,-r*.14,r*.15,r*.14,r*.08,'#ef8e6f88');ctx.restore();
  }
  function crate(ctx,x,y,w,h){rounded(ctx,x,y,w,h,3,'#d9a25e','#8c6039');ctx.lineWidth=2;ctx.strokeStyle='#edc38b';ctx.strokeRect(x+5,y+5,w-10,h-10);ctx.strokeStyle='#b67a42';ctx.beginPath();ctx.moveTo(x+7,y+h-7);ctx.lineTo(x+w-7,y+7);ctx.stroke();for(const[a,b]of[[x+5,y+5],[x+w-5,y+5],[x+5,y+h-5],[x+w-5,y+h-5]])ellipse(ctx,a,b,1.7,1.7,'#805833');}
  function drawTower(ctx,t,index,p){
    if(p?.effect?.kind==='correct'&&p.effect.index===index)return;ctx.save();if(p?.effect?.kind==='wrong'&&p.effect.index===index&&!reduced)ctx.translate(Math.sin((clock-p.effect.start)*.03)*4,0);ellipse(ctx,t.center,t.y+t.h+4,t.w*.7,7,'#274c4720');const post=t.w*.22;rounded(ctx,t.x,t.y+12,post,t.h-12,3,'#a37146','#795232');rounded(ctx,t.x+t.w-post,t.y+12,post,t.h-12,3,'#a37146','#795232');crate(ctx,t.x+post+3,t.y+t.h*.48,t.w-2*post-6,t.h*.5);rounded(ctx,t.x-6,t.y,t.w+12,13,3,'#edc58e','#95653b');rounded(ctx,t.x-6,t.y+t.h*.44,t.w+12,10,3,'#bc8b57','#95653b');ctx.restore();
  }
  function scene(ctx,size,p){
    if(!ctx||!size.w||!size.h)return;if(p?.phase==='travelling'){drawJourney(ctx,size,p);return;}const g=R.geometry(size),{H,ground,r,anchor,sling}=g,island=R.ISLANDS[p?.level??level],theme=island.colors,time=reduced?0:clock*.001;ctx.save();ctx.scale(size.w/800,size.w/800);if(p?.effect?.kind==='correct'&&!reduced){const age=(clock-p.effect.start)/1000;ctx.translate(Math.sin(age*60)*Math.max(0,1-age*4)*3,0);}
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,theme[0]);sky.addColorStop(1,'#f8f5d8');ctx.fillStyle=sky;ctx.fillRect(-10,-10,820,H+20);ellipse(ctx,705,H*.17,36,36,'#fff2ac');ellipse(ctx,705,H*.17,48,48,'#fff2b83a');cloud(ctx,100+Math.sin(time*.09)*20,H*.17,.8);cloud(ctx,355+Math.cos(time*.07)*25,H*.1,.55);cloud(ctx,585,H*.33,.7);
    ctx.fillStyle=theme[1];ctx.beginPath();ctx.moveTo(0,ground);ctx.bezierCurveTo(70,ground-H*.6,230,ground-H*.25,390,ground-H*.3);ctx.bezierCurveTo(540,ground-H*.57,700,ground-H*.45,800,ground-H*.2);ctx.lineTo(800,H);ctx.lineTo(0,H);ctx.fill();ctx.fillStyle=theme[2]+'88';ctx.beginPath();ctx.moveTo(0,ground-H*.1);ctx.bezierCurveTo(140,ground-H*.4,340,ground+H*.02,480,ground-H*.17);ctx.bezierCurveTo(620,ground-H*.4,750,ground-H*.12,800,ground-H*.15);ctx.lineTo(800,H);ctx.lineTo(0,H);ctx.fill();tree(ctx,20,ground-10,Math.min(H*.55,190),theme[2]);tree(ctx,788,ground-14,Math.min(H*.64,210),theme[2]);landmark(ctx,285,ground-18,Math.min(115,H*.32),island);rounded(ctx,-20,ground,840,H-ground+30,20,island.land);rounded(ctx,-20,ground+13,840,H-ground+20,15,'#c5a276');ctx.fillStyle=island.sand;ctx.fillRect(0,ground+24,800,H);ctx.fillStyle='#4caeb8';ctx.fillRect(0,ground+42,800,Math.max(0,H-ground-42));ctx.strokeStyle='#c7f6e9aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,ground+45);for(let x=0;x<=800;x+=30)ctx.lineTo(x,ground+45+Math.sin(x*.045+time)*2);ctx.stroke();
    for(let i=0;i<18;i++){const x=i*51+12,y=ground+32+(i%3)*11;ctx.strokeStyle='#bc9a69';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8,y+1);ctx.stroke();}for(const[x,k]of[[80,1],[315,.7],[770,.8]]){ellipse(ctx,x,ground,20*k,5*k,'#497c48');ctx.fillStyle='#527e4a';ctx.fillRect(x-2,ground-15*k,3,15*k);star(ctx,x-2,ground-17*k,5*k,'#fff0be');}g.targets.forEach((t,i)=>drawTower(ctx,t,i,p));
    if(!p){ctx.font='900 26px Nunito,sans-serif';ctx.textAlign='center';g.targets.forEach((t,i)=>{rounded(ctx,t.center-30,t.y-34,60,34,7,'#fff6df','#bc8953');ctx.fillStyle='#4b6851';ctx.fillText(['12','15','18'][i],t.center,t.y-9);});}
    ellipse(ctx,anchor.x,ground+3,45,9,'#244b4930');ctx.lineCap='round';ctx.strokeStyle='#65432b';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(anchor.x,ground-4);ctx.lineTo(anchor.x,ground-sling*.55);ctx.lineTo(anchor.x-24,anchor.y-5);ctx.moveTo(anchor.x,ground-sling*.55);ctx.lineTo(anchor.x+25,anchor.y-8);ctx.stroke();ctx.strokeStyle='#b8884e';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(anchor.x-2,ground-7);ctx.lineTo(anchor.x-2,ground-sling*.55);ctx.lineTo(anchor.x-25,anchor.y-4);ctx.stroke();
    if(p?.prediction){const path=p.prediction.points;for(let i=1;i<path.length;i++){const point=path[i];if(point.y<8)continue;ellipse(ctx,point.x,point.y,Math.max(2.5,5-i*.12),Math.max(2.5,5-i*.12),'#fffdf3d9');}const end=p.prediction.position;if(p.prediction.impact!==null){ctx.strokeStyle='#ffe9a8';ctx.lineWidth=3;ctx.beginPath();ctx.arc(end.x,end.y,15,0,Math.PI*2);ctx.stroke();}}
    const reserve=p?Math.max(0,p.lives-1):4;for(let i=0;i<reserve;i++)bird(ctx,22+i*29,ground-13,Math.min(14,r*.5),p?.bird||R.BIRDS[selected[0]],Math.sin(time*1.8+i)*.035);if(!p||p.phase==='aiming'){let pos=p?.drag||anchor;if(p&&!p.drag&&!reduced&&clock-p.reloadStart<260){const u=Math.min(1,(clock-p.reloadStart)/260);pos={x:107+(anchor.x-107)*u,y:ground-14+(anchor.y-ground+14)*u-Math.sin(u*Math.PI)*30};}ctx.strokeStyle='#684133';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(anchor.x-25,anchor.y-3);ctx.lineTo(pos.x,pos.y+6);ctx.lineTo(anchor.x+25,anchor.y-6);ctx.stroke();bird(ctx,pos.x,pos.y,r,p?.bird||R.BIRDS[selected[0]],p?.drag?-.15:Math.sin(time*2)*.035,Math.sin(time*.9)>.995);}
    if(p?.flight){const f=p.flight;for(let i=0;i<f.trail.length;i++)ellipse(ctx,f.trail[i].x,f.trail[i].y,r*.2,r*.2,'#fffdf0'+Math.floor((i/f.trail.length)*110).toString(16).padStart(2,'0'));let x=f.x,y=f.y;if(f.spring){const u=Math.min(1,(clock-f.spring.start)/80);x=f.spring.x+(f.x-f.spring.x)*u;y=f.spring.y+(f.y-f.spring.y)*u;ctx.strokeStyle='#684133';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(anchor.x-25,anchor.y-3);ctx.lineTo(x,y+6);ctx.lineTo(anchor.x+25,anchor.y-6);ctx.stroke();}bird(ctx,x,y,r,p.bird,Math.atan2(f.vy,f.vx)*.5);}
    if(p?.effect){const e=p.effect,age=(clock-e.start)/1000,alpha=Math.max(0,1-age);ctx.save();ctx.globalAlpha=alpha;if(e.kind==='correct'){if(e.special){ctx.strokeStyle=p.bird.color;ctx.lineWidth=Math.max(1,9-age*8);ctx.beginPath();ctx.arc(e.position.x,e.position.y,30+age*120,0,Math.PI*2);ctx.stroke();star(ctx,e.position.x,e.position.y,85+age*30,'#fff3b6',age*2);star(ctx,e.position.x,e.position.y,58+age*25,p.bird.color,-age*2);}else star(ctx,e.position.x,e.position.y,45+age*15,'#ffe8a1',age*2);ctx.font='1000 30px Nunito,sans-serif';ctx.fillStyle='#2e6647';ctx.textAlign='center';ctx.fillText(e.special?'JOKER!':'+'+p.points,e.position.x,e.position.y-40-age*45);}else if(e.kind==='wrong'){ctx.font='900 32px Nunito,sans-serif';ctx.textAlign='center';ctx.fillStyle='#c64f47';ctx.fillText('♥ −1',e.position.x,e.position.y-20-age*45);}else{bird(ctx,e.position.x,Math.min(ground-r,e.position.y),r,p.bird,age*.4);star(ctx,e.position.x-r,e.position.y-r,10,'#fff0ac',age*3);}ctx.restore();}
    if(p)for(const v of p.particles){ctx.save();ctx.globalAlpha=Math.max(0,1-v.life/v.duration);ctx.translate(v.x,v.y);ctx.rotate(v.rot+v.life*4);rounded(ctx,-v.size/2,-v.size/2,v.size,v.wood?v.size*.5:v.size,2,v.color);if(v.wood){ctx.strokeStyle='#a77344';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-v.size*.3,0);ctx.lineTo(v.size*.3,0);ctx.stroke();}ctx.restore();}if(!p)bird(ctx,68,ground-22,r*.8,R.BIRDS[selected[1]],-.12);ctx.restore();
  }
  function fitCanvas(canvas){const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return null;const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);canvas.getContext('2d').setTransform(ratio,0,0,ratio,0,0);return{w:box.width,h:box.height};}
  function fitStage(){if(!window.innerHeight)return;const stage=$('ck-stage'),top=stage.getBoundingClientRect().top+(window.scrollY||0),dock=$('shortcutDock'),reserve=dock?Math.min(115,dock.getBoundingClientRect().height+25):25;stage.style.setProperty('--ck-stage-height',Math.max(window.innerWidth<600?280:300,Math.min(820,window.innerHeight-top-reserve-18))+'px');}
  function resizeAll(){fitStage();const intro=fitCanvas($('ck-intro-canvas'));if(intro)introSize=intro;if(entering){document.querySelector('.ck-sea').style.transform='';entering.camera=null;drawLanding();}players.forEach(p=>{const size=fitCanvas(p.canvas);if(!size)return;const old=R.geometry(p.size),next=R.geometry(size),delta=next.anchor.y-old.anchor.y;p.size=size;p.drag=null;if(p.flight)p.flight.y+=delta;if(p.effect)p.effect.position.y+=delta;if(p.phase==='aiming'){p.aim=null;updateAim(p);}layoutTargets(p);});}
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resizeAll):null;observer?.observe($('ck-arena'));observer?.observe($('ck-intro-canvas'));window.addEventListener('resize',resizeAll);
  function frame(now){
    const dt=last?Math.min(50,now-last):16;last=now;if(!paused&&!document.hidden){clock+=dt;if(entering){entering.elapsed+=dt;drawLanding();if(entering.elapsed>=1800){entering=null;$('ck-zoom').hidden=true;$('ck-start').disabled=false;start();}}updateMusic();if(running){for(const p of players){
      if(p.phase==='flying'){const g=R.geometry(p.size);if(p.flight.special){const f=p.flight,u=Math.min(1,(clock-f.start)/(reduced?300:950)),t=g.targets[f.target];f.x=g.anchor.x+(t.center-g.anchor.x)*u;f.y=g.anchor.y+(t.label.y+t.label.h*.5-g.anchor.y)*u-Math.sin(u*Math.PI)*Math.min(170,g.H*.32);if(u===1)resolveShot(p,f.target);}else{if(p.flight.spring&&clock-p.flight.spring.start>=80)p.flight.spring=null;let remaining=p.flight.spring?0:dt/1000;while(remaining>0&&p.phase==='flying'){const step=Math.min(remaining,1/120),result=R.step(p.flight,step,g);remaining-=step;if(result.impact!==null)resolveShot(p,result.impact);else if(result.miss)resolveShot(p,null);}}if(p.flight){p.flight.trail.push({x:p.flight.x,y:p.flight.y});if(p.flight.trail.length>10)p.flight.trail.shift();}}
      if(p.phase==='resolving'&&clock-p.effect.start>(reduced?420:1050))afterEffect(p);if(p.phase==='travelling'&&clock-p.travel.start>(reduced?200:2200))arrive(p);for(const v of p.particles){v.life+=dt/1000;v.x+=v.vx*dt/1000;v.y+=v.vy*dt/1000;v.vy+=440*dt/1000;}p.particles=p.particles.filter(v=>v.life<v.duration);scene(p.ctx,p.size,p);
    }}else scene($('ck-intro-canvas').getContext('2d'),introSize,null);}raf=requestAnimationFrame(frame);
  }
  renderMixedFactors();renderMap();renderBirds();updateAudioButtons();resizeAll();raf=requestAnimationFrame(frame);window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);if(audio?.state==='running')audio.suspend().catch(()=>{});});window.addEventListener('pageshow',e=>{if(e.persisted){last=0;raf=requestAnimationFrame(frame);if(running)pause(true);}});
})();
