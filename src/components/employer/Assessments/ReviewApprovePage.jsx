import React from "react";
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
  Button,
  keyframes,
} from "@mui/material";
import {
  ArrowBack,
  AutoAwesome,
  Close,
  Delete,
  Refresh,
  CheckCircle,
  Warning,
  Send as SendIcon,
  ExpandMore,
  ExpandLess,
  Check,
  ContentCopy,
} from "@mui/icons-material";

import { T } from "./Extendedbuilder";
import {
  QTYPE_LABEL,
  sectionCard,
  navyBtn,
  ghostBtn,
  StemEditor,
} from "./AIBuilderShared";

const msgFade = keyframes`
  0%, 18%  { opacity: 1; transform: translateY(0); }
  22%, 100% { opacity: 0; transform: translateY(-8px); }
`;

const ROTATING_MESSAGES = [
  "Reading your topic document…",
  "Mapping concepts to question types…",
  "Calibrating difficulty level…",
  "Reviewing question quality…",
];

export default function ReviewApprovePage({
  gen,
  embedded = false,
  onComplete = null,
  closeBuilder,
  navigate,
  origin = null,
  onSaveAndReturn = null,
}) {
  const {
    step,
    setStep,
    version,
    genStatus,
    openSecs,
    setOpenSecs,
    regenSection,
    regenQid,
    busy,
    assessmentId,
    copyAssessmentId,
    onRegenerateSection,
    onRegenerateQuestion,
    onDeleteQuestion,
    onEditStem,
    onApprove,
  } = gen;

  // step 2 → approved card; step 1 → generating spinner or the review screen
  return step === 2 ? renderApproved() : renderGenerate();

  // ── STEP 1: GENERATE (loading) or REVIEW (when version ready) ─────────────
  function renderGenerate() {
    if (!version) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            px: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: 480,
            }}
          >
            
            <CircularProgress
              size={44}
              thickness={4}
              sx={{ color: T.navy, mb: 3 }}
            />

            {/* ── Headline ── */}
            <Typography
              sx={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: T.navy,
                mb: 0.5,
              }}
            >
              Generating your questions
            </Typography>

            {/* ── Subtitle ── */}
            <Typography
              sx={{
                fontSize: "0.82rem",
                color: T.textMuted,
                mb: 2.5,
              }}
            >
              This typically takes more seconds or minutes for larger papers.
            </Typography>

            {/* ── Rotating status messages (kept — this isn't a spinner) ── */}
            <Box
              sx={{
                height: 20,
                overflow: "hidden",
                position: "relative",
                width: "100%",
              }}
            >
              {ROTATING_MESSAGES.map((msg, i) => (
                <Typography
                  key={i}
                  sx={{
                    fontSize: "0.78rem",
                    color: "#4666B8",
                    position: "absolute",
                    width: "100%",
                    top: 0,
                    left: 0,
                    height: 20,
                    lineHeight: "20px",
                    animation: `${msgFade} ${ROTATING_MESSAGES.length * 3}s ease-in-out ${i * 3}s infinite`,
                    opacity: 0,
                  }}
                >
                  {msg}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>
      );
    }
    return renderReview();
  }

  // ── STEP 1 continued: REVIEW (version loaded) ─────────────────────────────
  function renderReview() {
    const { paper, coverage, validation } = version;
    const passed = validation?.passed;
    return (
      <Stack
        spacing={2.5}
        sx={{ width: "100%", maxWidth: "100%", mx: "auto", pb: 10 }}
      >
        <Box
          sx={{
            borderRadius: "14px",
            bgcolor: passed ? T.successBg || "#ECFDF5" : T.warnBg || "#FEF3C7",
            border: `1px solid ${passed ? T.successBdr || "#A7F3D0" : T.warnBdr || "#FDE68A"}`,
            px: 2.5,
            py: 1.75,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            {passed ? (
              <CheckCircle sx={{ fontSize: 22, color: T.success }} />
            ) : (
              <Warning sx={{ fontSize: 22, color: T.warn }} />
            )}
            <Typography
              sx={{
                fontSize: "0.92rem",
                fontWeight: 700,
                color: passed ? T.success : T.warn,
              }}
            >
              {passed
                ? `Validation passed · ${validation?.produced_total ?? '—'}/${validation?.requested_total ?? '—'} questions`
                : `Needs attention · ${validation?.produced_total ?? '—'}/${validation?.requested_total ?? '—'} questions`}
            </Typography>
            <Box sx={{ flex: 1 }} />
            {validation?.quota_info && !validation.quota_info.met && (
              <Chip
                size="small"
                label={
                  `${validation.quota_info.produced_pct}% visual ` +
                  `(document mentions ~${validation.quota_info.requested_pct}%)`
                }
                variant="outlined"
                sx={{
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  height: 22,
                  color: T.textSecond,
                  borderColor: T.line || "#E5E7EB",
                }}
              />
            )}
            {coverage?.total_skills > 0 && (
              <Typography
                sx={{
                  fontSize: "0.76rem",
                  color: T.textSecond,
                  fontWeight: 600,
                }}
              >
                {coverage?.percent}% skill coverage
              </Typography>
            )}
          </Stack>
          {coverage?.total_skills > 0 && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: "wrap", gap: 0.75, mt: 1.25 }}
            >
              {Object.entries(coverage?.skills || {}).map(([s, ok]) => (
                <Chip
                  key={s}
                  size="small"
                  icon={
                    ok ? (
                      <CheckCircle sx={{ fontSize: 13 }} />
                    ) : (
                      <Close sx={{ fontSize: 13 }} />
                    )
                  }
                  label={s}
                  sx={{
                    borderRadius: "6px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    bgcolor: ok ? "#fff" : T.errorBg || "#FEE2E2",
                    color: ok ? T.success : T.error,
                    border: `1px solid ${ok ? T.successBdr || "#A7F3D0" : T.errorBdr || "#FCA5A5"}`,
                    "& .MuiChip-icon": { color: "inherit" },
                  }}
                />
              ))}
            </Stack>
          )}
          {(validation?.issues?.length > 0 ||
            validation?.warnings?.length > 0) && (
            <Box sx={{ mt: 1.25 }}>
              {validation.issues?.map((m, i) => (
                <Alert
                  key={`i${i}`}
                  severity="error"
                  sx={{
                    py: 0,
                    mb: 0.5,
                    fontSize: "0.74rem",
                    borderRadius: "8px",
                  }}
                >
                  {m}
                </Alert>
              ))}
              {validation.warnings?.map((m, i) => (
                <Alert
                  key={`w${i}`}
                  severity="warning"
                  sx={{
                    py: 0,
                    mb: 0.5,
                    fontSize: "0.74rem",
                    borderRadius: "8px",
                  }}
                >
                  {m}
                </Alert>
              ))}
            </Box>
          )}
        </Box>

        {/* sections */}
        {paper?.sections?.map((sec) => {
          const open = !!openSecs[sec.id];
          const isThisSectionRegen = regenSection === sec.name;
          const otherRegenActive =
            (regenSection && !isThisSectionRegen) || regenQid != null;
          return (
            <Card key={sec.id} sx={{ ...sectionCard, position: "relative" }}>
              <CardContent sx={{ p: 2.5, pb: open ? 2 : 2.5 }}>
                {/* section header row */}
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <IconButton
                    size="small"
                    onClick={() => setOpenSecs({ ...openSecs, [sec.id]: !open })}
                    sx={{ color: T.textSecond, p: 0.5 }}
                  >
                    {open ? (
                      <ExpandLess sx={{ fontSize: 20 }} />
                    ) : (
                      <ExpandMore sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                  <Typography
                    sx={{
                      fontSize: "1.02rem",
                      fontWeight: 700,
                      color: T.textPrimary,
                    }}
                  >
                    {sec.name}
                  </Typography>
                  <Chip
                    label={`${sec.questions?.length || 0} question${(sec.questions?.length || 0) === 1 ? "" : "s"}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      bgcolor: T.warnBg,
                      color: T.warn,
                      border: `1px solid ${T.warnBdr || T.warn}`,
                      borderRadius: "999px",
                      px: 0.75,
                      letterSpacing: "0.02em",
                    }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Button
                    size="small"
                    startIcon={
                      isThisSectionRegen ? (
                        <CircularProgress size={13} sx={{ color: "inherit" }} />
                      ) : (
                        <Refresh sx={{ fontSize: 14 }} />
                      )
                    }
                    disabled={busy}
                    onClick={() => onRegenerateSection(sec.name)}
                    sx={ghostBtn}
                  >
                    {isThisSectionRegen ? "Regenerating…" : "Regenerate section"}
                  </Button>
                </Stack>

                <Collapse in={open}>
                  <Stack spacing={0} sx={{ mt: 2 }}>
                    {sec.questions?.map((q, idx) => (
                      <React.Fragment key={q.id}>
                        {idx > 0 && (
                          <Divider sx={{ my: 0.5, borderColor: T.border }} />
                        )}
                        {renderQuestion(q, idx)}
                      </React.Fragment>
                    ))}
                  </Stack>
                </Collapse>
              </CardContent>
              {isThisSectionRegen && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: "rgba(255, 255, 255, 0.82)",
                    backdropFilter: "blur(1px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "inherit",
                    zIndex: 2,
                  }}
                >
                  <Stack alignItems="center" spacing={1.25}>
                    <CircularProgress size={30} sx={{ color: T.navy }} />
                    <Typography
                      sx={{
                        fontSize: "0.92rem",
                        fontWeight: 700,
                        color: T.navy,
                      }}
                    >
                      Regenerating "{sec.name}"…
                    </Typography>
                    <Typography sx={{ fontSize: "0.74rem", color: T.textMuted }}>
                      This can take 30–60 seconds. Other sections are untouched.
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Card>
          );
        })}

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mt: 1, width: "100%" }}
        >
          <Button
            onClick={() => {
              setStep(0);
            }}
            sx={ghostBtn}
            startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
          >
            Edit requirements
          </Button>
          <Box sx={{ flex: 1 }} />
          {/* 🔧 QB mode: replace "Approve & publish" with save-and-return finish button */}
          {origin === 'question-bank' ? (
            <Button
              onClick={onSaveAndReturn}
              disabled={busy || !passed || !onSaveAndReturn}
              sx={navyBtn}
              startIcon={
                busy ? (
                  <CircularProgress size={15} sx={{ color: "#fff" }} />
                ) : (
                  <CheckCircle sx={{ fontSize: 16 }} />
                )
              }
            >
              Save paper &amp; return to Question Bank
            </Button>
          ) : (
            <Button
              onClick={onApprove}
              disabled={busy || !passed}
              sx={navyBtn}
              startIcon={
                busy ? (
                  <CircularProgress size={15} sx={{ color: "#fff" }} />
                ) : (
                  <CheckCircle sx={{ fontSize: 16 }} />
                )
              }
            >
              Approve &amp; publish
            </Button>
          )}
        </Stack>
      </Stack>
    );
  }

  function renderQuestion(q, idx) {
    const typePillSx = {
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.25,
      py: 0.4,
      borderRadius: "999px",
      border: `1px solid ${T.successBdr || "#A7F3D0"}`,
      bgcolor: "#fff",
      fontSize: "0.72rem",
      fontWeight: 600,
      color: T.success,
      whiteSpace: "nowrap",
    };
    const isThisQuestionRegen = regenQid === q.id;

    return (
      <Box
        sx={{
          py: 2,
          position: "relative",
          opacity: isThisQuestionRegen ? 0.55 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {/* top row: type pill (left) · icons (right) */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
          <Box sx={typePillSx}>
            {QTYPE_LABEL[q.question_type] || q.question_type} · {q.marks} mark
            {q.marks > 1 ? "s" : ""}
          </Box>
          {typeof q.quality_score === "number" && (
            <Chip
              label={`Q ${q.quality_score}/5`}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.66rem",
                fontWeight: 700,
                bgcolor: T.navyLight,
                color: T.navy,
                borderRadius: "999px",
              }}
            />
          )}
          {isThisQuestionRegen && (
            <Chip
              size="small"
              icon={<CircularProgress size={11} sx={{ color: "inherit" }} />}
              label="Regenerating…"
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: T.navyLight,
                color: T.navy,
                borderRadius: "999px",
                "& .MuiChip-icon": { color: "inherit", ml: 0.75 },
              }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            disabled={busy}
            onClick={() => onRegenerateQuestion(q.id)}
            startIcon={
              isThisQuestionRegen ? (
                <CircularProgress size={13} sx={{ color: "inherit" }} />
              ) : (
                <Refresh sx={{ fontSize: 14 }} />
              )
            }
            sx={{
              ...ghostBtn,
              minWidth: 0,
              px: 1,
              py: 0.4,
              fontSize: "0.72rem",
              height: 28,
            }}
          >
            {isThisQuestionRegen ? "Regenerating…" : "Regenerate"}
          </Button>
          <Tooltip title="Delete">
            <span>
              <IconButton
                size="small"
                disabled={busy}
                onClick={() => onDeleteQuestion(q.id)}
                sx={{
                  color: T.textMuted,
                  "&:hover": {
                    color: T.error,
                    bgcolor: T.errorBg || "#FEE2E2",
                  },
                }}
              >
                <Delete sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

       <StemEditor
          initial={q.stem}
          disabled={busy}
          onCommit={(next) => onEditStem(q.id, next)}
        />

        {Array.isArray(q.stem_images) && q.stem_images.length > 0 && (
          <Box sx={{
            mt: 1.5, mb: 0.5,
            display: 'flex', flexWrap: 'wrap', gap: 1.25,
          }}>
            {q.stem_images.map((img, ii) => {
              const src = typeof img === 'string' ? img : (img?.url || '');
              if (!src) return null;
              return (
                <Box key={ii}
                  component="img"
                  src={src}
                  alt={`Question diagram ${ii + 1}`}
                  sx={{
                    maxWidth: 320,
                    maxHeight: 240,
                    borderRadius: 1.5,
                    border: '1px solid #E5E7EB',
                    bgcolor: '#FAFBFD',
                    objectFit: 'contain',
                    display: 'block',
                    cursor: 'zoom-in',
                  }}
                  onClick={(e) => {
                    window.open(e.currentTarget.src, '_blank', 'noopener,noreferrer');
                  }}
                />
              );
            })}
          </Box>
        )}

        {Array.isArray(q.options) && (
          <Stack spacing={0.5}>
            {q.options.map((o) => {
              const correct = Array.isArray(q.correct_answer)
                ? q.correct_answer.includes(o.key)
                : q.correct_answer === o.key;
              return (
                <Stack
                  key={o.key}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    px: 1.25,
                    py: 1,
                    borderRadius: "10px",
                    bgcolor: correct ? T.successBg || "#ECFDF5" : "transparent",
                    border: correct
                      ? `1px solid ${T.successBdr || "#A7F3D0"}`
                      : "1px solid transparent",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: correct ? T.success : T.textMuted,
                      minWidth: 18,
                    }}
                  >
                    {o.key}.
                  </Typography>
                 <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontSize: "0.88rem",
                        fontWeight: correct ? 700 : 500,
                        color: correct ? T.success : T.textSecond,
                        lineHeight: 1.5,
                      }}
                    >
                      {o.text}
                    </Typography>
                    {/* 🔧 Render option image — mirrors AIAssessmentTest.jsx line 944-964 */}
                    {(() => {
                      const src = typeof o.image === 'string' ? o.image : (o.image?.url || '');
                      if (!src) return null;
                      return (
                        <Box
                          component="img"
                          src={src}
                          alt={`Option ${o.key}`}
                          sx={{
                            maxWidth: 200, maxHeight: 150,
                            borderRadius: 1, border: '1px solid #E5E7EB',
                            bgcolor: '#FAFBFD', objectFit: 'contain',
                            display: 'block', cursor: 'zoom-in',
                          }}
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            window.open(e.currentTarget.src, '_blank', 'noopener,noreferrer');
                          }}
                        />
                      );
                    })()}
                  </Box>
                  {correct && <Check sx={{ fontSize: 18, color: T.success }} />}
                </Stack>
              );
            })}
          </Stack>
        )}

       
        {q.question_type === "match" &&
          Array.isArray(q.match_pairs) &&
          q.match_pairs.length > 0 && (
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {q.match_pairs.map((pair, i) => (
                <Stack
                  key={`${i}-${String(pair?.left || "").slice(0, 20)}`}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    px: 1.25,
                    py: 1,
                    borderRadius: "10px",
                    bgcolor: T.successBg || "#ECFDF5",
                    border: `1px solid ${T.successBdr || "#A7F3D0"}`,
                  }}
                >
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: T.textPrimary,
                      lineHeight: 1.5,
                    }}
                  >
                    {pair?.left}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: T.success,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    →
                  </Typography>
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      color: T.success,
                      lineHeight: 1.5,
                    }}
                  >
                    {pair?.right}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}

  
        {q.question_type === "sequence" &&
          (() => {
            const orderedList = Array.isArray(q.correct_answer)
              ? q.correct_answer
              : Array.isArray(q.sequence_items)
                ? q.sequence_items
                : null;
            if (!orderedList || orderedList.length === 0) return null;
            return (
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {orderedList.map((step, i) => (
                  <Stack
                    key={`${i}-${String(step).slice(0, 20)}`}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      px: 1.25,
                      py: 1,
                      borderRadius: "10px",
                      bgcolor: T.successBg || "#ECFDF5",
                      border: `1px solid ${T.successBdr || "#A7F3D0"}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: T.success,
                        minWidth: 22,
                      }}
                    >
                      {i + 1}.
                    </Typography>
                    <Typography
                      sx={{
                        flex: 1,
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: T.textPrimary,
                        lineHeight: 1.5,
                      }}
                    >
                      {step}
                    </Typography>
                    <Check sx={{ fontSize: 18, color: T.success }} />
                  </Stack>
                ))}
              </Stack>
            );
          })()}

      
        {q.question_type === "fill_blank" &&
          (q.correct_answer || q.fill_blank_answer) && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                px: 1.25,
                py: 1,
                mt: 0.5,
                borderRadius: "10px",
                bgcolor: T.successBg || "#ECFDF5",
                border: `1px solid ${T.successBdr || "#A7F3D0"}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: T.success,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  minWidth: 60,
                }}
              >
                Answer
              </Typography>
              <Typography
                sx={{
                  flex: 1,
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: T.textPrimary,
                  lineHeight: 1.5,
                }}
              >
                {String(q.correct_answer || q.fill_blank_answer)}
              </Typography>
              <Check sx={{ fontSize: 18, color: T.success }} />
            </Stack>
          )}

        {/* type-specific meta */}
        {q.question_type === "coding" && Array.isArray(q.test_cases) && (
          <Typography sx={{ fontSize: "0.75rem", color: T.textMuted, mt: 1.25 }}>
            {q.test_cases.length} test cases (
            {q.test_cases.filter((t) => t.hidden).length} hidden)
          </Typography>
        )}
        {q.question_type === "sql" && (
          <Typography sx={{ fontSize: "0.75rem", color: T.textMuted, mt: 1.25 }}>
            Includes schema, seed data and expected resultset
          </Typography>
        )}
        {(q.question_type === "short_answer" ||
          q.question_type === "scenario") &&
          q.ai_rubric && (
            <Typography
              sx={{
                fontSize: "0.8rem",
                color: T.textMuted,
                mt: 1.25,
                fontStyle: "italic",
                lineHeight: 1.55,
              }}
            >
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  color: T.textSecond,
                  fontStyle: "normal",
                }}
              >
                Rubric:
              </Box>{" "}
              {q.ai_rubric}
            </Typography>
          )}
      </Box>
    );
  }

  function renderApproved() {
    const totalQ = version?.paper?.sections?.reduce(
      (acc, s) => acc + (s.questions?.length || 0),
      0,
    );

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          pt: { xs: 3, md: 6 },
          pb: 6,
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 640,
            borderRadius: "18px",
            border: `1px solid ${T.border}`,
            boxShadow: "0 12px 40px -18px rgba(30, 51, 88, 0.18)",
            bgcolor: T.surface,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            sx={{
              height: 4,
              background: `linear-gradient(90deg, ${T.success} 0%, ${T.navy} 100%)`,
            }}
          />

          <CardContent
            sx={{
              px: { xs: 3, sm: 5 },
              py: { xs: 4, sm: 5 },
              textAlign: "center",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
              <Box
                sx={{
                  position: "relative",
                  width: 96,
                  height: 96,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    bgcolor: T.successBg || "#ECFDF5",
                    opacity: 0.6,
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 10,
                    borderRadius: "50%",
                    bgcolor: T.successBg || "#ECFDF5",
                    border: `1px solid ${T.successBdr || "#A7F3D0"}`,
                  }}
                />
                <Box
                  sx={{
                    position: "relative",
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    bgcolor: T.success,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 8px 20px -6px ${T.success}66`,
                  }}
                >
                  <Check sx={{ fontSize: 34, color: "#fff", strokeWidth: 3 }} />
                </Box>
              </Box>
            </Box>

            {/* headline */}
            <Typography
              sx={{
                fontSize: { xs: "1.35rem", sm: "1.5rem" },
                fontWeight: 700,
                color: T.textPrimary,
                lineHeight: 1.25,
                mb: 1,
              }}
            >
              Assessment approved &amp; published
            </Typography>
            <Typography
              sx={{
                fontSize: "0.88rem",
                color: T.textSecond,
                maxWidth: 460,
                mx: "auto",
                lineHeight: 1.6,
              }}
            >
              {embedded
                ? "Your assessment is live. Close this window and select it in the round's assessment dropdown to attach it."
                : "It's saved to your assessment pipeline and ready to assign to candidates from your existing flow."}
            </Typography>

            {/* summary chips row — assessment id + question count */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="center"
              alignItems="center"
              sx={{ mt: 3.5 }}
            >
              {/* assessment id card */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{
                  border: `1px solid ${T.border}`,
                  bgcolor: "#FAFBFD",
                  borderRadius: "12px",
                  px: 1.75,
                  py: 1,
                  minWidth: 240,
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "8px",
                    bgcolor: T.navyLight,
                    color: T.navy,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 17 }} />
                </Box>
                <Box sx={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: T.textMuted,
                      lineHeight: 1,
                    }}
                  >
                    Assessment ID
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: T.textPrimary,
                      lineHeight: 1.3,
                      mt: 0.25,
                    }}
                  >
                    #{assessmentId}
                  </Typography>
                </Box>
                <Tooltip title="Copy ID">
                  <IconButton
                    size="small"
                    onClick={copyAssessmentId}
                    sx={{
                      color: T.textMuted,
                      borderRadius: "8px",
                      "&:hover": { bgcolor: T.navyLight, color: T.navy },
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* questions count card */}
              {typeof totalQ === "number" && totalQ > 0 && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.25}
                  sx={{
                    border: `1px solid ${T.border}`,
                    bgcolor: "#FAFBFD",
                    borderRadius: "12px",
                    px: 1.75,
                    py: 1,
                    minWidth: 180,
                  }}
                >
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: "8px",
                      bgcolor: T.successBg || "#ECFDF5",
                      color: T.success,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AutoAwesome sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ flex: 1, textAlign: "left" }}>
                    <Typography
                      sx={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.textMuted,
                        lineHeight: 1,
                      }}
                    >
                      Questions
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: T.textPrimary,
                        lineHeight: 1.3,
                        mt: 0.25,
                      }}
                    >
                      {totalQ} total
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Stack>

            <Stack
              direction={{ xs: "column-reverse", sm: "row" }}
              spacing={1.5}
              alignItems="center"
              sx={{ mt: 4, width: "100%" }}
            >
              {embedded ? (
                <>
                  <Button
                    onClick={closeBuilder}
                    sx={{ ...ghostBtn, px: 3, py: 1 }}
                  >
                    Close
                  </Button>
                  <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }} />
                  <Button
                    onClick={() => {
                      if (onComplete) onComplete(assessmentId);
                      closeBuilder();
                    }}
                    sx={{ ...navyBtn, px: 3, py: 1 }}
                    startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                  >
                    Use this test
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => navigate("/employer/my-jobs")}
                    sx={{ ...ghostBtn, px: 3, py: 1 }}
                  >
                    Back to my jobs
                  </Button>
                  <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }} />
                  <Button
                    onClick={() => navigate("/employer/candidates")}
                    sx={{ ...navyBtn, px: 3, py: 1 }}
                    startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                  >
                    Assign to candidates
                  </Button>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }
}