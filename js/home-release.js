(function () {
  'use strict';
  const version = '2026-11-24';
  const key = 'kemal:home-release:' + version;
  const sections = [
    ['Akıllı Tahta ve PDF', '/ogretmen/beyaztahta.html', [
      'PDF dosyalarını cihazınızdan açın; birden fazla belge arasında sekmelerle geçin. Sayfalara yazın, çizin, görsel veya metin ekleyin; notları seçin, kopyalayın, yapıştırın ve silin.',
      'Tek sayfa, yan yana veya alt alta görünüm; kaydırarak sayfa geçişi, arama, yer imleri, sayfa ekleme, çoğaltma, sıralama ve silme. Klavye kısayolları, iki parmakla yakınlaştırma ve dokunmatik gezinme.',
      'Notlu PDF ve tekrar düzenlenebilir tahta dosyasını cihazınıza kaydedin. Sınırlı yerel saklama ile kaldığınız yerden devam edin; çevrimdışı kullanım paketini isteğe bağlı hazırlayın. PDF dosyaları buluta gönderilmez.',
      'Daha hafif çizim akışı, kesintisiz fosforlu ve karakalem izleri, yenilenen simgeler, daha geniş çalışma alanı ve başlangıçta kapalı renk paleti.'
    ]],
    ['Kum havuzu ve matematik araçları', '/ogretmen/beyaztahta.html', [
      'Sayfayı kaplayan kum zemini; tane boyutu, kum rengi ve karışık renk seçenekleri. Harfli veya serbest kum modu, büyük/küçük harfler, yazı kılavuzu, temizleme efekti ve harekete duyarlı ses.',
      'Taşınabilir cetvel, pergel ve iletki; sürüklenebilir tutamaklar, ayarlanabilir yarıçap ve açı kolları, cetvel döndürme derecesi. Çizimler aracın bulunduğu konumda oluşur.'
    ]],
    ['Sınıf içi tahta eklentileri', '/ogretmen/beyaztahta.html', [
      'Ajandadaki sınıflardan öğrenci seçimi ve grup oluşturma; artırılabilir takım sayısıyla puan tablosu.',
      'Baloncuklar, hareketli sütunlar ve geçmiş grafiğiyle ses seviyesi göstergesi; duyarlılık ayarları ve tam ekran. Mikrofon yalnızca izin verdiğinizde kullanılır, ses kaydedilmez.',
      'Okuma şeridi, odak ışığı, perde ve lazer gibi sunum araçları; yenilenen araç kutusu ve simgeler.'
    ]],
    ['Sınıf Akvaryumu', '/ogretmen/akvaryum.html?demo=1', [
      'Megalodon dahil yeni canlılar ve karakter koleksiyonu; daha doğal yüzüş, canlıya özgü sevinme hareketleri, resif bitkileri ve yeni sesler.',
      'Baloncuk Avı içinde 10 oyun, ikili karşılaşmalar, sınıf düzeyi ayarları ve cihazda ilk beş. Dokunmatik tahtalarda oyun girişleri ve arka plan işlem yükü iyileştirildi.',
      'Toplu davranış işlemleri, gelişim ve ödüller; Kayıp Gemi koleksiyonu, doğum günü kutlamaları ve takvim tebrikleri. Veliye özel haftalık Resif Postası için taslak, önizleme ve gönderim.'
    ]],
    ['Okuma ve Anlama', '/hizli-okuma/index.html', [
      'Okuma ve Anlama Akademisi, yeni çalışmalar ve içerik yönetimi. Okuma odağı, görünüm tercihleri, sayfalı okuma ve soru aktarımı.',
      'E-kitap okuyucusu, kitaplık ve Hece Akışı güncellendi. Karne merkezi ve arşiv yenilendi; otomatik gösterim temposu, ölçülen okuma hızından ayrı gösterilir.'
    ]],
    ['Öğretmen Ajandası', '/ogretmen-ajandasi/index.html', [
      'Yenilenen çalışma masası, haftalık plan, görevler ve yoklama görünümleri. Sınıf ve öğrenci listeleri diğer öğretmen araçlarıyla birlikte kullanılabilir.',
      'A4 önizleme, PDF/PNG/JPEG çıktıları, yazdırma ve paylaşma; otomatik kayıt, yedekleme uyarıları ve koyu tema iyileştirmeleri.'
    ]],
    ['Sınavlar ve hesap panelleri', '/sinav_sitesi/index.html', [
      'Yenilenen sınav çalışma alanı, soru ve seçenek düzenleyicisi; sınav sonuçları ve kazanım analizi.',
      'Öğretmen, öğrenci ve veli panellerinde role uygun sonuç ve okuma karnesi bağlantıları; öğretmen için sınıf ve öğrenci analizi.'
    ]],
    ['Fen ve geometri atölyeleri', '/ogretmen-araclari.html', [
      'Kuvvet ve yaylar laboratuvarı: 3B deneyler, dinamometre, ölçüm karşılaştırması ve beceri testi; 2B deney seçeneği.',
      'Hücre Laboratuvarı: mikroskop hazırlama, bitki/hayvan hücresi karşılaştırması, organeller ve hücreden organizmaya geçiş.',
      'Matematik Araçları menüsünden Birim Küpler, 3D Yapı Atölyesi, Cisim Açılımları ve Simetri Aynası. Uzun araç menülerinde alttaki seçeneklere erişim düzeltildi.'
    ]],
    ['Belge, poster ve kelime araçları', '/ogretmen-araclari.html', [
      'Belge Stüdyosu çalışma alanı ve düzenleme araçları yenilendi. Poster Yazıcı ile görselleri birden fazla kâğıda bölerek yazdırın.',
      'Kelime Avı; kelime paketleri, düzenleme, sesler, paylaşım ve çıktı seçenekleriyle yenilendi.'
    ]],
    ['Oyunlar ve saat', '/oyun/oyunlar.html', [
      'Ritmik Yılan 3D ve Roket Arena 3D oyunları eklendi; oyun kataloğu ve oyuncu seçimi güncellendi.',
      'Saat ve Sayaç; saat, sayaç ve arka plan seçeneklerini tek çalışma alanında birleştirir.'
    ]],
    ['Gezinme ve yönetim', '/ogretmen-araclari.html', [
      'Kısayol çubuğunda Ana Sayfa ve Sınıf Akvaryumu birlikte; yenilenen hizalama simgeleri ve Akıllı Tahta adı.',
      'Okuma Akademisi ve laboratuvar bağlantıları, site haritası ve yönetim menüsü güncellendi. Uzun yönetim menüleri kaydırılabilir; yetkili yöneticiler için reklam yönetimi ve ads.txt desteği eklendi.'
    ]]
  ];
  const triggers = Array.from(document.querySelectorAll('[data-release-open]'));
  if (!triggers.length) return;
  let dialog, lastFocus, previousOverflow, fallbackInert = [];
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function storage() {
    for (const name of ['localStorage', 'sessionStorage']) {
      try {
        const store = window[name];
        if (store.getItem(key)) return { seen: true, store };
        store.setItem(key + ':probe', '1');
        store.removeItem(key + ':probe');
        return { seen: false, store };
      } catch (_) { /* Private modes may disable persistent storage. */ }
    }
    return { seen: true, store: null };
  }
  function close() {
    if (!dialog?.hasAttribute('open')) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    document.body.style.overflow = previousOverflow;
    for (const [node, inert] of fallbackInert) node.inert = inert;
    fallbackInert = [];
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  }
  function create() {
    dialog = el('dialog', 'site-release-dialog');
    dialog.dataset.releaseVersion = version;
    dialog.setAttribute('aria-labelledby', 'homeReleaseTitle');
    dialog.setAttribute('aria-describedby', 'homeReleaseIntro');
    const header = el('header', 'site-release-header');
    const title = el('h2', '', 'Yenilikler'); title.id = 'homeReleaseTitle';
    const date = el('p', 'site-release-date', '24 Kasım 2026');
    const dismiss = el('button', 'site-release-dismiss', '×');
    dismiss.type = 'button'; dismiss.setAttribute('aria-label', 'Güncelleme notlarını kapat');
    dismiss.addEventListener('click', close);
    const titles = el('div'); titles.append(date, title); header.append(titles, dismiss);
    const content = el('div', 'site-release-content');
    content.tabIndex = 0; content.setAttribute('aria-label', 'Tüm güncelleme notları');
    const intro = el('p', 'site-release-intro', 'Sınıfınızda deneyebileceğiniz yeni araçlar ve son iyileştirmeler bir arada.');
    intro.id = 'homeReleaseIntro'; content.append(intro);
    for (const [label, href, items] of sections) {
      const section = el('section', 'site-release-section');
      const heading = el('h3'), link = el('a', '', label); link.href = href; heading.append(link);
      const list = el('ul');
      for (const item of items) list.append(el('li', '', item));
      section.append(heading, list); content.append(section);
    }
    const footer = el('footer', 'site-release-actions');
    const note = el('p', '', 'Bu sürümün duyurusu bu tarayıcıda bir kez açılır. Notlara “Yenilikleri gör” ile yeniden ulaşabilirsiniz.');
    const done = el('button', 'site-release-done', 'Anladım'); done.type = 'button'; done.addEventListener('click', close);
    footer.append(note, done); dialog.append(header, content, footer); document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) close();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(dialog.querySelectorAll('button,a[href],[tabindex="0"]'));
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  function open(manual = false) {
    const gate = storage();
    if (!manual && (gate.seen || document.hidden)) return;
    if (!dialog) create();
    if (dialog.hasAttribute('open')) return;
    lastFocus = manual ? document.activeElement : triggers[0];
    previousOverflow = document.body.style.overflow;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else {
      dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('open', '');
      fallbackInert = Array.from(document.body.children).filter(n => n !== dialog).map(n => [n, n.inert]);
      for (const [node] of fallbackInert) node.inert = true;
    }
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.site-release-content').scrollTop = 0;
    dialog.querySelector('.site-release-dismiss').focus({ preventScroll: true });
    try { gate.store?.setItem(key, '1'); } catch (_) { /* The dialog remains usable without storage. */ }
    document.removeEventListener('visibilitychange', automatic);
  }
  function automatic() { if (!document.hidden) open(); }
  for (const trigger of triggers) trigger.addEventListener('click', () => open(true));
  document.addEventListener('visibilitychange', automatic);
  automatic();
})();
