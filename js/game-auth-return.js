(function() {
  'use strict';
  const PATH = '/oyun/matematik-vadisi.html', KEY = 'kemal_game_return_v1';
  function read() {
    try { const item=JSON.parse(sessionStorage.getItem(KEY)||'null');return item?.path===PATH && item.expires>Date.now() ? PATH : null; } catch (_) {return null;}
  }
  const next=new URLSearchParams(window.location.search).get('next');
  if(next===PATH) {try {sessionStorage.setItem(KEY,JSON.stringify({path:PATH,expires:Date.now()+3600000}));}catch(_){}}
  window.kemalGameAuthReturn={
    take:function(){const path=read();try{sessionStorage.removeItem(KEY);}catch(_){}return path;},
  };
})();
