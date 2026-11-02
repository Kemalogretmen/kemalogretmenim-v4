(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./resmi-tatiller-veri.js'));
  else root.KemalAgendaHolidays=factory(root.KemalOfficialHolidayData);
})(typeof window!=='undefined'?window:globalThis,function(data){
  'use strict';
  const source='tr-official';
  const fixed=[
    ['yilbasi','01-01','Yılbaşı'],['23-nisan','04-23','Ulusal Egemenlik ve Çocuk Bayramı'],
    ['1-mayis','05-01','Emek ve Dayanışma Günü'],['19-mayis','05-19',"Atatürk’ü Anma, Gençlik ve Spor Bayramı"],
    ['15-temmuz','07-15','Demokrasi ve Millî Birlik Günü'],['30-agustos','08-30','Zafer Bayramı'],
    ['28-ekim','10-28','Cumhuriyet Bayramı (arife)','afternoon'],['29-ekim','10-29','Cumhuriyet Bayramı']
  ];
  function validDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))) return false;
    const date=new Date(value+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function addDays(value,days){
    if(!validDate(value)||!Number.isInteger(days)) return '';
    const date=new Date(value+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  }
  function dayCount(start,end){
    return validDate(start)&&validDate(end)&&end>=start ? Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1 : 0;
  }
  function officialForYear(value){
    const year=Number(value);
    if(!Number.isInteger(year)||year<1900||year>2100) return [];
    const url=data.years[year]?.source||data.law;
    const entry=(key,name,start,end=start,period='full')=>({officialId:`tr-${year}-${key}`,source,sourceYear:year,sourceUrl:url,name,start,end,period});
    const result=fixed.map(([key,date,name,period])=>entry(key,name,`${year}-${date}`,`${year}-${date}`,period));
    for(const [key,name,length] of [['ramazan','Ramazan Bayramı',3],['kurban','Kurban Bayramı',4]]) {
      (data.years[year]?.[key]||[]).forEach((start,index)=>{
        result.push(entry(`${key}-${index}-arife`,`${name} Arefesi`,addDays(start,-1),addDays(start,-1),'afternoon'));
        result.push(entry(`${key}-${index}`,name,start,addDays(start,length-1)));
      });
    }
    return result.sort((a,b)=>a.start.localeCompare(b.start)||a.officialId.localeCompare(b.officialId));
  }
  function isOfficial(entry){return entry?.source===source&&typeof entry.officialId==='string'&&/^tr-\d{4}-/.test(entry.officialId);}
  function ensure(planner,years){
    if(!planner||typeof planner!=='object') return false;
    if(!Array.isArray(planner.tatiller)) planner.tatiller=[];
    let changed=false;
    for(const year of new Set(years.map(Number))) for(const holiday of officialForYear(year)) {
      const index=planner.tatiller.findIndex(item=>item?.officialId===holiday.officialId);
      if(index>=0){
        const previous=planner.tatiller[index];
        if(previous.customized||previous.disabled) continue;
        const next={...previous,...holiday};
        if(JSON.stringify(previous)!==JSON.stringify(next)){planner.tatiller[index]=next;changed=true;}
      }else{
        const equivalent=planner.tatiller.some(item=>!isOfficial(item)&&!item.disabled&&item.start===holiday.start&&(item.end||item.start)===holiday.end&&String(item.name).toLocaleUpperCase('tr-TR')===holiday.name.toLocaleUpperCase('tr-TR'));
        if(!equivalent){planner.tatiller.push(holiday);changed=true;}
      }
    }
    return changed;
  }
  function halfDayStart(planner){
    const value=Number(planner?.settings?.halfDayStartPeriod);
    return Number.isInteger(value)&&value>=1&&value<=10?value:5;
  }
  function matching(planner,date,period){
    if(!validDate(date)) return [];
    return (Array.isArray(planner?.tatiller)?planner.tatiller:[]).filter(item=>item&&!item.disabled&&validDate(item.start)&&validDate(item.end||item.start)&&date>=item.start&&date<=(item.end||item.start)&&
      (period===undefined||item.period!=='afternoon'||Number(period)>=halfDayStart(planner)))
      .sort((a,b)=>Number(a.period==='afternoon')-Number(b.period==='afternoon')||Number(isOfficial(a))-Number(isOfficial(b)));
  }
  function reset(planner,officialId){
    const index=planner.tatiller.findIndex(item=>item?.officialId===officialId);
    if(index<0) return false;
    const original=officialForYear(planner.tatiller[index].sourceYear).find(item=>item.officialId===officialId);
    if(!original) return false;
    planner.tatiller[index]=original;return true;
  }
  return {data,validDate,addDays,dayCount,officialForYear,isOfficial,ensure,matching,halfDayStart,reset};
});
