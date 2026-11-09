(function(){
  'use strict';
  const Rules=window.WordPairsRules,Data=window.WordPairsData,G=window.WordJigsaw,T=window.WordTowers,app=document.querySelector('.word-app');
  if(!app||!Rules||!Data||!G||!T)return;
  const $=id=>document.getElementById(id),kind=document.body.dataset.wordGame;
  const arena=$('wg-arena'),overlay=$('wg-overlay');
  let session=null,screen='cover',soundOn=true,audio=null,lastTime=0,token=0,completed=false,focusBeforeOverlay=null;
  const pointers=new Map(),suppressClick=new Map();
  function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
  function button(text,cls,fn){const el=node('button',cls,text);el.type='button';if(fn)el.addEventListener('click',fn);return el;}
  // The paint belongs to the word's spelling, never to its synonym pair.
  function wordTone(word){let hash=7;for(const c of word)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return ['lilac','mint','peach','sky','rose','butter'][hash%6];}
  function blockScene(compact){
    const scene=node('div','wk-block-scene'+(compact?' is-compact':'')),board=node('div','wk-scene-board');
    [['yıl',0,4],['sene',0,3],['hediye',1,4],['kelime',2,4],['sözcük',2,3],['armağan',3,4]].forEach(([word,x,y])=>{const b=node('span','wk-demo-block',word);b.dataset.tone=wordTone(word);b.style.setProperty('--bx',x);b.style.setProperty('--by',y);board.append(b);});
    const falling=node('div','wk-demo-domino');['yanıt','doğa'].forEach(word=>{const b=node('span','wk-demo-block',word);b.dataset.tone=wordTone(word);falling.append(b);});board.append(falling);scene.append(board,node('span','wk-scene-spark one','✦'),node('span','wk-scene-spark two','✧'),node('span','wk-scene-tag','yıl = sene'));
    return scene;
  }
  function play(type){
    if(!soundOn)return;
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=audio||new AC();audio.resume()?.catch(()=>{});
      const notes=type==='match'?[523.25,659.25,783.99]:type==='finish'?[523,659,784,1047]:[293.66,329.63];
      notes.forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain(),start=audio.currentTime+i*.075;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.055,start+.012);g.gain.exponentialRampToValueAtTime(.001,start+.19);o.connect(g);g.connect(audio.destination);o.start(start);o.stop(start+.2);});
    }catch(_){}
  }

  function svg(tag,attrs={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>{el.setAttribute(k,String(v));if(k==='fill')el.style.fill=String(v);});if(text!==undefined)el.textContent=text;return el;}
  function pieceSvg(shape,word,prefix,color){
    const b=shape.bounds,s=svg('svg',{viewBox:[b.x,b.y,b.width,b.height].join(' '),'aria-hidden':'true',preserveAspectRatio:'xMidYMid meet'}),defs=svg('defs'),gradient=svg('linearGradient',{id:prefix,x1:0,y1:0,x2:0,y2:1});
    gradient.append(svg('stop',{offset:0,'stop-color':color[0]}),svg('stop',{offset:1,'stop-color':color[1]}));defs.append(gradient);s.append(defs,svg('path',{d:shape.d,fill:'url(#'+prefix+')',class:'wg-real-piece'}),svg('path',{d:shape.d,class:'wg-piece-glint',fill:'none'}),svg('text',{x:shape.center.x,y:shape.center.y,'text-anchor':'middle','dominant-baseline':'central','font-size':Math.min(72,shape.w*.82/(word.length*.52)),class:'wg-piece-word'},word));return s;
  }
  function boardSvg(l,p,prefix){
    const shapes=G.create(l.cols,l.rows,l.shapeSeed),s=svg('svg',{class:'wg-jigsaw-svg',viewBox:'-7 -7 614 414',preserveAspectRatio:'xMidYMid meet'}),defs=svg('defs'),pattern=svg('pattern',{id:prefix+'-image',patternUnits:'userSpaceOnUse',width:600,height:400});
    pattern.append(svg('image',{href:l.world.image,width:600,height:400,preserveAspectRatio:'xMidYMid slice'}));const gradient=svg('linearGradient',{id:prefix+'-wood',x1:0,y1:0,x2:0,y2:1});gradient.append(svg('stop',{offset:0,'stop-color':'#fff5dc'}),svg('stop',{offset:1,'stop-color':'#e4d2ae'}));defs.append(pattern,gradient);s.append(defs,svg('rect',{x:-6,y:-6,width:612,height:412,rx:9,class:'wg-jigsaw-frame'}));
    shapes.forEach((shape,i)=>{const pair=l.slots[i],slot=svg('g',{class:'wg-slot'+(p.solved[i]?' solved':''),'data-slot':i,role:'button',tabindex:p.solved[i]?-1:0,'aria-disabled':String(p.solved[i]),'aria-label':p.solved[i]?pair.prompt+' ve '+pair.answer+' eşleşti':pair.prompt+' sözcüğünün zıt anlamını yerleştir'});
      slot.append(svg('path',{d:shape.d,fill:'url(#'+prefix+'-image)',class:'wg-jigsaw-photo'}),svg('path',{d:shape.d,fill:'url(#'+prefix+'-wood)',class:'wg-jigsaw-cover'}),svg('path',{d:shape.d,class:'wg-jigsaw-outline',fill:'none'}),svg('text',{x:shape.center.x,y:shape.center.y,'text-anchor':'middle','dominant-baseline':'central','font-size':Math.min(48,shape.w*.82/(pair.prompt.length*.52)),class:'wg-slot-word'},pair.prompt));s.append(slot);});return s;
  }

  function clearPointers(){for(const p of pointers.values())p.ghost?.remove();pointers.clear();}
  function setScreen(name){clearPointers();screen=name;['cover','setup','arena'].forEach(id=>$('wg-'+id).hidden=id!==name);$('wg-pause').hidden=name!=='arena';$('wg-menu').hidden=name!=='arena';hideOverlay();requestAnimationFrame(fitBoards);}
  function hideOverlay(){overlay.hidden=true;arena.inert=false;$('wg-setup').inert=false;$('wg-cover').inert=false;}
  function showOverlay(icon,title,copy,actions,content){
    clearPointers();focusBeforeOverlay=document.activeElement;$('wg-overlay-icon').textContent=icon;$('wg-overlay-title').textContent=title;$('wg-overlay-copy').textContent=copy;$('wg-overlay-content').replaceChildren(...(content||[]));$('wg-overlay-actions').replaceChildren(...actions);overlay.hidden=false;arena.inert=true;$('wg-setup').inert=true;$('wg-cover').inert=true;actions[0]?.focus();
  }
  function resume(){if(session)session.paused=false;hideOverlay();lastTime=0;if(focusBeforeOverlay?.isConnected)focusBeforeOverlay.focus();}
  function pause(){if(screen!=='arena'||!session||!overlay.hidden)return;session.paused=true;showOverlay('Ⅱ','Küçük bir mola','Sözcükler seni bekliyor. Hazır olduğunda kaldığın yerden devam et.',[button('Oyuna Devam Et','wg-primary',resume)]);}
  function menu(){if(!session)return;session.paused=true;showOverlay('↺','Yeni bir macera?','Ayarlara dönersen bu oyundaki ilerleme sıfırlanır.',[button('Oyuna Dön','wg-primary',resume),button('Ayarlara Dön','wg-soft',()=>{token++;session=null;setScreen('setup');})]);}
  $('wg-open-settings').addEventListener('click',()=>{setScreen('setup');$('wg-name-1').focus();});
  $('wg-back-cover').addEventListener('click',()=>setScreen('cover'));
  $('wg-sound').addEventListener('click',()=>{soundOn=!soundOn;$('wg-sound').setAttribute('aria-pressed',String(soundOn));$('wg-sound').setAttribute('aria-label',soundOn?'Oyun sesini kapat':'Oyun sesini aç');$('wg-sound').querySelector('span').textContent=soundOn?'Ses açık':'Ses kapalı';if(soundOn)play('match');});
  $('wg-pause').addEventListener('click',pause);$('wg-menu').addEventListener('click',menu);
  document.querySelectorAll('input[name="players"]').forEach(el=>el.addEventListener('change',()=>{$('wg-name-2-label').hidden=el.value!=='2'||!el.checked;}));
  $('wg-pace-label').hidden=kind!=='blocks';
  if(kind==='blocks')document.querySelector('.wg-how>span').textContent='Her eş anlam çifti 100 puan · Zincirlerde ek puan · Vinç yardımıyla 40 puan';
  const art=$('wg-cover-art');
  if(kind==='puzzle'){
    const frame=node('div','wg-cover-puzzle'),l={cols:3,rows:2,shapeSeed:421,world:Data.worlds[0],slots:['uzun','büyük','sıcak','açık','hızlı','gündüz'].map((prompt,i)=>({prompt,answer:['kısa','küçük','soğuk','kapalı','yavaş','gece'][i]}))};frame.append(boardSvg(l,{solved:[true,false,true,false,true,false]},'cover'));art.append(frame,node('span','wg-art-word one','uzun'),node('span','wg-art-word two','kısa'));
    const lobby=$('za-lobby-art');if(lobby){const preview=node('div','za-preview-puzzle');preview.inert=true;preview.append(boardSvg(l,{solved:[true,false,true,false,true,false]},'lobby'));lobby.append(preview,node('span','za-pair-tag','uzun ↔ kısa'));}
  }else{
    art.append(blockScene(false));$('wk-lobby-art')?.append(blockScene(true));
  }
  $('wg-settings').addEventListener('submit',e=>{
    e.preventDefault();token++;completed=false;
    session=Rules.create(kind,{players:document.querySelector('input[name="players"]:checked').value,grade:$('wg-grade').value,rounds:$('wg-rounds').value,pace:$('wg-pace').value,names:[$('wg-name-1').value,$('wg-name-2').value]});
    arena.classList.toggle('is-duo',session.players.length===2);arena.dataset.focus='0';arena.replaceChildren();session.players.forEach(p=>{const lane=node('article','wg-lane');lane.dataset.player=p.id;lane.setAttribute('aria-label',p.name+' oyun alanı');arena.append(lane);renderLane(p.id);});setScreen('arena');play('match');lastTime=0;
  });
  function laneFor(id){return arena.querySelector('[data-player="'+id+'"]');}
  function addProgress(lane,p,l){const prog=node('div','wg-progress'),bar=node('i');bar.style.width=(100*Math.min(l.goal,kind==='puzzle'?p.solved.filter(Boolean).length:p.matched)/l.goal)+'%';prog.append(bar);lane.append(prog);}
  function renderLane(id){
    if(!session)return;const p=session.players[id],l=session.levels[p.level],lane=laneFor(id);if(!lane)return;
    lane.replaceChildren();lane.style.setProperty('--cols',l.cols);lane.dataset.phase=p.phase;
    const head=node('header','wg-lane-head'),nameWrap=node('div'),score=node('div','wg-score',p.score.toLocaleString('tr-TR'));nameWrap.append(node('div','wg-player-name',p.name),node('span','wg-level-label',(p.level+1)+' / '+session.levels.length+' · '+(kind==='puzzle'?l.rows+'×'+l.cols+' · ':'')+l.world.name));score.append(node('small','','PUAN'));head.append(node('span','wg-avatar',id+1),nameWrap,score);
    if(session.players.length===2){const open=button('Alanı aç','wg-open-lane',()=>{arena.dataset.focus=String(id);requestAnimationFrame(fitBoards);});open.setAttribute('aria-label',p.name+' oyun alanını aç');head.append(open);}lane.append(head);addProgress(lane,p,l);
    const instruction=node('div','wg-lane-instruction');instruction.append(node('strong','',kind==='puzzle'?'Parçayı sürükle, zıt anlamıyla birleştir.':'Döndür, yerleştir, eş anlamları temizle.'),node('span','wg-task-count',(kind==='puzzle'?p.solved.filter(Boolean).length:Math.min(p.matched,l.goal))+' / '+l.goal));
    if(kind==='puzzle'){const hint=button('✦ İpucu','',()=>{const pair=Rules.puzzleHint(session,id);if(pair){feedback(lane,p);lane.querySelectorAll('.wg-slot').forEach((el,i)=>el.classList.toggle('is-target',l.slots[i].id===pair.id));}});hint.disabled=p.phase!=='active';instruction.append(hint);}
    lane.append(instruction);
    if(kind==='puzzle')renderPuzzle(lane,p,l);else renderBlocks(lane,p,l);
    const fb=node('div','wg-feedback');fb.setAttribute('role','status');fb.setAttribute('aria-live','polite');lane.append(fb);feedback(lane,p);
    if(['levelDone','done'].includes(p.phase))renderLaneFinish(lane,p,l);
    requestAnimationFrame(fitBoards);
  }
  function renderPuzzle(lane,p,l){
    const space=node('div','wg-play-space'),board=node('div','wg-puzzle-board');board.setAttribute('aria-label',l.world.name+' · '+l.rows+'×'+l.cols+' yapbozu');board.append(boardSvg(l,p,'jig-'+token+'-'+p.id+'-'+p.level));const pan=node('span','wg-board-pan-label','Resmi kaydır ↕');pan.hidden=true;space.append(board,pan);lane.append(space);
    const rack=node('div','wg-piece-rack'),label=node('div','wg-rack-label');label.append(node('strong','','Karışık parçalar'),node('span','','↔ Kaydır · ↑ Sürükle'));rack.append(label);
    const tray=node('div','wg-puzzle-tray');tray.dataset.count=l.goal;tray.setAttribute('aria-label','Karışık yapboz parçaları');const shapes=G.create(l.cols,l.rows,l.shapeSeed),colors=[['#b8adff','#8b78dc'],['#a0e1cf','#65b59f'],['#ffd59b','#e5aa65'],['#f6b5d0','#d887b0']];
    l.tray.forEach(id=>{const i=l.slots.findIndex(x=>x.id===id),pair=l.slots[i],piece=button('','wg-piece'+(p.solved[i]?' placed':'')+(p.selected===id?' is-selected':''));piece.dataset.piece=id;piece.disabled=p.solved[i];piece.setAttribute('aria-label',pair.answer+' parçasını seç');piece.setAttribute('aria-pressed',String(p.selected===id));piece.append(pieceSvg(shapes[i],pair.answer,'tone-'+token+'-'+p.id+'-'+id,colors[i%4]));tray.append(piece);});rack.append(tray);lane.append(rack);
  }
  function renderBlocks(lane,p,l){
    lane.style.setProperty('--rows',l.rows);const preview=node('div','wg-next-piece');preview.append(node('span','','Sıradaki'));l.queue[p.cursor%l.queue.length].forEach(t=>preview.append(node('b','',t.word)));lane.append(preview);
    const field=node('div','wg-tetris-field');field.setAttribute('aria-label','Sözcük blokları · '+l.cols+' sütun, '+l.rows+' sıra');const pending=new Set(p.pending.map(c=>c.x+':'+c.y));
    p.board.forEach((row,y)=>row.forEach((t,x)=>{if(!t)return;const block=button(t.word,'wg-tower-cell is-landed'+(pending.has(x+':'+y)?' is-clearing':''));block.dataset.tone=wordTone(t.word);block.dataset.column=x;block.setAttribute('aria-label',t.word+' · '+(x+1)+'. sütun');block.style.setProperty('--x',x);block.style.setProperty('--y',y);const fall=p.falls?.find(f=>f.x===x&&f.to===y);if(fall){block.classList.add('is-settling');block.style.setProperty('--fall-distance',fall.to-fall.from);}field.append(block);}));
    if(p.piece&&p.phase==='active'){
      T.cells(T.landing(p.board,p.piece)).forEach(c=>{const ghost=node('div','wg-tower-cell is-ghost');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--x',c.x);ghost.style.setProperty('--y',c.y);field.append(ghost);});
      T.cells(p.piece).forEach((c,i)=>{const block=button(c.token.word,'wg-tower-cell is-falling');block.dataset.tone=wordTone(c.token.word);block.dataset.falling=i;block.setAttribute('aria-label','Düşen sözcük: '+c.token.word);block.style.setProperty('--x',c.x);block.style.setProperty('--y',c.y);field.append(block);});
    }
    lane.append(field);const controls=node('div','wg-block-controls');
    [['←','Sola taşı','move','-1'],['↻','Bloğu döndür','rotate','1'],['→','Sağa taşı','move','1'],['↓','Bir adım indir','soft','1'],['⇓ Bırak','Bloğu bırak','drop','1']].forEach(([text,label,key,value])=>{const b=button(text,key==='drop'?'wg-drop':'');b.setAttribute('aria-label',label);b.dataset[key]=value;b.disabled=p.phase!=='active';controls.append(b);});lane.append(controls,node('div','wg-key-note',p.id===0?'A/D: yön · W: döndür · S: aşağı · Boşluk: bırak':'←/→: yön · ↑: döndür · ↓: aşağı · Enter: bırak'));
    if(p.phase==='rescue'){const review=node('div','wg-review');review.append(node('small','','VİNÇ YARDIMI'),node('strong','','Kule yükseldi!'),node('p','','Vinç, sıkışan eş anlamlıları bulup birlikte kaldırabilir. Sonra yoluna devam et.'),button('Vinci Kullan','wg-primary',()=>handleResult(p.id,Rules.rescue(session,p.id))));field.append(review);}
    positionWord(p,l,lane);
  }
  function feedback(lane,p){
    const fb=lane.querySelector('.wg-feedback');if(!fb)return;fb.replaceChildren();fb.removeAttribute('data-type');const f=p.feedback;
    if(!f){fb.append(node('strong','',kind==='puzzle'?'Parçaları yukarıya sürükle.':'Eş anlamlıları yan yana veya üst üste getir.'),node('span','',kind==='puzzle'?'Doğru parça resmin kendi bölümünü açar. Tepsiyi yana kaydırabilirsin.':'Eşleşmeyen bloklar kalır. Silinenlerin üstündekiler aşağı düşer.'));return;}fb.dataset.type=f.type;
    if(f.type==='match'&&kind==='blocks')fb.append(node('strong','',(f.chain>1?f.chain+'. zincir! · ':'')+f.pairs.map(pair=>pair.prompt+' = '+pair.answer).join(' · ')+' · +'+f.points),node('span','',f.pairs.map(pair=>pair.example).join(' ')));
    else if(f.type==='match')fb.append(node('strong','',f.pair.prompt+' ↔ '+f.pair.answer+' · +'+f.points),node('span','',f.pair.example));
    else if(f.type==='hint')fb.append(node('strong','',f.pair.prompt+' ↔ '+f.pair.answer),node('span','',f.pair.example));
    else if(f.type==='stack')fb.append(node('strong','','Bloklar yerleşti.'),node('span','','Sıradaki parçayı düşün: aynı anlamı taşıyan iki farklı sözcük temas edince temizlenir.'));
    else if(f.type==='help')fb.append(node('strong','','Vinç yeni bir alan açtı.'),node('span','',f.pairs.slice(0,2).map(pair=>pair.prompt+' = '+pair.answer).join(' · ')));
    else if(f.type==='rescue')fb.append(node('strong','','Kule doldu. Birlikte yol açalım.'),node('span','','Vinç yardımıyla eş anlamlıları öğrenip devam edebilirsin.'));
    else fb.append(node('strong','',f.pair.prompt+' ile '+f.chosen+' zıt anlamlı değil.'),node('span','',f.pair.tip+' Başka bir parça dene.'));
  }
  function renderLaneFinish(lane,p,l){
    const finish=node('div','wg-lane-finish');finish.append(node('strong','',p.phase==='done'?'Harika keşif!':'Bölüm tamamlandı!'),node('p','',l.world.name+' · '+l.goal+' eşleşme'));
    if(p.phase==='levelDone')finish.append(button(kind==='puzzle'?'Sonraki Resme Geç →':'Sonraki Kulelere Geç →','wg-primary',()=>{if(Rules.next(session,p.id)){renderLane(p.id);play('match');}}));
    else if(session.status==='done')finish.append(button('Sonuçları Gör','wg-primary',results));
    else finish.append(node('p','','Arkadaşın kendi keşfini tamamlıyor.'));
    lane.append(finish);confetti(lane);
  }
  function confetti(parent){
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const c=node('div','wg-confetti');c.setAttribute('aria-hidden','true');for(let i=0;i<22;i++){const bit=node('i');bit.style.setProperty('--x',(i*31%100)+'%');bit.style.setProperty('--d',(i%7)*.07+'s');bit.style.setProperty('--c',['#a17bea','#edba63','#70c3a2','#e69ab7'][i%4]);c.append(bit);}parent.append(c);setTimeout(()=>c.remove(),3400);
  }
  function handleResult(id,result){
    if(!result)return;const p=session.players[id],lane=laneFor(id);
    if(kind==='puzzle'){
      if(result.type==='match'){
        const l=session.levels[p.level],i=l.slots.findIndex(x=>x.id===result.pair.id),slot=lane.querySelector('[data-slot="'+i+'"]'),piece=lane.querySelector('[data-piece="'+result.pair.id+'"]');slot.classList.add('solved','revealed');slot.disabled=true;slot.setAttribute('aria-disabled','true');slot.setAttribute('tabindex','-1');slot.setAttribute('aria-label',result.pair.prompt+' ve '+result.pair.answer+' eşleşti');piece.classList.add('placed');piece.disabled=true;selectPieces(id);
        lane.querySelector('.wg-score').firstChild.nodeValue=p.score.toLocaleString('tr-TR');lane.querySelector('.wg-progress i').style.width=100*p.solved.filter(Boolean).length/l.goal+'%';lane.querySelector('.wg-task-count').textContent=p.solved.filter(Boolean).length+' / '+l.goal;lane.querySelectorAll('.is-target').forEach(x=>x.classList.remove('is-target'));
        if(p.phase!=='active'){lane.querySelector('.wg-lane-instruction button').disabled=true;renderLaneFinish(lane,p,l);}
      }feedback(lane,p);
    }else renderLane(id);
    play(result.type==='match'?'match':'retry');checkComplete();
  }
  function checkComplete(){
    if(!session||session.status!=='done'||completed)return;completed=true;play('finish');const current=token;
    window.dispatchEvent(new CustomEvent('kemal-game-complete',{detail:{source:kind==='puzzle'?'zitlar-atolyesi.html':'es-anlam-kuleleri.html'}}));
    setTimeout(()=>{if(current===token&&session?.status==='done'&&overlay.hidden)results();},1700);
    session.players.forEach(p=>{const finish=laneFor(p.id).querySelector('.wg-lane-finish');finish?.querySelector('p+p')?.remove();if(finish&&!finish.querySelector('button'))finish.append(button('Sonuçları Gör','wg-primary',results));});
  }
  function results(){
    if(!session||session.status!=='done')return;const scores=node('div','wg-result-scores');
    session.players.forEach(p=>{const score=node('div','wg-result-score');score.append(node('span','',p.name),node('b','',p.score.toLocaleString('tr-TR')+' puan'),node('small','',p.correct+' doğru eşleşme · '+p.errors+(kind==='puzzle'?' tekrar denemesi':' vinç desteği')));scores.append(score);});
    const review=node('div','wg-review-list');review.setAttribute('aria-label','Sözcük tekrar defteri');
    session.players.forEach(p=>{const records=Object.values(p.records),missed=records.filter(r=>r.errors||r.hints);(missed.length?missed:records.slice(0,3)).forEach(r=>{const item=node('div');item.append(node('b','',p.name+' · '+r.prompt+(kind==='puzzle'?' ↔ ':' = ')+r.answer),node('span','',r.example));review.append(item);});});
    const names=Rules.winners(session),title=session.players.length===1?'Sözcük Ustası!':names.length>1?'Birlikte Zirvedesiniz!':names[0]+' Tebrikler!';
    showOverlay('✦',title,'Keşif tamamlandı. Tekrar denediğin sözcükleri bir kez de cümle içinde oku.',[button('Yeniden Oyna','wg-primary',()=>{token++;session=null;setScreen('setup');}),button('Oyun Alanına Dön','wg-soft',()=>hideOverlay())],[scores,review]);confetti(overlay.querySelector('.wg-dialog'));
  }
  function selectPieces(id){const p=session.players[id];laneFor(id).querySelectorAll('.wg-piece').forEach(el=>{const selected=el.dataset.piece===p.selected;el.classList.toggle('is-selected',selected);el.setAttribute('aria-pressed',String(selected));});}
  function positionWord(p,l,lane){
    if(!p.piece||p.phase!=='active')return;const canFall=T.fits(p.board,{...p.piece,y:p.piece.y+1}),fraction=l.seconds&&canFall?Math.min(1,p.elapsed/(l.seconds/l.rows)):0,coords=T.cells(p.piece);
    lane.querySelectorAll('.is-falling').forEach((el,i)=>{const c=coords[i];if(c){el.style.setProperty('--x',c.x);el.style.setProperty('--y',c.y+fraction);}});
  }
  function moveTo(id,col){if(Rules.move(session,id,col))renderLane(id);}
  arena.addEventListener('click',e=>{
    const lane=e.target.closest('.wg-lane');if(!lane||!session||session.paused)return;const id=Number(lane.dataset.player),p=session.players[id];if((suppressClick.get(id)||0)>performance.now())return;
    const piece=e.target.closest('[data-piece]'),slot=e.target.closest('[data-slot]'),base=e.target.closest('[data-column]'),move=e.target.closest('[data-move]');
    if(p.phase!=='active')return;
    if(piece&&!piece.disabled){p.selected=p.selected===piece.dataset.piece?null:piece.dataset.piece;selectPieces(id);}
    else if(slot&&p.selected)handleResult(id,Rules.puzzle(session,id,p.selected,Number(slot.dataset.slot)));
    else if(base)moveTo(id,Number(base.dataset.column));
    else if(move)moveTo(id,p.column+Number(move.dataset.move));
    else if(e.target.closest('[data-rotate]')){if(Rules.rotate(session,id))renderLane(id);}
    else if(e.target.closest('[data-soft]')){const result=Rules.softDrop(session,id);if(result?.type==='fall')renderLane(id);else handleResult(id,result);}
    else if(e.target.closest('[data-drop]'))handleResult(id,Rules.drop(session,id,p.column));
  });
  arena.addEventListener('pointerdown',e=>{
    if(e.button!==0||!session||session.paused)return;const lane=e.target.closest('.wg-lane'),target=e.target.closest('.wg-piece,.wg-tower-cell.is-falling');if(!lane||!target||target.disabled)return;
    const id=Number(lane.dataset.player);if(session.players[id].phase!=='active'||[...pointers.values()].some(p=>p.id===id))return;
    pointers.set(e.pointerId,{id,target,piece:target.dataset.piece,x:e.clientX,y:e.clientY,drag:false,ghost:null,token});try{(kind==='puzzle'?target:arena).setPointerCapture(e.pointerId);}catch(_){}
  });
  arena.addEventListener('pointermove',e=>{
    const point=pointers.get(e.pointerId);if(!point||point.token!==token)return;const dx=e.clientX-point.x,dy=e.clientY-point.y;if(Math.hypot(dx,dy)>7)point.drag=true;if(!point.drag)return;
    if(kind==='puzzle'&&e.pointerType==='touch'&&Math.abs(dx)>Math.abs(dy)*1.2&&point.target.parentElement.scrollWidth>point.target.parentElement.clientWidth)return;
    e.preventDefault();
    if(kind==='puzzle'){
      const space=laneFor(point.id).querySelector('.wg-play-space');if(space.scrollHeight>space.clientHeight+2){const r=space.getBoundingClientRect();if(e.clientY>r.bottom-25)space.scrollTop+=9;else if(e.clientY<r.top+25)space.scrollTop-=9;}
      if(!point.ghost){point.ghost=node('div','wg-drag-ghost');point.ghost.append(point.target.querySelector('svg').cloneNode(true));point.ghost.setAttribute('aria-hidden','true');document.body.append(point.ghost);session.players[point.id].selected=point.piece;selectPieces(point.id);}
      point.ghost.style.left=e.clientX+'px';point.ghost.style.top=e.clientY+'px';const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.wg-slot');laneFor(point.id).querySelectorAll('.wg-slot').forEach(el=>el.classList.toggle('is-target',el===hit&&!el.disabled));
    }else{const r=laneFor(point.id).querySelector('.wg-tetris-field').getBoundingClientRect();moveTo(point.id,Math.floor((e.clientX-r.left)/r.width*session.levels[session.players[point.id].level].cols));}
  });
  function endPointer(e,cancel){
    const point=pointers.get(e.pointerId);if(!point)return;pointers.delete(e.pointerId);point.ghost?.remove();if(!point.drag||point.token!==token)return;suppressClick.set(point.id,performance.now()+400);laneFor(point.id)?.querySelectorAll('.is-target').forEach(el=>el.classList.remove('is-target'));if(cancel||session?.paused)return;
    if(kind==='puzzle'){const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.wg-slot');if(hit?.closest('.wg-lane')===laneFor(point.id))handleResult(point.id,Rules.puzzle(session,point.id,point.piece,Number(hit.dataset.slot)));}
    else{const r=laneFor(point.id).querySelector('.wg-tetris-field').getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)handleResult(point.id,Rules.drop(session,point.id,session.players[point.id].column));}
  }
  arena.addEventListener('pointerup',e=>endPointer(e,false));arena.addEventListener('pointercancel',e=>endPointer(e,true));arena.addEventListener('lostpointercapture',e=>endPointer(e,true));
  document.addEventListener('keydown',e=>{
    if(!overlay.hidden&&e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')];if(!buttons.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
    if(e.key==='Escape'){if(!overlay.hidden&&session?.status!=='done'){resume();return;}pause();return;}
    if(kind==='puzzle'&&screen==='arena'&&session&&!session.paused&&overlay.hidden&&['Enter',' '].includes(e.key)&&e.target.closest('.wg-slot')){e.preventDefault();const slot=e.target.closest('.wg-slot'),id=Number(slot.closest('.wg-lane').dataset.player);if(session.players[id].selected)handleResult(id,Rules.puzzle(session,id,session.players[id].selected,Number(slot.dataset.slot)));return;}
    if(kind!=='blocks'||screen!=='arena'||!session||session.paused||!overlay.hidden||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    let id=0,action;const key=e.key.toLowerCase();if(['a','d','w','s',' '].includes(key))action={a:'left',d:'right',w:'rotate',s:'soft',' ':'drop'}[key];else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)){id=session.players.length===2?1:0;action={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'soft',Enter:'drop'}[e.key];}else return;e.preventDefault();if(e.repeat&&['drop','rotate'].includes(action))return;const p=session.players[id];
    if(action==='left'||action==='right')moveTo(id,p.column+(action==='left'?-1:1));else if(action==='rotate'){if(Rules.rotate(session,id))renderLane(id);}else{const result=action==='soft'?Rules.softDrop(session,id):Rules.drop(session,id);if(result?.type==='fall')renderLane(id);else handleResult(id,result);}

  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  function fitBoards(){
    if(!session||screen!=='arena')return;
    const focusMode=session.players.length===2&&window.innerWidth<=650;arena.classList.toggle('is-focus',focusMode);
    arena.querySelectorAll('.wg-play-space').forEach(space=>{const board=space.querySelector('.wg-puzzle-board'),fit=Math.max(1,Math.min(space.clientWidth-18,(space.clientHeight-10)*1.5)),w=fit<270&&space.clientWidth>250?Math.min(space.clientWidth-18,350):fit,scroll=w>fit+2;board.style.setProperty('--board-w',Math.floor(w)+'px');board.style.setProperty('--board-h',Math.floor(w/1.5)+'px');space.classList.toggle('wg-board-scroll',scroll);space.querySelector('.wg-board-pan-label').hidden=!scroll;});
    if(kind==='blocks')session.players.forEach(p=>{const lane=laneFor(p.id),field=lane.querySelector('.wg-tetris-field'),l=session.levels[p.level];if(field&&field.clientHeight&&lane.clientWidth){const width=Math.min(lane.clientWidth-28,Math.max(280,field.clientHeight*1.4));lane.style.setProperty('--wk-field-width',Math.floor(width)+'px');const size=Math.min(22,Math.max(12,field.clientHeight/l.rows-10));field.querySelectorAll('.wg-tower-cell:not(.is-ghost)').forEach(el=>el.style.setProperty('--wk-word-size',Math.min(size,Math.max(11,(field.clientWidth/l.cols-14)/(el.textContent.length*.53)))+'px'));}positionWord(p,l,lane);});
  }
  window.GameViewport?.watch(window,app,()=>{const top=parseFloat(app.style.getPropertyValue('--play-top'))||0,dock=document.getElementById('shortcutDockBar')?.getBoundingClientRect(),bottom=dock&&dock.top>window.innerHeight*.45?window.innerHeight-dock.top+6:8,height=Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight);app.style.setProperty('--play-height',Math.max(140,Math.floor(height-top-bottom-16))+'px');fitBoards();});
  if(window.ResizeObserver)new ResizeObserver(fitBoards).observe(arena);
  function tick(time){
    const dt=lastTime?Math.min(.1,(time-lastTime)/1000):0;lastTime=time;
    if(session&&screen==='arena'&&!session.paused&&session.status==='playing'&&kind==='blocks'){
      const compact=session.players.length===2&&window.innerWidth<=650;
      Rules.advance(session,dt,compact?[Number(arena.dataset.focus)]:undefined).forEach(event=>{if(['advance','fall'].includes(event.type)){renderLane(event.player);checkComplete();}else handleResult(event.player,event);});session.players.forEach(p=>{if(p.phase==='active')positionWord(p,session.levels[p.level],laneFor(p.id));});
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
