(function(root,factory){const common=typeof module==='object'&&module.exports;const api=factory(common?require('./word-pairs-data.js'):root.WordPairsData,common?require('./word-tower-rules.js'):root.WordTowers);if(common)module.exports=api;else root.WordPairsRules=api;})(typeof window==='undefined'?globalThis:window,function(Data,Towers){
  'use strict';
  function random(seed){let n=Number(seed)>>>0;return ()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
  function shuffle(items,rng){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function orient(pair,rng){return {...pair,prompt:rng()<.5?pair.a:pair.b,answer:''};}
  function task(pair,rng){const p=orient(pair,rng);p.answer=p.prompt===p.a?p.b:p.a;return p;}
  function create(kind,options={},seed=Date.now()){
    if(!['puzzle','blocks'].includes(kind))throw new Error('Bilinmeyen sözcük oyunu.');
    const config={players:Number(options.players)===2?2:1,grade:Number(options.grade)>=3?3:2,rounds:Number(options.rounds)===1?1:3,pace:[0,12,16].includes(Number(options.pace))?Number(options.pace):16};
    const rng=random(seed),bank=Data.rows(kind,config.grade),levels=kind==='blocks'?Towers.levels(bank,config,rng,shuffle,Data.worlds):[];
    for(let level=0;kind==='puzzle'&&level<config.rounds;level++){
      const deck=shuffle(bank,rng).map(p=>task(p,rng));
      if(kind==='puzzle'){
        const cols=[3,4,5][level],rows=[2,3,4][level],count=cols*rows,slots=deck.slice(0,count);
        levels.push({slots,tray:shuffle(slots.map(p=>p.id),rng),cols,rows,goal:count,world:Data.worlds[level],shapeSeed:(Number(seed)||1)+level*991});
      }
    }
    const s={kind,config,seed,levels,paused:false,status:'playing',players:Array.from({length:config.players},(_,i)=>({id:i,name:String(options.names?.[i]||'Oyuncu '+(i+1)).trim().slice(0,24)||'Oyuncu '+(i+1),level:0,score:0,correct:0,errors:0,hints:0,records:{},attempts:{}}))};
    s.players.forEach(p=>initLevel(s,p));return s;
  }
  function initLevel(s,p){if(s.kind==='blocks')return Towers.initLevel(s,p);const l=s.levels[p.level];Object.assign(p,{phase:'active',selected:null,solved:Array(l.goal).fill(false),step:0,feedback:null});}
  function active(s,id){const p=s.players[id];return s.status==='playing'&&!s.paused&&p?.phase==='active'?p:null;}
  function attempt(p,key){return p.attempts[key]||(p.attempts[key]={errors:0,hint:false});}
  function record(p,pair){return p.records[pair.id]||(p.records[pair.id]={prompt:pair.prompt,answer:pair.answer,example:pair.example,errors:0,hints:0,correct:0});}
  function award(p,key,pair){const a=attempt(p,key),points=a.hint?40:a.errors?60:100;p.score+=points;p.correct++;record(p,pair).correct++;return points;}
  function completeLevel(s,p){p.phase=p.level===s.levels.length-1?'done':'levelDone';if(s.players.every(p=>p.phase==='done'))s.status='done';}
  function puzzle(s,id,pieceId,slot){
    const p=active(s,id),l=p&&s.levels[p.level];
    if(!p||!Number.isInteger(slot)||!l.slots[slot]||p.solved[slot]||!l.slots.some((r,i)=>r.id===pieceId&&!p.solved[i]))return null;
    const pair=l.slots[slot],key=p.level+':'+slot,a=attempt(p,key);
    if(pair.id!==pieceId){a.errors++;p.errors++;record(p,pair).errors++;p.feedback={type:'miss',pair,chosen:l.slots.find(x=>x.id===pieceId).answer};return p.feedback;}
    const points=award(p,key,pair);p.solved[slot]=true;p.selected=null;p.feedback={type:'match',pair,points};
    if(p.solved.every(Boolean))completeLevel(s,p);return p.feedback;
  }
  function puzzleHint(s,id){
    const p=active(s,id);if(!p)return null;const l=s.levels[p.level];let i=l.slots.findIndex((r,i)=>r.id===p.selected&&!p.solved[i]);if(i<0)i=p.solved.indexOf(false);if(i<0)return null;
    const pair=l.slots[i],a=attempt(p,p.level+':'+i);if(!a.hint){a.hint=true;p.hints++;record(p,pair).hints++;}p.feedback={type:'hint',pair};return pair;
  }
  function next(s,id){const p=s.players[id];if(s.status!=='playing'||s.paused||p?.phase!=='levelDone')return false;p.level++;initLevel(s,p);return true;}
  function winners(s){const best=Math.max(...s.players.map(p=>p.score));return s.players.filter(p=>p.score===best).map(p=>p.name);}
  return {create,random,shuffle,puzzle,puzzleHint,next,winners,move:Towers.move,rotate:Towers.rotate,softDrop:Towers.softDrop,drop:Towers.drop,rescue:Towers.rescue,advance:Towers.advance};
});
