import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ForensicWatermark({ assignmentId, serial: serialProp }) {
  const [serial, setSerial] = useState(serialProp ?? null);

  useEffect(() => {
    if (serialProp || !assignmentId) return;
    let cancelled = false;
    axios
      .get(`/api/manual-test/${assignmentId}/watermark/`)
      .then((res) => {
        if (!cancelled) setSerial(res.data?.watermark?.serial ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [assignmentId, serialProp]);

  if (!serial) return null;
  const text = serial;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
  id="wm-pattern"
  patternUnits="userSpaceOnUse"
  width="420"
  height="200"
  patternTransform="rotate(-30)"
  overflow="visible"
>
            <text
              x="210"
              y="100"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#022124"
              fillOpacity="0.07"
              fontSize="22"
              fontFamily="'Jost','DM Sans','ui-monospace',SFMono-Regular,Menlo,monospace"
              fontWeight="500"
              letterSpacing="2"
            >
              {text}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wm-pattern)" />
      </svg>
    </div>
  );
}