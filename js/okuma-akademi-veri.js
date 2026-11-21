(function(root) {
  'use strict';

  const question = (prompt, options, correct, explanation) => ({ prompt, options, correct, explanation });

  const balcony = {
    title: 'Camın önündeki saksı',
    paragraphs: [
      'Ada küçük bir saksıya fasulye ekti. Saksıyı camın önüne koydu. Her sabah toprağa baktı. Toprak kuruyunca biraz su verdi.',
      'Bir gün topraktan ince, yeşil bir dal çıktı. Ada çok sevindi. Boyunu ölçmek için saksının yanına bir cetvel koydu.',
      'Ertesi hafta dalda iki yaprak vardı. Ada yaprakların resmini çizdi. Resmin altına o günün tarihini yazdı.'
    ]
  };
  const library = {
    title: 'Bir kitap, iki okur',
    paragraphs: [
      'Defne, okul kitaplığında yarım bıraktığı kitabı aradı. Rafta bulamayınca görevliye sordu. Kitabı bir gün önce Aras ödünç almıştı. Defne önce hayal kırıklığına uğradı. Eve gidince öykünün sonunu okumayı umuyordu.',
      'Ertesi gün Aras kitabı geri getirdi. Defne kitabı açınca sayfalar arasından bir ayraç düştü. Ayracın üstünde bir soru vardı: “Sence kahraman anahtarı neden sakladı?” Defne bunu düşünmemişti. Soruyu yazanın Aras olduğunu öğrendi.',
      'İkisi teneffüste aynı bölümü yeniden okudu. Defne bir cümleye, Aras ise bir resme dikkat çekti. İkisi de görüşünü öyküden bir ipucuyla açıkladı. Defne kitabı bitirdiğinde ayraca kendi sorusunu ekledi. Belki sıradaki okur onların fark etmediği bir ayrıntıyı bulacaktı.'
    ]
  };
  const courtyard = {
    title: 'Okul bahçesinde iki termometre',
    paragraphs: [
      'Öğrenci meclisi, teneffüste bahçenin bazı bölümlerinin neden daha sıcak hissedildiğini araştırdı. İlk gün bir termometreyi güneş alan taş zemine, diğerini ağaç gölgesine bıraktılar. Öğle arasında gölgedeki termometre daha düşük bir değer gösterdi. Bazı öğrenciler hemen taş zeminin ısınmaya tek başına neden olduğunu düşündü.',
      'Ece, iki yerin hem zemininin hem de güneş alma durumunun farklı olduğunu hatırlattı. Bu nedenle ilk ölçümden hangi etkenin daha önemli olduğunu çıkarmak mümkün değildi. Ayrıca termometrelerin aynı yükseklikte olmadığını fark etti. Grup, ölçümleri aynı saatte ve yerden aynı yükseklikte yapmaya karar verdi.',
      'Sonraki günlerde güneşli ve gölgeli taş zeminlerde ölçüm yaptılar. Hava durumunu da not ettiler. Gölgeli taş zemin, güneşli taş zeminden çoğu gün daha serindi. Bu bulgu taşın hiç etkisi olmadığını göstermiyordu; ancak aynı zemin üzerinde gölgenin fark yaratabildiğini gösteriyordu.',
      'Meclis, hemen bütün bahçeyi değiştirmek yerine önce bekleme alanına geçici gölgelik kurmayı önerdi. Bir ay sonra aynı saatlerde yeni ölçümler yapacak, öğrencilerin bekleme alanını ne sıklıkta kullandığını da gözlemleyeceklerdi. Böylece kararı tek bir ölçüme değil, birden fazla gözleme dayandırabileceklerdi.'
    ]
  };

  const levels = [
    {
      id: 'temel', grades: '1–2. sınıf', name: 'Okumaya Başla', focus: 'Hece · Kelime · Dikkat',
      activities: [
        { id: 'hece', title: 'Heceyi birleştir', skill: 'Kelime çözümleme', icon: 'puzzle',
          task: 'Hece parçalarını sırayla oku. Oluşan kelimeyi seç.',
          questions: [
            question('ka + lem', ['kale', 'kalem', 'kelek'], 1, '“ka” ile “lem” birleşince “kalem” olur.'),
            question('ba + lık', ['balık', 'balon', 'balkon'], 0, '“ba” ile “lık” birleşince “balık” olur.'),
            question('ki + tap', ['kapı', 'kutu', 'kitap'], 2, '“ki” ile “tap” birleşince “kitap” olur.'),
            question('ke + le + bek', ['kelebek', 'keçi', 'kelek'], 0, 'Üç heceyi sırasıyla birleştir: ke, le, bek.')
          ] },
        { id: 'hedef', title: 'Hedef kelimeyi bul', skill: 'Harf sırası ve dikkat', icon: 'search',
          task: 'Hedef kelimeyi oku. Harfleri aynı sırada olan seçeneği bul.',
          questions: [
            question('Hedef: masa', ['mama', 'asma', 'masa'], 2, 'Aradığımız sıra m, a, s, a.'),
            question('Hedef: taş', ['şat', 'taş', 'tat'], 1, 'Kelime “t” ile başlıyor ve “ş” ile bitiyor.'),
            question('Hedef: sal', ['sal', 'saz', 'sas'], 0, 'Son harf “l”.'),
            question('Hedef: dal', ['bal', 'dar', 'dal'], 2, 'İlk harf “d”, son harf “l”.')
          ] },
        { id: 'saksi-tekrar', title: 'İki kez oku', skill: 'Sesli ve akıcı okuma', icon: 'timer', passage: balcony, repeat: true,
          task: 'İlk okumada kelimeleri doğru söylemeye çalış.',
          secondTask: 'Bu kez noktada durakla. Ada’nın yaptıklarını sırayla hatırla.',
          questions: [
            question('Ada toprağa ne zaman su verdi?', ['Toprak kuruyunca', 'Her akşam', 'Yaprakları çizince'], 0, 'Metnin başında toprağın kurumasını beklediğini okuyoruz.'),
            question('Ada neden cetvel koydu?', ['Toprağı karıştırmak için', 'Dalın boyunu ölçmek için', 'Yaprakları kesmek için'], 1, 'İkinci paragrafta dalın boyunu ölçmek istediği yazıyor.')
          ] },
        { id: 'saksi-sira', title: 'Öyküyü sıraya koy', skill: 'Olay sırası', icon: 'layers', passage: balcony,
          task: 'Metni oku. Önce ve sonra olanları düşün.',
          questions: [
            question('Ada ilk olarak ne yaptı?', ['Yaprak çizdi.', 'Cetveli koydu.', 'Fasulye ekti.'], 2, 'Öykü, Ada’nın saksıya fasulye ekmesiyle başlıyor.'),
            question('Öykünün sonunda Ada ne yaptı?', ['Resme tarih yazdı.', 'Saksıyı kaldırdı.', 'Fasulyeyi yedi.'], 0, 'Son cümlede Ada resminin altına tarihi yazıyor.')
          ] }
      ]
    },
    {
      id: 'akici', grades: '3–4. sınıf', name: 'Akıcılık Kazan', focus: 'Bağlam · Vurgu · Ana fikir',
      activities: [
        { id: 'cumle', title: 'Cümledeki ipucunu bul', skill: 'Bağlamdan anlam', icon: 'search',
          task: 'Cümledeki diğer sözcüklerden ipucu al.',
          questions: [
            question('“Yol ıssızdı; çevrede tek bir insan bile yoktu.” Issız ne demek?', ['Dar', 'Kimsesiz', 'Engebeli'], 1, '“Tek bir insan bile yoktu” ifadesi, “kimsesiz” anlamını destekler.'),
            question('“Çatlak olduğu için bardağın içindeki su sızdı.” Sızmak ne demek?', ['Donmak', 'Buharlaşmak', 'Aralıktan yavaşça geçmek'], 2, 'Çatlak, suyun geçebileceği küçük bir aralıktır.'),
            question('“Leyla çekingen davrandı; gruba katılmak istedi ama konuşmaya cesaret edemedi.” Çekingen ne demek?', ['Ürkek davranan', 'Acele eden', 'Yüksek sesle konuşan'], 0, 'Leyla’nın konuşmaya cesaret edememesi ipucudur.')
          ] },
        { id: 'kitap-tekrar', title: 'Vurgu ve duraklarla oku', skill: 'İfadeli tekrar okuma', icon: 'timer', passage: library, repeat: true,
          task: 'Öyküyü sesli oku. Defne’nin ilk tepkisine dikkat et.',
          secondTask: 'Soru cümlesini meraklı bir sesle oku. Noktalarda durakla ve Defne’nin fikrinin değiştiği anı bul.',
          questions: [
            question('Defne kitabı neden ilk gün alamadı?', ['Aras ödünç almıştı.', 'Kitap yırtılmıştı.', 'Okul kapalıydı.'], 0, 'İlk paragrafta kitabın Aras tarafından ödünç alındığı yazıyor.'),
            question('Defne ikinci kez okurken ne yaptı?', ['Yalnızca kitabın sonuna baktı.', 'Bir cümleyi görüşüne kanıt gösterdi.', 'Ayracı görevliye verdi.'], 1, 'Son paragrafta Defne bir cümleye dikkat çekiyor ve görüşünü bir ipucuyla açıklıyor.')
          ] },
        { id: 'kitap-ana-fikir', title: 'Ana fikir ve ayrıntı', skill: 'Önemli bilgiyi seçme', icon: 'clipboard', passage: library,
          task: 'Her paragrafta ne değiştiğini düşün. Bütün metni kapsayan düşünceyi bul.',
          questions: [
            question('Öykünün ana fikri hangisi?', ['Ayraçlar her zaman sorularla süslenmelidir.', 'Ödünç alınan kitaplar teneffüste iade edilir.', 'Aynı metni konuşarak okumak yeni ayrıntılar görmemizi sağlar.'], 2, 'Öykünün sonunda iki okur farklı ipuçları buluyor ve sıradaki okur için yeni bir soru bırakıyor.'),
            question('Ana fikri en iyi destekleyen ayrıntı hangisi?', ['Kitap rafta bulunmadı.', 'Defne bir cümleyi, Aras bir resmi ipucu olarak gösterdi.', 'Aras kitabı ertesi gün getirdi.'], 1, 'İki farklı ipucu, okurların birbirlerinin fark etmediği şeyleri görebildiğini gösterir.')
          ] },
        { id: 'kitap-ozet', title: 'İki cümlede özetle', skill: 'Kendi sözcükleriyle anlatma', icon: 'pen', passage: library,
          task: 'Defne’nin kitabı bulamayışını ve Aras’la birlikte ne öğrendiklerini iki cümlede anlat.',
          sample: 'Defne’nin aradığı kitabı Aras almıştı; geri verirken sayfaların arasına bir soru bıraktı. İkisi öyküyü yeniden okuyup farklı ipuçları bularak aynı kitabı birlikte tartışmanın yararını gördü.',
          criteria: ['Başlangıçtaki duruma değindim.', 'Öykünün sonunda ne değiştiğini söyledim.', 'Kendi cümlelerimi kullandım.']
        }
      ]
    },
    {
      id: 'anlama', grades: '5–8. sınıf', name: 'Derinlemesine Anla', focus: 'Çıkarım · Kanıt · Özet',
      activities: [
        { id: 'deney-tekrar', title: 'Bir amaçla tekrar oku', skill: 'Anlamı izleme', icon: 'timer', passage: courtyard, repeat: true,
          task: 'Metni bir kez oku. Öğrencilerin hangi soruyu araştırdığını belirle.',
          secondTask: 'İkinci okumada ilk ölçümle sonraki ölçümlerin nasıl farklılaştığını ve bu farkın neden önemli olduğunu bul.',
          questions: [
            question('İlk ölçümde iki alanı karşılaştırmak neden zordu?', ['İki ölçüm aynı saatteydi.', 'Hem zemin hem güneş alma durumu değişiyordu.', 'Taş zeminlerin ikisi de gölgedeydi.'], 1, 'İki etken birlikte değiştiği için sonucu yalnızca birine bağlayamayız.'),
            question('Sonraki ölçümlerden hangi sonuç çıkar?', ['Aynı zeminde gölge, sıcaklık farkı yaratabilir.', 'Zemin sıcaklığı her gün aynıdır.', 'Taşın sıcaklığa hiçbir etkisi yoktur.'], 0, 'Aynı tür zeminde yapılan ölçümler gölgenin etkisi hakkında daha doğrudan bilgi verir.')
          ] },
        { id: 'deney-kanit', title: 'Çıkarımı kanıtla', skill: 'İddia ve kanıt', icon: 'clipboard', passage: courtyard,
          task: 'Yanıtını doğrudan metindeki bir gözleme ya da açıklamaya dayandır.',
          questions: [
            question('“İlk ölçüm, taşın etkisini tek başına göstermiyor.” Bu iddiayı en iyi hangi bilgi destekler?', ['Meclis bir ay daha çalışacak.', 'İlk ölçümde zeminle birlikte güneş alma durumu da değişiyordu.', 'Öğrenciler ölçüm değerlerini yazdı.'], 1, 'Birden çok değişken aynı anda değiştiği için ilk ölçüm, taşın etkisini ayrı göstermez.'),
            question('Meclis neden hemen bütün bahçeyi değiştirmedi?', ['Daha çok gözlemle küçük bir uygulamayı değerlendirmek istedi.', 'Gölgede sıcaklık farkı çıkmadı.', 'Öğrenciler bekleme alanını hiç kullanmıyordu.'], 0, 'Son paragrafta geçici bir gölgelik ve sonrasında iki ayrı gözlem öneriliyor.'),
            question('“Her gün gölge daha serindir.” Bu yargı metne göre doğru mu?', ['Evet, bütün günler için kanıt var.', 'Evet, zemin değişse de sonuç kesin.', 'Hayır, metin yalnızca çoğu gün daha serin olduğunu söylüyor.'], 2, '“Çoğu gün” ile “her gün” farklı kapsamda ifadelerdir.')
          ] },
        { id: 'deney-baglam', title: 'Bağlamdan kavramı çöz', skill: 'Akademik kelime bilgisi', icon: 'search', passage: courtyard,
          task: 'Kelimenin geçtiği cümleyi ve çevresindeki cümleleri birlikte değerlendir.',
          questions: [
            question('“Etken” kelimesinin metindeki anlamı nedir?', ['Sonucu değiştirebilen unsur', 'Ölçümde kullanılan araç', 'Bahçenin bir bölümü'], 0, 'Zemin ve güneş alma durumu sıcaklığı etkileyebilecek iki unsurdur.'),
            question('“Geçici gölgelik” ifadesinde “geçici” neyi anlatır?', ['Ölçüm için hiç kullanılmayacağını', 'Belirli bir süre için kurulacağını', 'Bahçenin tümüne kurulacağını'], 1, 'Meclis bunu önce denemek, sonra etkisini yeniden değerlendirmek istiyor.')
          ] },
        { id: 'deney-ozet', title: 'Bulgu ve yorumu ayır', skill: 'Kısa bilimsel özet', icon: 'pen', passage: courtyard,
          task: 'Bir cümlede öğrencilerin gözlemini, ikinci cümlede bu gözlemden çıkarılabilecek sınırlı sonucu yaz.',
          sample: 'Gölgeli taş zemin, güneşli taş zemine göre çoğu gün daha serindi. Bu bulgu, aynı tür zemin üzerinde gölgenin sıcaklığı etkileyebildiğini gösterir; taşın etkisini tek başına ölçmez.',
          criteria: ['Ölçülen farkı yazdım.', 'Bir sonucu kanıtından daha geniş göstermedim.', 'Gözlemi ve yorumu ayrı cümlelerde verdim.']
        }
      ]
    }
  ];

  const categoryByIcon = { puzzle: 'decoding', search: 'comprehension', timer: 'fluency', layers: 'comprehension', pen: 'comprehension', clipboard: 'comprehension' };
  levels.forEach(level => level.activities.forEach(activity => {
    activity.category = activity.id === 'hedef' ? 'attention' : categoryByIcon[activity.icon];
  }));

  levels[0].activities.push({
    id: 'satir-izi', title: 'Satırın izini sür', skill: 'Satır takibi', category: 'attention', icon: 'search', focus: 'sentence',
    task: 'Cümle cümle ilerle. Yer işaretini anlatan cümleyi bulmak için gerekirse geri dön.',
    passage: { title: 'Ayraç nerede?', paragraphs: [
      'Mert mavi bir ayraç yaptı. Ayracın ucuna sarı bir ip bağladı.',
      'Kitabı açtı ve ikinci sayfaya kadar okudu. Sonra ayracı ikinci sayfaya koydu.',
      'Mert ertesi gün kitabı yeniden açtı. Sarı ip sayesinde kaldığı sayfayı hemen buldu.'
    ] },
    questions: [
      question('Mert ayracı hangi sayfaya koydu?', ['İkinci sayfaya', 'İlk sayfaya', 'Son sayfaya'], 0, 'İkinci paragrafta ayracı ikinci sayfaya koyduğunu okuyoruz.'),
      question('Mert sayfayı nasıl buldu?', ['Kapağın resmiyle', 'Sarı ip sayesinde', 'Cetvelle'], 1, 'Ayracın sarı ipi, kaldığı sayfayı bulmasına yardım etti.')
    ]
  });
  levels[1].activities.push({
    id: 'soz-gruplari', title: 'Söz gruplarıyla oku', skill: 'Vurgu ve doğal duraklama', category: 'fluency', icon: 'timer', focus: 'sentence',
    task: 'Her cümleyi önce sessizce, sonra doğal duraklarla sesli oku. Eğik çizgiler anlam gruplarını ayırır.',
    passage: { title: 'Yağmur dinince', paragraphs: [
      'Yağmur dinince / çocuklar bahçeye çıktı. Bahçenin köşesindeki su birikintisi / gökyüzünü yansıtıyordu.',
      'Selin, “Bulutlar yere mi indi?” / diye sordu. Arkadaşı gülümsedi / ve suda görünenin bir yansıma olduğunu söyledi.'
    ] },
    questions: [
      question('“Yağmur dinince” söz grubu hangi bilgiyi verir?', ['Nerede?', 'Ne zaman?', 'Kim?'], 1, 'Bahçeye çıkışın zamanını açıklar.'),
      question('Çocuklar suda ne gördü?', ['Gökyüzünün yansımasını', 'Yere inen bir bulutu', 'Bir yaprağı'], 0, 'Metin, su birikintisinin gökyüzünü yansıttığını söylüyor.')
    ]
  }, {
    id: 'duyuruda-ara', title: 'Duyuruda bilgiyi bul', skill: 'Amaçlı tarama', category: 'attention', icon: 'search',
    task: 'Önce aradığın bilgiyi aklında tut: gün, saat veya yer. Bulduğunda ilgili cümlenin tamamını oku.',
    passage: { title: 'Okul kitap takası', paragraphs: [
      'Kitap takası perşembe günü yapılacak. Takas saat 14.00’te başlayacak ve 15.00’te bitecek.',
      'Kitabını okul kitaplığındaki görevliye teslim edebilirsin. Yırtık sayfası olan kitaplar yerine iyi durumdaki kitapları getir.'
    ] },
    questions: [
      question('Takas ne zaman başlıyor?', ['Perşembe 14.00', 'Perşembe 15.00', 'Cuma 14.00'], 0, 'İlk paragraf takasın perşembe günü saat 14.00’te başladığını söylüyor.'),
      question('Kitap kime teslim ediliyor?', ['Sınıf başkanına', 'Okul kitaplığındaki görevliye', 'Bahçe nöbetçisine'], 1, 'Yer ve teslim edilecek kişi ikinci paragrafta belirtiliyor.')
    ]
  });
  levels[2].activities.push({
    id: 'anlam-duragi', title: 'Anlamı durdur ve denetle', skill: 'Çelişkiyi fark etme', category: 'comprehension', icon: 'clipboard', focus: 'sentence',
    task: 'Cümleler arasında bağlantı kur. Bir sonuç önceki bilgilerle uyuşmuyorsa ilgili cümleye geri dön.',
    passage: { title: 'Yağmur ölçümleri', paragraphs: [
      'Çevre kulübü pazar günü okul bahçesinde 12 milimetre yağış ölçtü. Pazartesi günü aynı ölçer 4 milimetre gösterdi.',
      'Bir öğrenci, “Hafta başında yağış arttı.” diye yazdı. Arkadaşı bu yorumun ölçüm tablosuyla tutarlı olmadığını söyledi.'
    ] },
    questions: [
      question('Hangi bilgi “yağış arttı” yorumuyla çelişiyor?', ['Ölçer okul bahçesindeydi.', 'Kulüp iki gün ölçüm yaptı.', 'Yağış 12 milimetreden 4 milimetreye düştü.'], 2, 'Artış için ikinci değerin daha yüksek olması gerekirdi.'),
      question('Bu iki gün için hangi sonuç desteklenir?', ['Pazartesi günü daha az yağış ölçüldü.', 'Pazartesi her zaman daha az yağış olur.', 'Bir hafta boyunca yağış azaldı.'], 0, 'Ölçüm yalnızca pazar ve pazartesiyi karşılaştırıyor.')
    ]
  }, {
    id: 'tarama-derin', title: 'Önce tara, sonra derin oku', skill: 'Amaca göre tempo', category: 'fluency', icon: 'timer', repeat: true,
    task: 'İlk turda yalnızca ölçeğin nerede kullanıldığını bul.',
    secondTask: 'Şimdi yavaşlayıp haritanın neden tek başına yeterli olmadığını açıklayan cümleye odaklan.',
    passage: { title: 'Kıyı rotasının haritası', paragraphs: [
      'İzci grubu kıyı yürüyüşü için bir harita hazırladı. Haritada bir santimetre, gerçekte iki yüz metreyi temsil ediyordu. Grup bu ölçeği kullanarak kamp ile iskele arasındaki uzaklığı hesapladı.',
      'Kâğıt üzerindeki en kısa yol, yağmurda kayganlaşan bir yokuştan geçiyordu. Grup, yokuşun eğimini haritadan tam olarak anlayamadığı için bölgeyi tanıyan bir görevliye danıştı.',
      'Görevli, biraz daha uzun ama düz bir güzergâh önerdi. Grup son kararında yalnızca uzaklığı değil, arazi koşullarını da dikkate aldı.'
    ] },
    questions: [
      question('Ölçek hangi amaçla kullanıldı?', ['Yokuşun eğimini ölçmek için', 'Kamp ile iskele arasındaki uzaklığı hesaplamak için', 'Yağmur zamanını öğrenmek için'], 1, 'Ölçek, haritadaki uzunluğu gerçek uzaklığa çevirir.'),
      question('Grup neden başka bir rotayı seçti?', ['Daha kısa olduğu için', 'İskeleyi haritada bulamadığı için', 'Arazi daha düz olduğu için'], 2, 'Kısa yol kayganlaşan yokuştan geçiyordu; uzun rota daha düzdü.')
    ]
  });

  if (typeof module === 'object' && module.exports) module.exports = levels;
  else root.ReadingAcademyLevels = levels;
})(globalThis);
