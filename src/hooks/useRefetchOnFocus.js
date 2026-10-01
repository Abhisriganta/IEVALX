import { useEffect, useRef } from 'react';
const DEFAULT_POLL_MS         = 25_000;   // Silent re-fetch cadence.
const DEFAULT_MIN_INTERVAL_MS = 1_500;    // Anti-flicker de-dupe window.

export function useRefetchOnFocus(refresh, opts = {}) {
  const {
    pollMs        = DEFAULT_POLL_MS,
    minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
    enabled       = true,
  } = opts;

  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const lastRunRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => {
      const fn = refreshRef.current;
      if (typeof fn !== 'function') return;
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      Promise.resolve(fn()).catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', run);

    let pollId = null;
    if (pollMs > 0) {
      pollId = setInterval(() => {
        // Only poll while the tab is visible — no background traffic.
        if (document.visibilityState === 'visible') run();
      }, pollMs);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', run);
      if (pollId != null) clearInterval(pollId);
    };
  }, [enabled, pollMs, minIntervalMs]);
}

export default useRefetchOnFocus;