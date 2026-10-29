(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.GameCatalog=factory();
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const covers={
    'onluk-basket.html':'onluk-basket.webp',
    'carpim-kanatlari.html':'carpim-kanatlari.webp',
    'esini-bul-hafiza.html':'esini-bul-hafiza.webp',
    'kizma_birader.html':'kizma-birader.webp'
  };
  // Özgün vektör sahneleri: başlıklar görsellere gömülmez, erişilebilir metin olarak kalır.
  const scenes={
    'hece-craft-tunel-macerasi.html':['mine','HE','CE','#173e47','#4fa78c'],
    'masal-makinistleri.html':['book','Bir','varmış','#bfa1ee','#f7d2be'],
    'pizza-partisi.html':['pizza','½','¼','#ffc79b','#fff0bf'],
    'doga-dedektifleri.html':['nature','İz','bul','#74c6a1','#d4eebe'],
    'dikkat-dedektifi.html':['detective','?','★','#c0a4ec','#f7d0d3'],
    'matematik-vadisi.html':['valley','+','×','#75c3bd','#c9ecbe'],
    'bilgi-duellosu.html':['duel','A','B','#9eafea','#d4c9f5'],
    'sesli-balonlar.html':['balloons','A','E','#a0dfed','#f0e4ce'],
    'hece_koprusu.html':['bridge','HE','CE','#8ecdd4','#c5e9bb'],
    'kelime_avcisi.html':['letters','K','ELİME','#a7ceeb','#e7dbf8'],
    'olcum-atolyesi.html':['measure','cm','m','#f2ca9c','#e9ddba'],
    'uzay_matematik_avi.html':['space','+','×','#273766','#7b65c1'],
    'sekil-avcisi-3d.html':['shapes','△','○','#afd7ee','#d9c7f1'],
    'oyun1.html':['food','Elma','Süt','#b1ddad','#f6e2af'],
    'oyun2.html':['steps','2','4','#ffc0a6','#f7e6ad'],
    'oyun3.html':['numbers','3','2','#94d7c4','#e0efd1'],
    'oyun4.html':['rope','1','2','#a6d7ed','#d6eaca'],
    'oyun5.html':['numbers','1','4','#f6d98b','#ffedbb'],
    'oyun6.html':['republic','29','EKİM','#d87883','#f5b19a'],
    'saat-oyunu.html':['clock','12','6','#a0ccea','#d6e7f2'],
    'paralarimiz.html':['market','₺','₺','#93cdbc','#deebc4'],
    'tarti-oyunu.html':['scale','kg','g','#d3b3e2','#f8d6d3'],
    'matematik-masa-tenisi.html':['pingpong','+','−','#84c8b6','#badfd2'],
    'sirali-hafiza.html':['music','♪','♫','#adb6ec','#dacdf5'],
    'oruntu-treni.html':['train','●','▲','#f6bc9a','#ffe4bd'],
    'golge-dedektifi.html':['detective','◆','?','#9cb6c5','#c6dbe3'],
    'minik-kodlamaci.html':['robot','→','↑','#baa6e9','#e8d7f4'],
    'geometri-kasifi.html':['shapes','□','△','#95cedf','#d5e7ee']
  };
  const titleOverrides={'esini-bul-hafiza.html':'Eşini Bul','saat-oyunu.html':'Saat Sahnesi','oyun2.html':'Ritmik Sayma','sekil-avcisi-3d.html':'Şekil Avcısı 3D'};
  function normalizePath(value,origin){
    try{
      const base=origin||'https://kemalogretmenim.com.tr';
      if(!value||String(value).startsWith('#'))return '';
      const u=new URL(value,base+'/oyun/');
      if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/oyun/'))return '';
      let path=u.pathname.slice(6).replace(/\/$/,'');
      if(!path||path.includes('/')||path==='oyunlar'||path==='oyunlar.html')return '';
      if(!path.endsWith('.html'))path+='.html';
      return path==='iframe-oyun.html'?path+'?id='+encodeURIComponent(u.searchParams.get('id')||''):path;
    }catch(_){return '';}
  }
  function validCount(value){
    if(value===null||value===undefined||typeof value==='boolean'||value==='')return null;
    const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
  }
  function formatCount(value){
    const n=validCount(value);if(n===null)return '';
    return n>=1000000?(Math.floor(n/100000)/10).toLocaleString('tr-TR')+' Mn':n>=10000?(Math.floor(n/100)/10).toLocaleString('tr-TR')+' B':n.toLocaleString('tr-TR');
  }
  function normalizeRows(rows,origin){
    const map=new Map();
    (Array.isArray(rows)?rows:[]).forEach(row=>{
      if(!row||typeof row!=='object')return;
      const path=normalizePath(row.game_path,origin),starts=validCount(row.starts);
      if(!path||starts===null||starts===0)return;
      const item={path,starts,score:Number.isFinite(Number(row.popularity_score))?Number(row.popularity_score):starts};
      // Uzantılı/uzantısız kayıtlar aynı oyunsa oturumları iki kez toplamıyoruz.
      if(!map.has(path)||map.get(path).starts<starts)map.set(path,item);
    });
    return [...map.values()].sort((a,b)=>b.score-a.score||b.starts-a.starts);
  }
  function searchText(value){return String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');}
  function title(path,value){return titleOverrides[path]||String(value).toLocaleLowerCase('tr-TR').replace(/(^|[\s·-])\S/g,s=>s.toLocaleUpperCase('tr-TR'));}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
  function sceneSvg(profile){
    const [kind,a,b,bg,end]=profile;
    const text=(x,y,t,size=32,color='#293951')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Trebuchet MS,Arial,sans-serif" font-size="${size}" font-weight="bold" fill="${color}">${esc(t)}</text>`;
    const tile=(x,y,t,color='#fff5dc',rotate=0)=>`<g transform="translate(${x} ${y}) rotate(${rotate})"><rect x="-38" y="-43" width="76" height="86" rx="15" fill="#2b3151" opacity=".16" transform="translate(0 9)"/><rect x="-38" y="-43" width="76" height="86" rx="15" fill="${color}" stroke="#ffffff" stroke-opacity=".6" stroke-width="3"/>${text(0,12,t,30)}</g>`;
    const tree=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="40" rx="32" ry="9" fill="#315f64" opacity=".15"/><path d="M-5 4h10v35H-5z" fill="#b17c50"/><circle cy="-9" r="32" fill="#388d72"/><circle cx="-8" cy="-17" r="21" fill="#5cac7c"/></g>`;
    let body='';
    if(kind==='mine')body=`<path d="M0 230V25h580v205" fill="#16383f"/>${[0,1,2,3].map(i=>`<rect x="${i*160-30}" y="20" width="142" height="200" fill="#2a5558" stroke="#41666a" stroke-width="9"/>`).join('')}<path d="M120 225V80h340v145M115 84h355" fill="none" stroke="#ad8258" stroke-width="19"/><path d="m422 147 18 20-18 20-18-20z" fill="#87f0e2"/>${tile(230,162,a,'#e6ce9c',-9)}${tile(325,159,b,'#c9edc3',8)}`;
    else if(kind==='pizza')body=`<ellipse cx="290" cy="191" rx="130" ry="32" fill="#bf8066" opacity=".2"/><circle cx="290" cy="146" r="94" fill="#fff7df"/><circle cx="290" cy="146" r="80" fill="#d69748"/><circle cx="290" cy="146" r="70" fill="#ffdc82"/>${[0,60,120,180,240,300].map(t=>`<path d="M290 146v-78" transform="rotate(${t} 290 146)" stroke="#ba7647" stroke-width="3"/>`).join('')}${[[270,100],[330,125],[320,180],[255,177],[246,133],[285,198]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="12" fill="#dc6d59"/><circle cx="${x-3}" cy="${y-3}" r="3" fill="#f29473"/>`).join('')}${tile(115,141,a,'#fff7df',-13)}${tile(467,156,b,'#fff7df',13)}`;
    else if(['book','letters'].includes(kind))body=`<g transform="translate(290 156) rotate(-6)"><path d="M0-64Q-75-96-143-56V63Q-60 34 0 63Q70 34 143 63V-56Q70-96 0-64" fill="#674c9d" transform="translate(0 10)"/><path d="M0-64Q-75-96-143-56V63Q-60 34 0 63Q70 34 143 63V-56Q70-96 0-64" fill="#fff4da"/><path d="M0-61V61" stroke="#ddc7a6" stroke-width="3"/>${text(-70,1,a,kind==='book'?23:40)}${text(70,1,b,kind==='book'?22:26)}<path d="M-116 25h80M35 25h80" stroke="#e2b89b" stroke-width="5"/></g><path d="m444 55 6 14 15 4-15 5-6 14-5-14-15-5 15-4z" fill="#fff7c8"/>`;
    else if(['bridge','valley','nature'].includes(kind))body=`<path d="M0 168Q110 110 210 159T580 144V300H0" fill="#83b788"/><path d="M290 145q-80 80-40 155h110q-70-80 10-155" fill="#76cbd9"/><path d="M175 214q85-75 210-8" fill="none" stroke="#ac7750" stroke-width="29"/><path d="M175 182q90-70 210-10" fill="none" stroke="#e2b97a" stroke-width="10"/>${tree(112,156,.9)}${tree(464,154,1.2)}${kind==='nature'?`<circle cx="294" cy="135" r="40" fill="#dcf6d3" stroke="#2d715d" stroke-width="11"/><path d="m322 167 35 40" stroke="#2d715d" stroke-width="16" stroke-linecap="round"/>`:`${tile(234,150,a,'#fff6d7',-9)}${tile(334,136,b,'#ddf5d7',8)}`}`;
    else if(kind==='space')body=`${[60,100,180,250,450,510].map((x,i)=>`<circle cx="${x}" cy="${40+(i%3)*32}" r="3" fill="#e2e6ff"/>`).join('')}<ellipse cx="435" cy="149" rx="65" ry="26" fill="none" stroke="#dd9ac6" stroke-width="15" transform="rotate(-20 435 149)"/><circle cx="435" cy="149" r="39" fill="#b798e9"/><g transform="translate(220 144) rotate(25)"><path d="m-20 45-13 45 33-14 33 14-13-45" fill="#ffb17a"/><path d="M0-80Q-50-20-28 54H28Q50-20 0-80" fill="#f9f3dd"/><circle cy="-7" r="20" fill="#74cddc" stroke="#bdc3de" stroke-width="6"/><path d="m-28 10-26 42h30M28 10l26 42H24" fill="#f17970"/></g>${text(105,180,a,43,'#e4d5f8')}`;
    else if(['shapes','numbers','steps'].includes(kind))body=kind==='shapes'?`<ellipse cx="290" cy="235" rx="188" ry="16" fill="#547496" opacity=".15"/><path d="m156 101 64 34v77l-64-34z" fill="#de837e"/><path d="m156 101 64-34 64 34-64 34z" fill="#ffc8a2"/><path d="m220 135 64-34v77l-64 34z" fill="#f3a58d"/><circle cx="381" cy="161" r="55" fill="url(#ball)"/><path d="m278 186 46-83 44 83z" fill="#f5d272"/>`:`${tile(163,151,a,'#fff3db',-11)}${tile(291,125,kind==='steps'?b:'+','#cebbed',6)}${tile(419,160,kind==='steps'?'6':b,'#c3e9da',-5)}<path d="M115 227q175 20 360-2" fill="none" stroke="#fff9de" stroke-width="9" stroke-linecap="round"/>`;
    else if(kind==='clock')body=`<ellipse cx="290" cy="232" rx="100" ry="13" fill="#355a7b" opacity=".12"/><circle cx="290" cy="145" r="91" fill="#507eab"/><circle cx="290" cy="139" r="81" fill="#fff6df" stroke="#cce4ed" stroke-width="6"/>${[0,1,2,3].map(i=>`<circle cx="290" cy="74" r="4" fill="#718392" transform="rotate(${i*90} 290 139)"/>`).join('')}<path d="M290 99v40l39 25" stroke="#e77d6d" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="290" cy="139" r="9" fill="#3f617a"/>${tile(116,163,'3','#fff3d9',-12)}${tile(465,163,'9','#d9ece8',12)}`;
    else if(kind==='train')body=`<path d="M60 227h465" stroke="#a8785e" stroke-width="8"/>${[120,240,360].map((x,i)=>`<g transform="translate(${x} 161)"><rect x="-50" y="-35" width="100" height="73" rx="16" fill="${['#6ebbae','#d69dce','#e8b266'][i]}"/><rect x="-37" y="-51" width="74" height="20" rx="8" fill="#fff3d9"/>${text(0,13,['●','▲','●'][i],35)}<circle cx="-27" cy="46" r="15" fill="#4f5966"/><circle cx="27" cy="46" r="15" fill="#4f5966"/></g>`).join('')}<path d="M195 191h13M315 191h13" stroke="#796354" stroke-width="7"/>`;
    else if(kind==='robot')body=`<path d="M135 213h80v-64h92v-61h92" fill="none" stroke="#f7efc7" stroke-width="8" stroke-dasharray="12 10"/><g transform="translate(246 154)"><rect x="-52" y="-62" width="104" height="91" rx="23" fill="#f9f0dc"/><rect x="-39" y="-46" width="78" height="42" rx="12" fill="#5c7896"/><circle cx="-19" cy="-25" r="8" fill="#9df3e9"/><circle cx="19" cy="-25" r="8" fill="#9df3e9"/><path d="M-20 12h40M0-62v-20" stroke="#c393bf" stroke-width="7"/><circle cy="-86" r="8" fill="#f5c374"/><path d="M-30 32v20M30 32v20" stroke="#765f9a" stroke-width="15" stroke-linecap="round"/></g>${text(414,103,'★',46,'#fff0ad')}`;
    else if(kind==='music')body=`${[0,1,2,3,4,5].map((i)=>`<rect x="${105+i*60}" y="${126-i%3*15}" width="53" height="100" rx="14" fill="${['#d883a5','#f2bc82','#f1da80','#94caaa','#80b8d4','#aa99d5'][i]}"/>`).join('')}${text(160,83,a,57,'#fff8e3')}${text(390,77,b,64,'#fff8e3')}`;
    else if(kind==='balloons')body=`${[170,290,410].map((x,i)=>`<path d="M${x} 158q-25 50 0 90" stroke="#658d9c" fill="none" stroke-width="3"/><ellipse cx="${x}" cy="116" rx="46" ry="57" fill="${['#e98378','#93b7d4','#bc9dd8'][i]}"/><ellipse cx="${x-13}" cy="91" rx="9" ry="15" fill="#fff" opacity=".3"/>${text(x,129,[a,b,'L'][i],35,'white')}`).join('')}`;
    else if(kind==='pingpong')body=`<path d="m117 170 230-52 145 76-233 51z" fill="#368e8e" stroke="#fff7e4" stroke-width="5"/><path d="m302 135 5-48 58 29v48" fill="#b5decc" stroke="#fff7e4" stroke-width="3"/><g transform="translate(176 122) rotate(-30)"><rect x="-8" y="22" width="16" height="60" rx="6" fill="#bd9368"/><ellipse rx="40" ry="49" fill="#e17876"/></g><circle cx="372" cy="83" r="17" fill="#fff8e5"/>`;
    else if(kind==='republic')body=`<path d="M175 225V67" stroke="#fbecdb" stroke-width="8"/><path d="M180 66q60-28 137 0v93q-69-25-137 0z" fill="#da4d5d"/><circle cx="233" cy="105" r="23" fill="white"/><circle cx="242" cy="99" r="20" fill="#da4d5d"/>${text(276,116,'★',27,'white')}${tile(397,162,a,'#fff3da',9)}${text(395,227,b,22,'#fff6de')}`;
    else if(kind==='rope'||kind==='duel')body=`<path d="M85 173q160 40 410-7" fill="none" stroke="#f7e3ba" stroke-width="10"/><path d="M290 180v47" stroke="#f28475" stroke-width="7"/>${[175,405].map((x,i)=>`<g transform="translate(${x} 150)"><circle cy="-31" r="28" fill="${i?'#ecc679':'#7aadd6'}"/><path d="M-23 5h46v47h-46z" fill="${i?'#d9897a':'#6f8ab6'}"/><circle cx="-9" cy="-35" r="3" fill="#34465d"/><circle cx="9" cy="-35" r="3" fill="#34465d"/><path d="M-9-23q9 9 18 0" fill="none" stroke="#34465d" stroke-width="3"/></g>`).join('')}${kind==='duel'?text(290,93,'★',53,'#fff5c4'):''}`;
    else if(kind==='detective')body=`${tile(180,160,a,'#f4e3ac',-12)}${tile(292,148,b,'#d1e6dc',7)}<circle cx="378" cy="130" r="48" fill="#f3f9f0" fill-opacity=".55" stroke="#566281" stroke-width="14"/><path d="m410 166 46 51" stroke="#566281" stroke-width="19" stroke-linecap="round"/><path d="m358 113 9-9" stroke="white" stroke-width="8" stroke-linecap="round"/>`;
    else if(kind==='food'||kind==='market')body=`<path d="M150 144h280l-27 93H177z" fill="#c4996b"/><path d="m180 145 38-63M400 145l-38-63" stroke="#a47753" stroke-width="9"/><circle cx="250" cy="135" r="37" fill="#dd7e6e"/><path d="m250 98 2-22" stroke="#517953" stroke-width="7"/><ellipse cx="271" cy="89" rx="17" ry="8" fill="#6da77b" transform="rotate(-25 271 89)"/><path d="M301 84h47v86h-47z" fill="#f6eedb"/><path d="m301 84 12-17h33l2 17" fill="#96bcd6"/>${text(326,132,kind==='market'?'₺':'Süt',20)}${kind==='market'?`<circle cx="417" cy="208" r="36" fill="#f5ce80" stroke="#dbad61" stroke-width="7"/>${text(417,219,'₺',31)}`:''}`;
    else body=`<path d="M130 111h321M290 83v151M227 236h126" fill="none" stroke="#7e688d" stroke-width="10" stroke-linecap="round"/>${[180,400].map((x,i)=>`<path d="m${x} 113-39 72h78z" fill="none" stroke="#91799b" stroke-width="4"/><path d="M${x-48} 183q48 42 96 0" fill="#fff3d7"/>${text(x,172,i?b:a,28)}`).join('')}<circle cx="290" cy="111" r="16" fill="#f3cd87"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 300"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="${end}"/></linearGradient><radialGradient id="ball" cx=".3" cy=".25"><stop stop-color="#b5dfd4"/><stop offset="1" stop-color="#4a99aa"/></radialGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dy="9" stdDeviation="6" flood-color="#39405b" flood-opacity=".12"/></filter></defs><path fill="url(#bg)" d="M0 0h580v300H0z"/><circle cx="510" cy="25" r="125" fill="#fff" opacity=".10"/><circle cx="30" cy="300" r="140" fill="#fff" opacity=".13"/><g filter="url(#shadow)">${body}</g></svg>`;
  }
  const cache=new Map();
  function cover(path,category){
    if(covers[path])return '/assets/game-covers/'+covers[path];
    const key=path+'|'+category;
    if(!cache.has(key))cache.set(key,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sceneSvg(scenes[path]||[category==='okuma-yazma'?'letters':'shapes','A','B','#c2b8ed','#d6e7ed'])));
    return cache.get(key);
  }
  return {normalizePath,validCount,formatCount,normalizeRows,searchText,title,cover,covers,scenes};
});
