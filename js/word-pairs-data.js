(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordPairsData=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const opposite=[
    ['uzun','kısa','İplerden biri uzun, diğeri kısa.','Boyunu düşün.'],
    ['büyük','küçük','Büyük kutunun yanında küçük bir kutu var.','Büyüklüklerini karşılaştır.'],
    ['sıcak','soğuk','Çorba sıcak, ayran soğuk.','Sıcaklığı düşün.'],
    ['açık','kapalı','Açık kapıyı kapatınca kapı kapalı olur.','Kapının durumunu düşün.'],
    ['eski','yeni','Eski defterim bitti, yeni bir defter aldım.','Kullanılma zamanını düşün.'],
    ['hızlı','yavaş','Tavşan hızlı, kaplumbağa yavaş ilerledi.','İlerleme hızını düşün.'],
    ['ağır','hafif','Taş ağır, tüy hafif.','Kütlelerini karşılaştır.'],
    ['ince','kalın','İnce kalemin yanında kalın bir kalem var.','Kalınlığını düşün.'],
    ['dolu','boş','Dolu bardağı boşaltınca bardak boş kalır.','İçinde bir şey var mı?'],
    ['kirli','temiz','Kirli gömleği yıkadım, gömlek temiz oldu.','Yıkamadan önce ve sonrasını düşün.'],
    ['ıslak','kuru','Islak havluyu astım, sonra kuru oldu.','Suyu olup olmadığını düşün.'],
    ['uzak','yakın','Okul evime yakın, müze ise uzak.','Aradaki mesafeyi düşün.'],
    ['alt','üst','Çekmecenin alt ve üst bölümleri var.','Birbirine ters iki yön.'],
    ['iç','dış','Kutunun iç ve dış yüzünü boyadık.','Kutunun iki farklı tarafını düşün.'],
    ['kolay','zor','Bir soru kolay, diğer soru zor geldi.','Yaparken ne kadar uğraşıyorsun?'],
    ['gece','gündüz','Gündüz güneş, gece yıldızlar görünür.','Günün aydınlık ve karanlık bölümleri.'],
    ['ileri','geri','İki adım ileri, bir adım geri gittim.','Hareket yönünü düşün.'],
    ['sağ','sol','Sağ elimle ve sol elimle alkışladım.','İki elinin yönünü düşün.'],
    ['yüksek','alçak','Yüksek rafın altında alçak bir raf var.','Yerden ne kadar yüksekte?'],
    ['az','çok','Bir sepette az, diğerinde çok elma var.','Miktarlarını karşılaştır.'],
    ['erken','geç','Bugün erken, dün geç uyandım.','Zamanını karşılaştır.'],
    ['önce','sonra','Önce ellerimi yıkadım, sonra yemek yedim.','Olayların sırasını düşün.'],
    ['sert','yumuşak','Taş sert, pamuk yumuşak.','Dokununca nasıl hissediyorsun?'],
    ['geniş','dar','Geniş yoldan dar bir sokağa girdik.','Yolun genişliğini düşün.']
  ];
  const oppositeMore=[
    ['taze','bayat','Fırından taze ekmek aldık; eski ekmek bayat olmuş.','Yeni hazırlanmış mı?'],
    ['doğal','yapay','Doğal çiçeğin yanında yapay bir çiçek duruyor.','Doğada mı oluşmuş, insan mı yapmış?'],
    ['ucuz','pahalı','Ucuz kalem, pahalı kalemden daha az para tutuyor.','Fiyatını karşılaştır.'],
    ['başlangıç','bitiş','Yarışın başlangıç ve bitiş çizgileri var.','Bir işin ilk ve son noktasını düşün.'],
    ['seyrek','sık','Bir bahçede ağaçlar seyrek, diğerinde sık dikilmiş.','Aralarında çok mu, az mı boşluk var?'],
    ['yararlı','zararlı','Temiz su içmek yararlı, kirli su içmek zararlı olabilir.','Fayda mı, zarar mı veriyor?'],
    ['acı','tatlı','Limonata tatlı, acı biberin tadı acı.','Yiyeceğin tadını düşün.'],
    ['düz','eğri','Cetvelle düz bir çizgi, sonra eğri bir çizgi çizdim.','Çizginin biçimini düşün.'],
    ['aşağı','yukarı','Balon yukarı çıktı, yaprak aşağı indi.','Hangi yöne gidiyor?'],
    ['dağınık','düzenli','Dağınık masayı topladım; artık düzenli.','Eşyalar yerli yerinde mi?']
  ];
  const synonym=[
    ['siyah','kara','Siyah kediye kara kedi de diyebiliriz.'],
    ['beyaz','ak','Beyaz kar için ak kar da denir.'],
    ['yıl','sene','Bir yıl, bir sene demektir.'],
    ['cevap','yanıt','Sorunun cevabını, yani yanıtını buldum.'],
    ['hediye','armağan','Arkadaşıma bir hediye, bir armağan verdim.'],
    ['isim','ad','Bu çiçeğin ismi, yani adı papatya.'],
    ['kelime','sözcük','Yeni bir kelime, yeni bir sözcük öğrendim.'],
    ['cümle','tümce','Üç sözcükle bir cümle, bir tümce kurdum.'],
    ['doktor','hekim','Doktor, yani hekim hastayı muayene etti.'],
    ['doğa','tabiat','Doğayı, yani tabiatı koruyalım.'],
    ['nehir','ırmak','Köprünün altından bir nehir, bir ırmak akıyor.'],
    ['sonbahar','güz','Sonbahara güz de denir.'],
    ['rüzgâr','yel','Rüzgâr, yani yel yaprakları uçurdu.'],
    ['öykü','hikâye','Yatmadan önce bir öykü, bir hikâye okudum.'],
    ['konuk','misafir','Evimize bir konuk, bir misafir geldi.'],
    ['anı','hatıra','Geziden güzel bir anı, bir hatıra kaldı.'],
    ['yarar','fayda','Kitap okumanın bize yararı, faydası var.'],
    ['sorun','problem','Bu sorunu, bu problemi birlikte çözebiliriz.'],
    ['görev','vazife','Bitkileri sulamak benim görevim, vazifem.'],
    ['sevinç','neşe','Güzel haber bize sevinç, neşe verdi.'],
    ['uzak','ırak','Uzak köy için ırak köy de denir.'],
    ['zengin','varlıklı','Zengin bir kişiye varlıklı da denir.'],
    ['fakir','yoksul','Fakir bir kişiye yoksul da denir.'],
    ['dil','lisan','Türkçe bir dil, bir lisandır.']
  ];
  const synonymMore=[
    ['neden','sebep','Gecikmemin nedenini, sebebini açıkladım.'],
    ['amaç','gaye','Amacımız, gayemiz birlikte öğrenmek.'],
    ['yöntem','metot','Soruyu farklı bir yöntemle, bir metotla çözdük.'],
    ['koşul','şart','Oyuna katılmanın bir koşulu, bir şartı var.'],
    ['olanak','imkân','Kütüphanede araştırma olanağı, imkânı bulduk.'],
    ['olasılık','ihtimal','Yağmur yağma olasılığı, ihtimali var.'],
    ['özlem','hasret','Arkadaşıma özlem, hasret duydum.'],
    ['kuşku','şüphe','Bu konuda kuşkum, şüphem kalmadı.'],
    ['serüven','macera','Kitaptaki serüven, macera çok heyecanlıydı.'],
    ['kılavuz','rehber','Gezi kılavuzu, rehberi bize yolu gösterdi.'],
    ['bellek','hafıza','Bu oyun bellek, hafıza çalışması sunar.'],
    ['yüzyıl','asır','Yüz yıla bir yüzyıl, bir asır denir.']
  ];
  function rows(kind,grade){
    const base=kind==='puzzle'?opposite:synonym,more=kind==='puzzle'?oppositeMore:synonymMore;
    return (Number(grade)>=3?base.concat(more):base).map((r,i)=>({id:(kind==='puzzle'?'z':'e')+i,a:r[0],b:r[1],example:r[2],tip:r[3]||'Bu cümlede aynı anlamı taşıyan sözcüğü düşün.'}));
  }
  const worlds=[
    {id:'forest',name:'Saklı Orman',image:'/assets/word-worlds/sakli-orman.webp',color:'#1d8f79'},
    {id:'ocean',name:'Mercan Koyu',image:'/assets/word-worlds/mercan-koyu.webp',color:'#148eb5'},
    {id:'space',name:'Yıldız Bahçesi',image:'/assets/word-worlds/yildiz-bahcesi.webp',color:'#7850d9'}
  ];
  return {rows,worlds};
});
