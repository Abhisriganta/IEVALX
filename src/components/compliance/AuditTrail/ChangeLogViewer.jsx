// BUILD: 2026-08-24-iaem-final-v1 — Guide §3D
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, TextField, Skeleton, Button } from '@mui/material';
import { complianceService } from '@/services/api/iaem';
import { ChangeLogTimeline } from '@/components/common/iaem';

const ChangeLogViewer = () => {
  const { caseId } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCase, setSearchCase] = useState(caseId || '');

  const loadTrail = (id) => { if (!id) return; setLoading(true);
    complianceService.getCaseAuditTrail(id).then(r => setEvents(r.data.events || [])).catch(console.error).finally(() => setLoading(false)); };

  useEffect(() => { if (caseId) loadTrail(caseId); else setLoading(false); }, [caseId]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Audit Trail</Typography>
      <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>Hash-chained, tamper-evident change log for any case.</Typography>
      {!caseId && (
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField size="small" label="Case ID" value={searchCase} onChange={e => setSearchCase(e.target.value)} sx={{ minWidth: 200 }} />
          <Button variant="contained" onClick={() => loadTrail(searchCase)} sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#04282B' }}>Load</Button>
        </Box>
      )}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #E8E8E8' }}>
        {loading ? <Skeleton height={100} /> : <ChangeLogTimeline events={events} />}
      </Paper>
    </Box>
  );
};
export default ChangeLogViewer;
