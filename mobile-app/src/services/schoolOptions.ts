import { APP_CONFIG, webUrl } from '@/constants/config';
import { supabase } from '@/lib/supabase';

export type Option = {
  label: string;
  value: string;
};

export type SchoolOption = Option & {
  external?: boolean;
  name: string;
};

type CityRow = {
  name: string;
  plate?: string;
  counties?: string[];
};

const RAW_MEB_BASE = 'https://raw.githubusercontent.com/MehmetHuseyinDelipalta/MEB-Okul-Veritabani/main/T%C3%BCm%20Okullar';

let cityCache: Array<{ name: string; counties: string[] }> | null = null;
const schoolCache = new Map<string, Promise<SchoolOption[]>>();

export const roleOptions: Option[] = [
  { value: 'student', label: 'Öğrenci' },
  { value: 'parent', label: 'Veli' },
  { value: 'teacher', label: 'Öğretmen' },
];

export const gradeOptions: Option[] = Array.from({ length: 8 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: `${value}. Sınıf` };
});

export const branchOptions: Option[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({
  value: letter,
  label: letter,
}));

export const teacherBranchOptions: Option[] = [
  'Sınıf Öğretmeni',
  'Okul Öncesi',
  'İlkokul Genel',
  'Ortaokul Türkçe',
  'Ortaokul Matematik',
  'Ortaokul Fen Bilimleri',
  'Ortaokul Sosyal Bilgiler',
  'T.C. İnkılap Tarihi ve Atatürkçülük',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce',
  'Bilişim Teknolojileri',
  'Rehberlik',
  'Görsel Sanatlar',
  'Müzik',
  'Beden Eğitimi',
  'Özel Eğitim',
  'Lise Genel',
  'Genel',
].map((item) => ({ value: item, label: item }));

export const manualSchoolOption: SchoolOption = {
  value: '__manual_school__',
  label: 'Okulum listede yok',
  name: 'Okulum listede yok',
};

export function normalizePlace(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
}

function encodeSegment(value: string) {
  return encodeURIComponent(normalizePlace(value));
}

function districtUrl(city: string, district: string) {
  const cityName = normalizePlace(city);
  const districtName = normalizePlace(district);
  const fileName = `${cityName} - ${districtName} - Tüm Okullar.json`;
  return `${RAW_MEB_BASE}/${encodeSegment(cityName)}/${encodeSegment(districtName)}/${encodeURIComponent(fileName)}`;
}

function toSchoolOption(city: string, district: string, raw: Record<string, unknown>): SchoolOption | null {
  const name = String(raw.OKUL_ADI || raw.name || raw.okul || raw.school || '').trim();
  if (!name) return null;
  const code = String(raw.YOL || raw.HOST || name);
  const id = `meb:${normalizePlace(city)}|${normalizePlace(district)}|${normalizePlace(code)}`;
  return {
    value: id,
    label: name,
    name,
    external: true,
  };
}

function flattenMebSchools(payload: unknown, city: string, district: string) {
  const rows: SchoolOption[] = [];
  const cityKey = normalizePlace(city);
  const districtKey = normalizePlace(district);
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const firstKey = Object.keys(root)[0];
  const cityNode = root[cityKey] || (firstKey ? root[firstKey] : null);

  if (Array.isArray(cityNode)) {
    cityNode.forEach((item) => {
      const school = toSchoolOption(cityKey, districtKey, item as Record<string, unknown>);
      if (school) rows.push(school);
    });
  } else if (cityNode && typeof cityNode === 'object') {
    Object.entries(cityNode as Record<string, unknown>).forEach(([rawDistrict, value]) => {
      if (normalizePlace(rawDistrict) !== districtKey || !Array.isArray(value)) return;
      value.forEach((item) => {
        const school = toSchoolOption(cityKey, districtKey, item as Record<string, unknown>);
        if (school) rows.push(school);
      });
    });
  }

  const seen = new Set<string>();
  return rows
    .filter((school) => {
      const key = normalizePlace(school.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
}

export async function loadCities(): Promise<Option[]> {
  if (!cityCache) {
    const response = await fetch(webUrl('/data/turkey-cities.json'));
    if (!response.ok) throw new Error('Şehir listesi yüklenemedi.');
    const rows = await response.json() as CityRow[];
    cityCache = (Array.isArray(rows) ? rows : [])
      .map((city) => ({
        name: normalizePlace(city.name),
        counties: (city.counties || []).map(normalizePlace).sort((a, b) => a.localeCompare(b, 'tr-TR')),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  }
  return cityCache.map((city) => ({ value: city.name, label: city.name }));
}

export async function loadDistricts(city: string): Promise<Option[]> {
  if (!cityCache) await loadCities();
  const match = cityCache?.find((item) => item.name === normalizePlace(city));
  return (match?.counties || []).map((district) => ({ value: district, label: district }));
}

async function loadMebSchools(city: string, district: string) {
  const response = await fetch(districtUrl(city, district));
  if (!response.ok) return [];
  return flattenMebSchools(await response.json(), city, district);
}

export async function loadSchools(city: string, district: string): Promise<SchoolOption[]> {
  const normalizedCity = normalizePlace(city);
  const normalizedDistrict = normalizePlace(district);
  if (!normalizedCity || !normalizedDistrict) return [];
  const cacheKey = `${normalizedCity}|${normalizedDistrict}`;
  if (!schoolCache.has(cacheKey)) {
    schoolCache.set(cacheKey, (async () => {
      const external = await loadMebSchools(normalizedCity, normalizedDistrict).catch(() => []);
      if (external.length) return [...external, manualSchoolOption];

      const { data, error } = await supabase
        .from('schools')
        .select('id,name,type')
        .eq('city', normalizedCity)
        .eq('district', normalizedDistrict)
        .eq('active', true)
        .order('name', { ascending: true });
      if (error && APP_CONFIG.supabaseUrl) return [manualSchoolOption];
      const schools = (data ?? []).map((school) => ({
        value: String(school.id),
        label: `${school.name}${school.type ? ` - ${school.type}` : ''}`,
        name: String(school.name),
      }));
      return [...schools, manualSchoolOption];
    })());
  }
  return schoolCache.get(cacheKey) ?? [];
}
