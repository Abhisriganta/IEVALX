/**
 * proctoringService.js
 * BUILD: 2026-09-17-proctor-assessment-v1
 * Thin REST wrapper for /api/proctor/* endpoints in ms-assessment.
 * Follows the same pattern as aiAssessmentTestService.js.
 */
import api from '@/services/api/axiosInstance';

export const proctoringService = {
  /* Pre-test face gate (called from instructions page BEFORE session start). */
  async preCheck(imageBase64) {
    const { data } = await api.post('/proctor/pre-check/', {
      image_base64: imageBase64,
    });
    return data;
  },

  /* Start a proctoring session when the test actually begins. */
  async startSession({ assignmentId, moduleCode, scheduledInterviewId, isPractice = false }) {
    const { data } = await api.post('/proctor/session/start/', {
      assignment_id: assignmentId ? parseInt(assignmentId) : null,
      scheduled_interview_id: scheduledInterviewId ? parseInt(scheduledInterviewId) : null,
      module_code: moduleCode,
      is_practice: !!isPractice,
    });
    return data;
  },

  /* Record a violation event (worker or browser). */
  async recordEvent({ sessionId, event, severity, metadata, snapshot }) {
    const { data } = await api.post('/proctor/event/', {
      session_id: sessionId,
      event,
      severity,
      metadata,
      snapshot,
    });
    return data;
  },

  /* Server-side identity check (every ~15s). */
  async identityCheck({ sessionId, imageBase64 }) {
    const { data } = await api.post('/proctor/identity-check/', {
      session_id: sessionId,
      image_base64: imageBase64,
    }, { timeout: 30000 });
    return data;
  },

  /* Server-side voice check (every ~10s). Multipart. */
  async voiceCheck({ sessionId, audioBlob, aiSpeaking = false }) {
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('audio', audioBlob, 'chunk.webm');
    form.append('ai_speaking', aiSpeaking ? '1' : '0');
    const { data } = await api.post('/proctor/voice-check/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /* Server-side voice check — PCM fast path (no FFmpeg on server). */
  async voiceCheckPCM({ sessionId, pcmData, sampleRate = 16000, aiSpeaking = false }) {
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('audio', new Blob([pcmData], { type: 'application/octet-stream' }), 'chunk.pcm');
    form.append('sample_rate', String(sampleRate));
    form.append('ai_speaking', aiSpeaking ? '1' : '0');
    form.append('format', 'pcm');
    const { data } = await api.post('/proctor/voice-check/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return data;
  },

  /* End the proctoring session — writes report to MongoDB + finalizes MySQL row. */
  async endSession(sessionId) {
    const { data } = await api.post('/proctor/session/end/', {
      session_id: sessionId,
    });
    return data;
  },

  /* Poll session status. */
  async getStatus(sessionId) {
    const { data } = await api.get(`/proctor/session/${sessionId}/status/`);
    return data;
  },
};

export default proctoringService;