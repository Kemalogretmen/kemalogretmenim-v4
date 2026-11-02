export type Recent = { id: string; at: string };
export type LocalPlan = { id: string; date: string; time: string; title: string; done: boolean };
export type LearningState = { favorites: string[]; recent: Recent[]; plans: LocalPlan[]; theme: 'system' | 'light' | 'dark' };
export const emptyLearningState: LearningState = { favorites: [], recent: [], plans: [], theme: 'system' };
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function normalizeLearningState(value: unknown): LearningState {
  if (!value || typeof value !== 'object') return { ...emptyLearningState };
  const v = value as Partial<LearningState>;
  return {
    favorites: Array.isArray(v.favorites) ? [...new Set(v.favorites.filter(x => typeof x === 'string'))].slice(0, 200) : [],
    recent: Array.isArray(v.recent) ? v.recent.filter(x => x && typeof x.id === 'string' && Number.isFinite(Date.parse(x.at))).slice(0, 12) : [],
    plans: Array.isArray(v.plans) ? v.plans.filter(x => x && typeof x.id === 'string' && typeof x.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).slice(0, 1000).map(x => ({ ...x, title: x.title.slice(0, 160), time: /^\d{2}:\d{2}$/.test(x.time) ? x.time : '', done: x.done === true })) : [],
    theme: v.theme === 'light' || v.theme === 'dark' ? v.theme : 'system',
  };
}
export function visitModule(state: LearningState, id: string, at = new Date().toISOString()) {
  return { ...state, recent: [{ id, at }, ...state.recent.filter(item => item.id !== id)].slice(0, 12) };
}
export function weekDates(selected: string) {
  const date = new Date(`${selected}T12:00:00`);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(date); d.setDate(d.getDate() + i); return dateKey(d); });
}
export function layoutFor(width: number, height: number) {
  return { rail: width >= 900, columns: width >= 1200 ? 3 : width >= 600 ? 2 : 1, compactLandscape: height < 500 && width > height };
}
