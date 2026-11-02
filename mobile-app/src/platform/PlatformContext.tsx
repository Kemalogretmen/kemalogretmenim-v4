import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '@/context/AuthContext';
import { emptyLearningState, LearningState, normalizeLearningState, visitModule } from './model';

export const lightPalette = {
  background: '#F7F8FC', surface: '#FFFFFF', soft: '#F0EDF8', text: '#222B42', muted: '#697387',
  line: '#E6E8F0', primary: '#7654B7', onPrimary: '#FFFFFF', green: '#348273', glass: 'rgba(255,255,255,0.90)',
};
const darkPalette: typeof lightPalette = {
  background: '#111620', surface: '#1B2230', soft: '#29243A', text: '#EDF0F8', muted: '#A2AFC2',
  line: '#333D50', primary: '#BB9AEF', onPrimary: '#221C30', green: '#78C9B4', glass: 'rgba(27,34,48,0.94)',
};
type PlatformValue = {
  state: LearningState; ready: boolean; online: boolean; dark: boolean; palette: typeof lightPalette;
  update: (fn: (s: LearningState) => LearningState) => void;
  visit: (id: string) => void; favorite: (id: string) => void; storageError: string;
};
const Context = createContext<PlatformValue | null>(null);
export function PlatformProvider({ children }: PropsWithChildren) {
  const { userId } = useAuth();
  const system = useColorScheme();
  const [state, setState] = useState<LearningState>(emptyLearningState);
  const [loadedKey, setLoadedKey] = useState('');
  const [online, setOnline] = useState(true);
  const [storageError, setStorageError] = useState('');
  const scope = userId || 'guest';
  const activeScope = useRef(scope);
  const writeQueue = useRef(Promise.resolve());
  const key = `kemal.mobile.learning.v1.${scope}`;
  const ready = loadedKey === key;
  useEffect(() => {
    let active = true; activeScope.current = scope; setLoadedKey(''); setState(emptyLearningState); setStorageError('');
    AsyncStorage.getItem(key).then(raw => {
      if (!active) return;
      try { setState(normalizeLearningState(raw ? JSON.parse(raw) : null)); }
      catch { setStorageError('Cihaz tercihleri okunamadı.'); }
    }).catch(() => { if (active) setStorageError('Cihaz kayıtlarına erişilemiyor.'); })
      .finally(() => { if (active) setLoadedKey(key); });
    return () => { active = false; };
  }, [key, scope]);
  useEffect(() => NetInfo.addEventListener(s => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);
  useEffect(() => {
    if (!ready || activeScope.current !== scope) return;
    const data = JSON.stringify(state);
    writeQueue.current = writeQueue.current.then(() => AsyncStorage.setItem(key, data)).catch(() => setStorageError('Cihaz hafızasına kaydedilemedi. Boş alanı kontrol et.'));
  }, [state, ready, key, scope]);
  const update = (fn: (s: LearningState) => LearningState) => { if (ready && activeScope.current === scope) setState(s => normalizeLearningState(fn(s))); };
  const dark = state.theme === 'dark' || (state.theme === 'system' && system === 'dark');
  return <Context.Provider value={{ state: ready ? state : emptyLearningState, ready, online, dark, palette: dark ? darkPalette : lightPalette, storageError, update,
    visit: id => update(s => visitModule(s, id)),
    favorite: id => update(s => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter(x => x !== id) : [...s.favorites, id] })),
  }}>{children}</Context.Provider>;
}
export function usePlatform() { const value = useContext(Context); if (!value) throw new Error('PlatformProvider eksik'); return value; }
