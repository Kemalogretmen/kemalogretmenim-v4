/**
 * Kelime Avı Atölyesi — Hazır Müfredat Paketleri & Emoji Sözlüğü
 * MEB Türkiye Yüzyılı Maarif Modeli (1. Sınıf Yeni Ses Grupları) ve
 * İlkokul / Ortaokul Tematik Kelime Paketleri (İpuçlu & Görselli).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KelimePacks = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * MEB Türkiye Yüzyılı Maarif Modeli 1. Sınıf Ses Grupları (kümülatif).
   */
  const MEB_SOUND_GROUPS = [
    {
      id: 'meb1',
      name: '1. Grup (ANETİL)',
      newLetters: 'ANETİL',
      cumulativeLetters: 'ANETİL',
      description: 'Sadece a, n, e, t, i, l harfleri'
    },
    {
      id: 'meb2',
      name: '2. Grup (+ OKURIM)',
      newLetters: 'OKURIM',
      cumulativeLetters: 'ANETİLOKURIM',
      description: '1. ve 2. grup harfleri (12 harf)'
    },
    {
      id: 'meb3',
      name: '3. Grup (+ ÜSÖYDZ)',
      newLetters: 'ÜSÖYDZ',
      cumulativeLetters: 'ANETİLOKURIMÜSÖYDZ',
      description: 'İlk 3 grup harfleri (18 harf)'
    },
    {
      id: 'meb4',
      name: '4. Grup (+ ÇBGCŞ)',
      newLetters: 'ÇBGCŞ',
      cumulativeLetters: 'ANETİLOKURIMÜSÖYDZÇBGCŞ',
      description: 'İlk 4 grup harfleri (23 harf)'
    },
    {
      id: 'meb5',
      name: '5. Grup (+ PHVĞFJ)',
      newLetters: 'PHVĞFJ',
      cumulativeLetters: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ',
      description: 'Tüm alfabe (29 harf)'
    }
  ];

  /**
   * Yaygın ilkokul kelimeleri için tek tıkla otomatik emoji sözlüğü.
   * Anahtarlar tr-TR büyük harftir.
   */
  const EMOJI_DICTIONARY = {
    // Aile & İnsan
    'ANNE': '👩', 'BABA': '👨', 'NİNE': '👵', 'DEDE': '👴', 'BEBEK': '👶',
    'ÇOCUK': '🧒', 'AİLE': '👨‍👩‍👧‍👦', 'ARKADAŞ': '🤝', 'ÖĞRETMEN': '👩‍🏫',
    'ÖĞRENCİ': '🎒', 'DOKTOR': '🩺', 'HEKİM': '🩺', 'HEMŞİRE': '💉',
    'POLİS': '👮', 'İTFAİYECİ': '🚒', 'AŞÇI': '👨‍🍳', 'PİLOT': '✈️',
    'ÇİFTÇİ': '🌾', 'MİMAR': '📐', 'MÜHENDİS': '⚙️', 'BERBER': '✂️',
    'TERZİ': '🧵', 'ASTRONOT': '👩‍🚀', 'RESSAM': '🎨', 'MÜZİSYEN': '🎵',
    'AVUKAT': '⚖️', 'ECZACI': '💊', 'VETERİNER': '🐾', 'KAPTAN': '⚓',

    // Okul & Eğitim
    'OKUL': '🏫', 'SINIF': '🪑', 'KALEM': '✏️', 'KİTAP': '📖', 'DEFTER': '📓',
    'SİLGİ': '🧽', 'ÇANTA': '🎒', 'TAHTA': '🖍️', 'CETVEL': '📏', 'MAKAS': '✂️',
    'BOYA': '🎨', 'FIRÇA': '🖌️', 'ZİL': '🔔', 'SIRA': '🪑', 'ÖDEV': '📝',
    'DERS': '📚', 'OKUMA': '📖', 'YAZMA': '✍️', 'HECE': '🔤', 'HARF': '🔠',
    'SES': '🔊', 'MÜZİK': '🎵', 'RESİM': '🖼️', 'SPOR': '⚽', 'OYUN': '🎲',
    'HARİTA': '🗺️', 'KÜRE': '🌍', 'SAAT': '⏰', 'MASA': '🪵', 'PERGEL': '🧭',

    // Hayvanlar
    'ASLAN': '🦁', 'KAPLAN': '🐯', 'FİL': '🐘', 'ZÜRAFA': '🦒', 'MAYMUN': '🐒',
    'AYI': '🐻', 'PANDA': '🐼', 'KURT': '🐺', 'TİLKİ': '🦊', 'TAVŞAN': '🐰',
    'KEDİ': '🐱', 'KÖPEK': '🐶', 'AT': '🐴', 'İNEK': '🐄', 'KOYUN': '🐑',
    'KEÇİ': '🐐', 'TAVUK': '🐔', 'HOROZ': '🐓', 'ÖRDEK': '🦆', 'KUŞ': '🐦',
    'KARTAL': '🦅', 'BAYKUŞ': '🦉', 'PENGUEN': '🐧', 'BALIK': '🐟', 'YUNUS': '🐬',
    'BALİNA': '🐋', 'AHTAPOT': '🐙', 'KAPLUMBAĞA': '🐢', 'KURBAĞA': '🐸',
    'YILAN': '🐍', 'TİMSAH': '🐊', 'ARI': '🐝', 'KELEBEK': '🦋', 'KARINCA': '🐜',
    'UĞURBÖCEĞİ': '🐞', 'BÖCEK': '🪲', 'ÖRÜMCEK': '🕷️', 'SALYANGOZ': '🐌',
    'DEVE': '🐪', 'ZEBRA': '🦓', 'KANGURU': '🦘', 'KİRPİ': '🦔', 'SİNCAP': '🐿️',
    'KUMRU': '🕊️', 'LEYLEK': '🦩', 'FARE': '🐭', 'KOALA': '🐨',

    // Meyve & Sebze & Yiyecek
    'ELMA': '🍎', 'ARMUT': '🍐', 'MUZ': '🍌', 'ÇİLEK': '🍓', 'KİRAZ': '🍒',
    'ÜZÜM': '🍇', 'KARPUZ': '🍉', 'KAVUN': '🍈', 'PORTAKAL': '🍊', 'LİMON': '🍋',
    'ŞEFTALİ': '🍑', 'NAR': '🫐', 'ANANAŞ': '🍍', 'ANANAS': '🍍', 'KİVİ': '🥝',
    'AVOKADO': '🥑', 'DOMATES': '🍅', 'HAVUÇ': '🥕', 'MISIR': '🌽', 'PATATES': '🥔',
    'SOĞAN': '🧅', 'SARIMSAK': '🧄', 'BİBER': '🫑', 'SALATALIK': '🥒', 'MARUL': '🥬',
    'BROKOLİ': '🥦', 'MANTAR': '🍄', 'PATLICAN': '🍆', 'BEZELYE': '🫛',
    'EKMEK': '🍞', 'PEYNİR': '🧀', 'SÜT': '🥛', 'YUMURTA': '🥚', 'BAL': '🍯',
    'ŞEKER': '🍬', 'PASTA': '🎂', 'DONDURMA': '🍦', 'ÇORBA': '🍲', 'YEMEK': '🍽️',
    'ET': '🥩', 'NANE': '🌿', 'SU': '💧', 'ÇAY': '🍵', 'ZEYTİN': '🫒',

    // Doğa, Hava & Uzay
    'GÜNEŞ': '☀️', 'AY': '🌙', 'YILDIZ': '⭐', 'BULUT': '☁️', 'YAĞMUR': '🌧️',
    'KAR': '❄️', 'RÜZGAR': '💨', 'ŞİMŞEK': '⚡', 'GÖKKUŞAĞI': '🌈', 'DENİZ': '🌊',
    'DAĞ': '⛰️', 'ORMAN': '🌲', 'AĞAÇ': '🌳', 'ÇİÇEK': '🌸', 'LALE': '🌷',
    'GÜL': '🌹', 'PAPATYA': '🌼', 'YAPRAK': '🍃', 'TOPRAK': '🟤', 'TAŞ': '🪨',
    'GÖL': '🏞️', 'NEHİR': '🏞️', 'ADA': '🏝️', 'YANARDAĞ': '🌋', 'DOĞA': '🌿',
    'DÜNYA': '🌍', 'UZAY': '🌌', 'GEZEGEN': '🪐', 'ROKET': '🚀', 'UYDU': '🛰️',
    'TELESKOP': '🔭', 'METEOR': '☄️', 'GALAKSİ': '🌌', 'MARS': '🔴', 'SATÜRN': '🪐',
    'JÜPİTER': '🟠', 'MERKÜR': '⚪', 'VENÜS': '🟡', 'URANÜS': '🔵', 'NEPTÜN': '💙',
    'İLKBAHAR': '🌸', 'YAZ': '☀️', 'SONBAHAR': '🍂', 'KIŞ': '⛄',
    'MEVSİM': '🗓️', 'GECE': '🌃', 'GÜNDÜZ': '🌤️', 'HAVA': '🌬️', 'ATEŞ': '🔥',

    // Nesneler & Ulaşım
    'EV': '🏠', 'BALKON': '🏡', 'PENCERE': '🪟', 'KAPI': '🚪', 'ANAHTAR': '🔑',
    'KİLİT': '🔒', 'ARABA': '🚗', 'OTOBÜS': '🚌', 'TREN': '🚆', 'UÇAK': '✈️',
    'GEMİ': '🚢', 'BİSİKLET': '🚲', 'MOTOR': '🏍️', 'KAMYON': '🚚', 'TRAKTÖR': '🚜',
    'HELYKOPTER': '🚁', 'HELİKOPTER': '🚁', 'BALON': '🎈', 'TOP': '⚽', 'KALE': '🏰',
    'KULE': '🗼', 'BAYRAK': '🇹🇷', 'KALP': '❤️', 'HEDİYE': '🎁', 'YÜZÜK': '💍',
    'GÖZLÜK': '👓', 'ŞAPKA': '🧢', 'AYAKKABI': '👟', 'ATLET': '👕', 'KEMER': ' Belt',
    'ANTEN': '📡', 'KAMERA': '📷', 'TELEFON': '📱', 'BİLGİSAYAR': '💻', 'ROBOT': '🤖',
    'LAMBA': '💡', 'MUM': '🕯️', 'VAZO': '🏺', 'HALI': '🧶', 'YATAK': '🛏️',
    'TENCERE': '🥘', 'KAŞIK': '🥄', 'ÇATAL': '🍴', 'BARDAK': '🥤', 'ŞEMSİYE': '☂️',
    'NAL': '🧲', 'TEL': '🧵', 'EL': '✋', 'GÖZ': '👁️', 'KULAK': '👂', 'BURUN': '👃',

    // İngilizce İlkokul
    'APPLE': '🍎', 'BANANA': '🍌', 'ORANGE': '🍊', 'BOOK': '📖', 'PENCIL': '✏️',
    'SCHOOL': '🏫', 'TEACHER': '👩‍🏫', 'DOG': '🐶', 'CAT': '🐱', 'BIRD': '🐦',
    'FISH': '🐟', 'LION': '🦁', 'TIGER': '🐯', 'SUN': '☀️', 'MOON': '🌙',
    'STAR': '⭐', 'TREE': '🌳', 'FLOWER': '🌸', 'HOUSE': '🏠', 'CAR': '🚗',
    'TRAIN': '🚆', 'WATER': '💧', 'MILK': '🥛', 'RED': '🔴', 'BLUE': '🔵',
    'GREEN': '🟢', 'YELLOW': '🟡'
  };
  // Küçük düzeltme: KEMER
  EMOJI_DICTIONARY['KEMER'] = '🪢';

  /**
   * Hazır Müfredat ve Tematik Kelime Paketleri
   * Her paket şu alanlara sahiptir:
   * - id, category, title, badge, description
   * - language: 'tr' | 'en'
   * - recommended: { rows, cols, directionPreset, fillMode, mebGroup, wordBankMode, secretMessage, shape }
   * - entries: [{ word, clue?, emoji? }]
   */
  const PACKS = [
    // ==================== MEB 1. SINIF YENİ SES GRUPLARI ====================
    {
      id: 'meb-1-anetil',
      category: '1. Sınıf · MEB Ses Grupları',
      title: '1. Grup: ANETİL',
      badge: '1. Sınıf',
      description: 'Türkiye Yüzyılı Maarif Modeli 1. grup harfleri (a, n, e, t, i, l) ile oluşturulan kelimeler.',
      language: 'tr',
      recommended: {
        rows: 9, cols: 9, directionPreset: 'easy', fillMode: 'meb_group',
        mebGroup: 'meb1', wordBankMode: 'list', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'ANNE', emoji: '👩', clue: 'Bizi çok seven, büyüten kişi' },
        { word: 'LALE', emoji: '🌷', clue: 'İlkbaharda açan renkli çiçek' },
        { word: 'NANE', emoji: '🌿', clue: 'Güzel kokulu yeşil bitki' },
        { word: 'AİLE', emoji: '👨‍👩‍👧‍👦', clue: 'Anne, baba ve çocuklardan oluşan yuva' },
        { word: 'NİNE', emoji: '👵', clue: 'Annemizin veya babamızın annesi' },
        { word: 'ATLET', emoji: '👕', clue: 'İçimize giydiğimiz giysi' },
        { word: 'ANTEN', emoji: '📡', clue: 'Sinyal almaya yarayan çubuk' },
        { word: 'TANE', emoji: '🌾', clue: 'Tek tek sayılan küçük parça' },
        { word: 'ALAN', emoji: '🟩', clue: 'Geniş, açık yer' },
        { word: 'NAL', emoji: '🧲', clue: 'Atların ayağına takılan demir' }
      ]
    },
    {
      id: 'meb-2-okurim',
      category: '1. Sınıf · MEB Ses Grupları',
      title: '2. Grup: OKURIM',
      badge: '1. Sınıf',
      description: 'ANETİL + OKURIM (12 harf) ile ilk okuma yazma kelimeleri.',
      language: 'tr',
      recommended: {
        rows: 10, cols: 10, directionPreset: 'easy', fillMode: 'meb_group',
        mebGroup: 'meb2', wordBankMode: 'list', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'OKUL', emoji: '🏫', clue: 'Ders gördüğümüz eğitim yuvası' },
        { word: 'KALEM', emoji: '✏️', clue: 'Yazı yazmaya yarayan araç' },
        { word: 'ROKET', emoji: '🚀', clue: 'Uzaya giden hızlı araç' },
        { word: 'ORMAN', emoji: '🌲', clue: 'Ağaçlarla kaplı geniş alan' },
        { word: 'KARTAL', emoji: '🦅', clue: 'Yükseklerden uçan güçlü kuş' },
        { word: 'LİMON', emoji: '🍋', clue: 'Sarı renkli, ekşi meyve' },
        { word: 'MARUL', emoji: '🥬', clue: 'Salataya koyduğumuz yeşil yapraklı sebze' },
        { word: 'MANTAR', emoji: '🍄', clue: 'Şemsiyeye benzeyen orman bitkisi' },
        { word: 'TREN', emoji: '🚆', clue: 'Raylar üzerinde giden uzun taşıt' },
        { word: 'KİLİT', emoji: '🔒', clue: 'Kapıyı güvenle kapatan araç' }
      ]
    },
    {
      id: 'meb-3-usoydz',
      category: '1. Sınıf · MEB Ses Grupları',
      title: '3. Grup: ÜSÖYDZ',
      badge: '1. Sınıf',
      description: 'İlk 3 ses grubu (ANETİL + OKURIM + ÜSÖYDZ — 18 harf) kelimeleri.',
      language: 'tr',
      recommended: {
        rows: 10, cols: 10, directionPreset: 'easy', fillMode: 'meb_group',
        mebGroup: 'meb3', wordBankMode: 'list', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'YILDIZ', emoji: '⭐', clue: 'Gece gökyüzünde parlayan ışık' },
        { word: 'DENİZ', emoji: '🌊', clue: 'Tuzlu ve masmavi büyük su' },
        { word: 'ÜZÜM', emoji: '🍇', clue: 'Salkım salkım yetişen tatlı meyve' },
        { word: 'ÖRDEK', emoji: '🦆', clue: 'Suda yüzen, vak vak diyen kuş' },
        { word: 'DÜNYA', emoji: '🌍', clue: 'Üzerinde yaşadığımız gezegen' },
        { word: 'YEMEK', emoji: '🍽️', clue: 'Acıktığımızda yediğimiz besin' },
        { word: 'DERS', emoji: '📚', clue: 'Sınıfta öğretmenimizle işlediğimiz konu' },
        { word: 'SÜT', emoji: '🥛', clue: 'Kemiklerimizi güçlendiren beyaz içecek' },
        { word: 'SIRA', emoji: '🪑', clue: 'Sınıfta oturduğumuz yer' },
        { word: 'ZİL', emoji: '🔔', clue: 'Teneffüsün başladığını haber verir' }
      ]
    },
    {
      id: 'meb-4-cbgcs',
      category: '1. Sınıf · MEB Ses Grupları',
      title: '4. Grup: ÇBGCŞ',
      badge: '1. Sınıf',
      description: 'İlk 4 ses grubu (23 harf) ile zenginleştirilmiş 1. sınıf kelimeleri.',
      language: 'tr',
      recommended: {
        rows: 11, cols: 11, directionPreset: 'normal', fillMode: 'meb_group',
        mebGroup: 'meb4', wordBankMode: 'list', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'GÜNEŞ', emoji: '☀️', clue: 'Dünyamızı ısıtan ve aydınlatan yıldız' },
        { word: 'ÇİÇEK', emoji: '🌸', clue: 'Renkli yapraklı, güzel kokulu bitki' },
        { word: 'BALIK', emoji: '🐟', clue: 'Suda yüzgeçleriyle yüzen canlı' },
        { word: 'BAYRAK', emoji: '🇹🇷', clue: 'Ay yıldızlı, bağımsızlık sembolümüz' },
        { word: 'ÇOCUK', emoji: '🧒', clue: 'Okula giden, oyun oynayan küçük birey' },
        { word: 'ÇİLEK', emoji: '🍓', clue: 'Kırmızı, noktalı, mis kokulu meyve' },
        { word: 'BİSİKLET', emoji: '🚲', clue: 'İki tekerlekli, pedallı araç' },
        { word: 'ÇANTA', emoji: '🎒', clue: 'Defter ve kalemlerimizi taşırız' },
        { word: 'SİLGİ', emoji: '🧽', clue: 'Yanlış yazdığımızı temizler' },
        { word: 'GEZEGEN', emoji: '🪐', clue: 'Güneş etrafında dönen gök cismi' }
      ]
    },
    {
      id: 'meb-5-phvgfj',
      category: '1. Sınıf · MEB Ses Grupları',
      title: '5. Grup: PHVĞFJ (Tüm Harfler)',
      badge: '1. Sınıf',
      description: 'Son ses grubu ile tüm 29 harfi kapsayan 1. sınıf okuma bayramı kelimeleri.',
      language: 'tr',
      recommended: {
        rows: 11, cols: 11, directionPreset: 'normal', fillMode: 'tr_freq',
        mebGroup: 'meb5', wordBankMode: 'list', shape: 'rect', secretMessage: 'OKUMAYA GEÇTİM'
      },
      entries: [
        { word: 'KİTAP', emoji: '📖', clue: 'Sayfalarını çevirip okuduğumuz bilgi hazinesi' },
        { word: 'DEFTER', emoji: '📓', clue: 'Ders notlarımızı yazdığımız sayfa grubu' },
        { word: 'AĞAÇ', emoji: '🌳', clue: 'Kökü, gövdesi ve dalları olan büyük bitki' },
        { word: 'PAPATYA', emoji: '🌼', clue: 'Beyaz yapraklı, sarı ortalı kır çiçeği' },
        { word: 'YAĞMUR', emoji: '🌧️', clue: 'Bulutlardan damla damla yağan su' },
        { word: 'PENGUEN', emoji: '🐧', clue: 'Kutuplarda yaşayan, yüzebilen kuş' },
        { word: 'HARİTA', emoji: '🗺️', clue: 'Ülkeleri ve şehirleri gösteren çizim' },
        { word: 'PENCERE', emoji: '🪟', clue: 'Odamıza ışık ve temiz hava alır' },
        { word: 'FİL', emoji: '🐘', clue: 'Uzun hortumlu, kocaman kulaklı hayvan' },
        { word: 'VAZO', emoji: '🏺', clue: 'İçine çiçek koyduğumuz kap' }
      ]
    },

    // ==================== TEMATİK & GÖRSELLİ PAKETLER ====================
    {
      id: 'okul-sinif',
      category: 'Tematik · İlkokul',
      title: 'Okul ve Sınıfımız',
      badge: 'Görselli',
      description: 'Sınıf eşyaları ve okul hayatı kelimeleri (Emojili ve ipuçlu).',
      language: 'tr',
      recommended: {
        rows: 10, cols: 10, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'list', shape: 'rect', secretMessage: 'OKULUMU SEVİYORUM'
      },
      entries: [
        { word: 'KALEM', emoji: '✏️', clue: 'Yazı yazarken kullandığımız araç' },
        { word: 'KİTAP', emoji: '📖', clue: 'Hikâyeler ve bilgiler okuruz' },
        { word: 'DEFTER', emoji: '📓', clue: 'Çizgili veya kareli yazı sayfaları' },
        { word: 'SİLGİ', emoji: '🧽', clue: 'Hatalı yazıyı iz bırakmadan siler' },
        { word: 'SINIF', emoji: '🪑', clue: 'Arkadaşlarımızla ders işlediğimiz oda' },
        { word: 'TAHTA', emoji: '🖍️', clue: 'Öğretmenimizin yazı yazdığı alan' },
        { word: 'ÇANTA', emoji: '🎒', clue: 'Sırtımızda eşyalarımızı taşır' },
        { word: 'CETVEL', emoji: '📏', clue: 'Düz çizgi çizmemize yarar' },
        { word: 'HECE', emoji: '🔤', clue: 'Ağzımızdan bir çırpıda çıkan ses grubu' },
        { word: 'OKUMA', emoji: '📚', clue: 'Yazıları anlama becerisi' }
      ]
    },
    {
      id: 'hayvanlar',
      category: 'Tematik · İlkokul',
      title: 'Hayvanlar Alemi',
      badge: 'Görselli',
      description: 'Sevimli hayvan dostlarımızla görselli veya ipuçlu kelime avı.',
      language: 'tr',
      recommended: {
        rows: 11, cols: 11, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'emoji', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'ASLAN', emoji: '🦁', clue: 'Ormanların yeleli kralı' },
        { word: 'ZÜRAFA', emoji: '🦒', clue: 'Çok uzun boyunlu, benekli hayvan' },
        { word: 'PENGUEN', emoji: '🐧', clue: 'Buzullarda yaşayan, uçamayan kuş' },
        { word: 'KELEBEK', emoji: '🦋', clue: 'Tırtıldan dönüşen renkli kanatlı böcek' },
        { word: 'TAVŞAN', emoji: '🐰', clue: 'Uzun kulaklı, havuç seven canlı' },
        { word: 'KAPLUMBAĞA', emoji: '🐢', clue: 'Evini sırtında taşıyan yavaş hayvan' },
        { word: 'YUNUS', emoji: '🐬', clue: 'Denizde yaşayan çok zeki memeli' },
        { word: 'BAYKUŞ', emoji: '🦉', clue: 'Gece uyanık olan kocaman gözlü kuş' },
        { word: 'SİNCAP', emoji: '🐿️', clue: 'Ağaçlarda yaşayan, fındık toplayan hayvan' },
        { word: 'FİL', emoji: '🐘', clue: 'Uzun hortumuyla su içen dev hayvan' }
      ]
    },
    {
      id: 'meyve-sebze',
      category: 'Tematik · İlkokul',
      title: 'Sağlıklı Meyve ve Sebzeler',
      badge: 'Şekilli · Elma',
      description: 'Elma şekilli ızgarada sağlıklı besinleri keşfet!',
      language: 'tr',
      recommended: {
        rows: 12, cols: 12, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'emoji', shape: 'apple', secretMessage: ''
      },
      entries: [
        { word: 'ELMA', emoji: '🍎', clue: 'Kırmızı veya yeşil, kütür kütür meyve' },
        { word: 'ÇİLEK', emoji: '🍓', clue: 'Baharın en sevilen kırmızı meyvesi' },
        { word: 'KARPUZ', emoji: '🍉', clue: 'Dışı yeşil, içi kırmızı yaz meyvesi' },
        { word: 'HAVUÇ', emoji: '🥕', clue: 'Gözlerimize iyi gelen turuncu sebze' },
        { word: 'PORTAKAL', emoji: '🍊', clue: 'C vitamini deposu turuncu meyve' },
        { word: 'ÜZÜM', emoji: '🍇', clue: 'Salkım halinde yetişir, kurutulabilir' },
        { word: 'DOMATES', emoji: '🍅', clue: 'Salataların ve kahvaltının kırmızı yıldızı' },
        { word: 'MUZ', emoji: '🍌', clue: 'Sarı kabuklu, soyularak yenilen meyve' },
        { word: 'KİRAZ', emoji: '🍒', clue: 'Çift saplı, parlak kırmızı yaz meyvesi' },
        { word: 'LİMON', emoji: '🍋', clue: 'Çorbalara sıkılan ekşi, sarı meyve' }
      ]
    },
    {
      id: 'meslekler',
      category: 'Tematik · İlkokul',
      title: 'Meslekleri Tanıyalım',
      badge: 'İpuçlu',
      description: 'Hayat Bilgisi dersi için tanımlardan meslek bulma etkinliği.',
      language: 'tr',
      recommended: {
        rows: 12, cols: 12, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'clues', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'ÖĞRETMEN', emoji: '👩‍🏫', clue: 'Okulda bize yeni bilgiler öğreten kişi' },
        { word: 'DOKTOR', emoji: '🩺', clue: 'Hastaları muayene edip iyileştiren kişi' },
        { word: 'İTFAİYECİ', emoji: '🚒', clue: 'Yangınları söndüren cesur kahraman' },
        { word: 'PİLOT', emoji: '✈️', clue: 'Uçakları gökyüzünde güvenle kullanan kişi' },
        { word: 'AŞÇI', emoji: '👨‍🍳', clue: 'Mutfağımızda lezzetli yemekler pişiren kişi' },
        { word: 'ÇİFTÇİ', emoji: '🌾', clue: 'Toprağı ekip sebze ve tahıl yetiştiren kişi' },
        { word: 'MİMAR', emoji: '📐', clue: 'Binaların plan ve tasarımını çizen kişi' },
        { word: 'VETERİNER', emoji: '🐾', clue: 'Hasta hayvanları tedavi eden doktor' },
        { word: 'ASTRONOT', emoji: '👩‍🚀', clue: 'Uzayda görev yapan bilim insanı' },
        { word: 'RESSAM', emoji: '🎨', clue: 'Fırça ve boyalarla tablolar yapan sanatçı' }
      ]
    },

    // ==================== DERS & KAZANIM PAKETLERİ ====================
    {
      id: 'zit-anlamlilar',
      category: 'Türkçe · Dil Bilgisi',
      title: 'Zıt Anlamlılar Yarışması',
      badge: 'Soru-Cevap',
      description: 'İpuçlarındaki kelimenin ZIT anlamlısını bul ve ızgarada işaretle!',
      language: 'tr',
      recommended: {
        rows: 11, cols: 11, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'clues', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'SOĞUK', clue: 'Sıcağın zıt anlamlısı' },
        { word: 'GECE', clue: 'Gündüzün zıt anlamlısı' },
        { word: 'SİYAH', clue: 'Beyazın zıt anlamlısı' },
        { word: 'UZUN', clue: 'Kısanın zıt anlamlısı' },
        { word: 'HIZLI', clue: 'Yavaşın zıt anlamlısı' },
        { word: 'BÜYÜK', clue: 'Küçüğün zıt anlamlısı' },
        { word: 'TEMİZ', clue: 'Kirlinin zıt anlamlısı' },
        { word: 'KOLAY', clue: 'Zorun zıt anlamlısı' },
        { word: 'NEŞELİ', clue: 'Üzgünün zıt anlamlısı' },
        { word: 'YENİ', clue: 'Eskinin zıt anlamlısı' },
        { word: 'AĞIR', clue: 'Hafifin zıt anlamlısı' },
        { word: 'TATLI', clue: 'Acının zıt anlamlısı' }
      ]
    },
    {
      id: 'es-anlamlilar',
      category: 'Türkçe · Dil Bilgisi',
      title: 'Eş Anlamlılar Avı',
      badge: 'Soru-Cevap',
      description: 'Verilen kelimenin EŞ anlamlısını (anlamdaşını) bulmacada yakala!',
      language: 'tr',
      recommended: {
        rows: 12, cols: 12, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'clues', shape: 'rect', secretMessage: ''
      },
      entries: [
        { word: 'YURT', clue: 'Vatan kelimesinin eş anlamlısı' },
        { word: 'HEKİM', clue: 'Doktor kelimesinin eş anlamlısı' },
        { word: 'TALEBE', clue: 'Öğrenci kelimesinin eş anlamlısı' },
        { word: 'MEKTUP', clue: 'Name kelimesinin eş anlamlısı' },
        { word: 'KONUK', clue: 'Misafir kelimesinin eş anlamlısı' },
        { word: 'ARMAĞAN', clue: 'Hediye kelimesinin eş anlamlısı' },
        { word: 'ÖYKÜ', clue: 'Hikâye kelimesinin eş anlamlısı' },
        { word: 'SÖZCÜK', clue: 'Kelime sözcüğünün eş anlamlısı' },
        { word: 'GÜZ', clue: 'Sonbahar kelimesinin eş anlamlısı' },
        { word: 'AL', clue: 'Kırmızı kelimesinin eş anlamlısı' },
        { word: 'YIL', clue: 'Sene kelimesinin eş anlamlısı' },
        { word: 'OKUL', clue: 'Mektep kelimesinin eş anlamlısı' }
      ]
    },
    {
      id: 'uzay-fen',
      category: 'Fen Bilimleri · 3.-4. Sınıf',
      title: 'Uzay ve Gezegenler',
      badge: 'Şekilli · Roket',
      description: 'Güneş Sistemi ve uzay kavramlarıyla yıldızlı kelime avı.',
      language: 'tr',
      recommended: {
        rows: 14, cols: 14, directionPreset: 'hard', fillMode: 'tr_freq',
        wordBankMode: 'list', shape: 'rocket', secretMessage: ''
      },
      entries: [
        { word: 'GÜNEŞ', emoji: '☀️', clue: 'Sistemimizin merkezindeki ısı ve ışık kaynağı' },
        { word: 'DÜNYA', emoji: '🌍', clue: 'Yaşam olan mavi gezegenimiz' },
        { word: 'MARS', emoji: '🔴', clue: 'Kızıl Gezegen olarak bilinir' },
        { word: 'SATÜRN', emoji: '🪐', clue: 'Büyük halkalarıyla ünlü gezegen' },
        { word: 'JÜPİTER', emoji: '🟠', clue: 'Güneş Sisteminin en büyük gezegeni' },
        { word: 'MERKÜR', emoji: '⚪', clue: 'Güneşe en yakın gezegen' },
        { word: 'VENÜS', emoji: '🟡', clue: 'Gökyüzünün en parlak gezegeni' },
        { word: 'YILDIZ', emoji: '⭐', clue: 'Kendi ışığını yayan gök cismi' },
        { word: 'ROKET', emoji: '🚀', clue: 'Uzaya fırlatılan araç' },
        { word: 'UYDU', emoji: '🛰️', clue: 'Gezegen çevresinde dolanan cisim' },
        { word: 'TELESKOP', emoji: '🔭', clue: 'Uzak gök cisimlerini gözlemleme aracı' }
      ]
    },
    {
      id: 'ataturk-cumhuriyet',
      category: 'Sosyal & Hayat Bilgisi',
      title: 'Atatürk ve Cumhuriyet',
      badge: 'Özel Gün',
      description: '29 Ekim, 23 Nisan, 19 Mayıs ve 10 Kasım etkinlikleri için anlamlı kelimeler.',
      language: 'tr',
      recommended: {
        rows: 13, cols: 13, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'list', shape: 'heart', secretMessage: ''
      },
      entries: [
        { word: 'ATATÜRK', emoji: '🇹🇷', clue: 'Cumhuriyetimizin kurucusu büyük önder' },
        { word: 'CUMHURİYET', emoji: '🏛️', clue: '29 Ekim 1923 tarihinde ilan edilen yönetim' },
        { word: 'BAYRAK', emoji: '🇹🇷', clue: 'Ay yıldızlı bağımsızlık simgemiz' },
        { word: 'ÖZGÜRLÜK', emoji: '🕊️', clue: 'Hür ve bağımsız yaşama hakkı' },
        { word: 'ANKARA', emoji: '⭐', clue: 'Türkiye Cumhuriyetinin başkenti' },
        { word: 'EGEMENLİK', emoji: '⚖️', clue: 'Milletin kendi kendini yönetmesi' },
        { word: 'VATAN', emoji: '🗺️', clue: 'Üzerinde yaşadığımız kutsal topraklar' },
        { word: 'BARIŞ', emoji: '🕊️', clue: 'Yurtta sulh, cihanda sulh ilkesi' },
        { word: 'BİLİM', emoji: '🔬', clue: 'Hayatta en hakiki mürşit' },
        { word: 'GENÇLİK', emoji: '🌟', clue: '19 Mayıs bayramının armağan edildiği nesil' }
      ]
    },
    {
      id: 'matematik',
      category: 'Matematik · 2.-4. Sınıf',
      title: 'Matematik ve Geometri',
      badge: 'İpuçlu',
      description: 'Temel matematik ve geometri kavramlarını eğlenceli biçimde pekiştir.',
      language: 'tr',
      recommended: {
        rows: 12, cols: 12, directionPreset: 'normal', fillMode: 'tr_freq',
        wordBankMode: 'clues', shape: 'diamond', secretMessage: ''
      },
      entries: [
        { word: 'ÜÇGEN', clue: 'Üç kenarı ve üç köşesi olan şekil' },
        { word: 'KARE', clue: 'Dört kenarı birbirine eşit dörtgen' },
        { word: 'ÇEMBER', clue: 'Köşesi ve kenarı olmayan yuvarlak çizgi' },
        { word: 'TOPLAMA', clue: 'Sayıları bir araya getirip artırma işlemi' },
        { word: 'ÇIKARMA', clue: 'İki sayı arasındaki farkı bulma işlemi' },
        { word: 'KESİR', clue: 'Bir bütünün eş parçalarını gösterir' },
        { word: 'SİMETRİ', clue: 'Ayna görüntüsü gibi iki eş yarı olma durumu' },
        { word: 'ÇEVRE', clue: 'Bir şeklin tüm kenar uzunluklarının toplamı' },
        { word: 'AÇI', clue: 'İki ışının birleştiği köşedeki açıklık' },
        { word: 'SAYI', clue: 'Çoklukları belirtmek için kullandığımız değer' }
      ]
    },
    {
      id: 'ingilizce-temel',
      category: 'İngilizce · 2.-4. Sınıf',
      title: 'English Classroom & Animals',
      badge: 'English',
      description: 'İngilizce temel kelimeler (Türkçe ipucu ile İngilizce kelimeyi bulma!).',
      language: 'en',
      recommended: {
        rows: 11, cols: 11, directionPreset: 'normal', fillMode: 'en_freq',
        wordBankMode: 'clues', shape: 'rect', secretMessage: 'WELL DONE'
      },
      entries: [
        { word: 'APPLE', emoji: '🍎', clue: 'Elma' },
        { word: 'BOOK', emoji: '📖', clue: 'Kitap' },
        { word: 'SCHOOL', emoji: '🏫', clue: 'Okul' },
        { word: 'PENCIL', emoji: '✏️', clue: 'Kurşun kalem' },
        { word: 'TEACHER', emoji: '👩‍🏫', clue: 'Öğretmen' },
        { word: 'TIGER', emoji: '🐯', clue: 'Kaplan' },
        { word: 'FLOWER', emoji: '🌸', clue: 'Çiçek' },
        { word: 'HOUSE', emoji: '🏠', clue: 'Ev' },
        { word: 'WATER', emoji: '💧', clue: 'Su' },
        { word: 'YELLOW', emoji: '🟡', clue: 'Sarı renk' }
      ]
    }
  ];

  function lookupEmoji(word) {
    if (!word) return '';
    const key = String(word).trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, '');
    return EMOJI_DICTIONARY[key] || '';
  }

  return {
    MEB_SOUND_GROUPS,
    EMOJI_DICTIONARY,
    PACKS,
    lookupEmoji
  };
}));
