// BUILD: 2026-09-04-iaem-mycalibration-v2
// Shows video count, scored progress, skills, proper action buttons
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Chip, Skeleton,
} from '@mui/material';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { calibrationService } from '@/services/api/iaem';

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
  greenBg:  '#ECFDF5',
  greenTxt: '#065F46',
  amberBg:  '#FFFBEB',
  amberTxt: '#92400E',
};

const MyCalibration = () => {
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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calibrationService.getMySessions()
      .then(r => setSessions(r.data.sessions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ThemeProvider theme={scopedTheme}>
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* ── Pine header ── */}
      <Paper elevation={0} sx={{
        bgcolor: T.pine, borderRadius: 4, px: 3, py: 2.5, mb: 3, color: '#fff',
      }}>
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 700 }}>My Calibration Sessions</Typography>
        <Typography sx={{ fontSize: '0.78rem', opacity: 0.5, mt: 0.25 }}>
          Calibration helps establish your scoring baseline. It is not a test — there is no pass or fail.
        </Typography>
      </Paper>

      {loading ? <Box sx={{ p: 3 }}><Skeleton height={100} /></Box> : sessions.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${T.line}`, textAlign: 'center', py: 5 }}>
          <Typography variant="body2" sx={{ color: T.muted }}>No calibration sessions assigned to you.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sessions.map(s => {
            const scored = s.scores_submitted || 0;
            const total = s.reference_count || 0;
            const pct = total > 0 ? (scored / total) * 100 : 0;
            const isDone = s.status === 'COMPLETED';
            return (
              <Paper key={s.session_id} elevation={0} sx={{
                border: `1.5px solid ${T.line}`, borderRadius: 3.5,
                p: 2.2, display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {/* Level badge */}
                <Box sx={{
                  width: 44, height: 44, borderRadius: 2.5, flexShrink: 0,
                  bgcolor: isDone ? T.greenBg : T.amberBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{
                    fontSize: '0.9rem', fontWeight: 800,
                    color: isDone ? T.greenTxt : T.amberTxt,
                  }}>{s.level}</Typography>
                </Box>

                {/* Details + progress bar */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: T.ink }}>
                      {s.level} Calibration
                    </Typography>
                    <Chip label={s.status} size="small" sx={{
                      bgcolor: isDone ? T.greenBg : T.amberBg,
                      color: isDone ? T.greenTxt : T.amberTxt,
                      fontWeight: 700, fontSize: '0.68rem', height: 22,
                    }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>
                    Due: {s.deadline} · {total} video{total !== 1 ? 's' : ''} · {scored}/{total} scored
                  </Typography>
                  {/* Progress bar */}
                  <Box sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: T.lineSoft, overflow: 'hidden' }}>
                    <Box sx={{
                      width: `${pct}%`, height: '100%', borderRadius: 2,
                      bgcolor: isDone ? T.greenTxt : T.amberTxt, transition: 'width 0.3s',
                    }} />
                  </Box>
                </Box>

                {/* Action */}
                {s.status === 'PENDING' && (
                  <Button size="small" variant="contained"
                    onClick={() => navigate(`/interviewer/calibration/${s.session_id}`)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2.5,
                          bgcolor: T.pine, '&:hover': { bgcolor: T.pineHov } }}>
                    {scored > 0 ? 'Continue' : 'Start'}
                  </Button>
                )}
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
    </ThemeProvider>
  );
};

export default MyCalibration;