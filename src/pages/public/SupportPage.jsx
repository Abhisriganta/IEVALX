import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Container, Paper, TextField, Button, Select, MenuItem,
  Alert, CircularProgress,
} from "@mui/material";
import {
  MailOutlined, SupportAgentOutlined, MenuBookOutlined, KeyboardArrowDown,
  CheckCircleOutlined, AccessTime, ArrowForward,
} from "@mui/icons-material";
import { C, FONT, REDUCED, CAN_HOVER } from "../landing/theme";
import { FadeUp } from "../landing/primitives";
import PublicLayout, { PageHero } from "./PublicLayout";
import { SUPPORT_TOPICS } from "./publicData";
import { FAQS } from "../landing/data";
import { sendContactMessage, isContactFormValid } from "../../services/contactService";


const inputSx = {
  "& .MuiOutlinedInput-root": {
    fontFamily: FONT, fontSize: 14, borderRadius: "12px", bgcolor: "#fff",
    "& fieldset": { borderColor: C.line },
    "&:hover fieldset": { borderColor: "rgba(127,158,126,0.6)" },
    "&.Mui-focused fieldset": { borderColor: C.sage, borderWidth: "1.5px" },
  },
  "& .MuiInputLabel-root": {
    fontFamily: FONT, fontSize: 13.5, color: C.muted,
    "&.Mui-focused": { color: C.sageDark },
  },
};

function ChannelCard({ icon, title, desc, actionLabel, onAction, note }) {
  return (
    <Paper elevation={0} sx={{
      bgcolor: "#fff", borderRadius: "18px", p: "24px 24px 22px", height: "100%",
      border: `1px solid ${C.line}`,
      display: "flex", flexDirection: "column",
      boxShadow: "0 12px 30px rgba(2,33,36,0.05)",
      transition: "transform .3s cubic-bezier(0.22,1,0.36,1), box-shadow .3s ease, border-color .3s ease",
      "&:hover": CAN_HOVER ? {
        transform: "translateY(-5px)",
        boxShadow: "0 24px 56px rgba(2,33,36,0.12)",
        borderColor: "rgba(127,158,126,0.5)",
      } : {},
    }}>
      <Box sx={{
        width: 50, height: 50, borderRadius: "14px",
        bgcolor: C.sageSoft, color: C.sageDark,
        display: "flex", alignItems: "center", justifyContent: "center",
        "& svg": { fontSize: 24 },
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.ink, mt: 2 }}>
        {title}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: 13.25, color: C.muted, mt: 0.875, lineHeight: 1.7 }}>
        {desc}
      </Typography>
      <Stack
        direction="row" spacing={0.75}
        onClick={onAction}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAction(); } }}
        sx={{
          alignItems: "center",
          mt: "auto", pt: 2.25, cursor: "pointer", width: "fit-content", outline: "none",
          "&:hover .ch-arrow": { transform: "translateX(4px)" },
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.sageDark }}>
          {actionLabel}
        </Typography>
        <ArrowForward className="ch-arrow" sx={{ fontSize: 15, color: C.sageDark, transition: "transform .25s" }} />
      </Stack>
      {note && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
          <AccessTime sx={{ fontSize: 13, color: "#9AA09B" }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 11.75, color: "#9AA09B" }}>{note}</Typography>
        </Stack>
      )}
    </Paper>
  );
}

export default function SupportPage() {
  const navigate = useNavigate();
  const [form, setForm]   = useState({ name: "", email: "", topic: "", message: "" });
  const [sent, setSent]   = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);

  const canSend = isContactFormValid(form) && Boolean(form.topic);
  const set = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (error) setError("");
  };

  // ── real submission state ────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (!canSend || sending) return;
    setSending(true);
    setError("");
    try {
      await sendContactMessage(form);
      setSent(true);
    } catch (err) {
      setError(err?.message || "Could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Support"
        title="How Can We Help?"
        back={{ label: "Back to Home", to: "/" }}
        subtitle="Questions about assessments, CIR scores, billing or hiring tools — our team replies within a day, usually much faster."
      />

      <Container maxWidth="lg" sx={{ mt: { xs: 4.5, md: 6 }, mb: { xs: 6, md: 9 } }}>
        {/* ── channel cards ── */}
        <Box sx={{
          display: "grid", gap: 2.5,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        }}>
          <FadeUp>
            <ChannelCard
              icon={<MailOutlined />}
              title="Email Us"
              desc="Write to us with as much detail as you'd like — screenshots welcome."
              actionLabel="support@ievalx.com"
              onAction={() => { window.location.href = "mailto:support@ievalx.com"; }}
              note="Replies within 24 hours"
            />
          </FadeUp>
          <FadeUp delay={0.08}>
            <ChannelCard
              icon={<SupportAgentOutlined />}
              title="Billing & Support"
              desc="Manage your plan, review invoices, or raise a support ticket from your dashboard."
              actionLabel="Go to Help & Support"
              onAction={() => navigate("/jobseeker/support")}
              note="Replies within 24 hours"
            />
          </FadeUp>
          <FadeUp delay={0.16}>
            <ChannelCard
              icon={<MenuBookOutlined />}
              title="Help Articles"
              desc="Guides on interviews, scores and hiring pipelines — start with the FAQ below."
              actionLabel="Browse the blog"
              onAction={() => navigate("/blogs")}
              note="Updated weekly"
            />
          </FadeUp>
        </Box>

        {/* ── form + FAQ split ── */}
        <Box sx={{
          display: "grid", gap: { xs: 4, md: 6 }, mt: { xs: 5, md: 7 },
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
          alignItems: "start",
        }}>
          {/* message form */}
          <FadeUp>
            <Paper elevation={0} sx={{
              bgcolor: "#fff", borderRadius: "20px", border: `1px solid ${C.line}`,
              p: { xs: "24px 22px", md: "32px 34px" },
              boxShadow: "0 16px 44px rgba(2,33,36,0.06)",
            }}>
              {!sent ? (
                <>
                  <Typography sx={{ fontFamily: FONT, fontSize: 21, fontWeight: 700, color: C.ink }}>
                    Send us a message
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, mt: 0.75, lineHeight: 1.7 }}>
                    Tell us what's going on and we'll get back to you on email.
                  </Typography>

                  <Stack spacing={2.25} sx={{ mt: 3 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2.25}>
                      <TextField
                        fullWidth label="Your name" value={form.name} onChange={set("name")} sx={inputSx}
                      />
                      <TextField
                        fullWidth label="Email address" type="email" value={form.email} onChange={set("email")} sx={inputSx}
                      />
                    </Stack>
                    <Select
                      value={form.topic}
                      onChange={set("topic")}
                      displayEmpty
                      IconComponent={KeyboardArrowDown}
                      renderValue={v => v || "What's this about?"}
                      sx={{
                        fontFamily: FONT, fontSize: 14, borderRadius: "12px", bgcolor: "#fff",
                        color: form.topic ? C.ink : C.muted,
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: C.line },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(127,158,126,0.6)" },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: C.sage, borderWidth: "1.5px" },
                        "& .MuiSvgIcon-root": { color: C.muted },
                      }}
                      MenuProps={{ PaperProps: { sx: { mt: 1, borderRadius: 3, boxShadow: "0 18px 50px rgba(2,33,36,0.14)", "& .MuiMenuItem-root": { fontFamily: FONT, fontSize: 13.5 } } } }}
                    >
                      {SUPPORT_TOPICS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                    <TextField
                      fullWidth multiline minRows={5}
                      label="Your message"
                      value={form.message} onChange={set("message")}
                      sx={inputSx}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={!canSend || sending}
                      startIcon={sending
                        ? <CircularProgress size={16} sx={{ color: "#fff" }} />
                        : null}
                      sx={{
                        fontFamily: FONT, textTransform: "none", alignSelf: "flex-start",
                        bgcolor: C.sage, color: "#fff", borderRadius: "999px",
                        px: 3.5, height: 48, fontSize: 14.5, fontWeight: 600, minWidth: 0,
                        transition: "background .3s cubic-bezier(0.22,1,0.36,1)",
                        "&:hover": { bgcolor: C.ink },
                        "&.Mui-disabled": { bgcolor: "rgba(127,158,126,0.35)", color: "rgba(255,255,255,0.8)" },
                      }}
                    >
                      {sending ? "Sending…" : "Send Message"}
                    </Button>

                    {error && (
                      <Alert
                        severity="error"
                        onClose={() => setError("")}
                        sx={{
                          fontFamily: FONT, fontSize: 13.5, borderRadius: "12px",
                          alignItems: "center",
                        }}
                      >
                        {error}
                      </Alert>
                    )}
                  </Stack>
                </>
              ) : (
                /* success state */
                <Box sx={{ textAlign: "center", py: { xs: 3, md: 5 } }}>
                  <Box sx={{
                    width: 72, height: 72, borderRadius: "50%", bgcolor: C.sageSoft, mx: "auto",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: REDUCED ? "none" : "supportPop .5s cubic-bezier(0.34,1.4,0.5,1) both",
                    "@keyframes supportPop": {
                      from: { opacity: 0, transform: "scale(0.6)" },
                      to:   { opacity: 1, transform: "scale(1)" },
                    },
                  }}>
                    <CheckCircleOutlined sx={{ fontSize: 34, color: C.sage }} />
                  </Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.ink, mt: 2.5 }}>
                    Message sent, {form.name.split(" ")[0]}!
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: C.muted, mt: 1, lineHeight: 1.75, maxWidth: 360, mx: "auto" }}>
                    We've received your message about <Box component="span" sx={{ color: C.sageDark, fontWeight: 600 }}>{form.topic}</Box>.
                    A reply is on its way to <Box component="span" sx={{ color: C.ink, fontWeight: 600 }}>{form.email}</Box> — usually well within a day.
                  </Typography>
                  <Button
                    onClick={() => { setSent(false); setForm({ name: "", email: "", topic: "", message: "" }); }}
                    sx={{
                      fontFamily: FONT, textTransform: "none", mt: 3,
                      color: C.sageDark, border: `1.5px solid ${C.sage}`, borderRadius: "999px",
                      px: 2.75, height: 42, fontSize: 13.5, fontWeight: 600, minWidth: 0,
                      "&:hover": { bgcolor: C.sageSoft },
                    }}
                  >
                    Send another message
                  </Button>
                </Box>
              )}
            </Paper>
          </FadeUp>

          {/* FAQ accordion (reused landing data) */}
          <FadeUp delay={0.1}>
            <Typography sx={{ fontFamily: FONT, fontSize: 21, fontWeight: 700, color: C.ink, mb: 1 }}>
              Quick answers
            </Typography>
            <Box>
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <Box key={f.q} sx={{ borderBottom: `1px solid ${C.line}` }}>
                    <Box
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      role="button" tabIndex={0} aria-expanded={open}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenFaq(open ? -1 : i); } }}
                      sx={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 2, py: 2.25, cursor: "pointer", outline: "none",
                        "&:hover .sup-q": { color: C.sageDark },
                      }}
                    >
                      <Typography className="sup-q" sx={{
                        fontFamily: FONT, fontSize: { xs: 14, sm: 15 }, fontWeight: 600,
                        color: open ? C.sageDark : C.ink,
                        transition: "color .25s ease",
                      }}>
                        {f.q}
                      </Typography>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        border: `1.5px solid ${open ? C.sage : C.line}`,
                        bgcolor: open ? C.sage : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background .3s ease, border-color .3s ease, transform .35s cubic-bezier(0.22,1,0.36,1)",
                        transform: open ? "rotate(45deg)" : "rotate(0deg)",
                      }}>
                        <Box component="svg" viewBox="0 0 24 24" sx={{ width: 12, height: 12 }}>
                          <path d="M12 5 V19 M5 12 H19" fill="none"
                            stroke={open ? "#fff" : "#8A8F8B"}
                            strokeWidth="2.5" strokeLinecap="round" />
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{
                      display: "grid",
                      gridTemplateRows: open ? "1fr" : "0fr",
                      transition: REDUCED ? "none" : "grid-template-rows .45s cubic-bezier(0.22,1,0.36,1)",
                    }}>
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography sx={{
                          fontFamily: FONT, fontSize: 13.5, color: C.muted,
                          lineHeight: 1.75, pb: 2.25, pr: { md: 4 },
                          opacity: open ? 1 : 0,
                          transition: REDUCED ? "none" : "opacity .4s ease .1s",
                        }}>
                          {f.a}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </FadeUp>
        </Box>
      </Container>
    </PublicLayout>
  );
}