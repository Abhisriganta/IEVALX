import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import billingService from '@/services/api/company/billingService';

const TAB_KEYS = { 0: 'subscription', 1: 'billing' };
const KEY_TO_INDEX = { subscription: 0, billing: 1 };

export const useBillingAndSubscription = () => {
  const [params, setParams] = useSearchParams();

  const initial = KEY_TO_INDEX[params.get('tab')] ?? 0;
  const [tab, setTab] = useState(initial);
  const [refreshKey, setRefreshKey] = useState(0);

  // Keep tab state in sync with URL (back/forward button, deep links)
  useEffect(() => {
    const next = KEY_TO_INDEX[params.get('tab')] ?? 0;
    setTab((prev) => (prev === next ? prev : next));
  }, [params]);

  const changeTab = useCallback((next) => {
    setTab(next);
    const nextParams = new URLSearchParams(params);
    if (next === 0) nextParams.delete('tab');
    else nextParams.set('tab', TAB_KEYS[next]);
    setParams(nextParams, { replace: true });
  }, [params, setParams]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    tab,
    changeTab,
    refreshKey,
    refresh,
    service: billingService,
  };
};

export default useBillingAndSubscription;