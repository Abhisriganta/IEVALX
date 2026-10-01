// ============================================================================
// PhotoEditorModal.jsx — Frame-aware photo editor.
//
// FIXES:
//   1. Shape export: canvas now applies the clip path BEFORE toBlob so the
//      exported PNG is already shaped. Backend receives a pre-masked image
//      and does not need to re-apply masking per shape.
//   2. UI: pink removed, replaced with iEvalx blue (#5E815D) palette.
//      Shape swatches now show text labels. Professional dark theme.
//
// [POSITION] Added photo placement selector (top-left / top-right / center-top).
//   - New POSITIONS array, position state, position picker UI.
//   - onSave now sends { blob, shape, position } instead of { blob, shape }.
//   - Default "top-right" matches current backend behavior — zero regressions.
//
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/PhotoEditorModal.jsx
// ============================================================================

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, Box, Stack, Typography, IconButton, Slider,
} from "@mui/material";
import {
  X, Image as ImageIcon, RotateCcw, Upload, ZoomIn, ZoomOut, Camera,
} from "lucide-react";
import { SpinnerEl } from "./atoms";

const VIEWPORT = 320;
const OUTPUT   = 600;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Canvas clip radii — must match the CSS clip-path percentage values below
const ROUND_RADII = {
  roundRect_xl: OUTPUT * 0.28,
  roundRect_md: OUTPUT * 0.16,
  roundRect_sm: OUTPUT * 0.08,
};

const SHAPES = [
  { key: "circle",       backend: "circle",    clip: "circle(50%)",        label: "Circle"  },
  { key: "roundRect_xl", backend: "roundRect", clip: "inset(0 round 28%)", label: "Soft"    },
  { key: "roundRect_md", backend: "roundRect", clip: "inset(0 round 16%)", label: "Rounded" },
  { key: "roundRect_sm", backend: "roundRect", clip: "inset(0 round 8%)",  label: "Slight"  },
  { key: "square",       backend: "square",    clip: "inset(0)",           label: "Square"  },
];

// [POSITION] Photo placement positions — sent to backend for DOCX anchor placement
const POSITIONS = [
  { key: "top-left",   label: "Top Left"  },
  { key: "top-right",  label: "Top Right" },
  { key: "center-top", label: "Center"    },
];

const _initialShapeKey = (backendShape) => {
  if (!backendShape) return "circle";
  const s = String(backendShape).toLowerCase();
  if (s === "circle" || s === "ellipse") return "circle";
  if (s === "square" || s === "rect")    return "square";
  if (s.includes("round"))               return "roundRect_md";
  return "circle";
};

// Polyfill for ctx.roundRect (not available in all browsers)
function _clipRoundRect(ctx, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, w, h, r);
  } else {
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.arcTo(w, 0, w, r, r);
    ctx.lineTo(w, h - r);
    ctx.arcTo(w, h, w - r, h, r);
    ctx.lineTo(r, h);
    ctx.arcTo(0, h, 0, h - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
  }
}

export default function PhotoEditorModal({
  open,
  initialImageUrl = null,
  initialShape    = "circle",
  onSave,
  onCancel,
  busy          = false,
  title         = "Edit Photo",
  externalError = null,
}) {
  const [imageSrc,   setImageSrc]   = useState(initialImageUrl);
  const [imgSize,    setImgSize]    = useState({ w: 0, h: 0 });
  const [zoom,       setZoom]       = useState(1);
  const [offset,     setOffset]     = useState({ x: 0, y: 0 });
  const [shapeKey,   setShapeKey]   = useState(_initialShapeKey(initialShape));
  const [position,   setPosition]   = useState("top-right");   // [POSITION] default matches current backend
  const [isDragging, setIsDragging] = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [error,      setError]      = useState(null);

  const fileInputRef = useRef(null);
  const dragRef      = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    if (!open) return;
    setImageSrc(initialImageUrl);
    setImgSize({ w: 0, h: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setShapeKey(_initialShapeKey(initialShape));
    setPosition("top-right");   // [POSITION] reset on reopen
    setError(null);
  }, [open, initialImageUrl, initialShape]);

  const fitScale = imgSize.w && imgSize.h
    ? Math.max(VIEWPORT / imgSize.w, VIEWPORT / imgSize.h)
    : 1;

  const onImgLoad  = (e) => {
    setImgSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
    setError(null);
  };
  const onImgError = () => {
    setImageSrc(null);
    setImgSize({ w: 0, h: 0 });
    setError("Could not load the photo — please choose another.");
  };

  const handlePointerDown = (e) => {
    if (!imageSrc || !imgSize.w) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    setIsDragging(true);
    dragRef.current = { x: pt.clientX, y: pt.clientY, ox: offset.x, oy: offset.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => {
      const p = e.touches ? e.touches[0] : e;
      setOffset({
        x: dragRef.current.ox + (p.clientX - dragRef.current.x),
        y: dragRef.current.oy + (p.clientY - dragRef.current.y),
      });
    };
    const up = () => setIsDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [isDragging]);

  const handlePickFile = () => fileInputRef.current?.click();
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please choose an image file"); return; }
    if (f.size > 5 * 1024 * 1024) { setError("Image too large (max 5 MB)"); return; }
    setError(null);
    const r = new FileReader();
    r.onload = (ev) => {
      setImageSrc(ev.target.result);
      setImgSize({ w: 0, h: 0 });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    r.readAsDataURL(f);
  };

  const handleReset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  // ── [FIX] Canvas export with shape clipping applied ───────────────────────
  const handleSave = async () => {
    if (!imageSrc) { setError("No image loaded."); return; }
    if (!imgSize.w || !imgSize.h) { setError("Image still loading — please wait a moment."); return; }

    setExporting(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width  = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");

      const currentShapeObj = SHAPES.find((s) => s.key === shapeKey) || SHAPES[0];
      const backendShape    = currentShapeObj.backend;

      // White background for square; transparent for shaped (PNG supports it)
      if (backendShape === "square") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      }

      const img = new Image();
      await new Promise((res, rej) => {
        img.onload  = res;
        img.onerror = () => rej(new Error("Could not decode image for export"));
        img.src     = imageSrc;
      });

      const totalScale  = fitScale * zoom;
      const exportScale = OUTPUT / VIEWPORT;
      const drawW = img.naturalWidth  * totalScale * exportScale;
      const drawH = img.naturalHeight * totalScale * exportScale;
      const drawX = ((VIEWPORT - img.naturalWidth  * totalScale) / 2 + offset.x) * exportScale;
      const drawY = ((VIEWPORT - img.naturalHeight * totalScale) / 2 + offset.y) * exportScale;

      // Apply shape clip BEFORE drawing — this is the core fix
      ctx.save();
      if (backendShape === "circle") {
        ctx.beginPath();
        ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
        ctx.clip();
      } else if (backendShape === "roundRect") {
        const r = ROUND_RADII[shapeKey] ?? OUTPUT * 0.16;
        _clipRoundRect(ctx, OUTPUT, OUTPUT, r);
        ctx.clip();
      }
      // "square": no clip — full image drawn as-is

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      const blob = await new Promise((r) => canvas.toBlob(r, "image/png", 0.95));
      if (!blob) throw new Error("Canvas export returned no data");

      if (typeof onSave !== "function") throw new Error("onSave handler missing");
      await onSave({ blob, shape: backendShape, position });   // [POSITION] added
    } catch (e) {
      setError(e?.message || "Could not save");
    }
    setExporting(false);
  };

  const currentShape = SHAPES.find((s) => s.key === shapeKey) || SHAPES[0];
  const interactive  = !busy && !exporting;
  const canSave      = !!imageSrc && !!imgSize.w && interactive;
  const displayError = externalError || error;

  // Design tokens — iEvalx blue palette, professional dark
  const BG     = "#0d1117";
  const PANEL  = "#161b22";
  const BORDER = "rgba(255,255,255,0.08)";
  const T1     = "#F1F5EE";
  const T2     = "#8b949e";
  const BLUE   = "#5E815D";
  const BLT    = "#9FB89E";

  return (
    <Dialog
      open={open}
      onClose={interactive ? onCancel : undefined}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 1500 }}
      slotProps={{
        paper: { sx: { bgcolor: BG, color: T1, borderRadius: 2.5, overflow: "hidden", border: `1px solid ${BORDER}` } },
      }}
    >
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        bgcolor: PANEL, py: 1.5, px: 2.5,
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
          background: `linear-gradient(135deg, #022124, ${BLUE})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(94,129,93,.45)",
        }}>
          <Camera size={15} color="#fff" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{
            fontSize: 14, fontWeight: 700, color: T1, lineHeight: 1.2,
            fontFamily: "'Jost',sans-serif",
          }}>{title}</Typography>
          <Typography sx={{ fontSize: 10.5, color: T2, fontFamily: "'Jost',sans-serif" }}>
            Drag to reposition · zoom to fit · pick a frame shape
          </Typography>
        </Box>
        <IconButton onClick={onCancel} disabled={!interactive} size="small"
          sx={{ color: T2, "&:hover": { bgcolor: "rgba(255,255,255,.07)", color: T1 } }}>
          <X size={17} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>

          {/* ── Viewport ─────────────────────────────────────────────────── */}
          <Box sx={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            p: { xs: 3, md: "32px 40px" }, minHeight: 400, bgcolor: "#000",
            background: "radial-gradient(ellipse at 50% 50%, #062C26 0%, #000 75%)",
            gap: 1.5,
          }}>
            {/* Active shape label */}
            <Box sx={{
              px: 1.5, py: 0.375, borderRadius: 99,
              bgcolor: "rgba(94,129,93,.15)", border: `1px solid rgba(94,129,93,.3)`,
            }}>
              <Typography sx={{
                fontSize: 10, fontWeight: 700, color: BLT,
                fontFamily: "'Jost',sans-serif", letterSpacing: ".06em", textTransform: "uppercase",
              }}>
                {currentShape.label} frame
              </Typography>
            </Box>

            {/* Photo viewport */}
            <Box
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              sx={{
                width: VIEWPORT, height: VIEWPORT,
                position: "relative", overflow: "hidden",
                clipPath: currentShape.clip,
                bgcolor: "#101210",
                cursor: imageSrc ? (isDragging ? "grabbing" : "grab") : "pointer",
                userSelect: "none", touchAction: "none",
                transition: "clip-path .22s cubic-bezier(.34,1.56,.64,1)",
                boxShadow: `0 0 0 1px rgba(255,255,255,.06), 0 12px 48px rgba(0,0,0,.7)`,
              }}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Profile"
                  onLoad={onImgLoad}
                  onError={onImgError}
                  draggable={false}
                  style={{
                    position: "absolute", left: "50%", top: "50%",
                    width:  imgSize.w || "auto",
                    height: imgSize.h || "auto",
                    transform: `translate(-50%,-50%) translate(${offset.x}px,${offset.y}px) scale(${fitScale * zoom})`,
                    transformOrigin: "center center",
                    pointerEvents: "none", maxWidth: "none", maxHeight: "none",
                  }}
                />
              ) : (
                <Box onClick={interactive ? handlePickFile : undefined}
                  sx={{
                    width: "100%", height: "100%", display: "flex", alignItems: "center",
                    justifyContent: "center", flexDirection: "column", gap: 1.5,
                    cursor: interactive ? "pointer" : "default",
                    "&:hover .pick-icon": interactive ? { color: "#55584F" } : {},
                  }}>
                  <Box className="pick-icon" sx={{ color: "#3A3D37", transition: "color .15s" }}>
                    <ImageIcon size={40} strokeWidth={1.2} />
                  </Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#4A4E45" }}>Click to choose a photo</Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#3A3D37" }}>PNG · JPG · up to 5 MB</Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* ── Controls ─────────────────────────────────────────────────── */}
          <Box sx={{
            width: { xs: "100%", md: 288 }, bgcolor: PANEL,
            p: 2.5, display: "flex", flexDirection: "column", gap: 2.25,
            borderLeft: { md: `1px solid ${BORDER}` },
          }}>

            {/* Zoom */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                <ZoomOut size={12} color={T2} />
                <Typography sx={{
                  fontSize: 10.5, color: T2, flex: 1, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: ".07em", fontFamily: "'Jost',sans-serif",
                }}>Zoom</Typography>
                <Box sx={{
                  px: 0.875, py: 0.2, borderRadius: 1,
                  bgcolor: "rgba(94,129,93,.12)", border: `1px solid rgba(94,129,93,.25)`,
                }}>
                  <Typography sx={{ fontSize: 11, color: BLT, fontWeight: 700, fontFamily: "'Jost',sans-serif" }}>
                    {zoom.toFixed(1)}×
                  </Typography>
                </Box>
                <ZoomIn size={12} color={T2} />
              </Stack>
              <Slider
                value={zoom} min={MIN_ZOOM} max={MAX_ZOOM} step={0.05}
                onChange={(_, v) => setZoom(Array.isArray(v) ? v[0] : v)}
                disabled={!imageSrc || !interactive}
                sx={{
                  color: BLUE, height: 3, py: 0,
                  "& .MuiSlider-thumb": {
                    width: 14, height: 14, bgcolor: BLT,
                    boxShadow: `0 0 0 3px rgba(94,129,93,.22)`,
                    "&:hover, &.Mui-focusVisible": { boxShadow: `0 0 0 5px rgba(94,129,93,.28)` },
                  },
                  "& .MuiSlider-rail":  { bgcolor: "#3A3D37", opacity: 1 },
                  "& .MuiSlider-track": { border: "none" },
                }}
              />
            </Box>

            <Box sx={{ height: 1, bgcolor: BORDER }} />

            {/* Shape selector */}
            <Box>
              <Typography sx={{
                fontSize: 10.5, color: T2, mb: 1.25, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: ".07em", fontFamily: "'Jost',sans-serif",
              }}>Frame Shape</Typography>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                {SHAPES.map((s) => {
                  const isActive = shapeKey === s.key;
                  return (
                    <Box key={s.key}
                      component="button"
                      onClick={() => interactive && setShapeKey(s.key)}
                      title={s.label}
                      sx={{
                        flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 0.75,
                        border: "none", bgcolor: "transparent",
                        cursor: interactive ? "pointer" : "not-allowed",
                        p: 0, opacity: interactive ? 1 : 0.5,
                      }}>
                      <Box sx={{
                        width: 36, height: 36,
                        background: isActive ? `linear-gradient(135deg, #022124, ${BLUE})` : "#1B1E1A",
                        border: `2px solid ${isActive ? BLT : "#3A3D37"}`,
                        clipPath: s.clip,
                        transition: "all .15s",
                        boxShadow: isActive ? `0 0 0 3px rgba(94,129,93,.22)` : "none",
                      }} />
                      <Typography sx={{
                        fontSize: 8.5, fontWeight: isActive ? 700 : 500,
                        color: isActive ? BLT : "#4A4E45",
                        fontFamily: "'Jost',sans-serif",
                        textTransform: "uppercase", letterSpacing: ".04em",
                        whiteSpace: "nowrap",
                      }}>{s.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ height: 1, bgcolor: BORDER }} />

            {/* ── [POSITION] Photo position selector ─────────────────────── */}
            <Box>
              <Typography sx={{
                fontSize: 10.5, color: T2, mb: 1.25, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: ".07em", fontFamily: "'Jost',sans-serif",
              }}>Photo Position</Typography>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                {POSITIONS.map((p) => {
                  const isActive = position === p.key;
                  return (
                    <Box key={p.key}
                      component="button"
                      onClick={() => interactive && setPosition(p.key)}
                      title={p.label}
                      sx={{
                        flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 0.75,
                        border: "none", bgcolor: "transparent",
                        cursor: interactive ? "pointer" : "not-allowed",
                        p: 0, opacity: interactive ? 1 : 0.5,
                      }}>
                      {/* Mini layout preview — shows where the photo sits in the resume header */}
                      <Box sx={{
                        width: 48, height: 34, borderRadius: 1,
                        background: isActive ? `linear-gradient(135deg, #022124, ${BLUE})` : "#1B1E1A",
                        border: `2px solid ${isActive ? BLT : "#3A3D37"}`,
                        transition: "all .15s",
                        boxShadow: isActive ? `0 0 0 3px rgba(94,129,93,.22)` : "none",
                        display: "flex", alignItems: "flex-start", justifyContent: "flex-start",
                        position: "relative", overflow: "hidden",
                        p: "5px",
                      }}>
                        {/* Photo indicator */}
                        <Box sx={{
                          width: 11, height: 11,
                          borderRadius: p.key === "center-top" ? "50%" : "2px",
                          bgcolor: isActive ? "#fff" : "#4A4E45",
                          position: "absolute",
                          transition: "all .15s",
                          ...(p.key === "top-left"   && { top: 5, left: 5 }),
                          ...(p.key === "top-right"  && { top: 5, right: 5 }),
                          ...(p.key === "center-top" && { top: 4, left: "50%", transform: "translateX(-50%)" }),
                        }} />
                        {/* Text lines indicator */}
                        {p.key !== "center-top" ? (
                          <Box sx={{
                            position: "absolute",
                            display: "flex", flexDirection: "column", gap: "2.5px",
                            ...(p.key === "top-left"  && { top: 6, right: 5 }),
                            ...(p.key === "top-right" && { top: 6, left: 5 }),
                          }}>
                            <Box sx={{ width: 18, height: 2, bgcolor: isActive ? "rgba(255,255,255,.5)" : "#3A3D37", borderRadius: 1 }} />
                            <Box sx={{ width: 13, height: 2, bgcolor: isActive ? "rgba(255,255,255,.3)" : "#20241F", borderRadius: 1 }} />
                          </Box>
                        ) : (
                          <Box sx={{
                            position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "2.5px",
                          }}>
                            <Box sx={{ width: 22, height: 2, bgcolor: isActive ? "rgba(255,255,255,.5)" : "#3A3D37", borderRadius: 1 }} />
                            <Box sx={{ width: 16, height: 2, bgcolor: isActive ? "rgba(255,255,255,.3)" : "#20241F", borderRadius: 1 }} />
                          </Box>
                        )}
                      </Box>
                      <Typography sx={{
                        fontSize: 8.5, fontWeight: isActive ? 700 : 500,
                        color: isActive ? BLT : "#4A4E45",
                        fontFamily: "'Jost',sans-serif",
                        textTransform: "uppercase", letterSpacing: ".04em",
                        whiteSpace: "nowrap",
                      }}>{p.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
            {/* ── [POSITION] End position selector ───────────────────────── */}

            <Box sx={{ height: 1, bgcolor: BORDER }} />

            {/* Tip */}
            {imageSrc && (
              <Box sx={{
                p: 1.25, borderRadius: 1.5,
                bgcolor: "rgba(94,129,93,.07)", border: `1px solid rgba(94,129,93,.16)`,
              }}>
                <Typography sx={{ fontSize: 10.5, color: "#C0D2BF", lineHeight: 1.6, fontFamily: "'Jost',sans-serif" }}>
                  💡 Drag the photo to reposition. The frame shape is baked into the saved PNG — all shapes are fully supported.
                </Typography>
              </Box>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />

            {/* Error */}
            {displayError && (
              <Box sx={{
                px: 1.25, py: 0.875, borderRadius: 1.5,
                bgcolor: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
              }}>
                <Typography sx={{ fontSize: 10.5, color: "#fca5a5", lineHeight: 1.5, fontFamily: "'Jost',sans-serif" }}>
                  ⚠ {displayError}
                </Typography>
              </Box>
            )}

            {/* Actions */}
            <Stack spacing={1} sx={{ mt: "auto" }}>
              <Box component="button" onClick={handleSave} disabled={!canSave}
                sx={{
                  py: 1.25, px: 2, border: "none", borderRadius: 1.5,
                  background: canSave ? `linear-gradient(135deg, #022124, ${BLUE})` : "#1B1E1A",
                  color: canSave ? "#fff" : "#4A4E45",
                  fontWeight: 700, fontSize: 13.5,
                  cursor: canSave ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
                  fontFamily: "'Jost',sans-serif",
                  boxShadow: canSave ? "0 2px 16px rgba(94,129,93,.4)" : "none",
                  transition: "all .15s",
                  "&:hover": canSave ? { filter: "brightness(1.1)", transform: "translateY(-1px)" } : {},
                }}>
                {exporting || busy
                  ? <><SpinnerEl size={13} color="#fff" />Saving…</>
                  : <>✓ Save Photo</>}
              </Box>

              <Box component="button" onClick={handlePickFile} disabled={!interactive}
                sx={{
                  py: 0.875, px: 2, borderRadius: 1.5,
                  border: `1px solid ${BORDER}`, bgcolor: "transparent", color: T2,
                  fontWeight: 600, fontSize: 12.5, cursor: interactive ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 0.875,
                  fontFamily: "'Jost',sans-serif",
                  opacity: interactive ? 1 : 0.4, transition: "all .15s",
                  "&:hover": interactive ? { borderColor: "#4A4E45", color: T1 } : {},
                }}>
                <Upload size={12} />Replace Photo
              </Box>

              <Box component="button" onClick={handleReset} disabled={!imageSrc || !interactive}
                sx={{
                  py: 0.875, px: 2, borderRadius: 1.5,
                  border: `1px solid ${BORDER}`, bgcolor: "transparent", color: T2,
                  fontWeight: 600, fontSize: 12.5,
                  cursor: imageSrc && interactive ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 0.875,
                  fontFamily: "'Jost',sans-serif",
                  opacity: imageSrc && interactive ? 1 : 0.4, transition: "all .15s",
                  "&:hover": imageSrc && interactive ? { borderColor: "#4A4E45", color: T1 } : {},
                }}>
                <RotateCcw size={12} />Reset Position
              </Box>
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}