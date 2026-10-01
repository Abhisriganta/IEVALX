import { FaceLandmarker } from '@mediapipe/tasks-vision';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
// --- State ---
let faceLandmarker = null;
let cocoModel = null;
let paused = false;
let processing = false;

// Timing control
let lastFaceRun = 0;
let lastCocoRun = 0;
const FACE_INTERVAL = 500;   // ms — MediaPipe is faster than BlazeFace
const COCO_INTERVAL = 500;  // ms

// Head pose thresholds (degrees)
const YAW_THRESHOLD = 18;
const PITCH_UP_THRESHOLD = -8;
const PITCH_DOWN_THRESHOLD = 15;

// Iris gaze thresholds
const GAZE_LEFT_THRESHOLD = 0.58;
const GAZE_RIGHT_THRESHOLD = 0.42;
const GAZE_DOWN_THRESHOLD = 0.58;
const GAZE_UP_THRESHOLD = 0.38;

// Face tracking state
let faceWasAbsent = false;
let consecutiveNoFace = 0;
const NO_FACE_THRESHOLD = 3; // frames before firing FACE_NOT_VISIBLE

// Multi-face tracking — require consecutive detections to avoid false positives
let consecutiveMultiFace = 0;
const MULTI_FACE_THRESHOLD = 3;
const MULTI_FACE_MIN_CONFIDENCE = 0.85;

// PROC-A-03: Repeated glance pattern — 5 same-direction events in 30s
const glanceHistory = [];
const GLANCE_WINDOW_MS = 30000;
const GLANCE_THRESHOLD = 5;

// Phone/book — sliding window: fire when detected in N of last M frames
const OBJECT_WINDOW_SIZE = 4;
const OBJECT_WINDOW_THRESHOLD = 2;  // 2 of last 4
let phoneWindow = [];
let bookWindow = [];

// Violation cooldowns (worker-side, prevents spamming main thread)
const cooldowns = {};
const COOLDOWN_MS = 1500;

function canFire(type) {
  const now = Date.now();
  if (cooldowns[type] && now - cooldowns[type] < COOLDOWN_MS) return false;
  cooldowns[type] = now;
  return true;
}

function diag(message) {
  self.postMessage({ type: 'DIAG', message });
}

function fireViolation(violationType, metadata = {}) {
  if (!canFire(violationType)) return;
  self.postMessage({ type: 'VIOLATION', violationType, metadata });
}

// --- MediaPipe WASM expects these globals ---
if (typeof self.custom_dbg === 'undefined') self.custom_dbg = () => {};
if (typeof self.custom_msg === 'undefined') self.custom_msg = () => {};

// --- Model Loading ---
async function loadModels() {
  
  let _savedFactory = null;
  let _origImportScripts = self.importScripts;
  let loaderBlobUrl = null;
  try {
    diag('Loading MediaPipe Face Landmarker...');
    const wasmBase = self.location.origin + '/mediapipe-vision';

    // Fetch WASM loader and execute via blob URL + dynamic import
    // (bypasses both Vite's ?import transform AND module worker importScripts ban)
    const loaderResp = await fetch(wasmBase + '/vision_wasm_internal.js');
    if (!loaderResp.ok) throw new Error('WASM loader fetch failed: ' + loaderResp.status);
    const loaderText = await loaderResp.text();
   
    const wrappedLoader =
      'const module = { exports: {} }; const exports = module.exports;\n' +
      loaderText +
      '\nself.ModuleFactory = module.exports.default || module.exports;\n';
    const loaderBlob = new Blob([wrappedLoader], { type: 'text/javascript' });
    const loaderBlobUrl = URL.createObjectURL(loaderBlob);
    await import(/* @vite-ignore */ loaderBlobUrl);
    diag('WASM ModuleFactory pre-loaded: ' + (typeof self.ModuleFactory));

    // Save factory ref — MediaPipe clears it after use/failure
    _savedFactory = self.ModuleFactory;

    // No-op importScripts so MediaPipe's internal loader doesn't crash in module worker
    self.importScripts = () => {};

    faceLandmarker = await FaceLandmarker.createFromOptions(
      {
        wasmLoaderPath: loaderBlobUrl,
        wasmBinaryPath: wasmBase + '/vision_wasm_internal.wasm',
      },
      {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 4,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      }
    );
    self.importScripts = _origImportScripts;
    diag('MediaPipe Face Landmarker loaded (478 landmarks, GPU)');
  } catch (gpuErr) {
    diag('MediaPipe GPU failed: ' + gpuErr.message + ' — trying CPU...');
    try {
      const wasmBase = self.location.origin + '/mediapipe-vision';

      // Restore factory for CPU retry (GPU attempt clears self.ModuleFactory)
      if (_savedFactory && !self.ModuleFactory) {
        self.ModuleFactory = _savedFactory;
        diag('Restored ModuleFactory for CPU retry');
      }
      self.importScripts = () => {};

      faceLandmarker = await FaceLandmarker.createFromOptions(
        {
          wasmLoaderPath: loaderBlobUrl,
          wasmBinaryPath: wasmBase + '/vision_wasm_internal.wasm',
        },
        {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          numFaces: 4,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        }
      );
      self.importScripts = _origImportScripts;
      diag('MediaPipe Face Landmarker loaded (478 landmarks, CPU fallback)');
    } catch (cpuErr) {
      diag('MediaPipe load error (gaze/pose disabled): ' + cpuErr.message);
    }
  }
  self.importScripts = _origImportScripts;

  if (faceLandmarker) {
    self.postMessage({ type: 'MODEL_STATUS', status: 'ready' });
  } else {
    self.postMessage({ type: 'MODEL_STATUS', status: 'error', error: 'no models loaded' });
  }

  // Load COCO-SSD in background — gaze/pose already active, phone/book detection starts when ready
  try {
    diag('Loading TF.js backend...');
    await tf.setBackend('cpu');
    await tf.ready();
    diag('TF.js backend ready: ' + tf.getBackend());
    diag('Loading COCO-SSD...');
    cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    diag('COCO-SSD loaded');
  } catch (err) {
    diag('COCO-SSD load error: ' + err.message);
  }
}

// --- Head Pose from 478 3D Landmarks (z-depth yaw — robust at all angles) ---
function estimateHeadPose(landmarks) {
  const noseTip = landmarks[4];
  const chin = landmarks[152];
  const leftEyeOut = landmarks[33];
  const rightEyeOut = landmarks[263];
  const forehead = landmarks[10];

  const dx = Math.max(rightEyeOut.x - leftEyeOut.x, 0.001);
  const dz = leftEyeOut.z - rightEyeOut.z;
  const yaw = Math.atan2(dz, dx) * (180 / Math.PI);

  // Pitch: 2D ratio is reliable for up/down tilt (vertical rotation doesn't collapse).
  const noseChindist = chin.y - noseTip.y;
  const faceHeight = chin.y - forehead.y;
  const pitchRatio = faceHeight > 0.01 ? (noseChindist / faceHeight) : 0.5;
  const pitch = (0.55 - pitchRatio) * 80;

  const eyeDeltaY = rightEyeOut.y - leftEyeOut.y;
  const eyeDeltaX = rightEyeOut.x - leftEyeOut.x;
  const roll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);

  return { yaw, pitch, roll };
}

// --- Iris Gaze from landmarks 468-477 ---
function estimateGaze(landmarks) {
  if (landmarks.length < 478) return { gazeX: 0.5, gazeY: 0.5, hasIris: false };

  const leftIris = landmarks[468];
  const leftOuter = landmarks[33];
  const leftInner = landmarks[133];
  const leftTop = landmarks[159];
  const leftBottom = landmarks[145];
  const leftGazeX = Math.abs(leftOuter.x - leftInner.x) > 0.001
    ? (leftIris.x - leftOuter.x) / (leftInner.x - leftOuter.x) : 0.5;
  const leftGazeY = Math.abs(leftTop.y - leftBottom.y) > 0.001
    ? (leftIris.y - leftTop.y) / (leftBottom.y - leftTop.y) : 0.5;

  const rightIris = landmarks[473];
  const rightOuter = landmarks[263];
  const rightInner = landmarks[362];
  const rightTop = landmarks[386];
  const rightBottom = landmarks[374];
  const rightGazeX = Math.abs(rightOuter.x - rightInner.x) > 0.001
    ? (rightIris.x - rightOuter.x) / (rightInner.x - rightOuter.x) : 0.5;
  const rightGazeY = Math.abs(rightTop.y - rightBottom.y) > 0.001
    ? (rightIris.y - rightTop.y) / (rightBottom.y - rightTop.y) : 0.5;

  return {
    gazeX: (leftGazeX + rightGazeX) / 2,
    gazeY: (leftGazeY + rightGazeY) / 2,
    hasIris: true,
  };
}


// --- Face Analysis (MediaPipe 478 landmarks) ---
function analyzeFaces(result) {
  const faces = result.faceLandmarks || [];

  if (faces.length === 0) {
    consecutiveNoFace++;
    if (consecutiveNoFace >= NO_FACE_THRESHOLD) {
      if (!faceWasAbsent) {
        faceWasAbsent = true;
        fireViolation('FACE_NOT_VISIBLE');
      }
      return 'no_face';
    }
    return 'monitoring';
  }

  if (faceWasAbsent && faces.length > 0) {
    faceWasAbsent = false;
    consecutiveNoFace = 0;
    fireViolation('FACE_RETURNED');
    return 'ok';
  }
  consecutiveNoFace = 0;

  // Issue-1: Filter ghost faces from hair/glasses/shadows.
  // Only count faces whose landmarks span real screen area.
  let realFaceCount = 0;
  for (let fi = 0; fi < faces.length; fi++) {
    const lm = faces[fi];
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const p of lm) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const spread = (maxX - minX) * (maxY - minY);
    if (spread > 0.002) realFaceCount++;
  }
  if (realFaceCount > 1) {
    consecutiveMultiFace++;
    if (consecutiveMultiFace >= MULTI_FACE_THRESHOLD) {
      consecutiveMultiFace = 0;
      fireViolation('MULTIPLE_FACES', { count: realFaceCount });
      return 'multiple_faces';
    }
    return 'monitoring';
  } else {
    consecutiveMultiFace = 0;
  }

   const landmarks = faces[0];
  const pose = estimateHeadPose(landmarks);
  let status = 'ok';

   diag(`GAZE yaw=${pose.yaw.toFixed(1)} pitch=${pose.pitch.toFixed(1)}`);
  if (pose.yaw < -YAW_THRESHOLD) {
    fireViolation('GAZE_LEFT', { yaw: pose.yaw.toFixed(1) });
    recordGlance('left');
    status = 'looking_away';
  } else if (pose.yaw > YAW_THRESHOLD) {
    fireViolation('GAZE_RIGHT', { yaw: pose.yaw.toFixed(1) });
    recordGlance('right');
    status = 'looking_away';
  }
  if (pose.pitch > PITCH_DOWN_THRESHOLD) {
    fireViolation('GAZE_DOWN', { pitch: pose.pitch.toFixed(1) });
    recordGlance('down');
    status = 'looking_away';
  } else if (pose.pitch < PITCH_UP_THRESHOLD) {
    fireViolation('GAZE_UP', { pitch: pose.pitch.toFixed(1) });
    recordGlance('up');
    status = 'looking_away';
  }

  return status;
}

function recordGlance(direction) {
  const now = Date.now();
  glanceHistory.push({ dir: direction, t: now });
  while (glanceHistory.length > 0 && now - glanceHistory[0].t > GLANCE_WINDOW_MS) {
    glanceHistory.shift();
  }
  const recent = glanceHistory.filter(g => g.dir === direction);
  if (recent.length >= GLANCE_THRESHOLD) {
    fireViolation('REPEATED_GLANCE', { direction, count: recent.length });
    glanceHistory.length = 0;
  }
}

// --- Object Analysis (COCO-SSD) ---
function analyzeObjects(predictions) {
  if (!predictions || predictions.length === 0) {
    return;
  }

  let phoneDetected = false;
  let bookDetected = false;

  for (const pred of predictions) {
    const cls = pred.class;
    const score = pred.score;

    if (cls === 'cell phone' && score >= 0.25) {
      phoneDetected = true;
    } else if (cls === 'book' && score >= 0.40) {
      bookDetected = true;
    }
  }

  phoneWindow.push(phoneDetected ? 1 : 0);
  if (phoneWindow.length > OBJECT_WINDOW_SIZE) phoneWindow.shift();
  if (phoneWindow.length >= OBJECT_WINDOW_SIZE) {
    const hits = phoneWindow.reduce((a, b) => a + b, 0);
    if (hits >= OBJECT_WINDOW_THRESHOLD) {
      fireViolation('ELECTRONIC_DEVICE', { confidence: 'window_' + hits + '_of_' + OBJECT_WINDOW_SIZE });
      phoneWindow = [];
    }
  }

  bookWindow.push(bookDetected ? 1 : 0);
  if (bookWindow.length > OBJECT_WINDOW_SIZE) bookWindow.shift();
  if (bookWindow.length >= OBJECT_WINDOW_SIZE) {
    const hits = bookWindow.reduce((a, b) => a + b, 0);
    if (hits >= OBJECT_WINDOW_THRESHOLD) {
      fireViolation('BOOK_DETECTED', { confidence: 'window_' + hits + '_of_' + OBJECT_WINDOW_SIZE });
      bookWindow = [];
    }
  }
}

// --- Frame Processing ---
let faceProcessing = false;
let cocoProcessing = false;

function processFrame(bitmap) {
  if (paused) { bitmap.close(); return; }
  if (!faceLandmarker && !cocoModel) { bitmap.close(); return; }

  const now = Date.now();
  let bitmapClosed = false;

  // Face/gaze — synchronous, never blocked by COCO
  if (faceLandmarker && !faceProcessing && now - lastFaceRun >= FACE_INTERVAL) {
    faceProcessing = true;
    lastFaceRun = now;
    try {
      const faceResult = faceLandmarker.detect(bitmap);
      const analysisStatus = analyzeFaces(faceResult);
      self.postMessage({ type: 'DETECTION', analysisStatus });
    } catch (err) {
      diag('MediaPipe error: ' + err.message);
    } finally {
      faceProcessing = false;
    }
  }

  // Phone/book — async, runs independently
  if (cocoModel && !cocoProcessing && now - lastCocoRun >= COCO_INTERVAL) {
    let cocoTensor = null;
    try { cocoTensor = tf.browser.fromPixels(bitmap); }
    catch (err) { diag('COCO-SSD tensor error: ' + err.message); }
    if (cocoTensor) {
      lastCocoRun = now;
      cocoProcessing = true;
      bitmap.close();
      bitmapClosed = true;
      cocoModel.detect(cocoTensor)
        .then(preds => { analyzeObjects(preds); })
        .catch(err => { diag('COCO-SSD error: ' + err.message); })
        .finally(() => { cocoTensor.dispose(); cocoProcessing = false; });
    }
  }

  if (!bitmapClosed) bitmap.close();
}

// --- Message Handler ---
self.onmessage = async (event) => {
  const { type } = event.data;

  switch (type) {
    case 'INIT':
      diag('Initializing proctor worker (MediaPipe + COCO-SSD)...');
      await loadModels();
      break;

    case 'FRAME':
      if (event.data.bitmap) {
        await processFrame(event.data.bitmap);
      }
      break;

    case 'PAUSE':
      paused = !!event.data.value;
      diag('Worker ' + (paused ? 'paused' : 'resumed'));
      break;

    case 'STOP':
      paused = true;
      diag('Worker stopped');
      break;

    default:
      diag('Unknown message type: ' + type);
  }
};