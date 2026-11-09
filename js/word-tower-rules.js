(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordTowers=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const directions=[[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[-1,0]],[[0,0],[0,-1]]];
  function token(pair,side){return {pairId:pair.id,word:side?pair.answer:pair.prompt,side,pair};}
  function levels(bank,config,rng,shuffle,worlds){
    return Array.from({length:config.rounds},(_,level)=>{
      const cols=4,rows=8,goal=[6,10,14][level],deck=shuffle(bank,rng).map(p=>{const reverse=rng()<.5;return {...p,prompt:reverse?p.b:p.a,answer:reverse?p.a:p.b};});
      const initial=Array.from({length:rows},()=>Array(cols).fill(null)),seedRows=level===0?1:2,queue=[];
      for(let row=0;row<seedRows;row++)for(let c=0;c<cols;c++)initial[rows-1-row][c]=token(deck[row*cols+c],0);
      for(let row=seedRows-1;row>=0;row--){const answers=deck.slice(row*cols,(row+1)*cols).map(p=>token(p,1));queue.push(answers.slice(0,2),answers.slice(2));}
      for(let cycle=0;cycle<5;cycle++){
        const remaining=cycle?shuffle(deck,rng):deck.slice(seedRows*cols);
        for(let i=0;i<remaining.length;i+=4){const group=remaining.slice(i,i+4);if(group.length<2)continue;
          const first=shuffle(group,rng).map(p=>token(p,0)),second=shuffle(group,rng).map(p=>token(p,1));
          for(const list of [first,second])for(let j=0;j+1<list.length;j+=2)queue.push(list.slice(j,j+2));
        }
      }
      return {cols,rows,goal,initial,queue,seconds:config.pace?Math.max(7,config.pace-level*3):0,world:worlds[level]};
    });
  }
  function initLevel(s,p){const l=s.levels[p.level];Object.assign(p,{phase:'active',board:l.initial.map(row=>row.map(t=>t&&({...t}))),cursor:0,matched:0,step:0,drops:0,elapsed:0,settle:0,chain:0,pending:[],feedback:null});spawn(s,p);}
  function spawn(s,p){const l=s.levels[p.level],words=l.queue[p.cursor%l.queue.length];p.falls=[];p.piece={x:1,y:0,rotation:0,tokens:words.map(t=>({...t}))};p.cursor++;p.column=p.piece.x;p.elapsed=0;p.phase=fits(p.board,p.piece)?'active':'rescue';if(p.phase==='rescue')p.feedback={type:'rescue'};}
  function cells(piece){return directions[piece.rotation].map(([x,y],i)=>({x:piece.x+x,y:piece.y+y,token:piece.tokens[i]}));}
  function fits(board,piece){const rows=board.length,cols=board[0].length;return cells(piece).every(c=>c.x>=0&&c.x<cols&&c.y>=-1&&c.y<rows&&(c.y<0||!board[c.y][c.x]));}
  function landing(board,piece){const ghost={...piece};while(fits(board,{...ghost,y:ghost.y+1}))ghost.y++;return ghost;}
  function player(s,id){const p=s.players[id];return s.kind==='blocks'&&s.status==='playing'&&!s.paused&&p?.phase==='active'?p:null;}
  function move(s,id,column){const p=player(s,id);if(!p||!Number.isInteger(column))return false;const candidate={...p.piece,x:column};if(!fits(p.board,candidate))return false;p.piece=candidate;p.column=column;return true;}
  function rotate(s,id){const p=player(s,id);if(!p)return false;const rotation=(p.piece.rotation+1)%4;for(const offset of [0,-1,1,-2,2]){const next={...p.piece,x:p.piece.x+offset,rotation};if(fits(p.board,next)){p.piece=next;p.column=next.x;return true;}}return false;}
  function findMatches(board){
    const positions=new Map(),pairs=new Map();
    for(let y=0;y<board.length;y++)for(let x=0;x<board[0].length;x++){
      const a=board[y][x];if(!a)continue;
      for(const [dx,dy] of [[1,0],[0,1]]){const b=board[y+dy]?.[x+dx];if(b&&a.pairId===b.pairId&&a.word!==b.word){positions.set(y+':'+x,{x,y});positions.set((y+dy)+':'+(x+dx),{x:x+dx,y:y+dy});pairs.set(a.pairId,a.pair);}}
    }
    return {cells:[...positions.values()],pairs:[...pairs.values()]};
  }
  function collapse(board){const moved=[];for(let x=0;x<board[0].length;x++){let write=board.length-1;for(let y=board.length-1;y>=0;y--)if(board[y][x]){if(y!==write){board[write][x]=board[y][x];board[y][x]=null;moved.push({x,from:y,to:write});}write--;}}return moved;}
  function record(p,pair){return p.records[pair.id]||(p.records[pair.id]={prompt:pair.prompt,answer:pair.answer,example:pair.example,errors:0,hints:0,correct:0});}
  function mark(s,p,match,assisted=false){
    const points=match.pairs.length*(assisted?40:100+Math.max(0,p.chain-1)*25);p.pending=match.cells;p.matched+=match.pairs.length;p.step=p.matched;p.correct+=match.pairs.length;p.score+=points;
    match.pairs.forEach(pair=>{const r=record(p,pair);r.correct++;if(assisted){r.hints++;p.hints++;}});
    p.phase='clear';p.settle=.65;p.feedback={type:'match',pairs:match.pairs,pair:match.pairs[0],points,chain:p.chain,assisted};return p.feedback;
  }
  function lock(s,p){
    const occupied=cells(p.piece);if(occupied.some(c=>c.y<0)||!fits(p.board,p.piece)){p.phase='rescue';p.feedback={type:'rescue'};return p.feedback;}
    occupied.forEach(c=>{p.board[c.y][c.x]=c.token;});p.drops++;p.chain=1;p.piece=null;p.falls=collapse(p.board);const match=findMatches(p.board);
    if(match.cells.length)return mark(s,p,match);
    p.phase='settle';p.settle=.2;p.feedback={type:'stack'};return p.feedback;
  }
  function drop(s,id,column){const p=player(s,id);if(!p)return null;if(column!==undefined&&!move(s,id,column))return null;p.piece=landing(p.board,p.piece);return lock(s,p);}
  function softDrop(s,id){const p=player(s,id);if(!p)return null;const next={...p.piece,y:p.piece.y+1};if(fits(p.board,next)){p.piece=next;return {type:'fall'};}return lock(s,p);}
  function complete(s,p){p.phase=p.level===s.levels.length-1?'done':'levelDone';if(s.players.every(p=>p.phase==='done'))s.status='done';}
  function advance(s,seconds,activeIds){
    if(s.kind!=='blocks'||s.paused||s.status!=='playing')return [];const events=[],dt=Math.max(0,Math.min(1,Number(seconds)||0));
    s.players.forEach(p=>{
      if(activeIds&&!activeIds.includes(p.id))return;const l=s.levels[p.level];
      if(p.phase==='clear'||p.phase==='settle'){
        p.settle-=dt;if(p.settle>0)return;
        if(p.phase==='clear'){
          p.pending.forEach(c=>{p.board[c.y][c.x]=null;});p.pending=[];p.falls=collapse(p.board);const match=findMatches(p.board);
          if(match.cells.length){p.chain++;events.push({...mark(s,p,match),player:p.id});return;}
          if(p.matched>=l.goal){complete(s,p);events.push({type:'advance',player:p.id});return;}
        }
        spawn(s,p);events.push({type:'advance',player:p.id});
      }else if(p.phase==='active'&&l.seconds){
        p.elapsed+=dt;const interval=l.seconds/l.rows;
        if(p.elapsed>=interval){p.elapsed-=interval;const event=softDrop(s,p.id);if(event)events.push({...event,player:p.id});}
      }
    });return events;
  }
  function rescue(s,id){
    const p=s.players[id];if(s.kind!=='blocks'||s.paused||s.status!=='playing'||p?.phase!=='rescue')return null;
    const seen=new Map();let pairCells=null;
    for(let y=p.board.length-1;y>=0&&!pairCells;y--)for(let x=0;x<p.board[0].length&&!pairCells;x++){const t=p.board[y][x];if(!t)continue;const prior=seen.get(t.pairId);if(prior&&prior.token.word!==t.word)pairCells={cells:[{x,y},{x:prior.x,y:prior.y}],pairs:[t.pair]};else seen.set(t.pairId,{x,y,token:t});}
    p.errors++;p.chain=1;p.piece=null;
    if(pairCells)return mark(s,p,pairCells,true);
    const bottom=p.board[p.board.length-1].filter(Boolean);bottom.forEach(t=>{record(p,t.pair).hints++;p.hints++;});p.board[p.board.length-1].fill(null);collapse(p.board);p.phase='settle';p.settle=.3;p.feedback={type:'help',pairs:bottom.map(t=>t.pair)};return p.feedback;
  }
  return {levels,initLevel,cells,fits,landing,move,rotate,drop,softDrop,findMatches,collapse,advance,rescue};
});
