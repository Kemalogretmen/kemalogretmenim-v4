import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/platform/PlatformContext';
import { Action, Icon, IconButton, Notice, Page, Panel, Section, Waiting } from '@/platform/components';
import { dateKey, weekDates } from '@/platform/model';
import { agendaClassChoices, agendaMarkers, AgendaChange, AgendaItem, AgendaMarker, AgendaRow, dailyLessons, DailyLesson, shiftDate } from '@/platform/agendaModel';
import { useAgenda } from '@/platform/useAgenda';
import { openActivity } from '@/platform/navigation';
import { DateTimeField } from '@/platform/DateTimeField';
import { requestReminderPermission } from '@/services/notifications';
import { ReminderSettings } from '@/platform/ReminderSettings';
import { usePersonalPlans } from '@/platform/usePersonalPlans';
import { validPlanDate } from '@/platform/personalPlanModel';

type Form = 'plan' | 'student' | 'class' | 'schedule' | null;
const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export default function Agenda() {
  const { profile, userId, email } = useAuth();
  const { palette, state, ready, update, online } = usePlatform();
  const cloud = useAgenda();
  const personal = usePersonalPlans();
  const params = useLocalSearchParams<{ date?: string; focusDate?: string; classId?: string; section?: string; studentId?: string }>();
  const routeSelection = useRef({ classKey: '', studentKey: '' });
  const teacher = profile?.role === 'teacher';
  const [selected, setSelected] = useState(dateKey());
  const [choiceId, setChoiceId] = useState('');
  const [mode, setMode] = useState<'day' | 'agenda' | 'students' | 'reports'>('day');
  const [studentId, setStudentId] = useState('');
  const [expandedExams, setExpandedExams] = useState<string[]>([]);
  const [editingLesson, setEditingLesson] = useState<DailyLesson | null>(null);
  const scheduleSource = useRef<AgendaRow | null>(null);
  const [adding, setAdding] = useState<Form>(null);
  const [title, setTitle] = useState(''), [time, setTime] = useState(''), [formDate, setFormDate] = useState(dateKey());
  const [lastName, setLastName] = useState(''), [schoolNo, setSchoolNo] = useState(''), [birthDate, setBirthDate] = useState('');
  const [remind, setRemind] = useState(false), [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState(1), [scheduleDay, setScheduleDay] = useState(1);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [agendaPreview, setAgendaPreview] = useState<{ date: string; markers: AgendaMarker[] } | null>(null);
  const choices = agendaClassChoices(cloud.row);
  const choice = choices.find(c => c.id === choiceId) || choices.find(c => c.agendaId === cloud.snapshot?.activeClassId) || choices[0];
  const flow = dailyLessons(cloud.row, selected, choice);
  // New mobile notes are deliberately class-independent. Older class-bound notes
  // remain visible in the personal agenda too, so no existing cloud record disappears.
  const events = teacher ? (cloud.snapshot?.calendarEvents || []).filter(e => e.date === selected && (mode === 'agenda' || !choice?.agendaId || !e.classId || e.classId === choice.agendaId)) : userId ? personal.plans.filter(p => p.date === selected) : state.plans.filter(p => p.date === selected);
  const sortedEvents = [...events].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const students = (cloud.snapshot?.students || []).filter(s => choice?.agendaId && s.classId === choice.agendaId).sort((a, b) => String(a.firstName || '').localeCompare(String(b.firstName || ''), 'tr'));
  const exams = (cloud.snapshot?.exams || []).filter(e => !!choice?.agendaId && e.classId === choice.agendaId).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const activeStudent = students.find(s => s.id === studentId);
  const canEdit = teacher && profile?.active !== false && (!profile.approval_status || profile.approval_status === 'active');
  const selectedMarkers = teacher ? agendaMarkers(cloud.row, selected, choice?.agendaId) : [];
  const markerIcon = (marker: AgendaMarker) => marker.kind === 'birthday' ? 'gift-outline' : marker.kind === 'holiday' ? 'flag-outline' : marker.kind === 'schoolBreak' ? 'school-outline' : 'sparkles-outline';
  const markerColor = (marker: AgendaMarker) => marker.kind === 'birthday' ? '#B36A25' : marker.kind === 'holiday' ? '#A33347' : marker.kind === 'schoolBreak' ? '#6A499A' : palette.primary;
  useFocusEffect(useCallback(() => { void cloud.refresh(); void personal.refresh(); }, [cloud.refresh, personal.refresh]));
  useEffect(() => {
    const date = validPlanDate(params.date) ? params.date : validPlanDate(params.focusDate) ? params.focusDate : undefined;
    if (date) setSelected(date);
    if (params.section === 'lessons') setMode('day');
    else if (params.section === 'students') setMode('students');
    else if (params.section === 'reports') setMode('reports');
  }, [params.date, params.focusDate, params.section]);
  useEffect(() => { setChoiceId(''); setStudentId(''); setExpandedExams([]); setAdding(null); routeSelection.current = { classKey: '', studentKey: '' }; }, [userId]);
  useEffect(() => {
    const requestedClass = typeof params.classId === 'string' ? params.classId : '';
    const classKey = `${userId || ''}:${requestedClass}`;
    const target = requestedClass ? choices.find(c => c.id === requestedClass || c.agendaId === requestedClass || c.plannerId === requestedClass) : undefined;
    if (target && routeSelection.current.classKey !== classKey) { setChoiceId(target.id); routeSelection.current.classKey = classKey; }
    const requestedStudent = typeof params.studentId === 'string' ? params.studentId : '';
    const studentKey = `${classKey}:${requestedStudent}`;
    if (!requestedStudent || routeSelection.current.studentKey === studentKey) return;
    const student = cloud.snapshot?.students.find(item => item.id === requestedStudent);
    const studentClass = student ? choices.find(c => c.agendaId === student.classId) : undefined;
    // A deep link selects only an existing student in its actual roster class.
    if (!student || !studentClass || (requestedClass && target?.agendaId !== student.classId)) return;
    setChoiceId(studentClass.id); setStudentId(student.id); routeSelection.current.studentKey = studentKey;
    if (params.section !== 'students') setMode('reports');
  }, [userId, params.classId, params.studentId, params.section, cloud.row]);
  useEffect(() => {
    let today = dateKey();
    const check = () => { const now = dateKey(); if (now !== today) { const before = today; setSelected(v => v === before ? now : v); today = now; } };
    const timer = setInterval(check, 60000), focus = AppState.addEventListener('change', s => { if (s === 'active') check(); });
    return () => { clearInterval(timer); focus.remove(); };
  }, []);
  function begin(form: Form) { if (form === 'schedule') scheduleSource.current = cloud.row; setEditingLesson(null); setTitle(''); setLastName(''); setSchoolNo(''); setBirthDate(''); setTime(''); setFormDate(selected); setRemind(false); setPeriod(1); setScheduleDay(new Date(`${selected}T12:00:00`).getDay()); setAdding(form); }
  function web(view: string, label: string, studentId?: string) {
    const params = new URLSearchParams({ mobileView: view, focusDate: selected, advanced: '1' });
    if (view === 'scheduleView') params.set('plannerTab', 'tab-yukle');
    if (choice?.agendaId) params.set('classId', choice.agendaId);
    if (studentId) params.set('studentId', studentId);
    openActivity(`/ogretmen-ajandasi/index.html?${params}`, label);
  }
  function editLesson(lesson: DailyLesson) {
    begin('schedule'); setEditingLesson(lesson); setTitle(lesson.title); setTime(lesson.time || ''); setPeriod(lesson.period);
  }
  async function ensureAgendaClass() {
    if (choice?.agendaId) return choice.agendaId;
    const classId = `class_${Crypto.randomUUID()}`;
    const y = new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0);
    const saved = await cloud.change({ id: Crypto.randomUUID(), itemId: classId, collection: 'classes', createdAt: new Date().toISOString(), patch: { name: choice?.name || 'Sınıfım', year: `${y}-${y + 1}`, teacherName: profile?.full_name || '' } });
    if (saved) { setChoiceId(classId); return classId; }
    return undefined;
  }
  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    let ok = false;
    const stamp = new Date().toISOString(), id = Crypto.randomUUID();
    if (!teacher) {
      if (adding === 'plan') {
        if (userId) ok = await personal.add({ date: formDate, time, title: title.trim().slice(0, 160), reminder: remind && time ? 0 : null });
        else { update(s => ({ ...s, plans: [...s.plans, { id, date: formDate, time, title: title.trim().slice(0, 160), done: false }] })); ok = true; }
      }
    } else {
      let op: AgendaChange | null = null;
      if (adding === 'plan') op = { id, itemId: `mobile_${id}`, collection: 'calendarEvents', createdAt: stamp, patch: { title: title.trim().slice(0, 160), date: formDate, time, classId: '', type: 'note', note: '', reminder: remind && time ? 'atTime' : '', done: false, remindedAt: '', createdAt: stamp } };
      if (adding === 'class') {
        const y = new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0);
        op = { id, itemId: `class_${id}`, collection: 'classes', createdAt: stamp, patch: { name: title.trim().slice(0, 80), year: `${y}-${y + 1}`, teacherName: profile?.full_name || '' } };
      }
      if (adding === 'student' && choice?.agendaId) op = { id, itemId: `student_${id}`, collection: 'students', createdAt: stamp, patch: { classId: choice.agendaId, firstName: title.trim().slice(0, 80), lastName: lastName.trim().toLocaleUpperCase('tr-TR').slice(0, 80), schoolNo: schoolNo.trim().slice(0, 20), birthDate, address: '', photo: '', photoFit: 'contain', photoX: 50, photoY: 50, family: {}, healthStatus: '', notes: [], meetings: [] } };
      if (adding === 'schedule') {
        if (choice?.plannerId) {
          const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][scheduleDay];
          const before = scheduleSource.current?.lesson_planner_state?.programs?.[choice.plannerId]?.[day]?.[period - 1] || null;
          op = { id, itemId: `${choice.plannerId}:${day}:${period - 1}`, classId: choice.plannerId, day, period: period - 1, collection: 'plannerCell', createdAt: stamp, before, patch: { ders: title.trim().toLocaleUpperCase('tr-TR').slice(0, 120), isHoliday: false } };
        } else if (choice?.agendaId) {
          const before = editingLesson ? scheduleSource.current?.agenda_state.scheduleItems.find(item => item.id === editingLesson.id && item.classId === choice.agendaId) : undefined;
          if (editingLesson && !before) { setSaving(false); return; }
          op = { id, itemId: before?.id || `lesson_${id}`, collection: 'scheduleItems', createdAt: stamp, ...(before ? { before } : {}), patch: { classId: choice.agendaId, day: scheduleDay, period, time, lesson: title.trim().slice(0, 120), ...(!before ? { group: '', room: '', color: 'lavender', note: '', createdAt: stamp } : {}) } };
        }
      }
      if (op) ok = await cloud.change(op);
    }
    setSaving(false);
    if (ok) { if (adding === 'plan') setSelected(formDate); setAdding(null); }
  }
  async function reminder(value: boolean) {
    if (!value) { setRemind(false); return; }
    const permission = await requestReminderPermission();
    if (!permission.granted) { Alert.alert('Bildirim izni gerekli', 'Cihaz ayarlarından bildirimlere izin vererek hatırlatıcıları açabilirsin.'); return; }
    setRemind(true);
  }
  function changeEvent(event: any, remove = false) {
    if (teacher) void cloud.change({ id: Crypto.randomUUID(), collection: 'calendarEvents', itemId: event.id, before: event, remove, ...(remove ? {} : { patch: { done: !event.done } }), createdAt: new Date().toISOString() });
    else if (userId) { if (remove) void personal.remove(event.id); else void personal.patch(event.id, { done: !event.done }); }
    else update(s => ({ ...s, plans: remove ? s.plans.filter(p => p.id !== event.id) : s.plans.map(p => p.id === event.id ? { ...p, done: !p.done } : p) }));
  }
  function lessonCard(lesson: DailyLesson) {
    const more = expanded.includes(lesson.id);
    const color = lesson.color || { fill: palette.soft, border: palette.line, ink: palette.primary, label: 'Ders' };
    return <Panel key={lesson.id}><View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: color.border, borderLeftWidth: 5, borderRadius: 16, backgroundColor: color.fill, padding: 12 }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: color.ink, fontSize: 18, fontWeight: '700' }}>{lesson.period}</Text></View>
      <View style={{ flex: 1, gap: 7 }}><Text style={{ color: color.ink, fontSize: 11, fontWeight: '700', letterSpacing: .5 }}>{lesson.holiday ? 'TAKVİM' : color.label.toLocaleUpperCase('tr-TR')}</Text><Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>{lesson.title}</Text>
      {canEdit && !lesson.holiday && <Pressable accessibilityRole="button" accessibilityLabel={`${lesson.period}. dersi düzenle`} onPress={() => editLesson(lesson)} style={{ alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon name="create-outline" size={15} /><Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }}>Dersi düzenle</Text></Pressable>}
      {!!(lesson.teacher || lesson.time) && <Text style={{ color: palette.muted, fontSize: 12 }}>{[lesson.time, lesson.teacher].filter(Boolean).join(' · ')}</Text>}
      {!!lesson.outcome && <Text numberOfLines={more ? undefined : 3} style={{ color: palette.text, fontSize: 14, lineHeight: 23 }}>{lesson.outcome}</Text>}
      {!!lesson.note && <Text style={{ color: palette.muted, lineHeight: 22 }}>{lesson.note}</Text>}
      {more && !!lesson.process && <><Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600', marginTop: 8 }}>SÜREÇ BİLEŞENLERİ</Text><Text style={{ color: palette.text, fontSize: 14, lineHeight: 23 }}>{lesson.process}</Text></>}
      {more && lesson.additional?.map((entry, i) => <View key={i} style={{ gap: 6, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12 }}><Text style={{ color: palette.text, lineHeight: 23 }}>{entry.kazanim}</Text>{!!entry.surec && <Text style={{ color: palette.muted, lineHeight: 22 }}>{entry.surec}</Text>}</View>)}
      {!!(lesson.outcome || lesson.process || lesson.additional?.length) && <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setExpanded(s => more ? s.filter(id => id !== lesson.id) : [...s, lesson.id])} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ color: palette.primary, fontWeight: '600', fontSize: 13 }}>{more ? 'Daha az göster' : 'Öğrenme çıktısı · Devamını gör'}</Text><Icon name={more ? 'chevron-up' : 'chevron-down'} size={16} /></Pressable>}
      </View></View></Panel>;
  }
  const inputStyle = { backgroundColor: palette.background, color: palette.text, minHeight: 54, padding: 16, borderRadius: 14, fontSize: 16 };
  const formTitle = adding === 'class' ? 'Sınıf oluştur' : adding === 'student' ? 'Öğrenci ekle' : adding === 'schedule' ? editingLesson ? `${period}. dersi düzenle` : 'Ders programına ekle' : 'Yeni plan';
  return <Page title={teacher ? 'Öğretmen Ajandam' : 'Ajanda'} subtitle={teacher ? mode === 'agenda' ? 'Kişisel takvim, özel günler ve hatırlatmalar.' : 'Ders programın, sınıfın ve öğrenme çıktıları.' : 'Planların ve hatırlatmaların bir arada.'} refresh={teacher ? cloud.refresh : personal.refresh} refreshing={teacher ? cloud.loading : personal.loading} action={<IconButton label="Bugüne dön" icon="today-outline" onPress={() => { setSelected(dateKey()); setMode('day'); }} />}>
    {teacher && <><View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name={cloud.pending ? 'cloud-upload-outline' : 'cloud-done-outline'} color={cloud.pending ? palette.primary : palette.green} size={17} /><Text style={{ color: palette.muted, fontSize: 12, flex: 1 }}>{cloud.syncing ? 'Buluta kaydediliyor…' : cloud.pending ? `${cloud.pending} kayıt eşitlenmeyi bekliyor` : cloud.updatedAt ? `${online ? 'Bulutla eşitlendi' : 'Cihazdaki son kayıt'} · ${new Date(cloud.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : cloud.loading ? 'Ajandan alınıyor…' : 'İlk kaydınla ajandanı oluştur'}</Text></View>
    {!!email && <View style={{ gap: 5, paddingHorizontal: 3 }}><Text selectable style={{ color: palette.text, fontSize: 13, fontWeight: '600' }}>{email}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>Sınıflar bu hesaba bağlıdır.</Text></View>}{!!cloud.error && <Notice text={cloud.error} />}{!canEdit && <Notice text="Öğretmen hesabının onayı tamamlandığında buluta yeni kayıt ekleyebilirsin. Mevcut ajandanı görüntüleyebilirsin." />}
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 5, gap: 3, borderRadius: 18, backgroundColor: palette.soft }}>{([{ id: 'day', label: 'Derslerim', icon: 'today-outline' }, { id: 'agenda', label: 'Ajanda', icon: 'calendar-outline' }, { id: 'students', label: 'Öğrenciler', icon: 'people-outline' }, { id: 'reports', label: 'Karneler', icon: 'ribbon-outline' }] as const).map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: mode === tab.id }} onPress={() => setMode(tab.id)} style={{ flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 14, backgroundColor: mode === tab.id ? palette.surface : 'transparent' }}><Icon name={tab.icon} size={18} color={mode === tab.id ? palette.primary : palette.muted} /><Text numberOfLines={1} style={{ color: mode === tab.id ? palette.primary : palette.muted, fontSize: 10, fontWeight: '600' }}>{tab.label}</Text></Pressable>)}</View>
    {mode !== 'agenda' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{choices.map(c => <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: c.id === choice?.id }} onPress={() => setChoiceId(c.id)} style={{ borderRadius: 15, borderWidth: 1, borderColor: palette.line, backgroundColor: c.id === choice?.id ? palette.soft : palette.surface, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 }}><Text style={{ color: c.id === choice?.id ? palette.primary : palette.text, fontWeight: '600' }}>{c.name}</Text></Pressable>)}<IconButton label="Sınıf oluştur" icon="add-circle-outline" onPress={() => canEdit ? begin('class') : undefined} /></ScrollView>}</>}
    {(mode === 'day' || mode === 'agenda') && <><Panel><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><IconButton label="Önceki gün" icon="chevron-back" onPress={() => setSelected(shiftDate(selected, -1))} /><View style={{ flex: 1, alignItems: 'center', gap: 4 }}><Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }}>{selected === dateKey() ? 'BUGÜN' : new Date(`${selected}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long' }).toLocaleUpperCase('tr-TR')}</Text><Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{new Date(`${selected}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View><IconButton label="Sonraki gün" icon="chevron-forward" onPress={() => setSelected(shiftDate(selected, 1))} /></View>
    <View style={{ flexDirection: 'row', gap: 3 }}>{weekDates(selected).map(d => { const markers = teacher ? agendaMarkers(cloud.row, d, mode === 'day' ? choice?.agendaId : undefined) : []; return <Pressable key={d} accessibilityRole="button" accessibilityLabel={new Date(`${d}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} accessibilityHint={markers.length ? `${markers.length} ajanda işareti var` : undefined} accessibilityState={{ selected: d === selected }} onPress={() => { setSelected(d); if (markers.length) setAgendaPreview({ date: d, markers }); }} style={{ flex: 1, minHeight: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: d === selected ? palette.primary : 'transparent' }}><Text style={{ color: d === selected ? palette.onPrimary : palette.muted, fontSize: 10 }}>{days[new Date(`${d}T12:00:00`).getDay()]}</Text><Text style={{ color: d === selected ? palette.onPrimary : palette.text, fontWeight: '600', fontSize: 16 }}>{Number(d.slice(-2))}</Text><View style={{ minHeight: 10, flexDirection: 'row', gap: 1 }}>{markers.slice(0, 2).map(marker => <Icon key={marker.id} name={markerIcon(marker)} size={10} color={d === selected ? palette.onPrimary : markerColor(marker)} />)}</View></Pressable>; })}</View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Pressable accessibilityRole="button" onPress={() => setSelected(shiftDate(selected, -7))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.primary, fontSize: 12 }}>← Önceki hafta</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelected(shiftDate(selected, 7))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.primary, fontSize: 12 }}>Sonraki hafta →</Text></Pressable></View><DateTimeField label="Tarihe git" mode="date" value={selected} onChange={setSelected} /></Panel>
    {mode === 'day' && teacher && <><Section title={flow.week ? `Derslerim · ${flow.week}. hafta` : 'Günün dersleri'} action="Ders ekle" onPress={() => canEdit && choice ? begin('schedule') : canEdit ? begin('class') : undefined} />{cloud.loading && !cloud.row ? <Waiting /> : flow.lessons.length ? flow.lessons.map(lessonCard) : <Panel><Icon name="book-outline" /><Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Bu gün için ders görünmüyor.</Text><Text style={{ color: palette.muted, lineHeight: 22 }}>{choice ? 'Günün programını ekleyebilir veya yıllık planlarını ajandaya yükleyebilirsin.' : 'Önce bir sınıf oluştur. Daha önceki web kayıtların için aynı öğretmen hesabıyla giriş yaptığını ve bulut eşitlemesini kontrol et.'}</Text>{canEdit && <Action label={choice ? 'Ders programını düzenle' : 'Sınıf oluştur'} secondary icon="add" onPress={() => choice ? begin('schedule') : begin('class')} />}</Panel>}{flow.datedPlan && flow.week === null && flow.lessons.length > 0 && <Notice text="Yüklenen yıllık planın tarihleri seçili haftayla eşleşmiyor. Yanlış haftanın öğrenme çıktılarını göstermemek için bu alan boş bırakıldı; yıllık plan dosyalarını kontrol et." />}</>}
    {(mode === 'agenda' || !teacher) && <>
    {!!userId && <ReminderSettings />}
    {teacher && <><Section title="Kişisel ajanda" action="Hatırlatma ekle" onPress={() => canEdit ? begin('plan') : undefined} />{selectedMarkers.filter(marker => marker.kind !== 'event').map(marker => <Panel key={marker.id}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name={markerIcon(marker)} color={markerColor(marker)} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: palette.text, fontWeight: '700' }}>{marker.title}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{marker.detail || 'Ajanda işareti'}</Text></View></View></Panel>)}</>}
    <Section title="Planlar ve hatırlatmalar" action="Plan ekle" onPress={() => !teacher || canEdit ? begin('plan') : undefined} />
    {!teacher && <Notice text={userId ? personal.error || (personal.pending ? `${personal.pending} plan buluta gönderilmeyi bekliyor. Cihaz kaydın korunuyor.` : 'Planların hesabınla buluta eşitlenir; diğer cihazlarında aynı hesapla erişebilirsin.') : 'Misafir planları bu cihazda saklanır. Bulut eşitleme için hesabınla giriş yap.'} />}
    {!sortedEvents.length ? <Panel><Text style={{ color: palette.muted, lineHeight: 22 }}>Bugüne bir okuma zamanı, toplantı veya küçük bir hatırlatma ekle.</Text><Action label="Plan ekle" secondary icon="add" onPress={() => begin('plan')} disabled={teacher && !canEdit} /></Panel> : sortedEvents.map(e => <Panel key={e.id}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable accessibilityRole="checkbox" accessibilityLabel={`${e.title} tamamlandı`} accessibilityState={{ checked: e.done === true, disabled: teacher && !canEdit }} disabled={teacher && !canEdit} onPress={() => changeEvent(e)} style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name={e.done ? 'checkmark-circle' : 'ellipse-outline'} color={e.done ? palette.green : palette.muted} /></Pressable><View style={{ flex: 1, gap: 6 }}><Text style={{ color: palette.text, fontSize: 15, lineHeight: 22, textDecorationLine: e.done ? 'line-through' : 'none' }}>{String(e.title || '')}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{e.time || 'Gün boyu'}{!!userId && 'reminder' in e && e.reminder !== '' && e.reminder != null ? ' · Hatırlatıcı açık' : ''}</Text></View><IconButton label={`${e.title} planını sil`} icon="trash-outline" onPress={() => (!teacher || canEdit) && Alert.alert('Planı sil?', userId ? 'Bu plan diğer cihazlarındaki ajandadan da kaldırılacak.' : 'Bu cihaz planı kaldırılacak.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => changeEvent(e, true) }])} /></View></Panel>)}
    {teacher && state.plans.length > 0 && <Panel><Text style={{ color: palette.text, fontWeight: '600' }}>Önceki sürümdeki cihaz planların</Text><Text style={{ color: palette.muted, lineHeight: 22 }}>{state.plans.length} plan bu cihazda korunuyor. Buluta kopyalayarak diğer cihazlarından da erişebilirsin.</Text><Action label="Cihaz planlarını buluta aktar" secondary disabled={!canEdit || cloud.loading} onPress={() => { void (async () => { let complete = true; for (const p of state.plans) { if (cloud.snapshot?.calendarEvents.some(e => e.id === `mobile_${p.id}`)) continue; const ok = await cloud.change({ id: Crypto.randomUUID(), collection: 'calendarEvents', itemId: `mobile_${p.id}`, createdAt: new Date().toISOString(), patch: { ...p, reminder: '', type: 'note', classId: '' } }); if (!ok) complete = false; } if (complete) update(s => ({ ...s, plans: [] })); })(); }} /></Panel>}
    </>}
    </>}
    {teacher && mode === 'students' && <><Section title={`${students.length} öğrenci`} action="Öğrenci ekle" onPress={() => canEdit ? choice?.agendaId ? begin('student') : begin('class') : undefined} />{!choice?.agendaId ? <Notice text="Bu ders sınıfı öğrenci listesiyle henüz eşleşmiyor. Öğrenci sınıfını seç veya aynı adla sınıf oluştur." /> : !students.length ? <Panel><Text style={{ color: palette.muted }}>Sınıfına ilk öğrencini ekleyebilirsin.</Text><Action label="Öğrenci ekle" secondary icon="person-add-outline" onPress={() => begin('student')} disabled={!canEdit} /></Panel> : students.map(s => <Pressable accessibilityRole="button" accessibilityLabel={`${s.firstName} ${s.lastName}, karne ve raporlar`} key={s.id} onPress={() => setStudentId(s.id)}><Panel><View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}><Icon name="person-outline" /><View style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>{String(s.firstName || '')} {String(s.lastName || '')}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{s.schoolNo ? `${s.schoolNo} · ` : ''}Karne ve akademik raporlar</Text></View><Icon name="chevron-forward" size={18} /></View></Panel></Pressable>)}</>}
    {teacher && mode === 'reports' && <><Section title="Sınavlar ve karneler" />{cloud.loading && !cloud.row ? <Waiting /> : !choice?.agendaId ? <Notice text="Karneleri görmek için öğrenci listesinin bulunduğu sınıfı seç." /> : !exams.length ? <Panel><Icon name="ribbon-outline" /><Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>{online ? 'Bu sınıfa ait sınav sonucu yok.' : 'Sınav ayrıntıları için internete bağlan.'}</Text><Text style={{ color: palette.muted, lineHeight: 22 }}>{online ? 'Sınav sonuçlarını eklediğinde öğrenci karneleri ve ders bazında başarı bilgileri burada görünecek.' : 'Cihazdaki ajandan korunuyor. Ayrıntılı sınav sonuçları bağlantı geldiğinde yeniden alınır.'}</Text><Action label="Sınav sonucu ekle" secondary icon="add" onPress={() => web('examsView', 'Sınav sonucu ekle')} disabled={!canEdit} /></Panel> : exams.map(exam => {
      const scored = students.filter(s => validResult(exam, s.id));
      const percentages = scored.map(s => validResult(exam, s.id)?.total?.percent).filter(finite);
      const average = percentages.length ? percentages.reduce((sum, n) => sum + n, 0) / percentages.length : undefined;
      const open = expandedExams.includes(exam.id);
      return <Panel key={exam.id}><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="document-text-outline" /></View><View style={{ flex: 1, gap: 7 }}><Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>{text(exam.name) || 'Sınav'}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{examDate(exam.date)} · {scored.length}/{students.length} öğrenci</Text></View></View>{finite(average) && <Text style={{ color: palette.primary, fontSize: 16, fontWeight: '600' }}>Sınıf başarı ortalaması %{number(average)}</Text>}<Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpandedExams(ids => open ? ids.filter(id => id !== exam.id) : [...ids, exam.id])} style={{ minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: palette.primary, fontWeight: '600' }}>{open ? 'Sonuçları kapat' : 'Öğrenci sonuçlarını gör'}</Text><Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>{open && (!scored.length ? <Text style={{ color: palette.muted, lineHeight: 22 }}>Bu sınıfın öğrencileriyle eşleşen sonuç bulunmuyor.</Text> : scored.map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`${text(s.firstName)} ${text(s.lastName)} karnesi`} onPress={() => setStudentId(s.id)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: palette.line, minHeight: 56, paddingVertical: 10 }}><Text style={{ color: palette.text, flex: 1, fontWeight: '500' }}>{text(s.firstName)} {text(s.lastName)}</Text><Text style={{ color: palette.primary, fontWeight: '700' }}>{percent(validResult(exam, s.id)?.total?.percent)}</Text><Icon name="chevron-forward" size={16} /></Pressable>))}</Panel>})}</>}
    {teacher ? <><Section title="Sınıfımı yönet" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[
      { label: 'Ders ekle', icon: 'time-outline', action: () => choice ? begin('schedule') : begin('class'), disabled: !canEdit },
      { label: 'Öğrenci ekle', icon: 'person-add-outline', action: () => choice?.agendaId ? begin('student') : begin('class'), disabled: !canEdit },
      { label: 'Kişisel ajanda', icon: 'calendar-outline', action: () => setMode('agenda'), disabled: false },
      { label: 'Sınıf oluştur', icon: 'add-circle-outline', action: () => begin('class'), disabled: !canEdit },
    ].map(item => <View key={item.label} style={{ flexGrow: 1, width: '45%' }}><Action label={item.label} icon={item.icon} secondary onPress={item.action} disabled={item.disabled} /></View>)}</View><Section title="Dosya ve çıktı araçları" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[['Yıllık plan yükle', 'scheduleView', 'cloud-upload-outline'], ['Sınav verisi ekle', 'examsView', 'document-attach-outline'], ['Karne ve PDF hazırla', 'reportsView', 'print-outline']].map(([label, view, icon]) => <View key={label} style={{ flexGrow: 1, width: '45%' }}><Action label={label} icon={icon} secondary onPress={() => web(view, label)} /></View>)}</View></> : <Action label="Öğretmen hesabıyla giriş yap" icon="log-in-outline" secondary onPress={() => router.push('/login')} />}
    <Modal visible={!!agendaPreview} transparent animationType="fade" onRequestClose={() => setAgendaPreview(null)}><Pressable accessibilityRole="button" accessibilityLabel="Ajanda özetini kapat" onPress={() => setAgendaPreview(null)} style={{ flex: 1, backgroundColor: '#0005', justifyContent: 'center', padding: 26 }}><Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: palette.surface, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: palette.line }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1, gap: 3 }}><Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{agendaPreview && new Date(`${agendaPreview.date}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>Ajandadaki işaretler</Text></View><IconButton label="Ajanda özetini kapat" icon="close" onPress={() => setAgendaPreview(null)} /></View>{agendaPreview?.markers.map(marker => <View key={marker.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: palette.line }}><Icon name={markerIcon(marker)} color={markerColor(marker)} /><View style={{ flex: 1, gap: 3 }}><Text style={{ color: palette.text, fontWeight: '600' }}>{marker.title}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{marker.detail || 'Ajanda işareti'}</Text></View></View>)}</Pressable></Pressable></Modal>
    <Modal visible={!!activeStudent} transparent animationType="slide" onRequestClose={() => setStudentId('')}><View style={{ flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' }}><SafeAreaView edges={['bottom']} style={{ backgroundColor: palette.surface, maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text accessibilityRole="header" style={{ color: palette.text, fontSize: 23, fontWeight: '700' }}>{text(activeStudent?.firstName)} {text(activeStudent?.lastName)}</Text><Text style={{ color: palette.muted, fontSize: 13 }}>{choice?.name}{text(activeStudent?.schoolNo) ? ` · No: ${text(activeStudent?.schoolNo)}` : ''}</Text></View><IconButton label="Öğrenci karnesini kapat" icon="close" onPress={() => setStudentId('')} /></View><Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>Akademik karnesi</Text>{activeStudent && exams.filter(exam => validResult(exam, activeStudent.id)).length ? exams.filter(exam => validResult(exam, activeStudent!.id)).map(exam => {
      const result = validResult(exam, activeStudent!.id)!;
      const subjects = result.subjects && typeof result.subjects === 'object' && !Array.isArray(result.subjects) ? Object.entries(result.subjects).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value)) : [];
      return <Panel key={exam.id}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}><View style={{ flex: 1, gap: 6 }}><Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{text(exam.name) || 'Sınav'}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{examDate(exam.date)}</Text></View><Text style={{ color: palette.primary, fontSize: 21, fontWeight: '700' }}>{percent(result.total?.percent)}</Text></View><Text style={{ color: palette.muted, lineHeight: 22 }}>{count(result.total?.d)} doğru · {count(result.total?.y)} yanlış · {count(result.total?.b)} boş</Text>{subjects.map(([name, value]: [string, any]) => <View key={name} style={{ gap: 6, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12 }}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Text style={{ color: palette.text, fontWeight: '600', flex: 1 }}>{name}</Text><Text style={{ color: palette.primary, fontWeight: '600' }}>{percent(value.percent)}</Text></View><Text style={{ color: palette.muted, fontSize: 12 }}>{count(value.d)} doğru · {count(value.y)} yanlış · {count(value.b)} boş</Text></View>)}</Panel>;
    }) : <Notice text={online ? "Bu öğrenciye ait kayıtlı sınav sonucu henüz yok. Sınav sonuçları eklendiğinde ders bazında başarı bilgileri burada görünecek." : "Ayrıntılı sınav sonuçları için internete bağlan. Cihazdaki öğrenci kaydın korunuyor."} />}<Action label="Karneyi PDF olarak hazırla" secondary icon="print-outline" onPress={() => { const id = activeStudent?.id; setStudentId(''); if (id) web('reportsView', 'Öğrenci karnesi', id); }} /></ScrollView></SafeAreaView></View></Modal>
    <Modal visible={adding !== null} transparent animationType="slide" onRequestClose={() => { if (!saving) setAdding(null); }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' }}><SafeAreaView edges={['bottom']} style={{ backgroundColor: palette.surface, maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: palette.text, fontSize: 21, fontWeight: '700', flex: 1 }}>{formTitle}</Text><IconButton label="Formu kapat" icon="close" onPress={() => { if (!saving) setAdding(null); }} /></View>
    {(adding === 'student' || adding === 'schedule') && <Text style={{ color: palette.primary, fontWeight: '600' }}>{choice?.name}</Text>}
    {adding === 'schedule' && <><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{[1, 2, 3, 4, 5, 6, 0].map(d => <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: scheduleDay === d }} onPress={() => setScheduleDay(d)} style={{ minWidth: 44, minHeight: 44, borderRadius: 13, paddingHorizontal: 14, backgroundColor: scheduleDay === d ? palette.primary : palette.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: scheduleDay === d ? palette.onPrimary : palette.text }}>{days[d]}</Text></Pressable>)}</ScrollView><Text style={{ color: palette.muted }}>Ders sırası</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{Array.from({ length: choice?.plannerId ? Math.min(10, Math.max(5, Number(cloud.row?.lesson_planner_state?.settings?.lessonCount) || 9)) : 10 }, (_, i) => i + 1).map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n}. ders`} accessibilityState={{ selected: period === n }} onPress={() => setPeriod(n)} style={{ minWidth: 44, minHeight: 44, borderRadius: 13, backgroundColor: period === n ? palette.primary : palette.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: period === n ? palette.onPrimary : palette.text }}>{n}</Text></Pressable>)}</ScrollView>{choice?.plannerId && <Notice text="Bu sıra mevcut derse aitse ders adı güncellenir. Diğer dersler ve yıllık planların korunur." />}</>}
    <TextInput accessibilityLabel={adding === 'class' ? 'Sınıf adı' : adding === 'student' ? 'Öğrenci adı' : adding === 'schedule' ? 'Ders adı' : 'Plan başlığı'} placeholder={adding === 'class' ? 'Sınıf adı · 3/A' : adding === 'student' ? 'Öğrencinin adı' : adding === 'schedule' ? 'Ders adı · Matematik' : 'Ne yapmak istiyorsun?'} placeholderTextColor={palette.muted} maxLength={adding === 'plan' ? 160 : 80} value={title} onChangeText={setTitle} style={inputStyle} />
    {adding === 'student' && <><TextInput accessibilityLabel="Öğrenci soyadı" placeholder="Soyadı" placeholderTextColor={palette.muted} value={lastName} onChangeText={setLastName} maxLength={80} style={inputStyle} /><TextInput accessibilityLabel="Okul numarası" placeholder="Okul numarası (isteğe bağlı)" placeholderTextColor={palette.muted} value={schoolNo} onChangeText={setSchoolNo} maxLength={20} keyboardType="number-pad" style={inputStyle} /><DateTimeField label="Doğum tarihi" mode="date" value={birthDate} onChange={setBirthDate} optional /></>}
    {adding === 'plan' && <DateTimeField label="Tarih" mode="date" value={formDate} onChange={setFormDate} />}
    {(adding === 'plan' || (adding === 'schedule' && !choice?.plannerId)) && <DateTimeField label="Saat" mode="time" value={time} onChange={setTime} optional />}
    {adding === 'plan' && !!userId && <><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Icon name="notifications-outline" /><View style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.text, fontWeight: '600' }}>Zamanı gelince hatırlat</Text><Text style={{ color: palette.muted, fontSize: 12, lineHeight: 19 }}>Saat seçtiğinde sistem bildirimi ve cihazın izin verdiği ses kullanılır.</Text></View><Switch accessibilityLabel="Hatırlatıcı" value={remind} onValueChange={v => { void reminder(v); }} trackColor={{ true: palette.primary }} /></View>{remind && !time && <Notice text="Hatırlatıcı için bir saat seç." />}</>}
    {!!(teacher ? cloud.error : personal.error) && <Notice text={teacher ? cloud.error : personal.error} />}
    <Action label={saving ? 'Kaydediliyor…' : userId ? online ? 'Kaydet ve eşitle' : 'Kaydet · Bağlantıda eşitle' : 'Cihaza kaydet'} onPress={() => { void save(); }} disabled={!title.trim() || !ready || saving || (teacher && !canEdit) || (remind && !time)} />
    </ScrollView></SafeAreaView></KeyboardAvoidingView></Modal>
  </Page>;
}

function text(value: unknown) { return typeof value === 'string' ? value.slice(0, 300) : typeof value === 'number' && Number.isFinite(value) ? String(value) : ''; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function number(value: number) { return value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }); }
function percent(value: unknown) { return finite(value) ? `%${number(value)}` : '—'; }
function count(value: unknown) { return finite(value) && value >= 0 ? number(value) : '—'; }
function examDate(value: unknown) { if (!validPlanDate(value)) return 'Tarih belirtilmedi'; return new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); }
function validResult(exam: AgendaItem, studentId: string): Record<string, any> | null {
  const result = exam.results?.[studentId];
  return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
}
