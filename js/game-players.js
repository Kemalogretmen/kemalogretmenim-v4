(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.GamePlayers=api;api.mount(root);}})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const configs={
  'onluk-kaydiragi.html':{groups:[['#rs-name-0','#rs-name-1']],guard:'#rs-settings button[type="submit"]',forms:'#rs-settings'},
  'sayi-atolyesi.html':{groups:[['#name0','#name1']],guard:'#settings button[type="submit"]',forms:'#settings'},
  'zitlar-atolyesi.html':{groups:[['#wg-name-1','#wg-name-2']],guard:'#wg-settings button[type="submit"]',forms:'#wg-settings'},
  'es-anlam-kuleleri.html':{groups:[['#wg-name-1','#wg-name-2']],guard:'#wg-settings button[type="submit"]',forms:'#wg-settings'},
  'carpim-kanatlari.html':{groups:[['#ck-name-0','#ck-name-1']],guard:'#ck-start'},
  'onluk-basket.html':{groups:[['#ob-names input']],guard:'#ob-settings button[type="submit"]',forms:'#ob-settings'},
  'kizma_birader.html':{groups:[['.player-name-input']],guard:'#setupModal .start-btn'},
  'bilgi-duellosu.html':{groups:[['#teamA','#teamB']],guard:'#startBtn'},
  'oyun4.html':{groups:[['#solIsimInput','#sagIsimInput']],guard:'#baslaBtn'},
  'matematik-vadisi.html':{groups:[['#mv-player-name']],guard:'#mv-create-player',forms:'#mv-form'},
  'olcum-atolyesi.html':{groups:[['#playerNameInput']],guard:'#startBtn'},
  'sesli-balonlar.html':{groups:[['#playerName']],guard:'#saveScoreBtn'},
  'hece_koprusu.html':{groups:[['#playerName']],guard:'#saveScoreBtn'},
  'kelime_avcisi.html':{groups:[['#playerName']],guard:'#saveScoreBtn'},
  'saat-oyunu.html':{groups:[['#playerNameInput']],guard:'#saveScoreButton'},
  'sekil-avcisi-3d.html':{groups:[['#player-name']],guard:'#saveScoreBtn'},
  'uzay_matematik_avi.html':{groups:[['#playerOneName'],['#playerOneNameDuo','#playerTwoNameDuo'],['#winnerNameDuo']],guard:'#saveScoresBtn'}
 };
 const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
 function owner(state){return state?.user?.id&&state.profile?.active!==false?'user:'+state.user.id:'guest';}
 function allowedTeacher(s){return !!(s?.user?.id&&s.profile?.role==='teacher'&&s.profile.active!==false&&(!s.profile.approval_status||s.profile.approval_status==='active'));}
 function choose(list,count,random=Math.random){const copy=list.slice(),out=[];while(copy.length&&out.length<count)out.push(copy.splice(Math.min(copy.length-1,Math.floor(Math.max(0,random())*copy.length)),1)[0]);return out;}
 async function loadRoster(auth,storage){
  const initial=await auth.ready(),id=initial?.user?.id;if(!allowedTeacher(initial))return {classes:[],status:'guest'};
  const current=()=>allowedTeacher(auth.getState())&&auth.getState().user.id===id;
  let classes=[],failed=false;
  try{const c=await auth.getClient().from('teacher_classes').select('id,name').eq('teacher_id',id).eq('status','active');if(c.error)throw c.error;
   const ids=(c.data||[]).map(x=>x.id);if(ids.length){const s=await auth.getClient().from('teacher_class_students').select('id,class_id,display_name,status').eq('teacher_id',id).in('class_id',ids).neq('status','removed');if(s.error)throw s.error;
    classes=(c.data||[]).map(x=>({id:'panel:'+x.id,name:clean(x.name||x.class_name||'Sınıf'),students:(s.data||[]).filter(y=>y.class_id===x.id&&y.status!=='removed').map(y=>({id:'panel:'+y.id,name:clean(y.display_name)})).filter(y=>y.name)}));}
  }catch(e){failed=true;}
  let agenda=null;
  try{const a=await auth.getClient().from('teacher_agenda_states').select('agenda_state').eq('user_id',id).maybeSingle();if(a.error)throw a.error;agenda=a.data?.agenda_state;}catch(e){failed=true;}
  if(!current())return {classes:[],status:'guest'};
  if(!agenda)try{if(storage?.getItem('kemalOgretmenAjandasi.v1.owner')===id)agenda=JSON.parse(storage.getItem('kemalOgretmenAjandasi.v1'));}catch(e){}
  if(Array.isArray(agenda?.classes)&&Array.isArray(agenda?.students))for(const c of agenda.classes){const name=clean(c.name||'Sınıf'),existing=classes.find(x=>x.name.toLocaleLowerCase('tr-TR')===name.toLocaleLowerCase('tr-TR'));const students=agenda.students.filter(s=>s.classId===c.id).map(s=>({id:'agenda:'+s.id,name:clean([s.firstName,s.lastName].filter(Boolean).join(' '))})).filter(s=>s.name);if(existing){for(const s of students)if(!existing.students.some(x=>x.name.toLocaleLowerCase('tr-TR')===s.name.toLocaleLowerCase('tr-TR')))existing.students.push(s);}else classes.push({id:'agenda:'+c.id,name,students});}
  return {classes:classes.filter(c=>c.students.length),status:failed?'partial':'ready'};
 }
 let activeApi=null;
 function mount(win){
  const doc=win.document,path=win.location.pathname.split('/').pop(),config=configs[path];if(!config)return;
  const initialized=new WeakSet(),controls=new Map(),remembered=new Map();let state=null,classes=[],loading=false,revision=0,key='',queued=false,fieldSerial=0,rosterStatus='ready';
  const fields=g=>[...new Set(config.groups[g].flatMap(sel=>[...doc.querySelectorAll(sel)]))];
  const computer=f=>(f.readOnly&&!f.dataset.gpLocked)||(f.id==='sagIsimInput'&&doc.getElementById('sagSetupRole')?.textContent.includes('Bilgisayar'));
  function visible(e){if(e.disabled||computer(e))return false;for(let p=e;p&&p!==doc;p=p.parentElement){if(p.hidden||p.classList?.contains('hidden')||p.classList?.contains('is-hidden'))return false;const cs=win.getComputedStyle?.(p);if(cs?.display==='none'||cs?.visibility==='hidden')return false;}return true;}
  function editableFields(g){return fields(g).filter(visible);}
  function dispatch(f){f.dispatchEvent(new win.Event('input',{bubbles:true}));f.dispatchEvent(new win.Event('change',{bubbles:true}));}
  function setName(f,name,auto){const value=clean(name).slice(0,f.maxLength>0?f.maxLength:120);if(f.value!==value){f.value=value;dispatch(f);}if(auto)f.dataset.gpAuto='true';}
  function activeStudent(){return state?.user&&state.profile?.role==='student'&&state.profile.active!==false;}
  function studentName(){return clean(state?.profile?.full_name||[state?.profile?.first_name,state?.profile?.last_name].filter(Boolean).join(' '));}
  function initialize(f,g,index){
   if(computer(f))return;if(!initialized.has(f)){initialized.add(f);f.dataset.gameName='true';f.dataset.gpKey=String(++fieldSerial);if(!f.placeholder)f.placeholder='Öğrencinin adı';if(/^Oyuncu\s*\d+$|^Öğrenci$|^Sen$|^Mavi Şimşek$|^Kırmızı Ateş$|^Kırmızı Takım$|^Mavi Takım$/i.test(clean(f.value)))f.value='';const old=remembered.get(g+':'+index);if(!f.value&&old)setName(f,old,false);f.addEventListener('input',()=>{f.setCustomValidity?.('');remembered.set(g+':'+index,clean(f.value));delete f.dataset.gpStudent;});}
   if(index===0&&activeStudent()&&f.id!=='winnerNameDuo'&&studentName()){setName(f,studentName(),true);if(!f.readOnly)f.readOnly=true;f.dataset.gpLocked='true';}
   else if(f.dataset.gpLocked){f.readOnly=false;delete f.dataset.gpLocked;}
  }
  function node(tag,text){const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
  function apply(f,id,pool){const student=pool.find(s=>s.id===id);if(!student)return;setName(f,student.name,true);f.dataset.gpStudent=id;}
  function panel(g,live){let p=controls.get(g);if(!p){p=node('div');p.className='gp-student-picker';p.setAttribute('aria-label','Kayıtlı öğrencilerden oyuncu seç');controls.set(g,p);}const first=live[0];if(!first)return;p.hidden=!allowedTeacher(state);if(p.hidden)return;
   const signature=live.map(f=>f.dataset.gpKey).join('|')+'|'+classes.map(c=>c.id+':'+c.students.length).join('|')+'|'+loading;
   if(p.dataset.signature===signature&&p.isConnected)return;p.dataset.signature=signature;p.replaceChildren();
   const title=node('strong','Sınıfından oyuncu seç'),status=node('small',loading?'Öğrenciler yükleniyor…':classes.length?'Listeden seçebilir veya rastgele eşleştirebilirsin.':rosterStatus==='partial'?'Öğrenci listesi yüklenemedi. Adları elle yazabilir veya sayfayı yenileyebilirsin.':'Kayıtlı öğrenci bulunamadı. Oyuncu adlarını elle yazabilirsin.');p.append(title,status);
   if(classes.length){const label=node('label','Sınıf '),classSelect=node('select');classSelect.setAttribute('aria-label','Oyuncu seçimi için sınıf');classSelect.append(new win.Option('Tüm sınıflar',''));classes.forEach(c=>classSelect.append(new win.Option(c.name,c.id)));label.append(classSelect);p.append(label);const picks=node('div');picks.className='gp-picks';const selects=[];function options(){const pool=classes.filter(c=>!classSelect.value||c.id===classSelect.value).flatMap(c=>c.students.map(s=>({...s,className:c.name})));selects.forEach((select,i)=>{const previous=live[i].dataset.gpStudent||'';select.replaceChildren(new win.Option('Öğrenci seç…',''));pool.forEach(s=>select.append(new win.Option(s.name+' · '+s.className,s.id)));select.value=previous;});return pool;}
    live.forEach((f,i)=>{const l=node('label',(i+1)+'. oyuncu '),select=node('select');select.setAttribute('aria-label',(i+1)+'. oyuncu için öğrenci');select.onchange=()=>apply(f,select.value,optionsPool());selects.push(select);l.append(select);picks.append(l);});const optionsPool=()=>classes.filter(c=>!classSelect.value||c.id===classSelect.value).flatMap(c=>c.students);classSelect.onchange=options;options();const random=node('button',live.length>1?live.length+' öğrenciyi rastgele seç':'Rastgele öğrenci seç');random.type='button';random.onclick=()=>{const pool=optionsPool();if(pool.length<live.length){status.textContent='Bu seçim için en az '+live.length+' farklı öğrenci gerekiyor.';return;}choose(pool,live.length).forEach((s,i)=>{apply(live[i],s.id,pool);selects[i].value=s.id;});};p.append(picks,random);
   }
   // Place beside the name fields; do not replace any game's own controls.
   const parent=first.closest('.wg-name-fields,.player-settings,#ob-names,#ck-names')||first.closest('label')?.parentElement||first.parentElement;
   parent?.insertAdjacentElement('afterend',p);
  }
  function scan(){queued=false;config.groups.forEach((_,g)=>{const all=fields(g);all.forEach((f,i)=>{initialize(f,g,i);const required=visible(f);if(f.required!==required)f.required=required;});const live=editableFields(g);if(live.length&&allowedTeacher(state))panel(g,live);else if(controls.get(g))if(!controls.get(g).hidden)controls.get(g).hidden=true;});}
  function schedule(){if(!queued){queued=true;win.requestAnimationFrame(scan);}}
  function validate(){scan();for(let g=0;g<config.groups.length;g++){const live=editableFields(g),ids=new Set();for(const f of live){let message='';if(!clean(f.value))message='Lütfen oyuncunun adını yaz veya listeden bir öğrenci seç.';if(f.dataset.gpStudent){if(ids.has(f.dataset.gpStudent))message='İki oyuncu için farklı öğrenciler seç.';ids.add(f.dataset.gpStudent);}if(message){f.setCustomValidity?.(message);f.reportValidity?.();f.focus();return false;}}}return true;}
  async function update(auth){const current=auth?.getState?.()||null;const next=owner(current)+'|'+(current?.profile?.role||'')+'|'+(current?.profile?.full_name||'')+'|'+(current?.profile?.approval_status||'');if(next===key)return;key=next;const rev=++revision;state=current;classes=[];remembered.clear();for(const group of config.groups)for(const selector of group)for(const f of doc.querySelectorAll(selector)){if(f.dataset.gpAuto){setName(f,'',false);delete f.dataset.gpAuto;delete f.dataset.gpStudent;}if(f.dataset.gpLocked){f.readOnly=false;delete f.dataset.gpLocked;}}controls.forEach(p=>{p.hidden=true;delete p.dataset.signature;});loading=allowedTeacher(state);scan();if(loading)try{const result=await loadRoster(auth,win.localStorage);if(rev!==revision)return;classes=result.classes;rosterStatus=result.status;}catch(e){}finally{if(rev===revision){loading=false;controls.forEach(p=>delete p.dataset.signature);scan();}}}
  doc.addEventListener('click',e=>{if(e.target.closest(config.guard)&&!validate()){e.preventDefault();e.stopImmediatePropagation();}},true);
  doc.addEventListener('submit',e=>{if(config.forms&&e.target.matches(config.forms)&&!validate()){e.preventDefault();e.stopImmediatePropagation();}},true);
  // Covers keyboard-triggered legacy score saving as well as clicking.
  doc.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-game-name]')&&!validate()){e.preventDefault();e.stopImmediatePropagation();}},true);
  doc.addEventListener('focusin',e=>{if(e.target.matches('[data-game-name]'))scan();});
  new win.MutationObserver(schedule).observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style','disabled','readonly']});
  win.addEventListener('kemal-user-auth-ready',()=>update(win.kemalUserAuth));win.addEventListener('kemal-user-auth-changed',()=>update(win.kemalUserAuth));
  activeApi={validate,owner:()=>owner(state),refresh:scan};scan();if(win.kemalUserAuth)win.kemalUserAuth.ready().then(()=>update(win.kemalUserAuth)).catch(()=>{});
 }
 return {configs,clean,choose,owner,allowedTeacher,loadRoster,mount,validate:()=>activeApi?activeApi.validate():true,getOwner:()=>activeApi?activeApi.owner():'guest',refresh:()=>activeApi?.refresh()};
});
