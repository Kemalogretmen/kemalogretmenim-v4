import { Redirect } from 'expo-router';

import { LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallbackScreen() {
  const { loading, profile, userId } = useAuth();

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (profile || userId) return <Redirect href="/(app)/home" />;

  return <Redirect href="/login" />;
}
