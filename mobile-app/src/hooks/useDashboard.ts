import { useCallback, useEffect, useState } from 'react';

import { fetchDashboard, type DashboardData } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export function useDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError('');
    try {
      setData(await fetchDashboard(profile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
