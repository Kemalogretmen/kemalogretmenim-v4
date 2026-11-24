(function(root) {
  'use strict';
  var BASE = '/vendor/smartboard-pdf/', MAX_FILE = 50 * 1024 * 1024, MAX_CACHE = 24 * 1024 * 1024;
  var MAX_NOTES = 8 * 1024 * 1024, MAX_PAGES = 300, MAX_PIXELS = 1800000;
  var MAX_TABS = 8, MAX_OPEN_BYTES = 100 * 1024 * 1024;
  async function disposeDocument(owner) {
    if(!owner) return;
    var doc = owner.doc, task = owner.task || (doc && doc.loadingTask);
    try {
      if(task && typeof task.destroy === 'function') await task.destroy();
      else if(doc && typeof doc.destroy === 'function') await doc.destroy();
    } finally { owner.doc = null; owner.task = null; }
  }
  function bounds(width, height, pixels) {
    var scale = Math.min(1.5, Math.sqrt((pixels || MAX_PIXELS) / Math.max(1, width * height)));
    return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
  }
  function validateManifest(m, count) {
    if(!m || m.version !== 1 || !Array.isArray(m.pages) || !m.pages.length || m.pages.length > MAX_PAGES) throw new Error('Geçersiz tahta dosyası.');
    m.pages.forEach(function(p) {
      var d = p.pdf;
      if(!d || !Number.isFinite(d.width) || !Number.isFinite(d.height) || d.width < 20 || d.height < 20 || d.width > 3000 || d.height > 6000 ||
        (d.page !== null && (!Number.isInteger(d.page) || d.page < 1 || d.page > count)) || !Array.isArray(p.items) || p.items.length > 20000) throw new Error('Tahta sayfa bilgisi geçersiz.');
      p.items.forEach(function(i) {
        if(!i || ['path','shape','text','image'].indexOf(i.kind) < 0) throw new Error('Desteklenmeyen çizim.');
        function numeric(key,min,max){if(!Number.isFinite(i[key])||i[key]<min||i[key]>max)throw new Error('Geçersiz çizim ölçüsü.');}
        if(i.kind==='path'||i.kind==='shape')numeric('size',.1,2000);
        if(i.kind==='text'||i.kind==='image'){numeric('x',-100000,100000);numeric('y',-100000,100000);}
        if(i.kind==='text'){numeric('fontSize',1,2000);if(i.boxWidth!==undefined)numeric('boxWidth',1,100000);}
        if(i.kind==='image'){numeric('width',1,100000);numeric('height',1,100000);}
        if(i.kind === 'path' && (!Array.isArray(i.points) || i.points.length > 20000 || i.points.some(function(p) { return !p || !Number.isFinite(p.x) || !Number.isFinite(p.y); }))) throw new Error('Geçersiz kalem izi.');
        if(i.kind === 'image' && (typeof i.src !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(i.src))) throw new Error('Geçersiz görsel.');
        if(i.kind === 'text' && (typeof i.text !== 'string' || i.text.length > 20000)) throw new Error('Geçersiz metin.');
        if(i.kind === 'shape' && (!i.start || !i.end || !Number.isFinite(i.start.x) || !Number.isFinite(i.start.y) || !Number.isFinite(i.end.x) || !Number.isFinite(i.end.y))) throw new Error('Geçersiz şekil.');
      });
    });
    return m;
  }
  function overlayPlacement(page, rotation) {
    var c = page.getCropBox(), r = ((rotation % 360) + 360) % 360;
    return { x: c.x + (r === 90 || r === 180 ? c.width : 0), y: c.y + (r === 180 || r === 270 ? c.height : 0),
      width: r % 180 ? c.height : c.width, height: r % 180 ? c.width : c.height, angle: r };
  }
  function database() {
    return new Promise(function(resolve, reject) {
      if(!root.indexedDB) { reject(new Error('Yerel kayıt kullanılamıyor.')); return; }
      var r = indexedDB.open('kemal-smartboard-pdf-v1', 1);
      r.onupgradeneeded = function() { r.result.createObjectStore('session'); };
      r.onsuccess = function() { resolve(r.result); }; r.onerror = function() { reject(r.error); };
    });
  }
  async function storedSession(method, data) {
    var db = await database();
    try {
      return await new Promise(function(resolve, reject) {
        var tx = db.transaction('session', method === 'get' || method === 'info' ? 'readonly' : 'readwrite'), store = tx.objectStore('session');
        var r, source;
        if(method==='get'||method==='info'){r=store.get('last');if(method==='get')source=store.get('source');}
        else if(method==='put'){if(data.pdf)store.put(data.pdf,'source');r=store.put({manifest:data.manifest},'last');}
        else{r=store.delete('last');store.delete('source');}
        tx.oncomplete = function() { var value=r.result;resolve(method==='get'&&value?{manifest:value.manifest,pdf:value.pdf||source.result}:value); }; tx.onerror = tx.onabort = function() { reject(tx.error || new Error('Yerel kayıt yapılamadı.')); };
      });
    } finally { db.close(); }
  }
  var scripts = {};
  function script(name, global) {
    if(root[global]) return Promise.resolve(root[global]);
    if(!scripts[name]) scripts[name] = new Promise(function(resolve, reject) {
      var el = document.createElement('script'); el.src = BASE + name;
      el.onload = function() { resolve(root[global]); }; el.onerror = function() { delete scripts[name]; el.remove(); reject(new Error('PDF araçları yüklenemedi. Bağlantıyı kontrol edin.')); }; document.head.appendChild(el);
    });
    return scripts[name];
  }
  var readerPromise;
  function reader() {
    if(!readerPromise) readerPromise = import(BASE + 'pdf.min.mjs').then(function(lib) {
      lib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.mjs'; return lib;
    }).catch(function(error) { readerPromise = null; throw error; });
    return readerPromise;
  }
  function nextFrame() { return new Promise(function(resolve) { setTimeout(resolve, 0); }); }
  function init(api) {
    var stage = api.stage, plane = api.plane, session = null, generation = 0, rendering = null, serial = Promise.resolve();
    var rendered = null, autosave = null, saving = Promise.resolve(), cacheEnabled = true, busy = false, fitting = false;
    var tabs = [], tabId = 0, cachedSources = '';
    var views=null,interactions=null,textEnabled=false,textTask=null,textPage=null,textZoom=0,textEpoch=0;
    var I = root.SmartboardIcons.html;
    function button(name, label, action) { return '<button type="button" data-pdf="' + action + '" title="' + label + '" aria-label="' + label + '">' + I(name) + '</button>'; }
    var canvas = document.createElement('canvas'); canvas.id = 'smartboardPdfCanvas'; canvas.className = 'pdf-page-surface'; canvas.hidden = true; canvas.setAttribute('aria-hidden', 'true'); plane.prepend(canvas);
    var bar = document.createElement('nav'); bar.className = 'pdf-bar'; bar.id = 'smartboardPdfBar'; bar.hidden = true; bar.setAttribute('aria-label', 'PDF araçları');
    bar.innerHTML = '<span class="pdf-name"></span><div class="pdf-page-nav">' + button('chevron-left','Önceki PDF sayfası','prev') + '<input type="number" min="1" aria-label="PDF sayfa numarası"><span class="pdf-count"></span>' + button('chevron-right','Sonraki PDF sayfası','next') + '</div><div class="pdf-view-actions">' + button('zoom-out','PDF uzaklaştır','out') + '<output class="pdf-zoom"></output>' + button('zoom-in','PDF yakınlaştır','in') + button('scan','Sayfayı ekrana sığdır','fit') + button('move-horizontal','Genişliğe sığdır','width') + button('maximize','PDF tam ekran','fullscreen') + button('folder-open','Belge işlemleri','menu') + '</div>' +
      '<div class="pdf-menu" hidden><div class="pdf-file-actions"><button type="button" data-pdf="export">' + I('file-down') + 'PDF kaydet</button><button type="button" data-pdf="project">' + I('save') + 'Düzenlenebilir dosya kaydet</button><button type="button" data-pdf="open">' + I('file-up') + 'Başka PDF aç</button></div>' +
      '<div class="pdf-edit-actions" role="group" aria-label="PDF sayfa düzeni">' + button('file-plus-2','PDF boş sayfa ekle','add') + button('copy','PDF sayfasını çoğalt','duplicate') + button('arrow-up','Sayfayı önceye taşı','earlier') + button('arrow-down','Sayfayı sonraya taşı','later') + button('trash-2','PDF sayfasını sil','delete') + button('bookmark','Sayfayı işaretle','bookmark') + '</div>' +
      '<label class="pdf-search-label">İşaretli sayfalar<select class="pdf-bookmarks" aria-label="İşaretli PDF sayfasına git"></select></label><label class="pdf-search-label">Sayfada ara<input type="search" maxlength="100" aria-label="PDF sayfasında ara"></label><output class="pdf-search-result"></output><label class="pdf-cache"><input type="checkbox" checked> Bu cihazda son belgeyi hatırla (en fazla 24 MB)</label><div class="pdf-cache-status"></div><button type="button" data-pdf="forget">' + I('trash-2') + 'Cihazdaki PDF kaydını sil</button><button type="button" data-pdf="offline">' + I('download') + 'Çevrimdışı kullanımı hazırla</button><button type="button" data-pdf="offline-clear">' + I('trash-2') + 'Çevrimdışı uygulama dosyalarını sil</button><button type="button" data-pdf="close">' + I('x') + 'Tahtaya dön</button></div>';
    document.body.appendChild(bar);
    var tabRow = document.createElement('div');tabRow.className='pdf-tabs-row';
    var tabList = document.createElement('div');tabList.className='pdf-tabs';tabList.setAttribute('role','tablist');tabList.setAttribute('aria-label','Açık PDF belgeleri');
    tabRow.appendChild(tabList);var addTab=document.createElement('div');addTab.className='pdf-add-tab';addTab.innerHTML=button('plus','Yeni PDF sekmesi aç','open');tabRow.appendChild(addTab);bar.prepend(tabRow);
    bar.querySelector('.pdf-file-actions [data-pdf=open]').lastChild.textContent='Yeni sekmede PDF aç';
    bar.querySelector('.pdf-cache').lastChild.textContent=' Açık PDF’leri bu cihazda hatırla (toplam 24 MB)';
    bar.querySelector('[data-pdf=close]').lastChild.textContent='PDF sekmesini kapat';
    var notice = document.createElement('div'); notice.className = 'pdf-notice'; notice.hidden = true; notice.setAttribute('role', 'status');
    notice.innerHTML = '<span></span><button type="button" data-pdf="resume">Kaldığım yerden aç</button>' + button('trash-2','Kayıtlı PDF çalışmasını sil','forget');
    document.getElementById('whiteboardWorkspace').querySelector('.panel-head').after(notice);
    var status = document.createElement('div'); status.className = 'pdf-status'; status.hidden = true; status.setAttribute('role','status'); document.body.appendChild(status);
    var input = document.createElement('input'); input.type = 'file'; input.multiple=true;input.accept = 'application/pdf,.pdf,.tahta'; input.id = 'smartboardPdfInput'; input.hidden = true; document.body.appendChild(input);
    var menu = bar.querySelector('.pdf-menu'), cacheCheck = bar.querySelector('.pdf-cache input'), number = bar.querySelector('input[type=number]');
    var search = bar.querySelector('input[type=search]'), searchText = bar.querySelector('.pdf-search-result');
    var bookmarks=bar.querySelector('.pdf-bookmarks'),bookmarkKey='';
    var searchLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');searchLayer.classList.add('pdf-search-highlights');searchLayer.setAttribute('aria-hidden','true');canvas.after(searchLayer);
    var textLayer=document.createElement('div');textLayer.className='pdf-text-layer textLayer';textLayer.hidden=true;plane.appendChild(textLayer);
    function clearText(){textEpoch++;if(textTask)textTask.cancel();textTask=null;textPage=null;textLayer.replaceChildren();}
    function showText(value){textEnabled=value;textLayer.hidden=!value;if(!value)clearText();else refreshText();}
    async function refreshText(){
      if(!textEnabled||!session||!session.doc)return;var page=api.pages()[api.index()],z=api.view().zoom;
      if(textPage===page&&textZoom===z)return;clearText();textPage=page;textZoom=z;var token=textEpoch,current=session;textLayer.hidden=false;
      if(page.pdf.page===null)return;
      try{var proxy=await current.doc.getPage(page.pdf.page),lib=await reader(),content=await proxy.getTextContent();if(token!==textEpoch||current!==session)return;
        var base=proxy.getViewport({scale:1}),viewport=proxy.getViewport({scale:page.pdf.width/base.width*z}),scale=viewport.scale*(proxy.userUnit||1);
        textLayer.style.setProperty('--total-scale-factor',scale);textTask=new lib.TextLayer({textContentSource:content,container:textLayer,viewport:viewport});
        textLayer.style.width=viewport.rawDims.pageWidth*scale+'px';textLayer.style.height=viewport.rawDims.pageHeight*scale+'px';await textTask.render();
      }catch(error){if(token===textEpoch&&error.name!=='AbortException')message('PDF metni seçilemiyor.',true);}
    }
    function message(text, error) { status.textContent = text; status.hidden = !text; status.classList.toggle('is-error', !!error); layout(); }
    function setBusy(value, text) { busy = value; stage.toggleAttribute('data-pdf-busy', value); bar.querySelectorAll('button,input,select').forEach(function(el) { el.disabled = value; }); if(text !== undefined) message(text); }
    function capture(commit) {
      if(!session)return;
      if(commit)api.commit();session.pages=api.pages();session.index=api.index();session.zoom=api.view().zoom;
      session.scroll={top:stage.scrollTop/Math.max(1,stage.scrollHeight-stage.clientHeight),left:stage.scrollLeft/Math.max(1,stage.scrollWidth-stage.clientWidth)};
    }
    function manifest(tab) {
      tab=tab||session;if(tab===session)capture();
      return { version: 1, name: tab.name, index: tab.index, zoom: tab.zoom, fit:tab.fit,scroll:tab.scroll,layout:tab.layout||'single',
        pages: tab.pages.map(function(p) { return { pdf: p.pdf, items: p.items }; }), saved: Date.now() };
    }
    function renderTabs(focus) {
      tabList.replaceChildren();
      tabs.forEach(function(tab){
        var item=document.createElement('div');item.className='pdf-tab';item.setAttribute('role','presentation');
        var select=document.createElement('button');select.type='button';select.className='pdf-tab-select';select.dataset.pdfTab=tab.id;select.id=tab.id;
        select.setAttribute('role','tab');select.setAttribute('aria-controls','boardPlane');select.setAttribute('aria-selected',String(tab===session));select.tabIndex=tab===session?0:-1;select.textContent=tab.name;select.title=tab.name;
        var close=document.createElement('button');close.type='button';close.className='pdf-tab-close';close.dataset.pdfTabClose=tab.id;close.setAttribute('aria-label','PDF sekmesini kapat: '+tab.name);close.title=tab.name+' sekmesini kapat';close.innerHTML=I('x');
        select.disabled=close.disabled=busy;item.append(select,close);tabList.appendChild(item);
        if(tab===session){item.classList.add('is-selected');if(focus)select.focus();}
      });
      var selected=tabList.querySelector('[aria-selected=true]');if(selected)selected.scrollIntoView({block:'nearest',inline:'nearest'});
    }
    function update() {
      if(!session) return;
      var index = api.index(), pages = api.pages(); number.value = index + 1; number.max = pages.length;
      if(!pages[index]||!pages[index].pdf)return;
      bar.querySelector('.pdf-count').textContent = '/ ' + pages.length; bar.querySelector('.pdf-name').textContent = session.name;
      bar.querySelector('.pdf-name').title = session.name; bar.querySelector('.pdf-zoom').value = Math.round(api.view().zoom * 100) + '%';
      [['prev',index === 0],['next',index === pages.length-1],['earlier',index === 0],['later',index === pages.length-1],['delete',pages.length === 1]].forEach(function(p) { bar.querySelector('[data-pdf="'+p[0]+'"]').disabled = busy || p[1]; });
      var marked = !!pages[index].pdf.bookmark; bar.querySelector('[data-pdf=bookmark]').setAttribute('aria-pressed', String(marked));
      var ids=pages.map(function(p,i){return p.pdf.bookmark?i:-1;}).filter(function(i){return i>=0;}),key=ids.join(',');
      if(key!==bookmarkKey||!bookmarks.children.length){bookmarkKey=key;bookmarks.replaceChildren();var empty=document.createElement('option');empty.value='';empty.textContent=ids.length?'Sayfa seçin':'İşaretli sayfa yok';bookmarks.appendChild(empty);ids.forEach(function(i){var o=document.createElement('option');o.value=String(i);o.textContent=(i+1)+'. sayfa';bookmarks.appendChild(o);});}bookmarks.value='';bookmarks.disabled=busy||!ids.length;
      if(interactions)interactions.sync();
    }
    function layout() {
      var target = (document.fullscreenElement || document.webkitFullscreenElement) === stage || stage.classList.contains('is-board-fullscreen') ? stage : document.body;
      [bar,status].forEach(function(el) { if(el.parentNode !== target) target.appendChild(el); });
      var r = stage.getBoundingClientRect(), top = Math.max(0,r.top), left = Math.max(0,r.left), right = Math.min(innerWidth,r.right);
      bar.style.top = top + 8 + 'px'; bar.style.left = left + (innerWidth > 760 ? 92 : 8) + 'px'; bar.style.width = Math.max(160,right-left-(innerWidth>760?106:16)) + 'px';
      bar.style.visibility = r.bottom-top < 100 ? 'hidden' : 'visible';
      var inset=Math.max(104,bar.offsetHeight+20);stage.style.setProperty('--pdf-controls-height',inset+'px');stage.dataset.pdfTop=inset;
      status.style.top = top+inset+'px'; status.style.left = left+12+'px'; status.style.maxWidth = Math.max(160,right-left-24)+'px';
      menu.style.maxHeight = Math.max(100,Math.min(innerHeight,r.bottom)-top-inset-90)+'px'; update();
    }
    function fit(mode) {
      if(!session) return;mode=mode==='width'?'width':'page';session.fit=mode;var d = api.pages()[api.index()].pdf;
      if(session.layout==='facing'){var start=Math.floor(api.index()/2)*2,pair=api.pages().slice(start,start+2);d={width:pair.reduce(function(s,p){return s+p.pdf.width;},0),height:Math.max.apply(null,pair.map(function(p){return p.pdf.height;}))};}
      var w = Math.max(100,stage.clientWidth-24), h = Math.max(100,Math.min(stage.clientHeight,innerHeight)-Math.max(104,bar.offsetHeight+20)-90);
      fitting=true;try{api.zoom(mode === 'width' ? w/d.width : Math.min(w/d.width,h/d.height));}finally{fitting=false;}
      stage.scrollTop = 0; stage.scrollLeft = Math.max(0,(stage.scrollWidth-stage.clientWidth)/2); update();
      if(views&&views.mode()!=='single')views.scrollTo(api.index());
    }
    function change() {
      if(!session) return;
      clearTimeout(autosave); autosave = setTimeout(persist, 1800); update();
    }
    async function persist() {
      clearTimeout(autosave); autosave = null;
      if(!session || !cacheEnabled || busy || api.drawing()) { if(session && cacheEnabled) autosave = setTimeout(persist,1800); return; }
      capture();var current = session, currentTabs=tabs.slice(), sourceKey=tabs.map(function(t){return t.id;}).join(','),label = bar.querySelector('.pdf-cache-status');
      var data=JSON.stringify({version:2,active:tabs.indexOf(session),documents:tabs.map(manifest)}),size=new Blob([data]).size;
      var sourceSize=tabs.reduce(function(sum,t){return sum+t.blob.size;},0);
      if(size>MAX_NOTES || size+sourceSize>MAX_CACHE) { label.textContent = 'Açık belgeler 24 MB kayıt sınırını aşıyor. Her PDF’yi dosya olarak kaydedin.'; return; }
      saving = saving.catch(function() {}).then(async function() {
        if(current !== session || !cacheEnabled) return;
        try {
          var record={manifest:data};if(cachedSources!==sourceKey){record.pdf={version:2,pdfs:[]};for(var i=0;i<currentTabs.length;i++)record.pdf.pdfs.push(await currentTabs[i].blob.arrayBuffer());}
          if(current!==session||!cacheEnabled)return;await storedSession('put',record);cachedSources=sourceKey;current.cacheSaved=true;
          label.textContent='Bu cihazda '+currentTabs.length+' PDF kaydedildi · '+Math.ceil((sourceSize+size)/1048576)+' / 24 MB';
        }
        catch(error) { if(current === session) label.textContent = 'Cihaz kaydı yapılamadı. Düzenlenebilir dosyayı kaydedin.'; }
      });
      return saving;
    }
    async function parse(file, savedManifest) {
      if(!file || !file.size || file.size > MAX_FILE + MAX_NOTES + 1048576) throw new Error('En fazla 50 MB PDF veya 59 MB tahta dosyası seçin.');
      var blob = file, m = savedManifest || null;
      if(/\.tahta$/i.test(file.name || '')) {
        var zip = await script('fflate.min.js','fflate'), unpacked = zip.unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: function(f) {
          var limit = f.name === 'source.pdf' ? MAX_FILE : f.name === 'manifest.json' ? MAX_NOTES : 0;
          if(!limit || f.originalSize > limit) throw new Error('Tahta arşivi sınırları aşılıyor.'); return true;
        } });
        if(!unpacked['source.pdf'] || !unpacked['manifest.json']) throw new Error('Tahta dosyası eksik.');
        m = JSON.parse(new TextDecoder().decode(unpacked['manifest.json'])); blob = new Blob([unpacked['source.pdf']],{type:'application/pdf'});
      }
      if(blob.size > MAX_FILE) throw new Error('PDF 50 MB sınırını aşıyor.');
      var bytes = new Uint8Array(await blob.arrayBuffer());
      if(!new TextDecoder().decode(bytes.subarray(0,1024)).includes('%PDF-')) throw new Error('Geçerli bir PDF seçin.');
      var lib = await reader(), task = lib.getDocument({data:bytes,cMapUrl:BASE+'cmaps/',cMapPacked:true,standardFontDataUrl:BASE+'standard_fonts/',wasmUrl:BASE+'wasm/',isEvalSupported:false,enableXfa:false,stopAtErrors:false,maxImageSize:12000000,canvasMaxAreaInBytes:16000000});
      task.onPassword = function(updatePassword) { var password = root.prompt('PDF parolası:'); if(password === null) task.destroy(); else updatePassword(password); };
      var doc;
      try {
        doc = await task.promise; if(doc.numPages > MAX_PAGES) throw new Error('Akıcı kullanım için en fazla 300 sayfalık bir PDF seçin.');
        var pages = [];
        if(m) { validateManifest(m,doc.numPages); pages = m.pages; }
        else {
          for(var i=1;i<=doc.numPages;i++) {
            var p = await doc.getPage(i), v = p.getViewport({scale:1});
            var factor = Math.min(800/v.width, 2200/v.height, 1.5);
            pages.push({items:[],pdf:{page:i,width:v.width*factor,height:v.height*factor}}); p.cleanup();
            if(i%10 === 0) await nextFrame();
          }
        }
        return { blob:blob, doc:doc, task:task, name:String(m && m.name || file.name || 'Belge.pdf').slice(0,180), pages:pages, index:m?Math.max(0,Math.min(pages.length-1,Math.floor(Number(m.index)||0))):0, zoom:m?Number(m.zoom)||1:null, fit:m?(['width','page'].indexOf(m.fit)>=0?m.fit:null):'page',scroll:m&&m.scroll,layout:m&&['facing','continuous'].indexOf(m.layout)>=0?m.layout:'single' };
      } catch(error) { await task.destroy(); throw error; }
    }
    async function open(file, savedManifest) {
      if(busy) return;
      if(tabs.length>=MAX_TABS){message('En fazla 8 PDF sekmesi açabilirsiniz. Kullanmadığınız bir sekmeyi kapatın.',true);return;}
      if(tabs.reduce(function(sum,t){return sum+t.blob.size;},0)+file.size>MAX_OPEN_BYTES){message('Açık PDF’ler için toplam 100 MB sınırına ulaşıldı.',true);return;}
      setBusy(true,'Belge hazırlanıyor…');
      var next;
      try {
        next = await parse(file, savedManifest);capture(true);
        if(session){cancelRender(true);await serial.catch(function(){});await disposeDocument(session);}
        next.id='pdf-tab-'+(++tabId);tabs.push(next);await mount(next);setBusy(false,'');renderTabs();change();
      } catch(error) { if(next&&tabs.indexOf(next)<0)await disposeDocument(next);setBusy(false,'PDF açılamadı: ' + (error.message || 'Dosya okunamadı')); status.classList.add('is-error'); }
    }
    async function mount(next) {
      if(!next.doc){var loaded=await parse(new File([next.blob],'Belge.pdf',{type:'application/pdf'}),manifest(next));next.doc=loaded.doc;next.task=loaded.task;}
      if(interactions)interactions.reset();api.begin();session=next;cacheEnabled=cacheCheck.checked;rendered=null;notice.hidden=true;bar.hidden=false;
      stage.classList.add('has-pdf');plane.classList.add('has-pdf');menu.hidden=true;bookmarkKey='';
      renderTabs();layout();api.replace(next.pages,next.index,next.zoom||1);next.pages=api.pages();
      if(next.fit)fit(next.fit);sync();layout();
      if(next.scroll){stage.scrollTop=Math.max(0,Math.min(1,Number(next.scroll.top)||0))*(stage.scrollHeight-stage.clientHeight);stage.scrollLeft=Math.max(0,Math.min(1,Number(next.scroll.left)||0))*(stage.scrollWidth-stage.clientWidth);}
    }
    async function switchTab(id,focus) {
      if(busy||api.drawing())return;var next=tabs.find(function(t){return t.id===id;});if(!next||next===session)return;
      setBusy(true,'PDF sekmesi açılıyor…');capture(true);var previous=session;
      try{cancelRender(true);await serial.catch(function(){});await disposeDocument(previous);await mount(next);setBusy(false,'');renderTabs(focus);change();}
      catch(error){try{if(previous)await mount(previous);}catch(restoreError){}setBusy(false,'PDF sekmesi açılamadı. Belgeyi yerel dosyasından tekrar açın.');renderTabs();status.classList.add('is-error');}
    }
    async function openFiles(files) {
      for(var i=0;i<files.length;i++){await open(files[i]);if(status.classList.contains('is-error'))break;}
    }
    function cancelRender(all) { generation++; if(rendering) rendering.cancel(); rendering = null;if(all){if(views)views.clear();clearText();} }
    function sync() {
      if(!session) return;
      if(api.sandbox)bar.hidden=api.sandbox();
      update(); var page = api.pages()[api.index()];
      if(views)views.set(api.pages(),api.index(),api.view().zoom,api.sandbox&&api.sandbox()?'single':session.layout,session.doc);
      refreshText();
      if(rendered === page){if(views&&!canvas.hidden&&!views.background(page))views.snapshot(page,canvas);return;}
      cancelRender(); var token = generation, current = session; rendered = page; search.value = ''; searchText.value = '';
      canvas.hidden = true;searchLayer.replaceChildren();searchGeneration++;stage.setAttribute('data-pdf-rendering','');
      var cached=views&&views.background(page);
      if(cached){canvas.width=cached.width;canvas.height=cached.height;canvas.getContext('2d').drawImage(cached,0,0);canvas.hidden=false;stage.removeAttribute('data-pdf-rendering');message('');}
      serial = serial.catch(function(){}).then(async function() {
        if(token !== generation || current !== session) return;
        var proxy,surface;
        try {
          if(page.pdf.page === null) { canvas.width = canvas.height = 1; return; }
          proxy = await current.doc.getPage(page.pdf.page); if(token !== generation) return;
          var v = proxy.getViewport({scale:1}), size = bounds(page.pdf.width,page.pdf.height), viewport = proxy.getViewport({scale:size.width/v.width});
          surface=document.createElement('canvas');surface.width=Math.ceil(viewport.width);surface.height=Math.ceil(viewport.height);
          rendering = proxy.render({canvasContext:surface.getContext('2d',{alpha:false}),viewport:viewport,background:'#ffffff'});
          await rendering.promise;
          if(token === generation) { canvas.width=surface.width;canvas.height=surface.height;canvas.getContext('2d').drawImage(surface,0,0);canvas.hidden = false;if(views)views.snapshot(page,canvas);message(''); }
        } catch(error) { if(token === generation && error.name !== 'RenderingCancelledException') message('Bu PDF sayfası görüntülenemedi.',true); }
        finally { if(proxy) proxy.cleanup();if(surface)surface.width=surface.height=1;if(token === generation) { rendering = null; stage.removeAttribute('data-pdf-rendering'); } }
      });
    }
    function pageAction(action) {
      if(!session || busy || api.drawing()) return;
      if(action==='next'||action==='prev'){var step=session.layout==='facing'?2:1;goIndex(Math.max(0,Math.min(api.pages().length-1,api.index()+(action==='next'?step:-step))),true);return;}
      if(views)views.leave();
      api.commit(); var pages = api.pages(), index = api.index(), page = pages[index], next = index;
      if(action === 'prev' || action === 'next') next += action === 'next' ? 1 : -1;
      if(action === 'add' || action === 'duplicate') {
        if(pages.length >= MAX_PAGES) { message('En fazla 300 sayfa kullanılabilir.',true); return; }
        var copy = action === 'duplicate' ? JSON.parse(JSON.stringify({pdf:page.pdf,items:page.items})) : {items:[],pdf:{page:null,width:page.pdf.width,height:page.pdf.height}};
        copy.pdf.bookmark = false; pages.splice(index+1,0,api.normalize(copy)); next++;
      }
      if(action === 'delete') { if(pages.length<=1 || !root.confirm((index+1)+'. PDF sayfası ve üzerindeki çizimler silinsin mi?')) return; pages.splice(index,1); next = Math.min(index,pages.length-1); }
      if(action === 'earlier' || action === 'later') { next += action === 'later'?1:-1; if(next<0 || next>=pages.length)return; pages.splice(index,1);pages.splice(next,0,page); }
      if(action === 'bookmark') { page.pdf.bookmark = !page.pdf.bookmark; message(page.pdf.bookmark ? (index+1)+'. sayfa işaretlendi' : 'Sayfa işareti kaldırıldı'); update(); change(); return; }
      if(next<0 || next>=pages.length) return;
      api.replace(pages,next,api.view().zoom);if(session.fit)fit(session.fit);sync();if(views&&views.mode()!=='single')views.scrollTo(next);else stage.scrollTop=0;change();
    }
    function goIndex(next,scroll){
      if(!session||busy||api.drawing()||next<0||next>=api.pages().length)return;if(next===api.index()){if(scroll&&views&&views.mode()!=='single')views.scrollTo(next);return;}
      api.commit();if(views)views.leave();var top=stage.scrollTop,left=stage.scrollLeft;api.replace(api.pages(),next,api.view().zoom);sync();
      if(session.layout==='single'){if(session.fit)fit(session.fit);if(scroll)stage.scrollTop=0;}
      else if(scroll&&views)views.scrollTo(next);else{stage.scrollTop=top;stage.scrollLeft=left;}change();
    }
    function setView(value){if(!session||busy)return;api.commit();menu.hidden=true;if(views)views.leave();session.layout=['facing','continuous'].indexOf(value)>=0?value:'single';sync();fit('page');change();}
    function download(blob, name) { var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},60000); }
    async function project() {
      api.commit(); var zip = await script('fflate.min.js','fflate'), m = JSON.stringify(manifest());
      if(new Blob([m]).size>MAX_NOTES) throw new Error('Çizim kaydı 8 MB sınırını aşıyor. PDF olarak kaydedin.');
      var archive = zip.zipSync({'manifest.json':new TextEncoder().encode(m),'source.pdf':new Uint8Array(await session.blob.arrayBuffer())},{level:0});
      download(new Blob([archive],{type:'application/octet-stream'}),session.name.replace(/\.(pdf|tahta)$/i,'')+'.tahta');
    }
    async function exportPDF() {
      if(root.Worker){await exportWorker();return;}
      api.commit(); var lib = await script('pdf-lib.min.js','PDFLib'), source = await lib.PDFDocument.load(await session.blob.arrayBuffer()), output = await lib.PDFDocument.create();
      var pages = JSON.parse(JSON.stringify(api.pages().map(function(p){return {pdf:p.pdf,items:p.items};})));
      for(var i=0;i<pages.length;i++) {
        message('PDF kaydediliyor · ' + (i+1) + ' / ' + pages.length);
        var item = pages[i], page;
        if(item.pdf.page === null) page = output.addPage([595.28,595.28*item.pdf.height/item.pdf.width]);
        else { page = (await output.copyPages(source,[item.pdf.page-1]))[0]; output.addPage(page); }
        if(item.items.length) {
          var overlay = await api.annotationCanvas(item), blob = await new Promise(function(resolve){overlay.toBlob(resolve,'image/png');});
          if(!blob) throw new Error('Çizimler hazırlanamadı.');
          var png = await output.embedPng(await blob.arrayBuffer()), placement = overlayPlacement(page,page.getRotation().angle);
          page.drawImage(png,{x:placement.x,y:placement.y,width:placement.width,height:placement.height,rotate:lib.degrees(placement.angle)}); overlay.width=overlay.height=1;
        }
        await nextFrame();
      }
      var data = await output.save(); download(new Blob([data],{type:'application/pdf'}),session.name.replace(/\.(pdf|tahta)$/i,'')+'-islenmis.pdf');
    }
    async function exportWorker() {
      api.commit();var pages=JSON.parse(JSON.stringify(api.pages().map(function(p){return{pdf:p.pdf,items:p.items};})));var response=await fetch(BASE+'pdf-lib.min.js');if(!response.ok)throw new Error('PDF kayıt kitaplığı yüklenemedi.');
      // Fetch through the controlled page so the narrowly scoped offline cache
      // also supplies the library to a dedicated worker outside that scope.
      var library=URL.createObjectURL(await response.blob()),worker,pending=new Map(),id=0;
      try{worker=new Worker('/js/smartboard-pdf-writer.js');}catch(error){URL.revokeObjectURL(library);throw error;}
      worker.onmessage=function(e){var p=pending.get(e.data.id);if(!p)return;pending.delete(e.data.id);if(e.data.error){var error=new Error(e.data.error.message);error.name=e.data.error.name;p.reject(error);}else p.resolve(e.data.bytes);};
      worker.onerror=function(){pending.forEach(function(p){p.reject(new Error('PDF kaydetme aracı yüklenemedi. Çevrimdışı hazırlamayı kontrol edin.'));});pending.clear();};
      function request(op,data,transfers){return new Promise(function(resolve,reject){var key=++id;pending.set(key,{resolve:resolve,reject:reject});worker.postMessage({id:key,op:op,data:data},transfers||[]);});}
      try{
        var bytes=await session.blob.arrayBuffer();await request('start',{bytes:bytes,library:library},[bytes]);
        for(var i=0;i<pages.length;i++){
          message('PDF kaydediliyor · '+(i+1)+' / '+pages.length);var p=pages[i],overlay=null;
          if(p.items.length){var c=await api.annotationCanvas(p),blob=await new Promise(function(resolve){c.toBlob(resolve,'image/png');});if(!blob)throw new Error('Çizimler hazırlanamadı.');overlay=await blob.arrayBuffer();c.width=c.height=1;}
          await request('page',{page:p.pdf.page,width:p.pdf.width,height:p.pdf.height,overlay:overlay},overlay?[overlay]:[]);await nextFrame();
        }
        var saved=await request('finish',{});download(new Blob([saved],{type:'application/pdf'}),session.name.replace(/\.(pdf|tahta)$/i,'')+'-islenmis.pdf');
      }finally{worker.terminate();URL.revokeObjectURL(library);pending.clear();}
    }
    async function close(id) {
      if(!session||busy||api.drawing())return;var target=id?tabs.find(function(t){return t.id===id;}):session;if(!target)return;
      if(!root.confirm(target.name+' sekmesi kapatılsın mı? Kaydetmediğiniz çizimleri korumak için önce düzenlenebilir dosyayı kaydedin.'))return;
      capture(true);await persist();setBusy(true,'PDF sekmesi kapatılıyor…');
      try{
        var index=tabs.indexOf(target);
        if(target===session){
          capture();cancelRender(true);await serial.catch(function(){});await disposeDocument(target);
          var next=tabs[index+1]||tabs[index-1];
          if(next){await mount(next);tabs.splice(index,1);}
          else{
            tabs.splice(index,1);session=null;rendered=null;clearTimeout(autosave);canvas.hidden=true;canvas.width=canvas.height=1;bar.hidden=true;searchLayer.replaceChildren();
            stage.classList.remove('has-pdf');plane.classList.remove('has-pdf');stage.removeAttribute('data-pdf-rendering');stage.style.removeProperty('--pdf-controls-height');delete stage.dataset.pdfTop;
            if(interactions)interactions.reset();api.end();checkResume();
          }
        }else{await disposeDocument(target);tabs.splice(index,1);}
        setBusy(false,'');renderTabs(true);if(session){change();await persist();}
      }catch(error){setBusy(false,'Sekme kapatılamadı. Çalışmanızı kaydedip yeniden deneyin.');renderTabs();status.classList.add('is-error');}
    }
    async function checkResume() {
      try { var data = await storedSession('info'); if(!session && data && data.manifest) { var m = JSON.parse(data.manifest),docs=m.version===2?m.documents:[m],active=m.version===2?docs[m.active]||docs[0]:m;if(!active)return;notice.querySelector('span').textContent=(docs.length>1?docs.length+' PDF · ':'')+String(active.name||'PDF')+' · Son çalışma: '+((Number(active.index)||0)+1)+'. sayfa';notice.hidden=false; } } catch(error) {}
    }
    async function resume() {
      if(busy)return;var data=await storedSession('get');if(!data||!data.pdf)return;var saved=JSON.parse(data.manifest);
      if(saved.version!==2){await open(new File([data.pdf],String(saved.name||'Son-calisma.pdf'),{type:'application/pdf'}),saved);return;}
      if(!Array.isArray(saved.documents)||!saved.documents.length||saved.documents.length>MAX_TABS||!data.pdf.pdfs||data.pdf.pdfs.length!==saved.documents.length)throw new Error('Kayıtlı PDF sekmeleri okunamadı.');
      for(var i=0;i<saved.documents.length;i++){await open(new File([data.pdf.pdfs[i]],'Son-calisma.pdf',{type:'application/pdf'}),saved.documents[i]);if(status.classList.contains('is-error'))return;}
      var active=tabs[Math.max(0,Math.min(tabs.length-1,Number(saved.active)||0))];if(active&&active!==session)await switchTab(active.id);change();
    }
    async function prepareOffline() {
      if(!navigator.serviceWorker || !root.isSecureContext) throw new Error('Çevrimdışı hazırlama için HTTPS veya yerel sunucu kullanın.');
      setBusy(true,'Tahta çevrimdışı kullanıma hazırlanıyor…');
      try {
        var reg = await navigator.serviceWorker.register('/ogretmen/smartboard-offline-sw.js',{scope:'/ogretmen/beyaztahta.html',updateViaCache:'none'});
        var worker = reg.installing || reg.waiting || reg.active;
        if(worker && worker.state !== 'activated') await new Promise(function(resolve,reject){
          var timer=setTimeout(function(){reject(new Error('Hazırlama uzadı. Bağlantıyı kontrol edip yeniden deneyin.'));},90000);
          function state(){if(worker.state==='activated'){clearTimeout(timer);worker.removeEventListener('statechange',state);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);worker.removeEventListener('statechange',state);reject(new Error('Çevrimdışı dosyaları indirilemedi. Yeniden deneyin.'));}}
          worker.addEventListener('statechange',state);state();
        });
        message('Çevrimdışı kullanım hazır. Bu adresi aynı tarayıcıda açabilirsiniz.');
      } finally { setBusy(false);update(); }
    }
    async function action(e) {
      var el = e.target.closest('[data-pdf]'); if(!el || busy) return; var cmd = el.dataset.pdf;
      try {
        if(cmd === 'open') { input.click(); return; }
        if(cmd === 'resume') { await resume();return; }
        if(cmd === 'forget') {
          if(!root.confirm('Bu cihazdaki son PDF ve çizim kaydı silinsin mi? Kaydettiğiniz yerel dosyalar silinmez.')) return;
          cacheEnabled = false; cacheCheck.checked = false; clearTimeout(autosave); await saving.catch(function(){}); await storedSession('delete');cachedSources='';tabs.forEach(function(t){t.cacheSaved=false;});notice.hidden = true; bar.querySelector('.pdf-cache-status').textContent = 'Cihazdaki kayıt silindi.'; return;
        }
        if(cmd === 'close') { await close(); return; }
        if(cmd === 'offline') { await prepareOffline(); return; }
        if(cmd === 'offline-clear') {
          if(!root.confirm('Çevrimdışı tahta dosyaları silinsin mi? İnternetsiz açmak için tekrar hazırlamanız gerekir.'))return;
          if(navigator.serviceWorker){var reg=await navigator.serviceWorker.getRegistration('/ogretmen/beyaztahta.html');if(reg&&reg.scope===location.origin+'/ogretmen/beyaztahta.html')await reg.unregister();}
          if(root.caches){var keys=await caches.keys();await Promise.all(keys.filter(function(k){return k.indexOf('kemal-smartboard-shell-')===0;}).map(function(k){return caches.delete(k);}));}message('Çevrimdışı uygulama dosyaları silindi.');return;
        }
        if(cmd === 'menu') { menu.hidden = !menu.hidden; el.setAttribute('aria-expanded',String(!menu.hidden)); return; }
        if(!session) return;
        if(['prev','next','add','duplicate','delete','earlier','later','bookmark'].indexOf(cmd)>=0) { pageAction(cmd); return; }
        if(cmd === 'fullscreen') { api.fullscreen(); return; }
        if(cmd === 'fit' || cmd === 'width') { fit(cmd); change(); return; }
        if(cmd === 'in' || cmd === 'out') { api.zoom(api.view().zoom*(cmd==='in'?1.2:1/1.2));update();change();return; }
        if(cmd === 'project' || cmd === 'export') { setBusy(true,'Dosya hazırlanıyor…'); try { if(cmd === 'project') await project(); else await exportPDF(); message('Dosya cihazınıza kaydedildi.'); } finally { setBusy(false);update(); } }
      } catch(error) { message(error.name==='EncryptedPDFError'?'Parolalı PDF dışa aktarılamıyor. Korumasız bir kopya açın; çizimlerinizi düzenlenebilir dosya olarak saklayabilirsiniz.':error.message || 'İşlem tamamlanamadı.',true); }
    }
    [bar,notice].forEach(function(el){el.addEventListener('click',action);});
    input.addEventListener('change',function(){var files=Array.from(input.files);input.value='';if(files.length)openFiles(files);});
    tabList.addEventListener('click',function(e){var select=e.target.closest('[data-pdf-tab]'),close=e.target.closest('[data-pdf-tab-close]');if(select)switchTab(select.dataset.pdfTab).catch(function(){message('Sekme açılamadı.',true);});if(close)closeTab(close.dataset.pdfTabClose);});
    function closeTab(id){close(id).catch(function(){message('Sekme kapatılamadı.',true);});}
    tabList.addEventListener('keydown',function(e){
      var el=e.target.closest('[data-pdf-tab]');if(!el)return;var index=tabs.findIndex(function(t){return t.id===el.dataset.pdfTab;}),next=index;
      if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else if(e.key==='Delete'){e.preventDefault();e.stopPropagation();closeTab(el.dataset.pdfTab);return;}else return;
      e.preventDefault();e.stopPropagation();switchTab(tabs[next].id,true).catch(function(){message('Sekme açılamadı.',true);});
    });
    ['boardPdfOpenBtn','boardPdfToolBtn'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(){input.click();});});
    number.addEventListener('change',function(){goIndex(Math.max(0,Math.min(api.pages().length-1,Math.floor(Number(number.value)||1)-1)),true);});
    bookmarks.addEventListener('change',function(){if(bookmarks.value==='')return;number.value=Number(bookmarks.value)+1;number.dispatchEvent(new Event('change'));});
    cacheCheck.addEventListener('change',async function(){cacheEnabled=cacheCheck.checked;if(cacheEnabled)change();else{await saving.catch(function(){});await storedSession('delete').catch(function(){});cachedSources='';tabs.forEach(function(t){t.cacheSaved=false;});bar.querySelector('.pdf-cache-status').textContent='Cihazda kayıt tutulmuyor. Dosyayı kaydedin.';}});
    var searchGeneration=0;
    search.addEventListener('input',async function(){
      var token=++searchGeneration, text=search.value.trim().toLocaleLowerCase('tr'), page=api.pages()[api.index()], current=session;
      searchLayer.replaceChildren();
      if(!text||!page.pdf.page){searchText.value='';return;}
      try{var proxy=await current.doc.getPage(page.pdf.page), content=await proxy.getTextContent();
        if(token!==searchGeneration||current!==session||page!==api.pages()[api.index()])return;
        var value=content.items.map(function(i){return i.str;}).join(' ').toLocaleLowerCase('tr'), hits=value.split(text).length-1;
        searchText.value=hits?hits+' eşleşme':'Bu sayfada bulunamadı (taranmış PDF metin içermeyebilir).';
        var lib=await reader(),v=proxy.getViewport({scale:1}),viewport=proxy.getViewport({scale:page.pdf.width/v.width});
        searchLayer.setAttribute('viewBox','0 0 '+page.pdf.width+' '+page.pdf.height);
        content.items.filter(function(i){return i.str&&i.str.toLocaleLowerCase('tr').indexOf(text)>=0;}).slice(0,300).forEach(function(i){
          var t=lib.Util.transform(viewport.transform,i.transform),len=Math.hypot(t[0],t[1])||1,w=i.width*viewport.scale,up=[t[2],t[3]],base=[t[0]/len*w,t[1]/len*w],origin=[t[4]-up[0]*.15,t[5]-up[1]*.15];
          var points=[[0,0],base,[base[0]+up[0],base[1]+up[1]],up].map(function(p){return (origin[0]+p[0])+','+(origin[1]+p[1]);}).join(' '),poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',points);searchLayer.appendChild(poly);
        });proxy.cleanup();
      }catch(error){searchText.value='Metin okunamadı.';}
    });
    views=root.SmartboardPDFViews.create({stage:stage,plane:plane,notes:api.annotationCanvas,paintNotes:api.paintNotes,drawing:api.drawing,canFollow:function(){return !(interactions&&(interactions.gesturing()||interactions.textMode()));},activate:goIndex});
    interactions=root.SmartboardPDFInteractions.init({stage:stage,plane:plane,bar:bar,active:function(){return !!session;},busy:function(){return busy;},sandbox:api.sandbox,tool:api.tool,view:function(){return session&&session.layout||'single';},setView:setView,showText:showText,
      selected:api.selected,removeSelected:api.removeSelected,paste:api.paste,image:api.image,undo:api.undo,redo:api.redo,print:api.print,cancelTouch:api.cancelTouch,message:message,
      pageText:async function(){var p=api.pages()[api.index()];if(!p.pdf.page)return '';var proxy=await session.doc.getPage(p.pdf.page),text=await proxy.getTextContent();return text.items.map(function(i){return i.str+(i.hasEOL?'\n':' ');}).join('');},
      zoom:function(value,center){if(value)api.zoom(value,center);return api.view().zoom;},fit:fit,step:function(n){pageAction(n>0?'next':'prev');},go:function(i){goIndex(i,true);},count:function(){return api.pages().length;},open:function(){input.click();},save:function(project){action({target:bar.querySelector('[data-pdf='+(project?'project':'export')+']')});},find:function(){menu.hidden=false;search.focus();search.select();}});
    stage.addEventListener('pointerdown',function(e){
      var cell=e.target.closest('.pdf-view-page');if(!session||busy||!cell||e.target.closest('button,input,textarea,select,#boardToolbar,.pdf-text-layer')||plane.contains(e.target))return;
      var next=Number(cell.dataset.pdfPage);if(!api.drawing())goIndex(next,false);if(interactions.textMode())return;e.preventDefault();e.stopImmediatePropagation();api.forward(e);
    },true);
    stage.addEventListener('pointerdown',function(e){if((busy||stage.hasAttribute('data-pdf-rendering')&&(!views||views.mode()==='single'))&&e.target.closest('.board-surface')){e.preventDefault();e.stopImmediatePropagation();}},true);
    root.addEventListener('scroll',layout,{passive:true});root.addEventListener('resize',layout);
    stage.addEventListener('scroll',function(){if(session&&!busy){clearTimeout(autosave);autosave=setTimeout(persist,1800);}},{passive:true});
    ['fullscreenchange','webkitfullscreenchange'].forEach(function(n){document.addEventListener(n,function(){layout();if(session)setTimeout(function(){fit('page');},60);});});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')menu.hidden=true;});
    document.addEventListener('visibilitychange',function(){if(document.hidden)persist();});
    root.addEventListener('pagehide',function(){if(session&&session.cacheSaved)persist();});
    checkResume();
    return {active:function(){return !!session;},sync:sync,changed:change,dimensions:function(){return session?api.pages()[api.index()].pdf:null;},busy:function(){return busy;},pageAction:pageAction,
      zoomAnchor:function(center){var a=views&&views.anchor(center);if(a){a.multi=true;return a;}var r=plane.getBoundingClientRect();return{x:(center.clientX-r.left)/api.view().zoom,y:(center.clientY-r.top)/api.view().zoom,clientX:center.clientX,clientY:center.clientY};},
      restoreZoomAnchor:function(a){if(a.multi&&views&&views.mode()!=='single'){views.restore(a);return;}var r=plane.getBoundingClientRect(),z=api.view().zoom;stage.scrollLeft+=r.left+a.x*z-a.clientX;stage.scrollTop+=r.top+a.y*z-a.clientY;},
      manualZoom:function(){if(session&&!fitting)session.fit=null;},export:function(){if(session&&!busy)action({target:bar.querySelector('[data-pdf=export]')});},paint:function(ctx,w,h){if(session&&!canvas.hidden)ctx.drawImage(canvas,0,0,w,h);},open:open,fit:fit};
  }
  root.SmartboardPDF={init:init,bounds:bounds,validateManifest:validateManifest,overlayPlacement:overlayPlacement,disposeDocument:disposeDocument,limits:{file:MAX_FILE,cache:MAX_CACHE,pages:MAX_PAGES,tabs:MAX_TABS,openBytes:MAX_OPEN_BYTES}};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.SmartboardPDF;
})(typeof window!=='undefined'?window:globalThis);
