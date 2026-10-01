import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Chip, Stack, Divider,
  CircularProgress, Alert, Snackbar, LinearProgress, Link,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import useDocumentReupload from '@/hooks/company/useDocumentReupload';
import { useAuth } from '@/hooks/useAuth';
import { PATHS } from '@/routes/routePaths';

const DOC_LABELS = {
  MCA: 'Certificate of Incorporation (MCA)',
  PAN: 'Company PAN',
  GST: 'GST registration',
  AADHAAR: 'Authorised signatory Aadhaar',
  MSME: 'MSME / Udyam registration',
  COI: 'Certificate of Incorporation',
  AWARD: 'Award or recognition',
  PROOF: 'Supporting proof',
};

// Reading order, not alphabetical: incorporation, then tax, then identity.
const DOC_ORDER = ['MCA', 'PAN', 'GST', 'AADHAAR', 'MSME'];

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp';
const MAX_MB = 10;

const STATUS_STYLES = {
  VERIFIED:     { bg: '#ECFDF5', color: '#065F46', label: 'verified' },
  PENDING:      { bg: '#F4F7F2', color: '#5E815D', label: 'with the review team' },
  REJECTED:     { bg: '#FEF2F2', color: '#991B1B', label: 'needs re-upload' },
  NOT_UPLOADED: { bg: '#F0F2ED', color: '#7A7E76', label: 'not uploaded' },
};

// ---------------------------------------------------------------------------

function TypeBadge({ type, muted }) {
  return (
    <Box
      sx={{
        minWidth: 74, height: 28, px: 1.25,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 1.5,
        bgcolor: muted ? 'transparent' : '#E8F0E8',
        border: '1px solid #E7EAE3',
        color: muted ? 'text.secondary' : '#08302F',
        fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
      }}
    >
      {type}
    </Box>
  );
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.NOT_UPLOADED;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }}
    />
  );
}

function RejectedCard({ doc, busy, onPick }) {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const isMissing = doc.id == null;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';           // allow re-picking the same file
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`That file is over ${MAX_MB} MB. Compress it and try again.`);
      return;
    }
    setLocalError('');
    onPick(doc, file);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2, borderColor: '#E7EAE3' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <TypeBadge type={doc.document_type} />
        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
            {DOC_LABELS[doc.document_type] || doc.document_type}
          </Typography>
          {doc.document_title && (
            <Typography variant="caption" color="text.secondary">
              {doc.document_title}
            </Typography>
          )}
        </Box>
        <StatusChip status={isMissing ? 'NOT_UPLOADED' : 'REJECTED'} />
      </Stack>

      <Box
        sx={{
          mt: 2, mb: 2, py: 1.25, px: 2,
          borderLeft: '3px solid',
          borderColor: isMissing ? 'warning.main' : 'error.main',
          bgcolor: isMissing ? '#FDF6E7' : '#F9ECEB',
          borderRadius: '0 8px 8px 0',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block', fontWeight: 700, letterSpacing: 0.4,
            color: isMissing ? '#8A6100' : '#C0392B',
          }}
        >
          {isMissing ? 'THIS DOCUMENT IS NO LONGER ON FILE' : 'WHY IT WAS SENT BACK'}
        </Typography>
        <Typography sx={{ fontSize: 14, mt: 0.5 }}>
          {isMissing
            ? 'It was removed during review. Upload it again to finish verification.'
            : (doc.rejection_reason || 'No reason was recorded. Contact support if this looks wrong.')}
        </Typography>
      </Box>

      {localError && <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert>}
      {busy && <LinearProgress sx={{ mb: 2, borderRadius: 1, bgcolor: '#E8F0E8', '& .MuiLinearProgress-bar': { bgcolor: '#08302F' } }} />}

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          sx={{ bgcolor: '#08302F', '&:hover': { bgcolor: '#0a3d40' } }}
        >
          {busy ? 'Uploading…' : isMissing ? 'Upload this document' : 'Upload a new file'}
        </Button>
        {doc.document_file_url && (
          <Button
            variant="text"
            size="small"
            endIcon={<OpenInNewIcon fontSize="small" />}
            onClick={() => window.open(doc.document_file_url, '_blank', 'noopener,noreferrer')}
            sx={{ color: 'text.secondary' }}
          >
            See what you sent
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          PDF, PNG or JPG · up to {MAX_MB} MB
        </Typography>
      </Stack>
    </Paper>
  );
}

/** Read-only row used by the "under review" state. */
function StatusRow({ type, status, last }) {
  return (
    <Box
      sx={{
        py: 1.75, px: 2, display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: last ? 'none' : '1px solid', borderColor: 'divider',
      }}
    >
      <TypeBadge type={type} muted={status === 'NOT_UPLOADED'} />
      <Typography sx={{ flexGrow: 1, fontSize: 14, fontWeight: 500 }}>
        {DOC_LABELS[type] || type}
      </Typography>
      <StatusChip status={status} />
    </Box>
  );
}

// ---------------------------------------------------------------------------

export default function DocumentReupload() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const companyId = user?.id || Number(localStorage.getItem('currentCompanyId')) || null;

  const {
    documents, companyName, requiredSummary, destination,
    loading, error, uploadingId, toast, setToast, reupload, refetch,
  } = useDocumentReupload(companyId);

  const handleSignOut = () => {
    logout?.();
    navigate('/auth', { replace: true });
  };

  // Order the summary the way a reviewer reads it, not alphabetically.
  const ordered = [...requiredSummary].sort(
    (a, b) => DOC_ORDER.indexOf(a.document_type) - DOC_ORDER.indexOf(b.document_type),
  );
  const verifiedCount = ordered.filter((d) => d.status === 'VERIFIED').length;

  const isReupload = destination === 'reupload';
  const isDone = destination === 'dashboard';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F8F3', py: { xs: 3, sm: 6 } }}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, sm: 3 } }}>

        <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: '#5E815D', mb: 1 }}>
          DOCUMENT REVIEW
        </Typography>
        <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 700, lineHeight: 1.15 }}>
          {isDone && 'You\u2019re all set'}
          {isReupload && 'Some documents need another look'}
          {!isDone && !isReupload && 'Your documents are being reviewed'}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 1, mb: 4, fontSize: 15 }}>
          {isDone && 'Every required document is verified. Your account is live.'}
          {isReupload && `${companyName || 'Your company'} can\u2019t continue until the documents below are replaced. Nothing else needs to change.`}
          {!isDone && !isReupload && 'Nothing is needed from you right now. We\u2019ll email you as soon as the team finishes, usually within one business day.'}
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={30} sx={{ color: '#08302F' }} />
          </Box>
        )}

        {!loading && error && (
          <Alert
            severity="error"
            action={<Button size="small" onClick={refetch}>Try again</Button>}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* All verified → let them in */}
        {!loading && !error && isDone && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: '#E7EAE3' }}>
            <CheckCircleIcon sx={{ fontSize: 44, color: '#065F46', mb: 1.5 }} />
            <Typography sx={{ fontWeight: 600, fontSize: 17, mb: 0.5 }}>
              Verification complete
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14, mb: 3 }}>
              All five required documents have been verified.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(PATHS.CO_OVERVIEW, { replace: true })}
              sx={{ bgcolor: '#08302F', '&:hover': { bgcolor: '#0a3d40' } }}
            >
              Go to dashboard
            </Button>
          </Paper>
        )}

        {documents.length} {documents.length === 1 ? 'DOCUMENT' : 'DOCUMENTS'} NEED ATTENTION
        {!loading && !error && isReupload && (
          <>
            <Typography
              variant="caption"
              sx={{ display: 'block', mb: 1.5, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary' }}
            >
              
            </Typography>

            {documents.map((doc) => (
              <RejectedCard
                key={doc.id ?? doc.document_type}
                doc={doc}
                busy={uploadingId === (doc.id ?? doc.document_type)}
                onPick={reupload}
              />
            ))}

            {/* BUILD: 2026-09-11-signout-button-v1 */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Only the documents listed here can be changed. Anything already
              verified stays as it is.
            </Typography>
            <Button
              variant="outlined"
              onClick={handleSignOut}
              sx={{
                borderColor: '#08302F',
                color: '#08302F',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { borderColor: '#0a3d40', bgcolor: '#7c9d68' },
              }}
            >
              Sign out
            </Button>
          </>
        )}

        {/* Nothing rejected, not all verified → waiting */}
        {!loading && !error && !isDone && !isReupload && (
          <>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5, mb: 3, borderColor: '#E7EAE3',
                display: 'flex', alignItems: 'center', gap: 2,
              }}
            >
              <HourglassEmptyIcon sx={{ color: '#08302F' }} />
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                  {verifiedCount} of {ordered.length} verified so far
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your account goes live once all five are verified.
                </Typography>
              </Box>
            </Paper>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
              {ordered.map((d, i) => (
                <StatusRow
                  key={d.document_type}
                  type={d.document_type}
                  status={d.status}
                  last={i === ordered.length - 1}
                />
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" onClick={refetch}
                sx={{ borderColor: '#08302F', color: '#08302F', '&:hover': { borderColor: '#0a3d40', bgcolor: '#F4F7F2' } }}>
                Check again
              </Button>
              <Link component="button" type="button" onClick={handleSignOut} sx={{ fontWeight: 600, color: '#08302F' }}>
                Sign out
              </Link>
            </Stack>
          </>
        )}
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}