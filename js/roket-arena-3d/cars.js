// cars.js — Balanced 6-Car Roster with Subtle Handling Profiles & Active Special Abilities

const CarCatalog = (() => {
  // All stat multipliers stay within a fair balanced band (0.95 – 1.08) so no car dominates unfairly,
  // while giving each vehicle its own distinct personality and fun active Special Ability!
  const CARS = [
    {
      id: 'gt',
      name: 'Şimşek GT',
      icon: '🏎️',
      tag: 'Süper Spor',
      bodyStyle: 'gt',
      color: [0.08, 0.76, 0.98],
      accent: [0.76, 0.98, 1.0],
      hex: '#22d3ee',
      stats: { speed: 1.04, accel: 1.02, control: 1.00, power: 0.98 },
      bars:  { speed: 4.5,  accel: 4.0,  control: 3.8,  power: 3.5 },
      special: {
        id: 'dash',
        name: 'Nitro Atılım',
        icon: '⚡',
        cooldown: 7.0,
        soccerDesc: 'Anlık ileri roket fırlaması ile topa şimşek gibi yetişir.',
        paintDesc: 'Aynı anda 3 renkli boya topu yelpazesi fırlatır.',
      },
    },
    {
      id: 'monster',
      name: 'Canavar 4x4',
      icon: '🚙',
      tag: 'Dev Teker',
      bodyStyle: 'monster',
      color: [0.98, 0.44, 0.14],
      accent: [1.0, 0.86, 0.34],
      hex: '#fb923c',
      stats: { speed: 0.96, accel: 0.98, control: 0.98, power: 1.08 },
      bars:  { speed: 3.4,  accel: 3.6,  control: 3.6,  power: 4.8 },
      special: {
        id: 'shockwave',
        name: 'Şok Dalgası',
        icon: '💥',
        cooldown: 8.0,
        soccerDesc: 'Yakındaki topa (15m) güçlü altın şok dalgası şutu gönderir.',
        paintDesc: 'Büyük patlama yarıçaplı süper boya topu fırlatır.',
      },
    },
    {
      id: 'formula',
      name: 'Yıldız F1',
      icon: '🏁',
      tag: 'Formula Yarış',
      bodyStyle: 'formula',
      color: [0.96, 0.22, 0.36],
      accent: [1.0, 0.94, 0.82],
      hex: '#f43f5e',
      stats: { speed: 1.05, accel: 1.04, control: 1.02, power: 0.95 },
      bars:  { speed: 4.7,  accel: 4.4,  control: 4.1,  power: 3.2 },
      special: {
        id: 'overdrive',
        name: 'Süper Turbo',
        icon: '🌀',
        cooldown: 8.5,
        soccerDesc: '3.5 saniye sınırsız turbo ve ultra keskin viraj dönüşü sağlar.',
        paintDesc: '4 saniye boyunca çok hızlı seri boya atışı açar.',
      },
    },
    {
      id: 'cyber',
      name: 'Cyber Pikap',
      icon: '🛸',
      tag: 'Fütüristik',
      bodyStyle: 'cyber',
      color: [0.58, 0.32, 0.98],
      accent: [0.22, 0.96, 0.88],
      hex: '#a855f7',
      stats: { speed: 0.99, accel: 1.00, control: 1.01, power: 1.03 },
      bars:  { speed: 3.8,  accel: 3.9,  control: 4.0,  power: 4.2 },
      special: {
        id: 'magnet',
        name: 'Manyetik Çekim',
        icon: '🧲',
        cooldown: 8.5,
        soccerDesc: '3.5 saniye topu burnuna doğru yumuşakça çekerek nişan almayı kolaylaştırır.',
        paintDesc: 'Güdümlü akıllı boya topu hedefe kilitlenerek uçar.',
      },
    },
    {
      id: 'rally',
      name: 'Mini Ralli',
      icon: '🚗',
      tag: 'Kıvrak Ralli',
      bodyStyle: 'rally',
      color: [0.16, 0.84, 0.46],
      accent: [1.0, 0.92, 0.32],
      hex: '#22c55e',
      stats: { speed: 0.98, accel: 1.05, control: 1.07, power: 0.97 },
      bars:  { speed: 3.7,  accel: 4.5,  control: 4.8,  power: 3.5 },
      special: {
        id: 'megajump',
        name: 'Süper Sıçrama',
        icon: '🦘',
        cooldown: 6.5,
        soccerDesc: 'Yüksek akrobasi sıçraması + yakın topa havadan güçlü vole vuruşu!',
        paintDesc: 'Zıplayarak hedefi bulan çift boya atışı yapar.',
      },
    },
    {
      id: 'titan',
      name: 'Zırhlı Kaptan',
      icon: '🛡️',
      tag: 'Güçlü Zırh',
      bodyStyle: 'titan',
      color: [0.96, 0.74, 0.14],
      accent: [0.18, 0.84, 0.98],
      hex: '#eab308',
      stats: { speed: 0.97, accel: 0.97, control: 1.00, power: 1.06 },
      bars:  { speed: 3.5,  accel: 3.5,  control: 3.9,  power: 4.6 },
      special: {
        id: 'slowfield',
        name: 'Buz Alanı',
        icon: '❄️',
        cooldown: 8.5,
        soccerDesc: '3.5 sn topu ve yakın rakibi yavaşlatıp mükemmel kontrol sağlar.',
        paintDesc: '4 saniye boyunca tüm balonları dondurup yavaşlatır.',
      },
    },
  ];

  function getAll() {
    return CARS;
  }

  function getById(id) {
    return CARS.find((c) => c.id === id) || CARS[0];
  }

  return { getAll, getById };
})();
