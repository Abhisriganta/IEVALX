// BUILD: 2026-08-25-iaem-modelCardService-v2
// Shared endpoint (any authenticated IAEM user) — real API calls
// Backend endpoints: /api/iaem/model-cards/*
//
// RESPONSE NORMALIZATION:
// Backend returns { model_cards: [...] }, components read r.data.cards
import api from '../axiosInstance';

const modelCardService = {

  // ── List all AI model cards ───────────────────────────────────────────
  // GET /api/iaem/model-cards/
  getModelCards: () =>
    api.get('/iaem/model-cards/').then(r => ({
      ...r,
      data: {
        ...r.data,
        cards: r.data.model_cards || r.data.cards || [],
      },
    })),

  // ── Single model card detail ──────────────────────────────────────────
  // GET /api/iaem/model-cards/<card_id>/
  getModelCard: (cardId) =>
    api.get(`/iaem/model-cards/${cardId}/`),
};

export default modelCardService;
