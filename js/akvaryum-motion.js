(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AquariumMotion = factory();
})(typeof window === 'object' ? window : this, function () {
  'use strict';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const normal = { speed: 1, bob: 5, tilt: 1.8, depth: .45, pulse: 0 };
  const profiles = {
    seahorse: { speed: .23, bob: 7, tilt: .5, depth: .35, pulse: 0 },
    jellyfish: { speed: .16, bob: 11, tilt: .7, depth: .25, pulse: .018 },
    octopus: { speed: .35, bob: 1.5, tilt: .7, depth: .93, pulse: 0 },
    ray: { speed: .7, bob: 3, tilt: 1.1, depth: .78, pulse: 0 },
    turtle: { speed: .52, bob: 5, tilt: 1, depth: .58, pulse: 0 },
    shark: { speed: 1.08, bob: 3, tilt: 1, depth: .5, pulse: 0 },
    dolphin: { speed: 1.12, bob: 8, tilt: 2.3, depth: .3, pulse: 0 },
    puffer: { speed: .62, bob: 4, tilt: 1, depth: .48, pulse: 0 }
  };
  const profile = id => profiles[id] || normal;
  // Camera distance is independent of score, hunger and vertical swimming lanes.
  function initialDepth(id) {
    let hash=2166136261;
    for(const char of String(id)) hash=Math.imul(hash^char.charCodeAt(0),16777619);
    return .12+((hash>>>0)%1000)/1000*.76;
  }
  function perspective(f) {
    const depth=clamp(f.waterDepth??.5,0,1);
    return {scale:.76+.24*depth,opacity:.76+.24*depth,brightness:.86+.14*depth,
      saturation:.78+.22*depth,layer:depth<.5?1:3};
  }
  function layout(items, width, height) {
    if (!items.length) return new Map();
    const columns = Math.min(items.length, Math.max(1, Math.min(Math.floor(width / 85), Math.ceil(Math.sqrt(items.length * width / Math.max(1, height) / 1.4)))));
    const rows = Math.ceil(items.length / columns), cellW = width / columns, cellH = height / rows;
    const maxSize = Math.max(18, Math.min(172, cellW - 18, (cellH - 59) / .67));
    const largest = Math.max(...items.map(s => s.size));
    const scale = clamp(maxSize / largest, .12, 1);
    const sorted = [...items].sort((a,b) => profile(a.species).depth - profile(b.species).depth);
    const result = new Map();
    sorted.forEach((s,i) => {
      const size = s.size * scale, p = profile(s.species), row = Math.floor(i / columns);
      const minY = Math.min(26, Math.max(0,height - size * .67 - 30)), maxY = Math.max(minY,height - size * .67 - 30);
      const rowStart = clamp(row * cellH + 26, minY, maxY);
      const rowEnd = clamp((row+1) * cellH - size * .67 - 30, rowStart, maxY);
      let target = rowStart + (rowEnd-rowStart) * (.25 + (i % columns) / Math.max(1,columns-1) * .5);
      if (s.species === 'octopus' && items.filter(item=>item.species==='octopus').length <= columns) target = Math.max(target, minY + (maxY-minY) * .9);
      if (s.species === 'ray' && items.filter(item=>item.species==='ray').length <= columns) target = Math.max(target, minY + (maxY-minY) * .65);
      result.set(s.id,{size,x:clamp((i%columns+.5)*cellW-size/2,0,Math.max(0,width-size)),y:target,minY,maxY,
        bandTop:minY,bandBottom:maxY,anchorY:target,profile:p,routeTime:0,targetX:null,targetY:null,
        waterDepth:initialDepth(s.id),depthTarget:initialDepth(s.id),depthTime:12+(i%7)*3});
    });
    return result;
  }
  // A separate seabed keeps eggs out of the swimming lanes and away from the pearl.
  function eggLayout(items, width, height, pearl = false) {
    if (!items.length) return new Map();
    const gap = pearl ? Math.min(210, width * .38) : 0;
    const available = Math.max(1, width - gap);
    let columns = Math.min(items.length, Math.max(1, Math.floor(available / 78)));
    if(gap && columns > 1 && columns % 2) columns += available / (columns + 1) >= 78 ? 1 : -1;
    const rows = Math.ceil(items.length / columns);
    const rowHeight = Math.min(82, Math.max(1, height * .48 / rows));
    const size = Math.min(76, Math.max(20, (rowHeight - 28) / .7));
    const cellWidth = available / columns;
    return new Map(items.map((item, i) => {
      // Fill from the front of the sand bed, then use the next shallow row.
      const slot = gap && columns === 1 ? available / 4 : (i % columns + .5) * cellWidth;
      const center = slot + (slot >= available / 2 ? gap : 0);
      return [item.id, {size, x:clamp(center-size/2,0,Math.max(0,width-size)),
        y:Math.max(24,height-30-size*.67-Math.floor(i/columns)*rowHeight)}];
    }));
  }
  function startTurn(f) {
    if (!f.turn && f.turnCooldown <= 0) f.turn = {elapsed:0,duration:1.8,from:f.angle,to:f.direction>0?180:0};
  }
  function step(fish, dt, width, height, random = Math.random) {
    if (!(dt > 0)) return;
    dt = Math.min(dt,.05);
    // Routes are individual. Nearby fish never trigger a turn or a slowdown.
    fish.forEach(f => {
      if(f.held) { f.cruise=0; return; }
      f.turnCooldown=Math.max(0,(f.turnCooldown||0)-dt);
      const target=f.hover?0:1;
      f.cruise=(f.cruise??1)+(target-(f.cruise??1))*Math.min(1,dt*14);
      if(f.cruise<.002) { f.cruise=0; return; }
      f.depthTime=(f.depthTime??0)-dt*f.cruise;
      if(f.depthTime<=0) {f.depthTarget=.08+random()*.84;f.depthTime=18+random()*18;}
      const distance=f.waterDepth??.5;
      f.waterDepth=clamp(distance+clamp((f.depthTarget-distance)*.09,-.025,.025)*dt*f.cruise,0,1);
      const p=f.profile||normal, speed=24*f.mood.speed*p.speed*f.cruise;
      const maxX=Math.max(0,width-f.size),edge=Math.min(25,maxX/4);
      f.routeTime=(f.routeTime||0)-dt*f.cruise;
      if(f.routeTime<=0 && !f.turn) {
        const first=f.targetX==null;
        // Keep the horizontal destination until reached; depth can vary during the journey.
        // Decorative objects never affect heading or speed.
        if(first || Math.abs(f.targetX-f.x)<18) f.targetX=first ? f.x+(f.direction>0?maxX-f.x:-f.x)*(.35+random()*.6) : edge+random()*Math.max(0,maxX-2*edge);
        const depth=p.depth>.75 ? .65+random()*.35 : .05+random()*.9;
        f.targetY=f.minY+(f.maxY-f.minY)*depth;
        f.routeTime=8+random()*12;
      }
      f.targetX=clamp(f.targetX??f.x,0,maxX);
      if(!f.turn && Math.abs(f.targetX-f.x)<18) f.routeTime=0;
      const atEdge=(f.direction>0 && f.x>=maxX-edge)||(f.direction<0 && f.x<=edge);
      const destinationBehind=(f.targetX-f.x)*f.direction < -Math.max(18,f.size*.25);
      if(atEdge || destinationBehind) startTurn(f);
      if(f.turn) {
        f.turn.elapsed+=dt*f.cruise;
        const t=clamp(f.turn.elapsed/f.turn.duration,0,1),ease=t*t*(3-2*t);
        f.angle=f.turn.from+(f.turn.to-f.turn.from)*ease;
        f.x+=dt*speed*.3*Math.cos(f.angle*Math.PI/180);
        if(t===1) {
          f.direction=f.turn.to===180?-1:1;f.turn=null;f.turnCooldown=3;
          // An edge turn begins a new inward journey, never a repeated edge bounce.
          if(atEdge) {f.targetX=f.direction>0?maxX*.75:maxX*.25;f.routeTime=8+random()*12;}
        }
      } else f.x+=dt*speed*f.direction;
      f.phase+=dt*.7*f.mood.speed*f.cruise;
      const wanted=clamp((f.targetY??f.anchorY)+Math.sin(f.phase)*p.bob,f.minY,f.maxY);
      const verticalSpeed=Math.max(2,speed*.45);
      f.y+=clamp((wanted-f.y)*.22,-verticalSpeed,verticalSpeed)*dt;
      f.x=clamp(f.x,0,maxX);f.y=clamp(f.y,f.minY,f.maxY);
    });
  }
  return {profile,layout,eggLayout,step,perspective};
});
