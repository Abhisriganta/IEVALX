// ============================================================================
// useSparkle.js — Sparkle particle animation hook.
// Location: src/hooks/jobseeker/useSparkle.js
// ============================================================================

import { useCallback } from "react";

/**
 * Returns a `sparkle(x, y, color)` function that fires a burst of particle
 * dots at the given viewport coordinates. Used for click-feedback on saves.
 */
const useSparkle = () =>
  useCallback((x, y, color = "#3b82f6") => {
    const container = document.createElement("div");
    container.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9999`;
    document.body.appendChild(container);

    for (let i = 0; i < 8; i++) {
      const dot = document.createElement("div");
      const angle = (i / 8) * Math.PI * 2;
      const dist  = 20 + Math.random() * 30;
      dot.style.cssText = [
        `position:absolute`,
        `width:${4 + Math.random() * 4}px`,
        `height:${4 + Math.random() * 4}px`,
        `border-radius:50%`,
        `background:${color}`,
        `animation:sparkle .6s ease ${i * 0.04}s forwards`,
        `left:${Math.cos(angle) * dist}px`,
        `top:${Math.sin(angle) * dist}px`,
      ].join(";");
      container.appendChild(dot);
    }

    setTimeout(() => container.remove(), 800);
  }, []);

export default useSparkle;