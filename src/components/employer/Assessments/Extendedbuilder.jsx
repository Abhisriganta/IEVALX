import React from 'react';
import {
  Box, Typography, Button, Stack, TextField, IconButton,
  Tooltip, Select, MenuItem, FormControl, InputLabel, Chip, Alert,
  Card, CardContent, Switch, FormControlLabel, Avatar,
  CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment,
} from '@mui/material';
import {
    Add, Close, Delete, ArrowBack, ContentCopy,
    CheckCircle, InfoOutlined,
    Publish, Link as LinkIcon, BookmarkAdd, BookmarkAdded, Warning, Save,
    Description, MenuBook, Send as SendIcon, AccessTime, Refresh,
    AddPhotoAlternate,
  } from '@mui/icons-material';

import {
  QUESTION_TYPES, SECTION_PRESETS, LANGUAGES, blankQuestion, SUBJECTIVE_TYPES,
} from '../../../hooks/employer/useAssessmentBuilder';
import assessmentService from '../../../services/api/employer/assessmentService';
export const T = {
  navy:        '#7F9E7E',
  navyHover:   '#6C8B6B',
  navyLight:   'rgba(127,158,126,0.10)',
  blue:        '#4B9E9A',
  pageBg:      '#F4F7F2',
  surface:     '#FFFFFF',
  border:      '#E7EAE3',
  borderHover: '#C7D9C5',
  textPrimary: '#022124',
  textSecond:  '#6F7470',
  textMuted:   '#A8ADA8',
  success:     '#6C8B6B',
  successBg:   '#EDF3EC',
  successBdr:  '#C7D9C5',
  warn:        '#C08A5B',
  warnBg:      '#F7EFE6',
  warnBdr:     '#E8D3B8',
  error:       '#C0392B',
  errorBg:     '#F9ECEB',
  errorBdr:    '#E8D0CC',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared field style
// ─────────────────────────────────────────────────────────────────────────────
export const fSx = {
  '& .MuiInputBase-input':            { fontSize: '0.82rem', py: '8px', color: T.textPrimary },
  '& .MuiInputLabel-root':            { fontSize: '0.8rem', color: T.textMuted },
  '& .MuiInputLabel-root.Mui-focused': { color: T.navy },
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    bgcolor: '#F9FAF7',
    '& fieldset':             { borderColor: T.border },
    '&:hover fieldset':       { borderColor: T.borderHover },
    '&.Mui-focused fieldset': { borderColor: T.navy, borderWidth: '1.5px' },
  },
};

export const labelSx = {
  fontSize: '0.65rem', fontWeight: 700, color: T.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.08em',
};

export const STEPS = ['Assessment details', 'Build question pool', 'Distribution & publish'];

// ─────────────────────────────────────────────────────────────────────────────
// Custom step icon — unchanged
// ─────────────────────────────────────────────────────────────────────────────
export const STEP_ICON_LIST = [Description, MenuBook, SendIcon];

export function CustomStepIcon({ active, completed, icon }) {
  const IconComp = STEP_ICON_LIST[Number(icon) - 1] || Description;
  const bg  = active ? T.navy : completed ? T.success : '#EEF2F7';
  const bdr = active ? T.navy : completed ? T.success : '#D1DCE8';
  const clr = active || completed ? '#FFFFFF' : T.textMuted;
  return (
    <Box sx={{
      width: 36, height: 36, borderRadius: '50%',
      bgcolor: bg, border: `2px solid ${bdr}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
    }}>
      <IconComp sx={{ fontSize: 15, color: clr }} />
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE UPLOAD HELPERS — for question stems and options (Option C)
// Stores {key, url}; backend re-signs URLs on every read.
// ─────────────────────────────────────────────────────────────────────────────
function useImageUpload() {
  const [uploading, setUploading] = React.useState(false);
  const upload = React.useCallback(async (file) => {
    setUploading(true);
    try {
      const res = await assessmentService.uploadQuestionImage(file);
      const url = res?.data?.url || res?.data?.image_url || res?.data?.location || null;
      const key = res?.data?.key || res?.data?.s3_key || null;
      if (!url && !key) return null;
      return key ? { key, url } : url;
    } finally {
      setUploading(false);
    }
  }, []);
  return { upload, uploading };
}
function SelfHealingImg({ src, s3Key, alt, sx, fallbackSx }) {
  const [currentSrc, setCurrentSrc] = React.useState(src);
  const [failed, setFailed]         = React.useState(false);
  const triedRefreshRef             = React.useRef(false);

  React.useEffect(() => {
    setCurrentSrc(src);
    setFailed(false);
    triedRefreshRef.current = false;
  }, [src, s3Key]);

  const handleError = async () => {
    if (triedRefreshRef.current || !s3Key) {
      setFailed(true);
      return;
    }
    triedRefreshRef.current = true;
    try {
      const res = await assessmentService.refreshImageUrl(s3Key);
      const fresh = res?.data?.url;
      if (fresh) {
        setCurrentSrc(fresh);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch (err) {
      console.warn('[SelfHealingImg] refresh failed:', err);
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <Box sx={{
        ...sx, ...fallbackSx,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: '#F1F5F9', color: T.textMuted, fontSize: '0.6rem',
      }}>
        <AddPhotoAlternate sx={{ fontSize: 18, opacity: 0.4 }} />
      </Box>
    );
  }

  return <Box component="img" src={currentSrc} alt={alt} onError={handleError} sx={sx} />;
}

// 🔧 NEW — Lightbox dialog for previewing uploaded/pasted images full-size
function ImageLightbox({ open, src, s3Key, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      sx={{ zIndex: 1700 }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            bgcolor: '#022124',
            border: `1px solid ${T.border}`,
            overflow: 'hidden',
            position: 'relative',
          },
        },
      }}
    >
      <IconButton
        size="small"
        onClick={onClose}
        sx={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.82)' },
        }}
      >
        <Close sx={{ fontSize: 18 }} />
      </IconButton>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 2, maxHeight: '85vh', minHeight: 200, minWidth: 320,
      }}>
        <SelfHealingImg
          src={src}
          s3Key={s3Key}
          alt="Preview"
          sx={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>
    </Dialog>
  );
}

function StemImagesEditor({ images, onChange }) {
  const { upload, uploading } = useImageUpload();
  const [preview, setPreview] = React.useState(null); 
  const handlePick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const uploaded = [];
    for (const f of files) {
      try {
        const item = await upload(f);
        if (item) uploaded.push(item);
      } catch (err) {
        console.error('[StemImage] upload failed:', err);
      }
    }
    if (uploaded.length) onChange([...(images || []), ...uploaded]);
  };
  return (
    <Box sx={{ mb: 1.75 }}>
      <Typography sx={{ ...labelSx, mb: 0.75 }}>Stem images (optional)</Typography>
      <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
        {(images || []).map((img, ii) => {
          const src   = typeof img === 'string' ? img : (img?.url || '');
          const s3Key = typeof img === 'object' ? img?.key : null;
          return (
            <Box key={ii}
              onClick={() => { console.log('[Stem thumb click]', { src, s3Key }); setPreview({ src, s3Key }); }}
              sx={{
                position: 'relative', width: 96, height: 96,
                borderRadius: '8px', overflow: 'hidden',
                border: `1px solid ${T.border}`, bgcolor: '#F9FAF7',
                cursor: 'zoom-in',
                transition: 'transform 0.12s, box-shadow 0.12s',
                '&:hover': { transform: 'scale(1.03)', boxShadow: '0 2px 10px rgba(127,158,126,0.18)' },
              }}>
              <SelfHealingImg src={src} s3Key={s3Key} alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <IconButton size="small"
                onClick={(e) => { e.stopPropagation(); onChange((images || []).filter((_, i) => i !== ii)); }}
                sx={{
                  position: 'absolute', top: 2, right: 2,
                  bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', p: '2px',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
                }}>
                <Close sx={{ fontSize: 13 }} />
              </IconButton>
            </Box>
          );
        })}
        <Button
          size="small"
          component="label"
          disabled={uploading}
          startIcon={uploading
            ? <CircularProgress size={12} />
            : <AddPhotoAlternate sx={{ fontSize: 16 }} />}
          sx={{
            textTransform: 'none', fontSize: '0.74rem', borderRadius: '8px',
            border: `1px dashed ${T.borderHover}`, color: T.textSecond,
            px: 1.5, py: 0.75, minHeight: 36,
            '&:hover': { borderColor: T.navy, color: T.navy, bgcolor: T.navyLight },
          }}>
          {uploading ? 'Uploading…' : 'Add image'}
          <input type="file" accept="image/*" multiple hidden onChange={handlePick} />
        </Button>
      </Stack>
      <Typography sx={{ fontSize: '0.66rem', color: T.textMuted, mt: 0.6, lineHeight: 1.5 }}>
        Attach diagrams, charts, figure matrices, or any reference image. Multiple allowed.
        {' '}<Box component="span" sx={{ fontWeight: 600, color: T.textSecond }}>
          Tip: paste (Ctrl+V) anywhere on this card — paste inside an option box to attach to that option. Click any thumbnail to preview full-size.
        </Box>
      </Typography>
      <ImageLightbox
        open={!!preview}
        src={preview?.src}
        s3Key={preview?.s3Key}
        onClose={() => setPreview(null)}
      />
    </Box>
  );
}

function OptionImageSlot({ image, onChange }) {
  const { upload, uploading } = useImageUpload();
  const [preview, setPreview] = React.useState(false); 
  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const item = await upload(file);
      if (item) onChange(item);
    } catch (err) {
      console.error('[OptionImage] upload failed:', err);
    }
  };
  if (image) {
    const src   = typeof image === 'string' ? image : (image?.url || '');
    const s3Key = typeof image === 'object' ? image?.key : null;
    return (
      <>
        <Tooltip title="Click to preview full-size">
          <Box
            onClick={() => { console.log('[Option thumb click]', { src, s3Key }); setPreview(true); }}
            sx={{
              position: 'relative', width: 52, height: 52, flexShrink: 0,
              borderRadius: '6px', overflow: 'hidden',
              border: `1px solid ${T.border}`, bgcolor: '#F9FAF7',
              cursor: 'zoom-in',
              transition: 'transform 0.12s, box-shadow 0.12s',
              '&:hover': { transform: 'scale(1.05)', boxShadow: '0 2px 8px rgba(127,158,126,0.18)' },
            }}>
            <SelfHealingImg src={src} s3Key={s3Key} alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <IconButton size="small"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              sx={{
                position: 'absolute', top: 1, right: 1,
                bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', p: '1px',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.82)' },
              }}>
              <Close sx={{ fontSize: 10 }} />
            </IconButton>
          </Box>
        </Tooltip>
        <ImageLightbox
          open={preview}
          src={src}
          s3Key={s3Key}
          onClose={() => setPreview(false)}
        />
      </>
    );
  }
  return (
    <Tooltip title="Attach image to this option">
      <IconButton
        size="small"
        component="label"
        disabled={uploading}
        sx={{
          width: 32, height: 32, flexShrink: 0,
          border: `1px dashed ${T.borderHover}`, borderRadius: '6px',
          color: T.textMuted,
          '&:hover': { borderColor: T.navy, color: T.navy, bgcolor: T.navyLight },
        }}>
        {uploading
          ? <CircularProgress size={12} />
          : <AddPhotoAlternate sx={{ fontSize: 15 }} />}
        <input type="file" accept="image/*" hidden onChange={handlePick} />
      </IconButton>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION EDITOR — stem + option image support added (Option C)
// ─────────────────────────────────────────────────────────────────────────────
export function QuestionEditor({ question, index, onChange, onRemove, onDuplicate, onSave }) {
  const qCfg = QUESTION_TYPES.find(t => t.value === question.type) || QUESTION_TYPES[0];

 const update = (field, value) => onChange({ ...question, [field]: value, _dirty: true });
 // 🔧 NEW — inline validation state for empty question text / empty options
  const [errors, setErrors] = React.useState({ text: false, options: [] });

  // Auto-clear stem error as user types
  React.useEffect(() => {
    if (errors.text && (question.text || '').trim()) {
      setErrors(prev => ({ ...prev, text: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.text]);

  // Auto-clear option errors as user fills them (text OR image counts)
  React.useEffect(() => {
    if (!errors.options.length) return;
    const stillEmpty = errors.options.filter(oi => {
      const o = question.options[oi];
      if (!o) return false;
      return !(o.text || '').trim() && !o.image;
    });
    if (stillEmpty.length !== errors.options.length) {
      setErrors(prev => ({ ...prev, options: stillEmpty }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.options]);

  // 🔧 Run validation before bubbling Save up to the parent
  const validateAndSave = () => {
    const newErrors = { text: false, options: [] };

    if (!(question.text || '').trim()) {
      newErrors.text = true;
    }

    if (['mcq', 'multi_select'].includes(question.type)) {
      newErrors.options = question.options
        .map((o, i) => (!(o.text || '').trim() && !o.image ? i : -1))
        .filter(i => i !== -1);
    }

    if (newErrors.text || newErrors.options.length) {
      setErrors(newErrors);
      return;
    }

    setErrors({ text: false, options: [] });
    onSave();
  };

  const optionLetters = errors.options.map(i => String.fromCharCode(65 + i)).join(', ');

 
  const [pasting, setPasting] = React.useState(false);

  // Stem paste: pasted images go into stemImages.
  const handleStemPaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(it => it.type && it.type.startsWith('image/'));
    console.log('[Paste stem] items:', items.length, 'images:', imageItems.length);
    if (imageItems.length === 0) return;   // plain text — let it paste normally
    e.preventDefault();
    setPasting(true);
    try {
      const newImages = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        try {
          const res = await assessmentService.uploadQuestionImage(file);
          console.log('[Paste stem] upload response:', res?.data);
          const url = res?.data?.url || res?.data?.image_url || res?.data?.location || null;
          const key = res?.data?.key || res?.data?.s3_key || null;
          if (url || key) newImages.push(key ? { key, url } : url);
        } catch (err) {
          console.error('[Paste stem] upload failed:', err);
        }
      }
      if (newImages.length) {
        console.log('[Paste stem] appending to stemImages:', newImages);
        onChange({
          ...question,
          stemImages: [...(question.stemImages || []), ...newImages],
          _dirty: true,
        });
      }
    } finally {
      setPasting(false);
    }
  };

  // Per-option paste: pasted image goes to that option's image slot.
  const makeOptionPasteHandler = (optIdx) => async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(it => it.type && it.type.startsWith('image/'));
    console.log(`[Paste opt ${optIdx}] items:`, items.length, 'image:', !!imgItem);
    if (!imgItem) return;   // plain text paste — leave alone
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file) return;
    setPasting(true);
    try {
      const res = await assessmentService.uploadQuestionImage(file);
      console.log(`[Paste opt ${optIdx}] upload response:`, res?.data);
      const url = res?.data?.url || res?.data?.image_url || res?.data?.location || null;
      const key = res?.data?.key || res?.data?.s3_key || null;
      if (url || key) {
        const item = key ? { key, url } : url;
        console.log(`[Paste opt ${optIdx}] setting image:`, item);
        onChange({
          ...question,
          options: question.options.map((o, i) => i === optIdx ? { ...o, image: item } : o),
          _dirty: true,
        });
      }
    } catch (err) {
      console.error(`[Paste opt ${optIdx}] upload failed:`, err);
    } finally {
      setPasting(false);
    }
  };

  const updateOption = (optIdx, field, value) => {
    const opts = question.options.map((o, i) => {
      if (field === 'isCorrect' && (question.type === 'mcq' || question.type === 'true_false')) {
        return { ...o, isCorrect: i === optIdx };
      }
      if (i === optIdx) return { ...o, [field]: value };
      return o;
    });
    onChange({ ...question, options: opts, _dirty: true });
  };
  const addOption    = () => onChange({ ...question, options: [...question.options, { text: '', isCorrect: false }], _dirty: true });
  const removeOption = (oi) => onChange({ ...question, options: question.options.filter((_, i) => i !== oi), _dirty: true });

  const updatePair = (pi, side, value) => {
    const pairs = [...question.pairs]; pairs[pi] = { ...pairs[pi], [side]: value };
    onChange({ ...question, pairs, _dirty: true });
  };
  const addPair    = () => onChange({ ...question, pairs: [...question.pairs, { left: '', right: '' }], _dirty: true });
  const removePair = (pi) => onChange({ ...question, pairs: question.pairs.filter((_, i) => i !== pi), _dirty: true });

  const updateItem = (ii, value) => {
    const items = [...question.items]; items[ii] = value;
    onChange({ ...question, items, _dirty: true });
  };
  const addItem    = () => onChange({ ...question, items: [...question.items, ''], _dirty: true });
  const removeItem = (ii) => onChange({ ...question, items: question.items.filter((_, i) => i !== ii), _dirty: true });

  const updateTestCase = (ti, field, value) => {
    const tcs = [...question.testCases]; tcs[ti] = { ...tcs[ti], [field]: value };
    onChange({ ...question, testCases: tcs, _dirty: true });
  };
  const addTestCase    = () => onChange({ ...question, testCases: [...question.testCases, { input: '', expectedOutput: '', isHidden: false, weightage: 1 }], _dirty: true });
  const removeTestCase = (ti) => onChange({ ...question, testCases: question.testCases.filter((_, i) => i !== ti), _dirty: true });

  return (
    <Card elevation={0} sx={{
      border: `1px solid ${T.border}`,
      borderLeft: `4px solid ${qCfg.color}`,
      borderRadius: '10px',
      bgcolor: T.surface,
      position: 'relative',
      transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      '&:hover': { boxShadow: '0 2px 14px rgba(127,158,126,0.08)', borderColor: T.borderHover },
    }}>
      {/* 🔧 NEW — paste-uploading overlay */}
      {pasting && (
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          bgcolor: 'rgba(127,158,126,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, borderRadius: '10px', pointerEvents: 'none',
        }}>
          <Box sx={{
            bgcolor: T.surface, border: `1px solid ${T.navy}30`,
            borderRadius: '8px', px: 2, py: 1,
            display: 'flex', alignItems: 'center', gap: 1,
            boxShadow: '0 4px 14px rgba(127,158,126,0.12)',
          }}>
            <CircularProgress size={14} sx={{ color: T.navy }} />
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.navy }}>
              Uploading pasted image…
            </Typography>
          </Box>
        </Box>
      )}
      <CardContent sx={{ p: { xs: '16px', sm: '20px' }, '&:last-child': { pb: { xs: '16px', sm: '20px' } } }}>

        {/* ── Header row ── */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.75, gap: '8px' }}>

          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
            <Box sx={{
              width: 26, height: 26, borderRadius: '6px',
              bgcolor: qCfg.color + '15', border: `1px solid ${qCfg.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: qCfg.color }}>
                {index + 1}
              </Typography>
            </Box>
          </Stack>

          <FormControl size="small" sx={{ minWidth: 170, flexShrink: 0 }}>
            <InputLabel sx={{ fontSize: '0.78rem' }}>Question type</InputLabel>
            <Select
              value={question.type} label="Question type"
              onChange={e => {
                const newQ = blankQuestion(e.target.value);
                onChange({ ...newQ, id: question.id, text: question.text, points: question.points });
              }}
              MenuProps={{
                disableScrollLock: true,
                sx: { zIndex: 1500, '& .MuiPaper-root': { mt: '4px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', maxHeight: 360 } },
              }}
              sx={{ fontSize: '0.78rem', borderRadius: '8px' }}
            >
              {QUESTION_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value} sx={{ fontSize: '0.78rem' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: t.color, flexShrink: 0 }} />
                    <span>{t.label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

           <TextField
            size="small" type="number" label="Points"
            value={question.points}
            onChange={e => update('points', Math.max(0, parseFloat(e.target.value) || 0))}
            sx={{
              width: 80, flexShrink: 0, ...fSx,
              '& .MuiOutlinedInput-root': { ...fSx['& .MuiOutlinedInput-root'], height: 34 },
            }}
            slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, height: 34 }}>
            {question._saving && (
              <CircularProgress size={14} sx={{ color: T.blue }} />
            )}
            {!question._dirty && question._savedId && (
              <Tooltip title="Saved">
                <CheckCircle sx={{ fontSize: 18, color: T.success }} />
              </Tooltip>
            )}
            {question._dirty && !question._saving && (
  <Tooltip title="Save this question">
    <Button size="small" onClick={validateAndSave} sx={{
                  textTransform: 'none', fontSize: '0.72rem', borderRadius: '7px',
                  minWidth: 0, px: 1.5, height: 30,
                  border: `1px solid ${T.border}`, color: T.textSecond, bgcolor: '#F8FAFC',
                  '&:hover': { bgcolor: T.navyLight, borderColor: T.navy, color: T.navy },
                }}>
                  Save
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Duplicate">
              <IconButton size="small" onClick={onDuplicate}
                sx={{ width: 30, height: 30, color: T.textMuted, '&:hover': { color: T.navy, bgcolor: T.navyLight } }}>
                <ContentCopy sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete question">
              <IconButton size="small" onClick={onRemove}
                sx={{ width: 30, height: 30, color: T.error, '&:hover': { color: T.error, bgcolor: T.errorBg } }}>
                <Delete sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>

        <Divider sx={{ mb: 1.75, borderColor: T.border }} />

        {/* 🔧 NEW — inline validation banner */}
        {(errors.text || errors.options.length > 0) && (
          <Box sx={{
            mb: 1.75, p: '10px 12px',
            bgcolor: T.errorBg, border: `1px solid ${T.errorBdr}`,
            borderRadius: '8px',
            display: 'flex', alignItems: 'flex-start', gap: 1,
          }}>
            <Warning sx={{ fontSize: 16, color: T.error, mt: '1px', flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.error, mb: 0.25 }}>
                Can't save yet — please fix the following:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.25, '& li': { fontSize: '0.74rem', color: '#7F1D1D', lineHeight: 1.55 } }}>
                {errors.text && <li>Question text is empty — type your question below.</li>}
                {errors.options.length > 0 && (
                  <li>
                    Option{errors.options.length > 1 ? 's' : ''} {optionLetters}{' '}
                    {errors.options.length > 1 ? 'are' : 'is'} empty — add text or attach an image.
                  </li>
                )}
              </Box>
            </Box>
          </Box>
        )}

        <TextField
          fullWidth multiline
          minRows={question.type === 'coding' ? 12 : 2}
          maxRows={question.type === 'coding' ? 40 : 6}
          size="small"
          placeholder={question.type === 'coding'
            ? 'Enter the full problem statement — Problem, Input Format, Output Format, Sample Input, Sample Output, Constraints…'
            : 'Enter your question here… (Ctrl+V to paste an image as a stem image)'}
          value={question.text}
          onChange={e => update('text', e.target.value)}
          onPaste={handleStemPaste}
          error={!!errors.text}
          helperText={errors.text ? 'Please enter the question text before saving.' : ''}
          sx={{
            mb: 1.75, ...fSx,
            '& .MuiInputBase-input': { fontSize: '0.85rem', py: '8px' },
            '& .MuiFormHelperText-root': { fontSize: '0.7rem', ml: '2px', mt: '4px' },
          }}
        />

        {/* ── Stem images (Option C) ── */}
        <StemImagesEditor
          images={question.stemImages || []}
          onChange={imgs => update('stemImages', imgs)}
        />

        {/* ── MCQ / Multi-select ── */}
        {['mcq', 'multi_select'].includes(question.type) && (
          <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ ...labelSx, mb: 1 }}>
              Options {question.type === 'mcq' ? '— select one correct' : '— select all correct'}
            </Typography>
            <Stack spacing={0.75}>
              {question.options.map((opt, oi) => {
                const isErrored = errors.options.includes(oi);
                return (
                  <Stack key={oi} direction="row" spacing={0.75} alignItems="center">
                    <Box
                      onClick={() => updateOption(oi, 'isCorrect', question.type === 'mcq' ? true : !opt.isCorrect)}
                      sx={{
                        width: 20, height: 20, flexShrink: 0, cursor: 'pointer',
                        borderRadius: question.type === 'mcq' ? '50%' : '4px',
                        border: opt.isCorrect ? `2px solid ${T.success}` : `2px solid ${T.border}`,
                        bgcolor: opt.isCorrect ? T.successBg : T.surface,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                      }}
                    >
                      {opt.isCorrect && <CheckCircle sx={{ fontSize: 13, color: T.success }} />}
                    </Box>
                    <TextField
                      size="small" fullWidth
                      placeholder={`Option ${String.fromCharCode(65 + oi)} — type text or paste (Ctrl+V) an image`}
                      value={opt.text}
                      onChange={e => updateOption(oi, 'text', e.target.value)}
                      onPaste={makeOptionPasteHandler(oi)}
                      error={isErrored}
                      sx={fSx}
                    />
                    <OptionImageSlot
                      image={opt.image || null}
                      onChange={img => updateOption(oi, 'image', img)}
                    />
                    {question.options.length > 2 && (
                      <IconButton size="small" onClick={() => removeOption(oi)}
                        sx={{ color: T.textMuted, '&:hover': { color: T.error } }}>
                        <Close sx={{ fontSize: 13 }} />
                      </IconButton>
                    )}
                  </Stack>
                );
              })}
            </Stack>
            {question.options.length < 8 && (
              <Button size="small" startIcon={<Add sx={{ fontSize: 13 }} />} onClick={addOption}
                sx={{ mt: 1, textTransform: 'none', fontSize: '0.72rem', color: T.textSecond,
                  '&:hover': { color: T.navy } }}>
                Add option
              </Button>
            )}
          </Box>
        )}

        {/* ── True / False ── */}
        {question.type === 'true_false' && (
          <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ ...labelSx, mb: 1 }}>Correct answer</Typography>
            <Stack direction="row" spacing={1}>
              {question.options.map((opt, oi) => (
                <Button key={oi}
                  variant={opt.isCorrect ? 'contained' : 'outlined'} size="small"
                  onClick={() => updateOption(oi, 'isCorrect', true)}
                  sx={{
                    textTransform: 'none', borderRadius: '8px', fontSize: '0.8rem', px: 2.5,
                    ...(opt.isCorrect
                      ? { bgcolor: T.success, boxShadow: 'none', '&:hover': { bgcolor: '#166534' } }
                      : { borderColor: T.border, color: T.textSecond, '&:hover': { borderColor: T.success, color: T.success } }),
                  }}>
                  {opt.text}
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* ── Fill in the blank ── */}
        {question.type === 'fill_blank' && (
          <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ ...labelSx, mb: 1 }}>Expected answer</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" fullWidth placeholder="The correct answer"
                value={question.expectedAnswer} onChange={e => update('expectedAnswer', e.target.value)} sx={fSx} />
              <FormControlLabel
                control={<Switch size="small" checked={question.caseSensitive} onChange={e => update('caseSensitive', e.target.checked)} />}
                label={<Typography sx={{ fontSize: '0.72rem', color: T.textSecond }}>Case sensitive</Typography>}
                sx={{ flexShrink: 0, ml: 0.5 }}
              />
            </Stack>
          </Box>
        )}

        {/* ── Match following ── */}
        {question.type === 'match' && (
          <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ ...labelSx, mb: 1 }}>Matching pairs — left → right</Typography>
            <Stack spacing={0.75}>
              {question.pairs.map((p, pi) => (
                <Stack key={pi} direction="row" spacing={0.75} alignItems="center">
                  <Chip label={pi + 1} size="small" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#E8F4F3', color: '#4B9E9A', flexShrink: 0 }} />
                  <TextField size="small" fullWidth placeholder={`Left item ${pi + 1}`} value={p.left} onChange={e => updatePair(pi, 'left', e.target.value)} sx={fSx} />
                  <LinkIcon sx={{ fontSize: 15, color: T.textMuted, flexShrink: 0 }} />
                  <TextField size="small" fullWidth placeholder={`Right item ${pi + 1}`} value={p.right} onChange={e => updatePair(pi, 'right', e.target.value)} sx={fSx} />
                  {question.pairs.length > 2 && (
                    <IconButton size="small" onClick={() => removePair(pi)}
                      sx={{ color: T.textMuted, '&:hover': { color: T.error } }}>
                      <Close sx={{ fontSize: 13 }} />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>
            <Button size="small" startIcon={<Add sx={{ fontSize: 13 }} />} onClick={addPair}
              sx={{ mt: 1, textTransform: 'none', fontSize: '0.72rem', color: T.textSecond }}>
              Add pair
            </Button>
          </Box>
        )}

        {/* ── Sequencing ── */}
        {question.type === 'sequence' && (
          <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ ...labelSx, mb: 1 }}>Items in correct order — top = first</Typography>
            <Stack spacing={0.75}>
              {question.items.map((item, ii) => (
                <Stack key={ii} direction="row" spacing={0.75} alignItems="center">
                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.62rem', fontWeight: 700, bgcolor: T.warnBg, color: T.warn, border: `1px solid ${T.warnBdr}`, flexShrink: 0 }}>
                    {ii + 1}
                  </Avatar>
                  <TextField size="small" fullWidth placeholder={`Step ${ii + 1}`} value={item} onChange={e => updateItem(ii, e.target.value)} sx={fSx} />
                  {question.items.length > 2 && (
                    <IconButton size="small" onClick={() => removeItem(ii)}
                      sx={{ color: T.textMuted, '&:hover': { color: T.error } }}>
                      <Close sx={{ fontSize: 13 }} />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>
            <Button size="small" startIcon={<Add sx={{ fontSize: 13 }} />} onClick={addItem}
              sx={{ mt: 1, textTransform: 'none', fontSize: '0.72rem', color: T.textSecond }}>
              Add step
            </Button>
          </Box>
        )}
        {/* ── Custom type name ── */}
        {question.type === 'custom' && (
          <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Typography sx={{ ...labelSx, mb: 1 }}>Custom question type name</Typography>
            <TextField size="small" fullWidth placeholder="e.g. Diagram, Essay, Whiteboard…"
              value={question.customType || ''}
              onChange={e => update('customType', e.target.value)}
              sx={fSx} />
          </Box>
        )}

        {/* ── Coding — starter code + visible/hidden test cases ── */}
        {question.type === 'coding' && (
          <Box sx={{ mt: 1.5 }}>

            {/* Starter code / stub — hidden for SQL (candidate writes their
                SELECT against a pre-loaded schema, no stub needed). */}
            {question.language !== 'sql' && (
              <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}`, mb: 1.5 }}>
                <Typography sx={{ ...labelSx, mb: 1 }}>Starter code / stub (optional)</Typography>
                <TextField
                  fullWidth multiline minRows={3} maxRows={14} size="small"
                  placeholder={'# Shown to candidate as starting code\ndef solve():\n    pass'}
                  value={question.codeSnippet || ''}
                  onChange={e => update('codeSnippet', e.target.value)}
                  sx={{ ...fSx, '& .MuiInputBase-input': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.78rem', lineHeight: 1.55 } }}
                />
              </Box>
            )}

            {question.language === 'sql' && (
              <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}`, mb: 1.5 }}>
                <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ ...labelSx }}>SQL sandbox setup</Typography>
                  <Box sx={{ flex: 1 }} />
                  <FormControlLabel
                    control={<Switch size="small"
                      checked={!!question.sqlOrderSensitive}
                      onChange={e => update('sqlOrderSensitive', e.target.checked)} />}
                    label={<Typography sx={{ fontSize: '0.7rem', color: T.textSecond }}>Row order matters (e.g. ORDER BY)</Typography>}
                    sx={{ mr: 0 }}
                  />
                </Stack>

                <Typography sx={{ ...labelSx, mb: 0.5 }}>Schema DDL <Typography component="span" sx={{ color: T.error, fontSize: '0.68rem' }}>(required)</Typography></Typography>
                <TextField
                  fullWidth multiline minRows={3} maxRows={10} size="small"
                  placeholder={'CREATE TABLE employees (\n    id   INT PRIMARY KEY,\n    name VARCHAR(60),\n    salary INT\n);'}
                  value={question.sqlSchemaDdl || ''}
                  onChange={e => update('sqlSchemaDdl', e.target.value)}
                  sx={{ ...fSx, mb: 1.5, '& .MuiInputBase-input': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.78rem', lineHeight: 1.55 } }}
                />

                <Typography sx={{ ...labelSx, mb: 0.5 }}>Seed data (optional)</Typography>
                <TextField
                  fullWidth multiline minRows={3} maxRows={10} size="small"
                  placeholder={"INSERT INTO employees VALUES\n    (1, 'Asha', 90000),\n    (2, 'Ravi', 65000);"}
                  value={question.sqlSeedData || ''}
                  onChange={e => update('sqlSeedData', e.target.value)}
                  sx={{ ...fSx, mb: 1.5, '& .MuiInputBase-input': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.78rem', lineHeight: 1.55 } }}
                />

                <Typography sx={{ ...labelSx, mb: 0.5 }}>Expected result-set query <Typography component="span" sx={{ color: T.error, fontSize: '0.68rem' }}>(required)</Typography></Typography>
                <TextField
                  fullWidth multiline minRows={2} maxRows={8} size="small"
                  placeholder={'-- The recruiter\'s "answer key" SELECT against the same schema/seed.\nSELECT name FROM employees WHERE salary >= 80000;'}
                  value={question.sqlExpectedResultset || ''}
                  onChange={e => update('sqlExpectedResultset', e.target.value)}
                  sx={{ ...fSx, '& .MuiInputBase-input': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.78rem', lineHeight: 1.55 } }}
                />

                <Alert severity="info" icon={false}
                  sx={{ mt: 1.25, py: 0.5, fontSize: '0.7rem',
                        bgcolor: '#EFF6FF', border: '1px solid #BFDBFE',
                        color: T.textSecond }}>
                  The candidate's query runs inside an ephemeral schema. Only{' '}
                  <strong>SELECT</strong> / <strong>WITH</strong> queries are
                  allowed — the backend rejects DDL, DCL, and multi-statement
                  submissions automatically.
                </Alert>
              </Box>
            )}

            {/* Test cases — only for non-SQL coding languages. SQL uses the
                schema+seed+expected pipeline instead of per-case inputs. */}
            {question.language !== 'sql' && (
            <Box sx={{ p: 1.5, bgcolor: '#F9FAF7', borderRadius: '8px', border: `1px solid ${T.border}` }}>
              <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ ...labelSx }}>Test cases</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: '0.66rem', color: T.textMuted }}>
                  Visible = shown to candidate · Hidden = scoring only
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {(question.testCases || []).map((tc, ti) => {
                  const hidden = !!tc.isHidden;
                  return (
                    <Box key={ti} sx={{
                      p: 1.25, borderRadius: '8px',
                      border: `1px solid ${hidden ? T.warnBdr : T.border}`,
                      bgcolor: hidden ? T.warnBg : T.surface,
                    }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          label={`${hidden ? 'Hidden' : 'Visible'} · TC ${ti + 1}`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700,
                                bgcolor: hidden ? '#F7EFE6' : '#E8F4F3',
                                color: hidden ? '#C08A5B' : '#4B9E9A' }}
                        />
                        <Box sx={{ flex: 1 }} />
                        <FormControlLabel
                          control={<Switch size="small" checked={hidden}
                            onChange={e => updateTestCase(ti, 'isHidden', e.target.checked)} />}
                          label={<Typography sx={{ fontSize: '0.7rem', color: T.textSecond }}>Hidden</Typography>}
                          sx={{ mr: 0.5 }}
                        />
                        <TextField
                          size="small" type="number" label="Weight"
                          value={tc.weightage ?? 1}
                          onChange={e => updateTestCase(ti, 'weightage', Math.max(0, parseFloat(e.target.value) || 0))}
                          sx={{ width: 78, ...fSx }}
                          slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                        />
                        {question.testCases.length > 1 && (
                          <IconButton size="small" onClick={() => removeTestCase(ti)}
                            sx={{ color: T.textMuted, '&:hover': { color: T.error } }}>
                            <Close sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Stack>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField
                          fullWidth multiline minRows={2} maxRows={8} size="small" label="Input"
                          value={tc.input || ''}
                          onChange={e => updateTestCase(ti, 'input', e.target.value)}
                          sx={{ ...fSx, '& .MuiInputBase-input': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.76rem' } }}
                        />
                        <TextField
                          fullWidth multiline minRows={2} maxRows={8} size="small" label="Expected output"
                          value={tc.expectedOutput || ''}
                          onChange={e => updateTestCase(ti, 'expectedOutput', e.target.value)}
                          sx={{ ...fSx, '& .MuiInputBase-input': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.76rem' } }}
                        />
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>

              <Button size="small" startIcon={<Add sx={{ fontSize: 13 }} />} onClick={addTestCase}
                sx={{ mt: 1, textTransform: 'none', fontSize: '0.72rem', color: T.textSecond, '&:hover': { color: T.navy } }}>
                Add test case
              </Button>
            </Box>
            )}
          </Box>
        )}

        {/* ── Subjective note ── */}
        {SUBJECTIVE_TYPES.has(question.type) && question.type !== 'coding' && (
          <Box sx={{ mt: 1.5, p: '10px 14px', bgcolor: T.warnBg, border: `1px solid ${T.warnBdr}`, borderRadius: '8px' }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#78350F' }}>
              ⚠ Subjective — stored and flagged for manual evaluation after submission.
            </Typography>
          </Box>
        )}

      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTION STEP — completely unchanged
// ─────────────────────────────────────────────────────────────────────────────
export function SectionDistributionStep({
  sections,
  computeSectionPoolCounts,
  setSectionQuestionCount,
  setSectionDist,
  setSectionDuration,                
  handleSaveSectionConfig,
  handleValidateSection,
  handleSaveAndValidateAllSections,
  allSectionsReady,
  validating,
  valResult,
  publishing,
  handlePublish,
  onBack,
  passPercentage,
  setPassPercentage,
  savePassPercentage,
  totalPoints,
}) {
  const sectionMinutesSum = sections.reduce(
    (sum, s) => sum + (parseInt(s.durationMinutes) || 0), 0
  );
  const anySectionHasDuration = sectionMinutesSum > 0;

  const totalMarksAcrossSections = (typeof totalPoints === 'number' && totalPoints > 0)
    ? totalPoints
    : sections.reduce(
        (sum, s) => sum + (s.questions || []).reduce(
          (qs, q) => qs + (Number(q?.points) || 0), 0,
        ), 0,
      );


  const _passErr = (() => {
    if (passPercentage === '' || passPercentage === null || passPercentage === undefined) return '';
    const n = Number(passPercentage);
    if (Number.isNaN(n)) return 'Enter a number between 0 and 100.';
    if (n < 0 || n > 100) return 'Must be between 0 and 100.';
    return '';
  })();

  return (
    <Box>

      {typeof setPassPercentage === 'function' && (
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${T.border}`,
            borderLeft: `4px solid ${T.brand}`,
            borderRadius: '10px',
            mb: 2,
            background: '#F8FAFC',
          }}
        >
          <CardContent>
            <Stack direction="row" spacing={3} alignItems="flex-start" flexWrap="wrap">
              <Box sx={{ minWidth: 200 }}>
                <Typography sx={labelSx}>Total Marks (auto)</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: T.text }}>
                  {Number(totalMarksAcrossSections || 0).toFixed(2)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: T.textDim, mt: 0.5 }}>
                  Sum of marks across every question in every section.
                </Typography>
              </Box>
              <Box sx={{ minWidth: 220 }}>
                <Typography sx={labelSx}>Pass Percentage</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={passPercentage ?? ''}
                  onChange={(e) => setPassPercentage(e.target.value)}
                  onBlur={() => typeof savePassPercentage === 'function' && savePassPercentage()}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  placeholder="e.g. 60"
                  error={Boolean(_passErr)}
                  helperText={
                    _passErr
                      || 'Candidate percentage must be ≥ this to PASS.'
                  }
                  sx={fSx}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Per-section panels — one card per section */}
      {sections.map((sec, si) => {
        const pool       = computeSectionPoolCounts(sec);
        const poolTotal  = Object.values(pool).reduce((s, v) => s + v, 0);
        const activeTypes = Object.keys(pool).filter(t => pool[t] > 0);
        const distTotal  = Object.values(sec.distribution || {})
                            .reduce((s, v) => s + (parseInt(v) || 0), 0);
        const targetCount = sec.questionCount || 0;
        const sumMatch    = targetCount > 0 && distTotal === targetCount;
 
        const preset = SECTION_PRESETS.find(p => p.value === sec.type) || SECTION_PRESETS[0];
 
        return (
          <Card
            key={sec.id}
            elevation={0}
            sx={{
              border: `1px solid ${T.border}`,
              borderLeft: `4px solid ${preset.color}`,
              borderRadius: '10px',
              mb: 2,
            }}
          >
            <CardContent sx={{ p: '20px', '&:last-child': { pb: '20px' } }}>
 
              {/* Section header */}
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: preset.color, flexShrink: 0 }} />
                <Typography sx={{ flex: 1, fontSize: '0.95rem', fontWeight: 700, color: T.textPrimary }}>
                  {sec.title || 'Untitled Section'}
                </Typography>
                <Chip
                  label={`${poolTotal} in pool`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#E8F4F3', color: '#4B9E9A' }}
                />
                {sec._validated && (
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: 11 }} />}
                    label="Validated"
                    size="small"
                    sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: T.successBg, color: T.success, '& .MuiChip-icon': { color: T.success, ml: '4px' } }}
                  />
                )}
              </Stack>
 
              {/* No questions in pool warning */}
              {poolTotal === 0 ? (
                <Alert
                  severity="warning"
                  sx={{ fontSize: '0.78rem', borderRadius: '8px' }}
                  icon={<Warning sx={{ fontSize: 18 }} />}
                >
                  This section has no saved questions yet. Go back to Step 2 and add some.
                </Alert>
              ) : (
                <>
                  {/* Question count + Section duration inputs */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                    sx={{ mb: 2, flexWrap: 'wrap' }}
                  >
                    <TextField
                      size="small"
                      type="number"
                      label="Question count"
                      value={sec.questionCount || ''}
                      onChange={e => setSectionQuestionCount(si, e.target.value)}
                      slotProps={{ htmlInput: { min: 1, max: poolTotal } }}
                      sx={{ width: 160, flexShrink: 0, ...fSx }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Section duration (min) *"
                      value={sec.durationMinutes || ''}
                      onChange={e => setSectionDuration(si, e.target.value)}
                      placeholder="e.g. 20"
                      error={!sec.durationMinutes || sec.durationMinutes <= 0}
                      helperText={
                        (!sec.durationMinutes || sec.durationMinutes <= 0)
                          ? 'Required — must be > 0'
                          : ''
                      }
                      slotProps={{
                        htmlInput: { min: 1 },
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccessTime sx={{ fontSize: 14, color: T.textMuted }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ width: 200, flexShrink: 0, ...fSx }}
                    />
                  </Stack>
 
                  {/* Per-type distribution table */}
                  <Typography sx={{ ...labelSx, mb: 1 }}>Per-type distribution</Typography>
 
                  <Box sx={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 90px',
                    gap: '10px', px: '10px', pb: '8px',
                    borderBottom: `2px solid ${T.border}`,
                  }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Question type
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
                      In pool
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
                      Request
                    </Typography>
                  </Box>
 
                  {activeTypes.map((type, rowIdx) => {
                    const cfg     = QUESTION_TYPES.find(t => t.value === type) || QUESTION_TYPES[0];
                    const avail   = pool[type] || 0;
                    const req     = parseInt(sec.distribution?.[type]) || 0;
                    const overflow = req > avail;
                    return (
                      <Box key={type} sx={{
                        display: 'grid', gridTemplateColumns: '1fr 80px 90px',
                        gap: '10px', alignItems: 'center',
                        px: '10px', py: '10px',
                        bgcolor: rowIdx % 2 === 0 ? T.surface : '#FAFBFD',
                        borderBottom: `1px solid ${T.border}`,
                        '&:last-of-type': { borderBottom: 'none' },
                      }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.78rem', color: T.textPrimary, fontWeight: 500 }}>
                            {cfg.label}
                          </Typography>
                          {SUBJECTIVE_TYPES.has(type) && (
                            <Chip label="manual" size="small" sx={{ height: 16, fontSize: '0.52rem', bgcolor: T.warnBg, color: '#C08A5B' }} />
                          )}
                        </Stack>
 
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.textSecond, textAlign: 'center' }}>
                          {avail}
                        </Typography>
 
                        <TextField
                          size="small" type="number"
                          value={sec.distribution?.[type] ?? ''}
                          onChange={e => setSectionDist(si, type, e.target.value)}
                          slotProps={{ htmlInput: { min: 0, max: avail } }}
                          sx={{
                            ...fSx,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '7px', bgcolor: T.surface,
                              '& fieldset': { borderColor: overflow ? T.error : T.border },
                              '&:hover fieldset': { borderColor: overflow ? T.error : T.borderHover },
                              '&.Mui-focused fieldset': { borderColor: overflow ? T.error : T.navy, borderWidth: '1.5px' },
                            },
                            '& .MuiInputBase-input': { textAlign: 'center', fontSize: '0.78rem', py: '7px', color: overflow ? T.error : T.textPrimary },
                          }}
                        />
                      </Box>
                    );
                  })}
 
                  {/* Sum indicator */}
                  <Box sx={{
                    mt: 1.25, pt: 1.25, borderTop: `1px solid ${T.border}`,
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5,
                  }}>
                    <Typography sx={{ fontSize: '0.74rem', color: T.textSecond, fontWeight: 500 }}>
                      Total:
                    </Typography>
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.5,
                      px: 1.25, py: 0.4, borderRadius: '6px',
                      bgcolor: sumMatch ? T.successBg : T.errorBg,
                      border: `1px solid ${sumMatch ? T.successBdr : T.errorBdr}`,
                    }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: sumMatch ? T.success : T.error }}>
                        {distTotal} / {targetCount || 0}
                      </Typography>
                      {sumMatch
                        ? <CheckCircle sx={{ fontSize: 13, color: T.success }} />
                        : <Warning sx={{ fontSize: 13, color: T.error }} />}
                    </Box>
                  </Box>
 
                  {/* Per-section validation errors */}
                  {sec._validationErrors?.length > 0 && (
                    <Alert
                      severity="error"
                      sx={{ mt: 1.5, fontSize: '0.74rem', borderRadius: '8px' }}
                      icon={<Warning sx={{ fontSize: 16 }} />}
                    >
                      <Typography sx={{ fontSize: '0.74rem', fontWeight: 600 }}>Validation failed:</Typography>
                      {sec._validationErrors.map((e, i) => (
                        <Typography key={i} sx={{ fontSize: '0.7rem', mt: 0.25 }}>• {e}</Typography>
                      ))}
                    </Alert>
                  )}
 
                  {/* Save + Validate buttons */}
                  <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
                    <Button
                      variant="outlined" size="small"
                      onClick={() => handleSaveSectionConfig(si)}
                      disabled={sec._savingConfig || !targetCount || distTotal !== targetCount}
                      startIcon={sec._savingConfig ? <CircularProgress size={12} /> : <Save sx={{ fontSize: 14 }} />}
                      sx={{
                        textTransform: 'none', borderRadius: '7px', fontSize: '0.74rem',
                        borderColor: T.border, color: T.textSecond,
                        '&:hover': { borderColor: T.navy, color: T.navy, bgcolor: T.navyLight },
                        '&.Mui-disabled': { borderColor: T.border, color: T.textMuted },
                      }}>
                      {sec._savingConfig ? 'Saving…' : sec._configSaved ? 'Saved ✓' : 'Save section'}
                    </Button>
 
                    <Button
                      variant="outlined" size="small"
                      onClick={() => handleValidateSection(si)}
                      disabled={sec._validatingSec || !sec._configSaved}
                      startIcon={sec._validatingSec ? <CircularProgress size={12} /> : <CheckCircle sx={{ fontSize: 14 }} />}
                      sx={{
                        textTransform: 'none', borderRadius: '7px', fontSize: '0.74rem',
                        borderColor: T.blue + '60', color: T.blue,
                        '&:hover': { borderColor: T.blue, bgcolor: '#EFF6FF' },
                        '&.Mui-disabled': { borderColor: T.border, color: T.textMuted },
                      }}>
                      {sec._validatingSec ? 'Validating…' : 'Validate'}
                    </Button>
                  </Stack>
                </>
              )}
 
            </CardContent>
          </Card>
        );
      })}
 
      {/* 🔧 Section time total info card (no overall ceiling — informational only) */}
      {anySectionHasDuration && (
        <Card
          elevation={0}
          sx={{
            mb: 2,
            border: `1px solid ${T.successBdr}`,
            borderRadius: '10px',
            bgcolor: T.successBg,
          }}
        >
          <CardContent sx={{ p: '14px 18px', '&:last-child': { pb: '14px' } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
              <AccessTime sx={{ fontSize: 18, color: T.success }} />
              <Typography sx={{
                fontSize: '0.82rem', fontWeight: 700, color: T.success,
              }}>
                Total assessment time: {sectionMinutesSum} min
              </Typography>
              <CheckCircle sx={{ fontSize: 16, color: T.success }} />
              <Box sx={{ flex: 1 }} />
              <Typography sx={{
                fontSize: '0.7rem', color: T.textSecond, lineHeight: 1.5,
              }}>
                Each section runs its own countdown. Unused time from the final section becomes the candidate's review-phase budget.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Assessment-level validation result (after all-sections validate) */}
      {valResult && (
        <Alert
          severity={valResult.valid ? 'success' : 'error'}
          sx={{ mb: 2, fontSize: '0.78rem', borderRadius: '10px' }}
          icon={valResult.valid ? <CheckCircle sx={{ fontSize: 18 }} /> : <Warning sx={{ fontSize: 18 }} />}
        >
          {valResult.valid ? 'All sections validated — ready to publish.' : (
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>Assessment-level validation failed:</Typography>
              {(valResult.errors || []).map((e, i) => (
                <Typography key={i} sx={{ fontSize: '0.74rem', mt: 0.3 }}>• {e}</Typography>
              ))}
            </Box>
          )}
        </Alert>
      )}
 
      {/* Footer: Back / Save-Validate-All / Publish */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 1,
        pt: 1.5, borderTop: `1px solid ${T.border}`,
      }}>
        <Button onClick={onBack} startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
          sx={{ textTransform: 'none', color: T.textSecond, fontSize: '0.82rem', borderRadius: '8px', '&:hover': { bgcolor: T.pageBg } }}>
          Back to questions
        </Button>
 
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined" size="small"
            onClick={handleSaveAndValidateAllSections}
            disabled={validating}
            startIcon={validating ? <CircularProgress size={13} /> : <CheckCircle sx={{ fontSize: 15 }} />}
            sx={{
              textTransform: 'none', borderRadius: '8px', fontSize: '0.8rem',
              borderColor: T.blue + '60', color: T.blue,
              '&:hover': { borderColor: T.blue, bgcolor: '#EFF6FF' },
              '&.Mui-disabled': { borderColor: T.border, color: T.textMuted },
            }}>
            {validating ? 'Validating all…' : 'Save & validate all sections'}
          </Button>
 
          <Button
            variant="contained" size="small"
            onClick={handlePublish}
            disabled={publishing || !allSectionsReady}
            startIcon={publishing ? <CircularProgress size={13} color="inherit" /> : <Publish sx={{ fontSize: 15 }} />}
            sx={{
              textTransform: 'none', borderRadius: '8px', fontSize: '0.8rem', px: 2.5,
              bgcolor: T.navy, boxShadow: 'none',
              '&:hover': { bgcolor: T.navyHover, boxShadow: '0 2px 8px rgba(127,158,126,0.25)' },
              '&.Mui-disabled': { bgcolor: '#E7EAE3', color: T.surface },
            }}>
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </Stack>
      </Box>
 
      {!allSectionsReady && (
        <Typography sx={{ fontSize: '0.67rem', color: T.textMuted, mt: 1, textAlign: 'right' }}>
          Every section must be saved → validated and have a duration set (&gt; 0 min) before Publish enables.
        </Typography>
      )}
    </Box>
  );
}
export function PaperRepositoryPanel({
  papers, loading, loadingPaperId, deletingPaperId,
  onLoad, onDelete, onClose, onRefresh,
}) {
  return (
    <Box sx={{
      width: 290,
      flexShrink: 0,
      borderLeft: `1px solid ${T.border}`,
      bgcolor: T.surface,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
 
      {/* ── Header ── */}
      <Box sx={{
        px: 2, py: 1.5,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 1,
        flexShrink: 0,
      }}>
        <BookmarkAdded sx={{ fontSize: 15, color: T.navy }} />
        <Typography sx={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: T.textPrimary }}>
          Paper Repository
        </Typography>
        <Tooltip title="Refresh list">
          <span>
            <IconButton size="small" onClick={onRefresh}
              disabled={loading}
              sx={{ color: T.textMuted, p: '4px', '&:hover': { color: T.navy, bgcolor: T.navyLight } }}>
              <Refresh sx={{ fontSize: 14 }} />
            </IconButton>
          </span>
        </Tooltip>
        <IconButton size="small" onClick={onClose}
          sx={{ color: T.textMuted, p: '4px', '&:hover': { color: T.textPrimary } }}>
          <Close sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>
 
      {/* ── Paper list ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.25 }}>
 
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <CircularProgress size={22} sx={{ color: T.navy }} />
          </Box>
        )}
 
        {!loading && papers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 5, px: 1.5 }}>
            <BookmarkAdd sx={{ fontSize: 34, color: T.textMuted, opacity: 0.3, mb: 1.5 }} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.textSecond }}>
              No papers saved yet
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: T.textMuted, mt: 0.5, lineHeight: 1.55 }}>
              Build a question pool, then use<br />"Save as paper" to store it here.
            </Typography>
          </Box>
        )}
 
        {!loading && papers.map(paper => {
          const isLoading  = loadingPaperId  === paper.id;
          const isDeleting = deletingPaperId === paper.id;
          const busy       = !!loadingPaperId || !!deletingPaperId;
 
          return (
            <Card key={paper.id} elevation={0} sx={{
              mb: 1.25,
              border: `1px solid ${T.border}`,
              borderRadius: '9px',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
              '&:hover': {
                boxShadow: '0 2px 10px rgba(127,158,126,0.08)',
                borderColor: T.borderHover,
              },
            }}>
              <CardContent sx={{ p: '12px 14px', '&:last-child': { pb: '12px' } }}>
 
                {/* Name */}
                <Typography sx={{
                  fontSize: '0.8rem', fontWeight: 700, color: T.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  mb: 0.4,
                }}>
                  {paper.paper_name || paper.name || 'Unnamed Paper'}
                </Typography>
 
                {/* Description */}
                {paper.description && (
                  <Typography sx={{
                    fontSize: '0.7rem', color: T.textSecond, mb: 0.75, lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {paper.description}
                  </Typography>
                )}
 
                {/* Stats chips */}
                <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                  <Chip
                    label={`${paper.total_questions ?? 0} Q`}
                    size="small"
                    sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700, bgcolor: '#E8F4F3', color: '#4B9E9A' }}
                  />
                  <Chip
                    label={`${paper.total_marks ?? 0} pts`}
                    size="small"
                    sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700, bgcolor: T.warnBg, color: T.warn }}
                  />
                  {paper.assessment_id && (
                    <Chip
                      label={`ID #${paper.assessment_id}`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.58rem', bgcolor: T.pageBg, color: T.textMuted }}
                    />
                  )}
                </Stack>
 
                {/* Actions */}
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busy}
                    onClick={() => onLoad(paper)}
                    startIcon={
                      isLoading
                        ? <CircularProgress size={11} color="inherit" />
                        : <BookmarkAdded sx={{ fontSize: 13 }} />
                    }
                    sx={{
                      flex: 1,
                      textTransform: 'none',
                      fontSize: '0.7rem',
                      borderRadius: '7px',
                      py: 0.5,
                      boxShadow: 'none',
                      bgcolor: T.navy,
                      '&:hover': { bgcolor: T.navyHover, boxShadow: '0 1px 6px rgba(127,158,126,0.2)' },
                      '&.Mui-disabled': { bgcolor: '#E7EAE3', color: T.surface },
                    }}
                  >
                    {isLoading ? 'Loading…' : 'Load into pool'}
                  </Button>
 
                  <Tooltip title="Delete paper">
                    <span> {/* span wrapper needed for disabled Tooltip */}
                      <IconButton
                        size="small"
                        disabled={busy}
                        onClick={() => onDelete(paper.id, paper.paper_name || paper.name)}
                        sx={{
                          color: T.textMuted,
                          border: `1px solid ${T.border}`,
                          borderRadius: '7px',
                          p: '5px',
                          '&:hover': { color: T.error, bgcolor: T.errorBg, borderColor: T.errorBdr },
                          '&.Mui-disabled': { opacity: 0.4 },
                        }}
                      >
                        {isDeleting
                          ? <CircularProgress size={12} sx={{ color: T.error }} />
                          : <Delete sx={{ fontSize: 14 }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
 
              </CardContent>
            </Card>
          );
        })}
      </Box>
 
      {/* ── Footer hint ── */}
      <Box sx={{
        px: 2, py: 1.25,
        borderTop: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <Typography sx={{ fontSize: '0.62rem', color: T.textMuted, lineHeight: 1.55, textAlign: 'center' }}>
          Loading adds questions as a new section.<br />
          Review each question, then click&nbsp;<strong>Save</strong>&nbsp;to add to pool.
        </Typography>
      </Box>
 
    </Box>
  );
}
 

// ─────────────────────────────────────────────────────────────────────────────
// SAVE AS PAPER DIALOG — extracted from AssessmentBuilder
// ─────────────────────────────────────────────────────────────────────────────
export function SaveAsPaperDialog({
  paperDialogOpen, setPaperDialogOpen,
  paperSaveMode, setPaperSaveMode,
  sourcePapers, savingPaper,
  handleUpdateExistingPaper,
  totalSavedQ, totalPoints,
  paperName, setPaperName,
  paperDesc, setPaperDesc,
  handleSaveAsPaper,
}) {
  return (
    <>
      {/* ══ SAVE AS PAPER DIALOG ═══════════════════════════════════════════ */}
      <Dialog
        open={paperDialogOpen}
        onClose={() => setPaperDialogOpen(false)}
        maxWidth="xs" fullWidth
        sx={{ zIndex: 1500 }}
        slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${T.border}` } } }}
      >
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700, color: T.textPrimary, pb: 1, borderBottom: `1px solid ${T.border}` }}>
          {paperSaveMode === 'choose' ? 'Update existing or save as new?' : 'Save as new paper'}
        </DialogTitle>

        {/* ─── Mode A: choose between updating an imported paper or saving fresh */}
        {paperSaveMode === 'choose' && (
          <>
            <DialogContent sx={{ pt: '20px !important' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, mb: 2, lineHeight: 1.6 }}>
                Your pool currently includes questions from {sourcePapers.length === 1 ? 'a paper' : `${sourcePapers.length} papers`} in the repository. You can either update {sourcePapers.length === 1 ? 'that paper' : 'one of them'} with your latest changes, or save the whole pool as a brand-new paper.
              </Typography>

              <Typography sx={{ ...labelSx, mb: 1 }}>Update an existing paper</Typography>
              <Stack spacing={1} sx={{ mb: 2.5 }}>
                {sourcePapers.map(sp => (
                  <Box key={sp.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      p: '10px 12px',
                      border: `1px solid ${T.border}`, borderRadius: '9px',
                      bgcolor: T.surface,
                    }}>
                    <BookmarkAdded sx={{ fontSize: 16, color: T.navy, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sp.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.66rem', color: T.textMuted }}>
                        ID #{sp.id} · will absorb your new additions
                      </Typography>
                    </Box>
                    <Button
                      size="small" variant="contained"
                      disabled={savingPaper}
                      onClick={() => handleUpdateExistingPaper(sp.id)}
                      startIcon={savingPaper ? <CircularProgress size={11} color="inherit" /> : null}
                      sx={{
                        textTransform: 'none', fontSize: '0.72rem', borderRadius: '7px',
                        bgcolor: T.navy, boxShadow: 'none', px: 1.5, py: 0.5, flexShrink: 0,
                        '&:hover': { bgcolor: T.navyHover, boxShadow: '0 1px 6px rgba(127,158,126,0.2)' },
                        '&.Mui-disabled': { bgcolor: '#E7EAE3', color: T.surface },
                      }}>
                      Update
                    </Button>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ p: '12px 14px', bgcolor: T.pageBg, borderRadius: '9px', border: `1px dashed ${T.borderHover}` }}>
                <Typography sx={{ fontSize: '0.74rem', color: T.textSecond, mb: 1, lineHeight: 1.55 }}>
                  Or don't update any of them — save the current pool ({totalSavedQ} Q, {totalPoints} pts) as a fresh paper in the repository.
                </Typography>
                <Button
                  size="small" variant="outlined"
                  disabled={savingPaper}
                  onClick={() => setPaperSaveMode('new')}
                  startIcon={<BookmarkAdd sx={{ fontSize: 14 }} />}
                  sx={{
                    textTransform: 'none', fontSize: '0.74rem', borderRadius: '7px',
                    borderColor: T.border, color: T.textSecond,
                    '&:hover': { borderColor: T.navy, color: T.navy, bgcolor: T.navyLight },
                  }}>
                  Save as new paper instead
                </Button>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: `1px solid ${T.border}` }}>
              <Button onClick={() => setPaperDialogOpen(false)}
                disabled={savingPaper}
                sx={{ textTransform: 'none', color: T.textSecond, fontSize: '0.82rem', borderRadius: '8px', border: `1px solid ${T.border}`, px: 1.75, '&:hover': { bgcolor: T.pageBg } }}>
                Cancel
              </Button>
            </DialogActions>
          </>
        )}

        {/* ─── Mode B: name a brand-new paper (existing behaviour) */}
        {paperSaveMode === 'new' && (
          <>
            <DialogContent sx={{ pt: '20px !important' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, mb: 2, lineHeight: 1.6 }}>
                Save a named snapshot of this pool ({totalSavedQ} questions, {totalPoints} marks) to the repository. The snapshot stays editable as a draft until the assessment is published.
              </Typography>
              <Stack spacing={1.75}>
                <Box>
                  <Typography sx={{ ...labelSx, mb: 0.75 }}>Paper name *</Typography>
                  <TextField size="small" fullWidth placeholder="e.g. Python Paper 2025"
                    value={paperName} onChange={e => setPaperName(e.target.value)} sx={fSx} />
                </Box>
                <Box>
                  <Typography sx={{ ...labelSx, mb: 0.75 }}>Description (optional)</Typography>
                  <TextField size="small" fullWidth multiline minRows={2}
                    placeholder="Brief description of this paper…"
                    value={paperDesc} onChange={e => setPaperDesc(e.target.value)} sx={fSx} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1, borderTop: `1px solid ${T.border}` }}>
              {sourcePapers.length > 0 && (
                <Button onClick={() => setPaperSaveMode('choose')}
                  disabled={savingPaper}
                  sx={{ textTransform: 'none', color: T.textSecond, fontSize: '0.78rem', borderRadius: '8px', mr: 'auto', '&:hover': { color: T.navy, bgcolor: T.navyLight } }}>
                  ← Back
                </Button>
              )}
              <Button onClick={() => setPaperDialogOpen(false)}
                disabled={savingPaper}
                sx={{ textTransform: 'none', color: T.textSecond, fontSize: '0.82rem', borderRadius: '8px', border: `1px solid ${T.border}`, px: 1.75, '&:hover': { bgcolor: T.pageBg } }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveAsPaper} disabled={savingPaper}
                startIcon={savingPaper ? <CircularProgress size={13} color="inherit" /> : <BookmarkAdded sx={{ fontSize: 15 }} />}
                sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.82rem', px: 2, bgcolor: T.navy, boxShadow: 'none', '&:hover': { bgcolor: T.navyHover, boxShadow: '0 2px 8px rgba(127,158,126,0.22)' }, '&.Mui-disabled': { bgcolor: '#E7EAE3', color: T.surface } }}>
                {savingPaper ? 'Saving…' : 'Save to repository'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS DIALOG — extracted from AssessmentBuilder
// ─────────────────────────────────────────────────────────────────────────────
export function InstructionsDialog({ instructionsOpen, setInstructionsOpen }) {
  return (
    <>
      {/* ══ INSTRUCTIONS DIALOG ═══════════════════════════════════════════ */}
      <Dialog
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        maxWidth="sm" fullWidth
        sx={{ zIndex: 1500 }}
        slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${T.border}` } } }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, color: T.textPrimary, pb: 1.25, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlined sx={{ fontSize: 20, color: T.navy }} />
          How to Build Your Manual Test
        </DialogTitle>

        <DialogContent sx={{ pt: '20px !important', pb: 2 }}>
          <Typography sx={{ fontSize: '0.8rem', color: T.textSecond, mb: 2, lineHeight: 1.6 }}>
            A quick guide to creating an assessment from scratch. Most issues come from forgetting to click <strong>Save</strong> on each question.
          </Typography>

          {/* Step 1 */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.navy, mb: 0.75 }}>
              1. Add a Question
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, lineHeight: 1.6, pl: 1.5 }}>
              Click <strong>+ Add Question</strong> in the sidebar under any section. Pick a type (MCQ, Multi Select, True/False, Fill in Blank, Match, Sequence, Short Answer, Coding, Scenario, Custom). The new question opens in the editor on the right.
            </Typography>
          </Box>

          {/* Step 2 */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.navy, mb: 0.75 }}>
              2. Fill in the Question
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, lineHeight: 1.6, pl: 1.5 }}>
              Type your question, fill all options, and <strong>mark the correct option(s)</strong>. Save won't work until both the question text and a correct answer are set. Subjective types (short answer, coding, scenario, custom) skip the correct-answer step — they're flagged for manual grading.
            </Typography>
          </Box>

          {/* Step 3 — highlighted */}
          <Box sx={{ mb: 2, p: '12px 14px', bgcolor: T.errorBg, border: `1px solid ${T.errorBdr}`, borderRadius: '8px' }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.error, mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Warning sx={{ fontSize: 18 }} /> 3. Save Each Question — REQUIRED
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#7F1D1D', lineHeight: 1.6 }}>
              Click the <strong>Save</strong> button on each question card. Saved questions get a green ✓ in the sidebar; unsaved ones show a red dot. <strong>The "Configure Distribution" button stays disabled until every question is saved.</strong>
            </Typography>
          </Box>

          {/* Step 4 */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.navy, mb: 0.75 }}>
              4. Add More Sections (optional)
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, lineHeight: 1.6, pl: 1.5 }}>
              Use <strong>+ Add Section</strong> at the bottom of the sidebar. Pick <strong>Aptitude</strong>, <strong>Technical</strong>, or create a <strong>Custom Section</strong>. Each section can have its own question mix.
            </Typography>
          </Box>

          {/* Step 5 */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.navy, mb: 0.75 }}>
              5. Reuse Questions from Paper repository(optional)
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, lineHeight: 1.6, pl: 1.5 }}>
              <strong>Save as paper</strong> stores your pool in your library. <strong>Papers</strong> lets you browse and import a saved paper as a new section.
            </Typography>
          </Box>

          {/* Step 6 */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.navy, mb: 0.75 }}>
              6. Move to Distribution
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, lineHeight: 1.6, pl: 1.5 }}>
              Once all questions are saved, click <strong>Configure Distribution</strong> (bottom-right). In Step 3, set how many questions each candidate gets and the per-type breakdown.
            </Typography>
          </Box>

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: `1px solid ${T.border}` }}>
          <Button variant="contained" onClick={() => setInstructionsOpen(false)}
            sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.82rem', px: 2.5, bgcolor: T.navy, boxShadow: 'none', '&:hover': { bgcolor: T.navyHover, boxShadow: '0 2px 8px rgba(127,158,126,0.22)' } }}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MISSING CORRECT ANSWER DIALOG — extracted from AssessmentBuilder
// ─────────────────────────────────────────────────────────────────────────────
export function MissingCorrectDialog({ missingCorrectDialog, setMissingCorrectDialog }) {
  return (
    <>
      {/* ══ MISSING CORRECT ANSWER DIALOG (Alert #1) ═══════════════════════ */}
      <Dialog
        open={missingCorrectDialog.open}
        onClose={() => setMissingCorrectDialog(prev => ({ ...prev, open: false }))}
        maxWidth="xs" fullWidth
        sx={{ zIndex: 1600 }}
        slotProps={{ paper: { sx: { borderRadius: '14px', border: `1px solid ${T.border}` } } }}
      >
        <DialogTitle sx={{ fontSize: '0.98rem', fontWeight: 700, color: T.error, pb: 1.25, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ fontSize: 20, color: T.error }} />
          Correct answer not selected
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <Typography sx={{ fontSize: '0.85rem', color: T.textPrimary, lineHeight: 1.6, mb: 1.5 }}>
            You need to mark {missingCorrectDialog.type === 'multi_select' ? 'at least one correct option' : 'the correct option'} before saving this question.
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: T.textSecond, lineHeight: 1.6 }}>
            {missingCorrectDialog.type === 'true_false'
              ? 'Click True or False to indicate the correct answer, then click Save.'
              : 'Click the circle next to the correct option — it will turn green with a check mark — then click Save again.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: `1px solid ${T.border}` }}>
          <Button variant="contained" onClick={() => setMissingCorrectDialog(prev => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.82rem', px: 2.5, bgcolor: T.navy, boxShadow: 'none', '&:hover': { bgcolor: T.navyHover, boxShadow: '0 2px 8px rgba(127,158,126,0.22)' } }}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}