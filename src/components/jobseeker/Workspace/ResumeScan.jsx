// ============================================================================
// ResumeScan.jsx
// Workspace > Resume Builder > Resume Scan (ATS scan upload + result panel)
// All state and handlers come from the parent via props
// (parent uses useResumeBuilder which owns scan state).
// Location: src/components/jobseeker/Workspace/ResumeScan.jsx
// ============================================================================

import React, { useRef } from 'react';
import {
  Paper, Box, Stack, Grid, Typography, Avatar, Button, IconButton, Tooltip,
  CircularProgress, LinearProgress,
} from '@mui/material';
import {
  AutoAwesome, CloudUpload, InsertDriveFile, Close, Replay, TrendingUp,
} from '@mui/icons-material';

const PRIMARY = '#1E3358';
const PRIMARY_DARK = '#162848';
const PRIMARY_SOFT = 'rgba(30, 51, 88, 0.10)';

const scoreColor = (score) => {
  if (score >= 85) return '#2E7D32';
  if (score >= 70) return '#ED6C02';
  return '#C62828';
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

const ResumeScan = ({
  scanFile,
  dragActive,
  scanning,
  scanResult,
  onSelectFile,
  onDragOver,
  onDragLeave,
  onDrop,
  onRunScan,
  onReset,
}) => {
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSelectFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleResetClick = () => {
    onReset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        <AutoAwesome sx={{ color: PRIMARY }} />
        <Typography variant="h6" fontWeight={700} sx={{ color: PRIMARY }}>
          Resume Scan
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 2.5 }}>
        Upload your resume to get an instant ATS compatibility score with a detailed
        breakdown and improvement tips.
      </Typography>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      <Grid container spacing={2.5}>
        {/* LEFT: Upload zone / file preview */}
        <Grid size={{ xs: 12, md: scanResult ? 5 : 12 }}>
          {!scanFile ? (
            <Box
              onClick={triggerFilePicker}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragActive ? PRIMARY : '#E5E7EB',
                borderRadius: 3,
                p: { xs: 4, md: 6 },
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragActive ? PRIMARY_SOFT : '#FAFAFA',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: PRIMARY, bgcolor: PRIMARY_SOFT },
              }}
            >
              <CloudUpload sx={{ fontSize: 52, color: PRIMARY, mb: 1.5 }} />
              <Typography variant="body1" fontWeight={600} sx={{ color: PRIMARY, mb: 0.5 }}>
                {dragActive ? 'Drop your resume here' : 'Drop your resume here or click to upload'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                PDF, DOC, or DOCX • Max 5MB
              </Typography>
            </Box>
          ) : (
            <Paper
              elevation={0}
              sx={{ p: 2.5, borderRadius: 2, border: '1px solid #E5E7EB', height: '100%' }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: PRIMARY_SOFT, color: PRIMARY, width: 48, height: 48 }}>
                  <InsertDriveFile />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} sx={{ color: PRIMARY }} noWrap>
                    {scanFile.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                    {formatBytes(scanFile.size)}
                  </Typography>
                </Box>
                <Tooltip title="Remove">
                  <span>
                    <IconButton size="small" onClick={handleResetClick} disabled={scanning}>
                      <Close fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              {!scanResult ? (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    scanning ? (
                      <CircularProgress size={16} sx={{ color: '#fff' }} />
                    ) : (
                      <AutoAwesome />
                    )
                  }
                  disabled={scanning}
                  onClick={onRunScan}
                  sx={{
                    mt: 2.5,
                    bgcolor: PRIMARY,
                    textTransform: 'none',
                    borderRadius: 8,
                    py: 1.25,
                    fontWeight: 600,
                    '&:hover': { bgcolor: PRIMARY_DARK },
                  }}
                >
                  {scanning ? 'Scanning resume...' : 'Scan Resume'}
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Replay />}
                  onClick={handleResetClick}
                  sx={{
                    mt: 2.5,
                    color: PRIMARY,
                    borderColor: PRIMARY,
                    textTransform: 'none',
                    borderRadius: 8,
                    py: 1.25,
                    fontWeight: 600,
                    '&:hover': { borderColor: PRIMARY_DARK, bgcolor: PRIMARY_SOFT },
                  }}
                >
                  Scan Another Resume
                </Button>
              )}
            </Paper>
          )}
        </Grid>

        {/* RIGHT: Result */}
        {scanResult && (
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{ p: 2.5, borderRadius: 2, border: '1px solid #E5E7EB', height: '100%' }}
            >
              <Grid container spacing={2.5} alignItems="center">
                {/* Score circle */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                      <CircularProgress
                        variant="determinate"
                        value={100}
                        size={130}
                        thickness={4}
                        sx={{ color: '#F3F4F6' }}
                      />
                      <CircularProgress
                        variant="determinate"
                        value={scanResult.score}
                        size={130}
                        thickness={4}
                        sx={{
                          color: scoreColor(scanResult.score),
                          position: 'absolute',
                          left: 0,
                        }}
                      />
                      <Box
                        sx={{
                          top: 0, left: 0, bottom: 0, right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                        }}
                      >
                        <Typography
                          variant="h4"
                          fontWeight={700}
                          sx={{ color: scoreColor(scanResult.score), lineHeight: 1 }}
                        >
                          {scanResult.score}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9CA3AF', mt: 0.5 }}>
                          ATS Score
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: scoreColor(scanResult.score),
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}
                    >
                      {scanResult.score >= 85
                        ? 'Excellent'
                        : scanResult.score >= 70
                        ? 'Good'
                        : 'Needs Work'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Breakdown */}
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: '#6B7280', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    Breakdown
                  </Typography>
                  <Stack spacing={1.25} mt={1}>
                    {scanResult.breakdown.map((item) => (
                      <Box key={item.label}>
                        <Stack direction="row" justifyContent="space-between" mb={0.4}>
                          <Typography variant="body2" sx={{ color: '#4B5563' }}>
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ color: scoreColor(item.value) }}
                          >
                            {item.value}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={item.value}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#F3F4F6',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: scoreColor(item.value),
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Grid>

                {/* Suggestions */}
                <Grid size={12}>
                  <Box sx={{ pt: 2, borderTop: '1px solid #F3F4F6' }}>
                    <Typography
                      variant="caption"
                      sx={{ color: '#6B7280', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
                    >
                      Improvement Suggestions
                    </Typography>
                    <Stack spacing={1.25} mt={1.25}>
                      {scanResult.suggestions.map((s, i) => (
                        <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
                          <TrendingUp sx={{ color: PRIMARY, fontSize: 18, mt: 0.25, flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ color: '#4B5563' }}>
                            {s}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default ResumeScan;