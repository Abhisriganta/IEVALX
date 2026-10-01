import { useEffect, useRef, useState } from "react";
import { REDUCED } from "./theme";

export function useCounter(end, duration = 1800, start = false) {
  const [count, setCount] = useState(REDUCED ? end : 0);
  useEffect(() => {
    if (!start || REDUCED) { if (start) setCount(end); return; }
    let current = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [start, end, duration]);
  return count;
}

/* ── Intersection observer hook ────────────────────────────────────────── */
export function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(REDUCED);
  useEffect(() => {
    if (REDUCED) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

