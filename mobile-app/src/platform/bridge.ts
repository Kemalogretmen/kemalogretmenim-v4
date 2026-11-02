import { activityBridgeSource } from './bridgeSource';
// Only injected into the validated, first-party top-level document.
export type AgendaSeed = { userId: string; agenda_state: unknown; lesson_planner_state: unknown; updated_at: string; client_updated_at?: string };
export function createActivityBridge(input: { origin: string; authKey: string; session: unknown; userId: string | null; dark: boolean; module: string; nonce: string; agendaSeed?: AgendaSeed; bundledWhiteboard?: boolean; bundledAgenda?: boolean; agendaPath?: string; profile?: unknown; supabaseUrl?: string; supabaseKey?: string; webAgendaHost?: string }) {
  return `(${activityBridgeSource})(${JSON.stringify(input).replace(/</g, '\\u003c')});true;`;
}
