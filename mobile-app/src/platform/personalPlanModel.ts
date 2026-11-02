export type PersonalPlan = { id: string; title: string; date: string; time: string; done: boolean; reminder: number | null; updatedAt: string; deletedAt: string | null };
export type PersonalPlanInput = Pick<PersonalPlan, 'title' | 'date' | 'time'> & { reminder?: number | null; done?: boolean };
export type PersonalPlanPatch = Partial<PersonalPlanInput>;
export type PersonalPlanOperation = { id: string; itemId: string; kind: 'add' | 'patch' | 'remove'; patch?: PersonalPlanPatch; before?: PersonalPlan | null; createdAt: string };
export const planColumns = 'id,user_id,title,event_date,event_time,done,reminder_minutes,updated_at,deleted_at';
const keys = ['title', 'date', 'time', 'done', 'reminder'] as const;
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
export function validPlanDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
}
export function normalizePersonalPlan(value: unknown): PersonalPlan | null {
  if (!object(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 160) return null;
  const date = value.event_date ?? value.date;
  const time = String(value.event_time ?? value.time ?? '').slice(0, 5);
  if (!validPlanDate(date) || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return null;
  const reminder = value.reminder_minutes !== undefined ? value.reminder_minutes : value.reminder;
  return { id: value.id, title: value.title, date, time, done: value.done === true, reminder: Number.isInteger(reminder) && reminder >= 0 && reminder <= 10080 && time ? reminder : null,
    updatedAt: String(value.updated_at ?? value.updatedAt ?? ''), deletedAt: value.deleted_at ?? value.deletedAt ?? null };
}
export function validatePlanPatch(patch: PersonalPlanPatch): PersonalPlanPatch {
  const clean: PersonalPlanPatch = {};
  if (patch.title !== undefined) {
    if (typeof patch.title !== 'string' || !patch.title.trim() || patch.title.trim().length > 160) throw new Error('Plan başlığı 1–160 karakter olmalı.');
    clean.title = patch.title.trim();
  }
  if (patch.date !== undefined) { if (!validPlanDate(patch.date)) throw new Error('Geçerli bir takvim günü seç.'); clean.date = patch.date; }
  if (patch.time !== undefined) { if (patch.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.time)) throw new Error('Saat seçimini kontrol et.'); clean.time = patch.time; }
  if (patch.done !== undefined) { if (typeof patch.done !== 'boolean') throw new Error('Tamamlanma bilgisi geçersiz.'); clean.done = patch.done; }
  if (patch.reminder !== undefined) { if (patch.reminder !== null && (!Number.isInteger(patch.reminder) || patch.reminder < 0 || patch.reminder > 10080)) throw new Error('Hatırlatma süresi geçersiz.'); clean.reminder = patch.reminder; }
  return clean;
}
export function applyPlanOperation(latest: PersonalPlan | null, operation: PersonalPlanOperation, enforceConflict = true): PersonalPlan {
  if (operation.kind === 'remove') {
    if (!latest) throw new Error('Plan artık bulunamıyor.');
    if (latest.deletedAt) return latest;
    if (enforceConflict && operation.before && keys.some(key => latest[key] !== operation.before![key])) throw new Error('Bu plan başka bir cihazda değişti. Silmeden önce yeniden kontrol et.');
    return { ...latest, deletedAt: operation.createdAt };
  }
  const patch = validatePlanPatch(operation.patch || {});
  if (latest?.deletedAt) throw new Error('Bu plan başka bir cihazda silindi. Bekleyen değişikliğin cihazda korunuyor.');
  if (operation.kind === 'patch' && !latest) throw new Error('Plan artık bulunamıyor. Bekleyen değişikliğin cihazda korunuyor.');
  if (enforceConflict && latest && operation.before) for (const key of keys) if (key in patch && latest[key] !== operation.before[key] && latest[key] !== patch[key]) throw new Error('Bu planın aynı alanı başka bir cihazda değişti. Bekleyen kaydın korunuyor.');
  if (enforceConflict && operation.kind === 'add' && latest && keys.some(key => latest[key] !== (patch[key] ?? (key === 'reminder' ? null : key === 'done' ? false : '')))) throw new Error('Plan kimliği bulutta başka bir kayıtla çakıştı.');
  const result: PersonalPlan = { id: operation.itemId, title: '', date: '', time: '', done: false, reminder: null, updatedAt: '', deletedAt: null, ...latest, ...patch };
  if (!result.time) result.reminder = null;
  if (!result.title || !validPlanDate(result.date)) throw new Error('Planın başlığı ve günü gerekli.');
  return result;
}
export function planFields(plan: PersonalPlan) {
  return { title: plan.title, event_date: plan.date, event_time: plan.time || null, done: plan.done, reminder_minutes: plan.time ? plan.reminder : null, deleted_at: plan.deletedAt };
}
export function optimisticPlans(server: PersonalPlan[], operations: PersonalPlanOperation[]) {
  const map = new Map(server.map(plan => [plan.id, plan]));
  for (const operation of operations) {
    try { map.set(operation.itemId, applyPlanOperation(map.get(operation.itemId) || null, operation, false)); } catch { /* keep valid server records visible during a conflict */ }
  }
  return [...map.values()];
}
export function restorePlanOperations(value: unknown): PersonalPlanOperation[] {
  if (!Array.isArray(value)) return [];
  // Up to 1000 pending edits plus a one-time import of 1000 v0.5 device plans.
  return value.slice(0, 2000).filter(op => object(op) && typeof op.id === 'string' && typeof op.itemId === 'string' && ['add', 'patch', 'remove'].includes(op.kind) && typeof op.createdAt === 'string' && (op.kind === 'remove' || object(op.patch))) as PersonalPlanOperation[];
}
