// BUILD: 2026-08-24-iaem-consent-v1
import React, { useState } from 'react';
import { Paper, Typography, FormControlLabel, Checkbox, Button, Box } from '@mui/material';
import { Lock, CheckCircle } from '@mui/icons-material';

const ConsentClauseCard = ({ clause, isAcknowledged, loading, onAcknowledge }) => {
  const [checked, setChecked] = useState(false);

  const handleSubmit = () => {
    if (checked && !isAcknowledged) {
      onAcknowledge();
      setChecked(false); // reset for next clause
    }
  };

  return (
    <Paper elevation={0} sx={{
      maxWidth: 720,
      width: '100%',
      p: { xs: 3, md: 4 },
      borderRadius: 3,
      border: '1px solid #E0E0E0',
      bgcolor: '#fff',
    }}>
      {/* Clause number badge */}
      <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        mb: 2,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        bgcolor: '#04282B',
        color: '#fff',
      }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
          Clause {clause.no} of 12
        </Typography>
      </Box>

      {/* Title */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 2, fontSize: '1.15rem' }}>
        {clause.title}
      </Typography>

      {/* Body text */}
      <Typography variant="body1" sx={{
        color: '#444',
        lineHeight: 1.7,
        mb: 3,
        fontSize: '0.95rem',
      }}>
        {clause.body}
      </Typography>

      {/* Acknowledgment checkbox */}
      {!isAcknowledged ? (
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                sx={{
                  color: '#999',
                  '&.Mui-checked': { color: '#04282B' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>
                I have read and understood this clause
              </Typography>
            }
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={!checked || loading}
              onClick={handleSubmit}
              sx={{
                bgcolor: '#04282B',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1,
                borderRadius: 2,
                '&:hover': { bgcolor: '#0a3d40' },
                '&.Mui-disabled': { bgcolor: '#ccc', color: '#888' },
              }}
            >
              {loading ? 'Acknowledging...' : clause.no === 12 ? 'Complete Consent' : 'Acknowledge & Continue'}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#4CAF50' }}>
          <CheckCircle sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Acknowledged
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ConsentClauseCard;
