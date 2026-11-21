/* Local reef arcade: game scores stay separate from classroom behavior records. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumBubbleGames=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const CATALOG=Object.freeze([
    {id:'multiply',title:'Çarpma',caption:'Çarp, doğru sonucu bul.',symbol:'×',color:'aqua'},
    {id:'syllables',title:'Hece Atölyesi',caption:'Hece say veya heceleri birleştir.',symbol:'he·ce',color:'peach'},
    {id:'synonyms',title:'Eş Anlamlılar',caption:'Aynı anlamı taşıyan sözcüğü bul.',symbol:'a ≈ a',color:'lilac'},
    {id:'antonyms',title:'Zıt Anlamlılar',caption:'Karşıt anlamlı sözcüğü yakala.',symbol:'↔',color:'mint'},
    {id:'rounding',title:'Yuvarlama',caption:'Onluğa ve yüzlüğe yuvarla.',symbol:'≈',color:'gold'},
    {id:'memory',title:'Eşini Bul',caption:'Deniz dostlarının eşlerini bul.',symbol:'◈',color:'aqua'},
    {id:'cleanup',title:'Deniz Temizliği',caption:'Çöpleri patlat, canlıları koru.',symbol:'♻',color:'mint'},
    {id:'shells',title:'İnci Takibi',caption:'Gözünü inciden ayırma.',symbol:'◉',color:'peach'},
    {id:'surf',title:'Akıntı Sörfü',caption:'Basılı tut, mercanlardan süzül.',symbol:'∿',color:'aqua'},
    {id:'lights',title:'Işık İzleri',caption:'Rengi ve melodiyi takip et.',symbol:'♫',color:'lilac'}
  ]);
  const WORDS=[
    ['top','top'],['kuş','kuş'],['gül','gül'],['ev','ev'],['at','at'],['dal','dal'],
    ['kalem','ka|lem'],['kitap','ki|tap'],['okul','o|kul'],['masa','ma|sa'],['deniz','de|niz'],['çiçek','çi|çek'],['balık','ba|lık'],['güneş','gü|neş'],['orman','or|man'],['bulut','bu|lut'],['kiraz','ki|raz'],['elma','el|ma'],
    ['araba','a|ra|ba'],['kelebek','ke|le|bek'],['öğretmen','öğ|ret|men'],['oyuncak','o|yun|cak'],['pencere','pen|ce|re'],['arkadaş','ar|ka|daş'],['makarna','ma|kar|na'],['domates','do|ma|tes'],['patates','pa|ta|tes'],['portakal','por|ta|kal'],['merdiven','mer|di|ven'],['papatya','pa|pat|ya'],
    ['bilgisayar','bil|gi|sa|yar'],['televizyon','te|le|viz|yon'],['mandalina','man|da|li|na'],['kütüphane','kü|tüp|ha|ne'],['salatalık','sa|la|ta|lık'],['kaplumbağa','kap|lum|ba|ğa'],['ilkokul','il|ko|kul'],['ayakkabı','a|yak|ka|bı'],['arkadaşlık','ar|ka|daş|lık'],['matematik','ma|te|ma|tik'],['öğretmenimiz','öğ|ret|me|ni|miz'],['sorumluluk','so|rum|lu|luk']
  ].map(([word,parts])=>Object.freeze({word,parts:Object.freeze(parts.split('|'))}));
  const SYNONYMS=[
    ['cevap','yanıt'],['soru','sual'],['öğrenci','talebe'],['öğretmen','muallim'],['okul','mektep'],['doktor','hekim'],['konuk','misafir'],['hediye','armağan'],['yıl','sene'],['ayakkabı','pabuç'],['sözcük','kelime'],['cümle','tümce'],['öykü','hikâye'],['kalp','yürek'],['ulus','millet'],['yurt','vatan'],['özgürlük','hürriyet'],['görev','vazife'],['yarar','fayda'],['doğa','tabiat'],['ihtiyar','yaşlı'],['güç','kuvvet'],['barış','sulh'],['sebep','neden'],['anı','hatıra'],['özlem','hasret'],['uyarı','ikaz'],['önlem','tedbir'],['olanak','imkân'],['baş','kafa']
  ].map(pair=>Object.freeze(pair));
  const ANTONYMS=[
    ['büyük','küçük'],['uzun','kısa'],['sıcak','soğuk'],['açık','kapalı'],['hızlı','yavaş'],['ağır','hafif'],['genç','yaşlı'],['yeni','eski'],['temiz','kirli'],['erken','geç'],['kolay','zor'],['az','çok'],['yakın','uzak'],['ince','kalın'],['sert','yumuşak'],['ıslak','kuru'],['dolu','boş'],['doğru','yanlış'],['ileri','geri'],['yukarı','aşağı'],['gündüz','gece'],['giriş','çıkış'],['artı','eksi'],['gelmek','gitmek'],['başlamak','bitirmek'],['kazanmak','kaybetmek'],['gülmek','ağlamak'],['alçak','yüksek'],['dar','geniş'],['çalışkan','tembel']
  ].map(pair=>Object.freeze(pair));
  const levels=['easy','medium','hard'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function shuffle(values,random=Math.random){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  const pick=(items,random)=>items[Math.floor(random()*items.length)];
  function choices(answer,pool,random){
    const correct=String(answer),others=shuffle([...new Set(pool.map(String))].filter(v=>v!==correct),random).slice(0,3);
    if(others.length<3)throw Error('Dört farklı yanıt gerekli.');
    return shuffle([correct,...others],random).map((value,index)=>({id:'answer-'+index,value}));
  }
  function generate(game,{level='easy',mode='count',grade,roundingStep=10,random=Math.random,used=new Set()}={}){
    const difficulty=levels.includes(level)?level:'easy';
    if(!CATALOG.slice(0,5).some(g=>g.id===game))throw Error('Geçersiz baloncuk oyunu.');
    let q;
    if(game==='multiply'){
      const max=[1,2,3,4].includes(Number(grade))?(Number(grade)>=3?9:5):difficulty==='easy'?5:difficulty==='medium'?10:12,all=[];
      for(let a=1;a<=max;a++)for(let b=1;b<=max;b++)all.push([a,b]);
      const fresh=all.filter(([a,b])=>!used.has('m-'+a+'-'+b)),[a,b]=pick(fresh.length?fresh:all,random),answer=a*b;
      q={key:'m-'+a+'-'+b,prompt:'Çarpımın yazdığı baloncuğu bul.',stem:a+' × '+b,answer:String(answer),explanation:a+' × '+b+' = '+answer,options:choices(answer,[answer-1,answer+1,answer+a,answer+b,answer+2,Math.max(1,answer-a),Math.max(1,answer-b)],random)};
    }else if(game==='rounding'){
      const graded=[1,2,3,4].includes(Number(grade)),step=graded?(Number(grade)>=3&&Number(roundingStep)===100?100:10):difficulty==='easy'?10:difficulty==='medium'?100:pick([10,100,1000],random),min=graded?(step===100?101:11):difficulty==='easy'?11:difficulty==='medium'?101:1001,max=graded?(Number(grade)===4?9999:step===100?999:99):difficulty==='easy'?99:difficulty==='medium'?999:9999;
      const available=Array.from({length:max-min+1},(_,i)=>min+i).filter(n=>n%step!==0&&!used.has('r-'+n+'-'+step));
      const n=available.length?pick(available,random):min,answer=Math.round(n/step)*step,unit=step===10?'onluğa':step===100?'yüzlüğe':'binliğe';
      const remainder=n%step;
      q={key:'r-'+n+'-'+step,prompt:'En yakın '+unit+' yuvarla.',stem:String(n),answer:String(answer),explanation:n+' sayısı '+answer+' sayısına yuvarlanır. '+(remainder>=step/2?'Orta noktada veya üstünde olduğu için üst basamağa gider.':'Orta noktanın altında olduğu için alt basamağa gider.'),options:choices(answer,[answer-step,answer+step,answer-2*step,answer+2*step,answer+3*step].filter(v=>v>=0),random),number:n,step};
    }else if(game==='syllables'){
      const list=WORDS.filter(w=>difficulty==='easy'?w.parts.length<=2:difficulty==='medium'?w.parts.length>=2&&w.parts.length<=3:w.parts.length>=3),fresh=list.filter(w=>!used.has('s-'+w.word));
      const w=pick(fresh.length?fresh:list,random);
      if(mode==='build'){
        const pool=WORDS.flatMap(item=>item.parts);
        q={key:'s-'+w.word,prompt:'Sözcüğü sırayla hecelerine ayır.',stem:w.word,answer:w.parts[0],parts:[...w.parts],step:0,pool,explanation:w.parts.join(' • '),options:choices(w.parts[0],pool,random)};
      }else q={key:'s-'+w.word,prompt:'Bu sözcük kaç heceli?',stem:w.word,answer:String(w.parts.length),explanation:w.parts.join(' • ')+' → '+w.parts.length+' hece',options:choices(w.parts.length,[1,2,3,4,5,6],random)};
    }else{
      const pairs=game==='synonyms'?SYNONYMS:ANTONYMS;
      const limit=difficulty==='easy'?12:difficulty==='medium'?24:pairs.length,list=pairs.slice(0,limit),fresh=list.filter(([word])=>!used.has(game+'-'+word)),pair=pick(fresh.length?fresh:list,random);
      const reverse=random()<.5,word=pair[reverse?1:0],answer=pair[reverse?0:1];
      q={key:game+'-'+pair[0],prompt:game==='synonyms'?'Eş anlamlı sözcüğü bul.':'Zıt anlamlı sözcüğü bul.',stem:word,answer,explanation:pair[0]+(game==='synonyms'?' ≈ ':' ↔ ')+pair[1],options:choices(answer,pairs.flat().filter(v=>v!==word),random)};
    }
    return q;
  }
  const MELODY=Object.freeze({title:'Neşeye Övgü',notes:Object.freeze([1,1,2,3,3,2,1,0]),beats:Object.freeze([1,1,1,1,1,1,1,2]),names:Object.freeze(['Re','Mi','Fa','Sol'])});
  const SEA_CREATURES=['clown','tang','turtle','ray','seahorse','yellowtang','mandarin','puffer','octopus','jellyfish','dolphin','butterfly'];
  const safeImage=value=>/^\/assets\/akvaryum\/canlilar\/(?:web-v1\/)?[a-z0-9_-]+\.(?:webp|png|svg)$/.test(value||'')?value:'/assets/akvaryum/canlilar/web-v1/palyaco-baligi.webp';
  function profile(value={},index=0){return {id:String(value.id||'guest-'+index).slice(0,100),name:String(value.name||'Oyuncu '+(index+1)).trim().slice(0,80),image:safeImage(value.image)};}
  function createLeaderboard({storage,key='kemal_reef_games_v1'}={}){
    let entries=[];try{const value=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(value))entries=value.slice(0,120).filter(e=>e&&typeof e.bucket==='string'&&e.bucket.length<100&&typeof e.id==='string'&&Number.isSafeInteger(e.score)&&e.score>0&&e.score<1000000).map(e=>({...profile(e),bucket:e.bucket,score:e.score}));}catch(e){}
    function list(bucket){return entries.filter(e=>e.bucket===bucket).sort((a,b)=>b.score-a.score).slice(0,5).map(e=>({...e}));}
    function record(bucket,players,scores){
      const board=list(bucket);players.forEach((p,i)=>{const score=scores[i];if(!Number.isSafeInteger(score)||score<=0)return;const prior=board.find(e=>e.id===p.id);if(prior){if(score>prior.score)Object.assign(prior,profile(p),{score});}else board.push({...profile(p),score,bucket});});
      entries=[...entries.filter(e=>e.bucket!==bucket),...board.sort((a,b)=>b.score-a.score).slice(0,5)].slice(-120);let saved=true;try{if(storage)storage.setItem(key,JSON.stringify(entries));else saved=false;}catch(e){saved=false;}return saved;
    }
    return {list,record};
  }
  function createSession({now=()=>performance.now(),random=Math.random}={}){
    let phase='menu',game='multiply',settings={},question=null,scores=[0,0],corrects=[0,0],wrongs=[0,0],token=0,deadline=0,remaining=0,feedback='',pending=false,used=new Set(),mistakes=new Set(),boards=[],deck=[],activities=[],ready=false,pattern=[],target=0,slots=[],round=0,surfTime=0,lastStep=0,shellMoves=[],cleanupIndex=0,endReason='',failedPlayer=-1;
    function time(){return settings.duration===0?Infinity:phase==='playing'?Math.max(0,deadline-now()):remaining;}
    function state(){return {phase,game,settings:{...settings},question:question?{...question,options:question.options.map(o=>({...o})),parts:question.parts?[...question.parts]:undefined}:null,score:scores[0],correct:corrects[0],wrong:wrongs[0],scores:[...scores],corrects:[...corrects],wrongs:[...wrongs],token,remaining:time(),feedback,pending,mistakes:[...mistakes],boards:boards.map(b=>({open:[...b.open],matched:[...b.matched],busy:b.busy})),deck:[...deck],activities:activities.map(a=>({...a,cleared:[...a.cleared],obstacles:a.obstacles.map(o=>({...o})),bubbles:a.bubbles.map(b=>({...b}))})),ready,pattern:[...pattern],target,slots:[...slots],round,shellMoves:shellMoves.map(m=>({...m,pair:[...m.pair],from:[...m.from],to:[...m.to]})),endReason,failedPlayer};}
    function next(){question=generate(game,{...settings,used,random});used.add(question.key);token++;pending=false;mistakes=new Set();feedback='';}
    function finish(reason='finished',player=-1){if(phase!=='playing'&&phase!=='paused')return false;remaining=time();endReason=reason;failedPlayer=player;phase='result';pending=false;return true;}
    function tick(){if(phase==='playing'&&time()===0)finish('time');return state();}
    function start(id,options={}){
      if(!CATALOG.some(g=>g.id===id))return false;
      settings={level:levels.includes(options.level)?options.level:'easy',mode:options.mode==='build'?'build':'count',duration:[0,60,90,120].includes(Number(options.duration))?Number(options.duration):60,grade:[1,2,3,4].includes(Number(options.grade))?Number(options.grade):undefined,roundingStep:Number(options.roundingStep)===100?100:10,duel:options.duel===true};
      if(settings.duel&&settings.duration===0)settings.duration=60;
      game=id;endReason='';failedPlayer=-1;shellMoves=[];scores=[0,0];corrects=[0,0];wrongs=[0,0];used=new Set();remaining=settings.duration*1000;deadline=now()+remaining;phase='playing';question=null;boards=[];deck=[];activities=[];token++;pending=false;mistakes=new Set();feedback='';
      if(game==='memory'){deck=shuffle(SEA_CREATURES.flatMap(id=>[id,id]),random);boards=Array.from({length:settings.duel?2:1},()=>({open:[],matched:[],busy:false}));}else if(['cleanup','shells','surf','lights'].includes(game)){round=0;surfTime=0;lastStep=now();newActivity();}else next();return true;
    }
    const validPlayer=p=>Number.isInteger(p)&&p>=0&&p<(settings.duel?2:1);
    function answer(id,expectedToken,player=0){
      tick();if(!question||game==='memory'||!validPlayer(player)||phase!=='playing'||pending||expectedToken!==token||mistakes.has(player+':'+id))return {status:'ignored'};
      const option=question.options.find(o=>o.id===id);if(!option)return {status:'ignored'};
      if(option.value!==question.answer){mistakes.add(player+':'+id);wrongs[player]++;feedback='Bir daha düşün. Başka bir baloncuğu dene.';return {status:'wrong'};}
      pending=true;const part=question.parts&&question.step<question.parts.length-1;
      if(part){feedback=question.parts.slice(0,question.step+1).join(' • ')+' · Sıradaki heceyi bul.';return {status:'part',player};}
      scores[player]+=10;corrects[player]++;feedback=question.explanation;return {status:'correct',player};
    }
    function flip(index,expectedToken,player=0){
      tick();if(game!=='memory'||!validPlayer(player)||phase!=='playing'||expectedToken!==token||!Number.isInteger(index)||index<0||index>=24)return {status:'ignored'};
      const board=boards[player];if(board.busy||board.matched.includes(index)||board.open.includes(index))return {status:'ignored'};board.open.push(index);
      if(board.open.length===1)return {status:'reveal'};
      board.busy=true;const match=deck[board.open[0]]===deck[board.open[1]];if(match){scores[player]+=10;corrects[player]++;}else wrongs[player]++;
      return {status:match?'match':'mismatch',player,indices:[...board.open]};
    }
    function resolve(player=0){if(game!=='memory'||!validPlayer(player)||phase!=='playing')return false;const b=boards[player];if(!b.busy)return false;if(deck[b.open[0]]===deck[b.open[1]])b.matched.push(...b.open);b.open=[];b.busy=false;if(b.matched.length===24)finish();return true;}
    function advance(){
      tick();if(phase!=='playing'||!pending||game==='memory')return false;if(game==='lights'&&pattern.length===MELODY.notes.length){finish('melody-complete');return false;}if(['lights','shells'].includes(game)){newActivity();return true;}
      if(question.parts&&question.step<question.parts.length-1){question.step++;question.answer=question.parts[question.step];question.options=choices(question.answer,question.pool,random);token++;pending=false;mistakes=new Set();feedback='';}
      else next();return true;
    }
    function cleanupBubble(index,progress=0){
      const protectedLife=index%3===1,type=protectedLife?(index%2?'fish':'coral'):['bottle','can','bag','cup'][index%4];
      return {id:index,type,protectedLife,lane:index%(settings.duel?3:4),progress,speed:.072+(index%3)*.009,sway:index*.91,popped:false,protected:false,poppedAt:0};
    }
    function newActivity(){
      token++;pending=false;mistakes=new Set();feedback='';ready=false;round++;
      if(game==='lights')pattern=MELODY.notes.slice(0,Math.min(MELODY.notes.length,round+1));
      if(game==='shells'){
        target=Math.floor(random()*3);slots=[0,1,2];shellMoves=[];let previous='';
        const count=Math.min(8,3+Math.floor((round-1)/2)),base=Math.max(230,680-(round-1)*52);
        for(let i=0;i<count;i++){
          const options=[[0,1],[1,2],[0,2]].filter(pair=>pair.join('')!==previous),pair=pick(options,random),from=[...slots];previous=pair.join('');
          [slots[pair[0]],slots[pair[1]]]=[slots[pair[1]],slots[pair[0]]];shellMoves.push({pair:[...pair],from,to:[...slots],duration:Math.max(190,Math.round(base*(1-i*.035)))});
        }
      }
      activities=Array.from({length:settings.duel?2:1},()=>({progress:0,cleared:[],y:.5,holding:false,obstacles:[],stun:0,bubbles:[],missed:0}));
      if(game==='cleanup'){cleanupIndex=6;activities.forEach(a=>a.bubbles=Array.from({length:6},(_,i)=>cleanupBubble(i,.08+i*.13)));}
    }
    function revealReady(expectedToken){if(phase!=='playing'||expectedToken!==token)return false;ready=true;return true;}
    function interact(value,expectedToken,player=0){
      tick();if(phase!=='playing'||!validPlayer(player)||expectedToken!==token||pending)return {status:'ignored'};
      const a=activities[player];if(!a)return {status:'ignored'};
      if(game==='surf'){a.holding=value===true;return {status:'hold'};}
      if(game==='cleanup'){
        const bubble=a.bubbles.find(b=>b.id===value);if(!Number.isInteger(value)||!bubble||bubble.popped||bubble.protected||bubble.progress>1)return {status:'ignored'};
        if(bubble.protectedLife){bubble.protected=true;wrongs[player]++;feedback=bubble.type==='fish'?'Bu bir balık. Deniz canlılarını koruyalım.':'Mercanlar denizin canlılarıdır. Onlara dokunma.';return {status:'protected',player};}
        bubble.popped=true;bubble.poppedAt=surfTime;a.cleared.push(value);if(a.cleared.length>100)a.cleared.shift();scores[player]+=10;corrects[player]++;return {status:'clean',player};
      }
      if(!ready||!Number.isInteger(value))return {status:'ignored'};
      if(game==='lights'){
        if(value<0||value>3)return {status:'ignored'};
        if(value!==pattern[a.progress]){wrongs[player]++;feedback='Yanlış nota. Melodiyi yeniden deneyebilirsin.';finish('wrong-note',player);return {status:'wrong',terminal:true,player};}
        a.progress++;if(a.progress<pattern.length)return {status:'part'};
      }
      else if(game==='shells'){if(value<0||value>2||mistakes.has(player+':'+value))return {status:'ignored'};if(value!==target){mistakes.add(player+':'+value);wrongs[player]++;return {status:'wrong'};}}
      else return {status:'ignored'};
      scores[player]+=10;corrects[player]++;pending=true;return {status:'correct',player};
    }
    function step(){
      tick();if(phase!=='playing'||!['surf','cleanup'].includes(game))return;const stamp=now(),dt=Math.min(.1,Math.max(0,(stamp-lastStep)/1000));lastStep=stamp;const previousTime=surfTime;surfTime+=dt;
      if(game==='cleanup'){
        activities.forEach(a=>{a.bubbles.forEach(b=>b.progress+=b.speed*dt);a.bubbles=a.bubbles.filter(b=>{if(b.popped)return surfTime-b.poppedAt<.28;if(b.progress>1.06){if(!b.protectedLife)a.missed++;return false;}return true;});});
        if(Math.floor(previousTime/1.05)<Math.floor(surfTime/1.05)){const bubble=cleanupBubble(cleanupIndex++);activities.forEach(a=>{if(a.bubbles.length<12)a.bubbles.push({...bubble});});}return;
      }
      const gap=.28+((Math.sin(Math.floor(surfTime/1.7)*2.7)+1)/2)*.44;
      activities.forEach((a,p)=>{a.y=Math.max(.07,Math.min(.93,a.y+(a.holding?-.48:.32)*dt));a.stun=Math.max(0,a.stun-dt);
        if(Math.floor(previousTime/1.7)<Math.floor(surfTime/1.7))a.obstacles.push({x:1.04,gap,hit:false,passed:false});
        a.obstacles.forEach(o=>{o.x-=dt*.27;if(o.x<.24&&o.x>.10&&Math.abs(a.y-o.gap)>.18&&!o.hit){o.hit=true;a.stun=.5;}if(o.x<.1&&!o.passed){o.passed=true;if(!o.hit){scores[p]+=10;corrects[p]++;}}});a.obstacles=a.obstacles.filter(o=>o.x>-.1);
      });
    }
    function pause(){if(phase!=='playing')return false;remaining=time();if(remaining===0){finish();return false;}phase='paused';return true;}
    function resume(){if(phase!=='paused')return false;deadline=now()+remaining;phase='playing';lastStep=now();return true;}
    function menu(){phase='menu';question=null;pending=false;feedback='';boards=[];}
    return {state,start,answer,flip,resolve,advance,interact,revealReady,step,pause,resume,finish,tick,menu};
  }
  function create({root,onOpen=()=>{},onClose=()=>{},sound=()=>{},cancelSound=()=>{},motion=()=>true,now,random,scheduler,storage,creatureImage=()=>safeImage(''),creatureName=id=>id}={}){
    if(!root)throw Error('Baloncuk oyun alanı bulunamadı.');
    const doc=root.ownerDocument,win=doc.defaultView,timers=scheduler||win,session=createSession({now,random});
    let selected='multiply',level='easy',grade=3,roundingStep=100,mode='count',duration=60,duel=false,page=0,stationary=false,soundOn=true,interval=null,advanceTimer=null,burstTimer=null,closed=true,renderedPhase='',opener=null,popCanvas=null,popFrame=null;
    let roster=[],players=[],drawPlayers=null,board=null,savedRound=false,storageOkay=true,extraTimers=new Set(),memoryJobs=new Map(),dragging=new Map(),swipeX=null,lastPointerButton=null,endingVisual=false;
    function play(kind){if(soundOn&&!doc.hidden)try{Promise.resolve(sound(kind)).catch(()=>{});}catch(e){}}
    function later(fn,ms){const id=timers.setTimeout(()=>{extraTimers.delete(id);fn();},ms);extraTimers.add(id);return id;}
    function clearExtra(){extraTimers.forEach(id=>timers.clearTimeout(id));extraTimers.clear();memoryJobs.clear();}
    function rejectFeedback(elements){
      play('wrong');if(stationary||!motion())return;
      elements.filter(Boolean).forEach(el=>{el.classList.remove('game-rejected');void el.offsetWidth;el.classList.add('game-rejected');later(()=>el.classList.remove('game-rejected'),320);});
    }
    function clearTimers(keepSound=false){if(interval!==null)timers.clearInterval(interval);interval=null;if(advanceTimer!==null)timers.clearTimeout(advanceTimer);advanceTimer=null;if(burstTimer!==null)timers.clearTimeout(burstTimer);burstTimer=null;clearExtra();if(!keepSound)cancelSound();}
    function cancelPop(){if(popFrame!==null)win.cancelAnimationFrame?.(popFrame);popFrame=null;popCanvas?.remove();popCanvas=null;}
    function burst(button,event){
      cancelPop();if(stationary||!motion()||!win.requestAnimationFrame)return;
      const area=root.getBoundingClientRect?.(),bounds=(Array.isArray(button)?button:[button]).map(b=>b?.getBoundingClientRect?.()).filter(b=>b?.width);if(!bounds.length||!area?.width)return;
      const canvas=doc.createElement('canvas');let ctx;try{ctx=canvas.getContext('2d');}catch(e){return;}if(!ctx)return;
      const ratio=Math.min(2,win.devicePixelRatio||1),centres=bounds.map(b=>({cx:b.left+b.width/2-area.left,cy:b.top+b.height/2-area.top,r:b.width/2,hit:event?.clientX||event?.clientY?Math.atan2(event.clientY-(b.top+b.height/2),event.clientX-(b.left+b.width/2)):-.7}));
      canvas.id='bubbleGamesPop';canvas.className='reef-pop-canvas';canvas.setAttribute('aria-hidden','true');Object.assign(canvas.style,{left:area.left+'px',top:area.top+'px',width:area.width+'px',height:area.height+'px'});canvas.width=Math.ceil(area.width*ratio);canvas.height=Math.ceil(area.height*ratio);ctx.scale(ratio,ratio);root.after(canvas);popCanvas=canvas;
      const droplets=Array.from({length:22},(_,i)=>({angle:i*Math.PI*2/22+((i*23%17)/17-.5)*.16,speed:90+(i*37%125),size:.9+(i*7%16)/10,stretch:1.1+(i%3)*.35}));let began;
      const frame=stamp=>{
        if(popCanvas!==canvas)return;if(began===undefined)began=stamp;const t=(stamp-began)/1000,p=t/.58;if(p>=1){cancelPop();return;}ctx.clearRect(0,0,area.width,area.height);
        for(const {cx,cy,r,hit} of centres){
          const rimAlpha=Math.max(0,1-t/.31),radius=r*(1+t*.6);
          if(rimAlpha)for(let i=0;i<11;i++){const angle=hit+i*Math.PI*2/11,gap=.025+t*1.5;ctx.beginPath();ctx.arc(cx,cy,radius,angle+gap,angle+Math.max(gap,.49-t*.85));ctx.lineWidth=1.7*(1-t/.4);ctx.strokeStyle='rgba(207,255,255,'+(rimAlpha*.8)+')';ctx.stroke();}
          if(t<.1){const x=cx+Math.cos(hit)*r*.75,y=cy+Math.sin(hit)*r*.75,flash=ctx.createRadialGradient(x,y,0,x,y,r*.45);flash.addColorStop(0,'rgba(243,255,255,'+(.65*(1-t/.1))+')');flash.addColorStop(1,'rgba(205,255,255,0)');ctx.fillStyle=flash;ctx.fillRect(cx-r*1.5,cy-r*1.5,r*3,r*3);}
          for(const d of droplets){const angle=d.angle+hit,distance=r+d.speed*t,x=cx+Math.cos(angle)*distance,y=cy+Math.sin(angle)*distance+95*t*t,alpha=Math.pow(1-p,1.5);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,d.size*(1-p*.4)*d.stretch,d.size*(1-p*.4),0,0,Math.PI*2);ctx.fillStyle='rgba(192,246,255,'+alpha+')';ctx.fill();ctx.beginPath();ctx.arc(-d.size*.3,-d.size*.25,d.size*.35,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+alpha+')';ctx.fill();ctx.restore();}
        }popFrame=win.requestAnimationFrame(frame);
      };popFrame=win.requestAnimationFrame(frame);
    }
    function clock(value){if(!Number.isFinite(value))return '∞';const seconds=Math.ceil(value/1000);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
    function header(){return '<header class="bubble-game-header"><div><span class="bubble-game-eyebrow">RESİF OYUNLARI</span><h2 id="bubbleGameTitle">Baloncuk Avı</h2></div><div class="bubble-game-tools">'+(session.state().phase==='menu'?'<button type="button" class="bubble-settings-trigger" data-game-action="settings">Ayarlar</button>':'')+'<button type="button" data-game-action="sound" aria-pressed="'+soundOn+'" aria-label="Oyun sesi '+(soundOn?'açık':'kapalı')+'">'+(soundOn?'♫':'♩')+'</button><button type="button" data-game-action="close" aria-label="Baloncuk oyunlarını kapat">×</button></div></header>';}
    function avatars(scores=[0,0]){return '<div class="reef-scoreboard">'+players.slice(0,duel?2:1).map((p,i)=>'<div class="bubble-game-player game-player-card" data-player-card="'+i+'"><span class="game-avatar"><img src="'+esc(p.image)+'" alt=""></span><span><strong>'+esc(p.name)+'</strong><small><b data-player-score="'+i+'" '+(i===0?'data-game-score':'')+'>'+scores[i]+'</b> oyun puanı</small></span>'+(duel&&session.state().phase==='playing'&&!['memory','cleanup'].includes(session.state().game)?'<kbd>'+(session.state().game==='surf'?(i===0?'W / Boşluk':'↑'):(i===0?'A S D F':'J K L Ş'))+'</kbd>':'')+'</div>').join('')+'</div>';}
    function settings(){if(page===1)return '<div class="bubble-game-settings"><label>Süre<select data-game-setting="duration">'+[[60,'60 saniye'],[90,'90 saniye'],[120,'120 saniye'],...(!duel?[[0,'Serbest · Süresiz']]:[])].map(([v,t])=>'<option value="'+v+'" '+(duration===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label class="bubble-game-static"><input type="checkbox" data-game-setting="stationary" '+(stationary?'checked':'')+'> Hareketleri azalt</label></div><p class="bubble-game-note">Her yaşta oynanır. Eşini Bul tek oyuncuda tüm çiftler bitene kadar sürer.</p>';return '<div class="bubble-game-settings"><label>Sınıf seviyesi<select data-game-setting="grade">'+[1,2,3,4].map(g=>'<option value="'+g+'" '+(grade===g?'selected':'')+'>'+g+'. sınıf</option>').join('')+'</select></label><label>Yuvarlama<select data-game-setting="roundingStep"><option value="10" '+(roundingStep===10?'selected':'')+'>Onluğa yuvarla</option>'+(grade>=3?'<option value="100" '+(roundingStep===100?'selected':'')+'>Yüzlüğe yuvarla</option>':'')+'</select></label><label>Süre<select data-game-setting="duration">'+[[60,'60 saniye'],[90,'90 saniye'],[120,'120 saniye'],...(!duel?[[0,'Serbest · Süresiz']]:[])].map(([v,label])=>'<option value="'+v+'" '+(duration===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Hece Atölyesi<select data-game-setting="mode"><option value="count" '+(mode==='count'?'selected':'')+'>Hece say</option><option value="build" '+(mode==='build'?'selected':'')+'>Hece birleştir</option></select></label><label>Zorluk<select data-game-setting="level">'+[['easy','Kolay'],['medium','Orta'],['hard','Zor']].map(([v,t])=>'<option value="'+v+'" '+(v===level?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label class="bubble-game-static"><input type="checkbox" data-game-setting="stationary" '+(stationary?'checked':'')+'> Baloncukları sabitle</label></div><p class="bubble-game-note">3–4. sınıf çarpma: 9×9’a kadar. Eşini Bul tek oyuncuda tüm çiftler bitene kadar sürer.</p>';}
    function playerControls(){return '<div class="reef-player-setup"><label>Oyun şekli<select data-game-setting="duel"><option value="solo" '+(!duel?'selected':'')+'>Tek oyuncu</option><option value="duel" '+(duel?'selected':'')+'>İkili karşılaşma</option></select></label>'+players.slice(0,duel?2:1).map((p,i)=>'<label>'+(i+1)+'. oyuncu<select data-game-player="'+i+'">'+roster.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===p.id?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label>').join('')+(drawPlayers?'<button type="button" data-game-action="random-players">'+(duel?'İki öğrenciyi':'Öğrenciyi')+' kurayla seç</button>':'')+'</div>';}
    function bucket(s=session.state()){return [(['lights','cleanup','shells'].includes(s.game)?s.game+'-v2':s.game),s.settings.grade||grade,s.settings.mode,s.settings.roundingStep,s.settings.duel?'duel':'solo',s.settings.duration].join('|');}
    function leaders(s=session.state()){const list=board?.list(bucket(s))||[];return '<section class="reef-leaderboard"><h4>Bu oyunun ilk 5’i <small>Yalnızca bu cihaz · aynı ayarlar</small></h4>'+(list.length?'<ol>'+list.map(p=>'<li><span class="game-avatar"><img src="'+esc(p.image)+'" alt=""></span><strong>'+esc(p.name)+'</strong><b>'+p.score+'</b></li>').join('')+'</ol>':'<p>İlk tamamlanan turla başlayacak.</p>')+'</section>';}
    function renderMenu(){
      root.classList.toggle('reef-duel',duel);root.classList.remove('reef-memory','reef-activity');
      root.innerHTML=header()+'<div class="bubble-menu-scroll">'+playerControls()+avatars()+'<div class="reef-page-nav"><button type="button" data-game-action="page" data-page="0" '+(page===0?'disabled':'')+' aria-label="Önceki beş oyun">‹</button><strong>'+(page===0?'1 / 2 · Öğren ve oyna':'2 / 2 · Dikkat ve eğlence')+'</strong><button type="button" data-game-action="page" data-page="1" '+(page===1?'disabled':'')+' aria-label="Sonraki beş oyun">›</button></div><div class="bubble-game-menu">'+CATALOG.slice(page*5,page*5+5).map((g,i)=>'<button type="button" class="game-orb game-orb-'+g.color+'" data-game-action="start" data-game-id="'+g.id+'" style="--orb-delay:-'+i*1.1+'s" aria-label="'+esc(g.title)+' oyununu başlat"><span class="game-orb-content"><span class="game-orb-symbol" aria-hidden="true">'+g.symbol+'</span><strong>'+g.title+'</strong><small>'+g.caption+'</small></span></button>').join('')+'</div>'+settings()+'</div><p class="bubble-game-note">Oyun puanları davranış puanlarını ve balıkların gelişimini değiştirmez.</p>';
      renderedPhase='menu';updateMotion();layout();
    }
    function pauseMarkup(){return '<div class="bubble-game-pause" hidden><h3>Bir nefeslik mola</h3><p>Süre durdu. Hazır olduğunuzda devam edin.</p><button type="button" data-game-action="resume">Devam et</button></div>';}
    function toolbar(s){return '<div class="bubble-play-toolbar"><button type="button" data-game-action="menu">‹ Oyunlar</button><strong>'+esc(CATALOG.find(g=>g.id===s.game).title)+'</strong><time data-game-clock aria-label="Kalan süre">'+clock(s.remaining)+'</time><button type="button" data-game-action="pause">Duraklat</button><button type="button" data-game-action="finish">Bitir</button></div>'+avatars(s.scores);}
    function feedback(text){return '<p class="bubble-game-feedback" role="status" data-game-feedback>'+text+'</p>';}
    function answers(s,p){return '<section class="reef-player-lane" aria-label="'+esc(players[p].name)+' yanıt alanı"><div class="bubble-answer-water" aria-label="Yanıt baloncukları">'+s.question.options.map((o,i)=>'<button type="button" class="answer-orb '+(/^\d+$/.test(o.value)?'answer-number ':o.value.length>7?'answer-long ':'')+'game-orb game-orb-'+['aqua','peach','lilac','mint'][i]+'" data-game-action="answer" data-player="'+p+'" data-answer-id="'+o.id+'" data-question-token="'+s.token+'" style="--lane:'+i+';--answer-delay:'+i*.1+'s;--answer-duration:'+(12+i*.9)+'s" aria-label="'+(duel?esc(players[p].name)+' · ':'')+'Yanıt: '+esc(o.value)+'"><span class="game-orb-content">'+esc(o.value)+'</span></button>').join('')+'</div></section>';}
    function memoryBoard(s,p){const b=s.boards[p];return '<div class="reef-memory-grid" data-memory-board="'+p+'" aria-label="'+esc(players[p].name)+' eşleştirme alanı">'+s.deck.map((id,i)=>{const matched=b.matched.includes(i),open=b.open.includes(i);return '<button type="button" class="game-orb memory-orb '+(open?'memory-revealed ':'')+(matched?'memory-matched':'')+'" data-game-action="flip" data-index="'+i+'" data-player="'+p+'" data-question-token="'+s.token+'" '+(matched||open||b.busy?'disabled':'')+' aria-label="'+(i+1)+'. baloncuk'+(matched?' eşleşti':open?' açık':' kapalı')+'">'+(open||matched?'<span class="memory-picture"><img src="'+esc(safeImage(creatureImage(id)))+'" alt="'+esc(creatureName(id))+'"></span>':'<span aria-hidden="true">?</span>')+'</button>';}).join('')+'</div>';}
    function activityBoard(s,p){
      const a=s.activities[p];if(s.game==='cleanup')return '<div class="reef-cleanup" data-activity-board="'+p+'" aria-label="Yükselen çöpler ve deniz canlıları"></div>';
      if(s.game==='surf')return '<div class="reef-surf" data-activity-board="'+p+'"><img class="surf-fish" src="'+esc(players[p].image)+'" alt="'+esc(players[p].name)+' balığı"><div class="reef-obstacles"></div><button type="button" class="surf-hold" data-game-action="hold" data-player="'+p+'">Yükselmek için basılı tut</button></div>';
      if(s.game==='shells')return '<div class="reef-shells" data-activity-board="'+p+'">'+[0,1,2].map(i=>'<button type="button" class="reef-shell shell-show" data-game-action="interact" data-value="'+i+'" data-player="'+p+'" data-question-token="'+s.token+'" style="--shell-slot:'+i+'" aria-label="'+(i+1)+'. kabuk" disabled><span class="shell-pearl" '+(s.target!==i?'hidden':'')+'></span><span class="reef-shell-dome" aria-hidden="true">'+shellArt(p+'-'+i)+'</span><small class="shell-number"></small></button>').join('')+'</div>';
      return '<div class="reef-lights" data-activity-board="'+p+'">'+MELODY.names.map((name,i)=>'<button type="button" class="game-orb light-orb light-'+i+'" data-game-action="interact" data-value="'+i+'" data-player="'+p+'" data-question-token="'+s.token+'" aria-label="'+name+' notası" disabled><span class="game-orb-content"><b>'+(i+1)+'</b><small>'+name+'</small></span></button>').join('')+'</div>';
    }
    function shellArt(id){return '<svg viewBox="0 0 160 110" fill="none"><defs><radialGradient id="clam-shade-'+id+'"><stop stop-color="#ffe5d4"/><stop offset=".75" stop-color="#dfa790"/><stop offset="1" stop-color="#956a65"/></radialGradient></defs><path d="M14 82C-4 62 16 42 26 42C16 19 44 10 55 21C54-1 93-3 101 20C117 7 142 24 134 43C155 39 168 65 149 82L88 103Q80 109 72 103Z" fill="url(#clam-shade-'+id+')" stroke="#f9e0ce" stroke-width="2"/><path d="M80 102L26 43M80 102L55 21M80 102L101 20M80 102L134 43M80 102L149 76M80 102L14 76" stroke="#9d746c" stroke-opacity=".48" stroke-width="2.5"/><path d="M29 84Q80 94 132 84" stroke="#fff0d8" stroke-opacity=".7" stroke-width="3"/></svg>';}
    function cleanupContent(b){
      const labels={bottle:'Plastik şişe',can:'Teneke kutu',bag:'Plastik poşet',cup:'Plastik bardak',fish:'Balık · koru',coral:'Mercan · koru'};
      const content=b.type==='fish'?'<img src="'+esc(safeImage(creatureImage('tang'))) +'" alt="">':b.type==='coral'?'<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M42 72V16m0 32L19 30V14m23 48l23-20V24M22 32L9 25m35 5 15-14M64 45l10-5" stroke="#ffb9ac" stroke-width="8" stroke-linecap="round" fill="none"/></svg>':{bottle:'🧴',can:'🥫',bag:'🛍️',cup:'🥤'}[b.type];
      return {label:labels[b.type],html:'<span class="game-orb-content reef-floating-content">'+content+'</span>'};
    }
    function syncCleanup(s){
      s.activities.forEach((a,p)=>{const area=root.querySelector('[data-activity-board="'+p+'"]');if(!area)return;const active=new Set(a.bubbles.map(b=>String(b.id)));area.querySelectorAll('[data-cleanup-id]').forEach(el=>{if(!active.has(el.dataset.cleanupId))el.remove();});
        const height=area.getBoundingClientRect().height||350;
        for(const b of a.bubbles){let el=area.querySelector('[data-cleanup-id="'+b.id+'"]');if(!el){el=doc.createElement('button');const content=cleanupContent(b);el.type='button';el.className='game-orb reef-floating-orb '+(b.protectedLife?'reef-life-orb':'reef-litter-orb');el.dataset.gameAction='cleanup';el.dataset.cleanupId=String(b.id);el.dataset.value=String(b.id);el.dataset.player=String(p);el.dataset.questionToken=String(s.token);el.setAttribute('aria-label',content.label);el.innerHTML=content.html;area.append(el);}
          const lanes=duel?3:4,left=(b.lane+.5)*100/lanes+(motion()&&!stationary?Math.sin(b.progress*8+b.sway)*2:0);el.style.left=left+'%';el.style.bottom=(-85+b.progress*(height+135))+'px';el.disabled=b.popped||b.protected;if(b.popped)el.classList.add('cleanup-popped');if(b.protected)el.classList.add('reef-life-protected');
        }
      });
    }
    function renderQuestion(){
      clearExtra();const s=session.state(),q=s.question,isMemory=s.game==='memory',activity=['cleanup','shells','surf','lights'].includes(s.game);
      root.classList.toggle('reef-memory',isMemory);root.classList.toggle('reef-activity',activity);root.classList.toggle('reef-duel',duel);
      const prompts={memory:'İki baloncuğu aç, aynı deniz dostlarını bul.',cleanup:'Yükselen çöpleri patlat. Balıklara ve mercanlara dokunma.',surf:'Basılı tutunca yüksel, bırakınca alçal. Mercanların arasından geç.',shells:'İnciyi izle. İstiridyeler durunca incinin yerini bul.',lights:MELODY.title+' · Dinle, aynı sırayla çal. Yanlış notada tur biter.'};
      root.innerHTML=header()+toolbar(s)+(q?'<div class="bubble-question"><p>'+esc(q.prompt)+'</p><h3>'+esc(q.stem)+'</h3>'+(q.parts?'<div class="bubble-syllable-steps">'+q.parts.map((part,i)=>'<span class="'+(i<q.step?'done':'')+'">'+(i<q.step?esc(part):'…')+'</span>').join('')+'</div>':'')+'</div>':'<p class="reef-instruction">'+prompts[s.game]+'</p>')+'<div class="reef-play-lanes">'+players.slice(0,duel?2:1).map((p,i)=>isMemory?memoryBoard(s,i):activity?activityBoard(s,i):answers(s,i)).join('')+'</div>'+feedback(duel?'İlk doğru cevap +10 puan. Süre sonunda en yüksek puan kazanır.':'Hazırsan başlayalım!')+pauseMarkup();
      renderedPhase='playing';updateMotion();layout();if(s.game==='cleanup')syncCleanup(s);if(['lights','shells'].includes(s.game))demonstrate();
    }
    function demonstrate(){
      clearExtra();const s=session.state(),token=s.token;if(s.phase!=='playing')return;
      root.querySelectorAll('[data-game-action="interact"]').forEach(b=>b.disabled=true);
      const message=root.querySelector('[data-game-feedback]');if(message)message.textContent=s.game==='lights'?'Önce izle ve dinle…':'İnciyi gözden kaçırma…';
      if(s.game==='lights'){
        let at=400;s.pattern.forEach((note,i)=>{const start=at,beat=520*MELODY.beats[i];later(()=>{root.querySelectorAll('.light-'+note).forEach(b=>b.classList.add('is-lit'));play('tone-'+note);},start);later(()=>root.querySelectorAll('.light-'+note).forEach(b=>b.classList.remove('is-lit')),start+beat*.72);at+=beat;});
        later(()=>{if(session.revealReady(token)){root.querySelectorAll('[data-game-action="interact"]').forEach(b=>b.disabled=false);message.textContent='Şimdi melodiyi sen çal!';}},at+180);
      }else{
        root.querySelectorAll('.reef-shell').forEach(b=>{b.style.animation='none';b.style.setProperty('--shell-slot',b.dataset.value);b.classList.add('shell-show');b.querySelector('.shell-number').textContent='';b.setAttribute('aria-label','Kabuk');b.querySelector('.shell-pearl').hidden=Number(b.dataset.value)!==s.target;});
        later(()=>root.querySelectorAll('.reef-shell').forEach(b=>b.classList.remove('shell-show')),1150);
        let at=1650;
        s.shellMoves.forEach(move=>{const start=at,ms=motion()&&!stationary?move.duration:Math.max(380,move.duration);
          later(()=>{root.querySelectorAll('.reef-shell').forEach(b=>b.querySelector('.shell-pearl').hidden=true);swapShells(move,ms);},start);
          later(()=>{root.querySelectorAll('.reef-shell').forEach(b=>{b.style.animation='none';b.style.setProperty('--shell-slot',move.to[Number(b.dataset.value)]);b.style.zIndex='';});},start+ms);at+=ms+65;
        });
        later(()=>{if(session.revealReady(token)){root.querySelectorAll('.reef-shell').forEach(b=>{const position=s.slots[Number(b.dataset.value)]+1;b.disabled=false;b.querySelector('.shell-number').textContent=position;b.setAttribute('aria-label',position+'. konumdaki kabuk');});message.textContent='İnci hangi kabukta? · '+s.round+'. tur';}},at+100);
      }
    }
    function swapShells(move,duration){
      root.querySelectorAll('.reef-shells').forEach(area=>{const width=area.getBoundingClientRect().width||400;move.pair.forEach((id,index)=>{const el=area.querySelector('[data-value="'+id+'"]');if(!el)return;el.style.setProperty('--shell-slot',move.from[id]);el.style.setProperty('--swap-x',(move.to[id]-move.from[id])*width/3+'px');el.style.setProperty('--swap-y',(index===0?-1:1)*Math.min(42,width*.09)+'px');el.style.setProperty('--swap-tilt',(index===0?-5:5)+'deg');el.style.zIndex=index===0?'3':'2';el.style.animation='none';void el.offsetWidth;el.style.animation=motion()&&!stationary?'reef-shell-swap '+duration+'ms cubic-bezier(.4,0,.25,1) both':'none';if(!motion()||stationary)el.style.setProperty('--shell-slot',move.to[id]);});});
    }
    function renderResult(){
      const s=session.state();if(!savedRound){storageOkay=board?.record(bucket(s),players.slice(0,duel?2:1),s.scores)!==false;savedRound=true;}
      const failed=s.endReason==='wrong-note',complete=s.endReason==='melody-complete';
      const winner=failed?(duel?players[1-s.failedPlayer].name+' kazandı!':'Yanlış nota · Tur tamamlandı'):duel?(s.scores[0]===s.scores[1]?'Dostça bir beraberlik!':players[s.scores[0]>s.scores[1]?0:1].name+' kazandı!'):complete?'Melodiyi tamamladın!':'Güzel bir tur tamamlandı!';
      root.innerHTML=header()+'<div class="bubble-result"><h3 tabindex="-1">'+esc(winner)+'</h3>'+avatars(s.scores)+'<div class="reef-result-orbs">'+players.slice(0,duel?2:1).map((p,i)=>'<div class="game-orb game-orb-gold result-orb"><span class="game-orb-content"><small>'+esc(p.name)+'</small><strong>'+s.scores[i]+'</strong><span>oyun puanı</span></span></div>').join('')+'</div><p>'+s.corrects.slice(0,duel?2:1).join(' / ')+' başarılı adım.</p>'+(failed?'<p class="reef-failure-message">'+esc(players[s.failedPlayer].name)+' yanlış notaya dokundu. Yeniden deneyebilirsin.</p>':'')+leaders(s)+'<p class="bubble-game-note">'+(storageOkay?'En iyi sonuçlar sadece bu cihazda saklanır.':'Tarayıcı kayda izin vermedi; sonuç bu ekranda kalır.')+' Davranış puanlarına eklenmez.</p><div class="bubble-result-actions"><button type="button" data-game-action="again">Aynı oyunu yeniden oyna</button><button type="button" data-game-action="menu">Başka oyun seç</button></div></div>';
      renderedPhase='result';layout();play(failed?'wrong':'finish');root.querySelector('.bubble-result h3')?.focus({preventScroll:true});
    }
    function layout(){
      if(closed)return;const scene=root.parentElement.getBoundingClientRect(),vp=win.visualViewport,h=vp?.height||win.innerHeight||700,w=vp?.width||win.innerWidth||scene.width||900,offset=vp?.offsetTop||0;
      // A tall, bounded play space leaves a clear vertical path for rising answers.
      const width=Math.max(250,Math.min(duel?1080:860,scene.width-20,w-20)),top=offset+10,height=Math.max(210,h-20);
      root.style.setProperty('--game-top',top+'px');root.style.setProperty('--game-left',Math.max(8,(w-width)/2)+'px');root.style.setProperty('--game-width',width+'px');root.style.setProperty('--game-height',height+'px');
      root.querySelectorAll('.bubble-answer-water').forEach(arena=>{const height=arena.getBoundingClientRect().height,bubble=arena.querySelector('.answer-orb')?.getBoundingClientRect().height||75;arena.style.setProperty('--answer-rise',Math.max(0,height-bubble-24-(duel&&w<=800?88:0))+'px');});
    }
    function updateMotion(){root.classList.toggle('bubble-game-still',stationary||!motion());}
    function syncScores(){const s=session.state();root.querySelectorAll('[data-player-score]').forEach(el=>el.textContent=String(s.scores[Number(el.dataset.playerScore)]));}
    function update(){
      if(closed||endingVisual)return;session.step();const s=session.tick();if(s.phase==='result'){clearTimers();cancelPop();if(renderedPhase!=='result')renderResult();return;}
      const time=root.querySelector('[data-game-clock]');if(time)time.textContent=clock(s.remaining);root.classList.toggle('bubble-game-paused',s.phase==='paused');const overlay=root.querySelector('.bubble-game-pause');if(overlay)overlay.hidden=s.phase!=='paused';
      if(s.game==='cleanup'&&s.phase==='playing'){syncCleanup(s);syncScores();}
      if(s.game==='surf'&&s.phase==='playing'){s.activities.forEach((a,p)=>{const area=root.querySelector('[data-activity-board="'+p+'"]');if(!area)return;const fish=area.querySelector('.surf-fish');fish.style.top=a.y*100+'%';fish.classList.toggle('surf-stunned',a.stun>0);area.querySelector('.reef-obstacles').innerHTML=a.obstacles.map(o=>'<i style="left:'+o.x*100+'%;--gap:'+o.gap*100+'%"></i>').join('');});syncScores();}
    }
    function advanceSoon(){if(advanceTimer!==null)timers.clearTimeout(advanceTimer);advanceTimer=timers.setTimeout(()=>{advanceTimer=null;if(!closed&&session.advance()){renderQuestion();root.querySelector('.answer-orb')?.focus({preventScroll:true});}update();},950);}
    function start(id,trigger=null,event=null){
      const launch=()=>{selected=id;endingVisual=false;clearTimers(!!trigger);savedRound=false;session.start(id,{level,grade,roundingStep,mode,duration:id==='memory'&&!duel?0:duration,duel});renderQuestion();interval=timers.setInterval(update,['surf','cleanup'].includes(id)?50:200);root.querySelector('.answer-orb')?.focus({preventScroll:true});if(doc.hidden)pause();};
      if(trigger&&!stationary&&motion()){clearTimers();burst(trigger,event);play('select');const transform=win.getComputedStyle?.(trigger).transform;if(transform)trigger.style.transform=transform;root.querySelectorAll('[data-game-id]').forEach(b=>b.disabled=true);trigger.classList.add('menu-orb-popped');burstTimer=timers.setTimeout(()=>{burstTimer=null;if(!closed)launch();},280);}else{launch();play('select');}
    }
    function pause(){if(session.pause()){if(advanceTimer!==null)timers.clearTimeout(advanceTimer);advanceTimer=null;clearExtra();cancelSound();cancelPop();dragging.forEach(d=>{if(d.el)d.el.style.transform='';});dragging.clear();update();root.querySelector('[data-game-action="resume"]')?.focus({preventScroll:true});}}
    function resume(){if(!session.resume())return;const s=session.state();if(s.pending)advanceSoon();if(s.game==='memory')s.boards.forEach((b,p)=>{if(b.busy)resolveMemory(p);});if(['lights','shells'].includes(s.game)&&!s.pending)demonstrate();for(let p=0;p<2;p++)session.interact(false,s.token,p);update();}
    function close(){if(closed)return;endingVisual=false;clearTimers();cancelPop();session.menu();closed=true;dragging.clear();root.parentElement.classList.remove('bubble-game-open');root.hidden=true;root.innerHTML='';root.classList.remove('bubble-game-paused','bubble-game-burst','reef-duel','reef-memory','reef-activity');onClose();opener?.focus?.({preventScroll:true});}
    function open(trigger,options={}){
      if(!closed)close();opener=trigger||doc.activeElement;roster=(options.players||[]).slice(0,60).map(profile);if(!roster.length)roster=[profile({name:options.playerName||'Deniz dostu'})];if(roster.length===1)roster.push(profile({id:'guest-local',name:'Misafir oyuncu'},1));
      players=[roster.find(p=>p.id===options.playerIds?.[0])||roster[0],roster.find(p=>p.id===options.playerIds?.[1])||roster[1]];duel=options.duel===true;drawPlayers=options.drawPlayers||null;board=createLeaderboard({storage,key:'kemal_reef_games_v1_'+String(options.scope||'local').slice(0,120)});
      onOpen();closed=false;root.hidden=false;root.parentElement.classList.add('bubble-game-open');session.menu();renderMenu();root.querySelector('[data-game-id]')?.focus({preventScroll:true});
    }
    function menu(){endingVisual=false;clearTimers();cancelPop();session.menu();root.classList.remove('bubble-game-paused');renderMenu();root.querySelector('[data-game-id]')?.focus({preventScroll:true});}
    function resolveMemory(p){const id=later(()=>{memoryJobs.delete(p);if(session.resolve(p)){const s=session.state(),old=root.querySelector('[data-memory-board="'+p+'"]');if(old)old.outerHTML=memoryBoard(s,p);}update();},850);memoryJobs.set(p,id);}
    function answer(button,event){
      const p=Number(button.dataset.player||0),result=session.answer(button.dataset.answerId,Number(button.dataset.questionToken),p);if(result.status==='ignored'){update();return;}
      root.querySelector('[data-game-feedback]').textContent=(duel&&result.status!=='wrong'?players[p].name+' · ':'')+session.state().feedback;
      if(result.status==='wrong'){button.classList.add('answer-retry');button.disabled=true;rejectFeedback([button]);}
      else{burst(button,event);const transform=win.getComputedStyle?.(button).transform;if(transform)button.style.transform=transform;button.classList.add('answer-popped');root.querySelectorAll('.answer-orb').forEach(b=>b.disabled=true);syncScores();play('correct');advanceSoon();}
    }
    function action(event){
      const button=event.target.closest('[data-game-action]');if(!button||button.disabled||!root.contains(button))return;const action=button.dataset.gameAction,p=Number(button.dataset.player||0),s=session.state();if(endingVisual&&action!=='close')return;
      if(action==='answer'){answer(button,event);return;}
      if(action==='flip'){const result=session.flip(Number(button.dataset.index),Number(button.dataset.questionToken),p);if(result.status==='ignored'){update();return;}const old=root.querySelector('[data-memory-board="'+p+'"]');old.outerHTML=memoryBoard(session.state(),p);if(result.status==='match'){const pair=result.indices.map(i=>root.querySelector('[data-memory-board="'+p+'"] [data-index="'+i+'"]'));burst(pair,event);pair.forEach(b=>b.classList.add('memory-popped'));play('correct');syncScores();}if(result.status==='mismatch'){rejectFeedback(result.indices.map(i=>root.querySelector('[data-memory-board="'+p+'"] [data-index="'+i+'"]')));root.querySelector('[data-game-feedback]').textContent='Bu ikisi eş değil. Yeniden dene.';}if(['match','mismatch'].includes(result.status))resolveMemory(p);return;}
      if(action==='cleanup'){
        const result=session.interact(Number(button.dataset.value),Number(button.dataset.questionToken),p);if(result.status==='ignored'){update();return;}
        if(result.status==='clean'){burst(button,event);button.classList.add('cleanup-popped');button.disabled=true;play('correct');syncScores();root.querySelector('[data-game-feedback]').textContent='Temiz bir deniz için +10 oyun puanı!';}
        else if(result.status==='protected'){button.disabled=true;button.classList.add('reef-life-protected');rejectFeedback([button]);root.querySelector('[data-game-feedback]').textContent=session.state().feedback;}return;
      }
      if(action==='interact'){
        const value=Number(button.dataset.value),result=session.interact(value,Number(button.dataset.questionToken),p);if(result.status==='ignored'){update();return;}
        if(s.game==='lights'&&result.terminal){
          clearTimers();endingVisual=true;const bubbles=[...root.querySelectorAll('.light-orb')];burst(bubbles,event);bubbles.forEach(b=>{b.disabled=true;b.classList.add('light-popped');});play('correct');root.querySelector('[data-game-feedback]').textContent='Yanlış nota. Tur sona erdi.';later(()=>{endingVisual=false;update();},950);return;
        }
        if(s.game==='lights'){button.classList.add('is-lit');play('tone-'+value);later(()=>button.classList.remove('is-lit'),300);}
        if(result.status==='correct'){
          if(s.game!=='lights'){button.classList.add('shell-show');button.querySelector('.shell-pearl').hidden=false;play('correct');}
          syncScores();root.querySelectorAll('[data-game-action="interact"]').forEach(b=>b.disabled=true);root.querySelector('[data-game-feedback]').textContent=players[p].name+' · +10 oyun puanı';advanceSoon();
        }else if(result.status==='wrong'){rejectFeedback([button]);root.querySelector('[data-game-feedback]').textContent='Yeniden dene.';if(s.game==='shells')button.disabled=true;}return;
      }
      if(action==='settings'){root.querySelector('.bubble-game-settings')?.scrollIntoView?.({block:'end',behavior:motion()?'smooth':'auto'});return;}
      if(action==='close')close();else if(action==='start')start(button.dataset.gameId,button,event);else if(action==='again')start(selected);else if(action==='menu')menu();else if(action==='pause')pause();else if(action==='resume')resume();else if(action==='finish'){session.finish();update();}
      else if(action==='page'){page=Number(button.dataset.page);renderMenu();}
      else if(action==='random-players'){const ids=drawPlayers?.(duel?2:1)||[];ids.forEach((id,i)=>{const found=roster.find(p=>p.id===id);if(found)players[i]=found;});renderMenu();}
      else if(action==='sound'){soundOn=!soundOn;if(!soundOn)cancelSound();button.setAttribute('aria-pressed',String(soundOn));button.setAttribute('aria-label','Oyun sesi '+(soundOn?'açık':'kapalı'));button.textContent=soundOn?'♫':'♩';}
    }
    root.addEventListener('click',event=>{if(event.target.closest('[data-game-action="hold"]'))return;const button=event.target.closest('[data-game-action]');if(event.detail!==0&&button===lastPointerButton){lastPointerButton=null;return;}lastPointerButton=null;action(event);});
    root.addEventListener('change',event=>{const input=event.target,key=input.dataset.gameSetting;
      if(input.dataset.gamePlayer!==undefined){const p=Number(input.dataset.gamePlayer),found=roster.find(s=>s.id===input.value);if(found){players[p]=found;if(players[0].id===players[1].id)players[1-p]=roster.find(s=>s.id!==found.id);}renderMenu();return;}
      if(key==='grade'){grade=Number(input.value);if(grade<3)roundingStep=10;renderMenu();}else if(key==='duel'){duel=input.value==='duel';if(duel&&duration===0)duration=60;renderMenu();}else if(key==='roundingStep')roundingStep=Number(input.value);else if(key==='level')level=levels.includes(input.value)?input.value:'easy';else if(key==='mode')mode=input.value==='build'?'build':'count';else if(key==='duration')duration=[0,60,90,120].includes(Number(input.value))?Number(input.value):60;else if(key==='stationary'){stationary=input.checked;updateMotion();}
    });
    root.addEventListener('pointerdown',event=>{
      const hold=event.target.closest('[data-game-action="hold"]');
      if(hold){event.preventDefault();session.interact(true,session.state().token,Number(hold.dataset.player));root.setPointerCapture?.(event.pointerId);dragging.set(event.pointerId,{hold:Number(hold.dataset.player)});}
      else if(event.target.closest('[data-game-action="answer"],[data-game-action="interact"],[data-game-action="cleanup"]')){event.preventDefault();lastPointerButton=event.target.closest('[data-game-action]');action(event);}
      else if(session.state().phase==='menu')swipeX=event.clientX;
    });
    function pointerEnd(event){const drag=dragging.get(event.pointerId);dragging.delete(event.pointerId);if(drag?.hold!==undefined)session.interact(false,session.state().token,drag.hold);if(swipeX!==null&&session.state().phase==='menu'){const delta=event.clientX-swipeX;swipeX=null;if(Math.abs(delta)>70){page=delta<0?1:0;renderMenu();}}}
    root.addEventListener('pointerup',pointerEnd);root.addEventListener('pointercancel',pointerEnd);
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}if(['INPUT','SELECT'].includes(event.target.tagName)||session.state().phase!=='playing')return;
      const s=session.state(),key=event.key.toLocaleLowerCase('tr'),left='asdf'.indexOf(key),right='jklş'.indexOf(key),p=duel&&right>=0?1:0,index=duel?(p?right:left):/^[1-4]$/.test(key)?Number(key)-1:-1;
      if(s.game==='surf'&&(key===' '||key==='w'||key==='arrowup')){event.preventDefault();session.interact(true,s.token,duel&&key==='arrowup'?1:0);return;}
      if(index>=0){const area=root.querySelectorAll('.reef-player-lane,[data-activity-board]')[p],buttons=area?[...area.querySelectorAll('.answer-orb,[data-game-action="interact"]')]:[],button=(s.game==='shells'?buttons.sort((a,b)=>s.slots[Number(a.dataset.value)]-s.slots[Number(b.dataset.value)]):buttons)[index];if(button&&!button.disabled){event.preventDefault();button.click();}}
    });
    const keyup=event=>{if(session.state().game==='surf'){const key=event.key.toLocaleLowerCase('tr');if([' ','w','arrowup'].includes(key))session.interact(false,session.state().token,duel&&key==='arrowup'?1:0);}};
    const hidden=()=>{if(doc.hidden){if(endingVisual){endingVisual=false;clearTimers();cancelPop();update();}else pause();}};doc.addEventListener('visibilitychange',hidden);win.addEventListener('keyup',keyup);win.addEventListener('resize',layout);win.visualViewport?.addEventListener('resize',layout);win.addEventListener('scroll',layout,{passive:true});win.addEventListener('pagehide',close);
    function dispose(){close();doc.removeEventListener('visibilitychange',hidden);win.removeEventListener('keyup',keyup);win.removeEventListener('resize',layout);win.visualViewport?.removeEventListener('resize',layout);win.removeEventListener('scroll',layout);win.removeEventListener('pagehide',close);}
    return {open,close,pause,layout,updateMotion,isOpen:()=>!closed,dispose};
  }
  return {CATALOG,MELODY,WORDS,SYNONYMS,ANTONYMS,SEA_CREATURES,generate,createSession,createLeaderboard,create};
});
