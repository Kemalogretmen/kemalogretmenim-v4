(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AquariumParentAccess=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,80);
  function message(access){
    return 'Merhaba,\n'+clean(access.studentName)+' için '+clean(access.className)+' Sınıf Akvaryumu veli erişimi:\n\nVeli kodu: '+access.code+'\nBağlantı: '+access.url+'\n\nBu kod yalnızca ilgili veliye özeldir. Lütfen başkalarıyla paylaşmayın.';
  }
  function copyText(access,format='message'){
    return format==='code'?access.code:format==='url'?access.url:message(access);
  }
  return {message,copyText};
});
