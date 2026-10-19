/* Short, local aquarium conversations. No services, scores or student data. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumSocial=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const encouragements=Object.freeze([
    'Birlikte yeniden deneyelim, başarabilirsin!',
    'Bir nefes alalım, sonra yeniden deneyelim.',
    'Küçük adımlarla daha dikkatli olabiliriz.',
    'Yanındayım, birlikte bir çözüm deneyelim.',
    'Hata yapmak öğrenmenin bir parçası.',
    'Yeni bir deneme, yeni bir başlangıç!',
    'Biraz yavaşlayıp yeniden deneyebilirsin.',
    'Düşünmek için kendine biraz zaman ver.',
    'Nazik sözler arkadaşlığımızı güçlendirir.',
    'Sırayla dinleyelim, birbirimizi anlayalım.',
    'Bir sonraki adımda daha dikkatli olabilirsin.',
    'Yardım istemek güzel bir başlangıçtır.',
    'Birlikte düşünelim, başka ne deneyebiliriz?',
    'Çaban değerli, yeniden başlayabiliriz.',
    'Önce durup düşünelim, sonra devam edelim.',
    'Bugün yeniden denemek için güzel bir gün!'
  ]);
  const greetings=Object.freeze([
    ['👋','😊'],['🙌','⭐'],['🤗','💛'],['🌟','😄'],
    ['🐚','🐠'],['🌈','☀️'],['💙','💚'],['🙂','✋'],
    ['🤝','🌸'],['😎','🎈'],['🐬','🐟'],['🦋','🌻']
  ].map(Object.freeze));
  function deck(items,random){
    let bag=[],previous;
    return ()=>{
      if(!bag.length){
        bag=[...items];for(let i=bag.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[bag[i],bag[j]]=[bag[j],bag[i]];}
        if(bag.length>1&&bag[bag.length-1]===previous)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
      }
      return previous=bag.pop();
    };
  }
  function create(random=Math.random){return {encouragement:deck(encouragements,random),greeting:deck(greetings,random)};}
  return {create,encouragements,greetings};
});
