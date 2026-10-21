/* Small jointed image poses are the portable fallback for the 3D prototype. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumAnatomy=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const modelSpecies=['clown','jellyfish','turtle','octopus'];
  const species=[...modelSpecies,'ray','boxfish','bannerfish','batfish','cleanershrimp','hermitcrab','cuttlefish'];
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
    clown:{parts:[],cutouts:[]},
    ray:{parts:[
      part('35% 5%,44% 13%,60% 39%,72% 55%,70% 65%,56% 67%,42% 61%','65% 61%'),
      part('76% 47%,86% 43%,97% 20%,100% 38%,97% 66%,84% 61%','84% 57%'),
      part('0% 45%,15% 54%,32% 60%,43% 59%,44% 65%,29% 65%,12% 58%,0% 49%','41% 62%')],
      cutouts:['M36 7L44 14L60 40L70 55L69 64L56 66L43 61Z','M77 48L86 44L97 22L99 38L96 65L84 60Z','M0 46L15 55L32 61L42 60L43 64L29 64L12 57L0 49Z']},
    boxfish:{parts:[part('57% 42%,74% 41%,83% 61%,69% 68%,57% 58%','69% 47%')],cutouts:['M57 42L74 41L83 61L69 68L57 58Z']},
    bannerfish:{parts:[part('73% 45%,83% 47%,91% 63%,85% 72%,73% 62%','79% 48%')],cutouts:['M73 45L83 47L91 63L85 72L73 62Z']},
    batfish:{parts:[part('67% 44%,76% 46%,84% 65%,75% 74%,65% 62%','72% 47%')],cutouts:['M67 44L76 46L84 65L75 74L65 62Z']},
    cleanershrimp:{parts:[
      part('35% 63%,58% 61%,67% 73%,62% 98%,36% 98%','54% 65%'),
      part('61% 60%,77% 55%,88% 77%,88% 96%,65% 83%','68% 61%')],
      cutouts:['M35 63L58 61L67 73L62 98H36Z','M61 60L77 55L88 77V96L65 83Z']},
    hermitcrab:{parts:[
      part('39% 67%,60% 58%,71% 69%,66% 94%,39% 94%','59% 65%'),
      part('68% 60%,84% 59%,95% 80%,90% 92%,67% 79%','77% 64%')],
      cutouts:['M39 67L60 58L71 69L66 94H39Z','M68 60L84 59L95 80L90 92L67 79Z']},
    cuttlefish:{parts:[
      part('0% 56%,61% 58%,70% 71%,54% 85%,0% 76%','40% 60%'),
      part('80% 49%,100% 49%,100% 87%,83% 82%,74% 66%','82% 54%')],
      cutouts:['M0 56L61 58L70 71L54 85L0 76Z','M80 49H100V87L83 82L74 66Z']}
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
    if(id==='ray'){
      const near=active?Math.sin(t*2.4):0,far=active?Math.sin(t*2.4+.35):0;
      return {bodyX:1,bodyY:1,joints:[near*16,-far*14,active?Math.sin(t*2.6-.6)*7:0],jointScaleY:[1+near*.17,1-far*.14,1]};
    }
    if(id==='turtle')return {bodyX:1,bodyY:1,joints:[wave*7,-wave*5]};
    if(['boxfish','bannerfish','batfish'].includes(id))return {bodyX:1,bodyY:1,joints:[wave*(id==='boxfish'?5:3)]};
    if(id==='cleanershrimp')return {bodyX:1,bodyY:1,joints:[wave*4.5,-wave*4.5]};
    if(id==='hermitcrab')return {bodyX:1,bodyY:1,joints:[wave*3,-wave*3]};
    if(id==='cuttlefish')return {bodyX:1,bodyY:1,joints:[wave*1.8,active?Math.sin(t*2.4+.6)*2.5:0]};
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
  return {species:Object.freeze(species),modelSpecies:Object.freeze(modelSpecies),definitions,mask,pose,routeFactor};
});
