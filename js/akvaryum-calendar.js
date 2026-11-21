/* Dates are evaluated in Istanbul, consistently with the weekly newspaper. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumCalendar=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'});
  const day=date=>dateFormat.format(date??new Date());
  function shift(value,days){
    const date=new Date(value+'T12:00:00Z');
    if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==value)return '';
    date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  }
  const fixed={
    '01-01':['newyear','✨','Mutlu yıllar!','Yeni yıl hepimize sağlık, mutluluk ve güzel keşifler getirsin.'],
    '04-23':['children','🇹🇷','23 Nisan kutlu olsun!','Ulusal Egemenlik ve Çocuk Bayramı’nı neşeyle kutluyoruz.'],
    '05-01':['labour','🌿','Emek ve Dayanışma Günümüz kutlu olsun!','Birlikte çalışmanın ve dayanışmanın değerini hatırlıyoruz.'],
    '05-19':['youth','🇹🇷','19 Mayıs kutlu olsun!','Atatürk’ü Anma, Gençlik ve Spor Bayramı’mız kutlu olsun.'],
    '07-15':['unity','🇹🇷','15 Temmuz Demokrasi ve Millî Birlik Günü','Birlik ve dayanışmanın önemini hatırlıyoruz.'],
    '08-30':['victory','🇹🇷','30 Ağustos Zafer Bayramı kutlu olsun!','Büyük Zafer’in yıl dönümünü kutluyoruz.'],
    '10-29':['republic','🇹🇷','Cumhuriyet Bayramımız kutlu olsun!','29 Ekim’de Cumhuriyetimizin kuruluşunu kutluyoruz.'],
    '11-10':['remembrance','🇹🇷','Atatürk’ü saygıyla anıyoruz','10 Kasım Atatürk’ü Anma Günü.'],
    '11-24':['teachers','🌷','Öğretmenler Günümüz kutlu olsun!','Tüm öğretmenlerimize emekleri için teşekkür ederiz.'],
    '12-31':['newyear','✨','Mutlu yıllar!','Yeni yıl hepimize sağlık, mutluluk ve güzel keşifler getirsin.']
  };
  // Diyanet's published official holiday tables for 2025–2035.
  // https://vakithesaplama.diyanet.gov.tr/icerik.php?icerik=158
  const ramazan=['2025-03-30','2026-03-20','2027-03-09','2028-02-26','2029-02-14','2030-02-04','2031-01-24','2032-01-14','2033-01-02','2033-12-23','2034-12-12','2035-12-01'];
  const kurban=['2025-06-06','2026-05-27','2027-05-16','2028-05-05','2029-04-24','2030-04-13','2031-04-02','2032-03-22','2033-03-11','2034-03-01','2035-02-18'];
  const movable=new Map();
  for(const [dates,length,event] of [
    [ramazan,3,['ramazan','🌙','Ramazan Bayramınız kutlu olsun!','Sevdiklerinizle huzurlu ve güzel bir bayram dileriz.']],
    [kurban,4,['kurban','🌙','Kurban Bayramınız kutlu olsun!','Sevdiklerinizle huzurlu ve güzel bir bayram dileriz.']]
  ])for(const start of dates)for(let i=0;i<length;i++)movable.set(shift(start,i),event);
  function eventsOn(date){
    return [fixed[date.slice(5)],movable.get(date)].filter(Boolean).map(([id,icon,title,body])=>({id,icon,title,body,date}));
  }
  function messages(start,end){
    const result=new Map();
    for(let i=0,date=start;i<7&&date&&date<=end;i++,date=shift(date,1)){
      for(const event of eventsOn(date))if(!result.has(event.id))result.set(event.id,event);
    }
    return [...result.values()];
  }
  function sceneMessages(date){
    const active=eventsOn(date);
    const upcoming=eventsOn(shift(date,1)).filter(event=>!active.some(t=>t.id===event.id));
    return active.length?active:upcoming.map(event=>({...event,upcoming:true}));
  }
  function birthdayOn(birthday,start,end){
    if(!birthday||!Number.isInteger(birthday.month)||!Number.isInteger(birthday.day))return '';
    for(let i=0,date=start;i<7&&date&&date<=end;i++,date=shift(date,1)){
      if(+date.slice(5,7)===birthday.month&&+date.slice(8,10)===birthday.day)return date;
    }
    return '';
  }
  return {day,shift,messages,sceneMessages,birthdayOn};
});
