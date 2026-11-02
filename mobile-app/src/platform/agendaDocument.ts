import { agendaDocumentSource } from './agendaDocumentSource';

export const AGENDA_BASE_URL = 'https://kemalogretmenim.com.tr/ogretmen-ajandasi/';
export const AGENDA_SUPABASE_ORIGIN = 'https://mwxcvlyrkptxrwgkmqum.supabase.co';
export const AGENDA_DOCUMENT_POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: https://mwxcvlyrkptxrwgkmqum.supabase.co; font-src data:; media-src data: blob:; connect-src https://mwxcvlyrkptxrwgkmqum.supabase.co wss://mwxcvlyrkptxrwgkmqum.supabase.co; frame-src about:; object-src 'none'; base-uri 'none'; form-action 'none'";

type AgendaDocumentOptions = { bootstrap: string; nonce: string; dark: boolean; path: string };
const views = new Set(['dashboardView', 'studentsView', 'examsView', 'scheduleView', 'calendarView', 'reportsView', 'backupView']);
const tabs = new Set(['tab-program', 'tab-plan', 'tab-yukle', 'tab-tatil']);
const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Only owned agenda routes and typed navigation hints may enter the document. */
export function agendaActivityPath(path: string): string {
  if (!/^\/ogretmen-ajandasi\/(?:index\.html)?(?:\?|$)/.test(path) || /[\\#\u0000-\u001f]/.test(path)) throw new Error('Invalid agenda activity path');
  const url = new URL(path, AGENDA_BASE_URL);
  if (url.origin !== new URL(AGENDA_BASE_URL).origin || !/^\/ogretmen-ajandasi\/(?:index\.html)?$/.test(url.pathname)) throw new Error('Invalid agenda activity path');
  const seen = new Set<string>();
  for (const [key, value] of url.searchParams) {
    if (seen.has(key)) throw new Error('Duplicate agenda navigation hint');
    seen.add(key);
    const allowed = key === 'advanced' ? value === '1'
      : key === 'mobileView' ? views.has(value)
      : key === 'plannerTab' ? tabs.has(value)
      : key === 'focusDate' ? /^\d{4}-\d{2}-\d{2}$/.test(value)
      : key === 'classId' || key === 'studentId' ? /^[a-zA-Z0-9_-]{1,160}$/.test(value) : false;
    if (!allowed) throw new Error('Invalid agenda navigation hint');
  }
  return url.pathname + url.search;
}

/** The caller supplies trusted bootstrap source; it runs before storage is read. */
export function createAgendaDocument({ bootstrap, nonce, dark, path }: AgendaDocumentOptions): string {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(nonce)) throw new Error('Invalid agenda capability');
  const activityPath = agendaActivityPath(path);
  const script = bootstrap.replace(/<\/script/gi, '<\\/script');
  return agendaDocumentSource
    .replace('<html lang="tr">', `<html lang="tr" class="kemal-native" data-kemal-native-module="teacher-agenda" data-kemal-activity-path="${attribute(activityPath)}" data-theme="${dark ? 'dark' : 'light'}">`)
    .replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${AGENDA_DOCUMENT_POLICY}"><meta name="kemal-native-agenda" content="${nonce}">`)
    .replace('__KEMAL_AGENDA_BOOTSTRAP__', () => script);
}
