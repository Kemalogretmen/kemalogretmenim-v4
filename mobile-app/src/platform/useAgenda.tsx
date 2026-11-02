import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { usePlatform } from './PlatformContext';
import { AgendaChange, AgendaRow, AgendaState, agendaBytes, agendaCache, applyAgendaChanges, emptyAgendaRow, normalizeAgendaRow } from './agendaModel';
import { reconcileAgendaReminders, reminderPermission } from '@/services/notifications';
import { teacherAgendaReminders } from './reminderModel';

export type AgendaSnapshot = AgendaState;
type AgendaValue = { row: AgendaRow | null; snapshot: AgendaState | null; loading: boolean; syncing: boolean; error: string; pending: number; updatedAt: string; refresh: () => Promise<void>; change: (operation: AgendaChange) => Promise<boolean>; };
const Context = createContext<AgendaValue | null>(null);
export async function fetchAgendaRow(userId: string): Promise<AgendaRow | null> {
  const { data, error } = await supabase.from('teacher_agenda_states').select('agenda_state,lesson_planner_state,client_updated_at,updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data && (!data.agenda_state || !Array.isArray(data.agenda_state.classes) || !Array.isArray(data.agenda_state.students) || !Array.isArray(data.agenda_state.exams) || !normalizeAgendaRow(data))) throw new Error('Bulut ajandasının biçimi okunamadı. Mevcut kayıt korunuyor.');
  return normalizeAgendaRow(data);
}
export function AgendaProvider({ children }: PropsWithChildren) {
  const { profile, userId } = useAuth();
  const { online } = usePlatform();
  const teacher = !!userId && profile?.id === userId && profile.role === 'teacher' && profile.active !== false;
  const [loadedOwner, setLoadedOwner] = useState('');
  const [row, setRow] = useState<AgendaRow | null>(null);
  const [loading, setLoading] = useState(false), [syncing, setSyncing] = useState(false), [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const owner = useRef(userId); owner.current = userId;
  const mounted = useRef(true);
  const allowed = useRef(teacher); allowed.current = teacher;
  const connected = useRef(online); connected.current = online;
  const scope = `${userId || ''}:${teacher}`;
  const generation = useRef({ scope, epoch: 0 });
  if (generation.current.scope !== scope) generation.current = { scope, epoch: generation.current.epoch + 1 };
  const epoch = generation.current.epoch;
  const queue = useRef<AgendaChange[]>([]), server = useRef<AgendaRow | null>(null);
  const hydrated = useRef(false);
  const run = useRef<{ epoch: number; promise: Promise<void> } | null>(null);
  const disk = useRef<Promise<unknown>>(Promise.resolve());
  const key = `kemal.mobile.agenda.v2.${userId}`;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const owns = useCallback((uid: string, token: number) => mounted.current && owner.current === uid && allowed.current && generation.current.epoch === token, []);
  const commitQueue = useCallback((uid: string, token: number, transform: (previous: AgendaChange[]) => AgendaChange[]) => {
    const task = disk.current.catch(() => undefined).then(async () => {
      if (!owns(uid, token)) return false;
      const next = transform(queue.current);
      // No operation becomes sendable/acknowledged until its whole outbox is durable.
      await AsyncStorage.setItem(`kemal.mobile.agenda.v2.${uid}.pending`, JSON.stringify(next));
      if (!owns(uid, token)) return false;
      queue.current = next; setPending(next.length);
      return true;
    });
    disk.current = task;
    return task;
  }, [owns]);
  const refresh = useCallback(async () => {
    const uid = userId, token = epoch;
    if (!uid || !teacher || loadedOwner !== uid || !connected.current) return;
    if (run.current?.epoch === token) return run.current.promise;
    const task = (async () => {
      setLoading(true); setError('');
      try {
        // A teacher snapshot may contain photos and annual plans. Poll only its
        // revision when no edit is pending, instead of downloading it repeatedly.
        if (hydrated.current && server.current?.updated_at && queue.current.length === 0) {
          const revision = await supabase.from('teacher_agenda_states').select('updated_at').eq('user_id', uid).maybeSingle();
          if (!owns(uid, token)) return;
          if (revision.error) throw revision.error;
          if (revision.data?.updated_at === server.current.updated_at && queue.current.length === 0) return;
        }
        let latest = await fetchAgendaRow(uid);
        if (!owns(uid, token)) return;
        server.current = latest;
        hydrated.current = true;
        let tries = 0;
        while (queue.current.length) {
          if (!owns(uid, token)) return;
          if (!connected.current) break;
          setSyncing(true);
          const batch = [...queue.current];
          const base = latest || emptyAgendaRow(profile?.full_name || 'Öğretmenim');
          const next = applyAgendaChanges(base, batch);
          const bytes = agendaBytes({ agendaState: next.agenda_state, lessonPlannerState: next.lesson_planner_state });
          if (bytes > 6 * 1024 * 1024) throw new Error('Ajanda bulut sınırına ulaştı. Web ajandasından yedek alıp büyük fotoğrafları düzenle.');
          const payload = { agenda_state: next.agenda_state, lesson_planner_state: next.lesson_planner_state, client_updated_at: next.agenda_state.updatedAt, storage_bytes: bytes, app_version: 'mobile-0.6.2' };
          const query = latest
            ? supabase.from('teacher_agenda_states').update(payload).eq('user_id', uid).eq('updated_at', latest.updated_at)
            : supabase.from('teacher_agenda_states').insert({ ...payload, user_id: uid });
          const { data, error: saveError } = await query.select('agenda_state,lesson_planner_state,client_updated_at,updated_at').maybeSingle();
          if (!owns(uid, token)) return;
          if (saveError && saveError.code !== '23505') throw saveError;
          if (!data) {
            if (++tries > 4) throw new Error('Ajanda başka bir cihazda güncelleniyor. Bekleyen kayıtlar korundu; biraz sonra yeniden dene.');
            latest = await fetchAgendaRow(uid); if (!owns(uid, token)) return; continue;
          }
          latest = normalizeAgendaRow(data);
          if (!latest) throw new Error('Kaydetme yanıtı doğrulanamadı. Bekleyen kayıtlar yeniden kontrol edilecek.');
          server.current = latest;
          const ids = new Set(batch.map(p => p.id));
          // A failed disk acknowledgement retains the batch for an idempotent retry.
          if (!await commitQueue(uid, token, operations => operations.filter(p => !ids.has(p.id)))) return;
        }
        if (!owns(uid, token)) return;
        server.current = latest;
        setRow(queue.current.length ? applyAgendaChanges(latest || emptyAgendaRow(profile?.full_name || 'Öğretmenim'), queue.current, false) : latest);
        await AsyncStorage.setItem(`kemal.mobile.agenda.v2.${uid}.cache`, JSON.stringify(latest ? agendaCache(latest) : null));
      } catch (caught) {
        if (!owns(uid, token)) return;
        const text = caught instanceof Error ? caught.message : String((caught as any)?.message || caught);
        setError(/row-level|permission|42501/i.test(text) ? 'Hesabın ajandayı okuyor ancak yazma yetkisi henüz açık değil. Öğretmen onay durumunu Hesabım bölümünden kontrol et. Bekleyen kayıtların korunuyor.' : /fetch|network|failed to fetch/i.test(text) ? 'Buluta ulaşılamadı. Bağlantı gelince bekleyen kayıtlar yeniden gönderilecek.' : /disk|storage|quota|space|full/i.test(text) ? 'Cihaz kaydı yazılamadı. Bekleyen kayıtlar korunuyor; boş alanı kontrol et.' : text);
        setPending(queue.current.length);
        if (server.current || queue.current.length) {
          try { setRow(applyAgendaChanges(server.current || emptyAgendaRow(profile?.full_name || 'Öğretmenim'), queue.current, false)); } catch { setRow(server.current); }
        }
      } finally {
        if (owns(uid, token)) { setLoading(false); setSyncing(false); }
      }
    })();
    const running = { epoch: token, promise: task };
    run.current = running;
    await task;
    if (run.current === running) run.current = null;
  }, [userId, teacher, loadedOwner, profile?.full_name, epoch, owns, commitQueue]);
  useEffect(() => {
    let active = true;
    queue.current = []; server.current = null; hydrated.current = false; run.current = null;
    setLoadedOwner(''); setRow(null); setPending(0); setError(''); setLoading(false); setSyncing(false);
    if (!userId || !teacher) return;
    const uid = userId, token = epoch;
    void disk.current.catch(() => undefined).then(() => Promise.all([AsyncStorage.getItem(`${key}.pending`), AsyncStorage.getItem(`${key}.cache`)])).then(([rawQueue, rawCache]) => {
      if (!active || !owns(uid, token)) return;
      const pending = rawQueue ? JSON.parse(rawQueue) : [];
      queue.current = Array.isArray(pending) ? pending.filter(p => p && typeof p.id === 'string' && typeof p.itemId === 'string' && ['calendarEvents', 'students', 'classes', 'scheduleItems', 'plannerCell'].includes(p.collection)).slice(0, 1000) : [];
      let cached: AgendaRow | null = null;
      try { cached = normalizeAgendaRow(rawCache ? JSON.parse(rawCache) : null); } catch { /* a bad display cache cannot discard the outbox */ }
      server.current = cached;
      setRow(queue.current.length ? applyAgendaChanges(cached || emptyAgendaRow(profile?.full_name || 'Öğretmenim'), queue.current, false) : cached); setPending(queue.current.length);
    }).catch(() => { if (active && owns(uid, token)) setError('Ajandanın cihaz yedeği okunamadı. Bulut kaydın yeniden alınacak.'); }).finally(() => { if (active && owns(uid, token)) setLoadedOwner(uid); });
    return () => { active = false; };
  }, [userId, teacher, key, epoch, owns]);
  useEffect(() => {
    if (!userId || !teacher || loadedOwner !== userId || !online) return;
    void refresh();
    const subscription = supabase.channel(`mobile-agenda:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_agenda_states', filter: `user_id=eq.${userId}` }, () => { void refresh(); }).subscribe();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 20000);
    const focus = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { clearInterval(timer); focus.remove(); void supabase.removeChannel(subscription); };
  }, [userId, teacher, loadedOwner, online, refresh]);
  const change = useCallback(async (operation: AgendaChange) => {
    const uid = userId, token = epoch;
    if (!uid || !teacher || loadedOwner !== uid || !owns(uid, token)) return false;
    try {
      const saved = await commitQueue(uid, token, previous => {
        if (previous.some(item => item.id === operation.id)) return previous;
        if (previous.length >= 1000) throw new Error('Çok sayıda kayıt buluta gönderilmeyi bekliyor. Bağlantını kontrol edip yeniden dene.');
        const next = [...previous, operation];
        // Reject malformed operations before they enter durable storage.
        applyAgendaChanges(server.current || row || emptyAgendaRow(profile?.full_name || 'Öğretmenim'), next, false);
        return next;
      });
      if (!saved || !owns(uid, token)) return false;
      setError('');
      setRow(applyAgendaChanges(server.current || row || emptyAgendaRow(profile?.full_name || 'Öğretmenim'), queue.current, false));
      if (connected.current) void refresh();
      return true;
    } catch (caught) { if (owns(uid, token)) setError(/1000|Çok sayıda/.test(String((caught as Error).message)) ? String((caught as Error).message) : 'Cihaz kaydı yazılamadı. Plan kaydedilmedi; boş alanı kontrol et.'); return false; }
  }, [userId, teacher, loadedOwner, epoch, owns, commitQueue, refresh, row, profile?.full_name]);
  const visible = userId && loadedOwner === userId && teacher ? row : null;
  useEffect(() => {
    if (!userId || loadedOwner !== userId || !teacher) return;
    const update = () => reconcileAgendaReminders(userId, teacherAgendaReminders(visible?.agenda_state.calendarEvents)).catch(() => undefined);
    void update();
    // Permission can be enabled in Settings without changing the actual records.
    const focus = AppState.addEventListener('change', state => { if (state === 'active') void reminderPermission().then(update).catch(() => undefined); });
    return () => focus.remove();
  }, [userId, teacher, loadedOwner, visible]);
  const ready = !!userId && loadedOwner === userId && teacher;
  return <Context.Provider value={{ row: visible, snapshot: visible?.agenda_state || null, updatedAt: visible?.updated_at || '', pending: ready ? pending : 0, loading: ready && loading, syncing: ready && syncing, error: ready ? error : '', refresh, change }}>{children}</Context.Provider>;
}
export function useAgenda() { const value = useContext(Context); if (!value) throw new Error('AgendaProvider eksik'); return value; }
