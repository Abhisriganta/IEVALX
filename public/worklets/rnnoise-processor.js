// public/worklets/rnnoise-processor.js

const FRAME_SIZE = 480; // RNNoise processes 480 samples at 48kHz

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._initialized = false;
    this._wasmExports = null;
    this._statePtr = null;
    this._inputPtr = null;
    this._outputPtr = null;
    this._heap = null;
    this._buffer = [];

    this.port.onmessage = (e) => {
      if (e.data?.wasmBinary) {
        this._initRNNoise(e.data.wasmBinary).catch((err) => {
          console.error('[RNNoiseProcessor] Init failed:', err);
          this.port.postMessage({ type: 'error', message: err.toString() });
        });
      }
    };
  }

  async _initRNNoise(wasmBinary) {
    try {
      // ✅ FIX: @jitsi/rnnoise-wasm is emscripten-compiled and imports under
      // namespace "a". Import #0 is WebAssembly.Memory. Without providing it,
      // instantiate throws "module is not an object or function".
      const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });

      // ✅ Permissive proxy: satisfies ALL emscripten env imports under "a".
      // Unknown imports get stubs (return 0) so instantiation never throws
      // due to missing imports regardless of emscripten version.
      const envProxy = new Proxy(
        {
          memory,                          // Import #0 — must be Memory object
          table: new WebAssembly.Table({ initial: 1024, element: 'anyfunc' }),
          // common emscripten math/env stubs
          abort: () => { throw new Error('WASM abort'); },
          _emscripten_resize_heap: () => 0,
          emscripten_memcpy_big: () => 0,
          __assert_fail: () => {},
          setTempRet0: () => {},
          getTempRet0: () => 0,
        },
        {
          get(target, prop) {
            if (prop in target) return target[prop];
            // Stub any other import so instantiate doesn't throw
            return (..._args) => 0;
          },
        }
      );

      const importObject = {
        a: envProxy,   // emscripten shorthand namespace (@jitsi uses "a")
        env: envProxy, // fallback for builds using "env" namespace
        wasi_snapshot_preview1: {
          fd_write: () => 0,
          fd_read:  () => 0,
          fd_seek:  () => 0,
          fd_close: () => 0,
          proc_exit: () => {},
          environ_sizes_get: () => 0,
          environ_get: () => 0,
        },
      };

      const result = await WebAssembly.instantiate(wasmBinary, importObject);
      const exp = result.instance.exports;

      this._wasmExports = exp;
      this._heap = new Float32Array(memory.buffer);

      // RNNoise API: _rnnoise_create, _rnnoise_process_frame, _rnnoise_destroy
      if (!exp._rnnoise_create || !exp._rnnoise_process_frame) {
        throw new Error('WASM missing rnnoise exports');
      }

      this._statePtr   = exp._rnnoise_create(0);
      this._inputPtr   = exp._malloc(FRAME_SIZE * 4);   // Float32 = 4 bytes
      this._outputPtr  = exp._malloc(FRAME_SIZE * 4);

      this._initialized = true;
      this.port.postMessage({ type: 'init_complete' });
      console.log('[RNNoiseProcessor] RNNoise initialized successfully');
    } catch (err) {
      console.error('[RNNoiseProcessor] Init failed:', err);
      this.port.postMessage({ type: 'error', message: err.toString() });
    }
  }

  process(inputs, outputs) {
    const input  = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    if (!this._initialized) {
      // Pass through while not yet initialized
      output.set(input);
      return true;
    }

    // Accumulate samples into 480-frame buffer
    for (let i = 0; i < input.length; i++) {
      this._buffer.push(input[i]);
    }

    let outIdx = 0;
    const exp  = this._wasmExports;
    const heap = this._heap;

    // Process in FRAME_SIZE=480 chunks
    while (this._buffer.length >= FRAME_SIZE && outIdx + FRAME_SIZE <= output.length) {
      const frame = this._buffer.splice(0, FRAME_SIZE);

      // Write into WASM heap at inputPtr (convert Float32 to Int16 range)
      const inOffset = this._inputPtr >> 2;
      for (let i = 0; i < FRAME_SIZE; i++) {
        heap[inOffset + i] = frame[i] * 32768;
      }

      // Run RNNoise denoising
      exp._rnnoise_process_frame(this._statePtr, this._outputPtr, this._inputPtr);

      // Read back (Int16 → Float32)
      const outOffset = this._outputPtr >> 2;
      for (let i = 0; i < FRAME_SIZE; i++) {
        output[outIdx++] = heap[outOffset + i] / 32768;
      }
    }

    // Fill remainder with passthrough if buffer ran short
    while (outIdx < output.length) {
      output[outIdx] = outIdx < input.length ? input[outIdx] : 0;
      outIdx++;
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);