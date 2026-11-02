import { whiteboardDocumentSource } from './whiteboardDocumentSource';
export const WHITEBOARD_BASE_URL = 'https://kemalogretmenim.com.tr/ogretmen/beyaztahta.html';
export function createWhiteboardDocument(bridge: string, nonce: string, dark = false) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(nonce)) throw new Error('Invalid whiteboard capability');
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src data: blob:; frame-src 'none'; object-src 'none'; base-uri https://kemalogretmenim.com.tr; form-action 'none'";
  return whiteboardDocumentSource.replace('<html lang="tr">', `<html lang="tr" class="kemal-native" data-kemal-native-module="whiteboard" data-theme="${dark ? 'dark' : 'light'}">`).replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="kemal-native-whiteboard" content="${nonce}"><script>${bridge.replace(/<\/script/gi, '<\\/script')}</script>`);
}
export function whiteboardMessageOrigin(url: string, expectedOrigin: string) {
  if (url === 'about:blank') return true;
  try { const parsed = new URL(url); return parsed.origin === expectedOrigin && parsed.pathname === '/ogretmen/beyaztahta.html'; } catch { return false; }
}
