// BUILD: 2026-08-29-iaem-appealstatus-v2 — pine/sage themed (no blue)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Chip, Skeleton, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { interviewerCaseService } from '@/services/api/iaem';
import { APPEAL_OUTCOMES, RESOLUTION_TYPES } from '@/constants/iaem';

/* ── App-native tokens ─────────────────────────────────────────────── */
const T = {
  sage: '#7F9E7E', sageText: '#5E815D', sageSoft: '#EDF3EC',
  pine: '#04282B', pineMid: '#0a3d40',
  cream: '#F6F8F3', ink: '#101210', body: '#2F332E', muted: '#55584F', faint: '#7A7E76',
  line: '#E7EAE3', lineSoft: '#F0F2ED', surface: '#FFFFFF',
  green: '#3E6E3E', greenBg: '#EAF2E9',
  amber: '#A35A2D', amberBg: '#F6ECDF',
  red: '#8B2E2E', redBg: '#FAEAE8',
};
const FONT = "'Jost','DM Sans',sans-serif";

/* Map outcome keys to app-native colors */
const OUTCOME_STYLE = {
  UPHELD:     { bg: T.redBg,   color: T.red,   border: 'rgba(139,46,46,0.25)', accentBg: T.redBg },
  MODIFIED:   { bg: T.amberBg, color: T.amber, border: 'rgba(163,90,45,0.25)', accentBg: T.amberBg },
  OVERTURNED: { bg: T.greenBg, color: T.green, border: 'rgba(62,110,62,0.25)', accentBg: T.greenBg },
};

const AppealStatus = () => {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewerCaseService.getAppealStatus(appealId).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [appealId]);

  if (loading) return <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={200} sx={{ borderRadius: '14px' }} /></Box>;

  const outcome = data?.outcome ? APPEAL_OUTCOMES[data.outcome] : null;
  const style = OUTCOME_STYLE[data?.outcome] || OUTCOME_STYLE.MODIFIED;

  return (
    <>
    <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 } }}>
      {/* Back button */}
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/interviewer/appeals')}
        sx={{ mb: 0, textTransform: 'none', color: T.pine, fontWeight: 700, fontFamily: FONT, fontSize: '0.85rem', borderRadius: '10px', '&:hover': { bgcolor: T.sageSoft } }}>
        Back to Appeals
      </Button>
    </Box>
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 700, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, bgcolor: T.sage, borderRadius: '2px' }} />
          <Typography sx={{ fontWeight: 800, color: T.ink, fontFamily: FONT, letterSpacing: '-0.01em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Appeal Status
          </Typography>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: '14px', border: `1px solid ${T.line}` }}>
        {/* Appeal + Case ID */}
        <Typography sx={{ color: T.faint, fontFamily: FONT, fontSize: '0.88rem', mb: 2 }}>
          Appeal {data?.appeal_id} • Case {data?.case_id}
        </Typography>

        {/* Status chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {data?.status && (
            <Chip label={data.status} size="small" sx={{
              fontWeight: 700, fontFamily: FONT, fontSize: '0.75rem',
              bgcolor: outcome ? style.bg : T.amberBg,
              color: outcome ? style.color : T.amber,
              border: `1px solid ${outcome ? style.border : 'rgba(163,90,45,0.25)'}`,
            }} />
          )}
          <Chip
            label={`Original: ${RESOLUTION_TYPES[data?.original_resolution]?.label || data?.original_resolution}`}
            size="small"
            sx={{ fontWeight: 600, fontFamily: FONT, fontSize: '0.75rem', bgcolor: T.lineSoft, color: T.muted, border: `1px solid ${T.line}` }}
          />
        </Box>

        {/* Filed date */}
        <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.88rem', mb: 1 }}>
          Filed on: {data?.filed_on}
        </Typography>

        {/* Outcome card */}
        {outcome && (
          <Box sx={{ mt: 2.5, p: 2.5, bgcolor: style.accentBg, borderRadius: '10px', borderLeft: `4px solid ${style.color}` }}>
            <Typography sx={{ fontWeight: 800, color: style.color, fontFamily: FONT, fontSize: '1rem', mb: 0.5 }}>
              {outcome.label}
            </Typography>
            <Typography sx={{ color: T.body, fontFamily: FONT, fontSize: '0.88rem', lineHeight: 1.6 }}>
              {outcome.description}
            </Typography>
            {data?.reviewer_rationale && (
              <Paper elevation={0} sx={{ mt: 2, p: 2, borderRadius: '10px', bgcolor: T.surface, border: `1px solid ${T.line}` }}>
                <Typography sx={{ color: T.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem', fontFamily: FONT, mb: 0.5 }}>
                  Reviewer rationale
                </Typography>
                <Typography sx={{ color: T.body, fontFamily: FONT, fontSize: '0.88rem', lineHeight: 1.6 }}>
                  {data.reviewer_rationale}
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Pending state */}
        {!outcome && (
          <Box sx={{ mt: 2.5, p: 2.5, bgcolor: T.amberBg, borderRadius: '10px', borderLeft: `4px solid ${T.amber}` }}>
            <Typography sx={{ fontWeight: 700, color: T.amber, fontFamily: FONT, fontSize: '0.95rem', mb: 0.5 }}>
              Under review
            </Typography>
            <Typography sx={{ color: T.muted, fontFamily: FONT, fontSize: '0.88rem' }}>
              Your appeal is being reviewed. You will be notified when a decision is made.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
    </>
  );
};

export default AppealStatus;