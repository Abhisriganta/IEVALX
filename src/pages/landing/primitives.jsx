import { useEffect, useState } from "react";
import { Box, Typography, Stack, Button } from "@mui/material";
import { C, FONT, REDUCED, CAN_HOVER } from "./theme";
import { useInView } from "./hooks";

export function FadeUp({ children, delay = 0, sx = {} }) {
  const [ref, visible] = useInView();
  return (
    <Box
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(38px) scale(0.985)",
        transition: REDUCED ? "none"
          : `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: "opacity, transform",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function RevealLine({ children, delay = 0, sx = {} }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <Box sx={{ overflow: "hidden", pb: "0.08em", mb: "-0.08em" }}>
      <Box sx={{
        transform: shown ? "translateY(0) rotate(0deg)" : "translateY(115%) rotate(1.5deg)",
        transformOrigin: "left top",
        transition: REDUCED ? "none" : `transform 1s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: "transform",
        ...sx,
      }}>
        {children}
      </Box>
    </Box>
  );
}

export function Eyebrow({ children, onDark = false, align = "center" }) {
  const bracketColor = onDark ? "rgba(255,255,255,0.6)" : C.sage;
  return (
    <Box sx={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start", width: "100%" }}>
      <Box component="span" sx={{ position: "relative", display: "inline-block", p: "8px 14px" }}>
        <Box component="span" sx={{
          position: "absolute", left: 0, top: 0, width: 14, height: 14,
          borderLeft: `1.5px solid ${bracketColor}`,
          borderTop: `1.5px solid ${bracketColor}`,
        }} />
        <Box component="span" sx={{
          position: "absolute", right: 0, bottom: 0, width: 14, height: 14,
          borderRight: `1.5px solid ${bracketColor}`,
          borderBottom: `1.5px solid ${bracketColor}`,
        }} />
        <Typography component="span" sx={{
          fontFamily: FONT, fontSize: 12.5, fontWeight: 600,
          letterSpacing: "2.5px", textTransform: "uppercase",
          color: onDark ? "rgba(255,255,255,0.75)" : C.sageDark,
          whiteSpace: "nowrap", lineHeight: 1, display: "inline-block",
        }}>
          {children}
        </Typography>
      </Box>
    </Box>
  );
}

export function SageButton({ children, onClick, startIcon, sx = {} }) {
  return (
    <Button
      onClick={onClick}
      startIcon={startIcon}
      disableElevation
      sx={{
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT, textTransform: "none",
        bgcolor: C.sage,
        borderRadius: "999px", px: 3.25, py: 0,
        height: 48, minWidth: 0, lineHeight: 1,
        fontSize: 14.5, fontWeight: 500,
        // label + start icon ride above the bloom and flip to sage on hover
        "& .MuiButton-startIcon, & .sage-btn-label": {
          position: "relative", zIndex: 2, color: "#fff",
          transition: REDUCED ? "none" : "color .45s cubic-bezier(0.22,1,0.36,1)",
        },
        // the bloom: a white-ink circle anchored at the bottom-right corner
        "&::before": {
          content: '""',
          position: "absolute", zIndex: 1,
          left: "100%", top: "100%",
          width: 560, height: 560, ml: "-280px", mt: "-280px",
          borderRadius: "50%",
          bgcolor: C.ink,
          transform: "scale(0)",
          transition: REDUCED ? "none" : "transform .55s cubic-bezier(0.22,1,0.36,1)",
          pointerEvents: "none",
        },
        "&:hover::before": { transform: "scale(1)" },
        "&:hover .sage-btn-label, &:hover .MuiButton-startIcon": { color: "#fff" },
        ...sx,
      }}
    >
      <Box component="span" className="sage-btn-label">{children}</Box>
    </Button>
  );
}