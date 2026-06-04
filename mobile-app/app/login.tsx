import Constants from 'expo-constants';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';

import { Button, Card, Field, Header, Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const isExpoGo = Constants.appOwnership === 'expo';

  async function submit() {
    if (!email || !password) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifre alanlarını doldurun.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/(app)/home');
    } catch (caught) {
      Alert.alert('Giriş yapılamadı', caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace('/(app)/home');
    } catch (caught) {
      Alert.alert('Google girişi', caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: 16 }}>
        <Image source={require('../assets/logo.png')} style={{ width: 88, height: 88, borderRadius: 22 }} />
      </View>
      <Header title="Kemal Öğretmenim" subtitle="Öğrenci, veli ve öğretmen paneline mobil uygulamadan devam et." />
      <Card>
        <Field label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
        <Button title="Giriş Yap" icon="log-in-outline" onPress={submit} disabled={busy} />
        {isExpoGo ? (
          <View style={{ backgroundColor: '#F1E9FF', borderRadius: 14, padding: 12 }}>
            <Text style={{ color: colors.navy, fontSize: 13, fontWeight: '900', lineHeight: 18 }}>
              Google girişi APK/TestFlight sürümünde açılacak. Expo Go önizlemesinde e-posta ve şifreyle giriş yap.
            </Text>
          </View>
        ) : (
          <Button title="Google ile devam et" icon="logo-google" variant="secondary" onPress={google} disabled={busy} />
        )}
      </Card>
      <Text style={{ color: colors.slate, textAlign: 'center', fontWeight: '800' }}>
        Hesabın yok mu? <Link href="/register" style={{ color: colors.purple }}>Kayıt ol</Link>
      </Text>
    </Screen>
  );
}
