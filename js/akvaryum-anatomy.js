/* Small jointed image poses are the portable fallback for the 3D prototype. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumAnatomy=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const species=['clown','jellyfish','turtle','octopus'];
  const part=(clip,origin)=>({clip:'polygon('+clip+')',origin});
  const definitions={
    jellyfish:{parts:[part('0% 59%,100% 59%,100% 100%,0% 100%','50% 60%')],cutouts:['M0 61H100V100H0Z']},
    turtle:{parts:[
      part('64% 42%,75% 48%,69% 71%,52% 91%,38% 96%,35% 89%,46% 64%','66% 45%'),
      part('78% 46%,88% 46%,98% 67%,97% 82%,88% 81%,82% 65%','82% 49%')],
      cutouts:['M63 49L71 52L66 70L51 90L38 95L36 89L47 64Z','M83 51L89 50L97 68L96 81L89 79L83 65Z']},
    octopus:{parts:[
      part('0% 0%,29% 0%,46% 24%,57% 31%,53% 42%,28% 29%,0% 24%','52% 34%'),
      part('24% 53%,57% 42%,71% 48%,86% 100%,23% 100%','62% 49%')],
      cutouts:['M0 0H29L45 25L52 34L49 40L27 30L0 24Z','M26 59L55 48L66 53L84 100H23Z']},
    clown:{parts:[],cutouts:[]}
  };
  function mask(id){
    const cuts=definitions[id]?.cutouts;
    if(!cuts?.length)return 'none';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path fill="white" fill-rule="evenodd" d="M0 0H100V100H0Z '+cuts.join(' ')+'"/></svg>';
    return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
  }
  function pose(id,phase,moving){
    const t=Number.isFinite(phase)?phase:0,active=moving===true;
    const wave=active?Math.sin(t*3):0;
    if(id==='turtle')return {bodyX:1,bodyY:1,joints:[wave*7,-wave*5]};
    if(id==='octopus')return {bodyX:1,bodyY:1+(active?Math.sin(t*2.4)*.018:0),joints:[wave*3.5,Math.sin(active?t*3-.8:0)*4]};
    if(id==='jellyfish'){
      const pulse=active?Math.pow((wave+1)/2,3):0;
      return {bodyX:1-pulse*.065,bodyY:1+pulse*.04,joints:[wave*2.5]};
    }
    return {bodyX:1,bodyY:1,joints:[]};
  }
  function routeFactor(id,phase){
    const pulse=Math.pow((Math.sin(phase*3)+1)/2,3);
    return id==='jellyfish'?.35+pulse*1.3:id==='octopus'?.7+pulse*.6:1;
  }
  return {species:Object.freeze(species),definitions,mask,pose,routeFactor};
});
