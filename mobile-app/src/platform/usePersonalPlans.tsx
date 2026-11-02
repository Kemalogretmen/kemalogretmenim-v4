import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { reconcileAgendaReminders } from '@/services/notifications';
import { usePlatform } from './PlatformContext';
import { applyPlanOperation, normalizePersonalPlan, optimisticPlans, PersonalPlan, PersonalPlanInput, PersonalPlanOperation, PersonalPlanPatch, planColumns, planFields, restorePlanOperations, validatePlanPatch } from './personalPlanModel';

export type { PersonalPlan, PersonalPlanInput, PersonalPlanPatch } from './personalPlanModel';
type Value = { plans: PersonalPlan[]; loading: boolean; error: string; pending: number; refresh: () => Promise<void>; add: (input: PersonalPlanInput) => Promise<boolean>; patch: (id: string, patch: PersonalPlanPatch) => Promise<boolean>; remove: (id: string) => Promise<boolean> };
const Context = createContext<Value | null>(null);
const CACHE = 'kemal.mobile.personal-plans.v1.';
async function fetchPlans(userId: string) {
  const plans: PersonalPlan[] = [];
  for (let start = 0; start < 10000; start += 1000) {
    const { data, error } = await supabase.from('mobile_personal_plans').select(planColumns).eq('user_id', userId).order('id').range(start, start + 999);
    if (error) throw error;
    for (const row of data || []) { const plan = normalizePersonalPlan(row); if (plan) plans.push(plan); }
    if (!data || data.length < 1000) return plans;
  }
  throw new Error('Plan arşivin cihaz sınırına ulaştı. Bekleyen kayıtların korunuyor.');
}
async function fetchPlan(userId: string, id: string) {
  const { data, error } = await supabase.from('mobile_personal_plans').select(planColumns).eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return normalizePersonalPlan(data);
}

export function PersonalPlansProvider({ children }: PropsWithChildren) {
  const { userId, profile } = useAuth();
  const { online } = usePlatform();
  const enabled = !!userId && !!profile && profile.id === userId && profile.role !== 'teacher' && profile.active !== false;
  const owner = useRef(userId); owner.current = userId;
  const scope = `${userId || ''}:${enabled}`;
  const generation = useRef({scope, epoch: 0});
  if (generation.current.scope !== scope) generation.current = {scope, epoch: generation.current.epoch + 1};
  const epoch = generation.current.epoch;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current.epoch++; }; }, []);
  const ownsAccount = useCallback((uid: string, token: number) => mounted.current && owner.current === uid && generation.current.epoch === token, []);
  const enabledRef = useRef(enabled); enabledRef.current = enabled;
  const queue = useRef<PersonalPlanOperation[]>([]), server = useRef<PersonalPlan[]>([]);
  const disk = useRef(Promise.resolve()), running = useRef<Promise<void> | null>(null);
  const [loadedOwner, setLoadedOwner] = useState(''), [plans, setPlans] = useState<PersonalPlan[]>([]);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [pending, setPending] = useState(0);
  const writeQueue = useCallback((uid: string, operations: PersonalPlanOperation[]) => {
    const text = JSON.stringify(operations);
    const task = disk.current.catch(() => undefined).then(() => AsyncStorage.setItem(`${CACHE}${uid}.outbox`, text));
    disk.current = task; return task;
  }, []);
  const refresh = useCallback(async () => {
    const uid = userId, token = epoch;
    if (!uid || !enabled || loadedOwner !== uid || !online) return;
    if (running.current) return running.current;
    const owns = () => ownsAccount(uid, token) && enabledRef.current;
    const task = (async () => {
      setLoading(true); setError('');
      try {
        const rows = await fetchPlans(uid);
        if (!owns()) return;
        server.current = rows;
        while (queue.current.length) {
          if (!owns()) return;
          const operation = queue.current[0];
          let latest = rows.find(plan => plan.id === operation.itemId) || null;
          let saved: PersonalPlan | null = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            if (!owns()) return;
            const next = applyPlanOperation(latest, operation);
            // Idempotent retry after a successful remote write but local-disk failure.
            if (latest && JSON.stringify(planFields(latest)) === JSON.stringify(planFields(next))) { saved = latest; break; }
            const query = latest
              ? supabase.from('mobile_personal_plans').update(planFields(next)).eq('user_id', uid).eq('id', operation.itemId).eq('updated_at', latest.updatedAt)
              : supabase.from('mobile_personal_plans').insert({ ...planFields(next), id: operation.itemId, user_id: uid });
            const { data, error: saveError } = await query.select(planColumns).maybeSingle();
            if (!owns()) return;
            if (saveError && saveError.code !== '23505') throw saveError;
            saved = normalizePersonalPlan(data);
            if (saved) break;
            latest = await fetchPlan(uid, operation.itemId);
          }
          if (!saved) throw new Error('Plan başka bir cihazda güncelleniyor. Bekleyen kaydın korunuyor; yeniden dene.');
          if (!owns()) return;
          const index = rows.findIndex(plan => plan.id === saved!.id);
          if (index >= 0) rows[index] = saved; else rows.push(saved);
          const remaining = queue.current.filter(item => item.id !== operation.id);
          // Remove the acknowledged operation before awaiting disk. New user
          // edits may enqueue while storage is busy; never overwrite that queue.
          queue.current = remaining;
          try { await writeQueue(uid, remaining); }
          catch (error) { if (owns()) queue.current = [operation, ...queue.current]; throw error; }
          if (!owns()) return;
          setPending(queue.current.length);
          server.current = [...rows];
          setPlans(optimisticPlans(rows, queue.current));
        }
        if (!owns()) return;
        setPlans([...rows]);
        await AsyncStorage.setItem(`${CACHE}${uid}.cache`, JSON.stringify(rows));
      } catch (caught) {
        if (!owns()) return;
        const message = String((caught as any)?.message || caught);
        setError(/42P01|does not exist|schema cache|not find the table/i.test(message) ? 'Kişisel plan bulut eşitlemesi sunucuda henüz açılmamış. Cihazdaki bekleyen planların korunuyor.' : /42501|row-level|permission/i.test(message) ? 'Hesabın plan eşitleme yetkisini kontrol et. Bekleyen kayıtların cihazda korunuyor.' : /fetch|network/i.test(message) ? 'Buluta ulaşılamadı. Bağlantı gelince planların yeniden gönderilecek.' : message);
        setPlans(optimisticPlans(server.current, queue.current));
      } finally { if (owns()) setLoading(false); }
    })();
    running.current = task;
    await task;
    if (running.current === task) running.current = null;
  }, [userId, enabled, loadedOwner, online, writeQueue, epoch, ownsAccount]);

  useEffect(() => {
    let active = true;
    queue.current = []; server.current = []; running.current = null;
    setLoadedOwner(''); setPlans([]); setPending(0); setError(''); setLoading(false);
    if (!userId || !enabled) return;
    const uid = userId, token = epoch;
    void disk.current.catch(() => undefined).then(() => Promise.all([AsyncStorage.getItem(`${CACHE}${uid}.outbox`), AsyncStorage.getItem(`${CACHE}${uid}.cache`), AsyncStorage.getItem(`${CACHE}${uid}.migrated-v05`), AsyncStorage.getItem(`kemal.mobile.learning.v1.${uid}`)])).then(async ([rawQueue, rawCache, migrated, legacy]) => {
      if (!active || !ownsAccount(uid, token)) return;
      queue.current = restorePlanOperations(rawQueue ? JSON.parse(rawQueue) : []);
      const cache = rawCache ? JSON.parse(rawCache) : [];
      server.current = Array.isArray(cache) ? cache.map(normalizePersonalPlan).filter((plan): plan is PersonalPlan => !!plan) : [];
      // Import this account's old device-only plans once. The guest store is not
      // read, and the original preferences remain available as a backup.
      if (!migrated) {
        let old: any = null;
        try { old = legacy ? JSON.parse(legacy) : null; } catch { /* malformed legacy preferences cannot block the current cache */ }
        const previous = Array.isArray(old?.plans) ? old.plans.slice(0, 1000).map(normalizePersonalPlan).filter((plan: PersonalPlan | null): plan is PersonalPlan => !!plan) : [];
        for (const plan of previous as PersonalPlan[]) {
          const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `kemal-v05-plan:${uid}:${plan.id}`);
          const hash = digest.slice(0, 32);
          const itemId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
          if (!active || !ownsAccount(uid, token)) return;
          if (queue.current.some(operation => operation.itemId === itemId) || server.current.some(row => row.id === itemId)) continue;
          queue.current.push({ id: Crypto.randomUUID(), itemId, kind: 'add', patch: { title: plan.title, date: plan.date, time: plan.time, done: plan.done, reminder: null }, createdAt: new Date().toISOString() });
        }
        if (previous.length) await writeQueue(uid, queue.current);
        await AsyncStorage.setItem(`${CACHE}${uid}.migrated-v05`, '1');
      }
      if (!active || !ownsAccount(uid, token)) return;
      setPlans(optimisticPlans(server.current, queue.current)); setPending(queue.current.length);
    }).catch(() => { if (active) setError('Cihaz plan yedeği okunamadı. Bulut kayıtların yeniden alınacak.'); }).finally(() => { if (active && ownsAccount(uid, token)) setLoadedOwner(uid); });
    return () => { active = false; };
  }, [userId, enabled, writeQueue, epoch, ownsAccount]);

  useEffect(() => {
    if (!userId || !enabled || loadedOwner !== userId || !online) return;
    void refresh();
    const channel = supabase.channel(`personal-plans:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'mobile_personal_plans', filter: `user_id=eq.${userId}` }, () => { void refresh(); }).subscribe();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 20000);
    const focus = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { clearInterval(timer); focus.remove(); void supabase.removeChannel(channel); };
  }, [userId, enabled, loadedOwner, online, refresh]);

  const enqueue = useCallback(async (operation: PersonalPlanOperation) => {
    const uid = userId, token = epoch;
    if (!uid || !enabled || loadedOwner !== uid || !ownsAccount(uid, token)) return false;
    if (queue.current.length >= 1000) { setError('Çok sayıda plan eşitlenmeyi bekliyor. Önce internet bağlantını kontrol et.'); return false; }
    try {
      applyPlanOperation(plans.find(plan => plan.id === operation.itemId) || null, operation, false);
      const previous = queue.current;
      const next = [...previous, operation];
      queue.current = next;
      try { await writeQueue(uid, next); }
      catch (caught) { if (ownsAccount(uid, token)) queue.current = queue.current.filter(item => item.id !== operation.id); throw caught; }
      if (!ownsAccount(uid, token) || !enabledRef.current) return false;
      setPlans(optimisticPlans(server.current, queue.current)); setPending(queue.current.length); setError('');
      if (online) void refresh();
      return true;
    } catch (caught) { if (ownsAccount(uid, token)) setError(String((caught as any)?.message || 'Plan cihaza kaydedilemedi. Boş alanı kontrol et.')); return false; }
  }, [userId, enabled, loadedOwner, plans, online, refresh, writeQueue, epoch, ownsAccount]);
  const visible = enabled && userId === loadedOwner ? plans : [];
  useEffect(() => {
    if (!enabled || !userId || loadedOwner !== userId) return;
    const reschedule = () => reconcileAgendaReminders(userId, visible.filter(plan => !plan.deletedAt).map(plan => ({ id: `personal:${plan.id}`, title: plan.title, date: plan.date, time: plan.time, done: plan.done, remind: plan.reminder !== null, minutesBefore: plan.reminder || 0 }))).catch(() => undefined);
    void reschedule();
    const focus = AppState.addEventListener('change', state => { if (state === 'active') void reschedule(); });
    return () => focus.remove();
  }, [enabled, userId, loadedOwner, visible]);

  return <Context.Provider value={{ plans: visible.filter(plan => !plan.deletedAt), loading, error, pending, refresh,
    add: input => { try { const patch = validatePlanPatch(input); return enqueue({ id: Crypto.randomUUID(), itemId: Crypto.randomUUID(), kind: 'add', patch, createdAt: new Date().toISOString() }); } catch (error) { setError(String((error as Error).message)); return Promise.resolve(false); } },
    patch: (id, patch) => { try { return enqueue({ id: Crypto.randomUUID(), itemId: id, kind: 'patch', patch: validatePlanPatch(patch), before: plans.find(plan => plan.id === id) || null, createdAt: new Date().toISOString() }); } catch (error) { setError(String((error as Error).message)); return Promise.resolve(false); } },
    remove: id => enqueue({ id: Crypto.randomUUID(), itemId: id, kind: 'remove', before: plans.find(plan => plan.id === id) || null, createdAt: new Date().toISOString() }),
  }}>{children}</Context.Provider>;
}
export function usePersonalPlans() { const value = useContext(Context); if (!value) throw new Error('PersonalPlansProvider eksik'); return value; }
