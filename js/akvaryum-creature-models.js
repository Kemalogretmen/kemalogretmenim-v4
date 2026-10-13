/* Small procedural 3D aquarium models. Units are shared across species.
 * makeModel(id): {parts:[{id,parent,origin,mesh:{vertices,indices}}],...}
 * vertices interleave XYZ, normal XYZ, RGB; pose gives local joint rotations
 * (radians) and scale. Parts inherit their parent's articulated transform. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.AquariumCreatureModels=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const species=['clown','jellyfish','turtle','octopus'];
  const colors={orange:[1,.36,.055],white:[1,.96,.88],black:[.09,.09,.12],
    green:[.31,.63,.33],shell:[.19,.39,.22],pink:[.93,.36,.59],purple:[.51,.31,.78]};
  function mesh(){return {vertices:[],indices:[]};}
  function add(target,source){
    const offset=target.vertices.length/9;
    target.vertices.push(...source.vertices);
    source.indices.forEach(i=>target.indices.push(i+offset));
  }
  function ellipsoid(center,radii,color,segments=16,rings=10,colorAt){
    const m=mesh();
    for(let y=0;y<=rings;y++){
      const a=y/rings*Math.PI;
      for(let x=0;x<=segments;x++){
        const b=x/segments*Math.PI*2;
        const q=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];
        const n=q.map((v,i)=>v/radii[i]); const len=Math.hypot(...n)||1;
        const c=colorAt?colorAt(q):color;
        m.vertices.push(...q.map((v,i)=>center[i]+v*radii[i]),...n.map(v=>v/len),...c);
      }
    }
    for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){
      const i=y*(segments+1)+x;
      m.indices.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);
    }
    return m;
  }
  // Flat organic fins, with rounded thickness; roots remain at local zero.
  function fin(length,width,thickness,color,direction=-1){
    return ellipsoid([direction*length*.43,0,0],[length*.56,width,thickness],color,12,6);
  }
  // Tapered tube hangs from its joint, allowing descendants to curl naturally.
  function tube(length,radius,color){
    const m=mesh(),n=8;
    for(let y=0;y<=3;y++)for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2,r=radius*(1-y/3*.35),c=Math.cos(a),s=Math.sin(a);
      m.vertices.push(c*r,-length*y/3,s*r,c,0,s,...color);
    }
    for(let y=0;y<3;y++)for(let i=0;i<n;i++){
      const k=y*(n+1)+i;m.indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);
    }
    return m;
  }
  function eyes(body,x,y,z,size=.09){
    for(const side of [-1,1]){
      add(body,ellipsoid([x,y,side*z],[size,size*1.1,size*.55],colors.white,10,6));
      add(body,ellipsoid([x+.02,y,side*(z+size*.48)],[size*.48,size*.6,size*.22],colors.black,10,6));
      add(body,ellipsoid([x+.035,y+.025,side*(z+size*.63)],[size*.14,size*.16,size*.08],colors.white,8,4));
    }
  }
  function makeModel(id){
    if(definitions[id])return definitions[id];
    if(!species.includes(id))return null;
    const parts=[],body=mesh();
    const part=(name,m,origin=[0,0,0],parent=null)=>parts.push({id:name,parent,origin,mesh:m});
    if(id==='clown'){
      add(body,ellipsoid([.05,0,0],[.76,.37,.29],colors.orange,24,12,q=>{
        const x=.05+q[0]*.76;
        const band=Math.min(Math.abs(x-.43),Math.abs(x+.04),Math.abs(x+.48));
        return band<.058?colors.white:band<.084?colors.black:colors.orange;
      }));
      add(body,ellipsoid([.73,-.065,0],[.1,.09,.13],colors.orange));
      eyes(body,.51,.1,.235,.09);
      add(body,ellipsoid([-.04,.36,0],[.43,.105,.042],colors.orange,12,6));
      add(body,ellipsoid([-.14,-.31,0],[.3,.09,.045],colors.orange,12,6));
      part('body',body);
      part('tail',ellipsoid([-.16,0,0],[.22,.29,.047],colors.orange,12,8),[-.68,0,0],'body');
      for(const side of [-1,1])part('pectoral'+side,fin(.28,.11,.035,colors.orange),[.22,-.12,side*.26],'body');
    }else if(id==='turtle'){
      add(body,ellipsoid([-.15,.04,0],[.66,.28,.44],colors.shell,20,10,q=>{
        const angle=Math.atan2(q[2],q[0]);
        return Math.abs(Math.sin(angle*3))<.13||Math.abs(q[1]-.53)<.065?[.36,.55,.28]:colors.shell;
      }));
      add(body,ellipsoid([-.15,-.1,0],[.65,.105,.43],[.71,.73,.39],16,6));
      add(body,ellipsoid([.62,0,0],[.28,.2,.19],colors.green));
      add(body,ellipsoid([.36,-.03,0],[.22,.13,.15],colors.green));
      eyes(body,.71,.065,.165,.065);
      part('body',body);
      for(const side of [-1,1]){
        // Broad front flippers point sideways and aft, and pivot at shoulder.
        part('front'+side,ellipsoid([-.15,-.08,side*.23],[.36,.055,.29],colors.green,12,6),[.23,-.03,side*.3],'body');
        part('rear'+side,ellipsoid([-.13,-.03,side*.12],[.23,.055,.16],colors.green,12,6),[-.59,-.07,side*.27],'body');
      }
    }else if(id==='jellyfish'){
      // Bell is a real capped dome; shorter lower half resembles a skirt.
      add(body,ellipsoid([0,.29,0],[.56,.36,.44],colors.pink,20,12,q=>q[1]<-.45?[.72,.27,.52]:[.97,.52,.72]));
      add(body,ellipsoid([0,.02,0],[.58,.055,.46],colors.pink,20,6));
      eyes(body,.18,.27,.39,.07);part('body',body);
      for(let i=0;i<6;i++){
        const a=i/6*Math.PI*2;let parent='body';
        for(let j=0;j<3;j++){
          const name='tentacle'+i+'_'+j;
          part(name,tube(.24,.027*(1-j*.22),[.79,.42,.7]),j?[0,-.24,0]:[Math.cos(a)*.35,-.02,Math.sin(a)*.27],parent);parent=name;
        }
      }
    }else{
      add(body,ellipsoid([0,.28,0],[.42,.43,.34],colors.purple,20,12));
      add(body,ellipsoid([.05,-.01,0],[.36,.18,.29],colors.purple));
      eyes(body,.2,.19,.29,.085);part('body',body);
      for(let i=0;i<8;i++){
        const a=i/8*Math.PI*2;let parent='body';
        for(let j=0;j<3;j++){
          const name='arm'+i+'_'+j,m=tube(.22,.073*(1-j*.26),colors.purple);
          // Pale sucker rows are part of the arm geometry, never extra draws.
          for(let k=1;k<=2;k++)add(m,ellipsoid([.01,-.22*k/3,.068*(1-j*.26)],[.024,.018,.012],[.88,.64,.82],6,4));
          part(name,m,j?[0,-.22,0]:[Math.cos(a)*.29,-.05,Math.sin(a)*.23],parent);parent=name;
        }
      }
    }
    return definitions[id]={species:id,parts,triangleCount:parts.reduce((n,p)=>n+p.mesh.indices.length/3,0),bounds:[-1.2,1.2,-1.05,1.05,-.9,.9]};
  }
  function pose(id,phase,moving){
    const model=definitions[id] || makeModel(id);if(!model)return null;
    const t=Number.isFinite(phase)?phase:0,active=moving!==false;
    const p={};model.parts.forEach(part=>p[part.id]={rx:0,ry:0,rz:0,sx:1,sy:1,sz:1});
    if(id==='clown'){
      p.tail.ry=active?Math.sin(t*7)*.4:0;
      for(const side of [-1,1]){p['pectoral'+side].ry=side*(.3+(active?Math.sin(t*7+side)*.3:0));}
    }else if(id==='turtle'){
      for(const side of [-1,1]){
        p['front'+side].rx=side*(active?Math.sin(t*2.8)*.48:0);
        p['front'+side].ry=side*(active?Math.cos(t*2.8)*.18:0);
        p['rear'+side].rx=side*(active?Math.sin(t*2.8+.8)*.15:0);
      }
    }else if(id==='jellyfish'){
      const pulse=active?Math.pow((Math.sin(t*3)+1)/2,3):0;
      p.body.sx=p.body.sz=1-pulse*.13;p.body.sy=1+pulse*.08;
      for(let i=0;i<6;i++)for(let j=0;j<3;j++){
        const q=p['tentacle'+i+'_'+j];q.rz=active?Math.sin(t*3-j*.65+i*.8)*.12:0;
        q.rx=active?Math.cos(t*3-j*.65+i)*.1:0;
      }
    }else{
      p.body.sy=active?1+Math.sin(t*2.4)*.035:1;
      for(let i=0;i<8;i++)for(let j=0;j<3;j++){
        const a=i/8*Math.PI*2,wave=active?Math.sin(t*2.2-j*.8+i*.65)*.19:0;
        const curl=.3+j*.18+wave,q=p['arm'+i+'_'+j];
        q.rz=Math.cos(a)*curl;q.rx=-Math.sin(a)*curl;
      }
    }
    return p;
  }
  // Each cached mesh is immutable by convention; callers upload it only once.
  const definitions=Object.create(null);
  return {species:Object.freeze(species),makeModel,pose,metadata:{version:1,style:'stylized low-poly',phaseUnit:'seconds',vertexStride:9}};
});
