import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Text } from 'react-native';
import { APP_VERSION, checkAppUpdate, dismissAppUpdate, safeApkUrl } from '@/services/appUpdates';
import { AppUpdate } from './updateModel';
import { usePlatform } from './PlatformContext';
import { Action, Panel } from './components';

function showUpdate(update: AppUpdate) {
  Alert.alert('Yeni sürüm hazır', `Kemal Öğretmenim ${update.version} yayımlandı. Güncelleme paketini GitHub üzerinden indirebilirsin.`, [
    { text: 'Daha sonra', style: 'cancel', onPress: () => { dismissAppUpdate(update.version).catch(() => undefined); } },
    { text: 'İndir', onPress: () => { const url = safeApkUrl(update.url); if (url) Linking.openURL(url).catch(() => Alert.alert('Bağlantı açılamadı', 'İnternet bağlantını kontrol edip yeniden dene.')); } },
  ]);
}

export function AppUpdateWatcher() {
  const lastPrompt = useRef('');
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = true;
    const check = () => checkAppUpdate().then(update => { if (active && update && lastPrompt.current !== update.version) { lastPrompt.current = update.version; showUpdate(update); } }).catch(() => undefined);
    const timer = setTimeout(check, 6000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    return () => { active = false; clearTimeout(timer); listener.remove(); };
  }, []);
  return null;
}

export function UpdatePanel() {
  const { palette } = usePlatform();
  const [checking, setChecking] = useState(false);
  async function check() {
    setChecking(true);
    try {
      const update = await checkAppUpdate(true);
      if (update) showUpdate(update);
      else Alert.alert('Güncel sürüm', `Yayımlanmış daha yeni bir Android paketi bulunamadı. Kullanılan sürüm: ${APP_VERSION}.`);
    } catch { Alert.alert('Kontrol tamamlanamadı', 'Güncelleme sunucusuna ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.'); }
    finally { setChecking(false); }
  }
  return <Panel><Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Kemal Öğretmenim · {APP_VERSION}</Text><Text style={{ color: palette.muted, lineHeight: 21, fontSize: 13 }}>Yeni Android sürümleri uygulama açıldığında kontrol edilir. Güncelleme senin seçiminle indirilir; mevcut verilerin korunur.</Text>{Platform.OS === 'android' && <Action label={checking ? 'Kontrol ediliyor…' : 'Güncellemeleri kontrol et'} secondary icon="refresh-outline" disabled={checking} onPress={check} />}</Panel>;
}
