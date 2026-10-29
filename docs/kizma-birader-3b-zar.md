# Kızma Birader: tahta üzerinde 3B zar

28 Ekim 2026, yerel değişiklik. Canlıya gönderilmedi.

- `js/kizma-birader-dice.js`, matematik araçlarının `chance-studio.js` yönelim/sekme hesaplarını kullanır. Tek bir yuvarlatılmış, benekleri sabit küp mevcut Three.js tahta sahnesine eklenir; ek WebGL bağlamı/canvas oluşturulmaz.
- Zemin teması, dönük küpün destek yüksekliğiyle hesaplanır. Azalan sıçramalar ve yavaşlayan yatay hareket, fizik hissi veren zamana bağlı bir animasyondur; genel amaçlı rijit cisim çarpışma motoru değildir. Zar için yol/su dışındaki açık çim şeridi ayrılmıştır.
- Oyun sonucunu mevcut `dengeliZarAt()` bir kez belirler. Görsel üst yüz bu sayıya döner; rastgele yüz değiştirme kaldırılmıştır. Karşılıklı yüzler 7 eder. Hareket, şans/sıra/puan algoritmasını değiştirmez.
- Sonuç, hamle tamamlanana kadar tahtada kalır. Her temas için `chance-audio.js` ile plastik zar sesi; yalnızca zar sesini kapatan ayrı anahtar vardır. Diğer oyun sesleri değiştirilmez.
- Tahta ekran dışında kalırsa atış başında görünür alana getirilir. Telefon yönü değişince duran zar da yeni tahta koordinatlarına taşınır.
- Hareket azaltmada kısa geçiş; arka sekmede sonuca bağlama; tur iptalinde eski atışı etkisizleştirme vardır. WebGL kaybında aynı üst-yüz mantığıyla CSS 3B zar gösterilir ve oyun devam eder.

Kontrol: `node --test tests/kizma-birader-dice.test.cjs tests/chance-studio.test.cjs tests/chance-audio.test.cjs`.

Paylaşılan matematik aracı dosyaları bu görevde değiştirilmedi. Dağıtımda yeni zar dosyalarıyla birlikte `chance-studio.js` ve `chance-audio.js` dosyalarının da bulunması gerekir.
