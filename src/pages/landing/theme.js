export const C = {
  sage:     "#7F9E7E",   // primary green — buttons, accents, CTA band
  sageDark: "#6C8B6B",   // hover state
  sageSoft: "#EDF3EC",   // faint green tint fills
  hero:     "#D4E2E3",   // pale sage-teal hero / nav background
  ink:      "#1F1F1F",   // dark sections (logo strip, categories, footer)
  inkCard:  "#2C2C2C",   // cards inside dark sections
  pine:     "#022124",   // deep pine — Upload CV section
  pine2:    "#24433E",   // pine gradient partner
  cream:    "#F6F8F3",   // off-white section backgrounds
  white:    "#FFFFFF",
  text:     "#1F1F1F",
  muted:    "#6F7470",
  mutedOnDark: "rgba(255,255,255,0.62)",
  line:     "#E7EAE3",
};

export const FONT = "'Jost','DM Sans',sans-serif";

/* Applied-status chip palette — mirrors FindJobs/JobCard.jsx exactly so the
   "Already Applied" badge reads identically on every public surface and
   inside the dashboard. */
export const APPLIED = {
  text: "#3E6E3E",
  soft: "#EAF2E9",
  bdr:  "rgba(127,158,126,0.45)",
};

export const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const CAN_HOVER =
  typeof window !== "undefined" &&
  window.matchMedia?.("(hover: hover)").matches;