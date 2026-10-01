// BUILD: 2026-08-29-iaem-completed-interviews-v3 — pine/sage (no blue)
// Interviewer Dashboard → Completed Interviews
// Shows all submitted evaluations with score comparison drawer
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Card, CardContent, Grid, Chip, Skeleton, Dialog, DialogContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  IconButton, Tooltip, Button, Alert, Divider,
} from '@mui/material';
import {
  CheckCircle, CompareArrows, SmartToy, HourglassEmpty,
  Close, ArrowForward, TrendingUp, Assessment, Warning, Edit,
} from '@mui/icons-material';
import { interviewerService } from '@/services/api/iaem';
import ScoringForm from '../PostInterview/ScoringForm';

/* ── App-native tokens ─────────────────────────────────────────────── */
const T = {
  sage:      '#7F9E7E',
  sageText:  '#5E815D',
  sageDark:  '#6C8B6B',
  sageSoft:  '#EDF3EC',
  pine:      '#04282B',
  pineMid:   '#0a3d40',
  pine2:     '#24433E',
  cream:     '#F6F8F3',
  ink:       '#101210',
  body:      '#2F332E',
  muted:     '#55584F',
  faint:     '#7A7E76',
  line:      '#E7EAE3',
  lineSoft:  '#F0F2ED',
  surface:   '#FFFFFF',
  green:     '#3E6E3E',
  greenBg:   '#EAF2E9',
  amber:     '#A35A2D',
  amberBg:   '#F6ECDF',
  red:       '#8B2E2E',
  redBg:     '#FAEAE8',
};
const FONT = "'Jost','DM Sans',sans-serif";

const CARD_SX = { bgcolor: T.surface, border: `1px solid ${T.line}`, borderRadius: '14px', boxShadow: 'none' };

/* ── Table header row — beats the blue MuiTableHead theme ─────────── */
const TH_ROW_SX = {
  bgcolor: `${T.cream} !important`,
  '& .MuiTableCell-head': {
    backgroundColor: `${T.cream} !important`,
    color: `${T.muted} !important`,
    fontWeight: 800, fontSize: '0.72rem', fontFamily: FONT,
    borderBottom: `1px solid ${T.line} !important`,
    letterSpacing: '0.05em', textTransform: 'uppercase',
  },
};
const TD_ROW_SX = {
  '&:hover': { bgcolor: T.cream },
  '& .MuiTableCell-root': { borderBottom: `1px solid ${T.line} !important` },
  '&:last-child .MuiTableCell-root': { borderBottom: '0 !important' },
};

// ── Recommendation labels ───────────────────────────────────────────────
const REC_LABELS = {
  HIRE: 'Hire', LEAN_HIRE: 'Lean-Hire',
  LEAN_NO_HIRE: 'Lean-No-Hire', NO_HIRE: 'No-Hire',
};
const REC_COLORS = {
  HIRE:         { bg: T.greenBg, color: T.green },
  LEAN_HIRE:    { bg: T.greenBg, color: T.green },
  LEAN_NO_HIRE: { bg: T.amberBg, color: T.amber },
  NO_HIRE:      { bg: T.redBg,   color: T.red },
};

// ── Summary stat card ───────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, accent = T.sage, iconBg = T.sageSoft, valueColor }) => (
  <Card elevation={0} sx={{ ...CARD_SX, height: '100%' }}>
    <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography sx={{
          fontSize: '0.72rem', color: T.muted, fontWeight: 800, fontFamily: FONT,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {label}
        </Typography>
        <Box sx={{
          width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '10px', bgcolor: iconBg, color: accent,
          flexShrink: 0, '& svg': { fontSize: 18 },
        }}>
          <Icon />
        </Box>
      </Box>
      <Typography sx={{
        fontFamily: FONT, fontWeight: 800, color: valueColor || T.ink, lineHeight: 1,
        letterSpacing: '-0.02em', fontSize: { xs: '1.75rem', md: '2.15rem' },
      }}>
        {value ?? '—'}
      </Typography>
    </CardContent>
  </Card>
);

// ── Divergence chip ─────────────────────────────────────────────────────
const DivergenceChip = ({ value }) => {
  if (value == null) return <Chip label="—" size="small" sx={{ bgcolor: T.lineSoft, color: T.faint, fontWeight: 600, fontSize: '0.72rem', fontFamily: FONT }} />;
  const abs = Math.abs(value);
  const isHigh = abs > 10;
  return (
    <Chip
      label={`${value > 0 ? '+' : ''}${value}`}
      size="small"
      sx={{
        bgcolor: isHigh ? T.amberBg : T.greenBg,
        color: isHigh ? T.amber : T.green,
        fontWeight: 700, fontSize: '0.72rem', fontFamily: FONT,
        border: isHigh ? '1px solid rgba(163,90,45,0.25)' : '1px solid rgba(62,110,62,0.25)',
      }}
    />
  );
};

// ── Signal badges ───────────────────────────────────────────────────────
const SignalChips = ({ signals }) => {
  if (!signals || signals.length === 0) {
    return <Chip label="None" size="small" sx={{ bgcolor: T.greenBg, color: T.green, fontWeight: 600, fontSize: '0.72rem', fontFamily: FONT, border: '1px solid rgba(62,110,62,0.25)' }} />;
  }
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {signals.map((s, i) => (
        <Chip
          key={i}
          label={s.signal_code}
          size="small"
          sx={{
            bgcolor: s.severity === 'CRITICAL' || s.severity === 'HIGH' ? T.redBg : T.amberBg,
            color: s.severity === 'CRITICAL' || s.severity === 'HIGH' ? T.red : T.amber,
            fontWeight: 700, fontSize: '0.72rem', fontFamily: FONT,
          }}
        />
      ))}
    </Box>
  );
};

// ── Section label ───────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <Typography sx={{
    fontWeight: 800, color: T.muted, textTransform: 'uppercase',
    letterSpacing: '0.05em', fontSize: '0.72rem', fontFamily: FONT,
    mb: 1, display: 'block',
  }}>
    {children}
  </Typography>
);


// ═════════════════════════════════════════════════════════════════════════
// SCORE COMPARISON DRAWER — wider (md), pine/sage themed
// ═════════════════════════════════════════════════════════════════════════

const ScoreDrawer = ({ open, onClose, detail, loading, error }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: '14px', border: `1px solid ${T.line}`, maxHeight: '85vh' } },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
      {/* ── Loading state ──────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ p: 3 }}>
          <Skeleton height={40} sx={{ mb: 2 }} />
          <Skeleton height={80} sx={{ mb: 2 }} />
          <Skeleton height={200} />
        </Box>
      )}

      {/* ── Error state ────────────────────────────────────────────── */}
      {!loading && error && (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, fontSize: '1.1rem' }}>
              Score Comparison
            </Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: T.faint }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Alert icon={false} sx={{ borderRadius: '10px', bgcolor: T.redBg, border: '1px solid rgba(139,46,46,0.2)', color: T.red }}>
            Failed to load interview details. Please close and try again.
          </Alert>
        </Box>
      )}

      {/* ── Detail content ─────────────────────────────────────────── */}
      {!loading && !error && detail && (
        <Box sx={{ p: { xs: 2.5, md: 3.5 }, overflowY: 'auto', height: '100%' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, fontSize: '1.1rem' }}>
              Score Comparison
            </Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: T.faint }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* Meta */}
          <Typography sx={{ fontWeight: 700, color: T.ink, fontFamily: FONT, fontSize: '1rem', mb: 0.5 }}>
            {detail.job_title} — {detail.candidate_name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.82rem' }}>
              {detail.interview_date} · {detail.interview_time} {detail.timezone}
            </Typography>
            <Chip label={detail.level} size="small" sx={{
              bgcolor: T.sageSoft, color: T.sageText, fontWeight: 700, fontSize: '0.68rem', fontFamily: FONT,
              height: 20, border: `1px solid rgba(127,158,126,0.22)`,
            }} />
            {detail.audit_enabled && (
              <Chip label="Audit ON" size="small" sx={{
                bgcolor: T.amberBg, color: T.amber, fontWeight: 700, fontSize: '0.68rem', fontFamily: FONT,
                height: 20, border: '1px solid rgba(163,90,45,0.25)',
              }} />
            )}
          </Box>
          {detail.booking_id && (
            <Typography sx={{ color: T.faint, display: 'block', mb: 2, fontFamily: FONT, fontSize: '0.78rem' }}>
              {detail.booking_id}
            </Typography>
          )}
          {!detail.booking_id && <Box sx={{ mb: 1.5 }} />}

          {/* Score boxes */}
          {detail.ai_score_ready ? (
            <>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                <Paper elevation={0} sx={{ flex: 1, p: 2, textAlign: 'center', bgcolor: T.cream, borderRadius: '10px', border: `1px solid ${T.line}` }}>
                  <Typography sx={{ color: T.faint, fontSize: '0.72rem', fontFamily: FONT, fontWeight: 600 }}>Your score</Typography>
                  <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, fontSize: '1.5rem' }}>{detail.overall_score}</Typography>
                </Paper>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5 }}>
                  <CompareArrows sx={{ color: T.faint, fontSize: 22 }} />
                </Box>
                <Paper elevation={0} sx={{ flex: 1, p: 2, textAlign: 'center', bgcolor: T.cream, borderRadius: '10px', border: `1px solid ${T.line}` }}>
                  <Typography sx={{ color: T.faint, fontSize: '0.72rem', fontFamily: FONT, fontWeight: 600 }}>AI score</Typography>
                  <Typography sx={{ fontWeight: 800, color: T.sageText, fontFamily: FONT, fontSize: '1.5rem' }}>{detail.ai_overall_score}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ flex: 1, p: 2, textAlign: 'center', bgcolor: T.cream, borderRadius: '10px', border: `1px solid ${T.line}` }}>
                  <Typography sx={{ color: T.faint, fontSize: '0.72rem', fontFamily: FONT, fontWeight: 600 }}>Divergence</Typography>
                  <Typography sx={{
                    fontWeight: 800, fontFamily: FONT, fontSize: '1.5rem',
                    color: Math.abs(detail.raw_divergence || 0) > 10 ? T.amber : T.green,
                  }}>
                    {detail.raw_divergence != null ? `${detail.raw_divergence > 0 ? '+' : ''}${detail.raw_divergence}` : '—'}
                  </Typography>
                </Paper>
              </Box>
              {detail.calibration_adjusted_divergence != null && (
                <Typography sx={{ color: T.faint, fontStyle: 'italic', display: 'block', mb: 2, fontFamily: FONT, fontSize: '0.78rem' }}>
                  Calibration-adjusted divergence: {detail.calibration_adjusted_divergence > 0 ? '+' : ''}{detail.calibration_adjusted_divergence}
                </Typography>
              )}
            </>
          ) : (
            <Alert icon={false} sx={{
              mb: 2, borderRadius: '10px',
              bgcolor: T.amberBg, border: '1px solid rgba(163,90,45,0.25)', color: T.amber,
            }}>
              AI score is still being computed. You'll receive a notification when it's ready.
            </Alert>
          )}

          {/* Per-competency table */}
          {detail.ai_score_ready && detail.per_competency?.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <SectionLabel>Per-competency breakdown</SectionLabel>
              <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${T.line}`, borderRadius: '10px' }}>
                <Table size="small" sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow sx={TH_ROW_SX}>
                      <TableCell>Competency</TableCell>
                      <TableCell align="center">You</TableCell>
                      <TableCell align="center">AI</TableCell>
                      <TableCell align="center">Diff</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.per_competency.map((row) => (
                      <TableRow key={row.key} sx={{ ...TD_ROW_SX, ...(row.not_assessed ? { opacity: 0.5 } : {}) }}>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.85rem', color: T.body, fontFamily: FONT }}>{row.label}</Typography>
                          {row.not_assessed && (
                            <Chip label="Not Asked" size="small" sx={{ ml: 1, height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: T.amberBg, color: T.amber, fontFamily: FONT }} />
                          )}
                        </TableCell>
                        <TableCell align="center"><Typography sx={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: FONT, color: T.ink }}>{row.interviewer ?? '—'}</Typography></TableCell>
                        <TableCell align="center"><Typography sx={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: FONT, color: row.not_assessed ? T.faint : T.sageText }}>{row.not_assessed ? 'N/A' : (row.ai ?? '—')}</Typography></TableCell>
                        <TableCell align="center"><Typography sx={{
                          fontSize: '0.85rem', fontWeight: 700, fontFamily: FONT,
                          color: row.diff != null
                            ? (Math.abs(row.diff) >= 2 ? T.amber : row.diff !== 0 ? T.amber : T.green)
                            : T.faint,
                        }}>
                          {row.not_assessed ? '—' : (row.diff != null ? `${row.diff > 0 ? '+' : ''}${row.diff}` : '—')}
                        </Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                           </TableContainer>
              {(detail.categories_not_assessed || []).length > 0 && (
                <Alert icon={<Warning sx={{ fontSize: 16 }} />} severity="warning" sx={{
                  mt: 1.5, borderRadius: '10px', fontSize: '0.82rem', fontFamily: FONT,
                  bgcolor: T.amberBg, border: '1px solid rgba(163,90,45,0.25)', color: T.amber,
                  '& .MuiAlert-icon': { color: T.amber },
                }}>
                  The interviewer did not ask questions on: <b>{detail.categories_not_assessed.join(', ')}</b>. These categories are excluded from the AI overall score.
                </Alert>
              )}
            </Box>
          )}

          {/* Signals section */}
          <Box sx={{ mb: 2.5 }}>
            <SectionLabel>Signals</SectionLabel>
            {(!detail.signals || detail.signals.length === 0) ? (
              <Chip
                icon={<CheckCircle sx={{ fontSize: 16 }} />}
                label="No signals fired"
                size="small"
                sx={{ bgcolor: T.greenBg, color: T.green, fontWeight: 600, fontFamily: FONT, '& .MuiChip-icon': { color: T.green }, border: '1px solid rgba(62,110,62,0.25)' }}
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {detail.signals.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Chip
                      label={s.signal_code}
                      size="small"
                      sx={{
                        bgcolor: s.severity === 'CRITICAL' ? T.redBg : T.amberBg,
                        color: s.severity === 'CRITICAL' ? T.red : T.amber,
                        fontWeight: 700, fontSize: '0.72rem', fontFamily: FONT, flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.82rem' }}>
                        {s.signal_name} — {s.severity}
                      </Typography>
                      {s.summary && (
                        <Typography sx={{ color: T.faint, display: 'block', mt: 0.25, fontFamily: FONT, fontSize: '0.78rem' }}>
                          {s.summary}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* ═══ FULL EVALUATION FORM (read-only) — v2 submissions ═══ */}
          {detail.form_version >= 2 ? (
            <Box sx={{ mb: 2.5 }}>
              {/* ── Header Banner ── */}
              <Paper elevation={0} sx={{ borderRadius: '8px 8px 0 0', overflow: 'hidden', mb: 0 }}>
                <Box sx={{ bgcolor: '#1B2A4A', px: 3, py: 2 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                    IEVALX &nbsp;|&nbsp; INTERVIEWER FEEDBACK &amp; FINAL EVALUATION FORM
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: '#2E86AB', px: 3, py: 0.8 }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.78rem' }}>
                    Submitted evaluation &nbsp;&nbsp;|&nbsp;&nbsp; {detail.company_name || ''}
                  </Typography>
                </Box>
              </Paper>

              {/* ── Section 1: Interview Details & Session Check ── */}
              <Paper elevation={0} sx={{ borderRadius: 0, border: '1px solid #D0D0D0', borderTop: 0, mb: 0 }}>
                <Box sx={{ bgcolor: '#1B2A4A', px: 2, py: 1 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>1.  INTERVIEW DETAILS &amp; SESSION CHECK</Typography>
                </Box>
                <Table size="small" sx={{ '& td': { borderColor: '#D0D0D0', py: 0.8, fontSize: '0.82rem' } }}>
                  <TableBody>
                    {[
                      ['Candidate Name', detail.candidate_name, 'Candidate ID / Req. No.', detail.candidate_id_label],
                      ['Position / Role Applied', detail.position_role || detail.job_title, 'Interview Round', detail.interview_round || detail.level],
                      ['Primary Skill / Technology', detail.primary_skill, 'Date of Interview', detail.interview_date],
                      ['Total Years of Experience', detail.total_experience, 'Required Experience for Role', detail.required_experience],
                      ['Interviewer Name', detail.interviewer_name, 'Interviewer ID / Level', `${detail.interviewer_id_label || ''} / ${detail.interviewer_level || ''}`],
                      ['Mode of Interview', detail.mode_of_interview || 'Video (iMeetPro)', 'Interview Duration (mins)', detail.actual_duration || detail.planned_duration],
                    ].map(([lbl1, val1, lbl2, val2], i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ bgcolor: '#E8EEF4', fontWeight: 700, width: '18%' }}>{lbl1}</TableCell>
                        <TableCell sx={{ width: '30%' }}>{val1 || '—'}</TableCell>
                        <TableCell sx={{ bgcolor: '#E8EEF4', fontWeight: 700, width: '18%' }}>{lbl2}</TableCell>
                        <TableCell sx={{ width: '34%' }}>{val2 || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {[
                      ['Session recorded in IEVALX', 'session_recorded', 'Candidate identity verified', 'identity_verified'],
                      ['Proctoring / integrity check', 'proctoring_check', 'Interruption / disconnection', 'interruption'],
                    ].map(([lbl1, key1, lbl2, key2], i) => (
                      <TableRow key={`sc-${i}`}>
                        <TableCell sx={{ bgcolor: '#E8EEF4', fontWeight: 700, width: '18%' }}>{lbl1}</TableCell>
                        <TableCell sx={{ width: '30%' }}>{detail.session_checks?.[key1] || '—'}</TableCell>
                        <TableCell sx={{ bgcolor: '#E8EEF4', fontWeight: 700, width: '18%' }}>{lbl2}</TableCell>
                        <TableCell sx={{ width: '34%' }}>{detail.session_checks?.[key2] || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              {/* ── Sections 2-6: ScoringForm (read-only) ── */}
              <ScoringForm
                scores={{
                  competency_scores:    detail.competency_scores || {},
                  competency_evidence:  detail.competency_evidence || {},
                  question_log:         detail.question_log || [],
                  recommendation:       detail.recommendation || '',
                  key_strengths:        detail.key_strengths || '',
                  areas_of_concern:     detail.areas_of_concern || '',
                  overall_remarks:      detail.overall_remarks || '',
                  panel_members:        detail.panel_members || '',
                  panel_consensus:      detail.panel_consensus || '',
                  declaration_accepted: detail.declaration_accepted ?? true,
                  interviewer_signature: detail.interviewer_signature || '',
                  session_checks:       detail.session_checks || {},
                  alignment_justification: detail.alignment_justification || '',
                }}
                setScores={() => {}}
                context={{
                  company_name: detail.company_name || '',
                  submission: {
                    submission_ref:    detail.submission_ref || '',
                    hr_reaudit_status: detail.hr_reaudit_status || 'Pending',
                  },
                }}
                disabled={true}
              />
            </Box>
          ) : (
            <>
              {/* v1 fallback — summary view */}
              <Box sx={{ mb: 2.5 }}>
                <SectionLabel>Your recommendation</SectionLabel>
                <Chip
                  label={REC_LABELS[detail.recommendation] || detail.recommendation}
                  size="small"
                  sx={{
                    bgcolor: REC_COLORS[detail.recommendation]?.bg || T.lineSoft,
                    color: REC_COLORS[detail.recommendation]?.color || T.muted,
                    fontWeight: 700, fontSize: '0.78rem', fontFamily: FONT,
                  }}
                />
              </Box>
              {detail.written_rationale && (
                <Box sx={{ mb: 2.5 }}>
                  <SectionLabel>Written Rationale</SectionLabel>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: T.cream, borderRadius: '10px', border: `1px solid ${T.line}` }}>
                    <Typography sx={{ color: T.body, fontSize: '0.85rem', fontFamily: FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {detail.written_rationale}
                    </Typography>
                  </Paper>
                </Box>
              )}
              {detail.areas_of_concern && (
                <Box sx={{ mb: 2.5 }}>
                  <SectionLabel>Areas of Concern</SectionLabel>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: T.redBg, borderRadius: '10px', border: '1px solid rgba(139,46,46,0.15)' }}>
                    <Typography sx={{ color: T.body, fontSize: '0.85rem', fontFamily: FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {detail.areas_of_concern}
                    </Typography>
                  </Paper>
                </Box>
              )}
              {detail.self_reflection && (
                <Box sx={{ mb: 2.5 }}>
                  <SectionLabel>Self Reflection</SectionLabel>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: T.sageSoft, borderRadius: '10px', border: `1px solid rgba(127,158,126,0.22)` }}>
                    {typeof detail.self_reflection === 'string' ? (
                      <Typography sx={{ color: T.body, fontSize: '0.85rem', fontFamily: FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {detail.self_reflection}
                      </Typography>
                    ) : (
                      Object.entries(detail.self_reflection).map(([key, val]) => (
                        <Box key={key} sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                          <Typography sx={{ fontWeight: 800, color: T.muted, textTransform: 'uppercase', fontSize: '0.68rem', fontFamily: FONT }}>
                            {key.replace(/_/g, ' ')}
                          </Typography>
                          <Typography sx={{ color: T.body, fontSize: '0.85rem', fontFamily: FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {String(val)}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Paper>
                </Box>
              )}
            </>
          )}

          {/* Audit note indicator */}
          {detail.audit_note_id && (
            <Box sx={{ mb: 2 }}>
              <Divider sx={{ mb: 1.5, borderColor: T.line }} />
              <Typography sx={{ color: T.faint, fontStyle: 'italic', fontFamily: FONT, fontSize: '0.78rem' }}>
                Audit note generated · ID #{detail.audit_note_id}
              </Typography>
            </Box>
          )}
        </Box>
      )}
          </DialogContent>
    </Dialog>
  );
};


// ═════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════

const CompletedInterviews = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerError, setDrawerError] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Load list
  useEffect(() => {
    setListError(false);
    interviewerService.getCompletedInterviews()
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error('Failed to load completed interviews:', err);
        setListError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Open drawer for a submission
  const handleView = useCallback((submissionId) => {
    setSelectedId(submissionId);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError(false);
    setDetail(null);
    interviewerService.getCompletedInterviewDetail(submissionId)
      .then((res) => setDetail(res.data))
      .catch((err) => {
        console.error('Failed to load interview detail:', err);
        setDrawerError(true);
      })
      .finally(() => setDrawerLoading(false));
  }, []);

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedId(null);
    setDetail(null);
    setDrawerError(false);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, sm: 3 }}>
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: '14px' }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: '14px' }} />
      </Box>
    );
  }

  if (listError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, fontSize: '1.5rem' }}>Completed Interviews</Typography>
        </Box>
        <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem', ml: '20px', mb: 3 }}>
          View your submitted evaluations and compare your scores with AI assessments.
        </Typography>
        <Alert icon={false} sx={{
          borderRadius: '10px', bgcolor: T.redBg, border: '1px solid rgba(139,46,46,0.2)', color: T.red,
        }}
          action={
            <Button size="small"
              onClick={() => { setLoading(true); setListError(false); interviewerService.getCompletedInterviews().then((res) => setData(res.data)).catch(() => setListError(true)).finally(() => setLoading(false)); }}
              sx={{ color: T.red, fontWeight: 700, fontFamily: FONT, textTransform: 'none' }}
            >
              Retry
            </Button>
          }
        >
          Failed to load completed interviews. Please try again.
        </Alert>
      </Box>
    );
  }

  const interviews = data?.interviews || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, letterSpacing: '-0.01em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Completed Interviews
          </Typography>
        </Box>
        <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem', ml: '20px' }}>
          View your submitted evaluations and compare your scores with AI assessments.
        </Typography>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={CheckCircle} label="Total Completed" value={data?.total_completed ?? 0} accent={T.sageText} iconBg={T.sageSoft} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={TrendingUp} label="Avg Divergence"
            value={data?.avg_divergence != null ? `${data.avg_divergence > 0 ? '+' : ''}${data.avg_divergence}` : '—'}
            accent={T.amber} iconBg={T.amberBg}
            valueColor={data?.avg_divergence != null && Math.abs(data.avg_divergence) > 10 ? T.amber : T.green}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={SmartToy} label="AI Scores Ready" value={data?.ai_ready_count ?? 0} accent={T.green} iconBg={T.greenBg} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={Edit} label="Eval Pending" value={data?.eval_pending_count ?? 0}
            accent={T.red} iconBg={T.redBg}
            valueColor={data?.eval_pending_count > 0 ? T.red : T.ink}
          />
        </Grid>
      </Grid>

      {/* Table */}
      <Card elevation={0} sx={{ ...CARD_SX, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 4, height: 20, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, fontSize: '1.05rem' }}>
            Completed Interviews
          </Typography>
        </Box>

        {interviews.length > 0 ? (
          <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={TH_ROW_SX}>
                  <TableCell>Job Title</TableCell>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell align="center">Your Score</TableCell>
                  <TableCell align="center">AI Score</TableCell>
                  <TableCell align="center">Divergence</TableCell>
                  <TableCell>Signals</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                              {interviews.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((iv) => {
                  const isPending = !iv.has_submission;
                  return (
                  <TableRow
                    key={iv.submission_id || `pending-${iv.booking_id_raw}`}
                    selected={selectedId === iv.submission_id}
                    sx={{
                      ...TD_ROW_SX,
                      cursor: 'pointer',
                      bgcolor: isPending ? 'rgba(163,90,45,0.04)' : undefined,
                      '&.Mui-selected': { bgcolor: T.sageSoft },
                      '&.Mui-selected:hover': { bgcolor: T.sageSoft },
                    }}
                    onClick={() => isPending
                      ? navigate(`/interviewer/submission/${iv.booking_id_raw}`)
                      : handleView(iv.submission_id)
                    }
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: T.ink, fontSize: '0.85rem', fontFamily: FONT }}>
                          {iv.job_title}
                        </Typography>
                        {isPending && (
                          <Chip label="Form Pending" size="small" sx={{
                            bgcolor: T.redBg, color: T.red,
                            fontWeight: 700, fontSize: '0.62rem', fontFamily: FONT,
                            height: 20, border: '1px solid rgba(139,46,46,0.2)',
                          }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: T.body, fontSize: '0.85rem', fontFamily: FONT }}>
                        {iv.candidate_name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: T.muted, fontSize: '0.85rem', fontFamily: FONT }}>
                        {iv.interview_date} at {iv.interview_time} {iv.timezone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={iv.level} size="small" sx={{
                        bgcolor: T.sageSoft, color: T.sageText,
                        fontWeight: 700, fontSize: '0.72rem', fontFamily: FONT,
                        border: `1px solid rgba(127,158,126,0.22)`,
                      }} />
                    </TableCell>
                    <TableCell align="center">
                      {isPending ? (
                        <Typography sx={{ color: T.faint, fontSize: '0.85rem', fontFamily: FONT }}>—</Typography>
                      ) : (
                        <Typography sx={{ fontWeight: 700, color: T.ink, fontSize: '0.85rem', fontFamily: FONT }}>
                          {iv.overall_score}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {isPending ? (
                        <Typography sx={{ color: T.faint, fontSize: '0.85rem', fontFamily: FONT }}>—</Typography>
                      ) : iv.ai_score_ready ? (
                        <Typography sx={{ fontWeight: 700, color: T.sageText, fontSize: '0.85rem', fontFamily: FONT }}>
                          {iv.ai_overall_score}
                        </Typography>
                      ) : (
                        <Chip label="Pending..." size="small" sx={{
                          bgcolor: T.amberBg, color: T.amber,
                          fontWeight: 600, fontSize: '0.68rem', fontFamily: FONT, fontStyle: 'italic',
                          border: '1px solid rgba(163,90,45,0.25)',
                        }} />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {isPending ? (
                        <Typography sx={{ color: T.faint, fontSize: '0.85rem', fontFamily: FONT }}>—</Typography>
                      ) : (
                        <DivergenceChip value={iv.ai_score_ready ? iv.raw_divergence : null} />
                      )}
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        <Typography sx={{ color: T.faint, fontSize: '0.85rem', fontFamily: FONT }}>—</Typography>
                      ) : (
                        <SignalChips signals={iv.signals} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isPending ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Edit sx={{ fontSize: 14 }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/interviewer/submission/${iv.booking_id_raw}`);
                          }}
                          sx={{
                            textTransform: 'none', fontWeight: 700, fontFamily: FONT,
                            fontSize: '0.75rem', py: 0.5, px: 1.5,
                            whiteSpace: 'nowrap',
                            bgcolor: T.amber, color: '#fff',
                            borderRadius: '10px', boxShadow: 'none',
                            '&:hover': { bgcolor: '#8B4513', boxShadow: 'none' },
                          }}
                        >
                          Fill Form
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(iv.submission_id);
                          }}
                          sx={{
                            textTransform: 'none', fontWeight: 700, fontFamily: FONT,
                            fontSize: '0.75rem', py: 0.5, px: 1.5,
                            borderColor: T.line, color: T.pine,
                            borderRadius: '10px',
                            '&:hover': { bgcolor: T.sageSoft, borderColor: T.sage },
                          }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={interviews.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10]}
            sx={{
              borderTop: `1px solid ${T.line}`,
              '.MuiTablePagination-toolbar': { fontFamily: FONT },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontFamily: FONT, fontSize: '0.82rem', color: T.muted,
              },
              '.MuiTablePagination-select': { fontFamily: FONT, fontWeight: 600 },
              '.MuiTablePagination-actions button': { color: T.pine },
            }}
          />
          </>
        ) : (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 40, color: T.faint, mb: 1 }} />
            <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem' }}>
              No completed interviews yet. After you submit your evaluation for an audited interview, it will appear here with the AI score comparison.
            </Typography>
          </Box>
        )}
      </Card>

      {/* Score comparison drawer */}
      <ScoreDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        detail={detail}
        loading={drawerLoading}
        error={drawerError}
      />
    </Box>
  );
};

export default CompletedInterviews;