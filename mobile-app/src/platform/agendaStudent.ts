export function studentText(value: unknown, limit = 6000): string {
  return typeof value === 'string' ? value.slice(0, limit) : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}
export function studentPhoto(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (/^data:image\/(png|jpe?g|webp);base64,[a-z\d+/=\s]+$/i.test(value) && value.length < 3 * 1024 * 1024) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
export function parentPhone(value: unknown) {
  const raw = studentText(value, 80).trim();
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^0\d{10}$/.test(digits)) digits = '90' + digits.slice(1);
  else if (/^[1-9]\d{9}$/.test(digits)) digits = '90' + digits;
  if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
  return { call: `tel:+${digits}`, whatsapp: `https://wa.me/${digits}` };
}

export function studentExamResult(exam: Record<string, any>, studentId: string): Record<string, any> | null {
  const result = exam.results?.[studentId];
  const percent = result?.total?.percent;
  if (!result || typeof result !== 'object' || Array.isArray(result) || typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  const subjects = Object.values(result.subjects || {}) as Record<string, any>[];
  if (subjects.length && !subjects.some(item => item && ['d','y','b'].every(key=>Number.isSafeInteger(item[key]) && item[key]>=0) && item.d+item.y+item.b>0)) return null;
  return result;
}

export const familyFields = [
  ['motherName', 'Anne adı'], ['motherJob', 'Anne mesleği'], ['motherPhone', 'Anne telefonu'], ['motherStatus', 'Anne durumu'],
  ['fatherName', 'Baba adı'], ['fatherJob', 'Baba mesleği'], ['fatherPhone', 'Baba telefonu'], ['fatherStatus', 'Baba durumu'],
  ['parentsMaritalStatus', 'Anne-baba birliktelik durumu'], ['custodyInfo', 'Velayet bilgisi'],
  ['backupContactName', 'Diğer yakının adı'], ['backupContactPhone', 'Diğer yakının telefonu'], ['backupContactRelation', 'Yakınlık'],
  ['siblingCount', 'Kardeş sayısı'], ['schoolTransport', 'Okula ulaşım'], ['homeOwnership', 'Ev durumu'],
  ['householdSize', 'Evde yaşayan kişi sayısı'], ['studyRoomStatus', 'Çalışma alanı'],
  ['studentAchievements', 'Başarılar'], ['specialPrograms', 'Özel programlar']
] as const;
