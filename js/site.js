/* ================================================
   KEMAL ÖĞRETMENİM — SITE.JS v3.0
   ================================================ */
(function() {
  'use strict';
  const DATA_KEY = 'kemal_site_data';

  function getData() {
    try { const r = localStorage.getItem(DATA_KEY); return r ? JSON.parse(r) : getDefaultData(); }
    catch(e) { return getDefaultData(); }
  }

  function getDefaultData() {
    return {
      menuBadges: {},
      duyurular: [
        { id:1, metin:'🎉 Yeni 1. Sınıf Okuma Çalışmaları eklendi!', aktif:true },
        { id:2, metin:'📖 Hızlı Okuma sistemi artık yayında!', aktif:true }
      ],
      onecikarlar: [
        { id:1, baslik:'Hızlı Okuma Sistemi', aciklama:'Sınıfına göre metinleri seç, oku, karnen çıksın!', link:'/hizli-okuma/index.html', emoji:'📖', tarih:'2026-03-17', aktif:true },
        { id:2, baslik:'Eğitim Oyunları', aciklama:'Eğlenceli oyunlarla öğren!', link:'/oyun/oyunlar.html', emoji:'🎮', tarih:'2026-03-15', aktif:true },
        { id:3, baslik:'Yeni İçerikler', aciklama:'Sınıfına özel içerikler burada!', link:'/yeni.html', emoji:'🌟', tarih:'2026-03-10', aktif:true }
      ],
      yeniIcerikler: [
        { id:1, baslik:'1. Sınıf Hızlı Okuma', aciklama:'Yeni metinler eklendi.', link:'/hizli-okuma/index.html', emoji:'🚀', tarih:'2026-03-10', aktif:true }
      ],
      hizliErisim: [
        { id:1, baslik:'Hızlı Okuma', aciklama:'Sınıfına göre metin seç!', link:'/hizli-okuma/index.html', emoji:'📖', renk:'purple', aktif:true },
        { id:2, baslik:'Eğitim Oyunları', aciklama:'Eğlenceli oyunlarla öğren!', link:'/oyun/oyunlar.html', emoji:'🎮', renk:'coral', aktif:true }
      ],
      hakkimda: {
        isim:'Kemal Öğretmen', unvan:'21 Yıllık Öğretmen & Eğitim İçerik Üreticisi',
        metin:'Öğretmenlik hayatımın 21. yılında, her sabah sınıfa aynı inançla giriyorum.',
        istatistikler:[{sayi:'21+',etiket:'Yıl Deneyim'},{sayi:'5000+',etiket:'Öğrenci'},{sayi:'200+',etiket:'İçerik'}]
      },
      ekMenuler: []
    };
  }

  function buildNavbar(data) {
    const badges = data.menuBadges || {};
    function badge(key) { return badges[key] ? '<span class="new-badge">YENİ</span>' : ''; }

    return `<nav class="navbar" id="mainNav">
      <a href="/index.html" class="nav-logo">
        <img src="/gorseller/logo.png" alt="Kemal Öğretmenim" onerror="this.style.display='none'">
        Kemal Öğretmenim
      </a>
      <button class="hamburger" id="hamBtn" aria-label="Menüyü Aç/Kapat">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="navLinks">

        <li class="nav-item" data-grade="1">
          <button class="nav-btn">1. Sınıf ${badge('1sinif')}
            <svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>
          </button>
          <div class="dropdown-panel">
            <a href="/siniflar/1-sinif.html" class="dd-item dd-panel-link"><span class="dd-icon">🏠</span> 1. Sınıf Paneli</a>
            <div class="dd-sep"></div>
            <a href="/1_sinif/okuma_anlama/1_okuma_anlama.html" class="dd-item"><span class="dd-icon">📚</span> Eski Okuma Metinleri</a>
            <a href="/1_sinif/turkce/turkce.html" class="dd-item"><span class="dd-icon">📝</span> Türkçe</a>
            <a href="/1_sinif/matematik/matematik.html" class="dd-item"><span class="dd-icon">🔢</span> Matematik</a>
            <a href="/1_sinif/hayat_bilgisi/hayat_bilgisi.html" class="dd-item"><span class="dd-icon">🌱</span> Hayat Bilgisi</a>
          </div>
        </li>

        <li class="nav-item" data-grade="2">
          <button class="nav-btn">2. Sınıf ${badge('2sinif')}
            <svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>
          </button>
          <div class="dropdown-panel">
            <a href="/siniflar/2-sinif.html" class="dd-item dd-panel-link"><span class="dd-icon">🏠</span> 2. Sınıf Paneli</a>
            <div class="dd-sep"></div>
            <a href="/2_sinif/turkce/turkce.html" class="dd-item"><span class="dd-icon">📝</span> Türkçe</a>
            <a href="/2_sinif/matematik/matematik.html" class="dd-item"><span class="dd-icon">🔢</span> Matematik</a>
            <a href="/2_sinif/hayat_bilgisi/hayat_bilgisi.html" class="dd-item"><span class="dd-icon">🌱</span> Hayat Bilgisi</a>
          </div>
        </li>

        <li class="nav-item" data-grade="3">
          <button class="nav-btn">3. Sınıf ${badge('3sinif')}
            <svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>
          </button>
          <div class="dropdown-panel">
            <a href="/siniflar/3-sinif.html" class="dd-item dd-panel-link"><span class="dd-icon">🏠</span> 3. Sınıf Paneli</a>
            <div class="dd-sep"></div>
            <a href="/3_sinif/turkce/turkce.html" class="dd-item"><span class="dd-icon">📝</span> Türkçe</a>
            <a href="/3_sinif/matematik/matematik.html" class="dd-item"><span class="dd-icon">🔢</span> Matematik</a>
            <a href="/3_sinif/hayat_bilgisi/hayat_bilgisi.html" class="dd-item"><span class="dd-icon">🌱</span> Hayat Bilgisi</a>
            <a href="/3_sinif/fen_bilimleri/fen_bilimleri.html" class="dd-item"><span class="dd-icon">🔬</span> Fen Bilimleri</a>
          </div>
        </li>

        <li class="nav-item" data-grade="4">
          <button class="nav-btn">4. Sınıf ${badge('4sinif')}
            <svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>
          </button>
          <div class="dropdown-panel">
            <a href="/siniflar/4-sinif.html" class="dd-item dd-panel-link"><span class="dd-icon">🏠</span> 4. Sınıf Paneli</a>
            <div class="dd-sep"></div>
            <a href="/4_sinif/turkce/turkce.html" class="dd-item"><span class="dd-icon">📝</span> Türkçe</a>
            <a href="/4_sinif/matematik/matematik.html" class="dd-item"><span class="dd-icon">🔢</span> Matematik</a>
            <a href="/4_sinif/sosyal_bilgiler/sosyal_bilgiler.html" class="dd-item"><span class="dd-icon">🌍</span> Sosyal Bilgiler</a>
            <a href="/4_sinif/fen_bilimleri/fen_bilimleri.html" class="dd-item"><span class="dd-icon">🔬</span> Fen Bilimleri</a>
          </div>
        </li>

        <li class="nav-item" data-grade="orta">
          <button class="nav-btn">Ortaokul ${badge('ortaokul')}
            <svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>
          </button>
          <div class="dropdown-panel">
            <a href="/siniflar/ortaokul.html" class="dd-item dd-panel-link"><span class="dd-icon">🏠</span> Ortaokul Paneli</a>
            <div class="dd-sep"></div>
            <a href="/5_sinif/matematik/matematik.html" class="dd-item"><span class="dd-icon">🔢</span> 5. Sınıf Matematik</a>
            <a href="/5_sinif/fen_bilimleri/fen_bilimleri.html" class="dd-item"><span class="dd-icon">🔬</span> 5. Sınıf Fen</a>
            <a href="/6_sinif/matematik/matematik.html" class="dd-item"><span class="dd-icon">🔢</span> 6. Sınıf Matematik</a>
            <a href="/6_sinif/fen_bilimleri/fen_bilimleri.html" class="dd-item"><span class="dd-icon">🔬</span> 6. Sınıf Fen</a>
            <a href="/7_sinif/fen_bilimleri/matematik.html" class="dd-item"><span class="dd-icon">🔢</span> 7. Sınıf Matematik</a>
            <a href="/7_sinif/fen_bilimleri/fen_bilimleri.html" class="dd-item"><span class="dd-icon">🔬</span> 7. Sınıf Fen</a>
          </div>
        </li>

        <li class="nav-item" data-grade="hizli">
          <a href="/hizli-okuma/index.html" class="nav-btn nav-btn-okuma">📖 Hızlı Okuma ${badge('hizliokuma')}</a>
        </li>
        <li class="nav-item" data-grade="oyunlar">
          <a href="/oyun/oyunlar.html" class="nav-btn nav-btn-oyun">🎮 Oyunlar ${badge('oyunlar')}</a>
        </li>

        <li class="nav-item" data-grade="ogretmen">
          <button class="nav-btn">Öğretmen
            <svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>
          </button>
          <div class="dropdown-panel">
            <a href="/hakkimda.html" class="dd-item"><span class="dd-icon">👨‍🏫</span> Hakkımda</a>
            <a href="/iletisim.html" class="dd-item"><span class="dd-icon">✉️</span> İletişim</a>
            <a href="/yeni.html" class="dd-item"><span class="dd-icon">🌟</span> Yeni İçerikler</a>
          </div>
        </li>
      </ul>
    </nav>`;
  }

  function buildFooter() {
    return `<footer class="site-footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <h3>🌟 Kemal Öğretmenim</h3>
          <p>Eğitim sevgi ile başlar. Çocuklarımızın merakla öğrenmesi için buradayım.</p>
          <div class="social-row">
            <a href="https://instagram.com/kemalkogretmenim" target="_blank" rel="noopener" class="soc-btn">📸</a>
            <a href="https://youtube.com/@kemalkogretmenim"  target="_blank" rel="noopener" class="soc-btn">▶️</a>
            <a href="https://twitter.com/kemalkogretmen"    target="_blank" rel="noopener" class="soc-btn">🐦</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Sınıflar</h4>
          <ul class="footer-links">
            <li><a href="/siniflar/1-sinif.html">1. Sınıf</a></li>
            <li><a href="/siniflar/2-sinif.html">2. Sınıf</a></li>
            <li><a href="/siniflar/3-sinif.html">3. Sınıf</a></li>
            <li><a href="/siniflar/4-sinif.html">4. Sınıf</a></li>
            <li><a href="/siniflar/ortaokul.html">Ortaokul</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Keşfet</h4>
          <ul class="footer-links">
            <li><a href="/hizli-okuma/index.html">📖 Hızlı Okuma</a></li>
            <li><a href="/oyun/oyunlar.html">🎮 Oyunlar</a></li>
            <li><a href="/yeni.html">🌟 Yeni İçerikler</a></li>
            <li><a href="/hakkimda.html">Hakkımda</a></li>
            <li><a href="/iletisim.html">İletişim</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Kemal Öğretmen — Tüm Hakları Saklıdır. | <a href="https://www.kemalogretmenim.com.tr" style="color:inherit;">www.kemalogretmenim.com.tr</a></span>
        <span style="font-size:12px;">🌟 Eğitim Sevgi ile Başlar 🌟</span>
      </div>
    </footer>`;
  }

  function buildAnnounce(data) {
    const aktifler = (data.duyurular || []).filter(d => d.aktif);
    if (!aktifler.length) return '';
    const items = [...aktifler, ...aktifler].map(d => `<span class="announce-item"><span class="announce-dot"></span>${d.metin}</span>`).join('');
    return `<div class="announce-bar" id="announceBar"><div class="announce-track">${items}</div></div>`;
  }

  function initHamburger() {
    const btn = document.getElementById('hamBtn');
    const links = document.getElementById('navLinks');
    if (!btn || !links) return;
    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      links.classList.toggle('open');
      document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
    });
    links.querySelectorAll('.nav-item').forEach(item => {
      const navBtn = item.querySelector('.nav-btn:not(a)');
      if (!navBtn) return;
      navBtn.addEventListener('click', () => { if (window.innerWidth <= 1060) item.classList.toggle('open'); });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.navbar')) {
        btn.classList.remove('open');
        links.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  function highlightActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.dd-item, .nav-btn').forEach(a => {
      if (a.href && a.href.includes(path) && path !== '/') { a.style.color='var(--purple)'; a.style.fontWeight='800'; }
    });
  }

  function initScrollReveal() {
    const els = document.querySelectorAll('.grade-card, .qcard, .hstat');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.style.animation='slideUp .5s ease both'; obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
  }

  function init() {
    const data = getData();
    document.body.insertAdjacentHTML('afterbegin', buildAnnounce(data) + buildNavbar(data));
    document.body.insertAdjacentHTML('beforeend', buildFooter());
    initHamburger();
    highlightActiveLink();
    initScrollReveal();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

  window.kemalSite = {
    getData,
    saveData: function(d) { localStorage.setItem(DATA_KEY, JSON.stringify(d)); },
    resetData: function() { localStorage.removeItem(DATA_KEY); location.reload(); }
  };
})();
