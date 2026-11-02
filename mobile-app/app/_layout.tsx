import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PlatformProvider, usePlatform } from '@/platform/PlatformContext';
import { AgendaProvider } from '@/platform/useAgenda';
import { NotificationLifecycle } from '@/platform/NotificationLifecycle';
import { AppUpdateWatcher } from '@/platform/AppUpdates';
import { PersonalPlansProvider } from '@/platform/usePersonalPlans';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { loading } = useAuth();
  const { dark, palette } = usePlatform();

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loading]);

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <NotificationLifecycle />
      <AppUpdateWatcher />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="reading" />
        <Stack.Screen name="exams" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="webview" options={{ presentation: 'card', gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PlatformProvider><AgendaProvider><PersonalPlansProvider><RootNavigator /></PersonalPlansProvider></AgendaProvider></PlatformProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
