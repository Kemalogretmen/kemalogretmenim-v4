/* One notice per section and version on this browser. */
(function(){
  'use strict';
  const notes={
    aquarium:['Sınıf Akvaryumu','Baloncuk Avı’nda 10 oyun var. Sınıfınızla Kayıp Gemi’yi inşa edebilir, Resif Postası’nı açabilir ve doğum günü balonlarını patlatabilirsiniz.'],
    labs:['Fen Laboratuvarı','Yaylarla kuvveti deneyin. Hücre Laboratuvarı’nda mikroskopla başlayın, bitki ve hayvan hücrelerini karşılaştırın.'],
    reading:['Okuma ve Anlama','Okuma ve Anlama Akademisi’ni keşfedin. Okuma görünümü, e-kitaplar, hece çalışmaları ve karneler de güncellendi.'],
    agenda:['Öğretmen Ajandası','Yeni çalışma masasından haftalık planınızı hazırlayıp önizleyebilir, yazdırabilir veya paylaşabilirsiniz.'],
    exams:['Sınav Merkezi','Sınav çalışma alanı, soru ve seçenek düzenleme ile sonuç ve kazanım analizi yenilendi.'],
    panels:['Hesap panelleri','Okuma karnesi ve sınav sonuçlarına yeni bağlantılar eklendi. Karnede otomatik gösterim temposu ayrı gösteriliyor.'],
    time:['Saat ve Sayaç','Saat, sayaç ve arka plan seçenekleri tek ekranda toplandı. Kullanacağınız aracı seçip tahtada açabilirsiniz.'],
    math:['Matematik Araçları','Birim Küpler, Yapı Atölyesi, Cisim Açılımları ve Simetri Aynası, Geometri Atölyeleri menüsünden açılıyor.'],
    admin:['Yönetim','Uzun yönetim menülerinde kaydırma düzeltildi. Google Reklamları’na ana ekrandaki karttan ve ortak admin menüsünden ulaşabilirsiniz. Okuma Akademisi için içerik yönetimi de eklendi.']
  };
  const section=document.currentScript?.dataset.releaseSection,note=notes[section];
  // Parent and public aquarium links use a separate viewing experience.
  if(!note||/(?:^|[?&])(?:izle|cocuk)(?:=|&|$)/.test(location.search))return;
  const key='kemal:release:2026-11-19:'+section;
  let gateObserver;
  function show(){
    if(document.hidden)return;
    if(section==='aquarium'&&document.body.classList.contains('access-pending')){
      if(!gateObserver){
        gateObserver=new MutationObserver(show);
        gateObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
      }
      return;
    }
    gateObserver?.disconnect();
    document.removeEventListener('visibilitychange',show);
    let store;
    for(const name of ['localStorage','sessionStorage']){
      try{
        store=window[name];
        if(store.getItem(key))return;
        store.setItem(key,'1');
        break;
      }catch(_){store=null;}
    }
    if(!store)return;
    const box=document.createElement('aside');box.className='site-release-note';box.setAttribute('aria-label','Güncelleme notu');
    const copy=document.createElement('div');copy.setAttribute('role','status');
    const heading=document.createElement('strong');heading.textContent=note[0]+' · Yenilikler';
    const description=document.createElement('p');description.textContent=note[1];
    const close=document.createElement('button');close.type='button';close.className='site-release-dismiss';close.setAttribute('aria-label','Güncelleme notunu kapat');close.textContent='×';
    close.addEventListener('click',()=>box.remove());
    copy.append(heading,description);box.append(copy,close);document.body.append(box);
  }
  document.addEventListener('visibilitychange',show);
  show();
})();
