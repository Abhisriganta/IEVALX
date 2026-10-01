// BUILD: 2026-09-04-iaem-calibration-tracking-v4
// HR detail: scores per interviewer per reference, recommendation, HR edit, expired red
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, Divider,
} from '@mui/material';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { ArrowBack, VideoFile, CloudUpload, Edit, Close } from '@mui/icons-material';
import { calibrationService } from '@/services/api/iaem';
import { RECOMMENDATIONS } from '@/constants/iaem';

/* ── pine / sage scoped palette ──────────────────────────────────── */
const T = {
  pine:     '#08302F',
  pineDk:   '#04282B',
  pineHov:  '#0a3d40',
  sage:     '#8FB08E',
  sageDk:   '#5E815D',
  sageLt:   '#E8F0E8',
  sageXLt:  '#F4F7F2',
  ink:      '#2F332E',
  muted:    '#7A7E76',
  faint:    '#9CA3AF',
  line:     '#E7EAE3',
  lineSoft: '#F0F2ED',
  greenBg:  '#ECFDF5',
  greenTxt: '#065F46',
  amberBg:  '#FFFBEB',
  amberTxt: '#92400E',
  redBg:    '#FEF2F2',
  redTxt:   '#991B1B',
};

const statusChip = (s) => {
  const map = {
    COMPLETED: { bg: T.greenBg, color: T.greenTxt },
    EXPIRED:   { bg: T.redBg,   color: T.redTxt },
    ACTIVE:    { bg: T.amberBg, color: T.amberTxt },
    PENDING:   { bg: T.amberBg, color: T.amberTxt },
  };
  const c = map[s] || map.ACTIVE;
  return { bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: '0.72rem' };
};

const recLabel = (val) => {
  const r = RECOMMENDATIONS.find(r => r.value === val);
  return r ? r.label : val || '—';
};

const CalibrationTracking = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const outerTheme = useTheme();
  const scopedTheme = useMemo(() => createTheme(outerTheme, {
    palette: {
      primary:    { main: T.pine, light: T.sage, dark: T.pineDk, contrastText: '#FFFFFF' },
      text:       { primary: T.ink, secondary: T.muted },
      background: { default: T.sageXLt, paper: '#FFFFFF' },
      divider:    T.line,
    },
  }), [outerTheme]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(null); // { score_id, overall_score, recommendation, interviewer_name, ref_id }
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('scores');
  const [page, setPage] = useState(0);
  const PER_PAGE = 2;

  const reload = () => calibrationService.getSessionTracking(sessionId)
    .then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { reload(); }, [sessionId]);

  // ── HR Edit Score ──
  const handleSaveEdit = async () => {
    if (!editDialog) return;
    setSaving(true);
    try {
      await calibrationService.editScore(editDialog.score_id, {
        overall_score: editDialog.overall_score,
        recommendation: editDialog.recommendation,
      });
      setEditDialog(null);
      reload();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to save edit.');
    } finally { setSaving(false); }
  };

  if (loading) return <ThemeProvider theme={scopedTheme}><Box sx={{ p: 3 }}><Skeleton height={200} /><Skeleton height={200} sx={{ mt: 2 }} /></Box></ThemeProvider>;

  // Build a map: reference_id → title
  const refMap = {};
  (data?.references || []).forEach(r => { refMap[String(r.reference_id)] = r.title; });

  // Compute stats for hero
  const refs = data?.references || [];
  const assignments = data?.assignments || [];
  const allScores = assignments.flatMap(iv => (iv.scores || []).map(s => s.overall_score)).filter(Boolean);
  const globalAvg = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : '—';
  const completedCount = assignments.filter(iv => iv.status === 'COMPLETED').length;

  // Score color helper
  const scoreColor = (s) => s >= 75 ? T.greenTxt : s >= 55 ? T.amberTxt : T.redTxt;
  const scoreBg = (s) => s >= 75 ? T.greenBg : s >= 55 ? T.amberBg : T.redBg;
  const recChipSx = (rec) => ({
    fontWeight: 600, fontSize: '0.7rem',
    bgcolor: rec?.includes('NO') ? T.redBg : rec?.includes('LEAN_HIRE') ? '#F0FDF4' : T.greenBg,
    color: rec?.includes('NO') ? T.redTxt : T.greenTxt,
  });

  return (
    <ThemeProvider theme={scopedTheme}>
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* ── Pine gradient hero ── */}
      <Paper elevation={0} sx={{
        background: `linear-gradient(135deg, ${T.pine} 0%, #0B3B3A 100%)`,
        borderRadius: 4, p: { xs: 2.5, md: 3.5 }, mb: 3, color: '#fff',
      }}>
        {/* Back + title row */}
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/employer/iaem-calibration')}
          sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.6)', mb: 1.5, ml: -1,
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}>
          Back to Calibration
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.4, letterSpacing: '0.06em' }}>
              CALIBRATION
            </Typography>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, mt: 0.25 }}>
              Session #{sessionId}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1 }}>
              <Chip label={`${data?.level || '—'}`} size="small"
                sx={{ bgcolor: 'rgba(143,176,142,0.2)', color: T.sageLt, fontWeight: 700, fontSize: '0.72rem' }} />
              <Chip label={data?.status} size="small"
                sx={{ bgcolor: data?.status === 'COMPLETED' ? 'rgba(236,253,245,0.15)' : data?.status === 'EXPIRED' ? 'rgba(254,242,242,0.2)' : 'rgba(255,251,235,0.2)',
                      color: data?.status === 'COMPLETED' ? '#86EFAC' : data?.status === 'EXPIRED' ? '#FCA5A5' : '#FCD34D',
                      fontWeight: 700, fontSize: '0.72rem' }} />
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.68rem', opacity: 0.4 }}>Deadline</Typography>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{data?.deadline || '—'}</Typography>
          </Box>
        </Box>

        {/* Skills ribbon */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
          {(data?.skills || []).map(sk => (
            <Chip key={sk} label={sk} size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600,
                    bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }} />
          ))}
        </Box>
      </Paper>

      {/* ── Tabs ── */}
      <Box sx={{ display: 'flex', gap: 0, mb: 2 }}>
        {[
          { id: 'scores', label: `Interviewer Scores (${assignments.length})` },
          { id: 'videos', label: `Reference Videos (${refs.length})` },
        ].map(t => (
          <Button key={t.id} disableRipple
            onClick={() => setTab(t.id)}
            sx={{
              textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', px: 2.5, py: 1,
              borderRadius: 0, borderBottom: `3px solid ${tab === t.id ? T.pine : 'transparent'}`,
              color: tab === t.id ? T.pine : T.faint,
              '&:hover': { bgcolor: 'transparent', color: T.pine },
            }}>
            {t.label}
          </Button>
        ))}
      </Box>

      {/* ── Videos tab ── */}
      {tab === 'videos' && (
        <>
          {refs.length === 0 ? (
            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${T.line}`, textAlign: 'center', py: 4 }}>
              <CloudUpload sx={{ fontSize: 40, color: T.faint, mb: 1 }} />
              <Typography variant="body2" sx={{ color: T.muted }}>No reference videos uploaded.</Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {data.references.map((ref) => (
                <Paper key={ref.reference_id} elevation={0} sx={{
                  flex: 1, border: `1.5px solid ${T.line}`, borderRadius: 3,
                  p: 2, display: 'flex', alignItems: 'center', gap: 2,
                }}>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: 2.5, bgcolor: T.sageLt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <VideoFile sx={{ color: T.pine, fontSize: 22 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.ink }}>{ref.title}</Typography>
                    <Typography variant="caption" sx={{ color: T.faint }}>
                      {ref.original_filename} — {ref.file_size_mb} MB
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '50%', bgcolor: T.sageXLt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: T.sageDk }}>#{ref.order}</Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </>
      )}

      {/* ── Scores tab — card per interviewer ── */}
      {tab === 'scores' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {assignments.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map(iv => {
            const hasScores = iv.scores && iv.scores.length > 0;
            const ivScores = iv.scores || [];
            const ivAvg = ivScores.length > 0
              ? Math.round(ivScores.reduce((a, s) => a + (s.overall_score || 0), 0) / ivScores.length)
              : null;
            const initials = (iv.interviewer_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2);

            return (
              <Paper key={iv.interviewer_id} elevation={0} sx={{
                border: `1.5px solid ${T.line}`, borderRadius: 3.5, overflow: 'hidden',
              }}>
                {/* Interviewer header — avatar + name + skills + avg ring + status */}
                <Box sx={{
                  px: 2.5, py: 1.8, display: 'flex', alignItems: 'center', gap: 1.5,
                  borderBottom: hasScores ? `1px solid ${T.lineSoft}` : 'none',
                }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: '50%', bgcolor: T.pine, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: 700, flexShrink: 0,
                  }}>{initials}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.ink }}>{iv.interviewer_name}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {(iv.interviewer_skills || []).slice(0, 4).map(sk => (
                        <Chip key={sk} label={sk} size="small"
                          sx={{ height: 18, fontSize: '0.63rem', fontWeight: 600, bgcolor: T.sageLt, color: T.pine }} />
                      ))}
                      {(iv.interviewer_skills || []).length > 4 && (
                        <Chip label={`+${iv.interviewer_skills.length - 4}`} size="small"
                          sx={{ height: 18, fontSize: '0.63rem', fontWeight: 600, bgcolor: T.lineSoft, color: T.sageDk }} />
                      )}
                    </Box>
                  </Box>
                  {/* Avg score ring */}
                  {ivAvg !== null && (
                    <Box sx={{ textAlign: 'center', mr: 1 }}>
                      <Box sx={{
                        width: 48, height: 48, borderRadius: '50%',
                        border: `3px solid ${scoreColor(ivAvg)}`, bgcolor: scoreBg(ivAvg),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: scoreColor(ivAvg) }}>{ivAvg}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.58rem', color: T.faint, mt: 0.3, fontWeight: 600 }}>AVG</Typography>
                    </Box>
                  )}
                  <Chip label={iv.status} size="small" sx={statusChip(iv.status)} />
                </Box>

                {/* Score rows — banded */}
                {hasScores ? ivScores.map((sc, idx) => (
                  <Box key={sc.score_id} sx={{
                    display: 'flex', alignItems: 'center', px: 2.5, py: 1.3, pl: { xs: 2.5, md: 8 },
                    gap: 2, bgcolor: idx % 2 === 0 ? T.sageXLt : '#fff',
                  }}>
                    <Typography sx={{ flex: 1, fontSize: '0.8rem', color: T.muted }}>
                      {refMap[sc.reference_interview_id] || `Ref ${sc.reference_interview_id}`}
                    </Typography>
                    {/* Score bar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
                      <Box sx={{ width: 48, height: 5, borderRadius: 3, bgcolor: T.line, overflow: 'hidden' }}>
                        <Box sx={{ width: `${sc.overall_score || 0}%`, height: '100%', borderRadius: 3,
                                   bgcolor: scoreColor(sc.overall_score || 0) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: scoreColor(sc.overall_score || 0), minWidth: 24 }}>
                        {sc.overall_score}
                      </Typography>
                    </Box>
                    <Chip label={recLabel(sc.recommendation)} size="small" sx={{
                      ...recChipSx(sc.recommendation), minWidth: 86, justifyContent: 'center',
                    }} />
                    <IconButton size="small" onClick={() => setEditDialog({
                      score_id: sc.score_id,
                      overall_score: sc.overall_score,
                      recommendation: sc.recommendation,
                      interviewer_name: iv.interviewer_name,
                      ref_title: refMap[sc.reference_interview_id] || `Ref ${sc.reference_interview_id}`,
                    })} sx={{
                      width: 28, height: 28, borderRadius: 1.5,
                      border: `1px solid ${T.line}`, color: T.faint, bgcolor: '#fff',
                      '&:hover': { color: T.pine, borderColor: T.sage },
                    }}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                )) : (
                  <Box sx={{ px: 2.5, py: 2, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: T.faint }}>No scores submitted yet.</Typography>
                  </Box>
                )}
              </Paper>
            );
          })}
          {assignments.length === 0 && (
            <Paper elevation={0} sx={{ border: `1px solid ${T.line}`, borderRadius: 3, textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: T.muted }}>No interviewers assigned.</Typography>
            </Paper>
          )}

          {/* Pagination */}
          {assignments.length > PER_PAGE && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1 }}>
              <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}
                sx={{ textTransform: 'none', fontWeight: 600, color: T.pine, minWidth: 36,
                      '&.Mui-disabled': { color: T.faint } }}>
                ← Prev
              </Button>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.ink }}>
                {page + 1} / {Math.ceil(assignments.length / PER_PAGE)}
              </Typography>
              <Button size="small" disabled={(page + 1) * PER_PAGE >= assignments.length}
                onClick={() => setPage(p => p + 1)}
                sx={{ textTransform: 'none', fontWeight: 600, color: T.pine, minWidth: 36,
                      '&.Mui-disabled': { color: T.faint } }}>
                Next →
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Edit Score Dialog — pine header */}
      <Dialog open={!!editDialog} onClose={() => !saving && setEditDialog(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
        <Box sx={{ bgcolor: T.pine, px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Edit Score</Typography>
          <IconButton size="small" onClick={() => setEditDialog(null)} disabled={saving}
            sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
          <Typography variant="body2" sx={{ color: T.muted }}>
            Editing score for <strong>{editDialog?.interviewer_name}</strong> on <strong>{editDialog?.ref_title}</strong>.
            Baselines will be recomputed automatically if the session is completed.
          </Typography>
          <TextField type="number" size="small" label="Overall Score (0–100)"
            value={editDialog?.overall_score ?? ''} inputProps={{ min: 0, max: 100 }}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { setEditDialog(prev => ({ ...prev, overall_score: '' })); return; }
              const num = parseInt(raw, 10);
              if (!isNaN(num)) setEditDialog(prev => ({ ...prev, overall_score: Math.min(100, Math.max(0, num)) }));
            }}
            disabled={saving}
            sx={{ '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.pine },
                  '& .MuiInputLabel-root.Mui-focused': { color: T.pine } }} />
          <TextField select size="small" label="Recommendation"
            value={editDialog?.recommendation || ''} disabled={saving}
            onChange={(e) => setEditDialog(prev => ({ ...prev, recommendation: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.pine },
                  '& .MuiInputLabel-root.Mui-focused': { color: T.pine } }}>
            {RECOMMENDATIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: `1px solid ${T.lineSoft}` }}>
          <Button onClick={() => setEditDialog(null)} disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600, color: T.muted }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2,
                  bgcolor: T.pine, '&:hover': { bgcolor: T.pineHov } }}>
            {saving ? 'Saving...' : 'Save & Recompute'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </ThemeProvider>
  );
};

export default CalibrationTracking;