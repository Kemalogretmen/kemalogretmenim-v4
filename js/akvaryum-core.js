(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./akvaryum-sounds.js'));
  else root.AquariumCore = factory(root.AquariumSounds);
})(typeof window === 'object' ? window : this, function (Sounds) {
  'use strict';
  const SPECIES = [
    { id: 'clown', name: 'Palyaço balığı', file: 'palyaco-baligi.png', detail: 'Mercan resiflerinin turuncu sakini', size: 112 },
    { id: 'tang', name: 'Mavi cerrah', file: 'mavi-cerrah.png', detail: 'Masmavi gövdesi, sarı kuyruğuyla', size: 125 },
    { id: 'butterfly', name: 'Kelebek balığı', file: 'kelebek-baligi.png', detail: 'İnce burnu ve zarif çizgileriyle', size: 118 },
    { id: 'turtle', name: 'Deniz kaplumbağası', file: 'deniz-kaplumbagasi.png', detail: 'Okyanusun sakin gezgini', size: 156 },
    { id: 'ray', name: 'Vatoz', file: 'vatoz.png', detail: 'Suyun içinde süzülerek yol alır', size: 164 },
    { id: 'seahorse', name: 'Denizatı', file: 'denizati.png', detail: 'Kıvrık kuyruğuyla minik bir keşifçi', size: 94 },
    { id: 'yellowtang', name: 'Sarı cerrah', file: 'sari-cerrah.png', detail: 'Güneş sarısı, zarif bir resif balığı', size: 119 },
    { id: 'angelfish', name: 'İmparator melek', file: 'imparator-melek.png', detail: 'Mavi ve sarı çizgileriyle göz alıcı', size: 131 },
    { id: 'mandarin', name: 'Mandarin balığı', file: 'mandarin-baligi.png', detail: 'Turkuaz ve turuncu desenlerle', size: 112 },
    { id: 'lionfish', name: 'Aslan balığı', file: 'aslan-baligi.png', detail: 'Yelpaze gibi açılan yüzgeçleriyle', size: 140 },
    { id: 'puffer', name: 'Balon balığı', file: 'balon-baligi.png', detail: 'Benekli gövdesi ve minik yüzgeçleriyle', size: 117 },
    { id: 'gramma', name: 'Kraliyet gramma', file: 'kraliyet-gramma.png', detail: 'Mor ve sarının küçük buluşması', size: 110 },
    { id: 'firefish', name: 'Ateş balığı', file: 'ates-baligi.png', detail: 'İnce gövdesi ve turuncu kuyruğuyla', size: 112 },
    { id: 'triggerfish', name: 'Tetik balığı', file: 'tetik-baligi.png', detail: 'İri beyaz benekli bir resif sakini', size: 130 },
    { id: 'octopus', name: 'Ahtapot', file: 'ahtapot.png', detail: 'Sekiz kollu, meraklı bir deniz dostu', size: 140 },
    { id: 'jellyfish', name: 'Denizanası', file: 'denizanasi.png', detail: 'İncecik dokunaçlarıyla süzülür', size: 115 },
    { id: 'shark', name: 'Resif köpekbalığı', file: 'resif-kopekbaligi.png', detail: 'Güçlü kuyruğuyla açık suda yol alır', size: 172 },
    { id: 'dolphin', name: 'Yunus', file: 'yunus.png', detail: 'Okyanusların çevik yüzücüsü', size: 165 },
    {"id": "royalblue", "name": "Kraliyet melek balığı", "file": "kraliyet-melek.png", "detail": "Altın çizgiler ve lacivert yüzgeçler", "size": 125},
    {"id": "copperband", "name": "Bakır bantlı kelebek", "file": "bakir-kelebek.png", "detail": "Bakır şeritli, ince burunlu bir kelebek", "size": 125},
    {"id": "discus", "name": "Diskus", "file": "diskus.png", "detail": "Turkuaz gövdesinde kıvrımlı desenler", "size": 125},
    {"id": "betta", "name": "Beta balığı", "file": "beta.png", "detail": "Pembe ve mor yelpaze yüzgeçler", "size": 125},
    {"id": "goldfish", "name": "Japon balığı", "file": "japon.png", "detail": "Altın rengi, dalgalanan çift kuyruk", "size": 125},
    {"id": "guppy", "name": "Lepistes", "file": "lepistes.png", "detail": "Minik gövdesi ve renkli benekli kuyruğu", "size": 125},
    {"id": "neon", "name": "Neon tetra", "file": "neon.png", "detail": "Parlak mavi çizgisiyle küçük bir yüzücü", "size": 125},
    {"id": "cardinal", "name": "Banggai kardinal", "file": "kardinal.png", "detail": "Siyah şeritler, inci gibi beyaz benekler", "size": 125},
    {"id": "anthias", "name": "Pembe anthias", "file": "anthias.png", "detail": "Şeftali pembesi, zarif yüzgeçler", "size": 125},
    {"id": "goby", "name": "Sarı gobi", "file": "gobi.png", "detail": "Sapsarı, küçük bir resif sakini", "size": 125},
    {"id": "blenny", "name": "Kuyruk benekli bleni", "file": "bleni.png", "detail": "Turuncu yüzü ve kuyruk beneğiyle", "size": 125},
    {"id": "parrot", "name": "Papağan balığı", "file": "papagan.png", "detail": "Turkuaz pulları ve yuvarlak burnuyla", "size": 125},
    {"id": "wrasse", "name": "Gökkuşağı lapin", "file": "lapin.png", "detail": "Pembe, mavi ve turuncu renklerin buluşması", "size": 125},
    {"id": "moorish", "name": "Mağribi idol", "file": "magribi.png", "detail": "Uzun sırt yüzgeciyle zarif bir gezgin", "size": 125},
    {"id": "rabbit", "name": "Tavşan balığı", "file": "tavsan.png", "detail": "Sarı gövdesi ve siyah beyaz maskesiyle", "size": 125},
    {"id": "flame", "name": "Alev melek balığı", "file": "alev-melek.png", "detail": "Turuncu kırmızı, mavi uçlu yüzgeçler", "size": 125}
  ];
  const THEMES = [
    { id: 'reef', name: 'Mercan resifi', file: 'mercan-resifi.jpg', description: 'Güneşli, turkuaz bir dünya' },
    { id: 'kelp', name: 'Yosun ormanı', file: 'yosun-ormani.jpg', description: 'Yeşilin içinde sakin bir yolculuk' },
    { id: 'grotto', name: 'Mavi mağara', file: 'mavi-magara.jpg', description: 'Derin mavinin büyüsü' }
  ];
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'aq-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  // Local calendar days, deliberately not UTC: a late evening lesson stays on its own day.
  const dayKey = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const clean = (v, max = 80) => String(v || '').trim().slice(0, max);
  const species = id => SPECIES.find(s => s.id === id) || SPECIES[0];
  const validPoints = value => Number.isInteger(value) && value >= 1 && value <= 1000;
  const taskPoints = task => task.points === undefined ? 1 : task.points;
  function newClass(name = 'Sınıfım') {
    return { id: uid(), name: clean(name), theme: 'reef', students: [], tasks: ['Kitabımı okudum', 'Ödevimi tamamladım', 'Sorumluluğumu yerine getirdim'].map(title => ({ id: uid(), title, icon: '', points: 1 })) };
  }
  function newStudent(name, kind = 'clown') {
    return { id: uid(), name: clean(name), species: species(kind).id, createdAt: Date.now(), days: {}, feeds: [] };
  }
  function validBirthday(value) {
    return !!(value && Number.isInteger(value.month) && value.month>=1 && value.month<=12 &&
      Number.isInteger(value.day) && value.day>=1 && value.day<=[31,29,31,30,31,30,31,31,30,31,30,31][value.month-1]);
  }
  function isBirthday(student, date = new Date()) {
    return !!(validBirthday(student.birthday) && student.birthday.month===date.getMonth()+1 && student.birthday.day===date.getDate());
  }
  function removeClass(state,id) {
    if(!state.classes.some(c=>c.id===id)) return false;
    state.classes=state.classes.filter(c=>c.id!==id);
    if(!state.classes.length) state.classes.push(newClass());
    if(state.activeClassId===id) state.activeClassId=state.classes[0].id;
    return true;
  }
  function settingsOf(raw = {}) {
    return { names: raw?.names !== false, motion: raw?.motion !== false, points: raw?.points === true, classPoints: raw?.classPoints === true,
      hungerText: raw?.hungerText === true, chat: raw?.chat !== false, feedSound: raw?.feedSound !== false,
      timerSound: raw?.timerSound !== false, timerVolume: Number.isFinite(raw?.timerVolume) ? Math.max(0,Math.min(1,raw.timerVolume)) : .65,
      sound: Sounds.has(raw?.sound) ? raw.sound : 'off',
      mix: Sounds.normalizeMix(Array.isArray(raw?.mix) ? raw.mix : (Sounds.has(raw?.sound) ? [{id:raw.sound,volume:1}] : [])),
      favorites: Sounds.favorites(raw?.favorites),
      volume: Number.isFinite(raw?.volume) ? Math.max(0, Math.min(1, raw.volume)) : .3 };
  }
  function initialState() {
    const classroom = newClass();
    return { version: 1, activeClassId: classroom.id, classes: [classroom], settings: settingsOf() };
  }
  function ensureDay(student, classroom, date = dayKey()) {
    if (!student.days[date]) student.days[date] = { absent: false, tasks: classroom.tasks.map(t => ({ id: t.id, title: t.title, icon: taskIcon(t.icon), points: taskPoints(t), status: 'pending' })) };
    return student.days[date];
  }
  function earned(student) {
    return Object.values(student.days).reduce((n, d) => n + (d.absent ? 0 : d.tasks.reduce((sum, t) => sum + (t.status === 'done' ? taskPoints(t) : 0), 0)), 0);
  }
  const completedCount = student => Object.values(student.days).reduce((n, d) => n + (d.absent ? 0 : d.tasks.filter(t => t.status === 'done').length), 0);
  const balance = student => Math.max(0, completedCount(student) - student.feeds.filter(f => !f.creditReversed).length);
  const TASK_ICONS = ['⭐','📖','✏️','💙','🌿','🤝','🎯','🏆','🧠','🎨','🎵','🧹','🧩','💡','🙋','🕊️','🌍','🌟','😊','💪','📝','🔬','⚽','🎒'];
  const taskIcon = value => typeof value === 'string' && value.trim().length <= 16 && !/[<>\x00-\x1f]/.test(value) ? value.trim() : '';
  function updateTask(classroom, taskId, values, date = dayKey()) {
    const task = classroom.tasks.find(t => t.id === taskId), title = clean(values.title,120);
    if (!task || !title || !validPoints(values.points)) return false;
    Object.assign(task,{title,points:values.points,icon:taskIcon(values.icon)});
    classroom.students.forEach(s => s.days[date]?.tasks.filter(t => t.id === taskId && t.status !== 'done').forEach(t => Object.assign(t,{title,points:task.points,icon:task.icon})));
    return true;
  }
  function updateTaskPoints(classroom, taskId, points, date = dayKey()) {
    const task = classroom.tasks.find(t => t.id === taskId);
    if (!task || !validPoints(points)) return false;
    task.points = points;
    // Awarded scores and older days are immutable when editing the template.
    classroom.students.forEach(s => {
      const pending = s.days[date]?.tasks.find(t => t.id === taskId && t.status !== 'done');
      if (pending) pending.points = points;
    });
    return true;
  }
  function setTask(student, date, taskId, status) {
    const day = student.days[date];
    if (!day || day.absent || !['pending', 'done', 'missed'].includes(status)) return false;
    const task = day.tasks.find(t => t.id === taskId);
    if (!task) return false;
    task.status = status;
    return true;
  }
  function feed(student, date = dayKey()) {
    if (student.days[date]?.absent || !balance(student)) return false;
    student.feeds.push({ day: date, at: Date.now() });
    return true;
  }
  function completeAndFeed(student, date, taskId) {
    const task = student.days[date]?.tasks.find(t => t.id === taskId);
    if (!task || task.status === 'done' || !validPoints(taskPoints(task)) || !setTask(student, date, taskId, 'done')) return null;
    return { points: taskPoints(task), fed: feed(student, date) };
  }
  // Keep one choice per behavior; each additional award is its own history entry.
  function behaviorChoices(student, classroom, date) {
    const day = student.days[date];
    if (!day) return [];
    const originals = day.tasks.filter(t => !t.sourceId);
    return [...originals, ...classroom.tasks.filter(t => !originals.some(o => o.id === t.id))].map(t => {
      const current = classroom.tasks.find(template => template.id === t.id);
      const points = t.status && t.status !== 'done' ? taskPoints(t) : taskPoints(current || t);
      const count = day.tasks.filter(entry => (entry.sourceId || entry.id) === t.id && entry.status === 'done').length;
      return {...t, title:current?.title || t.title, icon:current?.icon || t.icon || '', points, count};
    });
  }
  function awardBehavior(student, classroom, date, taskId) {
    const day = student.days[date];
    if (!day || day.absent || day.tasks.length >= 2000 || student.feeds.length >= 80000) return null;
    const choice = behaviorChoices(student, classroom, date).find(t => t.id === taskId);
    if (!choice || !validPoints(choice.points)) return null;
    const original = day.tasks.find(t => t.id === taskId);
    if (original && original.status !== 'done') return completeAndFeed(student, date, taskId);
    const entry = {id:uid(), sourceId:taskId, title:choice.title, icon:taskIcon(choice.icon), points:choice.points, status:'done', awardedAt:Date.now()};
    day.tasks.push(entry);
    return {points:entry.points, fed:feed(student, date)};
  }
  // A correction reverses credit, not the historical fact that a fish was fed.
  function correctAward(student, date, taskId, remove = false) {
    const day = student.days[date], task = day?.tasks.find(t => t.id === taskId);
    if (!task || (!remove && task.status !== 'done')) return false;
    if (!day.absent && task.status === 'done' && balance(student) === 0) {
      const consumed = [...student.feeds].reverse().find(f => !f.creditReversed);
      if (consumed) consumed.creditReversed = true;
    }
    if (remove) day.tasks = day.tasks.filter(t => t !== task);
    else task.status = 'pending';
    return true;
  }
  const defaultThresholds = () => Array.from({length:10}, (_,i) => (i+1)*10);
  const validThresholds = values => Array.isArray(values) && values.length === 10 && values.every((n,i) => Number.isInteger(n) && n > 0 && n <= 1000000 && (!i || n > values[i-1]));
  function growth(student, classroom) {
    if (!classroom.growth?.enabled) return {stage:10, scale:1, egg:false, trophy:false, next:null};
    const points = earned(student), thresholds = classroom.growth.thresholds;
    const stage = thresholds.filter(n => points >= n).length;
    return {stage, scale:stage ? Math.pow(1.1,stage-10) : .5, egg:stage===0, trophy:stage===10, next:thresholds[stage] ?? null};
  }
  // Bulk rewards use the same per-student rules as a fish click.
  function rewardGroup(classroom, date, taskId, studentIds) {
    const chosen = new Set(studentIds);
    return classroom.students.filter(s => chosen.has(s.id)).flatMap(s => {
      const result = awardBehavior(s, classroom, date, taskId);
      return result ? [{ id: s.id, ...result }] : [];
    });
  }
  const validGoalTarget = value => Number.isInteger(value) && value >= 1 && value <= 1000000;
  function startGoal(classroom, title, target) {
    if (!clean(title,120) || !validGoalTarget(target)) return false;
    classroom.goal = {title:clean(title,120),target,enabled:true,startedOn:dayKey(),
      baseline: Object.fromEntries(classroom.students.map(s => [s.id,earned(s)]))};
    return true;
  }
  function goalProgress(classroom) {
    const goal = classroom.goal;
    if (!goal) return null;
    const points = classroom.students.reduce((sum,s) => sum + Math.max(0,earned(s)-(Object.hasOwn(goal.baseline,s.id) ? goal.baseline[s.id] : 0)),0);
    return {points, target:goal.target, percent:Math.min(100,Math.floor(points/goal.target*100)), complete:points>=goal.target};
  }
  function validateGoal(raw) {
    if (!raw || typeof raw.title !== 'string' || !clean(raw.title,120) || !validGoalTarget(raw.target) ||
      typeof raw.enabled !== 'boolean' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.startedOn) ||
      !raw.baseline || typeof raw.baseline !== 'object' || Array.isArray(raw.baseline) || Object.keys(raw.baseline).length>60) throw new Error('Ortak hedef kaydı geçersiz.');
    const baseline={};
    for(const [id,points] of Object.entries(raw.baseline)) {
      if(!/^[\w-]{1,90}$/.test(id) || ['__proto__','constructor','prototype'].includes(id) || !Number.isSafeInteger(points) || points<0 || points>80000000) throw new Error('Ortak hedef başlangıç puanı geçersiz.');
      baseline[id]=points;
    }
    return {title:clean(raw.title,120),target:raw.target,enabled:raw.enabled,startedOn:raw.startedOn,baseline};
  }
  function hungerDays(student, now = Date.now()) {
    const latest = student.feeds.reduce((at, f) => Math.max(at, f.at), 0);
    // Legacy records have no creation timestamp; the first recorded day is the known baseline.
    const firstDay = Object.keys(student.days).sort()[0];
    const since = latest || student.createdAt || (firstDay ? new Date(firstDay + 'T00:00:00').getTime() : now);
    return Math.max(0, Math.floor((now - since) / 86400000));
  }
  function mood(student, date = dayKey()) {
    const day = student.days[date];
    if (day?.absent) return { id: 'resting', label: 'Dinleniyor', symbol: '☾', speed: 0.18, note: 'Bugün izinli. Görevleri değerlendirmeye alınmıyor.' };
    if (day?.tasks.some(t => t.status === 'missed')) return { id: 'sad', label: 'Biraz üzgün', symbol: '◡', speed: 0.3, note: 'Eksik görevini tamamlayınca yeniden canlanacak.' };
    if (student.feeds.some(f => f.day === date)) return { id: 'happy', label: 'Çok mutlu', symbol: '♡', speed: 1.1, note: 'Yemini yedi, keyifle yüzüyor!' };
    if (day?.tasks.some(t => t.status === 'done')) return { id: 'ready', label: 'Yemini bekliyor', symbol: '✦', speed: 0.7, note: 'Tamamlanan görevlerden kazandığın yemle besleyebilirsin.' };
    const previous = Object.keys(student.days).filter(d => d < date && !student.days[d].absent).sort().pop();
    if (previous && student.days[previous].tasks.some(t => t.status !== 'done')) return { id: 'sad', label: 'Biraz üzgün', symbol: '◡', speed: 0.3, note: 'Önceki görev günü eksik kalmış. Bugün yeni bir başlangıç!' };
    return { id: 'calm', label: 'Sakin', symbol: '≈', speed: 0.6, note: 'Görevlerini tamamla, yem kazan ve deniz dostunu besle.' };
  }
  // Strictly rebuild imported data; never merge untrusted object keys into application objects.
  function validate(raw) {
    if (!raw || raw.version !== 1 || !Array.isArray(raw.classes) || !raw.classes.length || raw.classes.length > 30) throw new Error('Geçerli bir akvaryum yedeği seçin.');
    const ids = new Set();
    const identifier = value => {
      if (typeof value !== 'string' || !/^[\w-]{1,90}$/.test(value) || ['__proto__', 'constructor', 'prototype'].includes(value) || ids.has(value)) throw new Error('Yedekte geçersiz veya tekrarlanan bir kayıt var.');
      ids.add(value); return value;
    };
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const classes = raw.classes.map(c => {
      if (!c || !clean(c.name) || !Array.isArray(c.students) || c.students.length > 60 || !Array.isArray(c.tasks) || c.tasks.length > 20) throw new Error('Sınıf kaydı geçersiz (en fazla 60 öğrenci, 20 görev).');
      const cls = { id: identifier(c.id), name: clean(c.name), theme: THEMES.some(t => t.id === c.theme) ? c.theme : 'reef', tasks: c.tasks.map(t => {
        if (!t || !clean(t.title, 120)) throw new Error('Görev başlığı eksik.');
        if (!validPoints(taskPoints(t))) throw new Error('Davranış puanı 1–1000 arasında tam sayı olmalıdır.');
        return { id: identifier(t.id), title: clean(t.title, 120), icon: taskIcon(t.icon), points: taskPoints(t) };
      }), students: [] };
      cls.students = c.students.map(s => {
        if (!s || !clean(s.name) || !s.days || typeof s.days !== 'object' || Array.isArray(s.days) || Object.keys(s.days).length > 4000 || !Array.isArray(s.feeds) || s.feeds.length > 80000) throw new Error('Öğrenci kaydı geçersiz.');
        const student = { id: identifier(s.id), name: clean(s.name), species: species(s.species).id, days: {}, feeds: [] };
        if(s.birthday != null) {
          if(!validBirthday(s.birthday)) throw new Error('Doğum günü için geçerli bir gün ve ay girin.');
          student.birthday={day:s.birthday.day,month:s.birthday.month};
        }
        if (s.createdAt !== undefined) {
          if (!Number.isFinite(s.createdAt) || s.createdAt < 0) throw new Error('Öğrenci kayıt tarihi geçersiz.');
          student.createdAt = s.createdAt;
        }
        for (const [date, d] of Object.entries(s.days)) {
          if (!datePattern.test(date) || !d || !Array.isArray(d.tasks) || d.tasks.length > 2000) throw new Error('Görev geçmişi geçersiz.');
          const seen = new Set();
          student.days[date] = { absent: Boolean(d.absent), tasks: d.tasks.map(t => {
            if (!t || typeof t.id !== 'string' || !/^[\w-]{1,90}$/.test(t.id) || seen.has(t.id) || !clean(t.title, 120) || !['pending', 'done', 'missed'].includes(t.status)) throw new Error('Görev sonucu geçersiz.');
            if (!validPoints(taskPoints(t))) throw new Error('Geçmiş davranış puanı geçersiz.');
            if (t.sourceId !== undefined && (typeof t.sourceId !== 'string' || !/^[\w-]{1,90}$/.test(t.sourceId) || ['__proto__','constructor','prototype'].includes(t.sourceId) || t.sourceId === t.id)) throw new Error('Davranış bağlantısı geçersiz.');
            if (t.awardedAt !== undefined && (!Number.isFinite(t.awardedAt) || t.awardedAt < 0)) throw new Error('Ödül zamanı geçersiz.');
            seen.add(t.id); return { id: t.id, title: clean(t.title, 120), icon: taskIcon(t.icon), points: taskPoints(t), status: t.status,
              ...(t.sourceId !== undefined ? {sourceId:t.sourceId} : {}), ...(t.awardedAt !== undefined ? {awardedAt:t.awardedAt} : {}) };
          }) };
        }
        student.feeds = s.feeds.map(f => {
          if (!f || !datePattern.test(f.day) || !Number.isFinite(f.at) || f.at < 0) throw new Error('Besleme kaydı geçersiz.');
          return { day: f.day, at: f.at, ...(f.creditReversed === true ? {creditReversed:true} : {}) };
        });
        return student;
      });
      if(c.growth !== undefined) {
        if (!c.growth || typeof c.growth.enabled !== 'boolean' || !validThresholds(c.growth.thresholds)) throw new Error('Büyüme için artan sırada 10 hedef puanı girin.');
        cls.growth = {enabled:c.growth.enabled, thresholds:[...c.growth.thresholds]};
      }
      if(c.teacher !== undefined) {
        if (!c.teacher || !clean(c.teacher.name) || typeof c.teacher.enabled !== 'boolean') throw new Error('Öğretmen balığı kaydı geçersiz.');
        cls.teacher = {name:clean(c.teacher.name), species:species(c.teacher.species).id, enabled:c.teacher.enabled};
      }
      if(c.goal !== undefined) cls.goal = validateGoal(c.goal);
      return cls;
    });
    return { version: 1, classes, activeClassId: classes.some(c => c.id === raw.activeClassId) ? raw.activeClassId : classes[0].id, settings: settingsOf(raw.settings) };
  }
  return { validBirthday, isBirthday, removeClass, TASK_ICONS, taskIcon, updateTask, behaviorChoices, awardBehavior, correctAward, growth, defaultThresholds, validThresholds, SPECIES, THEMES, uid, dayKey, clean, species, newClass, newStudent, initialState, ensureDay, earned, balance, setTask, feed, mood, validate, settingsOf, validPoints, taskPoints, completedCount, updateTaskPoints, completeAndFeed, hungerDays, rewardGroup, startGoal, goalProgress, validGoalTarget };
});
