import { dateKey } from './model';

export type AgendaItem = { id: string; [key: string]: any };
export type AgendaState = { classes: AgendaItem[]; students: AgendaItem[]; exams: AgendaItem[]; calendarEvents: AgendaItem[]; scheduleItems: AgendaItem[]; activeClassId?: string; [key: string]: any };
export type AgendaRow = { agenda_state: AgendaState; lesson_planner_state: Record<string, any> | null; updated_at: string; client_updated_at?: string };
export type AgendaChange = { id: string; collection: 'calendarEvents' | 'students' | 'classes' | 'scheduleItems'; itemId: string; patch?: Record<string, unknown>; remove?: boolean; before?: Record<string, unknown> | null; createdAt: string }
  | { id: string; collection: 'classRename'; itemId: string; agendaId?: string; plannerId?: string; name: string; beforeName: string; beforePlannerName?: string; createdAt: string }
  | { id: string; collection: 'plannerCell'; itemId: string; classId: string; day: string; period: number; patch: { ders: string; isHoliday: boolean }; before?: Record<string, unknown> | null; createdAt: string };
export type ClassChoice = { id: string; name: string; agendaId?: string; plannerId?: string };
export type DailyLesson = { id: string; period: number; title: string; teacher?: string; time?: string; outcome?: string; process?: string; additional?: { kazanim?: string; surec?: string }[]; note?: string; holiday?: boolean; color?: LessonColor };
export type LessonColor = { fill: string; border: string; ink: string; label: string };
export type AgendaMarker = { id: string; kind: 'event' | 'birthday' | 'holiday' | 'schoolBreak'; title: string; detail?: string };
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
export const agendaCollections = ['classes', 'students', 'exams', 'calendarEvents', 'scheduleItems'] as const;
export function normalizeAgenda(value: unknown): AgendaState {
  const v = object(value) ? value : {};
  const state = { ...v } as AgendaState;
  for (const k of agendaCollections) state[k] = Array.isArray(v[k]) ? v[k].filter((x: unknown) => object(x) && typeof x.id === 'string') : [];
  return state;
}
export function normalizeAgendaRow(value: unknown): AgendaRow | null {
  if (!object(value) || !object(value.agenda_state) || typeof value.updated_at !== 'string') return null;
  return { agenda_state: normalizeAgenda(value.agenda_state), lesson_planner_state: object(value.lesson_planner_state) ? value.lesson_planner_state : null, updated_at: value.updated_at, client_updated_at: value.client_updated_at };
}
export function subjectKey(value: unknown) {
  return String(value || '').toLocaleUpperCase('tr-TR').replace(/[İI]/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/\s+/g, ' ').trim().replace('BEDEN EGITIMI VE OYUN', 'BEDEN EGITIMI').replace('SERBEST ETKINLIKLER', 'SERBEST ETKINLIK');
}
const lessonColorMap: Record<string, LessonColor> = {
  TURKCE: { fill: '#E7F2FF', border: '#9FC7EE', ink: '#1764A8', label: 'Türkçe' },
  MATEMATIK: { fill: '#FFF0D8', border: '#F5C879', ink: '#A85109', label: 'Matematik' },
  'HAYAT BILGISI': { fill: '#E7F8EB', border: '#A8DFB6', ink: '#287A3E', label: 'Hayat bilgisi' },
  'BEDEN EGITIMI': { fill: '#FCE4F2', border: '#EAAED1', ink: '#A32B70', label: 'Beden eğitimi ve oyun' },
  MUZIK: { fill: '#F1E8FF', border: '#C9ADEE', ink: '#7442A1', label: 'Müzik' },
  'GORSEL SANATLAR': { fill: '#FFF6D9', border: '#EED18B', ink: '#927000', label: 'Görsel sanatlar' },
  'SERBEST ETKINLIK': { fill: '#E1F7F7', border: '#99D9D8', ink: '#147679', label: 'Serbest etkinlikler' },
  ETUT: { fill: '#EEF2F8', border: '#CBD4E4', ink: '#4D5E78', label: 'Etüt' },
  'FEN BILIMLERI': { fill: '#EAF6E5', border: '#B8DCAC', ink: '#3E7C39', label: 'Fen bilimleri' },
  'SOSYAL BILGILER': { fill: '#FFF0D8', border: '#F4C377', ink: '#9A5A0C', label: 'Sosyal bilgiler' },
  INGILIZCE: { fill: '#EEF6DF', border: '#BFD89F', ink: '#527624', label: 'İngilizce' },
};
const defaultLessonColor: LessonColor = { fill: '#F1EEFA', border: '#D7CAE9', ink: '#624C90', label: 'Ders' };
export function lessonColor(value: unknown): LessonColor {
  const key = subjectKey(value);
  if (key.startsWith('ETUT')) return lessonColorMap.ETUT;
  return lessonColorMap[key] || defaultLessonColor;
}
const officialFixed = [
  ['01-01', 'Yılbaşı'], ['04-23', 'Ulusal Egemenlik ve Çocuk Bayramı'], ['05-01', 'Emek ve Dayanışma Günü'],
  ['05-19', 'Atatürk’ü Anma, Gençlik ve Spor Bayramı'], ['07-15', 'Demokrasi ve Millî Birlik Günü'],
  ['08-30', 'Zafer Bayramı'], ['10-28', 'Cumhuriyet Bayramı arifesi'], ['10-29', 'Cumhuriyet Bayramı'],
] as const;
const officialMoving: Record<number, { start: string; title: string; days: number }[]> = {
  2025: [{ start: '2025-03-30', title: 'Ramazan Bayramı', days: 3 }, { start: '2025-06-06', title: 'Kurban Bayramı', days: 4 }],
  2026: [{ start: '2026-03-20', title: 'Ramazan Bayramı', days: 3 }, { start: '2026-05-27', title: 'Kurban Bayramı', days: 4 }],
  2027: [{ start: '2027-03-09', title: 'Ramazan Bayramı', days: 3 }, { start: '2027-05-16', title: 'Kurban Bayramı', days: 4 }],
};
function officialFallback(date: string) {
  const fixed = officialFixed.find(([suffix]) => date.slice(5) === suffix);
  if (fixed) return fixed[1];
  const current = localDate(date);
  for (const holiday of officialMoving[current.getFullYear()] || []) {
    for (let day = 0; day < holiday.days; day++) if (shiftDate(holiday.start, day) === date) return holiday.title;
    if (shiftDate(holiday.start, -1) === date) return `${holiday.title} arifesi`;
  }
  return undefined;
}
export function agendaMarkers(row: AgendaRow | null, selected: string, classId?: string): AgendaMarker[] {
  if (!row || !Number.isFinite(localDate(selected).getTime())) return [];
  const out: AgendaMarker[] = [];
  for (const event of row.agenda_state.calendarEvents) if (event.date === selected && (!classId || !event.classId || event.classId === classId)) out.push({ id: `event:${event.id}`, kind: 'event', title: displayText(event.title, 160) || 'Ajanda notu', detail: displayText(event.time, 20) || undefined });
  for (const student of row.agenda_state.students) {
    const birth = typeof student.birthDate === 'string' ? student.birthDate.match(/^(?:\d{4}-)?(\d{2}-\d{2})$/)?.[1] : undefined;
    if (birth && birth === selected.slice(5) && (!classId || student.classId === classId)) out.push({ id: `birthday:${student.id}`, kind: 'birthday', title: `${displayText(student.firstName, 80) || 'Öğrenci'} ${displayText(student.lastName, 80) || ''}`.trim() + ' doğum günü', detail: 'Öğrenci doğum günü' });
  }
  const planner = row.lesson_planner_state;
  const configured = Array.isArray(planner?.tatiller) ? planner.tatiller : [];
  for (const holiday of configured) {
    const startDate = localDate(holiday?.start), endDate = localDate(holiday?.end || holiday?.start);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) continue;
    const start = dateKey(startDate), end = dateKey(endDate);
    if (!holiday?.disabled && start <= selected && selected <= end) out.push({ id: `holiday:${holiday.officialId || holiday.id || `${start}:${end}:${holiday.name}`}`, kind: holiday.source === 'tr-official' ? 'holiday' : 'schoolBreak', title: displayText(holiday.name, 160) || 'Tatil', detail: holiday.period === 'afternoon' ? 'Öğleden sonra tatil' : holiday.source === 'tr-official' ? 'Resmî tatil' : 'Okul takvimi' });
  }
  if (!out.some(item => item.kind === 'holiday')) {
    const title = officialFallback(selected);
    if (title) out.push({ id: `official:${selected}`, kind: 'holiday', title, detail: 'Resmî tatil' });
  }
  return out.slice(0, 8);
}
function classNameKey(value: unknown) {
  if (typeof value !== 'string') return '';
  const name = value.normalize('NFC').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();
  // Recognize only the complete grade/branch form. Keep branch letters such as
  // C/Ç distinct, and preserve longer/custom class names as exact names.
  const match = name.match(/^([1-9]|1[0-2])(?:\s*[-/]\s*|\s+)([A-ZÇĞİÖŞÜ])(?:\s+S[İI]N[İI]F[İI])?$/u);
  return match ? `grade:${match[1]}:${match[2]}` : name ? `name:${name}` : '';
}
export function agendaClassChoices(row: AgendaRow | null): ClassChoice[] {
  if (!row) return [];
  const classes = row.agenda_state.classes;
  const plannerClasses = Array.isArray(row.lesson_planner_state?.siniflar) ? row.lesson_planner_state!.siniflar.filter((x: unknown) => object(x) && typeof x.id === 'string') : [];
  const classKeys = classes.map(c => classNameKey(c.name));
  const rosterCounts = new Map<string, number>();
  for (const key of classKeys) if (key) rosterCounts.set(key, (rosterCounts.get(key) || 0) + 1);
  const plannersByName = new Map<string, AgendaItem[]>();
  for (const planner of plannerClasses) {
    const key = classNameKey(planner.name);
    if (key) plannersByName.set(key, [...(plannersByName.get(key) || []), planner]);
  }
  const choices: ClassChoice[] = classes.map((c, index) => {
    const key = classKeys[index], candidates = plannersByName.get(key) || [];
    // Duplicate normalized names on either side require an explicit choice.
    const linked = typeof c.plannerId === 'string' && plannerClasses.some(p => p.id === c.plannerId) && classes.filter(other => other.plannerId === c.plannerId).length === 1 ? c.plannerId : undefined;
    const plannerId = linked || (rosterCounts.get(key) === 1 && candidates.length === 1 ? candidates[0].id : undefined);
    return { id: c.id, name: String(c.name || 'Sınıfım'), agendaId: c.id, plannerId };
  });
  for (const p of plannerClasses) if (!choices.some(c => c.plannerId === p.id)) choices.push({ id: `planner:${p.id}`, name: String(p.name || 'Ders sınıfım'), plannerId: p.id });
  return choices;
}
const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const displayText = (value: unknown, max = 20000) => typeof value === 'string' ? value.slice(0, max) : undefined;
function localDate(raw: unknown) {
  const value = typeof raw === 'string' ? raw : '';
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!m || +m[1] < 1900 || +m[1] > 2200 || (value.length > 10 && !Number.isFinite(Date.parse(value)))) return new Date(NaN);
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : new Date(NaN);
}
export function shiftDate(raw: string, delta: number) { const d = localDate(raw); if (!Number.isFinite(d.getTime()) || !Number.isInteger(delta)) return dateKey(); d.setDate(d.getDate() + delta); return dateKey(d); }
function monday(raw: string) { const d = localDate(raw); if (!Number.isFinite(d.getTime())) return ''; d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dateKey(d); }
function planEntries(planner: Record<string, any>) { return Object.values(planner.yillikPlanlar || {}).flatMap(v => Array.isArray(v) ? v.filter(object) : []); }
export function schoolWeek(planner: Record<string, any>, selected: string): number | null {
  const target = monday(selected);
  if (!target) return null;
  // The desktop planner persists both its focussed date and the exact academic
  // week. This is authoritative when the user opens the same calendar week:
  // it preserves skipped school weeks (for example an ara tatil) and avoids a
  // simple calendar-week calculation labelling the same plan differently.
  const focussed = typeof planner.lastFocusDate === 'string' ? monday(planner.lastFocusDate) : '';
  const focussedWeek = Number(planner.currentWeek);
  if (focussed === target && Number.isInteger(focussedWeek) && focussedWeek >= 1 && focussedWeek <= (Number(planner.totalWeeks) || 60)) return focussedWeek;
  const entries = planEntries(planner);
  const dated = entries.filter(e => e.tarihStart && !Number.isNaN(localDate(e.tarihStart).getTime()));
  if (entries.some(e => e.tarihStart)) {
    const e = dated.find(e => monday(e.tarihStart) === target);
    const week = Number(e?.hafta);
    return Number.isInteger(week) && week >= 1 && week <= 60 ? week : null;
  }
  const d = localDate(selected), year = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  const start = new Date(year, 8, 8, 12); start.setDate(start.getDate() + (start.getDay() === 1 ? 0 : start.getDay() === 0 ? 1 : 8 - start.getDay()));
  const w = Math.round((localDate(target).getTime() - start.getTime()) / 604800000) + 1;
  return w >= 1 && w <= (Number(planner.totalWeeks) || 36) ? w : null;
}
function holiday(planner: Record<string, any>, date: string, period: number) {
  const configured = Number(planner.settings?.halfDayStartPeriod);
  const firstClosedPeriod = Number.isInteger(configured) && configured >= 1 && configured <= 10 ? configured : 5;
  return (Array.isArray(planner.tatiller) ? planner.tatiller : []).filter((h: any) => {
    const start = localDate(h?.start), end = localDate(h?.end || h?.start);
    return !h?.disabled && (h?.period !== 'afternoon' || period >= firstClosedPeriod) && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && date >= dateKey(start) && date <= dateKey(end);
  }).sort((a: any, b: any) => Number(a.period === 'afternoon') - Number(b.period === 'afternoon'))[0];
}
function dayOpen(planner: Record<string, any>, day: string) { return !['Sat', 'Sun'].includes(day) || planner.settings?.weekend?.[day]?.enabled === true; }
function planningOpen(planner: Record<string, any>, day: string) { return !['Sat', 'Sun'].includes(day) || planner.settings?.weekend?.[day]?.planOpen === true; }
export function dailyLessons(row: AgendaRow | null, selected: string, choice?: ClassChoice): { lessons: DailyLesson[]; week: number | null; datedPlan: boolean } {
  if (!row || !Number.isFinite(localDate(selected).getTime())) return { lessons: [], week: null, datedPlan: false };
  const planner = row.lesson_planner_state;
  const day = localDate(selected).getDay(), dayName = dayKeys[day];
  const program = choice?.plannerId && planner?.programs?.[choice.plannerId];
  if (planner && object(program)) {
    const week = schoolWeek(planner, selected);
    if (!dayOpen(planner, dayName)) return { lessons: [], week, datedPlan: planEntries(planner).some(e => e.tarihStart) };
    const cells = Array.isArray(program[dayName]) ? program[dayName] : [];
    const count = Math.min(10, Math.max(5, Number(planner.settings?.lessonCount) || 9));
    const lessons: DailyLesson[] = [];
    for (let i = 0; i < count; i++) {
      const holidayEntry = holiday(planner, selected, i + 1);
      const title = displayText(cells[i]?.ders, 200) || 'Etüt';
      const key = subjectKey(title);
      const weeklyKey = Object.keys(planner.yillikPlanlar || {}).find(k => subjectKey(k) === key);
      const entries = weeklyKey && Array.isArray(planner.yillikPlanlar[weeklyKey]) ? planner.yillikPlanlar[weeklyKey].filter(object) : [];
      let occurrence = 0;
      const start = monday(selected);
      for (let offset = 0; offset <= (day + 6) % 7; offset++) {
        const date = shiftDate(start, offset), d = dayKeys[localDate(date).getDay()];
        if (!dayOpen(planner, d) || !planningOpen(planner, d)) continue;
        const slots = Array.isArray(program[d]) ? program[d] : [];
        for (let r = 0; r < (d === dayName ? i : count); r++) if (!holiday(planner, date, r + 1) && subjectKey(slots[r]?.ders || 'Etüt') === key) occurrence++;
      }
      // A different subject's current plan must not make an old year's same
      // week number look current. Date metadata is matched per subject first.
      const weekly = entries.some(e => e.tarihStart)
        ? entries.filter(e => monday(e.tarihStart) === monday(selected))
        : entries.filter(e => Number(e.hafta) === week);
      const entry = week === null ? null : weekly.find((e: any) => Number.isFinite(e.slotStart) && Number.isFinite(e.slotCount) && occurrence >= e.slotStart && occurrence < e.slotStart + e.slotCount) || weekly[Math.min(occurrence, weekly.length - 1)] || (!entries.some((e: any) => e.hafta || e.tarihStart) ? entries[Math.min(Math.max(0, week - 1), entries.length - 1)] : null);
      const outputsOpen = !holidayEntry && planningOpen(planner, dayName);
      const additional = outputsOpen && Array.isArray(entry?.additionalOutcomes) ? entry.additionalOutcomes.filter(object).slice(0, 60).map(e => ({ kazanim: displayText(e.kazanim), surec: displayText(e.surec) })).filter(e => e.kazanim || e.surec) : [];
      const displayedTitle = holidayEntry ? displayText(holidayEntry.name, 200) || 'Resmî tatil' : title;
      lessons.push({ id: `${choice!.plannerId}:${dayName}:${i}`, period: i + 1, title: displayedTitle, color: holidayEntry ? { fill: '#FFF0F2', border: '#F3B5C0', ink: '#A33347', label: 'Resmî tatil' } : lessonColor(key), teacher: holidayEntry ? undefined : displayText(planner.dersOgretmenleri?.[key], 200), holiday: !!holidayEntry,
        outcome: !outputsOpen ? undefined : key.startsWith('ETUT') ? 'Etüt yapıldı' : displayText(entry?.kazanim),
        process: outputsOpen ? displayText(entry?.surec) : undefined, additional,
      });
    }
    return { lessons, week, datedPlan: planEntries(planner).some(e => e.tarihStart) };
  }
  const lessons = row.agenda_state.scheduleItems.filter(p => Number(p.day) === day && (!choice?.agendaId || p.classId === choice.agendaId)).map(p => { const title = displayText(p.lesson, 200) || 'Ders'; return ({ id: p.id, title, color: lessonColor(title), period: Math.min(10, Math.max(1, Number(p.period) || 1)), time: displayText(p.time, 100), note: displayText(p.note, 4000), teacher: displayText(p.teacher, 200) }); }).sort((a, b) => a.period - b.period);
  return { lessons, week: null, datedPlan: false };
}
export function applyAgendaChanges(row: AgendaRow, changes: AgendaChange[], enforceConflicts = true): AgendaRow {
  // Always apply small operations to the latest server document. Never replace unrelated records.
  const next: AgendaRow = JSON.parse(JSON.stringify(row));
  for (const op of changes) {
    if (op.collection === 'classRename') {
      const name = (displayText(op.name, 80) || '').trim();
      const roster = next.agenda_state.classes.find(c => c.id === op.agendaId);
      const planner = next.lesson_planner_state?.siniflar?.find((c: any) => c.id === op.plannerId);
      if (!name || (!roster && !planner) || (op.agendaId && !roster) || (op.plannerId && !planner)) throw new Error('Sınıf bulunamadı. Listeyi yenileyin.');
      if (enforceConflicts && ((roster && roster.name !== op.beforeName && roster.name !== name) || (planner && planner.name !== op.beforePlannerName && planner.name !== name))) throw new Error('Sınıf adı başka cihazda değiştirildi. Kaydın korunuyor.');
      if (roster) { roster.name = name; if (planner) roster.plannerId = planner.id; }
      if (planner) planner.name = name;
    } else if (op.collection === 'plannerCell') {
      const planner = next.lesson_planner_state;
      if (!planner?.programs?.[op.classId] || !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(op.day) || op.period < 0 || op.period > 9) throw new Error('Ders programı değişmiş. Programı yeniden açıp kontrol et.');
      const cells = planner.programs[op.classId][op.day] ||= [];
      const old = cells[op.period];
      if (enforceConflicts) for (const key of Object.keys(op.patch)) {
        if (JSON.stringify(old?.[key]) !== JSON.stringify(op.before?.[key]) && JSON.stringify(old?.[key]) !== JSON.stringify((op.patch as any)[key])) throw new Error('Bu ders başka bir cihazda değiştirildi. Bekleyen kaydın korunuyor.');
      }
      cells[op.period] = { ...old, ...op.patch };
    } else {
      const items = next.agenda_state[op.collection];
      const index = items.findIndex(p => p.id === op.itemId);
      const old = index >= 0 ? items[index] : undefined;
      if (op.remove) {
        if (enforceConflicts && old && op.before && JSON.stringify(old) !== JSON.stringify(op.before)) throw new Error('Bu kayıt başka bir cihazda değiştirildi. Silmeden önce yeniden kontrol et.');
        if (index >= 0) items.splice(index, 1);
        if (op.collection === 'students' || op.collection === 'classes') {
          const removedStudents = op.collection === 'students' ? [old || op.before].filter(object) : next.agenda_state.students.filter(s => s.classId === op.itemId);
          const nameKey = (name: string) => name.replace(/\s+/g, ' ').trim().toLocaleUpperCase('tr-TR');
          const names = new Set(removedStudents.map(s => nameKey(`${s.firstName || ''} ${s.lastName || ''}`)));
          const studentIds = new Set(op.collection === 'students' ? [op.itemId] : next.agenda_state.students.filter(s => s.classId === op.itemId).map(s => s.id));
          if (op.collection === 'classes') {
            next.agenda_state.students = next.agenda_state.students.filter(s => !studentIds.has(s.id));
            next.agenda_state.exams = next.agenda_state.exams.filter(e => e.classId !== op.itemId);
            next.agenda_state.scheduleItems = next.agenda_state.scheduleItems.filter(e => e.classId !== op.itemId);
            next.agenda_state.calendarEvents = next.agenda_state.calendarEvents.filter(e => e.classId !== op.itemId);
            if (next.agenda_state.activeClassId === op.itemId) next.agenda_state.activeClassId = next.agenda_state.classes[0]?.id;
          }
          for (const exam of next.agenda_state.exams) {
            for (const id of studentIds) if (exam.results) delete exam.results[id];
            if (Array.isArray(exam.participants)) exam.participants = exam.participants.filter((p: any) => !studentIds.has(p.studentId));
            if (Array.isArray(exam.importWarnings?.missingStudentIds)) exam.importWarnings.missingStudentIds = exam.importWarnings.missingStudentIds.filter((id: string) => !studentIds.has(id));
            if (Array.isArray(exam.importWarnings?.noScoreNames)) exam.importWarnings.noScoreNames = exam.importWarnings.noScoreNames.filter((name: string) => !names.has(nameKey(name)));
          }
          for (const log of [next.agenda_state.birthdayReminderLog, next.agenda_state.birthdaySnoozeLog]) for (const key of Object.keys(log || {})) {
            if ([...studentIds].some(id => key.slice(5) === `${id}_today` || key.slice(5) === `${id}_before`)) delete log[key];
          }
        }
      } else {
        if (enforceConflicts && old && !op.before) for (const key of Object.keys(op.patch || {})) {
          if (JSON.stringify(old[key]) !== JSON.stringify(op.patch![key])) throw new Error('Bu kayıt başka bir cihazda değiştirildi. Bekleyen kaydın korunuyor.');
        }
        for (const key of Object.keys(op.patch || {})) {
          if (enforceConflicts && op.before && old && JSON.stringify(old[key]) !== JSON.stringify(op.before[key]) && JSON.stringify(old[key]) !== JSON.stringify(op.patch![key])) throw new Error('Bu kayıt başka bir cihazda değiştirildi. Bekleyen kaydın korunuyor.');
        }
        if (enforceConflicts && index < 0 && op.before) throw new Error('Bu kayıt başka bir cihazda kaldırılmış. Bekleyen kaydın korunuyor.');
        const value = { ...old, ...op.patch, id: op.itemId };
        if (index >= 0) items[index] = value; else items.push(value);
      }
    }
  }
  // Existing web clients compare this value. A slow/incorrect device clock must
  // never make an accepted native change appear older than its server base.
  if (changes.length) next.agenda_state.updatedAt = new Date(Math.max(Date.now(), Date.parse(row.updated_at) || 0, Date.parse(row.client_updated_at || '') || 0, Date.parse(row.agenda_state.updatedAt || '') || 0) + 1).toISOString();
  return next;
}
export function agendaBytes(value: unknown) {
  // Hermes does not need a TextEncoder polyfill just to enforce the server limit.
  const text = JSON.stringify(value); let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { bytes += 4; i++; }
    else bytes += 3;
  }
  return bytes;
}
export function emptyAgendaRow(teacherName: string): AgendaRow {
  return { agenda_state: normalizeAgenda({ teacher: { name: teacherName, schoolName: '' } }), lesson_planner_state: null, updated_at: '' };
}
export function agendaCache(row: AgendaRow): AgendaRow {
  // Do not persist photos, addresses, health or family details in the native display cache.
  const a = row.agenda_state;
  return { ...row, agenda_state: normalizeAgenda({ teacher: { name: a.teacher?.name }, classes: a.classes.map(c => ({ id: c.id, name: c.name })), activeClassId: a.activeClassId,
    students: a.students.map(s => ({ id: s.id, classId: s.classId, firstName: s.firstName, lastName: s.lastName, schoolNo: s.schoolNo, detailsUnavailable: true })),
    exams: a.exams.map(e => ({ id: e.id, name: e.name })), calendarEvents: a.calendarEvents, scheduleItems: a.scheduleItems }) };
}
