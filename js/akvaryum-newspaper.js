/* Weekly family newspaper. Facts come from recorded behavior, never inferred attainment. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./akvaryum-calendar.js'));
  else root.AquariumNewspaper=factory(root.AquariumCalendar);
})(typeof window==='object'?window:this,function(Calendar){
  'use strict';
  const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const text=(v,max=120)=>typeof v==='string'?v.trim().slice(0,max):'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const number=v=>Number.isSafeInteger(v)&&v>=0?v:0;
  function validDate(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const d=new Date(value+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;
  }
  function day(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
  function shift(date,days){if(!validDate(date))throw Error('Geçersiz gazete tarihi.');const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
  function week(date=day()){if(!validDate(date))throw Error('Geçersiz gazete tarihi.');return shift(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));}
  const isWeek=value=>validDate(value)&&week(value)===value;
  function label(start){const end=shift(start,6),f=v=>new Date(v+'T12:00:00Z').toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'long'});return f(start)+(start.slice(0,4)!==end.slice(0,4)?' '+start.slice(0,4):'')+' – '+f(end)+' '+end.slice(0,4);}
  function weeks(today=day(),future=0){const start=week(today);return Array.from({length:12+future},(_,i)=>shift(start,(future-i)*7));}
  function validate(raw,studentIds=[]){
    if(!plain(raw)||!plain(raw.weeks)||Object.keys(raw.weeks).length>104||(raw.enabled!==undefined&&typeof raw.enabled!=='boolean'))throw Error('Gazete ayarı geçersiz (en fazla 104 hafta).');
    const allowed=new Set(studentIds),result={version:2,enabled:raw.enabled===true,weeks:{}};
    function content(issue){
      if(!plain(issue)||typeof issue.title!=='string'||issue.title.length>100||typeof issue.body!=='string'||issue.body.length>1800||!plain(issue.targets)||Object.keys(issue.targets).length>60)throw Error('Gazete duyurusu geçersiz.');
      const targets={};
      for(const [id,goal] of Object.entries(issue.targets)){
        if(!/^[\w-]{1,90}$/.test(id)||['__proto__','constructor','prototype'].includes(id)||typeof goal!=='string'||goal.length>300)throw Error('Haftalık öğrenci hedefi geçersiz.');
        if(allowed.has(id)&&goal.trim())targets[id]=text(goal,300);
      }
      return {title:text(issue.title,100),body:text(issue.body,1800),targets};
    }
    for(const [date,issue] of Object.entries(raw.weeks)){
      if(!isWeek(date)||!plain(issue)||typeof issue.published!=='boolean')throw Error('Gazete duyurusu geçersiz.');
      result.weeks[date]={...content(issue),published:issue.published};
      if(issue.publication!==undefined){
        if(!plain(issue.publication)||typeof issue.publication.id!=='string'||!/^[\w-]{1,90}$/.test(issue.publication.id))throw Error('Gönderilen gazete kaydı geçersiz.');
        result.weeks[date].publication={...content(issue.publication),id:issue.publication.id};
      }
    }
    return result;
  }
  function publication(cls,start){const issue=cls.newspaper?.weeks?.[start];return cls.newspaper?.enabled===true&&issue?.published===true&&plain(issue.publication)?issue.publication:null;}
  function publishedWeeks(cls,today=day()){return weeks(today).filter(w=>publication(cls,w));}
  function localReport(cls,student,start=week(),today=day(),core,{draft=false,issue:previewIssue}={}){
    if(!student||!isWeek(start))throw Error('Gazete için öğrenci ve hafta seçin.');
    const end=shift(start,6),events=[];
    for(const [date,record] of Object.entries(student.days||{}))for(const task of record.tasks||[])events.push({...task,date});
    for(const season of cls.seasons||[])for(const task of season.awards||[])if(task.studentId===student.id)events.push({...task,date:task.date});
    const selected=events.filter(t=>t.status==='done'&&(t.points??1)>0&&validDate(t.date)&&t.date>=start&&t.date<=end&&t.date<=today);
    const groups=new Map();
    for(const t of selected){const title=text(t.title),g=groups.get(title)||{title,icon:t.icon||'',count:0,points:0};g.count++;g.points+=t.points??1;groups.set(title,g);}
    const issue=draft?(previewIssue||cls.newspaper?.weeks?.[start]):publication(cls,start),published=!!issue;
    const available=!!publication(cls,start);
    return {available,publicationId:publication(cls,start)?.id||'',publishedWeeks:publishedWeeks(cls,today),weekStart:start,weekEnd:end,asOf:today,name:student.name,species:student.species,
      positiveCount:selected.length,activeDays:new Set(selected.map(t=>t.date)).size,earned:selected.reduce((sum,t)=>sum+(t.points??1),0),
      highlights:[...groups.values()].sort((a,b)=>b.count-a.count||a.title.localeCompare(b.title)).slice(0,5),
      currentTotal:core.earned(student),characterUnlocked:core.charactersUnlocked(student),growth:cls.growth||null,
      birthdayOn:Calendar?.birthdayOn(student.birthday,start,end<today?end:today)||null,
      reefNews:core.reef?.news(cls.reefCollection,start,end).filter(n=>n.on<=today)||[],
      announcement:published&&issue.body?{title:issue.title,body:issue.body}:null,target:published?issue.targets?.[student.id]||'':''};
  }
  function markup(raw,{image,preview=false}={}){
    if(!raw||!isWeek(raw.weekStart))throw Error('Gazete bilgileri geçersiz.');
    const name=text(raw.name,80)||'Deniz dostumuz',count=number(raw.positiveCount),points=number(raw.currentTotal);
    const thresholds=Array.isArray(raw.growth?.thresholds)?raw.growth.thresholds.filter(t=>Number.isInteger(t)&&t>0&&t<=1000000).slice(0,10):[];
    const growth=raw.growth?.enabled===true&&thresholds.length===10;
    const stage=growth?thresholds.filter(t=>points>=t).length:0,next=growth?thresholds.find(t=>t>points):undefined;
    const headline=count?name+' bu hafta '+count+' güzel adım attı':name+' için yeni keşifler bizi bekliyor';
    const source=count?'Öğretmenin bu haftaki olumlu davranış kayıtları, deniz dostumuzun yolculuğuna eşlik ediyor.':'Bu hafta henüz olumlu davranış kaydı bulunmuyor. Bu durum çocuğun başarısı hakkında bir değerlendirme değildir.';
    const highlights=(Array.isArray(raw.highlights)?raw.highlights:[]).slice(0,5).map(h=>'<li><span>'+esc(text(h.title))+'</span><b>'+number(h.count)+' kez</b></li>').join('');
    const unlocked=raw.characterUnlocked===true||points>=100;
    const reward=unlocked?'<strong>100 puanlık karakter koleksiyonu açık!</strong><p>Kazanılmış koleksiyon hakkı puan değişse veya yeni sezon başlasa da korunur.</p>':growth&&stage?'<strong>Büyüme yolculuğunda '+stage+'. hedef tamamlandı</strong><p>Deniz dostumuz, öğretmenin belirlediği hedeflerle büyümeyi sürdürüyor.</p>':'';
    const target=text(raw.target,300);
    const nextText=next?'Büyüme yolculuğundaki sıradaki hedef '+next+' puan. Şu an '+points+' puan; '+Math.max(0,next-points)+' puan kaldı.':growth&&stage===10?'Büyüme yolculuğundaki 10 hedefin tamamı geçildi. Yeni hedefi öğretmeninizle belirleyebilirsiniz.':!unlocked?'Karakter koleksiyonu için hedef 100 puan. Şu an '+points+' puan; '+Math.max(0,100-points)+' puan kaldı.':'Koleksiyon açık. Öğretmeniniz bir sonraki haftalık hedefi burada paylaşabilir.';
    const a=raw.announcement;
    const end=shift(raw.weekStart,6),asOf=validDate(raw.asOf)?raw.asOf:day(),through=end<asOf?end:asOf;
    const greetings=Calendar?.messages(raw.weekStart,through)||[];
    if(validDate(raw.birthdayOn)&&raw.birthdayOn>=raw.weekStart&&raw.birthdayOn<=through){
      greetings.unshift({icon:'🎂',title:'İyi ki doğdun, '+name+'!',body:'Deniz dostun ve tüm resif sana mutlu bir yaş diliyor.'});
    }
    const greetingMarkup=greetings.map(g=>'<section class="news-greeting"><span aria-hidden="true">'+g.icon+'</span><div><h3>'+esc(g.title)+'</h3><p>'+esc(g.body)+'</p></div></section>').join('');
    const reef=(Array.isArray(raw.reefNews)?raw.reefNews:[]).filter(n=>Number.isInteger(n.stage)&&n.stage>=1&&n.stage<=4).slice(0,4);
    const reefStory=reef.length?'<section class="news-reef"><img src="/assets/akvaryum/dekor/kayip-gemi-'+Math.max(...reef.map(n=>n.stage))+'.svg" alt="Sınıfın birlikte kazandığı gemi parçası"><span class="news-kicker">RESİFTEN ORTAK BAŞARI HABERİ</span><h3>'+esc(text(reef[reef.length-1].title,120))+'</h3><p>Sınıfımız bu hafta Kayıp Gemi koleksiyonunda '+reef.length+' yeni aşamayı tamamladı. Her güzel katkı, ortak dünyamıza yeni bir parça ekledi.</p></section>':'';
    return '<header class="news-masthead"><span>SINIF AKVARYUMU</span><h2 id="newspaperTitle">Resif Postası</h2><p>'+esc(label(raw.weekStart))+'</p><small>'+esc(name)+' için özel sayı'+(preview?' · Öğretmen önizlemesi':'')+'</small></header>'+greetingMarkup+
      '<div class="news-story"><div class="news-portrait"><img src="'+esc(image(raw.species))+'" alt="'+esc(name)+' adlı öğrencinin deniz dostu"></div><div><span class="news-kicker">HAFTANIN GÜZEL ADIMLARI</span><h3>'+esc(headline)+'</h3><p>'+esc(source)+'</p></div></div>'+
      '<dl class="news-stats"><div><dt>Olumlu davranış</dt><dd>'+count+'</dd></div><div><dt>Kayıt bulunan gün</dt><dd>'+Math.min(7,number(raw.activeDays))+'</dd></div><div><dt>Kazanılan puan</dt><dd>+'+number(raw.earned)+'</dd></div></dl>'+
      (highlights?'<section class="news-section"><h3>Bu hafta neler yaptım?</h3><ul class="news-highlights">'+highlights+'</ul><p class="news-note">Sayılar, davranışın kaç kez kaydedildiğini gösterir; bitirilen kitap veya öğrenilen konu sayısı değildir.</p></section>':'')+
      (reward?'<section class="news-reward"><span class="news-kicker">ÖDÜL MANŞETİ · GÜNCEL DURUM</span>'+reward+'<small>Bu bölüm güncel ödül durumunu gösterir; ödülün seçilen hafta kazanıldığını belirtmez.</small></section>':'')+
      '<section class="news-section"><span class="news-kicker">BİR SONRAKİ GÜZEL ADIM</span><h3>Hedefime doğru</h3>'+(target?'<p class="news-personal-goal">'+esc(target)+'</p><small>Öğretmenimin bu hafta için paylaştığı kişisel hedef.</small>':'')+'<p>'+esc(nextText)+'</p><small>Puan hedefi, güncel sezon kayıtlarına göre gösterilir.</small></section>'+
      reefStory+
      (a&&text(a.body,1800)?'<section class="news-announcement"><span class="news-kicker">SINIF DUYURUSU</span><h3>'+esc(text(a.title,100)||'Haftalık duyuru')+'</h3><p>'+esc(text(a.body,1800))+'</p></section>':'')+
      '<footer class="news-colophon">Bu sayı yalnızca '+esc(name)+' için hazırlanmıştır. Haftalık özet kaydedilmiş olumlu davranışlardan oluşur; akademik ölçme sonucu değildir.</footer>';
  }
  return {calendar:Calendar,day,week,shift,isWeek,label,weeks,validate,publication,publishedWeeks,localReport,markup};
});
