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
  const hungerReminders=Object.freeze(['Ben açım, beni besle lütfen.','Yem zamanım geldi, beni besler misin?','Biraz yemle yeniden canlanabilirim.']);
  function createHungerSchedule(random=Math.random){
    let next=60000;const seen=new Map();
    function reset(now=0){next=now+60000;seen.clear();}
    function pick(now,candidates){
      if(now<next)return null;
      const available=candidates.filter(s=>now-(seen.get(s.id)??-Infinity)>=600000);
      if(!available.length){next=now+30000;return null;}
      available.sort((a,b)=>(seen.get(a.id)??-Infinity)-(seen.get(b.id)??-Infinity));
      const chosen=available[0];seen.set(chosen.id,now);next=now+180000+Math.max(0,Math.min(1,random()))*120000;
      return chosen;
    }
    return {reset,pick,defer(now=0){next=Math.max(next,now+60000);}};
  }
  const praises=Object.freeze(['Çabanı fark ettim, güzel bir adım attın!','Yeniden denedin, işte bu çok değerli!','Küçük adımlarınla ilerliyorsun!','Bugünkü emeğine kocaman bir teşekkür!','Öğrenirken gösterdiğin çaba harika!','Bir güzel adım daha, birlikte devam!','Paylaştığın emek sınıfımıza renk katıyor!','Kendi yolunda ilerlemene sevindim!']);
  const invitations=Object.freeze(['Şimdi seni dinliyoruz!','Söz sende, birlikte düşünelim!','Fikrini bizimle paylaşmak ister misin?','Hazırsan seni dinlemeye hazırız!']);
  const milestones=Object.freeze(['Birlikte güzel bir yol aldık!','Her küçük katkı bizi ilerletiyor!','Birbirimize destek olarak devam edelim!','Hedefimize adım adım yaklaşıyoruz!']);
  function create(random=Math.random){return {encouragement:deck(encouragements,random),greeting:deck(greetings,random),hunger:deck(hungerReminders,random),praise:deck(praises,random),invitation:deck(invitations,random),milestone:deck(milestones,random)};}
  return {create,encouragements,greetings,hungerReminders,praises,invitations,milestones,createHungerSchedule};
});
