
const WORKLET_PATH          = "/worklets/rnnoise-processor.js";
const RNNOISE_WASM_URL      = "/rnnoise/rnnoise.wasm";
const RNNOISE_WASM_FALLBACK = "https://unpkg.com/@jitsi/rnnoise-wasm/dist/rnnoise.wasm";

class NoiseSuppressionService {
  constructor() {
    this._workletRegistered  = false;
    this._registeredContext  = null;   // ✅ FIX 3: track context ref, not boolean
    this._wasmBinary         = null;   // ✅ FIX 2: raw ArrayBuffer, not instantiated module
    this._wasmLoading        = null;
    this._workletNode        = null;
    this._isReady            = false;
    this._isBypassed         = false;
    this._vadProbability     = 0;
    this._onVADUpdate        = null;
    this._loadError          = null;

    // Pre-filter chain nodes
    this._highPass  = null;  // 80 Hz highpass  — strips horn sub-fundamentals
    this._notch60   = null;  // 60 Hz notch     — US electrical hum
    this._notch120  = null;  // 120 Hz notch    — harmonic
    this._lowPass   = null;  // 4 kHz lowpass   — strips hiss / fans above speech
    this._entryNode = null;  // source connects here
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Create the full filter + denoising chain.
   * Returns the EXIT node — connect this to analyser/gain etc.
   * Wire source → ns.getEntryNode(), NOT directly to the return value.
   *
   * Falls back to filter-chain-only if WASM/worklet unavailable.
   *
   * @param {AudioContext} audioContext
   * @returns {Promise<AudioNode>} exit node
   */
  async createNode(audioContext) {

    // ── 1. Build pre-filter chain ──────────────────────────────────────────
    this._highPass = audioContext.createBiquadFilter();
    this._highPass.type            = "highpass";
    this._highPass.frequency.value = 80;
    this._highPass.Q.value         = 0.7;

    this._notch60 = audioContext.createBiquadFilter();
    this._notch60.type            = "notch";
    this._notch60.frequency.value = 60;
    this._notch60.Q.value         = 10;

    this._notch120 = audioContext.createBiquadFilter();
    this._notch120.type            = "notch";
    this._notch120.frequency.value = 120;
    this._notch120.Q.value         = 10;

    this._lowPass = audioContext.createBiquadFilter();
    this._lowPass.type            = "lowpass";
    this._lowPass.frequency.value = 4000;
    this._lowPass.Q.value         = 0.7;

    // Wire: highPass → notch60 → notch120 → lowPass
    this._highPass.connect(this._notch60);
    this._notch60.connect(this._notch120);
    this._notch120.connect(this._lowPass);

    this._entryNode = this._highPass;

    // ── 2. Attempt RNNoise worklet after filter chain ──────────────────────
    try {
      await this._registerWorklet(audioContext);

      // ✅ FIX 1: Load raw ArrayBuffer — do NOT instantiate in main thread.
      // Instantiation happens inside the AudioWorklet thread.
      const wasmBinary = await this._loadWASMBinary();

      this._workletNode = new AudioWorkletNode(audioContext, "rnnoise-processor", {
        numberOfInputs:        1,
        numberOfOutputs:       1,
        outputChannelCount:    [1],
        channelCount:          1,
        channelCountMode:      "explicit",
        channelInterpretation: "speakers",
      });

      // ✅ FIX 1: Transfer ownership of ArrayBuffer — zero-copy, no clone issue
      this._workletNode.port.postMessage(
        { type: "init", data: { wasmBinary } },
        [wasmBinary]
      );

      this._workletNode.port.onmessage = (event) => {
        const { type } = event.data;
        if (type === "ready") {
          this._isReady = true;
          console.log("[NoiseSuppression] Filter chain + RNNoise worklet ready ✓");
        } else if (type === "vad") {
          this._vadProbability = event.data.probability;
          if (this._onVADUpdate) this._onVADUpdate(this._vadProbability);
        } else if (type === "error") {
          console.warn("[NoiseSuppression] Worklet error:", event.data.message);
          this._isBypassed = true;
        }
      };

      this._workletNode.onprocessorerror = (err) => {
        console.error("[NoiseSuppression] Processor error:", err);
        this._isBypassed = true;
      };

      // lowPass → rnnoiseWorklet
      this._lowPass.connect(this._workletNode);

      console.log("[NoiseSuppression] AudioWorkletNode created, awaiting WASM init");
      return this._workletNode;  // EXIT node

    } catch (err) {
      this._loadError  = err.message;
      this._isBypassed = true;
      console.warn("[NoiseSuppression] RNNoise unavailable, using filter chain only:", err.message);
      return this._lowPass;  // EXIT node — filter chain alone still helps
    }
  }

  /**
   * Returns the ENTRY node of the chain.
   * Wire: source.connect(ns.getEntryNode())
   */
  getEntryNode() {
    return this._entryNode || this._highPass;
  }

  onVADUpdate(callback) {
    this._onVADUpdate = callback;
  }

  setBypass(bypass) {
    this._isBypassed = bypass;
    if (this._workletNode) {
      this._workletNode.port.postMessage({ type: "bypass", data: { bypass } });
    }
  }

  getVADProbability() {
    return this._vadProbability;
  }

  get isActive() {
    return this._isReady && !this._isBypassed;
  }

  destroy() {
    if (this._workletNode) {
      try {
        this._workletNode.port.postMessage({ type: "destroy" });
        this._workletNode.disconnect();
      } catch (_) {}
      this._workletNode = null;
    }

    // Disconnect filter chain
    [this._highPass, this._notch60, this._notch120, this._lowPass].forEach(node => {
      if (node) { try { node.disconnect(); } catch (_) {} }
    });
    this._highPass  = null;
    this._notch60   = null;
    this._notch120  = null;
    this._lowPass   = null;
    this._entryNode = null;

    this._isReady           = false;
    this._isBypassed        = false;
    this._wasmBinary        = null;   // ✅ FIX 4: clear binary so next session re-fetches
    this._wasmLoading       = null;
    this._workletRegistered = false;  // ✅ FIX 4: reset so next session re-registers
    this._registeredContext = null;   // ✅ FIX 4: clear context ref
    console.log("[NoiseSuppression] Destroyed");
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  // ✅ FIX 3: check against the actual AudioContext instance, not a stale boolean.
  // A new AudioContext after destroy() requires re-registration even if the
  // worklet script was previously loaded — each context has its own worklet scope.
  async _registerWorklet(audioContext) {
    if (this._registeredContext === audioContext) return;
    try {
      await audioContext.audioWorklet.addModule(WORKLET_PATH + '?v=' + Date.now());
      this._registeredContext = audioContext;
      this._workletRegistered = true;
      console.log("[NoiseSuppression] AudioWorklet module registered");
    } catch (err) {
      throw new Error(`Failed to register AudioWorklet: ${err.message}. Ensure ${WORKLET_PATH} is accessible.`);
    }
  }

  // ✅ FIX 2: Returns raw ArrayBuffer — worklet instantiates WASM itself.
  async _loadWASMBinary() {
    if (this._wasmBinary) return this._wasmBinary;
    if (this._wasmLoading) return this._wasmLoading;
    this._wasmLoading = this._fetchWASMBinary();
    return this._wasmLoading;
  }

  async _fetchWASMBinary() {
    const urls = [RNNOISE_WASM_URL, RNNOISE_WASM_FALLBACK];

    for (const url of urls) {
      try {
        console.log("[NoiseSuppression] Loading RNNoise WASM binary from:", url);
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const wasmBinary = await response.arrayBuffer();

        // ✅ Validate magic bytes — reject HTML error pages served as WASM
        // Real WASM starts with 00 61 73 6d. HTML starts with 3c 21 64 6f (<!do)
        const magic = new Uint8Array(wasmBinary, 0, 4);
        if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6d) {
          throw new Error(`Not a valid WASM file (magic: ${Array.from(magic).map(b => b.toString(16)).join(' ')})`);
        }

        this._wasmBinary = wasmBinary;
        console.log("[NoiseSuppression] RNNoise WASM binary loaded ✓", wasmBinary.byteLength, "bytes");
        return wasmBinary;
      } catch (err) {
        console.warn("[NoiseSuppression] WASM load failed from", url, ":", err.message);
      }
    }

    throw new Error("RNNoise WASM could not be loaded from any source");
  }
}

// ============================================================================
// SimpleNoiseSuppressor (unchanged)
// ============================================================================

export class SimpleNoiseSuppressor {
  static isSupported() {
    try {
      const constraints = navigator.mediaDevices.getSupportedConstraints();
      return !!(constraints.noiseSuppression && constraints.echoCancellation);
    } catch {
      return false;
    }
  }

  static async applyToTrack(track) {
    try {
      await track.applyConstraints({
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      });
      console.log("[SimpleNoiseSuppressor] Constraints applied to track:", track.label);
      return true;
    } catch (err) {
      console.warn("[SimpleNoiseSuppressor] Could not apply constraints:", err);
      return false;
    }
  }
}

export default NoiseSuppressionService;