import games from './games.json';

export type Category = 'all' | 'tools' | 'reading' | 'exams' | 'games' | 'lessons';
export type LearningModule = {
  id: string; title: string; description: string; path: string;
  category: Exclude<Category, 'all'>; icon: string; accent: string; subject?: string;
};

export const modules: LearningModule[] = [
  { id: 'agenda', title: 'Öğretmen Ajandası', description: 'Sınıflar, ders programı, takvim ve öğrenci takibi.', path: '/ogretmen-ajandasi/index.html', category: 'tools', icon: 'calendar-outline', accent: '#7654B7' },
  { id: 'whiteboard', title: 'Akıllı Tahta', description: 'Çiz, anlat ve birlikte keşfet. Parmağınla veya kaleminle.', path: '/ogretmen/beyaztahta.html', category: 'tools', icon: 'easel-outline', accent: '#348273' },
  { id: 'reading', title: 'Hızlı Okuma', description: 'Seviyene uygun metinler, süreli okuma ve anlama soruları.', path: '/hizli-okuma/index.html', category: 'reading', icon: 'book-outline', accent: '#7654B7' },
  { id: 'exams', title: 'Sınav Merkezi', description: 'Sınıfını seç, bilgini ölç ve sonuçlarını incele.', path: '/sinav_sitesi/index.html', category: 'exams', icon: 'document-text-outline', accent: '#A56B36' },
  { id: 'aquarium', title: 'Sınıf Akvaryumu', description: 'Sınıfını birlikte büyüttüğün bir öğrenme alanı.', path: '/ogretmen/akvaryum.html', category: 'tools', icon: 'fish-outline', accent: '#537CB4' },
  { id: 'math', title: 'Matematik Atölyesi', description: 'Kesirler, sayılar ve etkileşimli matematik araçları.', path: '/ogretmen/matematik.html', category: 'tools', icon: 'calculator-outline', accent: '#7654B7' },
  { id: 'timer', title: 'Kronometre', description: 'Ders ve etkinlikler için süreyi takip et.', path: '/ogretmen/kronometre.html', category: 'tools', icon: 'timer-outline', accent: '#A56B36' },
  { id: 'cubes', title: 'Birim Küpler', description: 'Yapılar kur, hacim ve uzamsal düşünmeyi keşfet.', path: '/ogretmen/birim-kup-uygulamasi.html', category: 'tools', icon: 'cube-outline', accent: '#348273' },
  { id: 'structures', title: '3D Yapı Atölyesi', description: 'Üç boyutlu tasarımlar ve etkileşimli yapılar.', path: '/ogretmen/3d-yapi-atolyesi.html', category: 'tools', icon: 'layers-outline', accent: '#537CB4' },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(grade => ({
    id: `grade-${grade}`, title: `${grade}. Sınıf`, description: 'Dersler, etkinlikler ve sınıfına uygun kaynaklar.',
    path: grade <= 4 ? `/siniflar/${grade}-sinif.html` : `/siniflar/ortaokul.html?sinif=${grade}`,
    category: 'lessons' as const, icon: 'school-outline', accent: '#537CB4',
  })),
  ...(games as LearningModule[]),
];

export const categories: { id: Category; label: string }[] = [
  { id: 'all', label: 'Tümü' }, { id: 'tools', label: 'Sınıf araçları' },
  { id: 'reading', label: 'Okuma' }, { id: 'exams', label: 'Sınavlar' },
  { id: 'games', label: 'Oyunlar' }, { id: 'lessons', label: 'Dersler' },
];

export function searchKey(value: string) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
}

export function filterModules(category: Category, query: string, favorites?: string[]) {
  const needle = searchKey(query.trim());
  return modules.filter(item => (category === 'all' || item.category === category)
    && (!favorites || favorites.includes(item.id))
    && (!needle || searchKey(`${item.title} ${item.description} ${item.subject || ''}`).includes(needle)));
}

export function moduleForPath(path: string) {
  const canonical = (p: string) => p.split(/[?#]/)[0].replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '');
  const target = new URL(path, 'https://kemalogretmenim.com.tr');
  return modules.find(item => canonical(item.path) === canonical(target.pathname)
    && [...new URL(item.path, target.origin).searchParams].every(([key, value]) => target.searchParams.get(key) === value));
}
