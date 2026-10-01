
import env from '@/config/env';

// ── Config ──────────────────────────────────────────────────────────────────
const WI_BASE = env.WEEKLY_INTERVIEW_URL;

const getToken = () => localStorage.getItem('ievalx_token') || '';

/** Build the absolute WSS URL for a given session. */
const buildWsUrl = (sessionId) => {
  if (WI_BASE) {
    try {
      const base = new URL(WI_BASE);
      const proto = base.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = new URL(`${proto}//${base.host}/weekly_interview/ws/${sessionId}`);
      const token = getToken();
      if (token) url.searchParams.set('token', token);
      return url.toString();
    } catch { /* fall through to same-origin */ }
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(`${proto}//${window.location.host}/weekly_interview/ws/${sessionId}`);
  const token = getToken();
  if (token) url.searchParams.set('token', token);
  return url.toString();
};

// ── WebSocket Manager ───────────────────────────────────────────────────────
class RealtimeWSManager {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
    this.maxReconnect = 3;
    this.queue = [];
    this._reconnecting = false;
  }

  connect(sessionId, wsUrlFromDjango, callbacks = {}) {
    // If already connected to same session, just update callbacks
    if (
      this.ws &&
      this.sessionId === sessionId &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      this.callbacks = callbacks;
      return this.ws;
    }

    if (!this._reconnecting) {
      this.disconnect();
    } else {
      if (this.ws) {
        try { this.ws.close(1000, 'reconnecting'); } catch { /* ignore */ }
        this.ws = null;
      }
    }
    this._reconnecting = false;
    this.sessionId = sessionId;
    this.callbacks = callbacks;

    // Prefer the URL Django returned; fall back to building one ourselves
    let wsUrl = wsUrlFromDjango || buildWsUrl(sessionId);
    // If Django returned a relative path (e.g. /weekly_interview/ws/doc/...),
    // convert to absolute wss:// URL through the current host.
    if (wsUrl && wsUrl.startsWith('/')) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.host}${wsUrl}`;
      const token = getToken();
      if (token) wsUrl += `${wsUrl.includes('?') ? '&' : '?'}token=${token}`;
    }

    console.log('[WS] Connecting:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected for session:', sessionId);
      this.reconnectAttempts = 0;
      // Flush queue
      while (this.queue.length) this.send(this.queue.shift());
      this.callbacks.onOpen?.();
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        this.callbacks.onMessage?.(data);
      } catch (err) {
        console.error('[WS] Parse error:', err);
        this.callbacks.onError?.(err);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      this.callbacks.onError?.(err);
    };

    ws.onclose = (evt) => {
      console.log('[WS] Closed:', evt.code, evt.reason);
      // Auto-reconnect on abnormal closure
      if (evt.code !== 1000 && evt.code !== 1001 && this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++;
        const delay = 2000 * this.reconnectAttempts;
        console.log(`[WS] Reconnecting ${this.reconnectAttempts}/${this.maxReconnect} in ${delay}ms`);
        this._reconnecting = true;
        setTimeout(() => this.connect(sessionId, wsUrlFromDjango, this.callbacks), delay);
        return;
      }
      if (this.reconnectAttempts >= this.maxReconnect) {
        console.error('[WS] Max reconnect attempts reached — giving up.');
      }
      this.callbacks.onClose?.(evt);
    };

    this.ws = ws;
    return ws;
  }

  send(data) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
      return true;
    }
    this.queue.push(data);
    return false;
  }

  disconnect() {
    if (this.ws) {
      try { this.ws.close(1000, 'Normal closure'); } catch { /* ignore */ }
      this.ws = null;
    }
    this.queue = [];
    this.reconnectAttempts = 0;
    this._reconnecting = false;
    this.sessionId = null;
    this.callbacks = {};
  }

  getState() {
    if (!this.ws) return 'not_connected';
    return { 0: 'connecting', 1: 'open', 2: 'closing', 3: 'closed' }[this.ws.readyState] || 'unknown';
  }
}

export const wsManager = new RealtimeWSManager();

// ── Convenience exports (match iMentora's API surface) ──────────────────────
export const connectWS = (sessionId, wsUrl, callbacks) =>
  wsManager.connect(sessionId, wsUrl, callbacks);

export const sendWSMessage = (data) => wsManager.send(data);

export const disconnectWS = () => wsManager.disconnect();

export const getWSState = () => wsManager.getState();

// ── Audio processing ────────────────────────────────────────────────────────
/** Convert an audio Blob to the message format the backend expects. */
export const processAudioForWS = async (audioBlob) => {
  if (!audioBlob || audioBlob.size === 0) throw new Error('Empty audio blob');

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  return {
    type: 'audio_data',
    audio: base64,
    metadata: {
      size: audioBlob.size,
      type: audioBlob.type,
      timestamp: Date.now(),
    },
  };
};

// ── Face-gate verification ──────────────────────────────────────────────────
export const verifyFaceGate = async (imageBase64) => {
  try {
    const user = JSON.parse(localStorage.getItem('ievalx_user') || '{}');
    const candidateId = user?.Candidate_Id || user?.id || '';
    if (!candidateId) throw new Error('No candidate id found. Please log in again.');

    const cleanB64 = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const form = new FormData();
    form.append('student_id', String(candidateId));
    form.append('image_base64', cleanB64);

    const faceGateUrl = WI_BASE ? `${WI_BASE}/verify_face_gate` : `/weekly_interview/verify_face_gate`;
    const resp = await fetch(faceGateUrl, {
      method: 'POST',
      body: form,
    });
    const data = await resp.json();

    return {
      verified:   data.verified   || false,
      similarity: data.similarity || 0,
      error:      data.error      || null,
      errorType:  data.error_type || null,
      canProceed: data.can_proceed || false,
    };
  } catch (err) {
    console.error('[FaceGate] Failed:', err);
    return {
      verified: false, similarity: 0,
      error: err.message, errorType: 'network_error', canProceed: false,
    };
  }
};

export default {
  wsManager,
  connectWS,
  sendWSMessage,
  disconnectWS,
  getWSState,
  processAudioForWS,
  verifyFaceGate,
  buildWsUrl,
  WI_BASE,
};
