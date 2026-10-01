import { useEffect, useState, useCallback } from "react";
import { getTestCases } from "@/services/api/jobseeker/compilerService";


export function useNativeFullscreen(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Native fullscreen failed:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [enabled]);
}

export function usePageFullscreen({ active = true } = {}) {
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== "undefined" && Boolean(document.fullscreenElement),
  );

  // Keep React state in sync with the real browser fullscreen state.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback(() => {
    const el = document.documentElement;
    if (el?.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const toggle = useCallback(
    () => (document.fullscreenElement ? exit() : enter()),
    [enter, exit],
  );

  // While active and NOT in fullscreen, re-enter on the next user gesture.
  useEffect(() => {
    if (!active || isFullscreen) return undefined;
    const reenter = () => enter();
    window.addEventListener("pointerdown", reenter, { once: true });
    window.addEventListener("keydown", reenter, { once: true });
    return () => {
      window.removeEventListener("pointerdown", reenter);
      window.removeEventListener("keydown", reenter);
    };
  }, [active, isFullscreen, enter]);

  return { isFullscreen, enter, exit, toggle };
}

/* ───────────────────────────────────────────────────────────────────────────
   useBodyScrollLock — UNCHANGED
─────────────────────────────────────────────────────────────────────────────*/
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

/* ───────────────────────────────────────────────────────────────────────────
   useTestCasesFetcher — UNCHANGED
─────────────────────────────────────────────────────────────────────────────*/
export function useTestCasesFetcher(testId, questionNumber) {
  const [testCases, setTestCases] = useState([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testId || !questionNumber) {
      setTestCases([]);
      setHiddenCount(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getTestCases(testId, questionNumber)
      .then((data) => {
        if (cancelled) return;
        if (data?.test_cases?.length > 0) {
          setTestCases(data.test_cases);
          setHiddenCount(data.total_hidden || 0);
        } else {
          setTestCases([]);
          setHiddenCount(0);
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn("Could not fetch test cases:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [testId, questionNumber]);

  return { testCases, hiddenCount, loading };
}