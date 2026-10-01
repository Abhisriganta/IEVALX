
import React from 'react';
import { Box, Typography, Chip, Grid, Divider } from '@mui/material';
import {
  SmartToy as ModelIcon,
  Speed as ThresholdIcon,
  Warning as LimitIcon,
  Balance as BiasIcon,
  Fingerprint as HashIcon,
} from '@mui/icons-material';

/* ── IAEM pine/sage tokens ── */
const T = {
  pine:    '#04282B',
  sage:    '#8FB08E',
  sageBg:  '#EDF3EC',
  subtle:  '#F0F3EE',
  border:  '#E7EAE3',
  ink:     '#1F1F1F',
  muted:   '#6F7470',
  hint:    '#A0A8A0',
  white:   '#FFFFFF',
  font:    "'DM Sans', sans-serif",
  display: "'Jost', sans-serif",
};

/* ── Section header with optional icon ── */
const SectionLabel = ({ icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
    {icon &&
      React.cloneElement(icon, {
        sx: { fontSize: 15, color: T.sage },
      })}
    <Typography
      sx={{
        fontFamily: T.font,
        fontWeight: 600,
        fontSize: '0.65rem',
        color: T.hint,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </Typography>
  </Box>
);

/* ── Individual metric pill ── */
const MetricItem = ({ label, value }) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 0,
      bgcolor: T.subtle,
      borderRadius: 2,
      px: 1.75,
      py: 1.25,
    }}
  >
    <Typography
      sx={{
        fontFamily: T.font,
        fontWeight: 600,
        fontSize: '0.6rem',
        color: T.hint,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        mb: 0.4,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: T.display,
        fontWeight: 500,
        fontSize: '0.85rem',
        color: T.ink,
        lineHeight: 1.3,
      }}
    >
      {value || '—'}
    </Typography>
  </Box>
);

/* ── Descriptive field block ── */
const DescBlock = ({ icon, label, value }) => (
  <Box sx={{ mb: 0 }}>
    <SectionLabel icon={icon}>{label}</SectionLabel>
    <Typography
      sx={{
        fontFamily: T.font,
        fontSize: '0.84rem',
        color: T.ink,
        lineHeight: 1.6,
        pl: icon ? 2.75 : 0,
      }}
    >
      {value || '—'}
    </Typography>
  </Box>
);

const ModelCard = ({ card }) => {
  if (!card) return null;

  return (
    <Box>
      {/* ── Header: Name + Chips ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          mb: 2.5,
          flexWrap: 'wrap',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: T.pine,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ModelIcon sx={{ fontSize: 18, color: T.white }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: T.display,
              fontWeight: 600,
              fontSize: '1.05rem',
              color: T.pine,
              lineHeight: 1.2,
            }}
          >
            {card.component_name}
          </Typography>
        </Box>
        {card.model_version && (
          <Chip
            label={card.model_version}
            size="small"
            sx={{
              bgcolor: T.sageBg,
              color: T.pine,
              fontFamily: T.font,
              fontWeight: 600,
              fontSize: '0.68rem',
              height: 22,
              border: `1px solid ${T.border}`,
            }}
          />
        )}
        {card.signal && (
          <Chip
            label={`Signal ${card.signal}`}
            size="small"
            sx={{
              bgcolor: '#FFF8F0',
              color: '#B45309',
              fontFamily: T.font,
              fontWeight: 600,
              fontSize: '0.68rem',
              height: 22,
              border: '1px solid #F5DFC4',
            }}
          />
        )}
      </Box>

      {/* ── Purpose ── */}
      <Box
        sx={{
          bgcolor: T.sageBg,
          borderRadius: 2,
          px: 2,
          py: 1.5,
          mb: 2.5,
          borderLeft: `3px solid ${T.sage}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: T.font,
            fontWeight: 600,
            fontSize: '0.6rem',
            color: T.hint,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 0.5,
          }}
        >
          Purpose
        </Typography>
        <Typography
          sx={{
            fontFamily: T.font,
            fontSize: '0.88rem',
            color: T.ink,
            lineHeight: 1.55,
          }}
        >
          {card.purpose || '—'}
        </Typography>
      </Box>

      {/* ── Input / Output ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              bgcolor: T.subtle,
              borderRadius: 2,
              px: 2,
              py: 1.5,
              height: '100%',
            }}
          >
            <Typography
              sx={{
                fontFamily: T.font,
                fontWeight: 600,
                fontSize: '0.6rem',
                color: T.hint,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 0.5,
              }}
            >
              Input
            </Typography>
            <Typography
              sx={{
                fontFamily: T.font,
                fontSize: '0.84rem',
                color: T.ink,
                lineHeight: 1.55,
              }}
            >
              {card.input || '—'}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              bgcolor: T.subtle,
              borderRadius: 2,
              px: 2,
              py: 1.5,
              height: '100%',
            }}
          >
            <Typography
              sx={{
                fontFamily: T.font,
                fontWeight: 600,
                fontSize: '0.6rem',
                color: T.hint,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 0.5,
              }}
            >
              Output
            </Typography>
            <Typography
              sx={{
                fontFamily: T.font,
                fontSize: '0.84rem',
                color: T.ink,
                lineHeight: 1.55,
              }}
            >
              {card.output || '—'}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* ── Thresholds Row ── */}
      <SectionLabel icon={<ThresholdIcon />}>Performance Thresholds</SectionLabel>
      <Box sx={{ display: 'flex', gap: 1.25, mb: 2.5, flexWrap: 'wrap' }}>
        <MetricItem label="Confidence" value={card.confidence_threshold} />
        <MetricItem label="Precision" value={card.precision_target} />
        <MetricItem label="Recall" value={card.recall_target} />
      </Box>

      <Divider sx={{ borderColor: T.border, mb: 2.5 }} />

      {/* ── Known Limitations ── */}
      <DescBlock
        icon={<LimitIcon />}
        label="Known Limitations"
        value={card.known_limitations}
      />

      <Box sx={{ height: 16 }} />

      {/* ── Bias Evaluation ── */}
      <DescBlock
        icon={<BiasIcon />}
        label="Bias Evaluation"
        value={card.bias_evaluation}
      />

      <Divider sx={{ borderColor: T.border, my: 2.5 }} />

      {/* ── Footer metadata ── */}
      <SectionLabel icon={<HashIcon />}>Model Metadata</SectionLabel>
      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <MetricItem label="Prompt Hash" value={card.prompt_hash} />
        <MetricItem label="Last Updated" value={card.last_updated} />
        <MetricItem label="Next Review" value={card.next_review} />
      </Box>
    </Box>
  );
};

export default ModelCard;