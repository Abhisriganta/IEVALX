import { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Stack, TextField, Container,
  Dialog, DialogContent, CircularProgress, IconButton, Link as MuiLink,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Facebook, Twitter, LinkedIn, WhatsApp,
  MailOutlined, CheckCircle, ErrorOutlineOutlined, MarkEmailReadOutlined,
  InfoOutlined, Close as CloseIcon,
} from "@mui/icons-material";
import { C, FONT } from "./theme";
import { FadeUp, SageButton } from "./primitives";
import { FOOTER_COLS } from "./data";
import {
  subscribe as subscribeToNewsletter,
  verifySubscription,
  unsubscribeByToken,
  isValidEmail,
} from "../../services/newsletterService";

export default function FooterSection() {
  const navigate = useNavigate();
  const location = useLocation();

  const SOCIALS = [
    { label: "Facebook", href: "https://www.facebook.com/people/Lanciere-Technologies/61580199515395/",         Icon: Facebook },
    { label: "Twitter",  href: "https://x.com/LanciereTech/status/2087872471437615521",                          Icon: Twitter  },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/lanciere-technologies-india-pvt-ltd/posts/?feedView=all", Icon: LinkedIn },
    { label: "WhatsApp", href: "https://wa.me/919632229846?text=Hi%20IEvalx%2C%20I%27d%20like%20to%20know%20more",         Icon: WhatsApp },
  ];


  const [email, setEmail]       = useState("");

  const [status, setStatus]     = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [hp, setHp]             = useState("");
  const dismissTimer            = useRef(null);
  const cooldownRef             = useRef(0);

  const [nlDialog, setNlDialog] = useState({
    open: false, loading: false, kind: null, message: "",
  });

  useEffect(() => {
    if (status === "success" || status === "info") {
      dismissTimer.current = setTimeout(() => {
        setStatus("idle");
        setFeedback("");
      }, 5000);
    }
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vToken = params.get("nl_verify");
    const uToken = params.get("nl_unsubscribe");
    if (!vToken && !uToken) return;

    let cancelled = false;
    const stripQuery = () => {
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", clean);
    };

    setNlDialog({ open: true, loading: true, kind: null, message: "" });

    (async () => {
      try {
        if (vToken) {
          const r = await verifySubscription(vToken);
          if (cancelled) return;
          setNlDialog({
            open: true, loading: false, kind: "verify-ok",
            message: r.message || "You're subscribed. Welcome aboard!",
          });
        } else {
          const r = await unsubscribeByToken(uToken);
          if (cancelled) return;
          setNlDialog({
            open: true, loading: false, kind: "unsub-ok",
            message: r.message || "You have been unsubscribed.",
          });
        }
      } catch (err) {
        if (cancelled) return;
        setNlDialog({
          open: true, loading: false,
          kind: vToken ? "verify-err" : "unsub-err",
          message: err?.message || "Something went wrong.",
        });
      } finally {
        stripQuery();
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleSubscribe = async () => {
    if (status === "loading") return;

    const now = Date.now();
    if (now - cooldownRef.current < 2000) {
      setStatus("error");
      setFeedback("Please wait a moment before trying again.");
      return;
    }
    cooldownRef.current = now;

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setStatus("error");
      setFeedback("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setFeedback("");
    try {
      const res = await subscribeToNewsletter(trimmed, {
        source: location.pathname || "footer",
        hp,
      });

      if (res.status === "ALREADY_ACTIVE") {
        setStatus("info");
        setFeedback(res.message || "You're already subscribed. Thanks!");
      } else {
        setStatus("pending");
        setFeedback(res.message || "Check your inbox to confirm your subscription.");
      }
      setEmail("");
      setHp("");
    } catch (err) {
      setStatus("error");
      setFeedback(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubscribe();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubscribe();
    }
  };

  const isLoading = status === "loading";
  const isPending = status === "pending";
  const isSuccess = status === "success";
  const isInfo    = status === "info";
  const isError   = status === "error";
  // ───────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ══ FOOTER — reference layout on the hero tint (#D4E2E3) ══ */}
      <Box sx={{ mt: { xs: 8, md: 11 }, pt: { xs: 7, md: 10 }, pb: 3, bgcolor: C.hero }}>
        <Container maxWidth="lg">
          {/* newsletter row */}
          <FadeUp>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 3, md: 6 }}
              sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: 25, sm: 30, md: 42 }, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
                  Subscribe our Newsletter
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: { xs: 14.5, md: 16.5 }, color: C.muted, mt: 1.5 }}>
                  Get started with a 1-month free trial. No purchase required.
                </Typography>
              </Box>

              <Box
                component="form"
                onSubmit={handleFormSubmit}
                noValidate
                sx={{ width: { xs: "100%", md: "auto" }, flexShrink: 0 }}
              >
                <Box
                  component="input"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  aria-hidden="true"
                  sx={{
                    position: "absolute", left: "-9999px",
                    width: 1, height: 1, opacity: 0, pointerEvents: "none",
                  }}
                />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1.5, sm: 2.5 }}
                  sx={{ alignItems: { xs: "stretch", sm: "center" }, width: { xs: "100%", md: "auto" } }}
                >
                  <Box sx={{
                    display: "flex", alignItems: "center", gap: 1.25,
                    bgcolor: "#fff", borderRadius: "999px",
                    boxShadow: "0 14px 34px rgba(2,33,36,0.08)",
                    pl: { xs: 2, sm: 3 }, pr: { xs: 2, sm: 3 }, height: { xs: 54, sm: 62 },
                    flex: { xs: 1, md: "0 0 440px" }, minWidth: 0,
                    outline: isError ? "1.5px solid #c0392b" : "none",
                    outlineOffset: "-1.5px",
                    transition: "outline-color .2s",
                  }}>
                    <MailOutlined sx={{ fontSize: 18, color: "#8A8F8B", flexShrink: 0 }} />
                    <TextField
                      fullWidth
                      variant="standard"
                      placeholder="Enter your Email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // clear stale feedback the moment the user starts typing again
                        if (status !== "idle" && status !== "loading") {
                          setStatus("idle");
                          setFeedback("");
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      slotProps={{
                        input: {
                          disableUnderline: true,
                          "aria-label": "Email address",
                          name: "email",
                          autoComplete: "email",
                          sx: {
                            fontFamily: FONT, fontSize: 14, color: C.ink,
                            "& input::placeholder": { color: "#8A8F8B", opacity: 1 },
                            "&::before, &::after": { display: "none" },
                          },
                        },
                      }}
                    />
                  </Box>

                  <SageButton
                    type="submit"
                    onClick={handleSubscribe}
                    disabled={isLoading || isPending}
                    sx={{
                      flexShrink: 0,
                      height: { xs: 54, sm: 62 },
                      px: { xs: 2.5, sm: 3.5 },
                      fontSize: { xs: 13.5, sm: 15 },
                      opacity: (isLoading || isPending) ? 0.75 : 1,
                      cursor: (isLoading || isPending) ? "not-allowed" : "pointer",
                    }}
                  >
                    {isLoading  ? "Subscribing…"
                     : isPending ? "Check your inbox ✉"
                     : isSuccess ? "Subscribed ✓"
                     : isInfo    ? "Already subscribed"
                     : "Subscribe Now"}
                  </SageButton>
                </Stack>

                {(isError || isSuccess || isPending || isInfo) && (
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, alignItems: "center", pl: 1 }}>
                    {isSuccess && <CheckCircle             sx={{ fontSize: 16, color: C.sageDark || "#2f6e4a" }} />}
                    {isPending && <MarkEmailReadOutlined   sx={{ fontSize: 16, color: C.sageDark || "#2f6e4a" }} />}
                    {isInfo    && <InfoOutlined            sx={{ fontSize: 16, color: C.sageDark || "#2f6e4a" }} />}
                    {isError   && <ErrorOutlineOutlined    sx={{ fontSize: 16, color: "#c0392b" }} />}
                    <Typography
                      role={isError ? "alert" : "status"}
                      aria-live={isError ? "assertive" : "polite"}
                      sx={{
                        fontFamily: FONT,
                        fontSize: 13,
                        color: isError ? "#c0392b" : (C.sageDark || "#2f6e4a"),
                      }}
                    >
                      {feedback}
                    </Typography>
                  </Stack>
                )}

                <Typography
                  sx={{
                    mt: 1, pl: 1,
                    fontFamily: FONT, fontSize: 11.5, color: C.muted,
                    lineHeight: 1.5,
                  }}
                >
                  By subscribing you agree to our{" "}
                  <MuiLink
                    onClick={() => navigate("/privacy-policy")}
                    sx={{
                      color: C.sageDark || "#2f6e4a",
                      cursor: "pointer", fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Privacy Policy
                  </MuiLink>
                  . Unsubscribe anytime.
                </Typography>
              </Box>
            </Stack>
          </FadeUp>

          {/* divider */}
          <Box sx={{ borderTop: "1px solid rgba(2,33,36,0.14)", mt: { xs: 5, md: 7 }, mb: { xs: 5, md: 7 } }} />

          {/* columns */}
          <Box sx={{
            display: "grid", gap: { xs: 4, md: 6 },
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1.4fr repeat(3, 1fr)" },
          }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box sx={{
                  width: 34, height: 34, borderRadius: "50%", bgcolor: C.sage,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Typography sx={{ fontFamily: FONT, color: "#fff", fontWeight: 700, fontSize: 12.5 }}>IE</Typography>
                </Box>
                <Typography sx={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: C.ink }}>
                  IEvalx
                </Typography>
              </Stack>
              <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, mt: 2, lineHeight: 1.8, maxWidth: 270 }}>
                The AI hiring platform where verified skills meet real opportunities —
                assessments, interviews and matching in one place.
              </Typography>
              <Stack direction="row" spacing={1.25} sx={{ mt: 2.5 }} aria-label="Social media links">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <Box
                    key={label}
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`IEvalx on ${label}`}
                    sx={{
                      width: 38, height: 38, borderRadius: "50%",
                      bgcolor: "#fff", color: C.ink,
                      boxShadow: "0 8px 20px rgba(2,33,36,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all .25s",
                      textDecoration: "none",
                      "& svg": { fontSize: 16 },
                      "&:hover": { bgcolor: C.sage, color: "#fff" },
                    }}
                  >
                    <Icon />
                  </Box>
                ))}
              </Stack>
            </Box>


            {FOOTER_COLS.filter(col => col.head !== "Product").map(col => (
              <Box key={col.head}>
                <Typography sx={{ fontFamily: FONT, fontSize: 16.5, fontWeight: 600, color: C.ink }}>
                  {col.head}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.875, mb: 2.25 }}>
                  <Box sx={{ width: 16, height: 2.5, borderRadius: "2px", bgcolor: C.sage }} />
                  <Box sx={{ width: 8, height: 2.5, borderRadius: "2px", bgcolor: C.sage, opacity: 0.55 }} />
                </Stack>
                <Stack spacing={1.375}>
                  {col.links.map(l => {

                   const ROUTES = {
                      "Blog": "/blogs", "Latest Posts": "/blogs",
                      "Pricing": "/pricing",
                      "What we Offer": "/what-we-offer", "Our Story": "/our-story",
                      "Privacy Policy": "/privacy-policy", "Terms & Conditions": "/terms-and-conditions",
                      "FAQ": "/support", "Help Center": "/support",
                      "Templates": "/jobs", "Product Tour": "/categories",
                      "AI Interviews": "/jobseeker/ai-interview",
                      "Assessments": "/jobseeker/ai-assessments",
                      "Job Matching": "/jobseeker/find-jobs",
                      "Book Interview": "/jobseeker/smart-interviews/live",
                    };
                    return (
                      <Typography
                        key={l}
                         onClick={() => { const r = ROUTES[l]; if (r) navigate(r); }}
                        sx={{
                          fontFamily: FONT, fontSize: 13.5, color: C.muted, cursor: "pointer",
                          transition: "color .2s", width: "fit-content",
                          "&:hover": { color: C.sageDark },
                        }}
                      >
                        {l}
                      </Typography>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Box>

          {/* copyright */}
          <Box sx={{
            borderTop: "1px solid rgba(2,33,36,0.14)", mt: { xs: 5, md: 7 }, pt: 3,
            textAlign: "center",
          }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: C.muted }}>
              Copyright © {new Date().getFullYear()}{" "}
              <Box component="span" sx={{ color: C.sageDark, fontWeight: 600 }}>IEvalx</Box>. All Rights Reserved.
            </Typography>
          </Box>
        </Container>
      </Box>


      <Dialog
        open={nlDialog.open}
        onClose={() => setNlDialog((d) => ({ ...d, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              p: 1,
              boxShadow: "0 24px 60px rgba(2,33,36,0.18)",
            },
          },
        }}
      >
        <DialogContent sx={{ position: "relative", textAlign: "center", py: 4, px: 3 }}>
          <IconButton
            aria-label="Close"
            onClick={() => setNlDialog((d) => ({ ...d, open: false }))}
            sx={{ position: "absolute", top: 8, right: 8, color: C.muted }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {nlDialog.loading ? (
            <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
              <CircularProgress size={36} sx={{ color: C.sage }} />
              <Typography sx={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>
                Just a moment…
              </Typography>
            </Stack>
          ) : (
            <>
              <Box sx={{ mb: 1.5 }}>
                {(nlDialog.kind === "verify-ok" || nlDialog.kind === "unsub-ok") && (
                  <CheckCircle sx={{ fontSize: 44, color: C.sageDark || "#2f6e4a" }} />
                )}
                {(nlDialog.kind === "verify-err" || nlDialog.kind === "unsub-err") && (
                  <ErrorOutlineOutlined sx={{ fontSize: 44, color: "#c0392b" }} />
                )}
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.ink, mb: 1 }}>
                {nlDialog.kind === "verify-ok"  && "Subscription confirmed"}
                {nlDialog.kind === "verify-err" && "Could not confirm subscription"}
                {nlDialog.kind === "unsub-ok"   && "You've been unsubscribed"}
                {nlDialog.kind === "unsub-err"  && "Could not unsubscribe"}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
                {nlDialog.message}
              </Typography>

              <SageButton
                onClick={() => setNlDialog((d) => ({ ...d, open: false }))}
                sx={{ mt: 3, height: 44, px: 3, fontSize: 13.5 }}
              >
                Got it
              </SageButton>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}