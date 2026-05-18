(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    undoBtn: $('#undoBtn'),
    redoBtn: $('#redoBtn'),
    zoomOutBtn: $('#zoomOutBtn'),
    zoomInBtn: $('#zoomInBtn'),
    zoomLabel: $('#zoomLabel'),
    fitBtn: $('#fitBtn'),
    blankBtn: $('#blankBtn'),
    printBtn: $('#printBtn'),
    pngBtn: $('#pngBtn'),
    pdfBtn: $('#pdfBtn'),
    addTextBtn: $('#addTextBtn'),
    imageInput: $('#imageInput'),
    addBadgeBtn: $('#addBadgeBtn'),
    addLineBtn: $('#addLineBtn'),
    templateTabs: $('#templateTabs'),
    templateList: $('#templateList'),
    quoteList: $('#quoteList'),
    shapeGrid: $('#shapeGrid'),
    iconGrid: $('#iconGrid'),
    customTemplateInput: $('#customTemplateInput'),
    canvasInfo: $('#canvasInfo'),
    canvasScroll: $('#canvasScroll'),
    canvasZoom: $('#canvasZoom'),
    canvas: $('#documentCanvas'),
    landscapeBtn: $('#landscapeBtn'),
    portraitBtn: $('#portraitBtn'),
    pageBg: $('#pageBg'),
    pageBorder: $('#pageBorder'),
    pageBorderStyle: $('#pageBorderStyle'),
    emptyInspector: $('#emptyInspector'),
    inspector: $('#inspector'),
    textValueWrap: $('#textValueWrap'),
    textValue: $('#textValue'),
    posX: $('#posX'),
    posY: $('#posY'),
    itemW: $('#itemW'),
    itemH: $('#itemH'),
    rotateRange: $('#rotateRange'),
    rotateOut: $('#rotateOut'),
    opacityRange: $('#opacityRange'),
    opacityOut: $('#opacityOut'),
    textControls: $('#textControls'),
    fontFamily: $('#fontFamily'),
    fontSize: $('#fontSize'),
    fontSizeOut: $('#fontSizeOut'),
    itemColor: $('#itemColor'),
    itemBg: $('#itemBg'),
    bringForwardBtn: $('#bringForwardBtn'),
    sendBackwardBtn: $('#sendBackwardBtn'),
    duplicateBtn: $('#duplicateBtn'),
    deleteBtn: $('#deleteBtn'),
    layersList: $('#layersList')
  };

  const PAGE = {
    landscape: { label: 'A4 Yatay', width: 1123, height: 794 },
    portrait: { label: 'A4 Dikey', width: 794, height: 1123 }
  };

  const state = {
    selected: null,
    activeCategory: 'student',
    zoom: 0.72,
    history: [],
    historyIndex: -1,
    applyingHistory: false,
    drag: null,
    pinch: null
  };

  const colors = {
    purple: '#6C3DED',
    darkPurple: '#1A1040',
    teal: '#00A891',
    coral: '#FF6052',
    yellow: '#FFD93D',
    blue: '#2563EB',
    gold: '#D4AF37',
    green: '#22C55E',
    pink: '#EC4899',
    cream: '#FFFAF2',
    paper: '#FFFFFF'
  };

  const shapeLibrary = [
    { key: 'rect', label: 'Kutu', color: '#E0F2FE' },
    { key: 'circle', label: 'Daire', color: '#DCFCE7' },
    { key: 'star', label: 'Yıldız', color: '#FDE68A' },
    { key: 'heart', label: 'Kalp', color: '#FBCFE8' },
    { key: 'ribbon', label: 'Kurdele', color: '#C7D2FE' },
    { key: 'hexagon', label: 'Altıgen', color: '#DDD6FE' },
    { key: 'shield', label: 'Kalkan', color: '#BAE6FD' },
    { key: 'arrow', label: 'Ok', color: '#FED7AA' },
    { key: 'seal', label: 'Mühür', color: '#FACC15' },
    { key: 'badge', label: 'Rozet', color: '#6C3DED' },
    { key: 'medal', label: 'Madalya', color: '#FDBA74' },
    { key: 'laurel', label: 'Defne', color: '#86EFAC' },
    { key: 'cloud', label: 'Bulut', color: '#BFDBFE' },
    { key: 'speech', label: 'Konuşma', color: '#F5D0FE' },
    { key: 'bookmark', label: 'Ayraç', color: '#FCA5A5' },
    { key: 'wave', label: 'Dalga', color: '#93C5FD' },
    { key: 'spark', label: 'Parıltı', color: '#FDE68A' },
    { key: 'ticket', label: 'Etiket', color: '#DDD6FE' },
    { key: 'pencil', label: 'Kalem', color: '#FBBF24' },
    { key: 'book', label: 'Kitap', color: '#60A5FA' }
  ];

  const iconLibrary = [
    { kind: 'medal', label: 'Madalya', color: '#F59E0B' },
    { kind: 'seal', label: 'Başarı Mührü', color: '#6C3DED' },
    { kind: 'badge', label: 'Rozet', color: '#EC4899' },
    { kind: 'star', label: 'Yıldız', color: '#FACC15' },
    { kind: 'spark', label: 'Parıltı', color: '#FDE047' },
    { kind: 'book', label: 'Kitap', color: '#3B82F6' },
    { kind: 'pencil', label: 'Kalem', color: '#F97316' },
    { kind: 'bookmark', label: 'Kitap Ayracı', color: '#EF4444' },
    { kind: 'heart', label: 'Kalp', color: '#F472B6' },
    { kind: 'laurel', label: 'Defne', color: '#22C55E' },
    { kind: 'shield', label: 'Kalkan', color: '#38BDF8' },
    { kind: 'ticket', label: 'Etiket', color: '#A78BFA' },
    { kind: 'speech', label: 'Konuşma Balonu', color: '#C084FC' },
    { kind: 'cloud', label: 'Bulut', color: '#93C5FD' },
    { kind: 'wave', label: 'Dalga', color: '#60A5FA' },
    { kind: 'circle', label: 'Nokta', color: '#34D399' },
    { kind: 'hexagon', label: 'Altıgen', color: '#818CF8' },
    { kind: 'arrow', label: 'Ok', color: '#FDBA74' }
  ];

  const quoteIdeas = [
    'Bu belge, göstermiş olduğu üstün gayret, düzenli çalışma ve öğrenme isteği nedeniyle Öğrenci Adı Soyadı adına düzenlenmiştir.',
    'Okuma sürecinde gösterdiği gelişim, kitaplara duyduğu ilgi ve sınıfımıza kattığı güzel paylaşımlar için Öğrenci Adı Soyadı tebrik edilir.',
    'Öğrenci Adı Soyadı; sorumluluk bilinci, nezaketi ve arkadaşlarına örnek olan davranışları nedeniyle bu belgeyi almaya hak kazanmıştır.',
    'Ders içi etkinliklere aktif katılımı, merakı ve üretken fikirleri için Öğrenci Adı Soyadı içtenlikle kutlanır.',
    'Bu sertifika, Öğrenci Adı Soyadı’nın emek, sabır ve kararlılıkla tamamladığı başarılı çalışmaların anısı olarak verilmiştir.',
    'Başarı bir varış noktası değil; emek, tekrar ve cesaretle güzelleşen bir yolculuktur.',
    'Bugünün küçük adımları, yarının büyük başarılarına dönüşür.',
    'Öğrenmeye sevgiyle yaklaşan her çocuk, kendi ışığını büyütür.',
    'Çabanı görüyor, gelişimini alkışlıyor ve yeni başarılarını heyecanla bekliyoruz.',
    'Hayal et, dene, öğren ve yeniden dene; başarı cesur adımların ardından gelir.',
    'Bu belge, etkinliğimize katılımı ve gösterdiği güzel iş birliği için teşekkür amacıyla düzenlenmiştir.',
    'Öğrenci Adı Soyadı; sınıfımıza kattığı neşe, yardımseverlik ve çalışma azmiyle takdiri hak etmiştir.'
  ];

  const templates = {
    student: [
      {
        title: 'Okuma Bayramı Sertifikası',
        desc: 'Okuma sürecini kutlayan sıcak belge',
        bg: '#FFFAF2',
        border: '#D4AF37',
        orientation: 'landscape',
        items: [
          text('OKUMA BAYRAMI SERTİFİKASI', 150, 96, 820, 70, 50, colors.purple, 'Fredoka', 'center', 900),
          text('Bu belge', 474, 190, 175, 36, 28, colors.slate || '#64748B', 'Caveat', 'center', 700),
          text('Öğrenci Adı Soyadı', 238, 235, 650, 80, 64, colors.darkPurple, 'Great Vibes', 'center', 400),
          text('okuma serüvenindeki emeği, isteği ve güzel gelişimi için verilmiştir.', 230, 335, 660, 68, 25, '#475569', 'Nunito', 'center', 800),
          shape('star', 94, 102, 74, 74, '#FFD93D', 'Yıldız'),
          shape('ribbon', 905, 102, 120, 88, '#6C3DED', 'Kurdele'),
          icon('📚', 492, 430, 108, 98, 68, '#6C3DED', 'Kitap ikonu'),
          line(250, 620, 220, 3, '#1A1040', 'Öğretmen imza çizgisi'),
          line(650, 620, 220, 3, '#1A1040', 'Veli imza çizgisi'),
          text('Öğretmen', 285, 635, 150, 30, 18, '#64748B', 'Nunito', 'center', 800),
          text('Tarih', 685, 635, 150, 30, 18, '#64748B', 'Nunito', 'center', 800)
        ]
      },
      {
        title: 'Haftanın Yıldızı',
        desc: 'Davranış ve emek ödülü',
        bg: '#F0FDFA',
        border: '#00A891',
        orientation: 'landscape',
        items: [
          shape('circle', 92, 96, 160, 160, '#CCFBF1', 'Yumuşak daire'),
          shape('star', 128, 125, 92, 92, '#FFD93D', 'Büyük yıldız'),
          text('HAFTANIN YILDIZI', 300, 120, 560, 58, 46, '#0F766E', 'Fredoka', 'center', 900),
          text('Öğrenci Adı Soyadı', 260, 230, 600, 70, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('çalışkanlığı, arkadaşlarına desteği ve sınıfa kattığı güzel enerji için haftanın yıldızı seçilmiştir.', 250, 332, 630, 82, 25, '#334155', 'Nunito', 'center', 800),
          icon('⭐', 488, 446, 110, 100, 74, '#F59E0B', 'Yıldız ikonu'),
          line(450, 625, 230, 3, '#0F766E', 'İmza çizgisi'),
          text('Öğretmen İmzası', 475, 640, 180, 28, 18, '#64748B', 'Nunito', 'center', 800)
        ]
      },
      {
        title: 'Kitap Kurdu Rozeti',
        desc: 'Kitap okuma motivasyonu',
        bg: '#F8FAFC',
        border: '#2563EB',
        orientation: 'landscape',
        items: [
          shape('hexagon', 448, 70, 220, 210, '#DBEAFE', 'Merkez rozet'),
          icon('📚', 500, 115, 112, 96, 72, '#2563EB', 'Kitap ikonu'),
          text('KİTAP KURDU', 260, 285, 600, 62, 50, '#1D4ED8', 'Fredoka', 'center', 900),
          text('Öğrenci Adı Soyadı', 254, 365, 610, 72, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('okuduğu kitaplar, paylaştığı düşünceler ve okuma sevgisiyle sınıfımızda fark yaratmıştır.', 255, 470, 610, 72, 24, '#475569', 'Nunito', 'center', 800),
          shape('star', 160, 135, 72, 72, '#FDE68A', 'Sol yıldız'),
          shape('star', 890, 135, 72, 72, '#FDE68A', 'Sağ yıldız')
        ]
      },
      {
        title: 'Nezaket ve Saygı',
        desc: 'Sosyal beceri ve iyi davranış belgesi',
        bg: '#FFF7ED',
        border: '#FB923C',
        orientation: 'landscape',
        items: [
          icon('🌿', 132, 115, 120, 100, 70, '#16A34A', 'Yaprak ikonu'),
          text('NEZAKET VE SAYGI BELGESİ', 265, 118, 620, 62, 42, '#C2410C', 'Merriweather', 'center', 900),
          text('Öğrenci Adı Soyadı', 260, 240, 610, 72, 56, '#1A1040', 'Great Vibes', 'center', 400),
          text('arkadaşlarına gösterdiği saygı, yardımseverliği ve örnek davranışları için bu belgeyi almaya hak kazanmıştır.', 250, 345, 640, 95, 25, '#475569', 'Nunito', 'center', 800),
          shape('heart', 500, 470, 96, 86, '#FB7185', 'Kalp'),
          line(450, 625, 230, 3, '#C2410C', 'İmza çizgisi')
        ]
      },
      {
        title: 'Matematik Kaşifi',
        desc: 'Problem çözme başarısı',
        bg: '#F5F3FF',
        border: '#7C3AED',
        orientation: 'landscape',
        items: [
          text('MATEMATİK KAŞİFİ', 250, 105, 620, 66, 48, '#5B21B6', 'Fredoka', 'center', 900),
          icon('🧮', 130, 120, 105, 95, 66, '#7C3AED', 'Abaküs'),
          icon('💡', 880, 120, 105, 95, 66, '#F59E0B', 'Fikir'),
          text('Öğrenci Adı Soyadı', 250, 238, 620, 72, 56, '#1A1040', 'Great Vibes', 'center', 400),
          text('sayılar, işlemler ve problem çözme etkinliklerindeki gayreti için tebrik edilir.', 245, 342, 630, 78, 25, '#475569', 'Nunito', 'center', 800),
          shape('rect', 330, 472, 460, 72, '#EDE9FE', 'Not kutusu'),
          text('Harika düşün, cesurca dene, keyifle öğren!', 350, 489, 420, 40, 26, '#5B21B6', 'Caveat', 'center', 700)
        ]
      },
      {
        title: 'Küçük Ressam',
        desc: 'Sanat ve yaratıcılık belgesi',
        bg: '#FFF1F2',
        border: '#EC4899',
        orientation: 'landscape',
        items: [
          text('KÜÇÜK RESSAM BELGESİ', 230, 110, 660, 64, 46, '#BE185D', 'Fredoka', 'center', 900),
          icon('🎨', 125, 120, 110, 100, 70, '#EC4899', 'Palet'),
          shape('circle', 895, 112, 90, 90, '#FDE68A', 'Sarı boya'),
          shape('circle', 960, 170, 72, 72, '#BAE6FD', 'Mavi boya'),
          text('Öğrenci Adı Soyadı', 260, 240, 600, 76, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('hayal gücü, renklerle kurduğu güzel dünya ve üretme heyecanı için kutlanır.', 252, 350, 620, 78, 25, '#475569', 'Nunito', 'center', 800),
          line(430, 622, 260, 4, '#BE185D', 'İmza çizgisi')
        ]
      }
    ],
    event: [
      {
        title: '23 Nisan Katılım',
        desc: 'Ulusal bayram etkinliği için',
        bg: '#FFF7F7',
        border: '#E11D48',
        orientation: 'landscape',
        items: [
          image('/gorseller/ataturk.png', 88, 84, 118, 150, 'Atatürk görseli'),
          text('23 NİSAN ETKİNLİK KATILIM BELGESİ', 238, 108, 720, 66, 42, '#BE123C', 'Montserrat', 'center', 900),
          text('Öğrenci Adı Soyadı', 270, 245, 590, 72, 56, '#1A1040', 'Great Vibes', 'center', 400),
          text('sınıfımızın 23 Nisan etkinliğine coşkusu ve emeğiyle katıldığı için teşekkür ederiz.', 252, 350, 630, 82, 25, '#475569', 'Nunito', 'center', 800),
          icon('🇹🇷', 496, 455, 105, 86, 60, '#BE123C', 'Bayrak'),
          line(430, 630, 260, 3, '#BE123C', 'İmza çizgisi')
        ]
      },
      {
        title: 'Bilim Şenliği',
        desc: 'Deney ve proje katılım belgesi',
        bg: '#EFF6FF',
        border: '#2563EB',
        orientation: 'landscape',
        items: [
          text('BİLİM ŞENLİĞİ KATILIM BELGESİ', 240, 105, 640, 65, 42, '#1D4ED8', 'Montserrat', 'center', 900),
          icon('🔬', 140, 120, 115, 100, 72, '#2563EB', 'Mikroskop'),
          icon('🚀', 875, 122, 115, 100, 72, '#7C3AED', 'Roket'),
          text('Öğrenci Adı Soyadı', 260, 240, 600, 72, 56, '#1A1040', 'Great Vibes', 'center', 400),
          text('merakı, araştırma isteği ve projesine kattığı emek için bu belge ile kutlanır.', 252, 350, 620, 78, 25, '#475569', 'Nunito', 'center', 800),
          shape('ribbon', 464, 465, 180, 116, '#2563EB', 'Bilim rozeti')
        ]
      },
      {
        title: 'Spor Şenliği',
        desc: 'Takım ruhu ve katılım',
        bg: '#F0FDF4',
        border: '#22C55E',
        orientation: 'landscape',
        items: [
          text('SPOR ŞENLİĞİ KATILIM BELGESİ', 240, 102, 650, 65, 44, '#15803D', 'Fredoka', 'center', 900),
          icon('⚽', 138, 130, 105, 92, 66, '#16A34A', 'Top'),
          text('Öğrenci Adı Soyadı', 260, 232, 600, 76, 56, '#1A1040', 'Great Vibes', 'center', 400),
          text('takım ruhu, centilmenliği ve etkinlikteki güzel katılımı için tebrik edilir.', 255, 344, 610, 78, 25, '#475569', 'Nunito', 'center', 800),
          shape('star', 504, 464, 92, 92, '#FACC15', 'Başarı yıldızı'),
          line(430, 620, 260, 3, '#15803D', 'İmza çizgisi')
        ]
      },
      {
        title: 'Okuma Bayramı Gazetesi',
        desc: 'Portre, duyuru ve pano formatı',
        bg: '#FFFFFF',
        border: '#F59E0B',
        orientation: 'portrait',
        items: [
          text('OKUMA BAYRAMI GAZETESİ', 72, 72, 650, 64, 42, '#92400E', 'Merriweather', 'center', 900),
          line(80, 150, 630, 4, '#F59E0B', 'Üst ayraç'),
          text('Bugünün Manşeti', 86, 188, 265, 42, 28, '#1A1040', 'Fredoka', 'left', 900),
          text('Sınıfımız okuma serüveninde önemli bir eşiği daha neşeyle kutladı.', 86, 238, 275, 190, 24, '#475569', 'Nunito', 'left', 800),
          shape('rect', 408, 188, 280, 195, '#FEF3C7', 'Fotoğraf alanı'),
          icon('📸', 500, 240, 96, 90, 60, '#D97706', 'Fotoğraf ikonu'),
          text('Öğrencilerden Güzel Sözler', 86, 475, 610, 40, 28, '#92400E', 'Fredoka', 'left', 900),
          text('“Okumayı seviyorum çünkü her kitap yeni bir dünyaya açılıyor.”', 110, 535, 560, 86, 28, '#1A1040', 'Caveat', 'center', 700),
          line(86, 665, 610, 3, '#F59E0B', 'Alt ayraç'),
          text('Tarih: __ / __ / ____', 90, 700, 260, 35, 22, '#475569', 'Nunito', 'left', 800)
        ]
      },
      {
        title: 'Mezuniyet Hatırası',
        desc: 'Sene sonu anısı',
        bg: '#F8FAFC',
        border: '#64748B',
        orientation: 'landscape',
        items: [
          text('MEZUNİYET HATIRASI', 270, 104, 580, 64, 48, '#334155', 'Playfair Display', 'center', 800),
          icon('🎓', 492, 196, 120, 100, 72, '#1A1040', 'Kep'),
          text('Öğrenci Adı Soyadı', 245, 320, 630, 76, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('Bu güzel yılın anısı olarak sevgiyle saklanması dileğiyle...', 250, 430, 620, 64, 26, '#64748B', 'Caveat', 'center', 700),
          line(430, 625, 260, 3, '#334155', 'İmza çizgisi')
        ]
      },
      {
        title: 'Kulüp Katılım',
        desc: 'Kulüp ve atölye çalışmaları için',
        bg: '#FDF4FF',
        border: '#A855F7',
        orientation: 'landscape',
        items: [
          text('KULÜP KATILIM BELGESİ', 260, 110, 600, 60, 45, '#7E22CE', 'Fredoka', 'center', 900),
          icon('🎭', 145, 130, 110, 96, 68, '#A855F7', 'Kulüp ikonu'),
          text('Öğrenci Adı Soyadı', 260, 242, 600, 74, 56, '#1A1040', 'Great Vibes', 'center', 400),
          text('kulüp çalışmalarına düzenli katılımı, üretkenliği ve paylaşımcı tavrı için teşekkür ederiz.', 250, 350, 630, 86, 25, '#475569', 'Nunito', 'center', 800),
          shape('circle', 500, 470, 98, 98, '#E9D5FF', 'Kulüp rozeti')
        ]
      }
    ],
    formal: [
      {
        title: 'Üstün Başarı Belgesi',
        desc: 'Klasik ve ciddi sertifika',
        bg: '#FFFCF5',
        border: '#B7791F',
        orientation: 'landscape',
        items: [
          text('ÜSTÜN BAŞARI BELGESİ', 250, 104, 630, 66, 46, '#7C2D12', 'Cinzel', 'center', 800),
          text('Sayın', 520, 205, 90, 34, 26, '#64748B', 'Merriweather', 'center', 700),
          text('Öğrenci Adı Soyadı', 240, 252, 650, 72, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('göstermiş olduğu üstün başarı, örnek çalışma disiplini ve gayreti nedeniyle bu belgeye layık görülmüştür.', 235, 358, 650, 88, 24, '#475569', 'Merriweather', 'center', 700),
          shape('ribbon', 470, 474, 185, 122, '#B7791F', 'Resmi mühür'),
          line(235, 630, 230, 3, '#7C2D12', 'Okul müdürü imza'),
          line(665, 630, 230, 3, '#7C2D12', 'Öğretmen imza'),
          text('Okul Müdürü', 270, 646, 160, 28, 17, '#64748B', 'Nunito', 'center', 800),
          text('Öğretmen', 705, 646, 120, 28, 17, '#64748B', 'Nunito', 'center', 800)
        ]
      },
      {
        title: 'Teşekkür Belgesi',
        desc: 'Sade ve okul kullanımı için',
        bg: '#FFFFFF',
        border: '#4A1FD0',
        orientation: 'landscape',
        items: [
          image('/gorseller/logo.png', 78, 72, 92, 92, 'Okul logosu'),
          text('TEŞEKKÜR BELGESİ', 270, 108, 580, 64, 48, '#4A1FD0', 'Montserrat', 'center', 900),
          text('Öğrenci Adı Soyadı', 250, 246, 620, 74, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('eğitim sürecindeki katkıları, sorumluluk bilinci ve olumlu tutumu için teşekkür ederiz.', 255, 350, 615, 80, 24, '#475569', 'Nunito', 'center', 800),
          line(430, 625, 260, 3, '#4A1FD0', 'İmza çizgisi')
        ]
      },
      {
        title: 'Seminer Katılım',
        desc: 'Öğretmen, veli veya öğrenci semineri',
        bg: '#F8FAFC',
        border: '#0F766E',
        orientation: 'landscape',
        items: [
          text('KATILIM BELGESİ', 310, 112, 500, 60, 48, '#0F766E', 'Montserrat', 'center', 900),
          text('Ad Soyad', 260, 245, 600, 72, 56, '#1A1040', 'Great Vibes', 'center', 400),
          text('“Seminer / Atölye Adı” etkinliğine katılımından dolayı bu belge verilmiştir.', 250, 350, 630, 76, 24, '#475569', 'Merriweather', 'center', 700),
          text('Düzenleyen: Kemal Öğretmenim', 360, 500, 400, 36, 20, '#64748B', 'Nunito', 'center', 800),
          line(430, 625, 260, 3, '#0F766E', 'İmza çizgisi')
        ]
      },
      {
        title: 'Modern Minimal',
        desc: 'Temiz, hızlı düzenlenir belge',
        bg: '#F8FAFC',
        border: '#111827',
        orientation: 'landscape',
        items: [
          shape('rect', 0, 0, 1123, 112, '#111827', 'Üst bant'),
          text('SERTİFİKA', 82, 33, 300, 52, 40, '#FFFFFF', 'Montserrat', 'left', 900),
          text('Öğrenci Adı Soyadı', 118, 235, 740, 82, 64, '#111827', 'Playfair Display', 'left', 800),
          text('Bu belge, belirlenen çalışmayı başarıyla tamamladığını gösterir.', 122, 345, 620, 68, 25, '#475569', 'Nunito', 'left', 800),
          shape('circle', 860, 245, 152, 152, '#E0F2FE', 'Modern rozet'),
          icon('✓', 904, 283, 70, 68, 54, '#0369A1', 'Onay'),
          line(120, 625, 260, 3, '#111827', 'İmza çizgisi')
        ]
      },
      {
        title: 'Kurs Bitirme',
        desc: 'Program tamamlayanlar için',
        bg: '#F0FDFA',
        border: '#14B8A6',
        orientation: 'landscape',
        items: [
          text('KURS BİTİRME BELGESİ', 250, 112, 620, 62, 44, '#0F766E', 'Cinzel', 'center', 800),
          text('Ad Soyad', 260, 245, 600, 72, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('programı başarıyla tamamlamış ve bu belgeyi almaya hak kazanmıştır.', 260, 350, 600, 76, 24, '#475569', 'Nunito', 'center', 800),
          shape('shield', 490, 455, 128, 128, '#99F6E4', 'Tamamlama rozeti'),
          text('Tebrikler', 495, 495, 118, 35, 23, '#0F766E', 'Caveat', 'center', 700)
        ]
      },
      {
        title: 'Boş Tasarım',
        desc: 'Kendi düzenini sıfırdan kur',
        bg: '#FFFAF2',
        border: '#D4AF37',
        orientation: 'landscape',
        items: [
          text('Başlık Yazın', 250, 170, 620, 70, 54, '#1A1040', 'Fredoka', 'center', 900),
          text('Öğrenci Adı Soyadı', 260, 300, 600, 74, 58, '#1A1040', 'Great Vibes', 'center', 400),
          text('Açıklama metninizi buraya yazın.', 300, 420, 520, 54, 24, '#64748B', 'Nunito', 'center', 800)
        ]
      }
    ],
    custom: [
      {
        title: 'Okuma Temalı Renkli Çerçeve',
        desc: 'Gönderdiğin kitap temalı özel şablon',
        bg: '#FFFFFF',
        border: '#FFFFFF',
        borderStyle: 'none',
        orientation: 'landscape',
        thumbImage: '/gorseller/sablonlar/sertifika-okuma.jpg',
        backgroundImage: '/gorseller/sablonlar/sertifika-okuma.jpg',
        items: [
          text('OKUMA BAŞARI SERTİFİKASI', 260, 140, 650, 68, 46, '#0F172A', 'Fredoka', 'center', 900),
          text('Öğrenci Adı Soyadı', 295, 300, 560, 78, 60, '#111827', 'Great Vibes', 'center', 400),
          text('okuma sevgisi, gayreti ve kitaplarla kurduğu güzel yolculuk için tebrik edilir.', 320, 410, 520, 86, 24, '#334155', 'Nunito', 'center', 800)
        ]
      },
      {
        title: 'Rozetli Başarı Çerçevesi',
        desc: 'Gönderdiğin rozetli özel şablon',
        bg: '#FBF7F1',
        border: '#FFFFFF',
        borderStyle: 'none',
        orientation: 'landscape',
        thumbImage: '/gorseller/sablonlar/sertifika-rozet.jpg',
        backgroundImage: '/gorseller/sablonlar/sertifika-rozet.jpg',
        items: [
          text('BAŞARI SERTİFİKASI', 410, 165, 560, 68, 48, '#202A2A', 'Cinzel', 'center', 800),
          text('Öğrenci Adı Soyadı', 420, 315, 540, 78, 60, '#202A2A', 'Great Vibes', 'center', 400),
          text('göstermiş olduğu üstün gayret ve örnek çalışmalarından dolayı bu sertifika ile onurlandırılmıştır.', 430, 435, 520, 86, 24, '#374151', 'Merriweather', 'center', 700),
          line(575, 625, 250, 3, '#202A2A', 'İmza çizgisi')
        ]
      }
    ]
  };

  function text(value, x, y, w, h, fontSize, color, fontFamily, align, weight) {
    return {
      type: 'text',
      text: value,
      x,
      y,
      w,
      h,
      fontSize,
      color,
      fontFamily,
      align,
      weight,
      name: value.length > 24 ? `${value.slice(0, 24)}...` : value
    };
  }

  function shape(kind, x, y, w, h, color, name) {
    return { type: 'shape', kind, x, y, w, h, color, name };
  }

  function icon(value, x, y, w, h, fontSize, color, name) {
    return { type: 'icon', text: value, x, y, w, h, fontSize, color, name };
  }

  function image(src, x, y, w, h, name, options = {}) {
    return Object.assign({ type: 'image', src, x, y, w, h, name }, options);
  }

  function line(x, y, w, h, color, name) {
    return { type: 'line', x, y, w, h, color, name };
  }

  function init() {
    if (!els.canvas) return;
    renderTemplates();
    renderQuotes();
    renderAssets();
    bindEvents();
    applyTemplate(templates.student[0], { save: false });
    fitCanvas({ save: false });
    saveState();
  }

  function renderTemplates() {
    const list = templates[state.activeCategory] || [];
    els.templateList.innerHTML = '';
    list.forEach((template, index) => {
      const card = document.createElement('button');
      card.className = 'template-card';
      card.type = 'button';
      card.dataset.index = String(index);
      const thumbStyle = template.thumbImage
        ? `--thumb-bg:${template.bg};--thumb-border:${template.border};background-image:url('${template.thumbImage}')`
        : `--thumb-bg:${template.bg};--thumb-border:${template.border}`;
      card.innerHTML = `
        <span class="template-thumb${template.thumbImage ? ' has-image' : ''}" style="${thumbStyle}"></span>
        <span>
          <strong>${escapeHtml(template.title)}</strong>
          <span>${escapeHtml(template.desc)}</span>
        </span>
      `;
      els.templateList.appendChild(card);
    });
  }

  function renderQuotes() {
    els.quoteList.innerHTML = '';
    quoteIdeas.forEach((quote) => {
      const button = document.createElement('button');
      button.className = 'quote-btn';
      button.type = 'button';
      button.textContent = quote;
      button.addEventListener('click', () => {
        const item = createItem({
          type: 'text',
          text: quote,
          x: 250,
          y: 380,
          w: 620,
          h: 82,
          fontSize: 24,
          color: '#475569',
          fontFamily: 'Nunito',
          align: 'center',
          weight: 800,
          name: 'Hazır yazı'
        });
        selectItem(item);
        saveState();
      });
      els.quoteList.appendChild(button);
    });
  }

  function renderAssets() {
    els.shapeGrid.innerHTML = '';
    shapeLibrary.forEach((shapeItem) => {
      const button = document.createElement('button');
      button.className = 'asset-btn';
      button.type = 'button';
      button.title = shapeItem.label;
      button.dataset.shape = shapeItem.key;
      button.innerHTML = shapeSvg(shapeItem.key, shapeItem.color);
      els.shapeGrid.appendChild(button);
    });

    els.iconGrid.innerHTML = '';
    iconLibrary.forEach((item) => {
      const button = document.createElement('button');
      button.className = 'asset-btn';
      button.type = 'button';
      button.title = item.label;
      button.dataset.iconKind = item.kind;
      button.innerHTML = shapeSvg(item.kind, item.color);
      els.iconGrid.appendChild(button);
    });
  }

  function bindEvents() {
    bindCollapsiblePanels();

    els.templateTabs.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-category]');
      if (!tab) return;
      state.activeCategory = tab.dataset.category;
      $$('[data-category]', els.templateTabs).forEach((button) => button.classList.toggle('active', button === tab));
      renderTemplates();
    });

    els.templateList.addEventListener('click', (event) => {
      const card = event.target.closest('.template-card');
      if (!card) return;
      const template = templates[state.activeCategory][Number(card.dataset.index)];
      applyTemplate(template);
    });

    els.shapeGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-shape]');
      if (!button) return;
      const shapeInfo = shapeLibrary.find((item) => item.key === button.dataset.shape);
      const item = createItem(shape(button.dataset.shape, 420, 310, 160, 120, shapeInfo ? shapeInfo.color : '#DDD6FE', shapeInfo ? shapeInfo.label : 'Şekil'));
      selectItem(item);
      saveState();
    });

    els.iconGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-icon-kind]');
      if (!button) return;
      const iconInfo = iconLibrary.find((item) => item.kind === button.dataset.iconKind);
      const item = createItem(shape(button.dataset.iconKind, 490, 320, 110, 90, iconInfo ? iconInfo.color : '#6C3DED', iconInfo ? iconInfo.label : 'İkon'));
      selectItem(item);
      saveState();
    });

    els.addTextBtn.addEventListener('click', () => {
      const item = createItem(text('Yeni metin', 390, 320, 340, 58, 34, '#1A1040', 'Fredoka', 'center', 900));
      selectItem(item);
      startTextEdit(item);
      saveState();
    });

    els.addBadgeBtn.addEventListener('click', () => {
      const item = createItem(shape('seal', 480, 300, 150, 150, '#6C3DED', 'Rozet'));
      selectItem(item);
      saveState();
    });

    els.addLineBtn.addEventListener('click', () => {
      const item = createItem(line(430, 565, 260, 4, '#1A1040', 'Ayraç'));
      selectItem(item);
      saveState();
    });

    els.imageInput.addEventListener('change', handleImageInput);
    if (els.customTemplateInput) {
      els.customTemplateInput.addEventListener('change', handleCustomTemplateInput);
    }

    els.canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    els.canvas.addEventListener('dblclick', handleDoubleClick);
    els.canvas.addEventListener('focusout', handleFocusOut);
    els.canvasScroll.addEventListener('touchstart', handlePinchStart, { passive: false });
    els.canvasScroll.addEventListener('touchmove', handlePinchMove, { passive: false });
    els.canvasScroll.addEventListener('touchend', handlePinchEnd);
    els.canvasScroll.addEventListener('touchcancel', handlePinchEnd);

    els.landscapeBtn.addEventListener('click', () => {
      setOrientation('landscape');
      saveState();
    });
    els.portraitBtn.addEventListener('click', () => {
      setOrientation('portrait');
      saveState();
    });
    els.pageBg.addEventListener('input', () => {
      els.canvas.style.backgroundColor = els.pageBg.value;
    });
    els.pageBg.addEventListener('change', saveState);
    els.pageBorder.addEventListener('input', () => {
      els.canvas.style.borderColor = els.pageBorder.value;
    });
    els.pageBorder.addEventListener('change', saveState);
    els.pageBorderStyle.addEventListener('change', () => {
      els.canvas.style.borderStyle = els.pageBorderStyle.value;
      saveState();
    });

    bindInspector();
    bindTopTools();
    bindKeyboard();
  }

  function bindCollapsiblePanels() {
    $$('.studio-sidebar .panel-section').forEach((section) => {
      const head = $('.section-head', section);
      if (!head) return;
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-expanded', 'true');
      head.addEventListener('click', (event) => {
        if (event.target.closest('button, input, select, textarea, a, label')) return;
        togglePanel(section);
      });
      head.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        togglePanel(section);
      });
    });
  }

  function togglePanel(section) {
    const collapsed = section.classList.toggle('collapsed');
    const head = $('.section-head', section);
    if (head) head.setAttribute('aria-expanded', String(!collapsed));
  }

  function bindTopTools() {
    els.undoBtn.addEventListener('click', undo);
    els.redoBtn.addEventListener('click', redo);
    els.zoomOutBtn.addEventListener('click', () => setZoom(state.zoom - 0.08));
    els.zoomInBtn.addEventListener('click', () => setZoom(state.zoom + 0.08));
    els.fitBtn.addEventListener('click', () => fitCanvas());
    els.blankBtn.addEventListener('click', () => {
      applyTemplate(templates.formal[5]);
    });
    els.printBtn.addEventListener('click', () => exportCanvas('print'));
    els.pngBtn.addEventListener('click', () => exportCanvas('png'));
    els.pdfBtn.addEventListener('click', () => exportCanvas('pdf'));
  }

  function bindInspector() {
    [els.posX, els.posY, els.itemW, els.itemH].forEach((input) => {
      input.addEventListener('input', applyGeometryFromInspector);
      input.addEventListener('change', saveState);
    });

    els.rotateRange.addEventListener('input', () => {
      if (!state.selected) return;
      setAngle(state.selected, Number(els.rotateRange.value));
      updateInspector({ skipInputs: true });
    });
    els.rotateRange.addEventListener('change', saveState);

    els.opacityRange.addEventListener('input', () => {
      if (!state.selected) return;
      state.selected.style.opacity = els.opacityRange.value;
      els.opacityOut.textContent = `${Math.round(Number(els.opacityRange.value) * 100)}%`;
    });
    els.opacityRange.addEventListener('change', saveState);

    els.textValue.addEventListener('input', () => {
      if (!state.selected) return;
      const content = $('.item-content', state.selected);
      content.textContent = els.textValue.value;
      state.selected.dataset.name = getLayerName(state.selected);
      renderLayers();
    });
    els.textValue.addEventListener('change', saveState);

    els.fontFamily.addEventListener('change', () => {
      if (!state.selected) return;
      state.selected.style.fontFamily = wrapFont(els.fontFamily.value);
      saveState();
    });

    els.fontSize.addEventListener('input', () => {
      if (!state.selected) return;
      const size = Number(els.fontSize.value);
      state.selected.style.fontSize = `${size}px`;
      els.fontSizeOut.textContent = `${size}px`;
    });
    els.fontSize.addEventListener('change', saveState);

    els.itemColor.addEventListener('input', () => {
      if (!state.selected) return;
      state.selected.style.color = els.itemColor.value;
    });
    els.itemColor.addEventListener('change', saveState);

    els.itemBg.addEventListener('input', () => {
      if (!state.selected) return;
      state.selected.style.backgroundColor = els.itemBg.value;
    });
    els.itemBg.addEventListener('change', saveState);

    $$('[data-align]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!state.selected) return;
        const content = $('.item-content', state.selected);
        content.style.textAlign = button.dataset.align;
        updateAlignButtons(button.dataset.align);
        saveState();
      });
    });

    els.bringForwardBtn.addEventListener('click', () => {
      if (!state.selected) return;
      state.selected.style.zIndex = String(maxZ() + 1);
      renderLayers();
      saveState();
    });

    els.sendBackwardBtn.addEventListener('click', () => {
      if (!state.selected) return;
      state.selected.style.zIndex = '1';
      normalizeZ();
      renderLayers();
      saveState();
    });

    els.duplicateBtn.addEventListener('click', () => {
      duplicateSelected();
    });

    els.deleteBtn.addEventListener('click', () => {
      deleteSelected();
    });

    els.layersList.addEventListener('click', (event) => {
      const row = event.target.closest('.layer-row');
      if (!row) return;
      const item = $$('.studio-item', els.canvas).find((candidate) => candidate.dataset.id === row.dataset.id);
      if (!item) return;
      if (event.target.matches('[data-layer-action="up"]')) {
        item.style.zIndex = String(maxZ() + 1);
        normalizeZ();
        selectItem(item);
        saveState();
        return;
      }
      if (event.target.matches('[data-layer-action="down"]')) {
        item.style.zIndex = '1';
        normalizeZ();
        selectItem(item);
        saveState();
        return;
      }
      selectItem(item);
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (event) => {
      const active = document.activeElement;
      const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (isTyping) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && state.selected) {
        event.preventDefault();
        deleteSelected();
      }
      if (mod && event.key.toLowerCase() === 'd' && state.selected) {
        event.preventDefault();
        duplicateSelected();
      }
    });
  }

  function applyTemplate(template, options = {}) {
    clearSelection({ update: false });
    els.canvas.innerHTML = '';
    els.canvas.style.backgroundColor = template.bg || '#FFFAF2';
    els.canvas.style.borderColor = template.border || '#D4AF37';
    els.canvas.style.borderStyle = template.borderStyle || 'double';
    els.canvas.style.backgroundImage = template.backgroundImage ? `url("${template.backgroundImage}")` : '';
    els.canvas.style.backgroundSize = template.backgroundImage ? '100% 100%' : '';
    els.canvas.style.backgroundPosition = template.backgroundImage ? 'center center' : '';
    els.canvas.style.backgroundRepeat = template.backgroundImage ? 'no-repeat' : '';
    els.pageBg.value = rgbToHex(template.bg || '#FFFAF2');
    els.pageBorder.value = rgbToHex(template.border || '#D4AF37');
    els.pageBorderStyle.value = template.borderStyle || 'double';
    setOrientation(template.orientation || 'landscape', { updateOnly: true });
    template.items.forEach((item, index) => {
      createItem(Object.assign({}, item, { z: index + 5 }), { select: false });
    });
    normalizeZ();
    updateInspector();
    renderLayers();
    if (options.save !== false) saveState();
  }

  function setOrientation(mode, options = {}) {
    const page = PAGE[mode] || PAGE.landscape;
    els.canvas.classList.toggle('portrait', mode === 'portrait');
    document.documentElement.style.setProperty('--canvas-w', `${page.width}px`);
    document.documentElement.style.setProperty('--canvas-h', `${page.height}px`);
    updateZoomBox(page);
    els.canvasInfo.textContent = page.label;
    els.landscapeBtn.classList.toggle('active', mode === 'landscape');
    els.portraitBtn.classList.toggle('active', mode === 'portrait');
    if (!options.updateOnly) fitCanvas({ save: false });
  }

  function createItem(item, options = {}) {
    const el = document.createElement('div');
    el.className = 'studio-item';
    el.dataset.type = item.type;
    el.dataset.id = item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    el.dataset.name = item.name || readableType(item.type);
    if (item.locked) el.dataset.locked = 'true';
    el.style.left = `${Number(item.x || 120)}px`;
    el.style.top = `${Number(item.y || 120)}px`;
    el.style.width = `${Number(item.w || 220)}px`;
    el.style.height = `${Number(item.h || 60)}px`;
    el.style.zIndex = String(item.z || maxZ() + 1);
    el.style.opacity = item.opacity == null ? '1' : String(item.opacity);
    el.style.color = item.color || '#1A1040';
    el.style.backgroundColor = item.bg || 'transparent';
    if (item.fontFamily) el.style.fontFamily = wrapFont(item.fontFamily);
    if (item.fontSize) el.style.fontSize = `${item.fontSize}px`;
    if (item.weight) el.style.fontWeight = String(item.weight);
    if (item.padding != null) el.style.padding = `${item.padding}px`;
    if (item.locked || item.padding === 0) el.style.padding = '0';
    setAngle(el, item.angle || 0);

    const content = document.createElement('div');
    content.className = 'item-content';

    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.name || 'Yüklenen görsel';
      img.crossOrigin = 'anonymous';
      if (item.fit === 'cover') img.style.objectFit = 'cover';
      content.appendChild(img);
    } else if (item.type === 'shape') {
      content.innerHTML = shapeSvg(item.kind || 'rect');
    } else if (item.type === 'line') {
      el.dataset.type = 'line';
      el.style.height = `${Number(item.h || 4)}px`;
      el.style.minHeight = '2px';
      content.style.background = 'currentColor';
      content.style.borderRadius = '999px';
    } else {
      content.textContent = item.text || 'Metin';
      if (item.align) content.style.textAlign = item.align;
      if (item.lineHeight) content.style.lineHeight = String(item.lineHeight);
      if (item.type === 'icon') {
        content.style.lineHeight = '1';
        content.style.textAlign = 'center';
      }
    }

    const rotate = document.createElement('button');
    rotate.className = 'item-rotate';
    rotate.type = 'button';
    rotate.title = 'Döndür';
    rotate.textContent = '↻';

    const resize = document.createElement('button');
    resize.className = 'item-resize';
    resize.type = 'button';
    resize.title = 'Boyutlandır';

    el.append(content, rotate, resize);
    els.canvas.appendChild(el);

    if (options.select !== false && !item.locked) selectItem(el);
    return el;
  }

  function handleCanvasPointerDown(event) {
    const rotateHandle = event.target.closest('.item-rotate');
    const resizeHandle = event.target.closest('.item-resize');
    const item = event.target.closest('.studio-item');

    if (!item) {
      clearSelection();
      return;
    }

    if (item.dataset.locked === 'true') {
      clearSelection();
      return;
    }

    if (item.classList.contains('is-editing')) return;

    event.preventDefault();
    selectItem(item);

    if (rotateHandle) {
      startRotate(event, item);
      return;
    }
    if (resizeHandle) {
      startResize(event, item);
      return;
    }
    startDrag(event, item);
  }

  function startDrag(event, item) {
    const start = localPoint(event);
    state.drag = {
      mode: 'move',
      item,
      startX: start.x,
      startY: start.y,
      left: px(item.style.left),
      top: px(item.style.top)
    };
    bindPointerMove(event);
  }

  function handlePinchStart(event) {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    state.pinch = {
      distance: touchDistance(event.touches),
      zoom: state.zoom
    };
  }

  function handlePinchMove(event) {
    if (!state.pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const nextZoom = state.pinch.zoom * (touchDistance(event.touches) / state.pinch.distance);
    setZoom(nextZoom);
  }

  function handlePinchEnd(event) {
    if (event.touches && event.touches.length >= 2) return;
    state.pinch = null;
  }

  function touchDistance(touches) {
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  }

  function startResize(event, item) {
    const start = localPoint(event);
    state.drag = {
      mode: 'resize',
      item,
      startX: start.x,
      startY: start.y,
      width: px(item.style.width),
      height: px(item.style.height)
    };
    bindPointerMove(event);
  }

  function startRotate(event, item) {
    state.drag = {
      mode: 'rotate',
      item
    };
    bindPointerMove(event);
    handlePointerMove(event);
  }

  function bindPointerMove(event) {
    if (event.pointerId != null && state.drag.item.setPointerCapture) {
      try {
        state.drag.item.setPointerCapture(event.pointerId);
      } catch (error) {
        // Some browsers decline capture on synthetic events; document listeners still keep the tool usable.
      }
    }
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', finishPointerAction, { once: true });
    document.addEventListener('pointercancel', finishPointerAction, { once: true });
  }

  function handlePointerMove(event) {
    if (!state.drag) return;
    const point = localPoint(event);
    const item = state.drag.item;

    if (state.drag.mode === 'move') {
      item.style.left = `${Math.round(state.drag.left + point.x - state.drag.startX)}px`;
      item.style.top = `${Math.round(state.drag.top + point.y - state.drag.startY)}px`;
    }

    if (state.drag.mode === 'resize') {
      const width = Math.max(24, Math.round(state.drag.width + point.x - state.drag.startX));
      const height = Math.max(12, Math.round(state.drag.height + point.y - state.drag.startY));
      item.style.width = `${width}px`;
      item.style.height = `${height}px`;
    }

    if (state.drag.mode === 'rotate') {
      const center = itemCenter(item);
      const angle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI + 90;
      setAngle(item, Math.round(normalizeAngle(angle)));
    }

    updateInspector({ skipText: true });
  }

  function finishPointerAction() {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointercancel', finishPointerAction);
    if (state.drag) saveState();
    state.drag = null;
  }

  function handleDoubleClick(event) {
    const item = event.target.closest('.studio-item');
    if (!item) return;
    if (item.dataset.type === 'text' || item.dataset.type === 'icon') {
      startTextEdit(item);
      return;
    }
    if (item.dataset.type === 'image') {
      els.imageInput.click();
    }
  }

  function handleFocusOut(event) {
    const item = event.target.closest('.studio-item');
    if (!item || !item.classList.contains('is-editing')) return;
    item.classList.remove('is-editing');
    const content = $('.item-content', item);
    content.contentEditable = 'false';
    item.dataset.name = getLayerName(item);
    updateInspector();
    renderLayers();
    saveState();
  }

  function startTextEdit(item) {
    const content = $('.item-content', item);
    item.classList.add('is-editing');
    content.contentEditable = 'true';
    content.focus();

    const range = document.createRange();
    range.selectNodeContents(content);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function handleImageInput(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const replaceSelected = state.selected && state.selected.dataset.type === 'image' && files.length === 1;

    files.slice(0, 8).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (replaceSelected && index === 0) {
          const img = $('img', state.selected);
          if (img) img.src = reader.result;
          state.selected.dataset.name = file.name;
          renderLayers();
          saveState();
          return;
        }
        const item = createItem(image(String(reader.result), 380 + index * 24, 250 + index * 24, 260, 180, file.name));
        selectItem(item);
        saveState();
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  function handleCustomTemplateInput(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.slice(0, 6).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result);
        const template = makeCustomImageTemplate(src, file.name);
        templates.custom.unshift(template);
        state.activeCategory = 'custom';
        $$('[data-category]', els.templateTabs).forEach((button) => {
          button.classList.toggle('active', button.dataset.category === 'custom');
        });
        renderTemplates();
        applyTemplate(template);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  function makeCustomImageTemplate(src, fileName) {
    return {
      title: fileName.replace(/\.[^.]+$/, '').slice(0, 42) || 'Özel Şablon',
      desc: 'Yüklediğin görselden oluşturuldu',
      bg: '#FFFFFF',
      border: '#FFFFFF',
      borderStyle: 'none',
      orientation: 'landscape',
      thumbImage: src,
      backgroundImage: src,
      items: [
        text('SERTİFİKA BAŞLIĞI', 320, 140, 520, 62, 42, '#1A1040', 'Fredoka', 'center', 900),
        text('Öğrenci Adı Soyadı', 300, 300, 560, 78, 58, '#1A1040', 'Great Vibes', 'center', 400),
        text('Bu belge, gösterdiği emek ve başarı için düzenlenmiştir.', 315, 420, 530, 76, 24, '#475569', 'Nunito', 'center', 800)
      ]
    };
  }

  function selectItem(item) {
    if (state.selected && state.selected !== item) {
      state.selected.classList.remove('selected', 'is-editing');
      const oldContent = $('.item-content', state.selected);
      if (oldContent) oldContent.contentEditable = 'false';
    }
    state.selected = item;
    if (item) item.classList.add('selected');
    updateInspector();
    renderLayers();
  }

  function clearSelection(options = {}) {
    if (state.selected) {
      state.selected.classList.remove('selected', 'is-editing');
      const content = $('.item-content', state.selected);
      if (content) content.contentEditable = 'false';
    }
    state.selected = null;
    if (options.update !== false) {
      updateInspector();
      renderLayers();
    }
  }

  function updateInspector(options = {}) {
    const item = state.selected;
    els.emptyInspector.classList.toggle('hidden', Boolean(item));
    els.inspector.classList.toggle('hidden', !item);
    if (!item) return;

    const content = $('.item-content', item);
    const type = item.dataset.type;
    const style = getComputedStyle(item);
    const angle = Math.round(getAngle(item));
    const opacity = Number(style.opacity || '1');

    if (!options.skipInputs) {
      els.posX.value = String(Math.round(px(item.style.left)));
      els.posY.value = String(Math.round(px(item.style.top)));
      els.itemW.value = String(Math.round(px(item.style.width)));
      els.itemH.value = String(Math.round(px(item.style.height)));
      els.rotateRange.value = String(angle);
      els.opacityRange.value = String(opacity);
      els.itemColor.value = rgbToHex(style.color);
      els.itemBg.value = rgbToHex(style.backgroundColor || 'transparent', '#ffffff');
    }

    els.rotateOut.textContent = `${angle}°`;
    els.opacityOut.textContent = `${Math.round(opacity * 100)}%`;

    const textLike = type === 'text' || type === 'icon';
    els.textValueWrap.classList.toggle('hidden', !textLike);
    els.textControls.classList.toggle('hidden', !textLike);

    if (textLike && !options.skipText) {
      els.textValue.value = content ? content.textContent : '';
      const font = stripFont(style.fontFamily);
      if (font) els.fontFamily.value = font;
      const size = Math.round(px(style.fontSize));
      els.fontSize.value = String(size);
      els.fontSizeOut.textContent = `${size}px`;
      updateAlignButtons(content ? content.style.textAlign || getComputedStyle(content).textAlign : 'left');
    }
  }

  function applyGeometryFromInspector() {
    if (!state.selected) return;
    const item = state.selected;
    item.style.left = `${Number(els.posX.value || 0)}px`;
    item.style.top = `${Number(els.posY.value || 0)}px`;
    item.style.width = `${Math.max(20, Number(els.itemW.value || 20))}px`;
    item.style.height = `${Math.max(12, Number(els.itemH.value || 12))}px`;
  }

  function updateAlignButtons(align) {
    $$('[data-align]').forEach((button) => {
      button.classList.toggle('active', button.dataset.align === align);
    });
  }

  function renderLayers() {
    const items = getItemsByZ().reverse();
    els.layersList.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-inspector';
      empty.textContent = 'Henüz katman yok.';
      els.layersList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = `layer-row${item === state.selected ? ' active' : ''}`;
      row.dataset.id = item.dataset.id;
      row.innerHTML = `
        <button class="layer-name" type="button">${escapeHtml(getLayerName(item))}</button>
        <span class="layer-move">
          <button type="button" data-layer-action="up" title="Öne al">↑</button>
          <button type="button" data-layer-action="down" title="Arkaya al">↓</button>
        </span>
      `;
      els.layersList.appendChild(row);
    });
  }

  function duplicateSelected() {
    if (!state.selected) return;
    const clone = state.selected.cloneNode(true);
    clone.classList.remove('selected', 'is-editing');
    clone.dataset.id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    clone.dataset.name = `${getLayerName(state.selected)} kopya`;
    clone.style.left = `${px(state.selected.style.left) + 24}px`;
    clone.style.top = `${px(state.selected.style.top) + 24}px`;
    clone.style.zIndex = String(maxZ() + 1);
    const content = $('.item-content', clone);
    if (content) content.contentEditable = 'false';
    els.canvas.appendChild(clone);
    selectItem(clone);
    saveState();
  }

  function deleteSelected() {
    if (!state.selected) return;
    const item = state.selected;
    clearSelection({ update: false });
    item.remove();
    updateInspector();
    renderLayers();
    saveState();
  }

  function saveState() {
    if (state.applyingHistory) return;
    const snapshot = serializeCanvas();
    const serialized = JSON.stringify(snapshot);
    const current = state.history[state.historyIndex];
    if (current && JSON.stringify(current) === serialized) return;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 60) state.history.shift();
    state.historyIndex = state.history.length - 1;
    updateHistoryButtons();
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex -= 1;
    restoreCanvas(state.history[state.historyIndex]);
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex += 1;
    restoreCanvas(state.history[state.historyIndex]);
  }

  function serializeCanvas() {
    const clone = els.canvas.cloneNode(true);
    $$('.studio-item', clone).forEach((item) => {
      item.classList.remove('selected', 'is-editing');
      const content = $('.item-content', item);
      if (content) content.contentEditable = 'false';
    });
    return {
      html: clone.innerHTML,
      className: els.canvas.className,
      backgroundColor: els.canvas.style.backgroundColor,
      borderColor: els.canvas.style.borderColor,
      borderStyle: els.canvas.style.borderStyle,
      backgroundImage: els.canvas.style.backgroundImage,
      backgroundSize: els.canvas.style.backgroundSize,
      backgroundPosition: els.canvas.style.backgroundPosition,
      backgroundRepeat: els.canvas.style.backgroundRepeat,
      canvasW: getComputedStyle(document.documentElement).getPropertyValue('--canvas-w'),
      canvasH: getComputedStyle(document.documentElement).getPropertyValue('--canvas-h'),
      canvasInfo: els.canvasInfo.textContent
    };
  }

  function restoreCanvas(snapshot) {
    state.applyingHistory = true;
    clearSelection({ update: false });
    els.canvas.innerHTML = snapshot.html;
    els.canvas.className = snapshot.className;
    els.canvas.style.backgroundColor = snapshot.backgroundColor;
    els.canvas.style.borderColor = snapshot.borderColor;
    els.canvas.style.borderStyle = snapshot.borderStyle;
    els.canvas.style.backgroundImage = snapshot.backgroundImage || '';
    els.canvas.style.backgroundSize = snapshot.backgroundSize || '';
    els.canvas.style.backgroundPosition = snapshot.backgroundPosition || '';
    els.canvas.style.backgroundRepeat = snapshot.backgroundRepeat || '';
    document.documentElement.style.setProperty('--canvas-w', snapshot.canvasW || '1123px');
    document.documentElement.style.setProperty('--canvas-h', snapshot.canvasH || '794px');
    els.canvasInfo.textContent = snapshot.canvasInfo || (els.canvas.classList.contains('portrait') ? PAGE.portrait.label : PAGE.landscape.label);
    els.pageBg.value = rgbToHex(snapshot.backgroundColor || '#FFFAF2');
    els.pageBorder.value = rgbToHex(snapshot.borderColor || '#D4AF37');
    els.pageBorderStyle.value = snapshot.borderStyle || 'double';
    els.landscapeBtn.classList.toggle('active', !els.canvas.classList.contains('portrait'));
    els.portraitBtn.classList.toggle('active', els.canvas.classList.contains('portrait'));
    updateZoomBox();
    state.applyingHistory = false;
    updateInspector();
    renderLayers();
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    els.undoBtn.disabled = state.historyIndex <= 0;
    els.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
  }

  function setZoom(next) {
    state.zoom = Math.min(1.6, Math.max(0.28, Number(next.toFixed(2))));
    document.documentElement.style.setProperty('--zoom', String(state.zoom));
    updateZoomBox();
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function updateZoomBox(page = null) {
    const currentPage = page || (els.canvas.classList.contains('portrait') ? PAGE.portrait : PAGE.landscape);
    els.canvasZoom.style.width = `${Math.round(currentPage.width * state.zoom)}px`;
    els.canvasZoom.style.height = `${Math.round(currentPage.height * state.zoom)}px`;
  }

  function fitCanvas() {
    const width = els.canvasScroll.clientWidth - 80;
    const height = els.canvasScroll.clientHeight - 110;
    const page = els.canvas.classList.contains('portrait') ? PAGE.portrait : PAGE.landscape;
    const byWidth = width / page.width;
    const byHeight = height / page.height;
    setZoom(Math.min(1, Math.max(0.28, Math.min(byWidth, byHeight))));
  }

  function exportCanvas(format) {
    const previousSelection = state.selected;
    clearSelection({ update: false });
    els.canvas.classList.add('print-clean');

    renderDocumentCanvas().then((generatedCanvas) => {
      if (format === 'png') {
        downloadDataUrl(generatedCanvas.toDataURL('image/png'), `belge-${Date.now()}.png`);
      } else if (format === 'pdf') {
        savePdf(generatedCanvas);
      } else {
        printGeneratedCanvas(generatedCanvas);
      }
    }).catch(() => {
      window.alert('Belge çıktısı hazırlanamadı. Görsellerin yüklenmiş olduğundan emin olup tekrar deneyin.');
    }).finally(() => {
      els.canvas.classList.remove('print-clean');
      if (previousSelection && els.canvas.contains(previousSelection)) selectItem(previousSelection);
      else updateInspector();
    });
  }

  function renderDocumentCanvas() {
    if (typeof window.html2canvas === 'function') {
      return window.html2canvas(els.canvas, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });
    }
    return renderCanvasWithSvgFallback();
  }

  async function renderCanvasWithSvgFallback() {
    const width = Math.round(els.canvas.offsetWidth);
    const height = Math.round(els.canvas.offsetHeight);
    const clone = els.canvas.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.margin = '0';
    clone.style.boxSizing = 'border-box';

    await inlineImages(clone);

    const css = collectPageCss();
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<foreignObject width="100%" height="100%">`,
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;margin:0;overflow:hidden;">`,
      `<style>${css}</style>`,
      clone.outerHTML,
      '</div>',
      '</foreignObject>',
      '</svg>'
    ].join('');

    const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    const output = document.createElement('canvas');
    output.width = width * 2;
    output.height = height * 2;
    const ctx = output.getContext('2d');
    ctx.fillStyle = getComputedStyle(els.canvas).backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(image, 0, 0, output.width, output.height);
    return output;
  }

  async function inlineImages(root) {
    const images = $$('img', root);
    await Promise.all(images.map(async (img) => {
      if (!img.src || img.src.startsWith('data:')) return;
      try {
        const response = await fetch(img.src, { credentials: 'same-origin' });
        const blob = await response.blob();
        img.src = await blobToDataUrl(blob);
      } catch (error) {
        img.removeAttribute('crossorigin');
      }
    }));
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function collectPageCss() {
    const parts = [
      'html,body{margin:0;padding:0;background:transparent;}',
      '.studio-item{outline:none!important;background:transparent;}',
      '.item-resize,.item-rotate{display:none!important;}'
    ];
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule) => parts.push(rule.cssText));
      } catch (error) {
        // Cross-origin font imports are optional for export; local styles carry the layout.
      }
    });
    return parts.join('\n');
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function savePdf(generatedCanvas) {
    const jspdf = window.jspdf && window.jspdf.jsPDF;
    if (!jspdf) {
      saveSimplePdf(generatedCanvas);
      return;
    }
    const portrait = els.canvas.classList.contains('portrait');
    const pdf = new jspdf({
      orientation: portrait ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(generatedCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.save(`belge-${Date.now()}.pdf`);
  }

  function saveSimplePdf(generatedCanvas) {
    const portrait = els.canvas.classList.contains('portrait');
    const page = portrait ? { width: 595.28, height: 841.89 } : { width: 841.89, height: 595.28 };
    const dataUrl = generatedCanvas.toDataURL('image/jpeg', 0.92);
    const jpegBinary = window.atob(dataUrl.split(',')[1]);
    const pdfBytes = makeSimpleImagePdf(jpegBinary, generatedCanvas.width, generatedCanvas.height, page.width, page.height);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `belge-${Date.now()}.pdf`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function makeSimpleImagePdf(jpegBinary, imageWidth, imageHeight, pageWidth, pageHeight) {
    const offsets = [0];
    let pdf = '%PDF-1.3\n';

    function addObject(body) {
      offsets.push(pdf.length);
      pdf += `${offsets.length - 1} 0 obj\n${body}\nendobj\n`;
    }

    addObject('<< /Type /Catalog /Pages 2 0 R >>');
    addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offsets.push(pdf.length);
    pdf += `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n`;
    pdf += jpegBinary;
    pdf += '\nendstream\nendobj\n';
    const contents = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
    addObject(`<< /Length ${contents.length} >>\nstream\n${contents}\nendstream`);

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return binaryStringToUint8Array(pdf);
  }

  function binaryStringToUint8Array(value) {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index) & 0xff;
    }
    return bytes;
  }

  function printGeneratedCanvas(generatedCanvas) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Yazdırma penceresi açılamadı. Tarayıcı izinlerini kontrol edin.');
      return;
    }
    const orientation = els.canvas.classList.contains('portrait') ? 'portrait' : 'landscape';
    const html = [
      '<!doctype html>',
      '<html lang="tr">',
      '<head>',
      '<meta charset="utf-8">',
      '<title>Belge Yazdır</title>',
      '<style>',
      '@page{size:A4 ' + orientation + ';margin:0}',
      'html,body{margin:0;min-height:100%;background:#fff}',
      'body{display:grid;place-items:center}',
      'img{width:100vw;height:100vh;object-fit:contain;display:block}',
      '</style>',
      '</head>',
      '<body><img alt="Belge" src="' + generatedCanvas.toDataURL('image/png') + '"></body>',
      '</html>'
    ].join('');
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
  }

  function downloadDataUrl(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function localPoint(event) {
    const rect = els.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / state.zoom,
      y: (event.clientY - rect.top) / state.zoom
    };
  }

  function itemCenter(item) {
    return {
      x: px(item.style.left) + px(item.style.width) / 2,
      y: px(item.style.top) + px(item.style.height) / 2
    };
  }

  function setAngle(item, angle) {
    const normalized = normalizeAngle(angle);
    item.dataset.angle = String(normalized);
    item.style.transform = `rotate(${normalized}deg)`;
  }

  function getAngle(item) {
    return Number(item.dataset.angle || 0);
  }

  function normalizeAngle(angle) {
    return ((Number(angle) % 360) + 360) % 360;
  }

  function maxZ() {
    return Math.max(1, ...$$('.studio-item', els.canvas).map((item) => Number(item.style.zIndex || 1)));
  }

  function normalizeZ() {
    getItemsByZ().forEach((item, index) => {
      item.style.zIndex = String(index + 1);
    });
  }

  function getItemsByZ() {
    return $$('.studio-item', els.canvas).sort((a, b) => Number(a.style.zIndex || 1) - Number(b.style.zIndex || 1));
  }

  function getLayerName(item) {
    const type = item.dataset.type;
    if (type === 'text' || type === 'icon') {
      const textValue = ($('.item-content', item) || item).textContent.trim();
      return textValue ? (textValue.length > 28 ? `${textValue.slice(0, 28)}...` : textValue) : readableType(type);
    }
    return item.dataset.name || readableType(type);
  }

  function readableType(type) {
    return {
      text: 'Metin',
      image: 'Görsel',
      shape: 'Şekil',
      icon: 'İkon',
      line: 'Ayraç'
    }[type] || 'Öge';
  }

  function shapeSvg(kind, color) {
    const fill = color || 'currentColor';
    const common = 'vector-effect="non-scaling-stroke"';
    const svg = {
      rect: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="9" y="14" width="82" height="72" rx="14" fill="${fill}" ${common}/></svg>`,
      circle: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="${fill}" ${common}/></svg>`,
      star: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${fill}" d="M50 7l11.9 27.1 29.4 3.1-22 19.9 6.2 29-25.5-15-25.5 15 6.2-29-22-19.9 29.4-3.1L50 7z"/></svg>`,
      heart: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${fill}" d="M50 84S14 62 14 35c0-12 9-21 21-21 7 0 13 4 15 10 2-6 8-10 15-10 12 0 21 9 21 21 0 27-36 49-36 49z"/></svg>`,
      ribbon: `<svg viewBox="0 0 120 100" aria-hidden="true"><path fill="${fill}" d="M60 6l12 15 19-3 4 19 17 10-10 17 3 19-19 4-14 12-12-15-12 15-14-12-19-4 3-19-10-17 17-10 4-19 19 3L60 6z"/></svg>`,
      hexagon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${fill}" d="M50 6l38 22v44L50 94 12 72V28L50 6z"/></svg>`,
      shield: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${fill}" d="M50 8l34 12v24c0 23-13 39-34 49-21-10-34-26-34-49V20L50 8z"/></svg>`,
      arrow: `<svg viewBox="0 0 120 100" aria-hidden="true"><path fill="${fill}" d="M76 16l36 34-36 34V62H10V38h66V16z"/></svg>`,
      seal: `<svg viewBox="0 0 120 120" aria-hidden="true"><path fill="${fill}" d="M60 5l8 11 13-5 4 13 14 1-1 14 12 7-8 11 8 11-12 7 1 14-14 1-4 13-13-5-8 11-8-11-13 5-4-13-14-1 1-14-12-7 8-11-8-11 12-7-1-14 14-1 4-13 13 5 8-11z"/><circle cx="60" cy="60" r="31" fill="rgba(255,255,255,.35)"/></svg>`,
      badge: `<svg viewBox="0 0 100 120" aria-hidden="true"><path fill="${fill}" d="M50 6l9 10 13-3 5 13 13 5-3 13 10 9-10 9 3 13-13 5-5 13-13-3-9 10-9-10-13 3-5-13-13-5 3-13-10-9 10-9-3-13 13-5 5-13 13 3 9-10z"/><path fill="${fill}" opacity=".72" d="M32 78v36l18-12 18 12V78z"/></svg>`,
      medal: `<svg viewBox="0 0 100 120" aria-hidden="true"><path fill="${fill}" opacity=".82" d="M28 5h16l8 38H36zM56 5h16L64 43H48z"/><circle cx="50" cy="70" r="36" fill="${fill}"/><path fill="rgba(255,255,255,.55)" d="M50 47l7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2 7-14z"/></svg>`,
      laurel: `<svg viewBox="0 0 120 100" aria-hidden="true"><path fill="none" stroke="${fill}" stroke-width="8" stroke-linecap="round" d="M40 78C18 62 14 35 31 17M80 78c22-16 26-43 9-61"/><path fill="${fill}" d="M31 20c-12 5-16 16-14 27 12-3 20-12 14-27zm13 28c-13 0-21 8-24 19 12 2 23-3 24-19zm45-28c12 5 16 16 14 27-12-3-20-12-14-27zM76 48c13 0 21 8 24 19-12 2-23-3-24-19z"/></svg>`,
      cloud: `<svg viewBox="0 0 120 80" aria-hidden="true"><path fill="${fill}" d="M31 67c-15 0-25-9-25-22 0-12 9-21 22-22C34 10 46 4 60 8c11 3 18 11 21 22 19-2 33 9 33 26 0 7-5 11-14 11H31z"/></svg>`,
      speech: `<svg viewBox="0 0 120 90" aria-hidden="true"><path fill="${fill}" d="M14 13h92c6 0 10 4 10 10v38c0 6-4 10-10 10H54L31 87V71H14C8 71 4 67 4 61V23c0-6 4-10 10-10z"/></svg>`,
      bookmark: `<svg viewBox="0 0 80 110" aria-hidden="true"><path fill="${fill}" d="M14 5h52c5 0 8 3 8 8v91L40 82 6 104V13c0-5 3-8 8-8z"/></svg>`,
      wave: `<svg viewBox="0 0 120 70" aria-hidden="true"><path fill="${fill}" d="M0 45c15-22 31-22 46 0s31 22 46 0c9-13 18-18 28-16v28c-15 22-31 22-46 0s-31-22-46 0C19 70 10 75 0 73z"/></svg>`,
      spark: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${fill}" d="M50 4l10 31 32 15-32 15-10 31-10-31L8 50l32-15L50 4zM82 8l4 12 12 4-12 4-4 12-4-12-12-4 12-4 4-12z"/></svg>`,
      ticket: `<svg viewBox="0 0 120 80" aria-hidden="true"><path fill="${fill}" d="M10 18h100v13c-9 0-16 7-16 17s7 17 16 17v13H10V65c9 0 16-7 16-17S19 31 10 31V18z"/></svg>`,
      pencil: `<svg viewBox="0 0 120 80" aria-hidden="true"><path fill="${fill}" d="M18 52l62-40 20 20-62 40H18V52z"/><path fill="rgba(255,255,255,.65)" d="M80 12l8-5 20 20-8 5z"/><path fill="#1A1040" opacity=".75" d="M18 52l-8 28 28-8z"/></svg>`,
      book: `<svg viewBox="0 0 120 90" aria-hidden="true"><path fill="${fill}" d="M14 10h38c8 0 14 4 18 10 4-6 10-10 18-10h18v66H88c-8 0-14 3-18 8-4-5-10-8-18-8H14V10z"/><path fill="rgba(255,255,255,.55)" d="M60 23h5v52h-5z"/></svg>`
    };
    return svg[kind] || svg.rect;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function px(value) {
    return Number.parseFloat(value || '0') || 0;
  }

  function wrapFont(font) {
    return `'${font}', system-ui, sans-serif`;
  }

  function stripFont(font) {
    const clean = String(font || '').split(',')[0].replaceAll('"', '').replaceAll("'", '').trim();
    const options = Array.from(els.fontFamily.options).map((option) => option.value);
    return options.includes(clean) ? clean : 'Nunito';
  }

  function rgbToHex(value, fallback = '#ffffff') {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return fallback;
    if (value.startsWith('#')) {
      if (value.length === 4) {
        return '#' + value.slice(1).split('').map((part) => part + part).join('');
      }
      return value.slice(0, 7);
    }
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return fallback;
    return '#' + match.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, '0')).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
