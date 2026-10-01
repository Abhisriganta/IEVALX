// BUILD: 2026-08-24-iaem-consent-v1
// Appendix §1 — 12 clauses shown one at a time. Interviewer must check each
// before proceeding. Cannot access dashboard until all 12 are acknowledged.
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, LinearProgress, Paper, Checkbox,
  FormControlLabel, Button, Stepper, Step, StepLabel,
} from '@mui/material';
import { CheckCircle, Lock } from '@mui/icons-material';
import { CONSENT_CLAUSES, CONSENT_VERSION } from '@/constants/iaemConsent';
import { interviewerAuthService } from '@/services/api/iaem';
import { clearConsentGate } from '@/hooks/interviewer/useConsentGate';
import ConsentClauseCard from './ConsentClauseCard';
import ConsentComplete from './ConsentComplete';

const ConsentAcknowledgment = () => {
  const navigate = useNavigate();
  const [currentClause, setCurrentClause] = useState(0);
  const [acknowledged, setAcknowledged] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const progress = (acknowledged.size / CONSENT_CLAUSES.length) * 100;

  const handleAcknowledge = useCallback(async (clauseNo) => {
    setLoading(true);
    try {
      const res = await interviewerAuthService.acknowledgeClause(clauseNo);
      const next = new Set(acknowledged);
      next.add(clauseNo);
      setAcknowledged(next);

      if (res.data.all_done) {
        clearConsentGate();
        setAllDone(true);
      } else if (currentClause < CONSENT_CLAUSES.length - 1) {
        setCurrentClause((c) => c + 1);
      }
    } catch (err) {
      console.error('[Consent] Failed to acknowledge clause:', err);
    } finally {
      setLoading(false);
    }
  }, [acknowledged, currentClause]);

  const handleProceed = () => {
    navigate('/interviewer/overview', { replace: true });
  };

  if (allDone) {
    return <ConsentComplete onProceed={handleProceed} />;
  }

  const clause = CONSENT_CLAUSES[currentClause];

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F5F4F0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pt: { xs: 3, md: 6 },
      px: 2,
    }}>
      {/* Header */}
      <Box sx={{ maxWidth: 720, width: '100%', mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#2C2C2A', mb: 0.5 }}>
          Consent Acknowledgment
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          Please read and acknowledge each clause before accessing your Interviewer Dashboard.
          Consent version: {CONSENT_VERSION}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: '#E0E0E0',
            '& .MuiLinearProgress-bar': { bgcolor: '#4CAF50', borderRadius: 3 },
          }}
        />
        <Typography variant="caption" sx={{ color: '#888', mt: 0.5, display: 'block' }}>
          {acknowledged.size} of {CONSENT_CLAUSES.length} clauses acknowledged
        </Typography>
      </Box>

      {/* Clause stepper (compact, horizontal on desktop) */}
      <Box sx={{ maxWidth: 720, width: '100%', mb: 3, overflowX: 'auto' }}>
        <Stepper activeStep={currentClause} alternativeLabel sx={{
          '& .MuiStepIcon-root.Mui-completed': { color: '#4CAF50' },
          '& .MuiStepIcon-root.Mui-active': { color: '#04282B' },
        }}>
          {CONSENT_CLAUSES.map((c, i) => (
            <Step key={c.no} completed={acknowledged.has(c.no)}>
              <StepLabel sx={{
                '& .MuiStepLabel-label': { fontSize: '0.65rem', mt: 0.5 },
              }}>
                {/* Only show label on active */}
                {i === currentClause ? `Clause ${c.no}` : ''}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Current clause card */}
      <ConsentClauseCard
        clause={clause}
        isAcknowledged={acknowledged.has(clause.no)}
        loading={loading}
        onAcknowledge={() => handleAcknowledge(clause.no)}
      />

      {/* Previous clauses (collapsed, read-only) */}
      {currentClause > 0 && (
        <Box sx={{ maxWidth: 720, width: '100%', mt: 3, mb: 4 }}>
          <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
            Previously acknowledged
          </Typography>
          {CONSENT_CLAUSES.slice(0, currentClause).map((c) => (
            <Paper key={c.no} elevation={0} sx={{
              p: 1.5, mb: 1, bgcolor: '#FAFAFA', borderRadius: 2,
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <CheckCircle sx={{ color: '#4CAF50', fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.82rem' }}>
                Clause {c.no}: {c.title}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ConsentAcknowledgment;
