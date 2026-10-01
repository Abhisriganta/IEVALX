// BUILD: 2026-08-24-iaem-final-v1 — Guide §3D / Appendix §5
import React, { useState, useEffect } from 'react';
import { Box, Typography, Skeleton, Grid } from '@mui/material';
import { modelCardService } from '@/services/api/iaem';
import { ModelCard } from '@/components/common/iaem';

const ModelCardBrowser = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { modelCardService.getModelCards().then(r => setCards(r.data.cards || [])).catch(console.error).finally(() => setLoading(false)); }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Model Cards</Typography>
      <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>Every AI component's purpose, thresholds, precision targets, and known limitations.</Typography>
      {loading ? <Skeleton height={300} /> : (
        <Grid container spacing={3}>
          {cards.map(card => <Grid key={card.id} size={{ xs: 12 }}><ModelCard card={card} /></Grid>)}
        </Grid>
      )}
    </Box>
  );
};
export default ModelCardBrowser;
