/* Onluk Basket: özgün, bağımsız dokunmatik sahalar; dış oyun kodu/varlığı içermez. */
(function() {
  'use strict';
  const R = window.OnlukBasketRules;
  const $ = id => document.getElementById(id);
  const colors = ['#cf5b32','#247baf','#7351bc'];
  let players = [], questions = [], settings, active = false, paused = false, sound = true;
  let remaining = 0, previous = 0, audio, returnFocus;
  const backgroundInert = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function tone(ok) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(()=>{});
      (ok ? [523.25,659.25,783.99] : [294,247]).forEach((freq,i)=>{
        const osc = audio.createOscillator(), gain = audio.createGain();
        const t = audio.currentTime + i*.095;
        osc.type = ok ? 'sine' : 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(.07,t+.015);
        gain.gain.exponentialRampToValueAtTime(.001,t+.22);
        osc.connect(gain); gain.connect(audio.destination); osc.start(t); osc.stop(t+.23);
      });
    } catch (_) { /* Sessiz tarayıcılarda oyun devam eder. */ }
  }
  function cancelDrag(p) {
    if (p.pointer !== null && p.ball.hasPointerCapture(p.pointer)) p.ball.releasePointerCapture(p.pointer);
    p.pointer = null; p.ball.style.translate = ''; p.ball.style.scale = '';
  }
  function select(p,index) {
    if (p.busy || p.done || paused || !active || (settings.seconds && remaining<=0)) return;
    p.selected = index;
    [...p.answers.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    const a = p.answers.children[index].getBoundingClientRect(), c=p.court.getBoundingClientRect();
    // Üç dar dikey sahada top ayrı sol şeritte kalır; sayı kartını kapatmaz.
    p.ball.style.left = settings.count===3 && matchMedia('(orientation: portrait) and (max-width:800px)').matches ? '' : (a.left+a.width/2-c.left)+'px';
    p.feedback.textContent = p.choices[index]+' seçildi. Topu geri çekip bırakabilirsin.';
  }
  function blocks(q) {
    const b = el('div','ob-blocks'), rods=el('div','ob-rods'), units=el('div','ob-units');
    b.setAttribute('role','img'); b.setAttribute('aria-label',q.tens+' onluk çubuğu ve '+q.units+' birlik küpü');
    for(let t=0;t<q.tens;t++) {
      const rod=el('span','ob-rod'); rod.setAttribute('aria-hidden','true');
      for(let u=0;u<10;u++) rod.append(el('i'));
      rods.append(rod);
    }
    units.setAttribute('aria-hidden','true');
    for(let u=0;u<q.units;u++) units.append(el('i'));
    b.append(rods, q.units ? units : el('span','ob-zero','0 birlik'));
    return b;
  }
  function question(p) {
    p.question = questions[p.index % questions.length];
    p.choices = R.options(p.question.number,settings.max);
    p.busy=false; p.selected=null; p.wrongOnQuestion=0;
    p.prompt.replaceChildren();
    p.prompt.classList.toggle('ob-block-question',p.question.mode==='blocks');
    const q=p.question, small=el('small','',q.mode==='blocks'?'ÇUBUKLARI VE KÜPLERİ SAY':'HANGİ SAYI?');
    const text=el('div','ob-question');
    if(q.mode==='place') {
      text.append(el('span','ob-tens-number',q.tens+' onluk'),document.createTextNode(' + '),el('span','ob-unit-number',q.units+' birlik'));
    } else if(q.mode==='reading') text.textContent=R.read(q.number);
    else text.textContent='Bu model hangi sayı?';
    p.prompt.append(small,text);
    if(q.mode==='blocks') p.prompt.append(blocks(q));
    p.answers.replaceChildren();
    p.choices.forEach((n,i)=>{
      const b=el('button','ob-answer',n); b.type='button'; b.setAttribute('aria-pressed','false');
      b.setAttribute('aria-label',n+' ile atış yap');
      // Her seçenek aynı davranır: doğru/yanlış fark etmeksizin tek dokunuşla atış.
      // Sürükleme ve ok tuşları yalnızca nişan alır; onların bırakma akışı ayrı kalır.
      b.addEventListener('click',()=>{select(p,i);shootBall(p);});
      p.answers.append(b);
    });
    p.ball.disabled=false; p.ball.style.left=''; p.ball.style.translate='';
    p.feedback.textContent='Sayıya dokun, top otomatik atılsın!';
    p.progress.textContent=settings.seconds ? p.solved+' basket' : p.solved+' / 10';
  }
  function makePlayer(name,i) {
    const lane=el('section','ob-lane'); lane.style.setProperty('--team',colors[i]); lane.setAttribute('aria-label',name+' sahası');
    const head=el('header','ob-player'), score=el('span','ob-score','0 puan'), progress=el('span','ob-progress','0 / 10');
    head.append(el('strong','',name),progress,score);
    const court=el('div','ob-court'), crowd=el('div','ob-crowd'), prompt=el('div','ob-prompt');
    const hoop=el('div','ob-hoop'); hoop.setAttribute('aria-hidden','true');
    hoop.append(el('div','ob-backboard'),el('div','ob-net'),el('div','ob-rim'));
    crowd.setAttribute('aria-hidden','true');
    const answers=el('div','ob-answers'); answers.setAttribute('role','group'); answers.setAttribute('aria-label','Sayı seçenekleri');
    const ball=el('button','ob-ball'); ball.type='button'; ball.setAttribute('aria-label','Top: sayı seçmek için ok tuşları, atmak için boşluk. Dokunmatik: sağa sola taşı, aşağı çek ve bırak.');
    court.append(crowd,prompt,hoop,answers,ball);
    const controls=el('footer','ob-controls'), feedback=el('p','ob-feedback');
    feedback.setAttribute('role','status'); feedback.setAttribute('aria-live','polite');
    controls.append(feedback); lane.append(head,court,controls); $('ob-courts').append(lane);
    const p={name,lane,court,prompt,hoop,answers,ball,feedback,scoreEl:score,progress,
      score:0,solved:0,mistakes:0,attempts:0,streak:0,index:0,done:false,busy:false,pointer:null,selected:null,wrongOnQuestion:0,animation:null};
    ball.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault(); select(p,((p.selected ?? (e.key==='ArrowRight'?-1:0))+(e.key==='ArrowRight'?1:3))%4);
      } else if(e.key===' ' || e.key==='Enter') { e.preventDefault(); shootBall(p); }
    });
    ball.addEventListener('pointerdown',e=>{
      if(p.pointer!==null || p.busy || p.done || paused || !active || (e.pointerType==='mouse' && e.button!==0)) return;
      e.preventDefault(); p.pointer=e.pointerId; p.startY=e.clientY; p.pull=0;
      ball.setPointerCapture(e.pointerId);
    });
    ball.addEventListener('pointermove',e=>{
      if(e.pointerId!==p.pointer) return;
      const rects=[...answers.children].map(b=>b.getBoundingClientRect());
      let nearest=0;
      rects.forEach((r,j)=>{if(Math.abs(r.left+r.width/2-e.clientX)<Math.abs(rects[nearest].left+rects[nearest].width/2-e.clientX))nearest=j;});
      if(nearest!==p.selected) select(p,nearest);
      p.pull=Math.max(0,e.clientY-p.startY);
      ball.style.translate='0 '+Math.min(22,p.pull*.45)+'px'; ball.style.scale=String(1+Math.min(.12,p.pull/600));
    });
    ball.addEventListener('pointerup',e=>{
      if(e.pointerId!==p.pointer) return;
      const launch=p.pull>=12 && p.selected!==null;
      cancelDrag(p); if(launch) shootBall(p);
    });
    ball.addEventListener('pointercancel',()=>cancelDrag(p));
    ball.addEventListener('lostpointercapture',()=>{p.pointer=null;ball.style.translate='';ball.style.scale='';});
    question(p); return p;
  }
  function shootBall(p) {
    if(!active || paused || p.done || p.busy || p.selected===null || (settings.seconds && remaining<=0)) return;
    cancelDrag(p);
    Object.assign(p,R.answer(p,p.choices[p.selected]));
    p.phase='flight'; p.wait=reduced.matches?120:850;
    p.ball.disabled=true;
    [...p.answers.children].forEach(b=>b.disabled=true);
    p.feedback.textContent='Top havada…';
    const b=p.ball.getBoundingClientRect(), h=p.hoop.getBoundingClientRect();
    const dx=h.left+h.width/2-b.left-b.width/2, dy=h.top+35-b.top-b.height/2;
    if(!reduced.matches) p.animation=p.ball.animate([
      {transform:'translateX(-50%) translate(0,0) scale(1)'},
      {transform:`translateX(-50%) translate(${dx*.5}px,${dy-90}px) scale(.8)`,offset:.5},
      {transform:`translateX(-50%) translate(${dx}px,${dy}px) scale(.48)`,offset:.85},
      {transform:`translateX(-50%) translate(${dx+(p.correct?0:65)}px,${dy+(p.correct?65:25)}px) scale(.5)`,opacity:p.correct?.1:1}
    ],{duration:p.wait,easing:'ease-in-out',fill:'forwards'});
  }
  function landed(p) {
    p.phase='feedback';p.wait=p.correct?900:1800;
    p.scoreEl.textContent=p.score+' puan';
    p.progress.textContent=settings.seconds?p.solved+' basket':p.solved+' / 10';
    p.ball.classList.toggle('hot',p.streak>=3);
    tone(p.correct);
    if(p.correct) {
      p.hoop.classList.add('scored');
      p.feedback.textContent=(p.streak>=3?'Alev serisi! ':'Basket! ')+p.question.tens+' onluk + '+p.question.units+' birlik = '+p.question.number;
    } else {
      p.wrongOnQuestion++;
      p.answers.children[p.selected].classList.add('ob-retry-wrong');
      const q=p.question;
      p.feedback.textContent=q.mode==='reading'
        ? 'Tekrar dene: “'+R.read(q.number)+'” sayısında '+q.tens+' onluk var. Birlik basamağına dikkat et.'
        : 'Tekrar dene: onluklar '+(q.tens*10)+', birlikler '+q.units+' eder. İkisini birleştir.';
    }
  }
  function afterFeedback(p) {
    p.animation?.cancel();p.animation=null;p.hoop.classList.remove('scored');
    if(p.correct) {
      p.index++;
      if(!settings.seconds && p.solved>=10) {
        p.done=true;p.busy=false;
        const done=el('div','ob-lane-finished');done.append(el('b','','★ 10 basket!'),el('p','','Harika çalıştın. Arkadaşlarını bekleyebilirsin.'));p.lane.append(done);
      } else question(p);
    } else {
      p.busy=false; p.ball.disabled=false; p.selected=null;p.ball.style.left='';
      [...p.answers.children].forEach(b=>{b.disabled=false;b.setAttribute('aria-pressed','false');b.classList.remove('ob-retry-wrong');});
    }
    if(players.every(x=>x.done)) finish();
  }
  function updateClock() {
    $('ob-clock').textContent=settings.seconds?Math.ceil(remaining/1000)+' sn':'10 soru';
    $('ob-clock').classList.toggle('urgent',!!settings.seconds && remaining<=10000);
  }
  function tick(now) {
    const dt=previous ? now-previous : 0; previous=now;
    if(active && !paused) {
      if(settings.seconds) { remaining=Math.max(0,remaining-dt);updateClock(); }
      for(const p of players) if(p.busy) {p.wait-=dt;if(p.wait<=0){if(p.phase==='flight')landed(p);else afterFeedback(p);}}
      // Süre dolmadan bırakılan atış tamamlanır; yeni atış kabul edilmez.
      if(active && settings.seconds && remaining<=0 && !players.some(p=>p.busy)) finish();
      else if(active && settings.seconds && remaining<=0) players.forEach(p=>{p.ball.disabled=true;[...p.answers.children].forEach(b=>b.disabled=true);});
    }
    requestAnimationFrame(tick);
  }
  function start() {
    clearRound();
    $('ob-courts').inert=false;
    questions=R.deck(settings.max,settings.mode); remaining=settings.seconds*1000;
    $('ob-arena').hidden=false;$('ob-pause-screen').hidden=true;$('ob-result').hidden=true;
    $('ob-courts').replaceChildren();$('ob-courts').style.setProperty('--players',settings.count);$('ob-courts').dataset.count=settings.count;
    active=true;paused=false;previous=performance.now();
    players=settings.names.map(makePlayer);
    document.body.classList.add('ob-playing');
    [...document.body.children].forEach(node=>{
      if(node===$('ob-arena') || ['SCRIPT','STYLE'].includes(node.tagName))return;
      if(!backgroundInert.has(node))backgroundInert.set(node,node.inert || false);
      node.inert=true;
    });
    updateClock();tone(true);$('ob-pause').focus();
  }
  function clearRound() {
    players.forEach(p=>{cancelDrag(p);p.animation?.cancel();});active=false;paused=false;
  }
  function leave() {
    clearRound();$('ob-arena').hidden=true;document.body.classList.remove('ob-playing');$('main-content').inert=false;
    backgroundInert.forEach((value,node)=>{node.inert=value;});backgroundInert.clear();
    if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    showLobby('settings');
    $('ob-settings').querySelector('[type=submit]').focus({preventScroll:true});
  }
  function pause() {
    if(!active || paused) return;
    paused=true;players.forEach(p=>{cancelDrag(p);p.animation?.pause();});
    returnFocus=document.activeElement;$('ob-pause-screen').hidden=false;$('ob-pause-title').focus();
    $('ob-courts').inert=true;
  }
  function resume() {
    if(!active || !paused || document.hidden) return;
    paused=false;previous=performance.now();players.forEach(p=>p.animation?.play());
    $('ob-pause-screen').hidden=true;$('ob-courts').inert=false;returnFocus?.focus();
  }
  function finish() {
    if(!active) return;
    clearRound();$('ob-courts').inert=true;$('ob-result').hidden=false;
    const winners=R.winners(players);
    $('ob-result-title').textContent=players.length===1?'Harika oynadın, '+players[0].name+'!':winners.length===players.length?'Dostluk kazandı!':winners.join(' ve ')+' kazandı!';
    $('ob-result-cards').replaceChildren();
    players.forEach(p=>{
      const card=el('div','ob-result-card');card.append(el('b','',p.name+' · '+p.score+' puan'));
      card.append(el('p','',p.solved+' basket · '+p.mistakes+' tekrar denemesi'));
      card.append(el('p','',p.mistakes?'İpucu: Önce onlukları 10’ar say, sonra birlikleri ekle. Rakamların yerini kontrol et.':'Onlukları ve birlikleri çok iyi takip ettin!'));
      $('ob-result-cards').append(card);
    });
    $('ob-record').textContent='';
    if(players.length===1) {
      const key='kemal-onluk-basket-v1:'+settings.mode+':'+settings.max+':'+settings.seconds;
      try {const best=Math.max(Number(localStorage.getItem(key))||0,players[0].score);localStorage.setItem(key,String(best));$('ob-record').textContent='Bu ayarlarda bu tarayıcıdaki en yüksek puan: '+best;} catch(_){$('ob-record').textContent='Rekor bu tarayıcıda kaydedilemedi; oyun etkilenmez.';}
    }
    const confetti=el('div','ob-confetti');confetti.setAttribute('aria-hidden','true');
    for(let i=0;i<36;i++){const c=el('i');c.style.cssText=`--x:${(i*37)%100}%;--c:${['#ffbf57','#af8cf5','#50b6a1','#ef8972'][i%4]};--delay:${(i%7)*.11}s`;confetti.append(c);}
    $('ob-result').querySelector('.ob-confetti')?.remove();$('ob-result').append(confetti);
    tone(true);$('ob-result-title').focus();
  }
  function matchSummary(){
    const count=Number($('ob-players').value),seconds=Number($('ob-duration').value);
    $('ob-match-summary').textContent=count+' oyuncu · '+(seconds?seconds+' saniye':'10 soru')+' · 10–'+$('ob-range').value;
  }
  function showLobby(screen){
    $('ob-stage').dataset.screen=screen;
    $('ob-cover').hidden=screen!=='cover';
    $('ob-prep').hidden=screen!=='settings';
    $('ob-open-settings').setAttribute('aria-expanded',String(screen==='settings'));
    (screen==='cover'?$('ob-open-settings'):$('ob-prep-title')).focus({preventScroll:true});
  }
  function fitLobby(){
    if(!window.innerHeight)return;
    const stage=$('ob-stage'),top=stage.getBoundingClientRect().top+(window.scrollY||0);
    const dock=$('shortcutDock'),reserve=dock?Math.min(115,dock.getBoundingClientRect().height+22):24;
    const height=Math.max(window.innerWidth<600?300:340,Math.min(800,window.innerHeight-top-reserve-18));
    const value=Math.round(height)+'px';
    if(stage.style.getPropertyValue('--ob-stage-height')!==value)stage.style.setProperty('--ob-stage-height',value);
  }
  $('ob-open-settings').addEventListener('click',()=>showLobby('settings'));
  $('ob-back-cover').addEventListener('click',()=>showLobby('cover'));
  $('ob-players').addEventListener('change',()=>{
    [...$('ob-names').children].forEach((label,i)=>{label.hidden=i>=Number($('ob-players').value);label.querySelector('input').disabled=label.hidden;});
    matchSummary();
  });
  ['ob-range','ob-duration'].forEach(id=>$(id).addEventListener('change',matchSummary));
  $('ob-settings').addEventListener('submit',e=>{
    e.preventDefault();
    if(active||$('ob-stage').dataset.screen!=='settings')return;
    const count=Number($('ob-players').value);
    settings={count,max:Number($('ob-range').value),mode:$('ob-mode').value,seconds:Number($('ob-duration').value),
      names:[...$('ob-names').querySelectorAll('input')].slice(0,count).map((n,i)=>n.value.trim()||'Oyuncu '+(i+1))};
    sound=$('ob-audio').checked;$('ob-sound').setAttribute('aria-pressed',String(sound));$('ob-courts').inert=false;start();
  });
  $('ob-sound').addEventListener('click',()=>{sound=!sound;$('ob-audio').checked=sound;$('ob-sound').setAttribute('aria-pressed',String(sound));});
  $('ob-pause').addEventListener('click',pause);$('ob-resume').addEventListener('click',resume);
  $('ob-menu').addEventListener('click',pause);$('ob-leave').addEventListener('click',leave);
  $('ob-settings-back').addEventListener('click',leave);
  $('ob-retry').addEventListener('click',()=>{$('ob-courts').inert=false;start();});
  $('ob-fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else $('ob-arena').requestFullscreen?.().catch(()=>{});});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && $('ob-arena').hidden && $('ob-stage').dataset.screen==='settings'){e.preventDefault();showLobby('cover');return;}
    if(e.key==='Escape' && active){e.preventDefault();paused?resume():pause();}
    if(e.key==='Tab' && (!$('ob-pause-screen').hidden || !$('ob-result').hidden)) {
      const overlay=$('ob-pause-screen').hidden?$('ob-result'):$('ob-pause-screen');
      const controls=[...overlay.querySelectorAll('button:not(:disabled)')];
      if(e.shiftKey && (document.activeElement===controls[0] || document.activeElement.tagName==='H2')){e.preventDefault();controls.at(-1).focus();}
      else if(!e.shiftKey && document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus();}
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('resize',()=>{fitLobby();players.forEach(p=>{cancelDrag(p);if(!p.busy)p.ball.style.left='';});});
  window.addEventListener('load',fitLobby);
  if(window.ResizeObserver){const observer=new window.ResizeObserver(fitLobby);observer.observe(document.body);}
  fitLobby();
  requestAnimationFrame(tick);
})();
