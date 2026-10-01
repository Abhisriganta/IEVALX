
import React, { useRef, useState } from 'react';
import { Box, Typography, IconButton, Slider } from '@mui/material';
import { PlayArrow, Pause, VolumeUp } from '@mui/icons-material';

const EvidenceAudioPlayer = ({ src, segmentLabel = 'Flagged segment' }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => {}); }
    setPlaying(!playing);
  };

  const isMock = !src || src.startsWith('#');

  return (
    <Box sx={{
      p: 2, borderRadius: 2, bgcolor: '#F9F9F9', border: '1px solid #E8E8E8',
    }}>
      <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, mb: 1, display: 'block' }}>
        {segmentLabel}
      </Typography>

      {isMock ? (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          p: 1.5, borderRadius: 1.5, bgcolor: '#F0F0F0',
        }}>
          <IconButton size="small" disabled sx={{ bgcolor: '#E0E0E0' }}>
            <PlayArrow fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Slider
              value={0}
              disabled
              size="small"
              sx={{ color: '#CCC', '& .MuiSlider-thumb': { display: 'none' } }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#AAA', fontSize: '0.7rem' }}>
            Audio available when connected to backend
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <audio
            ref={audioRef}
            src={src}
            onTimeUpdate={() => {
              const a = audioRef.current;
              if (a?.duration) setProgress((a.currentTime / a.duration) * 100);
            }}
            onEnded={() => { setPlaying(false); setProgress(0); }}
          />
          <IconButton size="small" onClick={toggle} sx={{ bgcolor: '#04282B', color: '#fff', '&:hover': { bgcolor: '#0a3d40' } }}>
            {playing ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Slider
              value={progress}
              size="small"
              onChange={(_, v) => {
                const a = audioRef.current;
                if (a?.duration) a.currentTime = (v / 100) * a.duration;
                setProgress(v);
              }}
              sx={{ color: '#04282B' }}
            />
          </Box>
          <VolumeUp sx={{ color: '#888', fontSize: 18 }} />
        </Box>
      )}
    </Box>
  );
};

export default EvidenceAudioPlayer;
