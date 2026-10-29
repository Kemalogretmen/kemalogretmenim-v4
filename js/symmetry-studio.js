/* Editable geometry, reflected from its source on every render. Geometry is kept
   in stable board coordinates, independent of CSS size or device pixel ratio. */
(() => {
  'use strict';
  const G = window.ReflectionGeometry, svg = document.getElementById('symmetryCanvas');
  if (!G || !svg) return;
  const $ = selector => document.querySelector(selector), NS = 'http://www.w3.org/2000/svg';
  const WIDTH = 1000, HEIGHT = 720, GRID = 40;
  const state = { axis: { x: 500, y: 360, angle: 90 }, axisMode: 'vertical', mode: 'auto', answer: false, tool: 'select', color: '#3978d0', brush: 4, paper: 'square', labels: true, guides: false, snap: true, items: [], selected: null, polygon: [], history: [], gesture: null, id: 1, pointIndex: 0 };
  const icons = {
    mirror:'<path d="M16 2v28" stroke-dasharray="3 3"/><path d="m12 7-8 9 8 9Zm8 0 8 9-8 9Z"/>',
    select:'<path d="m7 3 19 15-10 1-5 10Z"/>',pen:'<path d="m5 23 17-18 5 5-17 18-7 1Zm14-15 5 5"/>',point:'<circle cx="16" cy="16" r="5"/><path d="M16 3v5m0 16v5M3 16h5m16 0h5"/>',polygon:'<path d="m7 7 18 3 3 15-18 3-6-12Z"/><path d="M5 4h5v5H5Zm18 3h5v5h-5ZM8 25h5v5H8Z"/>',line:'<path d="M5 27 27 5"/><circle cx="5" cy="27" r="2"/><circle cx="27" cy="5" r="2"/>',pixels:'<path d="M4 4h10v10H4Zm14 0h10v10H18ZM4 18h10v10H4Zm14 0h10v10H18Z"/>',text:'<path d="M5 5h22M16 5v24M11 29h10M5 5v5m22-5v5"/>',eraser:'<path d="m5 20 15-15 9 9-15 15H9Zm7-7 9 9M15 29h14"/>',triangle:'<path d="M16 3 30 28H2Z"/>',square:'<rect x="5" y="5" width="22" height="22"/>',rectangle:'<rect x="2" y="8" width="28" height="17"/>',diamond:'<path d="m16 2 14 14-14 14L2 16Z"/>',circle:'<circle cx="16" cy="16" r="13"/>',pentagon:'<path d="m16 2 14 11-5 16H7L2 13Z"/>',undo:'<path d="M12 6 4 14l8 8M5 14h15c9 0 9 13 0 13"/>',trash:'<path d="M5 8h22M12 8V4h8v4M8 8l2 21h12l2-21M13 13v11m6-11v11"/>',clear:'<path d="m5 25 17-20 6 6L11 30ZM15 14l7 6M7 27l-3 3m13-3h11"/>',download:'<path d="M16 3v18m-6-6 6 6 6-6M5 24v5h22v-5"/>'
  };
  function el(tag, attrs = {}, text) { const n = document.createElementNS(NS, tag); for (const [key, value] of Object.entries(attrs)) n.setAttribute(key, value); if (text !== undefined) n.textContent = text; return n; }
  document.querySelectorAll('[data-icon]').forEach(host => { const icon = el('svg',{viewBox:'0 0 32 32',class:'symmetry-icon',fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}); icon.innerHTML = icons[host.dataset.icon] || icons.mirror; host.append(icon); });
  const defs = el('defs');
  const gridPattern = el('pattern',{id:'symmetrySquare',x:500,y:360,width:GRID,height:GRID,patternUnits:'userSpaceOnUse'}); gridPattern.append(el('path',{d:`M${GRID} 0H0V${GRID}`,fill:'none',stroke:'#dce4ef','stroke-width':1}));
  const dots = el('pattern',{id:'symmetryDots',x:500,y:360,width:GRID,height:GRID,patternUnits:'userSpaceOnUse'}); dots.append(el('circle',{cx:0,cy:0,r:2,fill:'#a8b7ca'}));
  const iso = el('pattern',{id:'symmetryIso',x:500,y:360,width:80,height:46.188,patternUnits:'userSpaceOnUse'}); iso.append(el('path',{d:'M0 0v46.188M40 0v46.188M80 0v46.188M0 0l80 46.188M0 46.188 80 0',fill:'none',stroke:'#e1e8f1','stroke-width':1}));
  const arrow = el('marker',{id:'axisArrow',viewBox:'0 0 10 10',refX:5,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'}); arrow.append(el('path',{d:'M0 0 10 5 0 10 3 5Z',fill:'#3e526f'}));
  defs.append(gridPattern,dots,iso,arrow); const paper = el('rect',{width:WIDTH,height:HEIGHT,fill:'white'}), paperPattern=el('rect',{width:WIDTH,height:HEIGHT});
  const guides = el('g',{'aria-hidden':'true'}), mirrors = el('g',{'data-layer':'reflections','aria-label':'Yansıyan şekiller'}), originals = el('g',{'data-layer':'originals','aria-label':'Asıl şekiller'}), labels = el('g',{'pointer-events':'none'}), axes = el('g'), interaction = el('g',{class:'interaction'});
  svg.append(defs,paper,paperPattern,guides,mirrors,originals,labels,axes,interaction);
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function snapshot() { return { axis: clone(state.axis), axisMode:state.axisMode, items:clone(state.items), pointIndex:state.pointIndex }; }
  function history() { state.history.push(snapshot()); if (state.history.length > 60) state.history.shift(); }
  function restore(snapshot) { state.axis=snapshot.axis; state.axisMode=snapshot.axisMode; state.items=snapshot.items; state.pointIndex=snapshot.pointIndex; state.selected=null; state.gesture=null; state.polygon=[]; syncUI(); render(); }
  function undo() { const previous=state.history.pop(); if (previous) restore(previous); }
  function newItem(value) { const item={id:state.id++,color:state.color,role:'source',...value}; state.items.push(item); state.selected=item.id; return item; }
  const chosen = () => state.items.find(item=>item.id===state.selected);
  function point(event) { const r=svg.getBoundingClientRect(), scale=Math.min(r.width/WIDTH,r.height/HEIGHT)||1; return { x: Math.max(0,Math.min(WIDTH,(event.clientX-r.left-(r.width-WIDTH*scale)/2)/scale)), y:Math.max(0,Math.min(HEIGHT,(event.clientY-r.top-(r.height-HEIGHT*scale)/2)/scale)) }; }
  function snap(p) { if (!state.snap || state.paper==='plain') return p; const column=Math.round((p.x-500)/GRID), x=Math.max(0,Math.min(WIDTH,500+column*GRID)); if(state.paper==='isometric'){const offset=(Math.abs(column)%2)*23.094;return {x,y:Math.max(0,Math.min(HEIGHT,360+offset+Math.round((p.y-360-offset)/46.188)*46.188))};} return {x,y:Math.max(0,Math.min(HEIGHT,360+Math.round((p.y-360)/GRID)*GRID))}; }
  function pixelCell(p) { return {x:Math.max(0,Math.min(WIDTH-GRID,500+Math.floor((p.x-500)/GRID)*GRID)),y:Math.max(0,Math.min(HEIGHT-GRID,360+Math.floor((p.y-360)/GRID)*GRID))}; }
  function boardScale() { const r=svg.getBoundingClientRect();return Math.min(r.width/WIDTH,r.height/HEIGHT)||1; }
  function targetRadius() { return Math.max(22,16/boardScale()); }
  function matrixString(m) { return `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`; }
  function apply(m,p) { return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f}; }
  function reflectionTransforms() {
    if (state.axisMode==='both') { const vertical=G.reflectionMatrix({x:state.axis.x,y:state.axis.y,angle:90}), horizontal=G.reflectionMatrix({x:state.axis.x,y:state.axis.y,angle:0}); return [vertical,horizontal,{a:-1,b:0,c:0,d:-1,e:state.axis.x*2,f:state.axis.y*2}]; }
    return [G.reflectionMatrix(state.axis)];
  }
  function itemPoints(item) { if (item.points) return item.points; if(item.kind==='circle') return [{x:item.x-item.r,y:item.y-item.r},{x:item.x+item.r,y:item.y+item.r}]; if(item.kind==='text') return [{x:item.x,y:item.y-item.size},{x:item.x+Math.max(item.size,item.text.length*item.size*.6),y:item.y+5}]; return [{x:item.x-7,y:item.y-7},{x:item.x+7,y:item.y+7}]; }
  function itemBounds(item) { const points=itemPoints(item); const xs=points.map(p=>p.x),ys=points.map(p=>p.y); return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}; }
  function drawItem(item,parent,reflected=false,transform=null) {
    const color=reflected?'#169b87':item.role==='student'?'#d88743':item.color;
    const group=el('g',{'data-item-id':item.id,class:reflected?'symmetry-reflection':'symmetry-item',...(transform?{transform:matrixString(transform)}:{})});
    if(reflected)group.setAttribute('pointer-events','none');
    else {group.setAttribute('tabindex','0');group.setAttribute('role','button');group.setAttribute('aria-label',item.kind==='point'?`${item.label} noktası. Ok tuşlarıyla taşı.`:'Şekil. Ok tuşlarıyla taşı.');}
    let shape;
    if (item.kind==='polygon') shape=el('polygon',{points:item.points.map(p=>`${p.x},${p.y}`).join(' '),fill:color,'fill-opacity':reflected?.12:.13,stroke:color,'stroke-width':3.5,'stroke-linejoin':'round'});
    else if(item.kind==='stroke'||item.kind==='line') shape=el('polyline',{points:item.points.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:color,'stroke-width':item.size||4,'stroke-linecap':'round','stroke-linejoin':'round'});
    else if(item.kind==='circle') shape=el('circle',{cx:item.x,cy:item.y,r:item.r,fill:color,'fill-opacity':.12,stroke:color,'stroke-width':3.5});
    else if(item.kind==='text')shape=el('text',{x:item.x,y:item.y,fill:color,'font-family':item.font||'Segoe UI, sans-serif','font-size':item.size,'font-weight':600},item.text);
    else if(item.kind==='pixel')shape=el('polygon',{points:item.points.map(p=>`${p.x},${p.y}`).join(' '),fill:color,'fill-opacity':reflected?.65:.8,stroke:'none'});
    else shape=el('circle',{cx:item.x,cy:item.y,r:Math.max(6.5,3/boardScale()),fill:color,stroke:'white','stroke-width':2});
    group.append(shape);
    if (!reflected) { const hit=shape.cloneNode(true); hit.setAttribute('opacity',0); if(item.kind==='stroke'||item.kind==='line'){hit.setAttribute('stroke-width',Math.max(targetRadius()*2,item.size||4));hit.setAttribute('pointer-events','stroke');} else {hit.setAttribute('pointer-events','all');if(item.kind==='point')hit.setAttribute('r',targetRadius());}group.append(hit); }
    parent.append(group);
    if(state.labels && item.role!=='student') {
      const points=item.kind==='point'?[{x:item.x,y:item.y,label:item.label}]:item.kind==='polygon'?item.points.map((p,i)=>({...p,label:String.fromCharCode(65+i)})):[];
      points.forEach(p=> { const q=transform?apply(transform,p):p; if (q.x<0||q.x>WIDTH||q.y<0||q.y>HEIGHT)return; const offset=Math.max(12,8/boardScale());labels.append(el('text',{x:q.x+offset,y:q.y-offset,fill:color,'font-size':Math.max(21,12/boardScale()),'font-weight':600,'font-family':'Segoe UI, sans-serif',stroke:'#fff','stroke-width':4,'paint-order':'stroke'},`${p.label}${reflected?'′':''}`)); });
    }
  }
  function drawGuides(item) {
    if (!state.guides || (state.mode!=='auto'&&!state.answer) || item.role==='student') return;
    const pts=item.kind==='point'?[item]:item.kind==='polygon'?item.points:[];
    pts.forEach(p=>{ const q=G.reflectPoint(p,state.axis),foot=G.projectPoint(p,state.axis); guides.append(el('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'#9db0c8','stroke-width':1.5,'stroke-dasharray':'6 6'}));
      const dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);if(length<8)return; const nx=-dy/length,ny=dx/length;
      for(const t of [.25,.75]){const x=p.x+dx*t,y=p.y+dy*t;guides.append(el('line',{x1:x-nx*5,y1:y-ny*5,x2:x+nx*5,y2:y+ny*5,stroke:'#899eb8','stroke-width':1.5}));}
      guides.append(el('circle',{cx:foot.x,cy:foot.y,r:3,fill:'#9eafc5'}));
    });
  }
  function handle(parent,p,kind,index,large=false) { const g=el('g',{class:kind==='axis-rotate'?'symmetry-axis-rotation':kind==='axis-move'?'symmetry-axis-grip':'symmetry-handle', 'data-handle':kind,...(index!==undefined?{'data-index':index}:{}),transform:`translate(${p.x} ${p.y})`});g.append(el('circle',{r:Math.max(large?30:22,targetRadius()),fill:'transparent','pointer-events':'all'}),el('circle',{r:large?11:7,fill:kind==='vertex'?'#fff4c7':'white',stroke:kind==='vertex'?'#c79d35':'#3478cf','stroke-width':2.5})); if(kind==='axis-move'){g.append(el('path',{d:'M-5 0H5M0-5V5',fill:'none',stroke:'#3478cf','stroke-width':1.5}));} parent.append(g); }
  function drawAxes() {
    axes.replaceChildren();
    const all=state.axisMode==='both'?[{...state.axis,angle:90},{...state.axis,angle:0}]:[state.axis];
    all.forEach((axis,i)=>{const ends=G.axisLineEndpoints(axis,{x:18,y:18,width:WIDTH-36,height:HEIGHT-36});if(!ends)return; axes.append(el('line',{x1:ends[0].x,y1:ends[0].y,x2:ends[1].x,y2:ends[1].y,stroke:'#3e526f','stroke-width':2.4,'stroke-dasharray':'9 7','marker-start':'url(#axisArrow)','marker-end':'url(#axisArrow)','pointer-events':'none'}));const end=ends[0].y<ends[1].y?ends[0]:ends[1]; axes.append(el('text',{x:Math.max(15,Math.min(WIDTH-25,end.x+14)),y:Math.max(30,end.y+15),fill:'#3d526f','font-size':24,'font-family':'Georgia, serif','font-style':'italic'},i?'e':'d'));});
    handle(interaction,state.axis,'axis-move',undefined,true);
    if(state.axisMode!=='both') { const a=state.axis.angle*Math.PI/180, end={x:state.axis.x+Math.cos(a)*150,y:state.axis.y-Math.sin(a)*150}; if(end.x>22&&end.x<WIDTH-22&&end.y>22&&end.y<HEIGHT-22){ interaction.append(el('line',{x1:state.axis.x,y1:state.axis.y,x2:end.x,y2:end.y,stroke:'#3b7cd4','stroke-width':2,'pointer-events':'none'}));handle(interaction,end,'axis-rotate',undefined,true); } }
  }
  function render() {
    originals.replaceChildren();mirrors.replaceChildren();labels.replaceChildren();guides.replaceChildren();interaction.replaceChildren();
    const pattern={square:'symmetrySquare',dots:'symmetryDots',isometric:'symmetryIso'}[state.paper];paperPattern.setAttribute('fill',pattern?`url(#${pattern})`:'none');
    const transforms=reflectionTransforms();
    state.items.forEach(item=> { drawGuides(item);drawItem(item,originals); if(item.role!=='student'&&(state.mode==='auto'||state.answer)) transforms.forEach(m=>drawItem(item,mirrors,true,m)); });
    if(state.gesture?.preview){drawItem(state.gesture.preview,originals);if(state.gesture.preview.role!=='student'&&(state.mode==='auto'||state.answer))transforms.forEach(m=>drawItem(state.gesture.preview,mirrors,true,m));}
    if(state.polygon.length){originals.append(el('polyline',{points:state.polygon.map(p=>`${p.x},${p.y}`).join(' '),stroke:state.color,'stroke-width':3,fill:'none','stroke-dasharray':'5 4'})); state.polygon.forEach(p=>originals.append(el('circle',{cx:p.x,cy:p.y,r:6,fill:state.color})));}
    drawAxes();
    const item=chosen();if(item&&state.tool==='select'){const b=itemBounds(item);interaction.append(el('rect',{x:b.left-8,y:b.top-8,width:Math.max(16,b.right-b.left+16),height:Math.max(16,b.bottom-b.top+16),fill:'none',stroke:'#8eadd5','stroke-width':1.3,'stroke-dasharray':'5 5','pointer-events':'none'})); if(item.kind==='polygon')item.points.forEach((p,i)=>handle(interaction,p,'vertex',i)); if(item.kind!=='point')handle(interaction,{x:b.right,y:b.bottom},'resize');}
    $('#deleteItemBtn').disabled=!item;$('#undoBtn').disabled=state.history.length===0;$('#finishPolygon').hidden=state.tool!=='polygon'||state.polygon.length<3;
    $('#selectionLabel').textContent=item?({point:'Nokta seçili',polygon:'Şekil seçili',circle:'Daire seçili',stroke:'Çizim seçili',line:'Çizgi seçili',text:'Metin seçili',pixel:'Piksel seçili'}[item.kind]):'Noktaları ve şekilleri taşıyabilirsin';
    $('#axisAngle').value=String(Math.round(state.axis.angle));$('#axisAngleValue').textContent=`${Math.round(state.axis.angle)}°`;
  }
  function syncUI() {
    $('#axisSelect').value=state.axisMode;$('#axisAngle').disabled=state.axisMode==='both';$('#showAnswerBtn').hidden=state.mode!=='manual';$('#showAnswerBtn').textContent=state.answer?'Yansımayı gizle':'Yansımayı göster';
    document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===state.mode;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
    document.querySelectorAll('[data-tool]').forEach(b=>{const active=b.dataset.tool===state.tool;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
    document.querySelectorAll('[data-color]').forEach(b=>{const active=b.dataset.color===state.color;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
    $('#modeHelp').textContent=state.mode==='auto'?'Mavi şekil asıl şekildir; yeşil şekil yansımasıdır.':'Hazır şeklin yansımasını kalemle veya çokgenle tamamla. Yanıtı istediğinde göster.';
    $('#symmetryStatus').textContent=state.mode==='auto'?'Canlı yansıma açık':state.answer?'Öğrenci modu · yanıt açık':'Öğrenci tamamlama modu';
    $('#boardHelp').textContent=state.tool==='polygon'?'Köşelere sırayla dokun. İlk köşeye yeniden dokun veya “Çokgeni tamamla” düğmesini kullan.':state.tool==='point'?'Tahtaya dokunarak etiketli bir nokta ekle. Seç aracıyla noktayı taşı.':state.tool==='select'?'Şekli taşı; sarı köşeleri veya boyut tutamacını çek. Mavi tutamaçlarla doğruyu değiştir.':state.tool==='eraser'?'Silmek istediğin asıl parçaya dokun. Yansıması da kaldırılır.':'Tahtaya dokun ve çiz. Yansıma, doğru değiştiğinde yeniden hesaplanır.';
  }
  function setTool(tool) { state.tool=tool;state.polygon=[];syncUI();render(); }
  function moveItem(item,dx,dy) { if(item.points)item.points.forEach(p=>{p.x+=dx;p.y+=dy;});else {item.x+=dx;item.y+=dy;} }
  function fitItem(item) { const b=itemBounds(item);const dx=Math.max(15-b.left,Math.min(0,WIDTH-15-b.right)),dy=Math.max(15-b.top,Math.min(0,HEIGHT-15-b.bottom));moveItem(item,dx,dy); }
  function spawnShape(shape) { history(); const x=320,y=300,w=170,h=130;let item;if(shape==='circle')item=newItem({kind:'circle',x,y,r:75});else {let points;if(shape==='triangle')points=[{x,y:y-90},{x:x+90,y:y+65},{x:x-90,y:y+65}];else if(shape==='diamond')points=[{x,y:y-100},{x:x+70,y},{x,y:y+100},{x:x-70,y}];else if(shape==='pentagon')points=Array.from({length:5},(_,i)=>({x:x+90*Math.cos(-Math.PI/2+i*2*Math.PI/5),y:y+90*Math.sin(-Math.PI/2+i*2*Math.PI/5)}));else{const hh=shape==='square'?w:h;points=[{x:x-w/2,y:y-hh/2},{x:x+w/2,y:y-hh/2},{x:x+w/2,y:y+hh/2},{x:x-w/2,y:y+hh/2}];}item=newItem({kind:'polygon',points,shape});} setTool('select');return item; }
  function finishPolygon() { if(state.polygon.length<3)return;history();newItem({kind:'polygon',points:clone(state.polygon),role:state.mode==='manual'?'student':'source'});state.polygon=[];render(); }
  function setAxisPreset(value) { history();state.axisMode=value;if(value==='vertical'||value==='both')state.axis.angle=90;if(value==='horizontal')state.axis.angle=0;if(value==='up')state.axis.angle=45;if(value==='down')state.axis.angle=-45;syncUI();render(); }
  function loadExample(name,record=true) { if(record)history();state.items=[];state.polygon=[];state.selected=null;state.mode='auto';state.answer=false;state.tool='select';state.pointIndex=0;state.axis={x:500,y:360,angle:90};state.axisMode='vertical';
    if(name==='points'){for(const p of [{x:380,y:160,label:'P'},{x:300,y:280,label:'R'},{x:460,y:400,label:'S'},{x:220,y:520,label:'T'}])newItem({kind:'point',...p});state.pointIndex=4;}
    else if(name==='diamond-up'){state.axis.angle=45;state.axisMode='up';state.paper='dots';newItem({kind:'polygon',shape:'diamond',points:[{x:260,y:170},{x:340,y:210},{x:260,y:250},{x:180,y:210}]});}
    else if(name==='triangle'){newItem({kind:'polygon',shape:'triangle',points:[{x:260,y:180},{x:380,y:400},{x:140,y:400}]});}
    state.selected=null;$('#paperSelect').value=state.paper;syncUI();render(); }
  svg.addEventListener('pointerdown',event=>{
    if(state.gesture||(event.button!==undefined&&event.button!==0))return;event.preventDefault();const raw=point(event),p=snap(raw),handleNode=event.target.closest('[data-handle]'),itemNode=event.target.closest('.symmetry-item'),item=itemNode?state.items.find(q=>q.id===Number(itemNode.dataset.itemId)):null;
    if(handleNode){history();const kind=handleNode.dataset.handle;state.gesture={id:event.pointerId,kind,start:raw,axis:clone(state.axis),item:chosen(),original:chosen()?clone(chosen()):null,index:Number(handleNode.dataset.index)};}
    else if(state.tool==='eraser'){if(item){history();state.items=state.items.filter(q=>q!==item);state.selected=null;render();}return;}
    else if(state.tool==='select'){if(!item){state.selected=null;render();return;}history();state.selected=item.id;state.gesture={id:event.pointerId,kind:'move',start:raw,item,original:clone(item)};}
    else if(state.tool==='point'){history();const letter=['P','R','S','T','A','B','C','D','E','F'][state.pointIndex%10];state.pointIndex++;newItem({kind:'point',x:p.x,y:p.y,label:letter,role:state.mode==='manual'?'student':'source'});render();return;}
    else if(state.tool==='text'){const text=$('#textInput').value.trim();if(!text)return;history();newItem({kind:'text',x:p.x,y:p.y,text,size:Math.max(14,Math.min(80,Number($('#textSizeInput').value)||30)),font:$('#fontSelect').value,role:state.mode==='manual'?'student':'source'});render();return;}
    else if(state.tool==='polygon'){if(state.polygon.length>=3&&Math.hypot(p.x-state.polygon[0].x,p.y-state.polygon[0].y)<25){finishPolygon();return;}state.polygon.push(p);render();return;}
    else if(state.tool==='pixel'){history();const role=state.mode==='manual'?'student':'source',cell=pixelCell(raw);const item=newItem({kind:'pixel',role,points:[cell,{x:cell.x+GRID,y:cell.y},{x:cell.x+GRID,y:cell.y+GRID},{x:cell.x,y:cell.y+GRID}]});state.gesture={id:event.pointerId,kind:'pixel',last:cell,role,item,cells:new Set([`${cell.x},${cell.y}`])};}
    else {history();state.gesture={id:event.pointerId,kind:state.tool,start:p,preview:{id:0,kind:state.tool==='line'?'line':'stroke',role:state.mode==='manual'?'student':'source',color:state.color,size:state.brush,points:[p,p]}};}
    svg.setPointerCapture?.(event.pointerId);render();
  });
  svg.addEventListener('pointermove',event=>{
    const g=state.gesture;if(!g||g.id!==event.pointerId)return;event.preventDefault();const raw=point(event),p=snap(raw);
    if(g.kind==='axis-move'){state.axis.x=Math.max(40,Math.min(WIDTH-40,g.axis.x+raw.x-g.start.x));state.axis.y=Math.max(40,Math.min(HEIGHT-40,g.axis.y+raw.y-g.start.y));}
    else if(g.kind==='axis-rotate'){state.axis.angle=Math.round(-Math.atan2(raw.y-state.axis.y,raw.x-state.axis.x)*180/Math.PI);if(event.shiftKey)state.axis.angle=Math.round(state.axis.angle/15)*15;state.axisMode='custom';syncUI();}
    else if(g.kind==='move'){Object.assign(g.item,clone(g.original));let dx=raw.x-g.start.x,dy=raw.y-g.start.y;if(state.snap){dx=Math.round(dx/GRID)*GRID;dy=Math.round(dy/GRID)*GRID;}moveItem(g.item,dx,dy);fitItem(g.item);}
    else if(g.kind==='vertex'){g.item.points[g.index]=p;}
    else if(g.kind==='resize'){const b=itemBounds(g.original),w=Math.max(24,b.right-b.left),h=Math.max(24,b.bottom-b.top);if(g.item.kind==='circle')g.item.r=Math.max(15,Math.min(250,Math.max(raw.x-g.item.x,raw.y-g.item.y)));else if(g.item.kind==='text')g.item.size=Math.max(14,Math.min(100,g.original.size*Math.max(.3,(raw.x-b.left)/w)));else {const fx=Math.max(.2,Math.min(4,(p.x-b.left)/w)),fy=Math.max(.2,Math.min(4,(p.y-b.top)/h));g.item.points=g.original.points.map(q=>({x:b.left+(q.x-b.left)*fx,y:b.top+(q.y-b.top)*fy}));}fitItem(g.item);}
    else if(g.kind==='pixel'){const cell=pixelCell(raw),key=`${cell.x},${cell.y}`;if(!g.cells.has(key)){newItem({kind:'pixel',role:g.role,points:[cell,{x:cell.x+GRID,y:cell.y},{x:cell.x+GRID,y:cell.y+GRID},{x:cell.x,y:cell.y+GRID}]});g.cells.add(key);g.last=cell;}}
    else if(g.preview){if(g.kind==='line')g.preview.points=[g.start,p];else {const last=g.preview.points[g.preview.points.length-1];if(Math.hypot(raw.x-last.x,raw.y-last.y)>2)g.preview.points.push(raw);}}
    render();
  });
  function endGesture(event,cancelled=false){const g=state.gesture;if(!g||g.id!==event.pointerId)return;if(cancelled){const previous=state.history.pop();if(previous)restore(previous);}else {if(g.preview){const preview={...g.preview};delete preview.id;newItem(preview);}state.gesture=null;render();}if(svg.hasPointerCapture?.(event.pointerId))svg.releasePointerCapture(event.pointerId);}
  svg.addEventListener('pointerup',event=>endGesture(event));svg.addEventListener('pointercancel',event=>endGesture(event,true));svg.addEventListener('lostpointercapture',event=>{if(state.gesture)endGesture(event,true);});
  svg.addEventListener('focusin',event=>{const group=event.target.closest('.symmetry-item');if(group){state.selected=Number(group.dataset.itemId);$('#deleteItemBtn').disabled=false;$('#selectionLabel').textContent='Parça seçili · ok tuşlarıyla taşı';}});
  svg.addEventListener('keydown',event=>{if(event.key==='Escape'){state.polygon=[];state.selected=null;render();svg.focus();}if(event.key==='Enter'&&state.tool==='polygon'){event.preventDefault();finishPolygon();}else if((event.key==='Enter'||event.key===' ')&&!chosen()&&state.items.length){event.preventDefault();state.selected=state.items[0].id;render();svg.focus();}if(['Delete','Backspace'].includes(event.key)&&chosen()){event.preventDefault();removeSelected();svg.focus();}const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(step&&chosen()){event.preventDefault();history();moveItem(chosen(),step[0]*(event.shiftKey?40:5),step[1]*(event.shiftKey?40:5));fitItem(chosen());render();svg.focus();}});
  function removeSelected(){if(!chosen())return;history();state.items=state.items.filter(item=>item.id!==state.selected);state.selected=null;render();}
  $('#axisSelect').addEventListener('change',()=>setAxisPreset($('#axisSelect').value));
  $('#axisAngle').addEventListener('pointerdown',()=>history());$('#axisAngle').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key))history();});$('#axisAngle').addEventListener('input',()=>{state.axis.angle=Number($('#axisAngle').value)||0;state.axisMode='custom';syncUI();render();});
  $('#axisReset').addEventListener('click',()=>{history();state.axis.x=500;state.axis.y=360;render();});
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;state.answer=false;syncUI();render();}));
  document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
  document.querySelectorAll('[data-shape]').forEach(b=>b.addEventListener('click',()=>spawnShape(b.dataset.shape)));
  document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color;syncUI();}));
  $('#showAnswerBtn').addEventListener('click',()=>{state.answer=!state.answer;syncUI();render();});$('#finishPolygon').addEventListener('click',finishPolygon);
  $('#brushSize').addEventListener('input',()=>{state.brush=Number($('#brushSize').value)||4;$('#brushSizeLabel').textContent=`${state.brush} px`;});
  $('#paperSelect').addEventListener('change',()=>{state.paper=$('#paperSelect').value;try{localStorage.setItem('symmetry-paper:v1',state.paper);}catch(_){}render();});
  $('#showLabels').addEventListener('change',()=>{state.labels=$('#showLabels').checked;render();});$('#showGuides').addEventListener('change',()=>{state.guides=$('#showGuides').checked;render();});$('#snapGrid').addEventListener('change',()=>{state.snap=$('#snapGrid').checked;});
  $('#placeTextBtn').addEventListener('click',()=>{setTool('text');$('#boardHelp').textContent='Metni yerleştirmek istediğin yere dokun.';});
  $('#loadExample').addEventListener('click',()=>loadExample($('#exampleSelect').value));$('#undoBtn').addEventListener('click',undo);$('#deleteItemBtn').addEventListener('click',removeSelected);
  $('#clearBtn').addEventListener('click',()=>{history();state.items=[];state.polygon=[];state.selected=null;render();});
  function collapsePanel(hidden){$('#symmetryControlBody').hidden=hidden;$('#symmetryPanelToggle').textContent=hidden?'+':'−';$('#symmetryPanelToggle').setAttribute('aria-expanded',String(!hidden));$('#symmetryPanelToggle').setAttribute('aria-label',hidden?'Araç kutusunu aç':'Araç kutusunu daralt');$('#symmetryPanelToggle').title=hidden?'Araç kutusunu aç':'Araç kutusunu daralt';}
  $('#symmetryPanelToggle').addEventListener('click',()=>collapsePanel(!$('#symmetryControlBody').hidden));
  $('#saveImageBtn').addEventListener('click',()=>{
    const button=$('#saveImageBtn');button.disabled=true;$('#symmetryStatus').textContent='PNG hazırlanıyor…';
    const copy=svg.cloneNode(true);copy.querySelector('.interaction')?.remove();copy.setAttribute('width',WIDTH*2);copy.setAttribute('height',HEIGHT*2);const markup=new XMLSerializer().serializeToString(copy),blob=new Blob([markup],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),image=new Image();
    function fail(){URL.revokeObjectURL(url);button.disabled=false;$('#symmetryStatus').textContent='Görsel hazırlanamadı. Yeniden deneyin.';}
    image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=WIDTH*2;canvas.height=HEIGHT*2;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob(png=>{URL.revokeObjectURL(url);button.disabled=false;if(!png){fail();return;}const downloadURL=URL.createObjectURL(png),link=document.createElement('a');link.download='simetri-aynasi.png';link.href=downloadURL;document.body.append(link);link.click();link.remove();$('#symmetryStatus').textContent='PNG hazır · 2000 × 1440';window.setTimeout(()=>URL.revokeObjectURL(downloadURL),10000);},'image/png');}catch(_){fail();}};image.onerror=fail;image.src=url;
  });
  document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();undo();}});
  if(window.ResizeObserver)new window.ResizeObserver(()=>{if(!state.gesture)render();}).observe(svg);
  try{const paper=localStorage.getItem('symmetry-paper:v1');if(['square','dots','isometric','plain'].includes(paper))state.paper=paper;}catch(_){}
  loadExample('points',false);$('#paperSelect').value=state.paper;
  if(window.innerWidth<780)collapsePanel(true);
})();
