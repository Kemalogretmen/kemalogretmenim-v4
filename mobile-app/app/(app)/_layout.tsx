import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { LoadingState, Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function AppLayout() {
  const { loading, profile } = useAuth();
  const isTeacher = profile?.role === 'teacher';

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!profile) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 76,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '900',
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Panel', tabBarIcon: ({ color }) => <Ionicons name="grid-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="assignments" options={{ title: 'Ödev', tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Mesaj', tabBarIcon: ({ color }) => <Ionicons name="mail-outline" color={color} size={22} /> }} />
      <Tabs.Screen
        name="tools"
        options={{
          title: isTeacher ? 'Ajanda' : 'İçerik',
          tabBarIcon: ({ color }) => (
            <Ionicons name={isTeacher ? 'briefcase-outline' : 'sparkles-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color} size={22} /> }} />
    </Tabs>
  );
}
