import { router } from 'expo-router';
import type { LearningModule } from './catalog';
export function openModule(item: LearningModule, visit?: (id: string) => void) {
  visit?.(item.id);
  if (item.id === 'agenda') { router.navigate('/(app)/agenda'); return; }
  if (item.id === 'reading') { router.push('/reading'); return; }
  if (item.id === 'exams') { router.push('/exams'); return; }
  router.push({ pathname: '/webview', params: { path: item.path, title: item.title, module: item.id } });
}
export function openActivity(path: string, title: string) {
  router.push({ pathname: '/webview', params: { path, title } });
}
