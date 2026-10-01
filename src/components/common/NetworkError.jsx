import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Button, Collapse, CircularProgress, Stack } from "@mui/material";
import {
  WifiOffRounded, InfoOutlined, RefreshRounded,
  SettingsEthernetRounded, FlightRounded, RouterRounded, DnsRounded,
} from "@mui/icons-material";
import { C, FONT, REDUCED } from "@/pages/landing/theme";
export function isNetworkError(err) {
  if (!err) return false;
  if (err.response) return false;                       // server answered — HTTP error, not network
  if (err.code === "ERR_NETWORK") return true;          // axios: request failed to send
  if (err.code === "ECONNABORTED") return true;         // axios: timeout
  if (err.name === "TypeError") return true;            // fetch: "Failed to fetch"
  if (typeof err.message === "string" && /network|timeout|fetch/i.test(err.message)) return true;
  return err.request != null;                           // axios: sent, nothing came back
}

const TIPS = [
  { icon: <FlightRounded sx={{ fontSize: 17 }} />,
    text: "Turn off Airplane mode, or toggle Wi-Fi / mobile data off and on." },
  { icon: <RouterRounded sx={{ fontSize: 17 }} />,
    text: "Make sure you're connected to the same network as the IEvalx server." },
  { icon: <DnsRounded sx={{ fontSize: 17 }} />,
    text: "Still stuck? The server itself may be restarting — try again in a minute." },
];

export default function NetworkError({
  onRetry,
  variant = "page",        // "page" | "embedded"
  fullScreen = false,
  title = "Connection lost",
  subtitle = "We couldn't connect to the server. Please check your internet connection and try again.",
}) {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [retrying, setRetrying] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const retry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try { await onRetry?.(); } catch { /* still down — stay on this screen */ }
    finally { setRetrying(false); }
  }, [onRetry, retrying]);

  /* Track connectivity + self-heal the moment the browser comes back online. */
  useEffect(() => {
    const goOnline  = () => { setOnline(true); retry(); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [retry]);

  const chipText = online ? "The server didn't respond" : "Airplane mode might be on";

  const body = (
    <Box sx={{
      display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center", px: 3,
      py: variant === "embedded" ? 6 : 0,
      width: "100%", maxWidth: 420, mx: "auto", fontFamily: FONT,
    }}>
      {/* rounded icon tile */}
      <Box sx={{
        width: 96, height: 96, borderRadius: "30px", bgcolor: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 18px 40px rgba(2,33,36,0.10)",
        border: `1px solid ${C.line}`,
      }}>
        <WifiOffRounded sx={{ fontSize: 40, color: C.ink }} />
      </Box>

      <Typography sx={{ fontFamily: FONT, fontSize: { xs: 24, md: 27 }, fontWeight: 700, color: C.ink, mt: 3 }}>
        {title}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: 14.5, color: C.muted, mt: 1.25, lineHeight: 1.75, maxWidth: 320 }}>
        {subtitle}
      </Typography>

      {/* connectivity-aware info chip */}
      <Box sx={{
        display: "inline-flex", alignItems: "center", gap: 0.75, mt: 2.5,
        bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "999px",
        px: 1.75, height: 36, boxShadow: "0 6px 16px rgba(2,33,36,0.06)",
      }}>
        <InfoOutlined sx={{ fontSize: 16, color: C.muted }} />
        <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.ink, fontWeight: 500 }}>
          {chipText}
        </Typography>
      </Box>

      {/* primary retry pill */}
      <Button
        onClick={retry}
        disabled={retrying}
        startIcon={retrying
          ? <CircularProgress size={16} sx={{ color: "#fff" }} />
          : <RefreshRounded sx={{ fontSize: "18px !important" }} />}
        sx={{
          fontFamily: FONT, textTransform: "none", mt: 4.5,
          bgcolor: C.sage, color: "#fff", borderRadius: "999px",
          width: "100%", maxWidth: 330, height: 52,
          fontSize: 15, fontWeight: 600, lineHeight: 1,
          boxShadow: "0 12px 28px rgba(127,158,126,0.38)",
          transition: REDUCED ? "none" : "all .25s ease",
          "&:hover": { bgcolor: C.sageDark, boxShadow: "0 16px 34px rgba(127,158,126,0.45)" },
          "&.Mui-disabled": { bgcolor: C.sage, color: "#fff", opacity: 0.75 },
        }}
      >
        {retrying ? "Reconnecting…" : "Try again"}
      </Button>

      {/* secondary: expands the settings checklist (web apps can't open OS settings) */}
      <Button
        onClick={() => setTipsOpen((o) => !o)}
        startIcon={<SettingsEthernetRounded sx={{ fontSize: "17px !important" }} />}
        sx={{
          fontFamily: FONT, textTransform: "none", mt: 1.75,
          color: C.ink, fontSize: 13.5, fontWeight: 600,
          borderRadius: "999px", px: 2, height: 40,
          "&:hover": { bgcolor: "rgba(2,33,36,0.05)" },
        }}
      >
        Check network settings
      </Button>

      <Collapse in={tipsOpen} sx={{ width: "100%" }}>
        <Box sx={{
          mt: 1.5, bgcolor: "#fff", border: `1px solid ${C.line}`,
          borderRadius: "16px", p: 2.25, textAlign: "left",
          boxShadow: "0 10px 24px rgba(2,33,36,0.06)",
        }}>
          {TIPS.map((t, i) => (
            <Stack key={i} direction="row" spacing={1.25}
              sx={{ alignItems: "flex-start", mt: i === 0 ? 0 : 1.5 }}>
              <Box sx={{
                width: 30, height: 30, borderRadius: "10px", bgcolor: C.sageSoft,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.sageDark, flexShrink: 0,
              }}>
                {t.icon}
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.muted, lineHeight: 1.7, pt: "3px" }}>
                {t.text}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Collapse>
    </Box>
  );

  if (fullScreen) {
    return (
      <Box sx={{
        position: "fixed", inset: 0, zIndex: 2000, bgcolor: C.cream,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflowY: "auto", py: 6,
      }}>
        {body}
      </Box>
    );
  }

  if (variant === "embedded") {
    return (
      <Box sx={{
        bgcolor: C.cream, border: `1px solid ${C.line}`, borderRadius: "20px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {body}
      </Box>
    );
  }

  /* "page" — fills the route area below the fixed nav */
  return (
    <Box sx={{
      minHeight: "70vh", bgcolor: C.cream,
      display: "flex", alignItems: "center", justifyContent: "center", py: 8,
    }}>
      {body}
    </Box>
  );
}


export function OfflineGate({ children }) {
  const [offline, setOffline] = useState(
    typeof navigator === "undefined" ? false : !navigator.onLine,
  );

  useEffect(() => {
    const goOnline  = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <>
      {offline && (
        <NetworkError
          fullScreen
          subtitle="You're offline. Reconnect to Wi-Fi or mobile data to keep using IEvalx."
          onRetry={() => { if (navigator.onLine) setOffline(false); }}
        />
      )}
      {children}
    </>
  );
}