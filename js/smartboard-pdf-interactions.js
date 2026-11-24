(function(root){
  'use strict';
  function init(o){
    var bar=o.bar,stage=o.stage,I=root.SmartboardIcons.html,clipboard=null,textMode=false,heldTool=null,touches=new Map(),pinching=false,startPinch=null,tap=null,swipe=null,gestureFrame=null;
    function icon(name,label,action){return '<button type="button" title="'+label+'" aria-label="'+label+'" data-pdf-input="'+action+'">'+I(name)+'</button>';}
    var tools=document.createElement('div');tools.className='pdf-reading-tools';tools.innerHTML='<select class="pdf-layout-select" aria-label="PDF sayfa görünümü"><option value="single">Tek sayfa</option><option value="facing">Yan yana</option><option value="continuous">Alt alta</option></select><div class="pdf-input-modes" role="group" aria-label="PDF etkileşim biçimi">'+icon('pen-tool','Yaz ve çiz','write')+icon('hand','Dokunarak gezin','pan')+icon('type','PDF metnini seç','text')+'</div><div class="pdf-clipboard-tools">'+icon('copy','Kopyala','copy')+icon('file-down','Yapıştır','paste')+'</div>';bar.querySelector('.pdf-view-actions').before(tools);
    var more=bar.querySelector('.pdf-menu'),row=document.createElement('div');row.className='pdf-edit-actions';row.innerHTML=icon('copy','Kopyala','copy')+icon('scissors','Kes','cut')+icon('clipboard-paste','Yapıştır','paste')+icon('circle-help','PDF klavye kısayolları','help');more.prepend(row);
    tools.querySelector('[data-pdf-input=paste]').innerHTML=I('clipboard-paste');
    var help=document.createElement('div');help.className='pdf-keyboard-help';help.hidden=true;help.setAttribute('role','dialog');help.setAttribute('aria-label','PDF klavye kısayolları');help.innerHTML='<div class="pdf-help-heading"><strong>PDF kısayolları</strong>'+icon('x','Kısayolları kapat','help-close')+'</div><dl>'+[['Ctrl / ⌘ + + / −','Yakınlaştır / uzaklaştır'],['Ctrl / ⌘ + 0','Sayfayı sığdır'],['Ctrl / ⌘ + F','PDF içinde ara'],['Page Up / Page Down','Önceki / sonraki sayfa'],['Home / End','İlk / son sayfa'],['Ctrl / ⌘ + C / X / V','Kopyala / kes / yapıştır'],['Ctrl / ⌘ + S','PDF kaydet'],['Ctrl / ⌘ + Shift + S','Düzenlenebilir dosya kaydet'],['Ctrl / ⌘ + Alt + 1 / 2 / 3','Tek / yan yana / alt alta'],['Space (basılı tut)','Geçici gezinme']].map(function(p){return '<dt>'+p[0]+'</dt><dd>'+p[1]+'</dd>';}).join('')+'</dl>';more.appendChild(help);
    var pasteBox=document.createElement('div');pasteBox.className='pdf-paste-box';pasteBox.hidden=true;pasteBox.innerHTML='<textarea rows="3" maxlength="20000" aria-label="Yapıştırılacak metin"></textarea><button type="button" data-pdf-input="paste-text">Metni ekle</button>';more.appendChild(pasteBox);
    function active(){return o.active()&&!o.sandbox();}
    function editable(el){return el&&el.closest&&el.closest('input,textarea,select,[contenteditable=true]');}
    function selection(){var s=root.getSelection&&root.getSelection();return s&&s.rangeCount&&o.plane.contains(s.anchorNode)?String(s).trim():'';}
    function mode(value){textMode=value==='text';o.showText(textMode);if(!textMode)o.tool(value==='pan'?'pan':'pen');else o.tool('select');more.hidden=true;sync();}
    function sync(){if(!active())return;if(textMode&&o.tool()!=='select'){textMode=false;o.showText(false);}tools.querySelector('select').value=o.view();tools.querySelectorAll('[data-pdf-input]').forEach(function(b){var a=b.dataset.pdfInput;b.setAttribute('aria-pressed',String(a==='text'?textMode:a==='pan'?!textMode&&o.tool()==='pan':a==='write'?!textMode&&o.tool()!=='pan':false));});stage.classList.toggle('pdf-text-selecting',textMode);}
    function put(item){textMode=false;o.showText(false);o.paste(item);more.hidden=true;pasteBox.hidden=true;sync();}
    async function putImage(file){textMode=false;o.showText(false);await o.image(file);more.hidden=true;pasteBox.hidden=true;sync();}
    function remember(item){clipboard={item:JSON.parse(JSON.stringify(item)),marker:item.kind==='text'?item.text:'Akıllı Tahta çizimi',synced:false};return clipboard;}
    async function copy(cut){
      var text=selection(),item=o.selected();if(!text&&item){var c=remember(item);if(cut)o.removeSelected();if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(c.marker).then(function(){if(clipboard===c)c.synced=true;}).catch(function(){});o.message(cut?'Seçim kesildi.':'Seçim kopyalandı.');return;}
      if(!text)text=await o.pageText();if(!text){o.message('Bu sayfada kopyalanabilir metin bulunamadı.');return;}var copied=remember({kind:'text',text:text.slice(0,20000)});
      try{await navigator.clipboard.writeText(text);if(clipboard===copied)copied.synced=true;o.message('Metin kopyalandı.');}catch(error){more.hidden=false;pasteBox.hidden=false;var field=pasteBox.querySelector('textarea');field.value=text.slice(0,20000);field.focus();field.select();o.message('Metin seçildi.');}
    }
    async function paste(){
      if(clipboard&&!clipboard.synced){put(clipboard.item);return;}
      try{
        if(navigator.clipboard&&navigator.clipboard.read){var entries=await navigator.clipboard.read();for(var i=0;i<entries.length;i++){var type=entries[i].types.find(function(t){return /^image\/(png|jpeg|webp)$/.test(t);});if(type){await putImage(new File([await entries[i].getType(type)],'Pano.png',{type:type}));return;}}}
        var text=await navigator.clipboard.readText();if(clipboard&&text===clipboard.marker)put(clipboard.item);else if(text)put({kind:'text',text:text.slice(0,20000)});else if(clipboard)put(clipboard.item);
      }catch(error){if(clipboard){put(clipboard.item);return;}more.hidden=false;pasteBox.hidden=false;pasteBox.querySelector('textarea').focus();o.message('Panodan yapıştırmak için metin alanı açıldı.');}
    }
    bar.addEventListener('click',function(e){var b=e.target.closest('[data-pdf-input]');if(!b||o.busy())return;var a=b.dataset.pdfInput;
      if(['write','pan','text'].indexOf(a)>=0)mode(a);
      else if(a==='copy'||a==='cut')copy(a==='cut').catch(function(){o.message('Kopyalama tamamlanamadı.');});
      else if(a==='paste')paste().catch(function(){o.message('Yapıştırma tamamlanamadı.');});
      else if(a==='help')help.hidden=!help.hidden;else if(a==='help-close')help.hidden=true;
      else if(a==='paste-text'){var t=pasteBox.querySelector('textarea').value;if(t)put({kind:'text',text:t.slice(0,20000)});pasteBox.hidden=true;}
    });
    tools.querySelector('select').addEventListener('change',function(e){o.setView(e.target.value);});
    document.addEventListener('copy',function(e){if(!active()||editable(e.target)||selection())return;var item=o.selected();if(!item)return;var c=remember(item);if(e.clipboardData){e.clipboardData.setData('text/plain',c.marker);c.synced=true;try{e.clipboardData.setData('application/x-kemal-smartboard',JSON.stringify(c.item));}catch(error){}e.preventDefault();}},true);
    document.addEventListener('cut',function(e){if(!active()||editable(e.target)||selection())return;var item=o.selected();if(!item)return;var c=remember(item);if(e.clipboardData){e.clipboardData.setData('text/plain',c.marker);c.synced=true;e.preventDefault();o.removeSelected();}},true);
    document.addEventListener('paste',function(e){if(!active()||o.busy()||editable(e.target)||!e.clipboardData)return;var data=e.clipboardData,files=Array.from(data.files||[]),image=files.find(function(f){return /^image\/(png|jpeg|webp)$/.test(f.type);});
      if(image){e.preventDefault();putImage(image).catch(function(error){o.message(error.message);});return;}
      var text=data.getData('text/plain');if(clipboard&&text===clipboard.marker){e.preventDefault();put(clipboard.item);return;}if(text){e.preventDefault();put({kind:'text',text:text.slice(0,20000)});}
    },true);
    function restoreTool(){if(heldTool!==null){var t=heldTool;heldTool=null;if(o.tool()==='pan')o.tool(t);}}
    document.addEventListener('keydown',function(e){
      if(!active()||e.defaultPrevented)return;
      var mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase(),digit=/^Digit[123]$/.test(e.code)?e.code.slice(-1):k,handled=true;
      var globalCommand=mod&&['s','o','p','f','0','+','=','-','−'].indexOf(k)>=0;
      if(editable(e.target)&&!globalCommand)return;
      if(o.busy()){if(globalCommand){e.preventDefault();e.stopImmediatePropagation();}return;}
      if(mod&&e.altKey&&['1','2','3'].indexOf(digit)>=0)o.setView(['single','facing','continuous'][Number(digit)-1]);
      else if(mod&&(k==='+'||k==='='))o.zoom(o.zoom()*1.2);
      else if(mod&&(k==='-'||k==='−'))o.zoom(o.zoom()/1.2);
      else if(mod&&k==='0')o.fit('page');else if(mod&&k==='f')o.find();
      else if(mod&&k==='s')o.save(e.shiftKey);else if(mod&&k==='o')o.open();else if(mod&&k==='p')o.print();
      else if(mod&&k==='z'){if(e.shiftKey)o.redo();else o.undo();}else if(mod&&k==='y')o.redo();
      else if(mod)handled=false;
      else if(e.target.closest('[role=tab]'))handled=false;
      else if(k==='pagedown')o.step(1);else if(k==='pageup')o.step(-1);
      else if(k==='home')o.go(0);else if(k==='end')o.go(o.count()-1);
      else if(k==='delete'||k==='backspace'){if(o.selected())o.removeSelected();else handled=false;}
      else if(k===' '&&!textMode){if(heldTool===null){heldTool=o.tool();o.tool('pan');}}
      else if(k==='escape'){help.hidden=true;pasteBox.hidden=true;restoreTool();handled=false;}
      else if(k==='?'&&!mod){more.hidden=false;help.hidden=true;help.hidden=false;}
      else handled=false;
      if(handled){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    document.addEventListener('keyup',function(e){if(e.code==='Space'||e.key===' ')restoreTool();},true);root.addEventListener('blur',restoreTool);
    function pair(){var a=Array.from(touches.values());return{distance:Math.max(1,Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y)),x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};}
    stage.addEventListener('pointerdown',function(e){if(!active()||e.pointerType!=='touch'||e.target.closest('button,input,select,textarea,#boardToolbar,.sb-widget'))return;
      touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(touches.size>=2){o.cancelTouch();pinching=true;var p=pair();startPinch={distance:p.distance,zoom:o.zoom()};swipe=null;e.preventDefault();e.stopImmediatePropagation();return;}
      swipe={id:e.pointerId,x:e.clientX,y:e.clientY,time:Date.now(),left:stage.scrollLeft,top:stage.scrollTop};
    },true);
    document.addEventListener('pointermove',function(e){if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!pinching)return;e.preventDefault();e.stopImmediatePropagation();if(touches.size>=2&&!gestureFrame)gestureFrame=requestAnimationFrame(function(){gestureFrame=null;if(!pinching||touches.size<2)return;var p=pair();o.zoom(startPinch.zoom*p.distance/startPinch.distance,{clientX:p.x,clientY:p.y});});}, {capture:true,passive:false});
    function endTouch(e){if(!touches.has(e.pointerId))return;touches.delete(e.pointerId);if(pinching){e.preventDefault();e.stopImmediatePropagation();if(!touches.size){pinching=false;startPinch=null;}return;}
      if(!swipe||swipe.id!==e.pointerId||o.tool()!=='pan'||textMode||e.type==='pointercancel')return;
      var dx=e.clientX-swipe.x,dy=e.clientY-swipe.y,elapsed=Date.now()-swipe.time;
      if(o.view()==='single'&&elapsed<650&&Math.abs(dx)>75&&Math.abs(dx)>Math.abs(dy)*1.4&&Math.abs(stage.scrollLeft-swipe.left)<12){setTimeout(function(){o.step(dx<0?1:-1);},0);tap=null;}
      else if(Math.hypot(dx,dy)<8){if(tap&&Date.now()-tap.time<330&&Math.hypot(tap.x-e.clientX,tap.y-e.clientY)<24){o.zoom(o.zoom()*1.5,{clientX:e.clientX,clientY:e.clientY});tap=null;}else tap={x:e.clientX,y:e.clientY,time:Date.now()};}swipe=null;
    }
    document.addEventListener('pointerup',endTouch,true);document.addEventListener('pointercancel',endTouch,true);
    stage.addEventListener('wheel',function(e){if(!active()||!e.ctrlKey&&!e.metaKey)return;e.preventDefault();o.zoom(o.zoom()*Math.exp(-Math.max(-80,Math.min(80,e.deltaY))*.006),{clientX:e.clientX,clientY:e.clientY});},{passive:false});
    return{sync:sync,textMode:function(){return textMode;},gesturing:function(){return pinching;},reset:function(){o.showText(false);textMode=false;touches.clear();pinching=false;restoreTool();help.hidden=pasteBox.hidden=true;}};
  }
  root.SmartboardPDFInteractions={init:init};
})(typeof window!=='undefined'?window:globalThis);
