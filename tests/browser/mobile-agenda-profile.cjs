const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {build}=require('esbuild');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'../..');
const mobile=path.join(repo,'mobile-app');
const photo='data:image/png;base64,'+fs.readFileSync(path.join(repo,'ogretmen-ajandasi/assets/kemal-kocar-logo-2025.png')).toString('base64');
const noteTitle='Okuma etkinliği için kitap listesini ve sınıftaki hazırlıkları kontrol et';
const fullNote=('Kitap listesi ve ailelere iletilecek hazırlıklar eksiksiz korunmalı. ').repeat(10)+'\nİkinci paragraf: etkinlik sonrası değerlendirmeleri de ekle.\nSon satır: notun tamamı burada.';
const fixtureEvents=[
  {id:'note',type:'note',title:noteTitle,time:'08:15',note:fullNote,reminder:'atTime',done:false},
  {id:'exam',type:'exam',title:'Matematik değerlendirmesi',time:'10:00',note:'Soru kitapçıkları ve cevap kâğıtları hazır.'},
  {id:'special',type:'special',title:'Kitap bağışı günü',note:'Kütüphane için kitapları ayır.'},
  {id:'birthday',type:'birthday',title:'Öğretmen doğum günü',time:'12:00',note:'Tebrik kartını hazırla.'},
  {id:'holiday',type:'holiday',title:'Okul tatili notu',note:'Dönüş hazırlıklarını kontrol et.'},
  {id:'other-class',classId:'other',type:'meeting',title:'Diğer sınıfın görüşmesi',time:'14:00',note:'Kişisel ajandada da görünür.'},
].map(event=>({date:'2026-10-29',classId:'',reminder:'',done:false,...event}));
const mocks={
  'test-state':`import React from 'react';export const Context=React.createContext(null);export const useFixture=()=>React.useContext(Context);`,
  '@/context/AuthContext':`const locked=new URLSearchParams(location.search).has('locked');export const useAuth=()=>({userId:'teacher',email:'test@example.invalid',profile:{id:'teacher',full_name:'Test Öğretmen',role:'teacher',active:!locked,approval_status:locked?'pending':'active'}});`,
  '@/platform/PlatformContext':`const dark=new URLSearchParams(location.search).has('dark');export const usePlatform=()=>({dark,palette:dark?{background:'#111620',surface:'#1B2230',line:'#333D50',text:'#EDF0F8',muted:'#A2AFC2',primary:'#BB9AEF',soft:'#29243A',green:'#78C9B4',onPrimary:'#221C30'}:{background:'#f7f8fc',surface:'#fff',line:'#dfe3ed',text:'#27313f',muted:'#667085',primary:'#7154a0',soft:'#efebf7',green:'#24805b',onPrimary:'#fff'},state:{plans:[]},ready:true,online:true,update:()=>{}});`,
  '@/platform/useAgenda':`import {useFixture} from 'test-state';export const useAgenda=()=>useFixture();`,
  '@/platform/usePersonalPlans':`const refresh=async()=>{};export const usePersonalPlans=()=>({plans:[],refresh});`,
  '@/platform/navigation':`export const openActivity=(...args)=>{window.activity=args;};export const openModule=()=>{};`,
  '@/services/notifications':`export const requestReminderPermission=async()=>{window.permissionRequests=(window.permissionRequests||0)+1;return {granted:true};};`,
  '@/platform/ReminderSettings':`export const ReminderSettings=()=>null;`,
  '@/platform/DateTimeField':`import React from 'react';import{TextInput}from'react-native';export const DateTimeField=({label,value,onChange})=><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}/>;`,
  'expo-router':`export const router={push:()=>{},canGoBack:()=>false,replace:()=>{}};export const useFocusEffect=()=>{};const query=new URLSearchParams(location.search),params={section:query.get('section')||'students',date:query.get('date')||undefined};export const useLocalSearchParams=()=>params;`,
  'expo-crypto':`export const randomUUID=()=>crypto.randomUUID();`,
  'react-native-safe-area-context':`import React from'react';import{View}from'react-native';export const SafeAreaView=({children,style})=><View style={style}>{children}</View>;`,
  '@expo/vector-icons':`import React from'react';import{Text}from'react-native';export const Ionicons=({name,color,size})=><Text aria-hidden style={{color,fontSize:size}}>○</Text>;Ionicons.glyphMap={};`
};
mocks['./PlatformContext']=mocks['@/platform/PlatformContext'];
mocks['./navigation']=mocks['@/platform/navigation'];
const entry=`import React from'react';import{createRoot}from'react-dom/client';import*as RN from'react-native';import Agenda from'./app/(app)/agenda';import{Context}from'test-state';import{applyAgendaChanges}from'./src/platform/agendaModel';
RN.Alert.alert=(title,message,buttons)=>{window.contact={title,message,buttons};};RN.Linking.openURL=async url=>{window.openedUrl=url;};
const initial={updated_at:'2026-11-03T00:00:00Z',agenda_state:{classes:[{id:'a',name:'2-B'}],activeClassId:'a',students:[
{id:'s1',classId:'a',firstName:'Ada',lastName:'BÜYÜKDURGUTOĞLU',schoolNo:'7',photo:${JSON.stringify(photo)},birthDate:'2019-01-04',address:'Örnek adres',healthStatus:'Örnek sağlık notu',family:{motherName:'Ayşe Kaya',motherPhone:'0532 123 45 67',fatherName:'Ali Kaya',fatherPhone:'+90 533 123 45 67'},notes:[{id:'n1',date:'2026-11-02',text:'Öğretmen notu'}],meetings:[{id:'m1',date:'2026-11-02',text:'Veli görüşmesi'}]},
{id:'s2',classId:'a',firstName:'Efe',lastName:'Can',schoolNo:'27',photo:${JSON.stringify(photo)}},
{id:'s3',classId:'a',firstName:'Elif Naz',lastName:'Öztürk',schoolNo:'60',birthDate:'2019-10-29',photo:${JSON.stringify(photo)}},
{id:'s4',classId:'a',firstName:'Deniz',lastName:'Kaya',schoolNo:'191'}],exams:[
{id:'e1',classId:'a',name:'Birinci Deneme',date:'2026-10-01',results:{s1:{total:{percent:50}},s2:{total:{percent:100}},foreign:{total:{percent:0}}}},
{id:'e2',classId:'a',name:'İkinci Deneme',date:'2026-10-02',results:{s1:{total:{percent:100}}}},
{id:'foreign-exam',classId:'other',name:'Başka sınıf sınavı',results:{s1:{total:{percent:0}}}}
],scheduleItems:[],calendarEvents:${JSON.stringify(fixtureEvents)}},lesson_planner_state:{siniflar:[{id:'p',name:'2-B'}],programs:{p:{Mon:[{ders:'TÜRKÇE'}],Tue:[{ders:'TÜRKÇE'},{ders:'MATEMATİK'}]}},tatiller:[{id:'break',name:'Okul takvimi arası',start:'2026-10-29',end:'2026-10-29'}]}};
const refresh=async()=>{};function Fixture(){const[row,setRow]=React.useState(initial);window.row=row;return <Context.Provider value={{row,snapshot:row.agenda_state,loading:false,pending:0,updatedAt:row.updated_at,refresh,change:async op=>{window.mutations=[...(window.mutations||[]),op];setRow(previous=>applyAgendaChanges(previous,[op]));return true;}}}><Agenda/></Context.Provider>;}createRoot(document.getElementById('root')).render(<Fixture/>);`;
(async()=>{
  const result=await build({stdin:{contents:entry,resolveDir:mobile,sourcefile:'agenda-fixture.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},alias:{'react-native':'react-native-web','@':path.join(mobile,'src')},nodePaths:[path.join(mobile,'node_modules')],plugins:[{name:'fixture',setup(b){b.onResolve({filter:/.*/},args=>args.path in mocks?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'tsx',resolveDir:mobile}));}}]});
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?result.outputFiles[0].contents:'<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;height:100%;display:flex;flex:1;}</style><div id="root"></div><script src="/app.js"></script></html>');});
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  try{for(const width of[390,738]){
    const page=await browser.newPage({viewport:{width,height:1000},locale:'tr-TR'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    const cards=page.getByRole('button',{name:/öğrenci bilgileri$/});await cards.first().waitFor();assert.equal(await cards.count(),4);
    const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();assert.equal(Math.round(a.y),Math.round(b.y));assert.ok(b.x>a.x+a.width,'Two cards per row');
    await cards.first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),`mobile-agenda-students-${width}.png`)});
    await cards.first().click();await page.getByRole('tab',{name:'Kişisel',exact:true}).waitFor();
    assert.ok(await page.getByText('04.01.2019',{exact:true}).count());assert.ok(await page.getByText('Örnek adres',{exact:true}).count());
    await page.getByRole('tab',{name:'Veli',exact:true}).click();await page.getByRole('button',{name:'Anne telefonu, ara veya WhatsApp mesajı gönder'}).click();
    assert.equal(await page.evaluate(()=>window.openedUrl),undefined,'Phone tap offers a choice, never sends automatically');
    assert.deepEqual(await page.evaluate(()=>window.contact.buttons.map(b=>b.text)),['Vazgeç','Telefonla ara','WhatsApp mesajı']);
    await page.evaluate(()=>window.contact.buttons[2].onPress());assert.equal(await page.evaluate(()=>window.openedUrl),'https://wa.me/905321234567');
    await page.screenshot({path:path.join(os.tmpdir(),`mobile-agenda-family-${width}.png`)});
    await page.getByRole('tab',{name:'Sağlık',exact:true}).click();assert.ok(await page.getByText('Örnek sağlık notu',{exact:true}).count());
    await page.getByRole('tab',{name:'Notlar',exact:true}).click();assert.ok(await page.getByText('Öğretmen notu',{exact:true}).count());
    await page.getByRole('tab',{name:'Görüşmeler',exact:true}).click();assert.ok(await page.getByText('Veli görüşmesi',{exact:true}).count());
    await page.getByRole('button',{name:'Öğrenci bilgilerini kapat'}).click();
    await page.getByRole('button',{name:'Sınıf adını düzenle',exact:true}).click();await page.getByRole('textbox',{name:'Sınıf adı'}).fill('Birincilerim');await page.getByRole('button',{name:'Kaydet ve eşitle'}).click();
    await page.waitForFunction(()=>window.row.agenda_state.classes[0].name==='Birincilerim');
    assert.equal(await page.evaluate(()=>window.row.lesson_planner_state.siniflar[0].name),'Birincilerim');
    await page.getByRole('tab',{name:'Karneler',exact:true}).click();
    await page.getByText('%87,5',{exact:true}).waitFor();
    assert.equal(await page.getByText('Başka sınıf sınavı',{exact:true}).count(),0);
    await page.getByRole('button',{name:/Sınıf analizleri ve karşılaştırmalar/}).click();
    const activity=await page.evaluate(()=>window.activity[0]);
    assert.ok(activity.includes('reportType=classAnalysis')&&activity.includes('classId=a'));
    await page.screenshot({path:path.join(os.tmpdir(),`mobile-agenda-class-analysis-${width}.png`)});
    assert.deepEqual(errors,[]);console.log(`PASS ${width}: actual mobile roster, two columns, photos, detail tabs, contact choice, stable class rename`);await page.close();
  }
  for(const dark of[false,true])for(const width of[320,390,599,600,738,1024]){
    const page=await browser.newPage({viewport:{width,height:1000},locale:'tr-TR'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/?date=2026-10-29'+(dark?'&dark=1':''));
    await page.getByRole('tab',{name:'Ajanda',exact:true}).click();
    const note=page.getByTestId('agenda-event-note'),exam=page.getByTestId('agenda-event-exam'),special=page.getByTestId('agenda-event-special');
    await note.waitFor();await note.scrollIntoViewIfNeeded();
    assert.equal(await note.getByText(fullNote,{exact:true}).textContent(),fullNote,'Full multiline note is retained');
    await note.getByText('08:15 · Hatırlatıcı açık',{exact:true}).waitFor();
    await page.getByTestId('agenda-event-other-class').waitFor();
    const a=await special.boundingBox(),b=await page.getByTestId('agenda-event-holiday').boundingBox();
    if(width>=600){assert.equal(Math.round(a.y),Math.round(b.y));assert.ok(b.x>=a.x+a.width+11,'Two note columns when content fits');}
    else{assert.equal(Math.round(a.x),Math.round(b.x));assert.ok(b.y>=a.y+a.height+11,'Single note column on phones');}
    const appearance=async locator=>locator.evaluate(el=>{const s=getComputedStyle(el);return {fill:s.backgroundColor,radius:s.borderRadius,transform:s.transform};});
    assert.equal((await appearance(note)).fill,dark?'rgb(54, 50, 34)':'rgb(255, 243, 184)');
    assert.equal((await appearance(exam)).fill,dark?'rgb(25, 56, 61)':'rgb(220, 245, 247)');
    for(const locator of[page.getByTestId('agenda-event-birthday'),page.getByTestId('agenda-marker-birthday:s3')])assert.equal((await appearance(locator)).fill,dark?'rgb(64, 39, 51)':'rgb(252, 227, 237)');
    for(const locator of[page.getByTestId('agenda-event-holiday'),page.getByTestId('agenda-marker-official:2026-10-29'),page.getByTestId('agenda-marker-holiday:break')])assert.equal((await appearance(locator)).fill,dark?'rgb(40, 59, 39)':'rgb(228, 243, 216)');
    assert.deepEqual(await appearance(special),{fill:dark?'rgb(54, 50, 34)':'rgb(255, 243, 184)',radius:'6px',transform:'none'});
    const overflow=await page.locator('[data-testid^="agenda-event-"], [data-testid^="agenda-marker-"]').evaluateAll(cards=>cards.flatMap(card=>[card,...card.querySelectorAll('*')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.slice(0,60))));
    assert.deepEqual(overflow,[],'No clipped text or controls');
    const longText=await note.getByText(fullNote,{exact:true}).evaluate(el=>({height:el.clientHeight,lineHeight:parseFloat(getComputedStyle(el).lineHeight),overflow:getComputedStyle(el).overflow}));
    assert.ok(longText.height>longText.lineHeight*3,'Long note is not clamped');assert.notEqual(longText.overflow,'hidden');
    const contrast=await note.getByText(fullNote,{exact:true}).evaluate(el=>{
      const luminance=color=>{const values=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
      const foreground=luminance(getComputedStyle(el).color),background=luminance(getComputedStyle(el.closest('[data-testid]')).backgroundColor);return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
    });assert.ok(contrast>=4.5,'Readable note text in both themes');
    await note.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),`mobile-agenda-notes-${dark?'dark':'light'}-${width}.png`)});
    if(width===390||width===738){
      const dayLabel=new Date('2026-10-29T12:00:00').toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'});
      await page.getByRole('button',{name:dayLabel,exact:true}).click();const preview=page.getByRole('dialog');await preview.getByText('Ajandadaki işaretler',{exact:true}).waitFor();
      const previewNote=preview.getByText(fullNote,{exact:true});assert.equal(await previewNote.textContent(),fullNote);
      const scrollable=await previewNote.evaluate(el=>{let parent=el.parentElement;while(parent&&!['auto','scroll'].includes(getComputedStyle(parent).overflowY))parent=parent.parentElement;return !!parent&&parent.clientHeight>0&&parent.clientHeight<parent.scrollHeight&&parent.getBoundingClientRect().bottom<=innerHeight;});assert.equal(scrollable,true,'Long day preview stays scrollable within the viewport');
      await page.screenshot({path:path.join(os.tmpdir(),`mobile-agenda-preview-${dark?'dark':'light'}-${width}.png`)});await preview.getByRole('button',{name:'Ajanda özetini kapat',exact:true}).last().click();await preview.waitFor({state:'detached'});
    }
    const complete=note.getByRole('checkbox');await complete.click();await page.waitForFunction(()=>window.row.agenda_state.calendarEvents.find(e=>e.id==='note').done===true);
    assert.equal(await note.getByText(noteTitle,{exact:true}).evaluate(el=>getComputedStyle(el).textDecorationLine),'line-through');
    const saved=await page.evaluate(()=>window.row.agenda_state.calendarEvents.find(e=>e.id==='note'));assert.equal(saved.note,fullNote);assert.equal(saved.reminder,'atTime');assert.deepEqual(await page.evaluate(()=>window.mutations[0].patch),{done:true});
    await note.getByRole('button',{name:`${noteTitle} planını sil`,exact:true}).click();
    assert.equal(await page.evaluate(()=>window.row.agenda_state.calendarEvents.some(e=>e.id==='note')),true,'Delete still requires confirmation');
    assert.deepEqual(await page.evaluate(()=>window.contact.buttons.map(b=>b.text)),['Vazgeç','Sil']);await page.evaluate(()=>window.contact.buttons[1].onPress());await note.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>window.permissionRequests||0),0,'Reading/completing/deleting never requests notification permission');
    if(width===1024){await page.addStyleTag({content:'#root {max-width: 520px;}'});await page.waitForFunction(()=>{const a=document.querySelector('[data-testid="agenda-event-special"]').getBoundingClientRect(),b=document.querySelector('[data-testid="agenda-event-holiday"]').getBoundingClientRect();return Math.abs(a.x-b.x)<1&&b.y>a.y;});}
    assert.deepEqual(errors,[]);console.log(`PASS ${width} ${dark?'dark':'light'}: actual RN note cards, semantic colors, full notes, responsive columns, completion/delete/reminders`);await page.close();
  }
  const locked=await browser.newPage({viewport:{width:390,height:1000}});await locked.goto('http://127.0.0.1:'+server.address().port+'/?date=2026-10-29&locked=1');await locked.getByRole('tab',{name:'Ajanda',exact:true}).click();
  const lockedNote=locked.getByTestId('agenda-event-note');await lockedNote.waitFor();assert.equal(await lockedNote.getByRole('checkbox').getAttribute('aria-disabled'),'true');
  await lockedNote.getByRole('button',{name:`${noteTitle} planını sil`,exact:true}).click();assert.equal(await locked.evaluate(()=>window.contact),undefined);assert.equal(await locked.evaluate(()=>window.mutations||null),null);await locked.close();
  console.log('PASS read-only teacher: completion disabled and deletion does not mutate');
  const lessons=await browser.newPage({viewport:{width:390,height:1000}});await lessons.goto('http://127.0.0.1:'+server.address().port+'/?date=2026-11-03&section=lessons');await lessons.getByText('TÜRKÇE',{exact:true}).waitFor();await lessons.getByText('MATEMATİK',{exact:true}).waitFor();assert.equal(await lessons.getByTestId('agenda-event-note').count(),0);await lessons.close();
  console.log('PASS day-based native lessons retained');
  }finally{await browser.close();await new Promise(done=>server.close(done));}
})().catch(error=>{console.error(error);process.exitCode=1;});
