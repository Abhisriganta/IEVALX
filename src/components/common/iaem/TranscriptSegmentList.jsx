// BUILD: 2026-08-24-iaem-common-v1
// Transcript viewer for case detail. Flagged segments are highlighted.
import React, { useState } from 'react';
import { Box, Typography, Chip, Button, Collapse } from '@mui/material';
import { RecordVoiceOver, Person, ExpandMore, ExpandLess, PlayArrow } from '@mui/icons-material';

const SpeakerIcon = ({ speaker }) => (
  speaker === 'Interviewer'
    ? <RecordVoiceOver sx={{ fontSize: 16, color: '#04282B' }} />
    : <Person sx={{ fontSize: 16, color: '#1976D2' }} />
);

const TranscriptSegmentList = ({ segments = [], showFull = false, onSeekTo }) => {
  const [expanded, setExpanded] = useState(false);

  // Always show flagged + surrounding context first
  const flaggedIndices = new Set(segments.map((s, i) => s.flagged ? i : -1).filter(i => i >= 0));
  const contextIndices = new Set();
  flaggedIndices.forEach((i) => {
    if (i > 0) contextIndices.add(i - 1);
    contextIndices.add(i);
    if (i < segments.length - 1) contextIndices.add(i + 1);
  });

  const visibleSegments = expanded ? segments : segments.filter((_, i) => contextIndices.has(i));

  return (
    <Box>
      <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, mb: 1, display: 'block' }}>
        Transcript {!expanded && segments.length > visibleSegments.length && `(showing ${visibleSegments.length} of ${segments.length})`}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {visibleSegments.map((seg, i) => (
          <Box
            key={i}
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: seg.flagged ? '#FFF8E1' : '#FAFAFA',
              border: seg.flagged ? '1px solid #FFE082' : '1px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <SpeakerIcon speaker={seg.speaker} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: seg.speaker === 'Interviewer' ? '#04282B' : '#1976D2', fontSize: '0.75rem' }}>
                {seg.speaker}
              </Typography>
              {seg.timestamp ? (
                onSeekTo && seg.timestamp_secs != null ? (
                  <Chip
                    icon={<PlayArrow sx={{ fontSize: 12 }} />}
                    label={seg.timestamp}
                    size="small"
                    onClick={() => onSeekTo(seg.timestamp_secs)}
                    sx={{
                      height: 20, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: '#EDF3EC', color: '#04282B', cursor: 'pointer',
                      borderRadius: 1.5,
                      '& .MuiChip-icon': { color: '#04282B', ml: 0.25 },
                      '&:hover': { bgcolor: '#D5E8D4' },
                    }}
                  />
                ) : (
                  <Typography variant="caption" sx={{ color: '#AAA', fontSize: '0.7rem' }}>
                    {seg.timestamp}
                  </Typography>
                )
              ) : null}
              {seg.flagged && (
                <Chip label="Flagged" size="small" sx={{
                  ml: 'auto', height: 18, bgcolor: '#FFF3E0', color: '#E65100',
                  fontWeight: 700, fontSize: '0.65rem',
                }} />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: '#333', fontSize: '0.88rem', lineHeight: 1.6, pl: 3.5 }}>
              {seg.text}
            </Typography>
            {seg.flagged && seg.flag_reason && (
              <Typography variant="caption" sx={{ color: '#E65100', fontSize: '0.75rem', pl: 3.5, mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                {seg.flag_reason}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {segments.length > contextIndices.size && (
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          startIcon={expanded ? <ExpandLess /> : <ExpandMore />}
          sx={{ mt: 1, textTransform: 'none', color: '#04282B', fontSize: '0.8rem' }}
        >
          {expanded ? 'Show flagged only' : `Show full transcript (${segments.length} segments)`}
        </Button>
      )}
    </Box>
  );
};

export default TranscriptSegmentList;
