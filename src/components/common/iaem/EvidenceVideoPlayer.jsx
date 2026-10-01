
import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, IconButton, Slider } from '@mui/material';
import { PlayArrow, Pause, VolumeUp, VolumeOff, Videocam } from '@mui/icons-material';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const EvidenceVideoPlayer = forwardRef(({
  videoSrc,
  audioSrc,
  segmentLabel = 'Flagged segment',
  segmentStart,
  segmentEnd,
}, ref) => {
  const mediaRef = useRef(null);

  // Expose seekTo method so parent can jump to a specific timestamp
  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      const el = mediaRef.current;
      if (el) {
        el.currentTime = seconds;
        el.play().catch(() => {});
        setPlaying(true);
        setCurrentTime(seconds);
        if (el.duration) setProgress((seconds / el.duration) * 100);
      }
    },
  }));
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const authToken = (() => { try { return localStorage.getItem('ievalx_token'); } catch { return ''; } })();
  const appendToken = (url) => url && authToken ? `${url}${url.includes('?') ? '&' : '?'}token=${authToken}` : url;
  const src = appendToken(videoSrc) || appendToken(audioSrc);
  const isVideo = !!videoSrc;
  const isMock = !src || src.startsWith('#');

  const toggle = () => {
    if (!mediaRef.current) return;
    if (playing) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const el = mediaRef.current;
    if (el?.duration) {
      setProgress((el.currentTime / el.duration) * 100);
      setCurrentTime(el.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const el = mediaRef.current;
    if (el?.duration) setDuration(el.duration);
  };

  const handleSeek = (_, value) => {
    const el = mediaRef.current;
    if (el?.duration) {
      el.currentTime = (value / 100) * el.duration;
      setProgress(value);
    }
  };

  // Timestamp label (e.g., "12:34 — 14:02")
  const timeLabel = segmentStart && segmentEnd ? `${segmentStart} — ${segmentEnd}` : null;

  return (
    <Box sx={{ borderRadius: 2, border: '1px solid #E8E8E8', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F9F9F9' }}>
        <Videocam sx={{ fontSize: 16, color: '#04282B' }} />
        <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>
          {segmentLabel}
        </Typography>
        {timeLabel && (
          <Typography variant="caption" sx={{ color: '#AAA', fontSize: '0.7rem', ml: 'auto' }}>
            {timeLabel}
          </Typography>
        )}
      </Box>

      {isMock ? (
        /* ── Mock placeholder ── */
        <Box sx={{ bgcolor: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
          <IconButton disabled sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', width: 48, height: 48, mb: 1 }}>
            <PlayArrow />
          </IconButton>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
            Video available when connected to backend
          </Typography>
        </Box>
      ) : isVideo ? (
        /* ── Video player ── */
        <Box sx={{ bgcolor: '#000', position: 'relative' }}>
          <video
            ref={mediaRef}
            src={appendToken(videoSrc)}
            muted={muted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
            onClick={toggle}
            style={{
              width: '100%',
              display: 'block',
              maxHeight: 360,
              objectFit: 'contain',
              cursor: 'pointer',
            }}
          />
        </Box>
      ) : (
        /* ── Audio-only fallback (same as before but styled to match) ── */
        <Box sx={{ bgcolor: '#F5F5F5', py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" sx={{ color: '#888' }}>Audio only — no video recording available</Typography>
          <audio
            ref={mediaRef}
            src={appendToken(audioSrc)}
            muted={muted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
          />
        </Box>
      )}

      {/* ── Controls bar ── */}
      {!isMock && (
        <Box sx={{ px: 2, py: 1, bgcolor: '#F9F9F9', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton size="small" onClick={toggle}
            sx={{ bgcolor: '#04282B', color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#0a3d40' } }}>
            {playing ? <Pause sx={{ fontSize: 16 }} /> : <PlayArrow sx={{ fontSize: 16 }} />}
          </IconButton>

          <Typography variant="caption" sx={{ color: '#555', fontSize: '0.72rem', minWidth: 36 }}>
            {formatTime(currentTime)}
          </Typography>

          <Box sx={{ flex: 1 }}>
            <Slider
              value={progress}
              size="small"
              onChange={handleSeek}
              sx={{ color: '#04282B', py: 0 }}
            />
          </Box>

          <Typography variant="caption" sx={{ color: '#888', fontSize: '0.72rem', minWidth: 36 }}>
            {formatTime(duration)}
          </Typography>

          <IconButton size="small" onClick={() => setMuted(!muted)} sx={{ color: '#888' }}>
            {muted ? <VolumeOff sx={{ fontSize: 16 }} /> : <VolumeUp sx={{ fontSize: 16 }} />}
          </IconButton>
        </Box>
      )}
    </Box>
  );
});

EvidenceVideoPlayer.displayName = 'EvidenceVideoPlayer';

export default EvidenceVideoPlayer;
