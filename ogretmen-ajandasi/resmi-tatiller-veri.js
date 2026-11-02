// Verified against Diyanet's published official holiday tables on 2026-11-02.
// The refresh script validates complete year tables before replacing this file.
(function(root){
  const origin='https://vakithesaplama.diyanet.gov.tr';
  const rows=[
    [2025,['2025-03-30'],['2025-06-06'],157],
    [2026,['2026-03-20'],['2026-05-27'],158],
    [2027,['2027-03-09'],['2027-05-16'],159],
    [2028,['2028-02-26'],['2028-05-05'],193],
    [2029,['2029-02-14'],['2029-04-24'],194],
    [2030,['2030-02-04'],['2030-04-13'],195],
    [2031,['2031-01-24'],['2031-04-02'],196],
    [2032,['2032-01-14'],['2032-03-22'],197],
    [2033,['2033-01-02','2033-12-23'],['2033-03-11'],198],
    [2034,['2034-12-12'],['2034-03-01'],199],
    [2035,['2035-12-01'],['2035-02-18'],200]
  ];
  const data={version:1,verifiedAt:'2026-11-02',authority:'T.C. Diyanet İşleri Başkanlığı',law:origin+'/2429_kanun.php',
    years:Object.fromEntries(rows.map(([year,ramazan,kurban,id])=>[year,{ramazan,kurban,source:`${origin}/icerik.php?icerik=${id}`}]))};
  if(typeof module==='object'&&module.exports) module.exports=data;
  else root.KemalOfficialHolidayData=data;
})(typeof window!=='undefined'?window:globalThis);
