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
    puffer: { speed: .62, bob: 4, tilt: 1, depth: .48, pulse: 0 },
    boxfish: { speed: .5, bob: 3, tilt: .8, depth: .5, pulse: 0 },
    bannerfish: { speed: .72, bob: 4, tilt: 1, depth: .4, pulse: 0 },
    batfish: { speed: .55, bob: 4, tilt: .8, depth: .48, pulse: 0 },
    cleanershrimp: { speed: .32, bob: 2, tilt: .5, depth: .85, pulse: 0 },
    hermitcrab: { speed: .16, bob: .4, tilt: .25, depth: .98, pulse: 0, floor: true },
    cuttlefish: { speed: .45, bob: 3, tilt: .8, depth: .72, pulse: 0 },
    swordfish: { speed: 1.05, bob: 2, tilt: .6, depth: .4, pulse: 0 },
    safiye: { speed: .62, bob: 3, tilt: .8, depth: .55, pulse: 0 },
    eel: { speed:.56,bob:3,tilt:1.1,depth:.67,pulse:0 },
    angler: { speed:.32,bob:4,tilt:.7,depth:.7,pulse:0 },
    mantis: { speed:.4,bob:2,tilt:.7,depth:.8,pulse:0 },
    crab: { speed:.2,bob:.5,tilt:.3,depth:.96,pulse:0,floor:true },
    lina: { speed:.55,bob:4,tilt:1,depth:.5,pulse:0 },
    spongebob: { speed:.3,bob:3,tilt:.65,depth:.62,pulse:0 },
    patrick: { speed:.27,bob:4,tilt:.8,depth:.64,pulse:0 },
    mrkrabs: { speed:.24,bob:.6,tilt:.4,depth:.64,pulse:0 }
  };
  const profile = id => profiles[id] || normal;
  const characters=new Set(['spongebob','patrick','mrkrabs']);
  function characterTravel(f,dt){
    if(!characters.has(f.species))return;
    // Each character has its own clock; modal/reflow and awards never reset it.
    f.characterClock=((f.characterClock??initialDepth(f.id)*28)+dt*f.cruise)%104;
    const floor=f.characterClock>=34&&f.characterClock<74;
    if(!floor&&f.characterFloor)f.targetY=f.minY+(f.maxY-f.minY)*.32;
    f.characterFloor=floor;f.characterWalking=floor&&Math.abs(f.y-f.maxY)<4;
  }
  // Camera distance is independent of score, hunger and vertical swimming lanes.
  function initialDepth(id) {
    let hash=2166136261;
    for(const char of String(id)) hash=Math.imul(hash^char.charCodeAt(0),16777619);
    return .12+((hash>>>0)%1000)/1000*.76;
  }
  function perspective(f) {
    const depth=clamp(f.waterDepth??.5,0,1);
    // Distance changes size and color, never the solid body silhouette.
    return {scale:.66+.34*depth,opacity:1,brightness:.86+.14*depth,
      saturation:.78+.22*depth,layer:depth<.5?1:3};
  }
  // A small textured cross-section fills the edge-on silhouette of a sprite.
  // The body banks into a turn while labels and scores remain screen-facing.
  function turnPose(f) {
    // A crab side-steps in both directions; its whole front view stays intact.
    if(f.species==='crab')return {yaw:0,round:0,fullness:0,bank:0,lift:0,scale:1,width:.2,height:.2};
    const angle=clamp(Number.isFinite(f.angle)?f.angle:0,0,180);
    const round=Math.max(0,Math.sin(angle*Math.PI/180));
    const sign=f.turn ? Math.sign(f.turn.to-f.turn.from)||1 : f.direction>0?1:-1;
    const flat=['ray','shark','dolphin','cleanershrimp','hermitcrab','eel','mantis','crab'].includes(f.species);
    const tall=['seahorse','angelfish','batfish','discus'].includes(f.species);
    const fullness=clamp((round-.7)/.3,0,1);
    return {yaw:angle,round:round<.0001?0:round,fullness,bank:round*sign*3.5,
      lift:-round*2.5,scale:1+round*.035,
      width:flat?.20:tall?.24:.30,height:flat?.20:tall?.57:.43};
  }
  // Scale the score badge offset with the rendered fish size while keeping a
  // clear minimum for young, small fish.
  function labelGap(size, scale=1) { return clamp(size*scale*.12,8,22); }
  // The fish art is 1.5:1 and has 5px button padding on both sides. A CSS
  // transform does not change its layout box, so compensate by half the
  // vertical shrink only; larger corrections push the name over the fish.
  function labelAdjustment(size, scale=1) { return Math.max(0,(Math.max(0,size-10)/3)*(1-clamp(scale,0,1))); }
  function layout(items, width, height, displayScale = 1) {
    if (!items.length) return new Map();
    const columns = Math.min(items.length, Math.max(1, Math.min(Math.floor(width / 85), Math.ceil(Math.sqrt(items.length * width / Math.max(1, height) / 1.4)))));
    const rows = Math.ceil(items.length / columns), cellW = width / columns, cellH = height / rows;
    // Rows seed starting positions; they are not cages that swimmers must fit.
    // Subtracting label space from every short row made board fish collapse to
    // a few pixels before growth and camera scaling were even applied.
    const magnification = Number.isFinite(displayScale) ? clamp(displayScale,1,2) : 1;
    const maxSize = Math.max(18, Math.min(172 * magnification, (cellW - 18) * magnification, width - 18, (height - 59) / .67));
    const largest = Math.max(...items.map(s => s.size));
    const scale = clamp(maxSize / largest, .12, magnification);
    const sorted = [...items].sort((a,b) => profile(a.species).depth - profile(b.species).depth);
    const result = new Map();
    sorted.forEach((s,i) => {
      const size = s.size * scale, p = profile(s.species), row = Math.floor(i / columns);
      let minY = Math.min(26, Math.max(0,height - size * .67 - 30));
      const maxY = Math.max(minY,height - size * .67 - 30);
      if (p.floor) minY = Math.max(minY, maxY - height * .08);
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
  // Resize bounds without sending existing swimmers back to the seed grid.
  function reflow(fish, placement, width) {
    const center=fish.x+fish.size/2;
    for(const key of ['size','minY','maxY','bandTop','bandBottom','profile'])fish[key]=placement[key];
    const maxX=Math.max(0,width-fish.size);
    fish.x=clamp(center-fish.size/2,0,maxX);fish.y=clamp(fish.y,fish.minY,fish.maxY);
    if(Number.isFinite(fish.targetX))fish.targetX=clamp(fish.targetX,0,maxX);
    if(Number.isFinite(fish.targetY))fish.targetY=clamp(fish.targetY,fish.minY,fish.maxY);
    fish.anchorY=clamp(fish.anchorY??fish.y,fish.minY,fish.maxY);
  }
  // A separate seabed keeps eggs out of the swimming lanes and away from the pearl.
  function eggLayout(items, width, height, pearl = false) {
    if (!items.length) return new Map();
    const gap = pearl ? (width < 700 ? Math.min(60,width*.16) : Math.min(210, width * .38)) : 0;
    const sideWidth = Math.max(1,(width-gap)/2);
    const minCell = width < 700 ? 78 : 100;
    const perSide = gap ? Math.max(1,Math.floor((sideWidth+10)/minCell)) : 0;
    const columns = Math.min(items.length,Math.max(1,gap ? perSide*2 : Math.floor(width/minCell)));
    const rows = Math.ceil(items.length / columns);
    const rowHeight = Math.min(94, Math.max(1, height * .48 / rows));
    const labelRegion = gap ? sideWidth/perSide : width/columns;
    const denseFit=Math.max(18,(height*.06+rowHeight-34)/.67);
    const size = Math.min(92,labelRegion-8,denseFit);
    const labelSize = rowHeight < 25 ? 8 : 10;
    const labelFit = Math.max(4,(rowHeight-3-labelSize*1.2)/.7);
    const eggSize = Math.min(56,Math.max(4,size*.58,rowHeight*.34),labelFit);
    return new Map(items.map((item, i) => {
      // Alternate the two sand banks around the pearl. Small deterministic
      // offsets make the nests feel settled without letting their name plates collide.
      const slot=i%columns, row=Math.floor(i/columns);
      let center, cellWidth;
      if(gap) {
        const right=(slot%2)===1, local=Math.floor(slot/2);
        cellWidth=sideWidth/perSide;
        center=(right ? width/2+gap/2 : 0)+(local+.5)*cellWidth;
      } else {
        cellWidth=width/columns;
        center=(slot+.5)*cellWidth;
      }
      let hash=2166136261;for(const char of String(item.id))hash=Math.imul(hash^char.charCodeAt(0),16777619);
      const jitter=(((hash>>>0)%1000)/999-.5)*Math.max(0,cellWidth-size-8)*.55;
      const x=clamp(center-size/2+jitter,0,Math.max(0,width-size));
      const y=Math.max(0,height-(size*.67+33)-row*rowHeight);
      return [item.id,{size,eggSize,labelSize,labelWidth:Math.max(size,cellWidth-6),x,y}];
    }));
  }
  // Only resting destinations avoid the pearl; swimming routes stay unrestricted.
  function restLayout(items, width, height, pearl = null) {
    const result=new Map();if(!items.length)return result;
    const footprint=s=>Math.max(70,s.size),footHeight=s=>s.size*.67+55;
    const columns=Math.max(1,Math.floor(width/(Math.max(60,...items.map(s=>footprint(s)))+18)));
    const rows=Math.ceil(items.length/columns),rowGap=Math.min(70,height*.25/Math.max(1,rows));
    const floor=s=>Math.max(s.minY,Math.min(s.maxY,height-footHeight(s)));
    items.forEach((s,i)=>{
      const count=Math.min(columns,items.length-Math.floor(i/columns)*columns);
      result.set(s.id,{x:clamp((i%columns+.5)*width/count-s.size/2,0,Math.max(0,width-s.size)),
        y:Math.max(s.minY,floor(s)-Math.floor(i/columns)*rowGap)});
    });
    if(!pearl || ![pearl.x,pearl.y,pearl.width,pearl.height].every(Number.isFinite) || pearl.width<=0 || pearl.height<=0)return result;
    const padding=16,left=clamp(pearl.x-padding,0,width),right=clamp(pearl.x+pearl.width+padding,0,width);
    const top=pearl.y-padding,bottom=pearl.y+pearl.height+padding;
    const overlaps=s=>{const p=result.get(s.id),extra=(footprint(s)-s.size)/2;
      return p.x-extra<right && p.x+s.size+extra>left && p.y+footHeight(s)>top && p.y<bottom;};
    if(!items.some(overlaps))return result;
    const widest=Math.max(...items.map(footprint));
    const banks=[{x:0,width:left},{x:right,width:Math.max(0,width-right)}].map(b=>({...b,columns:Math.floor((b.width+18)/(widest+18))}));
    const slots=[];
    for(let column=0;column<Math.max(...banks.map(b=>b.columns));column++)banks.forEach(b=>{if(column<b.columns)slots.push({x:b.x+(column+.5)*b.width/b.columns});});
    if(slots.length) {
      const rows=Math.ceil(items.length/slots.length),gap=Math.min(70,height*.25/Math.max(1,rows));
      items.forEach((s,i)=>result.set(s.id,{x:clamp(slots[i%slots.length].x-s.size/2,0,Math.max(0,width-s.size)),
        y:Math.max(s.minY,floor(s)-Math.floor(i/slots.length)*gap)}));
    } else {
      // On a narrow screen a large fish can rest above the shell instead.
      items.forEach(s=>{const p=result.get(s.id);if(overlaps(s))p.y=Math.max(s.minY,Math.min(p.y,top-footHeight(s)));});
    }
    return result;
  }
  function startTurn(f) {
    if (!f.turn && f.turnCooldown <= 0) f.turn = {elapsed:0,duration:2.6,from:f.angle,to:f.direction>0?180:0};
  }
  // Seasonal decoration uses front/back render layers, never a vertical
  // collision wall. The fish keeps its own route when crossing either decor.
  function step(fish, dt, width, height, random = Math.random) {
    if (!(dt > 0)) return;
    dt = Math.min(dt,.05);
    // Routes are individual. Nearby fish never trigger a turn or a slowdown.
    fish.forEach(f => {
      if(f.held) { f.cruise=0; return; }
      if(f.guidance) {
        if(f.guidance.speaking){f.cruise=0;return;}
        const t=f.guidance,maxX=Math.max(0,width-f.size),x=clamp(t.x,0,maxX),y=clamp(t.y,f.minY,f.maxY);
        const dx=x-f.x,dy=y-f.y,distance=Math.hypot(dx,dy),travel=Math.min(distance,300*dt,distance*3.2*dt);
        if(distance>.2){f.x+=dx/distance*travel;f.y+=dy/distance*travel;}
        f.guidanceArrived=distance<24;f.cruise=t.speaking?0:1;f.turn=null;
        const angle=distance<50 && Number.isFinite(t.facing)?t.facing:dx>=0?0:180;f.angle+=(angle-f.angle)*Math.min(1,dt*4);
        if(!t.speaking)f.phase+=dt*1.3;
        return;
      }
      if(f.bottomRest || f.hungry) {
        f.characterWalking=false;
        // Absent or hungry animals settle on the sand; neither changes camera depth.
        f.turn=null;f.cruise=0;f.routeTime=0;f.targetX=null;
        const approach=(from,to,rate)=>Math.abs(to-from)<.15?to:from+(to-from)*Math.min(1,dt*rate);
        f.x=clamp(approach(f.x,f.restX??f.x,.55),0,Math.max(0,width-f.size));
        f.y=clamp(approach(f.y,f.restY??f.maxY,.55),f.minY,f.maxY);
        f.angle=f.species==='crab'?0:approach(f.angle,f.direction>0?0:180,1.4);
        return;
      }
      f.turnCooldown=Math.max(0,(f.turnCooldown||0)-dt);
      const target=f.hover?0:1;
      f.cruise=(f.cruise??1)+(target-(f.cruise??1))*Math.min(1,dt*14);
      if(f.cruise<.002) { f.cruise=0; return; }
      f.depthTime=(f.depthTime??0)-dt*f.cruise;
      if(f.depthTime<=0) {f.depthTarget=(f.waterDepth??.5)<.5 ? .72+random()*.23 : .05+random()*.23;f.depthTime=24+random()*16;}
      const distance=f.waterDepth??.5;
      f.waterDepth=clamp(distance+clamp((f.depthTarget-distance)*.09,-.025,.025)*dt*f.cruise,0,1);
      const p=f.profile||normal;
      characterTravel(f,dt);
      const pulse=Math.pow((Math.sin(f.phase*3)+1)/2,3);
      const strokeFactor=f.anatomicalMotion && f.species==='octopus'?.7+pulse*.6:1;
      const speed=24*f.mood.speed*p.speed*f.cruise*strokeFactor*(f.characterWalking?1.35:1);
      const maxX=Math.max(0,width-f.size),edge=Math.min(25,maxX/4);
      if(f.anatomicalMotion && f.species==='jellyfish') {
        // Bell contractions lift the jellyfish. It drifts back down to a new
        // lane instead of adopting the horizontal fish-tail route.
        f.turn=null;f.angle=0;f.routeTime=(f.routeTime||0)-dt*f.cruise;
        if(f.targetY==null || Math.abs(f.targetY-f.y)<8 || f.routeTime<=0) {
          const span=f.maxY-f.minY,ascending=f.y>f.minY+span*.45;
          f.targetY=f.minY+span*(ascending?.08+random()*.2:.65+random()*.3);
          f.routeTime=35+random()*25;
        }
        // The current carries the jellyfish throughout the tank. Horizontal
        // and vertical destinations renew independently, so it never remains
        // confined to one small up/down column.
        f.jellyRouteTime=(f.jellyRouteTime||0)-dt*f.cruise;
        if(f.targetX==null || Math.abs(f.targetX-f.x)<8 || f.jellyRouteTime<=0) {
          let target=edge+random()*Math.max(0,maxX-2*edge);
          if(Math.abs(target-f.x)<maxX*.28)target=maxX*(f.x<maxX*.5?.68+random()*.27:.05+random()*.27);
          f.targetX=clamp(target,0,maxX);f.jellyRouteTime=35+random()*30;
        }
        f.phase+=dt*.7*f.mood.speed*f.cruise;
        const rise=f.targetY<f.y,vertical=(rise?6+14*pulse:3)*f.mood.speed*f.cruise;
        f.y+=clamp(f.targetY-f.y,-vertical*dt,vertical*dt);
        const horizontal=(10+8*pulse)*f.mood.speed*f.cruise;
        const velocity=clamp((f.targetX-f.x)*.12,-horizontal,horizontal);
        f.jellyVX=(f.jellyVX||0)+(velocity-(f.jellyVX||0))*Math.min(1,dt*1.5);
        f.x+=f.jellyVX*dt;
        f.x=clamp(f.x,0,maxX);f.y=clamp(f.y,f.minY,f.maxY);return;
      }
      f.routeTime=(f.routeTime||0)-dt*f.cruise;
      if(f.routeTime<=0 && !f.turn) {
        const first=f.targetX==null;
        // Keep the horizontal destination until reached; depth can vary during the journey.
        // Decorative objects do not change this destination or vertical speed.
        if(first || Math.abs(f.targetX-f.x)<18) f.targetX=first ? f.x+(f.direction>0?maxX-f.x:-f.x)*(.35+random()*.6) : edge+random()*Math.max(0,maxX-2*edge);
        const depth=p.depth>.75 ? .65+random()*.35 : .05+random()*.9;
        f.targetY=f.minY+(f.maxY-f.minY)*depth;
        f.routeTime=8+random()*12;
      }
      f.targetX=clamp(f.targetX??f.x,0,maxX);
      if(!f.turn && Math.abs(f.targetX-f.x)<18) f.routeTime=0;
      const atEdge=(f.direction>0 && f.x>=maxX-edge)||(f.direction<0 && f.x<=edge);
      const destinationBehind=(f.targetX-f.x)*f.direction < -Math.max(18,f.size*.25);
      if(f.species!=='crab'&&(atEdge || destinationBehind)) startTurn(f);
      if(f.species==='crab'){
        f.turn=null;f.angle=0;
        if((atEdge||destinationBehind)&&f.turnCooldown<=0){f.direction*=-1;f.turnCooldown=1;f.targetX=f.direction>0?maxX*.8:maxX*.2;f.routeTime=10;}
        f.lateralVelocity=(f.lateralVelocity??speed*f.direction)+(speed*f.direction-(f.lateralVelocity??speed*f.direction))*Math.min(1,dt*4);
        f.x+=dt*f.lateralVelocity;
      }else if(f.turn) {
        f.turn.elapsed+=dt*f.cruise;
        const t=clamp(f.turn.elapsed/f.turn.duration,0,1),ease=t*t*t*(t*(t*6-15)+10);
        f.angle=f.turn.from+(f.turn.to-f.turn.from)*ease;
        const heading=Math.cos(f.angle*Math.PI/180);
        f.x+=dt*speed*(.25+.75*Math.abs(heading))*heading;
        if(t===1) {
          f.direction=f.turn.to===180?-1:1;f.turn=null;f.turnCooldown=3;
          // An edge turn begins a new inward journey, never a repeated edge bounce.
          if(atEdge) {f.targetX=f.direction>0?maxX*.75:maxX*.25;f.routeTime=8+random()*12;}
        }
      } else f.x+=dt*speed*f.direction;
      f.phase+=dt*.7*f.mood.speed*f.cruise;
      const wanted=clamp(f.characterFloor?f.maxY:(f.targetY??f.anchorY)+Math.sin(f.phase)*p.bob,f.minY,f.maxY);
      const character=characters.has(f.species),verticalSpeed=character?22:Math.max(2,speed*.45);
      f.y+=clamp((wanted-f.y)*(character?.55:.22),-verticalSpeed,verticalSpeed)*dt;
      f.x=clamp(f.x,0,maxX);f.y=clamp(f.y,f.minY,f.maxY);
    });
  }
  // A transient reward pose, independent of points, growth and saved data.
  // Fast inflation, a short hold, then a soft return; total duration 5 seconds.
  function puffPose(elapsed) {
    const smooth=t=>t*t*(3-2*t);
    const amount=!Number.isFinite(elapsed)||elapsed<0||elapsed>=5?0:elapsed<.28?smooth(elapsed/.28):elapsed<4.25?1:1-smooth((elapsed-4.25)/.75);
    return {amount,x:1+.28*amount,y:1+.8*amount};
  }
  return {profile,layout,reflow,eggLayout,restLayout,step,perspective,turnPose,labelGap,labelAdjustment,puffPose};
});
