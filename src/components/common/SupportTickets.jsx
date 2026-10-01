
import { useRef, useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, IconButton, Table, TableHead,
  TableBody, TableRow, TableCell, CircularProgress, Alert,
  Snackbar, Stack, Tooltip, Divider, LinearProgress,
} from '@mui/material';
import {
  Add, ArrowBack, Send, AttachFile, Close, CloudUpload,
  ConfirmationNumber, AccessTime, CheckCircle, Refresh,
  Delete, Download, InsertDriveFile, Image, PictureAsPdf,
  Search, ArrowForward, ExpandMore, VerifiedUser, Videocam,
  Group, ReceiptLong, Description, Person, Build, Mic, Gavel,
  CreditCard, Chat, Help, Email, Lock,
} from '@mui/icons-material';
import useSupportTickets from '@/hooks/useSupportTickets';
import { useAuth } from '@/hooks/useAuth';

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  { value: 'ACCOUNT',      label: 'Account',      icon: '👤' },
  { value: 'TECHNICAL',    label: 'Technical',     icon: '⚙️' },
  { value: 'INTERVIEW',    label: 'Interview',     icon: '🎤' },
  { value: 'DISPUTE',      label: 'Dispute',       icon: '⚖️' },
  { value: 'VERIFICATION', label: 'Verification',  icon: '✅' },
  { value: 'BILLING',      label: 'Billing',       icon: '💳' },
  { value: 'FEEDBACK',     label: 'Feedback',      icon: '💬' },
  { value: 'OTHER',        label: 'Other',         icon: '❓' },
];

const SG = {
  pine:  '#022124',
  pine2: '#24433E',
  sage:  '#7F9E7E',
  sageD: '#6C8B6B',
  sageS: '#EDF3EC',
  sageL: '#C7D9C5',
  ink:   '#1F1F1F',
  muted: '#6F7470',
  faint: '#B4B2A9',
  line:  '#E7EAE3',
  cream: '#F6F8F3',
  paper: '#FFFFFF',
};

const HELP_LIBRARY = {
  /* ── shared by every role ── */
  emails: {
    id: 'emails',
    icon: Email,
    title: 'I am not receiving emails from iEvalX',
    blurb: 'Spam filters, allowlisting and unsubscribe checks',
    keywords: ['email', 'mail', 'inbox', 'spam', 'notification', 'otp', 'link', 'invite', 'not received'],
    body: 'All iEvalX mail is sent from noreply@ievalx.com. Mail from your company account may show up in your inbox as "<Your company> via iEvalX" — that is the same address, so allowlisting noreply@ievalx.com covers every kind of mail we send. Check your spam folder first, then add that address to your contacts so future mail lands in the inbox. If you unsubscribed earlier, notification mail stops but security mail such as sign-in codes always still arrives. Corporate mail filters sometimes hold our messages, so your IT team may need to allowlist the domain.',
  },
  signin: {
    id: 'signin',
    icon: Lock,
    title: 'Trouble signing in or resetting your password',
    blurb: 'Password resets, sign-in codes and locked accounts',
    keywords: ['login', 'sign in', 'signin', 'password', 'reset', 'otp', 'code', 'locked', 'access', 'account'],
    body: 'Use the forgot password link on the sign-in screen and the reset mail arrives within a few minutes. Sign-in codes expire quickly, so request a fresh one rather than reusing an old mail. If you signed up with Google, LinkedIn or Microsoft, use that same button instead of a password. Repeated failed attempts lock the account briefly and it unlocks on its own.',
  },

  /* ── jobseeker ── */
  jsAssessment: {
    id: 'jsAssessment',
    icon: Description,
    title: 'My assessment link is not working',
    blurb: 'Expired links, timers and what happens if you drop out',
    keywords: ['assessment', 'test', 'link', 'expired', 'timer', 'question', 'submit', 'exam', 'score'],
    body: 'Assessment links are single use and expire after the window set by the employer. Open the link in Chrome or Edge on a laptop and avoid refreshing once the timer starts. If your connection drops mid-attempt, reopen the link and you return to where you left off. If the window has already closed, ask the employer to reissue it.',
  },
  jsInterview: {
    id: 'jsInterview',
    icon: Videocam,
    title: 'I cannot join my interview',
    blurb: 'Camera, microphone and browser checks before you join',
    keywords: ['interview', 'join', 'room', 'video', 'camera', 'mic', 'microphone', 'link', 'loading', 'connect'],
    body: 'Join from Chrome or Edge on a laptop and allow camera and microphone access when the browser asks. Close other apps using the camera, and turn off any VPN. Join a few minutes early so you can run the device check. If the room will not load at all, the link may have expired and the employer can send a fresh one.',
  },
  jsApplication: {
    id: 'jsApplication',
    icon: CheckCircle,
    title: 'Where do I see my application status?',
    blurb: 'What each stage means and when employers respond',
    keywords: ['application', 'applied', 'status', 'stage', 'shortlist', 'reject', 'progress', 'job', 'update'],
    body: 'Every application appears under Applied Jobs with its current stage. Employers move candidates through stages at their own pace, so a role can sit at the same stage for a while. You get an email whenever your stage changes. A closed job stops accepting new applications but existing ones stay in the pipeline.',
  },
  jsProfile: {
    id: 'jsProfile',
    icon: Person,
    title: 'Updating my resume and profile',
    blurb: 'What employers see and how parsing works',
    keywords: ['resume', 'cv', 'profile', 'upload', 'parse', 'skill', 'photo', 'headline', 'edit', 'update'],
    body: 'Upload a resume from your profile and we read it to prefill your skills, education and experience. Always review the parsed result, since scanned or heavily designed resumes read poorly. A complete profile with a headline, key skills and a photo is far more likely to be shortlisted. Changes apply to future applications, not to ones already submitted.',
  },

  /* ── employer ── */
  empVerification: {
    id: 'empVerification',
    icon: VerifiedUser,
    title: 'Why is verification still pending?',
    blurb: 'Typical turnaround and the documents we need',
    keywords: ['verify', 'verification', 'pending', 'document', 'kyc', 'approval', 'company', 'review'],
    body: 'Verification usually completes within two working days of the last document being uploaded. If it has been longer, check that your registration certificate and GST document are both readable and match the company name on the profile. Re-upload anything blurred or cropped and the review restarts automatically.',
  },
  empInterviewRoom: {
    id: 'empInterviewRoom',
    icon: Videocam,
    title: 'A candidate cannot join the interview room',
    blurb: 'Browser, camera and network checks that fix most cases',
    keywords: ['interview', 'room', 'join', 'video', 'camera', 'mic', 'livekit', 'loading', 'connect', 'candidate'],
    body: 'Ask the candidate to open the link in Chrome or Edge on a laptop, allow camera and microphone when prompted, and turn off any VPN. If the room still will not load, the join link may have expired. Reissue it from Scheduling Hub and the candidate gets a fresh invite.',
  },
  empApplicants: {
    id: 'empApplicants',
    icon: Group,
    title: 'Applicants are not showing on my job',
    blurb: 'Job status, filters and where applications land',
    keywords: ['applicant', 'candidate', 'job', 'posting', 'missing', 'empty', 'apply', 'pipeline', 'filter'],
    body: 'Check the job is published rather than draft or closed, since only published jobs accept applications. The applicant list also respects any filters left active from your last visit, so clear those first. Candidates you moved to a later stage appear under that stage, not under new applicants.',
  },
  empAssessment: {
    id: 'empAssessment',
    icon: Description,
    title: 'Assessment results are missing or incomplete',
    blurb: 'Partial attempts, scoring and when results appear',
    keywords: ['assessment', 'result', 'score', 'partial', 'incomplete', 'missing', 'test', 'attempt', 'report'],
    body: 'Results appear on the dashboard as soon as a candidate submits. A candidate who ran out of time or closed the tab shows as a partial attempt with an amber status, and you can still preview their answers and take a hiring decision. Scores for partial attempts are calculated only from the questions actually answered.',
  },

  /* ── company ── */
  coVerification: {
    id: 'coVerification',
    icon: VerifiedUser,
    title: 'Why is company verification still pending?',
    blurb: 'Typical turnaround and the documents we need',
    keywords: ['verify', 'verification', 'pending', 'document', 'kyc', 'approval', 'company', 'review'],
    body: 'Verification usually completes within two working days of the last document being uploaded. If it has been longer, check that your registration certificate and GST document are both readable and match the company name on your profile. Re-upload anything blurred or cropped and the review restarts automatically.',
  },
  coRecruiters: {
    id: 'coRecruiters',
    icon: Group,
    title: 'Adding recruiters and managing seats',
    blurb: 'Invites, seat limits and removing people who have left',
    keywords: ['recruiter', 'team', 'invite', 'seat', 'user', 'member', 'add', 'remove', 'employer', 'staff'],
    body: 'Invite recruiters from your company workspace and they receive a mail to set their own password. Each active recruiter uses one seat, and removing someone frees their seat immediately while leaving their past activity intact. Someone who has left should be removed rather than left inactive, so their access ends the same day.',
  },
  coBilling: {
    id: 'coBilling',
    icon: ReceiptLong,
    title: 'Finding invoices and GST details',
    blurb: 'Where billing documents live and how to download them',
    keywords: ['invoice', 'gst', 'billing', 'payment', 'receipt', 'tax', 'plan', 'subscription', 'download'],
    body: 'Every invoice is available under billing in your company workspace and is also emailed to the billing contact on the account. If your GST number is missing from an invoice, update it in company details and reissue the invoice from the same screen.',
  },
  coPermissions: {
    id: 'coPermissions',
    icon: Person,
    title: 'Who can see which jobs and candidates',
    blurb: 'What each role can access across the workspace',
    keywords: ['permission', 'access', 'role', 'admin', 'visibility', 'see', 'restrict', 'privacy', 'recruiter'],
    body: 'A recruiter sees only the jobs assigned to them along with the candidates in those pipelines. A company admin sees every job, every candidate and all billing information. Changing someone between recruiter and admin takes effect the next time they sign in.',
  },
};

const COMMON_ARTICLE_IDS = ['emails', 'signin'];

const ROLE_ARTICLE_IDS = {
  jobseeker: ['jsAssessment', 'jsInterview', 'jsApplication', 'jsProfile'],
  employer:  ['empVerification', 'empInterviewRoom', 'empApplicants', 'empAssessment'],
  company:   ['coVerification', 'coRecruiters', 'coBilling', 'coPermissions'],
};

/* Role-specific articles first, then the ones everyone shares */
const articlesForRole = (role) => {
  const ids = ROLE_ARTICLE_IDS[String(role || '').toLowerCase()] || [];
  return [...ids, ...COMMON_ARTICLE_IDS].map((id) => HELP_LIBRARY[id]).filter(Boolean);
};

const CAT_ICONS = {
  ACCOUNT:      Person,
  TECHNICAL:    Build,
  INTERVIEW:    Mic,
  DISPUTE:      Gavel,
  VERIFICATION: VerifiedUser,
  BILLING:      CreditCard,
  FEEDBACK:     Chat,
  OTHER:        Help,
};

const PRIORITY_OPTIONS = [
  { value: 'LOW',      label: 'Low' },
  { value: 'NORMAL',   label: 'Normal' },
  { value: 'HIGH',     label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const initials = (name) => (name || '?')
  .trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const RISE_IN = {
  '@keyframes sgRise': {
    from: { opacity: 0, transform: 'translateY(10px)' },
    to:   { opacity: 1, transform: 'none' },
  },
};

const STATUS_CHIP = {
  OPEN:          { label: 'Open',        bg: '#dbeafe', color: '#1e40af' },
  IN_PROGRESS:   { label: 'In Progress', bg: '#fef3c7', color: '#92400e' },
  AWAITING_USER: { label: 'Awaiting Reply', bg: '#fae8ff', color: '#86198f' },
  RESOLVED:      { label: 'Resolved',    bg: '#dcfce7', color: '#166534' },
  CLOSED:        { label: 'Closed',      bg: '#f3f4f6', color: '#6b7280' },
};

const PRIORITY_CHIP = {
  LOW:      { bg: '#f3f4f6', color: '#6b7280' },
  NORMAL:   { bg: '#dbeafe', color: '#1e40af' },
  HIGH:     { bg: '#fee2e2', color: '#991b1b' },
  CRITICAL: { bg: '#fae8ff', color: '#86198f' },
};

const STAT_FILTERS = [
  { key: '',              label: 'All' },
  { key: 'OPEN',          label: 'Open' },
  { key: 'IN_PROGRESS',   label: 'In Progress' },
  { key: 'AWAITING_USER', label: 'Awaiting' },
  { key: 'RESOLVED',      label: 'Resolved' },
];

const countKey = (k) => k ? k.toLowerCase().replace(/ /g, '_') : 'all';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const fileIcon = (name) => {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return <Image fontSize="small" />;
  if (ext === 'pdf') return <PictureAsPdf fontSize="small" />;
  return <InsertDriveFile fontSize="small" />;
};

/* ═══════════════════════════════════════════════════════════════════════
   STYLED HELPERS
   ═══════════════════════════════════════════════════════════════════════ */
function StatusChip({ status }) {
  const s = STATUS_CHIP[status] || STATUS_CHIP.OPEN;
  return (
    <Chip label={s.label} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 24 }} />
  );
}

function PriorityChip({ priority }) {
  const p = PRIORITY_CHIP[priority] || PRIORITY_CHIP.NORMAL;
  return (
    <Chip label={priority} size="small"
      sx={{ bgcolor: p.bg, color: p.color, fontWeight: 700, fontSize: 11, height: 22,
            textTransform: 'capitalize' }} />
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function SupportTickets() {
  const { user } = useAuth();
  const h = useSupportTickets();

  return (
    <Box sx={{ pt: { xs: 1.5, sm: 2.5 }, pb: 4 }}>
      {/* Header — hidden on the list view, which now carries its own hero */}
      {h.view !== 'list' && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: SG.pine }}>
              Help & Support
            </Typography>
            <Typography variant="body2" sx={{ color: SG.muted }}>
              Raise a ticket and our team will get back to you within 24 hours
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={h.goToList}
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: SG.line, color: SG.pine,
                  '&:hover': { borderColor: SG.sage, bgcolor: '#93B097' } }}>
            Back to Tickets
          </Button>
        </Box>
      )}

      {h.error && <Alert severity="error" sx={{ mb: 2 }}>{h.error}</Alert>}

      {/* ════════════ LIST VIEW ════════════ */}
      {h.view === 'list' && (
        <ListViewContent h={h} user={user} />
      )}

      {/* ════════════ RAISE VIEW ════════════ */}
      {h.view === 'raise' && (
        <RaiseViewContent h={h} user={user} />
      )}

      {/* ════════════ DETAIL VIEW ════════════ */}
      {h.view === 'detail' && (
        <DetailViewContent h={h} user={user} />
      )}

      {/* Toast */}
      <Snackbar open={Boolean(h.toast)} autoHideDuration={4000}
        onClose={() => h.setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {h.toast && (
          <Alert onClose={() => h.setToast(null)} severity={h.toast.severity} sx={{ width: '100%' }}>
            {h.toast.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   LIST VIEW
   ═══════════════════════════════════════════════════════════════════════ */
function ListViewContent({ h, user }) {
  const [query,   setQuery]   = useState('');
  const [openArt, setOpenArt] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const q = query.trim().toLowerCase();

  const roleArticles = useMemo(() => articlesForRole(user?.role), [user?.role]);

  const articles = useMemo(() => {
    if (!q) return roleArticles;
    return roleArticles.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      a.blurb.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.includes(q) || q.includes(k))
    );
  }, [q, roleArticles]);

  const visibleTickets = useMemo(() => {
    if (!q) return h.tickets;
    return h.tickets.filter((t) =>
      (t.subject || '').toLowerCase().includes(q) ||
      (t.ticketNumber || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  }, [q, h.tickets]);


  const totalAll = h.statusFilter ? (h.counts.all || 0) : h.total;

  const liveCount = (h.counts.open || 0)
    + (h.counts.in_progress || 0)
    + (h.counts.awaiting_user || 0);

  const listOpen = showAll || Boolean(q);

  return (
    <>
      {/* ── Hero + search ── */}
      <Box sx={{ textAlign: 'center', pt: { xs: 1, sm: 2 }, pb: 3 }}>
        <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, letterSpacing: -0.6, color: SG.pine }}>
          What do you need help with?
        </Typography>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          maxWidth: 460, mx: 'auto', mt: 2,
          bgcolor: SG.paper, border: '1px solid', borderColor: SG.line,
          borderRadius: 999, px: 2.25, py: 1.25, transition: 'all 0.18s',
          '&:focus-within': { borderColor: SG.sage, boxShadow: `0 0 0 3px ${SG.sageS}` },
        }}>
          <Search sx={{ fontSize: 19, color: SG.sage }} />
          <Box component="input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles and your tickets"
            sx={{
              flex: 1, minWidth: 0, border: 0, outline: 0, bgcolor: 'transparent',
              fontFamily: 'inherit', fontSize: 14, color: SG.ink,
              '&::placeholder': { color: SG.faint },
            }} />
          {query && (
            <IconButton size="small" onClick={() => setQuery('')} sx={{ color: SG.muted }}>
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* ── Your tickets strip ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: SG.line, borderRadius: '12px', mb: 2.5, overflow: 'hidden' }}>
        <Box onClick={() => setShowAll((v) => !v)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
            px: 2, py: 1.5, cursor: 'pointer', transition: 'background 0.18s',
            '&:hover': { bgcolor: SG.cream },
          }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto',
            bgcolor: liveCount ? SG.sage : SG.faint }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: SG.pine }}>
                        {totalAll === 0
              ? 'No tickets yet'
              : `${liveCount} open ticket${liveCount === 1 ? '' : 's'}`}
          </Typography>
          {totalAll > 0 && (
            <Typography sx={{ fontSize: 13, color: SG.muted }}>
              — {totalAll} in total
            </Typography>
          )}
          {totalAll > 0 && (
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: SG.sageD }}>
                               {listOpen ? 'Hide' : `View all ${totalAll}`}
              </Typography>
              <ExpandMore sx={{
                fontSize: 18, color: SG.sageD,
                transform: listOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s',
              }} />
            </Box>
          )}
        </Box>

                {listOpen && totalAll > 0 && (
          <Box sx={{ borderTop: '1px solid', borderColor: SG.line, position: 'relative' }}>
            {h.listLoading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }} />}

            {/* Status filters */}
            <Stack direction="row" spacing={0.75} sx={{ px: 2, py: 1.5, flexWrap: 'wrap', gap: 0.75 }}>
              {STAT_FILTERS.map((sf) => {
                const active = h.statusFilter === sf.key;
                const cnt = h.counts[countKey(sf.key)] || 0;
                return (
                  <Box key={sf.key} onClick={() => h.setStatusFilter(sf.key)}
                    sx={{
                      px: 1.5, py: 0.75, borderRadius: 999, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                      border: '1px solid',
                      borderColor: active ? SG.pine : SG.line,
                      bgcolor: active ? SG.pine : SG.paper,
                      color: active ? SG.paper : SG.muted,
                      transition: 'all 0.18s',
                      '&:hover': { borderColor: active ? SG.pine : SG.sageL, color: active ? SG.paper : SG.pine },
                    }}>
                    {sf.label} {cnt}
                  </Box>
                );
              })}
            </Stack>

                        {visibleTickets.length === 0 && !h.listLoading && (
              <Typography sx={{ fontSize: 13, color: SG.muted, px: 2, pb: 2 }}>
                {q
                  ? 'No tickets match that search.'
                  : h.statusFilter
                    ? `No ${(STAT_FILTERS.find((s) => s.key === h.statusFilter)?.label || '').toLowerCase()} tickets right now.`
                    : 'No tickets to show.'}
              </Typography>
            )}

            {visibleTickets.map((t) => {
              const s = STATUS_CHIP[t.status] || STATUS_CHIP.OPEN;
              return (
                <Box key={t.id} onClick={() => h.openDetail(t.id)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                    px: 2, py: 1.5, cursor: 'pointer',
                    borderTop: '1px solid', borderColor: SG.line,
                    transition: 'background 0.18s',
                    '&:hover': { bgcolor: SG.cream },
                  }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: SG.pine }} noWrap>
                      {t.subject}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: SG.muted, mt: 0.25,
                      fontFamily: '"SF Mono","Fira Code",monospace' }} noWrap>
                      {t.ticketNumber} · {t.category}
                    </Typography>
                  </Box>
                  <Chip label={s.label} size="small"
                    sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22 }} />
                  <Typography sx={{ fontSize: 11.5, color: SG.muted, minWidth: 78, textAlign: 'right' }}>
                    {fmtDate(t.createdAt)}
                  </Typography>
                </Box>
              );
            })}

            {h.total > 20 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                px: 2, py: 1.5, borderTop: '1px solid', borderColor: SG.line }}>
                <Typography sx={{ fontSize: 12.5, color: SG.muted }}>
                  Page {h.page} · {h.total} ticket{h.total !== 1 ? 's' : ''}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" disabled={h.page <= 1}
                    onClick={() => h.setPage(h.page - 1)}
                    sx={{ textTransform: 'none', borderColor: SG.line, color: SG.pine }}>Previous</Button>
                  <Button size="small" variant="outlined" disabled={h.page * 20 >= h.total}
                    onClick={() => h.setPage(h.page + 1)}
                    sx={{ textTransform: 'none', borderColor: SG.line, color: SG.pine }}>Next</Button>
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* ── Common answers ── */}
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SG.muted, mb: 1.25 }}>
        {q ? `Answers matching “${query.trim()}”` : 'Common questions'}
      </Typography>

      {articles.length === 0 ? (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: SG.line, borderRadius: '12px',
          p: 3, textAlign: 'center', mb: 2.5 }}>
          <Description sx={{ fontSize: 30, color: SG.faint }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: SG.pine, mt: 1 }}>
            No article covers that yet
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: SG.muted, mt: 0.5 }}>
            Raise a ticket below and a person on our team will pick it up.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25, mb: 2.5 }}>
          {articles.map((a) => {
            const Icon = a.icon;
            const open = openArt === a.id;
            return (
              <Paper key={a.id} elevation={0}
                onClick={() => setOpenArt(open ? null : a.id)}
                sx={{
                  border: '1px solid', borderColor: open ? SG.sageL : SG.line,
                  bgcolor: open ? SG.sageS : SG.paper,
                  borderRadius: '12px', p: 2, cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.3,1,0.4,1)',
                  '&:hover': { borderColor: SG.sageL, transform: 'translateY(-2px)',
                    boxShadow: '0 8px 22px rgba(2,33,36,0.07)' },
                }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                  <Icon sx={{ fontSize: 20, color: SG.sage, mt: 0.25, flex: '0 0 auto' }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: SG.pine, lineHeight: 1.4 }}>
                      {a.title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: SG.muted, mt: 0.5, lineHeight: 1.5 }}>
                      {a.blurb}
                    </Typography>
                  </Box>
                  <ExpandMore sx={{
                    fontSize: 18, color: SG.muted, flex: '0 0 auto',
                    transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s',
                  }} />
                </Box>
                {open && (
                  <Typography sx={{ fontSize: 13, color: SG.ink, lineHeight: 1.7,
                    mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: SG.sageL }}>
                    {a.body}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      {/* ── Still stuck ── */}
      <Paper elevation={0} sx={{
        bgcolor: SG.pine, borderRadius: '12px', p: { xs: 2, sm: 2.5 },
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
      }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: SG.paper }}>
            Still stuck?
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#9FB3AE', mt: 0.5, lineHeight: 1.5 }}>
            Raise a ticket and a person on our team replies within 24 hours.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={h.goToRaise}
          sx={{
            textTransform: 'none', fontWeight: 600, bgcolor: SG.sage, color: SG.paper,
            boxShadow: 'none', px: 2.5, py: 1.15, borderRadius: '8px',
            '&:hover': { bgcolor: SG.sageD, boxShadow: 'none' },
          }}>
          Raise a ticket
        </Button>
      </Paper>
    </>
  );
}


function RaiseViewContent({ h, user }) {
  const fileInputRef = useRef(null);

  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    h.addFormFiles(files);
    e.target.value = '';
  };

  /* Suggest help articles from the subject line — display only, no side effects */
  const suggested = useMemo(() => {
    const text = (h.form.subject || '').toLowerCase();
    if (text.trim().length < 4) return [];
    return articlesForRole(user?.role)
      .filter((a) => a.keywords.some((k) => text.includes(k)))
      .slice(0, 2);
  }, [h.form.subject, user?.role]);

  const rowSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '132px 1fr' },
    gap: { xs: 0.75, sm: 2 },
    alignItems: 'start',
    mb: 2.25,
  };
  const labelSx = {
    fontSize: 12.5, color: SG.pine,
    pt: { xs: 0, sm: 1.4 },
  };
  const fieldSx = {
    border: '1px solid', borderColor: SG.line, borderRadius: '9px',
    px: 1.75, py: 1.25, transition: 'all 0.18s',
    '&:focus-within': { borderColor: SG.sage, boxShadow: `0 0 0 3px ${SG.sageS}` },
  };
  const inputSx = {
    width: '100%', border: 0, outline: 0, bgcolor: 'transparent',
    fontFamily: 'inherit', fontSize: 13.5, color: SG.ink,
    '&::placeholder': { color: SG.faint },
  };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: SG.line, borderRadius: '14px', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 2, borderBottom: '1px solid', borderColor: SG.line,backgroundColor:'#93B097' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: SG.pine }}>
            New support ticket
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'fff', mt: 0.5 }}>
            Fields marked with a dot are required.
          </Typography>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          {/* Category */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>
              Category <Box component="span" sx={{ color: SG.sage }}>•</Box>
            </Typography>
            <Select fullWidth size="small" displayEmpty
              value={h.form.category || ''}
              onChange={(e) => h.updateForm('category', e.target.value)}
              sx={{
                borderRadius: '9px', fontSize: 13.5,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: SG.line },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: SG.sageL },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: SG.sage, borderWidth: 1 },
              }}>
              <MenuItem value="" disabled sx={{ fontSize: 13.5, color: SG.faint }}>
                Choose a category
              </MenuItem>
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value} sx={{ fontSize: 13.5 }}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Subject */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>
              Subject <Box component="span" sx={{ color: SG.sage }}>•</Box>
            </Typography>
            <Box>
              <Box sx={fieldSx}>
                <Box component="input" value={h.form.subject} maxLength={255}
                  onChange={(e) => h.updateForm('subject', e.target.value)}
                  placeholder="Interview room will not load for a candidate"
                  sx={inputSx} />
              </Box>
              <Typography sx={{ fontSize: 11, color: SG.faint, mt: 0.75 }}>
                Keep it to one line — details go below
              </Typography>

              {suggested.length > 0 && (
                <Box sx={{ ...RISE_IN, bgcolor: SG.sageS, borderRadius: '9px', p: 1.5, mt: 1.25,
                  animation: 'sgRise 0.4s cubic-bezier(0.2,0.8,0.3,1) both' }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#3F6B3E', mb: 0.5 }}>
                    These might answer it right away
                  </Typography>
                  {suggested.map((a, i) => (
                    <Box key={a.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, py: 0.85, cursor: 'pointer',
                        borderTop: i === 0 ? 'none' : '1px solid #D9E5D8',
                        '&:hover .sg-arrow': { transform: 'translateX(3px)' },
                      }}>
                      <Typography sx={{ fontSize: 12.5, color: SG.pine, flex: 1, lineHeight: 1.45 }}>
                        {a.title}
                      </Typography>
                      <ArrowForward className="sg-arrow"
                        sx={{ fontSize: 15, color: SG.sageD, flex: '0 0 auto', transition: 'transform 0.2s' }} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Description */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>
              Description <Box component="span" sx={{ color: SG.sage }}>•</Box>
            </Typography>
            <Box sx={fieldSx}>
              <Box component="textarea" rows={5} value={h.form.description}
                onChange={(e) => h.updateForm('description', e.target.value)}
                placeholder="What were you doing when it happened, what you expected instead, and anything you have already tried."
                sx={{ ...inputSx, resize: 'vertical', lineHeight: 1.65, display: 'block' }} />
            </Box>
          </Box>

          {/* Urgency */}
          <Box sx={{ ...rowSx, alignItems: 'center' }}>
            <Typography sx={{ ...labelSx, pt: 0 }}>Urgency</Typography>
            <Box sx={{
              display: 'inline-flex', width: 'fit-content', maxWidth: '100%', flexWrap: 'wrap',
              bgcolor: SG.cream, border: '1px solid', borderColor: SG.line,
              borderRadius: '9px', p: 0.375,
            }}>
              {PRIORITY_OPTIONS.map((p) => {
                const active = h.form.priority === p.value;
                return (
                  <Box key={p.value} onClick={() => h.updateForm('priority', p.value)}
                    sx={{
                      px: 1.9, py: 0.75, borderRadius: '6px', cursor: 'pointer',
                      fontSize: 12, fontWeight: active ? 600 : 500, whiteSpace: 'nowrap',
                      bgcolor: active ? SG.paper : 'transparent',
                      color: active ? SG.pine : SG.muted,
                      boxShadow: active ? '0 1px 2px rgba(2,33,36,0.10)' : 'none',
                      transition: 'all 0.18s',
                      '&:hover': { color: SG.pine },
                    }}>
                    {p.label}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Related to */}
          <Box sx={{ ...rowSx, alignItems: 'center' }}>
            <Typography sx={{ ...labelSx, pt: 0 }}>Related to</Typography>
            <Select fullWidth size="small" displayEmpty
              value={h.form.related_content_type}
              onChange={(e) => h.updateForm('related_content_type', e.target.value)}
              sx={{
                borderRadius: '9px', fontSize: 13.5,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: SG.line },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: SG.sageL },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: SG.sage, borderWidth: 1 },
              }}>
              <MenuItem value="" sx={{ fontSize: 13.5 }}>None</MenuItem>
              <MenuItem value="JOB_POSTING" sx={{ fontSize: 13.5 }}>Job Posting</MenuItem>
              <MenuItem value="APPLICATION" sx={{ fontSize: 13.5 }}>Job Application</MenuItem>
              <MenuItem value="COMPANY" sx={{ fontSize: 13.5 }}>Company</MenuItem>
              <MenuItem value="PERMISSION" sx={{ fontSize: 13.5 }}>Permissions</MenuItem>
              <MenuItem value="TALENT_POOL" sx={{ fontSize: 13.5 }}>Talent Pool</MenuItem>
            </Select>
          </Box>

          {/* Attachments */}
          <Box sx={{ ...rowSx, mb: 0 }}>
            <Typography sx={labelSx}>Attachments</Typography>
            <Box>
              <Box onClick={() => fileInputRef.current?.click()}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  border: '1px dashed', borderColor: SG.line, borderRadius: '9px',
                  px: 1.75, py: 1.5, cursor: 'pointer', transition: 'all 0.18s',
                  '&:hover': { borderColor: SG.sage, bgcolor: SG.sageS },
                }}>
                <CloudUpload sx={{ fontSize: 19, color: SG.sage, flex: '0 0 auto' }} />
                <Typography sx={{ fontSize: 12.5, color: SG.muted, lineHeight: 1.5 }}>
                  Drop files or browse — max 5, 10 MB each
                </Typography>
                <input ref={fileInputRef} type="file" hidden multiple
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                  onChange={handleFilePick} />
              </Box>

              {h.formFiles.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {h.formFiles.map((f, i) => (
                    <Box key={i}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1,
                        border: '1px solid', borderColor: SG.line, borderRadius: '9px',
                        transition: 'all 0.18s', '&:hover': { borderColor: SG.sageL, bgcolor: SG.cream },
                      }}>
                      <Box sx={{ color: SG.sageD, display: 'flex' }}>{fileIcon(f.name)}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: SG.pine }} noWrap>{f.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: SG.muted }}>{fmtSize(f.size)}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => h.removeFormFile(i)}
                        sx={{ color: SG.faint, '&:hover': { color: '#C0392B' } }}>
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5,
          px: { xs: 2, sm: 3 }, py: 2,
          borderTop: '1px solid', borderColor: SG.line, bgcolor: '#FBFCFA',
        }}>
          <Button variant="text" onClick={h.goToList}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12.5, color: SG.muted,
                  '&:hover': { bgcolor: SG.cream, color: SG.pine } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={h.submitTicket} disabled={h.submitting}
            startIcon={h.submitting ? <CircularProgress size={15} sx={{ color: SG.paper }} /> : <Send />}
            sx={{
              textTransform: 'none', fontWeight: 600, fontSize: 12.5,
              bgcolor: SG.pine, color: SG.paper,
              boxShadow: 'none', px: 2.5, borderRadius: '8px',
              '&:hover': { bgcolor: SG.pine2, boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: SG.line, color: SG.faint },
            }}>
            {h.submitting ? 'Submitting…' : 'Submit ticket'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   DETAIL VIEW
   ═══════════════════════════════════════════════════════════════════════ */
function DetailViewContent({ h, user }) {
  const fileInputRef = useRef(null);
  const { detail, detailLoading } = h;

  if (detailLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: SG.sage }} />
      </Box>
    );
  }
  if (!detail) return null;

  const t = detail.ticket;
  const isClosed = t.status === 'CLOSED';
  const isResolved = t.status === 'RESOLVED';
  const s = STATUS_CHIP[t.status] || STATUS_CHIP.OPEN;

  const handleReplyFiles = (e) => {
    h.addReplyFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  /* First message + responses as one ordered stream */
  const stream = [
    {
      id: 'first',
      admin: false,
      name: detail.raiserName,
      message: t.description,
      createdAt: t.createdAt,
    },
    ...(detail.responses || []).map((r) => ({
      id: r.id,
      admin: r.responderType === 'ADMIN',
      name: r.responderName || (r.responderType === 'ADMIN' ? 'iEvalX support' : 'You'),
      message: r.message,
      createdAt: r.createdAt,
    })),
  ];

  return (
   <Box sx={{ maxWidth: 880, mx: 'auto' }}>
      <Paper elevation={0} sx={{
        border: '1px solid', borderColor: SG.line, borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(2,33,36,0.04), 0 12px 32px -12px rgba(2,33,36,0.14)',
      }}>
        {/* Header */}
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Typography sx={{ fontSize: 19, fontWeight: 700, color: SG.pine, letterSpacing: -0.3 }}>
                {t.subject}
              </Typography>
              <Chip label={s.label} size="small"
                sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 23 }} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mt: 1 }}>
            <Typography sx={{ fontSize: 11.5, color: SG.muted,
              fontFamily: '"SF Mono","Fira Code",monospace' }}>
              {t.ticketNumber}
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: SG.faint }} />
            <Typography sx={{ fontSize: 11.5, color: SG.muted }}>{t.category}</Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: SG.faint }} />
            <Typography sx={{ fontSize: 11.5, color: SG.muted, textTransform: 'lowercase' }}>
              {t.priority} priority
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: SG.faint }} />
            <Typography sx={{ fontSize: 11.5, color: SG.muted }}>
              raised {fmtDate(t.createdAt)}
            </Typography>
          </Box>

          {t.resolutionSummary && (
            <Box sx={{ mt: 1.75, bgcolor: SG.sageS, borderRadius: '10px', px: 1.75, py: 1.25 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#3F6B3E', mb: 0.4,
                textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Resolution
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: SG.ink, lineHeight: 1.6 }}>
                {t.resolutionSummary}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Bubbles */}
        <Box sx={{
          px: { xs: 2, sm: 3 }, py: 3.5, display: 'flex', flexDirection: 'column', gap: 2.75,
          borderTop: '1px solid', borderColor: SG.line,
          background: `linear-gradient(180deg, ${SG.cream} 0%, #FCFDFB 42%, ${SG.paper} 100%)`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
        }}>
          {stream.map((m, i) => {
            const mine = !m.admin;
            return (
              <Box key={m.id}
                sx={{
                  ...RISE_IN,
                  display: 'flex', gap: 1.25, alignItems: 'flex-start',
                  flexDirection: mine ? 'row-reverse' : 'row',
                  animation: 'sgRise 0.45s cubic-bezier(0.2,0.8,0.3,1) both',
                  animationDelay: `${Math.min(i, 6) * 60}ms`,
                }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%', flex: '0 0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, mt: 2.5,
                  bgcolor: mine ? SG.pine : SG.sageS,
                  color:   mine ? SG.paper : '#3F6B3E',
                  border: '2px solid', borderColor: SG.paper,
                  boxShadow: mine
                    ? '0 3px 10px rgba(2,33,36,0.28)'
                    : '0 3px 10px rgba(127,158,126,0.30)',
                }}>
                  {initials(m.name)}
                </Box>
                <Box sx={{ maxWidth: '76%', minWidth: 0 }}>
                  <Typography sx={{
                    fontSize: 11.5, color: SG.muted, mb: 0.6,
                    textAlign: mine ? 'right' : 'left',
                  }}>
                    {m.name} · {fmtDate(m.createdAt)}, {fmtTime(m.createdAt)}
                  </Typography>
                  <Box sx={{
                    px: 2, py: 1.5,
                    borderRadius: mine ? '16px 16px 5px 16px' : '16px 16px 16px 5px',
                    background: mine
                      ? `linear-gradient(160deg, ${SG.pine2} 0%, ${SG.pine} 62%)`
                      : SG.paper,
                    border: '1px solid',
                    borderColor: mine ? SG.pine : SG.line,
                    boxShadow: mine
                      ? '0 2px 5px rgba(2,33,36,0.16), 0 10px 24px -10px rgba(2,33,36,0.42)'
                      : '0 1px 2px rgba(2,33,36,0.05), 0 8px 20px -12px rgba(2,33,36,0.20)',
                    transition: 'transform 0.24s cubic-bezier(0.3,1,0.4,1), box-shadow 0.24s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: mine
                        ? '0 4px 10px rgba(2,33,36,0.20), 0 18px 34px -12px rgba(2,33,36,0.50)'
                        : '0 3px 8px rgba(2,33,36,0.07), 0 16px 30px -12px rgba(2,33,36,0.26)',
                    },
                  }}>
                    <Typography sx={{
                      fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                      color: mine ? '#F2F4F0' : SG.ink,
                    }}>
                      {m.message}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Attachments */}
        {detail.attachments?.length > 0 && (
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: '1px solid', borderColor: SG.line }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: SG.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1 }}>
              Attachments ({detail.attachments.length})
            </Typography>
            <Stack spacing={1}>
              {detail.attachments.map((a) => (
                <Box key={a.id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 1.75, py: 1.25, borderRadius: '10px',
                    border: '1px solid', borderColor: SG.line, bgcolor: SG.paper,
                    transition: 'all 0.18s',
                    '&:hover': { borderColor: SG.sageL, bgcolor: SG.cream },
                  }}>
                  <Box sx={{ color: SG.sageD, display: 'flex' }}>{fileIcon(a.originalName)}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: SG.pine }} noWrap>{a.originalName}</Typography>
                    <Typography sx={{ fontSize: 11, color: SG.muted }}>{fmtSize(a.fileSizeBytes)}</Typography>
                  </Box>
                  {a.downloadUrl && (
                    <Tooltip title="Download">
                      <IconButton size="small" href={a.downloadUrl} target="_blank" rel="noopener"
                        sx={{ color: SG.muted, '&:hover': { color: SG.sageD } }}>
                        <Download fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!isClosed && (
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => h.deleteAttachment(a.id)}
                        sx={{ color: SG.faint, '&:hover': { color: '#C0392B' } }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Composer */}
        {!isClosed && (
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: '1px solid', borderColor: SG.line }}>
            {h.replyFiles.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 1.25, flexWrap: 'wrap' }} useFlexGap>
                {h.replyFiles.map((f, i) => (
                  <Chip key={i} label={f.name} size="small" onDelete={() => h.removeReplyFile(i)}
                    icon={fileIcon(f.name)}
                    sx={{ maxWidth: 200, bgcolor: SG.sageS, color: '#3F6B3E' }} />
                ))}
              </Stack>
            )}
            <Box sx={{
              display: 'flex', alignItems: 'flex-end', gap: 1,
              border: '1px solid', borderColor: SG.line, borderRadius: '16px',
              bgcolor: SG.paper,
              px: 1.75, py: 1.25, transition: 'all 0.22s cubic-bezier(0.3,1,0.4,1)',
              boxShadow: '0 1px 2px rgba(2,33,36,0.04), 0 6px 18px -12px rgba(2,33,36,0.24)',
              '&:hover': { borderColor: SG.sageL },
              '&:focus-within': {
                borderColor: SG.sage,
                boxShadow: `0 0 0 3px ${SG.sageS}, 0 10px 26px -12px rgba(2,33,36,0.28)`,
              },
            }}>
              <Box component="textarea" rows={2}
                value={h.replyText}
                onChange={(e) => h.setReplyText(e.target.value)}
                placeholder="Write a reply"
                sx={{
                  flex: 1, minWidth: 0, border: 0, outline: 0, resize: 'none',
                  bgcolor: 'transparent', fontFamily: 'inherit', fontSize: 13.5,
                  lineHeight: 1.6, color: SG.ink, py: 0.5,
                  '&::placeholder': { color: SG.faint },
                }} />
              <IconButton size="small" onClick={() => fileInputRef.current?.click()}
                sx={{ color: SG.muted, '&:hover': { color: SG.sageD } }}>
                <AttachFile fontSize="small" />
              </IconButton>
              <input ref={fileInputRef} type="file" hidden multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                onChange={handleReplyFiles} />
              <IconButton size="small"
                onClick={h.sendReply}
                disabled={h.replying || !h.replyText.trim()}
                sx={{
                  bgcolor: SG.sage, color: SG.paper, width: 34, height: 34, borderRadius: '10px',
                  transition: 'all 0.2s cubic-bezier(0.3,1,0.4,1)',
                  boxShadow: '0 2px 8px rgba(127,158,126,0.45)',
                  '&:hover': { bgcolor: SG.sageD, transform: 'translateY(-1px) scale(1.06)',
                               boxShadow: '0 5px 14px rgba(108,139,107,0.55)' },
                  '&.Mui-disabled': { bgcolor: SG.line, color: SG.faint, boxShadow: 'none' },
                }}>
                {h.replying ? <CircularProgress size={15} sx={{ color: SG.paper }} /> : <Send sx={{ fontSize: 16 }} />}
              </IconButton>
            </Box>
          </Box>
        )}

        {isClosed && (
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: '1px solid', borderColor: SG.line }}>
            <Typography sx={{ fontSize: 13, color: SG.muted, lineHeight: 1.6, textAlign: 'center' }}>
              This ticket is closed. Raise a new ticket if you need more help.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}