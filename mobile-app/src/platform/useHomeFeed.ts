import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { APP_CONFIG } from '@/constants/config';
import { HomeFeedData, HomeFeedItem, HomeSlide, HomeSource, latestHomeItems, normalizeHomeCache, normalizeHomeContent, normalizeHomeExams, normalizeHomeGames, normalizeHomeSlides } from './home-feed-model';

const REFRESH_MS = 2 * 60_000;
const CACHE = 'kemal.mobile.home.public.v1.' + APP_CONFIG.siteUrl;
const empty: HomeFeedData = { slides: [], items: [], updatedAt: 0 };
type FetchResult = { slides?: HomeSlide[]; items: Partial<Record<HomeSource, HomeFeedItem[]>>; failed: number; succeeded: number };
async function fetchValue(url: string, init?: RequestInit, html = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error('İçerik kaynağına ulaşılamadı.');
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error('İçerik yanıtı çok büyük.');
    return html ? text : JSON.parse(text);
  } finally { clearTimeout(timeout); }
}
async function publicRows(table: string, select: string, order: string, limit = 40) {
  const query = new URLSearchParams({ select, aktif: 'eq.true', order, limit: String(limit) });
  // Anonymous metadata requests intentionally do not receive the signed-in user's token.
  return fetchValue(APP_CONFIG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + table + '?' + query, { headers: { apikey: APP_CONFIG.supabaseAnonKey, Authorization: 'Bearer ' + APP_CONFIG.supabaseAnonKey } });
}
export async function fetchHomeFeed(): Promise<FetchResult> {
  const origin = new URL(APP_CONFIG.siteUrl).origin;
  const operations = [
    publicRows('homepage_slides', 'id,baslik,aciklama_html,icerik_turu,media_url,media_path,media_fit,youtube_video_id,dokuman_id,link_url,link_label,gecis_suresi_ms,siralama,aktif', 'siralama.asc,olusturma_tarihi.desc', 5).then(raw => normalizeHomeSlides(raw, origin, APP_CONFIG.supabaseUrl)),
    publicRows('metinler', 'id,baslik,sinif,siniflar,aktif,gizli,oturum_gerekli,olusturma_tarihi', 'olusturma_tarihi.desc').then(raw => normalizeHomeContent(raw, 'reading', origin)),
    publicRows('dokumanlar', 'id,baslik,sinif,ders,icerik_turu,aktif,gizli,oturum_gerekli,olusturma_tarihi,home_feed_visible:etkilesim_json->homeFeedVisible', 'olusturma_tarihi.desc').then(raw => normalizeHomeContent(raw, 'documents', origin)),
    fetchValue('https://firestore.googleapis.com/v1/projects/kemalogretmen-2c986/databases/(default)/documents:runQuery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { select: { fields: ['title','grade','createdAt','published','hidden','gizli'].map(fieldPath => ({ fieldPath })) }, from: [{ collectionId: 'exams' }], where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } }, limit: 200 } }) }).then(raw => normalizeHomeExams(raw, origin)),
    fetchValue(origin + '/oyun/oyunlar.html', undefined, true).then(raw => normalizeHomeGames(String(raw), origin)),
  ];
  const results = await Promise.allSettled(operations);
  const result: FetchResult = { items: {}, failed: 0, succeeded: 0 };
  const sources: HomeSource[] = ['reading', 'documents', 'exams', 'games'];
  results.forEach((entry, index) => {
    if (entry.status === 'rejected') { result.failed++; return; }
    result.succeeded++;
    if (index === 0) result.slides = entry.value as HomeSlide[];
    else result.items[sources[index - 1]] = entry.value as HomeFeedItem[];
  });
  return result;
}
export function useHomeFeed() {
  const [data, setData] = useState<HomeFeedData>(empty);
  const [refreshing, setRefreshing] = useState(false);
  const [cached, setCached] = useState(false);
  const [partial, setPartial] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const current = useRef(empty);
  const lastAttempt = useRef(0);
  const mounted = useRef(false);
  const busy = useRef(false);
  const refresh = useCallback(async (force = true) => {
    if (busy.current || (!force && Date.now() - lastAttempt.current < REFRESH_MS)) return;
    busy.current = true; lastAttempt.current = Date.now(); setRefreshing(true);
    try {
      const result = await fetchHomeFeed(); if (!mounted.current) return;
      if (!result.succeeded) { setCached(true); setError('Canlı içerikler yenilenemedi. Bağlantını kontrol edip yeniden deneyebilirsin.'); return; }
      const preserved = current.current.items.filter(item => result.items[item.source] === undefined);
      const fresh = Object.values(result.items).flat();
      const next = { slides: result.slides ?? current.current.slides, items: latestHomeItems([...fresh, ...preserved]), updatedAt: Date.now() };
      current.current = next; setData(next); setCached(false); setPartial(result.failed > 0); setError('');
      await AsyncStorage.setItem(CACHE, JSON.stringify(next)).catch(() => {});
    } catch { if (mounted.current) { setCached(true); setError('Canlı içerikler yenilenemedi.'); } }
    finally { busy.current = false; if (mounted.current) setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    mounted.current = true; let disposed = false;
    const foreground = () => { const foreground = AppState.currentState === 'active' || AppState.currentState == null; setActive(foreground); if (foreground) void refresh(!current.current.updatedAt); };
    const start = async () => {
      if (!current.current.updatedAt) {
        try {
          const raw = await AsyncStorage.getItem(CACHE); const saved = normalizeHomeCache(raw ? JSON.parse(raw) : null, new URL(APP_CONFIG.siteUrl).origin);
          if (saved && !disposed) { current.current = saved; setData(saved); setCached(true); }
        } catch { /* A damaged public cache must not prevent a fresh fetch. */ }
      }
      if (!disposed) foreground();
    };
    void start();
    const appState = AppState.addEventListener('change', foreground);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(false); }, REFRESH_MS);
    return () => { disposed = true; mounted.current = false; setActive(false); appState.remove(); clearInterval(timer); };
  }, [refresh]));
  return { ...data, refreshing, cached, partial, error, active, refresh: () => { void refresh(true); } };
}
