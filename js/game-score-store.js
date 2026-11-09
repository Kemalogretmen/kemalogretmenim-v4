(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.GameScoreStore=f();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const KEY='kemal.game.scores.v1';
 function read(storage,owner='guest'){try{const data=JSON.parse(storage.getItem(KEY)||'{}');const rows=data[owner];return Array.isArray(rows)?rows.filter(r=>r&&typeof r.name==='string'&&Number.isFinite(r.score)&&r.score>=0&&Number.isFinite(r.maximum)&&r.maximum>0&&r.score<=r.maximum&&Number.isInteger(r.rounds)&&r.rounds>0&&Array.isArray(r.questions)).slice(0,200):[];}catch(e){return [];}}
 function save(storage,owner,rows){try{let data;try{data=JSON.parse(storage.getItem(KEY)||'{}');}catch(e){}if(!data||typeof data!=='object'||Array.isArray(data))data={};const old=read(storage,owner),ids=new Set(old.map(r=>r.id));data[owner]=[...rows.filter(r=>!ids.has(r.id)),...old].slice(0,200);storage.setItem(KEY,JSON.stringify(data));return true;}catch(e){return false;}}
 function rank(rows){return rows.slice().sort((a,b)=>(b.score/b.maximum-a.score/a.maximum)||(b.firstTry/b.rounds-a.firstTry/a.rounds)||String(b.date).localeCompare(String(a.date)));}
 return {KEY,read,save,rank};
});
