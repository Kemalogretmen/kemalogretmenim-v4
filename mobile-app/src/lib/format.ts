export function displayName(profile?: { full_name?: string; first_name?: string; last_name?: string; email?: string } | null) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  return (profile?.full_name || name || profile?.email || 'Kullanıcı').trim();
}

export function shortDate(value?: string | null) {
  if (!value) return 'Tarih yok';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function roleLabel(role?: string) {
  if (role === 'teacher') return 'Öğretmen';
  if (role === 'parent') return 'Veli';
  return 'Öğrenci';
}
