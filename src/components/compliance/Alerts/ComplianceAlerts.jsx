// BUILD: 2026-09-02-iaem-compliance-alerts-v3 — professional card layout
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Skeleton, Tabs, Tab, Chip } from '@mui/material';
import { Warning, Gavel, AccessTime, ChevronRight } from '@mui/icons-material';
import { complianceService } from '@/services/api/iaem';

/* ── Pine / sage tokens ─────────────────────────────────────────────── */
const P    = '#04282B';
const INK  = '#101210';
const BODY = '#2F332E';
const MUTED = '#55584F';
const FAINT = '#7A7E76';
const LINE  = '#E7EAE3';
const SUBTLE = '#F0F3EE';
const CREAM = '#F6F8F3';
const SAGE_SOFT = '#EDF3EC';
const FONT = "'Jost','DM Sans',sans-serif";

const ALERT_TYPES = {
  A7_FIRED:         { label: 'A7 Misconduct',    icon: Warning,     color: '#8B2E2E', bg: '#FAEAE8', border: 'rgba(139,46,46,0.2)' },
  FORMAL_ACTION:    { label: 'Formal Action',    icon: Gavel,       color: '#A35A2D', bg: '#F6ECDF', border: 'rgba(163,90,45,0.2)' },
  SLA_BREACH:       { label: 'SLA Breach',       icon: AccessTime,  color: '#8B2E2E', bg: '#FAEAE8', border: 'rgba(139,46,46,0.2)' },
  IGNORE_A7_COSIGN: { label: 'Co-Sign Required', icon: Gavel,       color: '#A35A2D', bg: '#F6ECDF', border: 'rgba(163,90,45,0.2)' },
};

/* ── Alert row ──────────────────────────────────────────────────────── */
const AlertRow = ({ alert, onClick }) => {
  const t = ALERT_TYPES[alert.alert_type] || ALERT_TYPES.A7_FIRED;
  const Icon = t.icon;
  const unread = !alert.is_read;
  const ts = new Date(alert.created_at);
  const dateStr = ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        px: 2.5, py: 2,
        cursor: 'pointer',
        borderBottom: `1px solid ${LINE}`,
        bgcolor: unread ? CREAM : 'transparent',
        transition: 'background 0.15s ease',
        '&:hover': { bgcolor: SAGE_SOFT },
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Severity dot */}
      <Box sx={{
        width: 36, height: 36, borderRadius: '10px',
        bgcolor: t.bg, border: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 18, color: t.color }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
          <Chip label={t.label} size="small" sx={{
            height: 20, fontSize: '0.65rem', fontWeight: 700, fontFamily: FONT,
            bgcolor: t.bg, color: t.color, border: `1px solid ${t.border}`,
            borderRadius: '6px',
          }} />
          {unread && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: P, flexShrink: 0 }} />
          )}
        </Box>
        <Typography sx={{
          fontWeight: unread ? 700 : 500, color: INK, fontFamily: FONT,
          fontSize: '0.88rem', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {alert.case_id} — {alert.interviewer_name}
        </Typography>
      </Box>

      {/* Timestamp + arrow */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: '0.72rem', color: FAINT, fontFamily: FONT, fontWeight: 500, lineHeight: 1.3 }}>
            {dateStr}
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: FAINT, fontFamily: FONT, lineHeight: 1.3 }}>
            {timeStr}
          </Typography>
        </Box>
        <ChevronRight sx={{ fontSize: 18, color: LINE }} />
      </Box>
    </Box>
  );
};

/* ── Main ───────────────────────────────────────────────────────────── */
const ComplianceAlerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const ALERTS_PER_PAGE = 7;

  useEffect(() => {
    complianceService.getAlerts()
      .then(r => setAlerts(r.data.alerts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const TABS = [
    { key: 'ALL',            label: 'All' },
    { key: 'A7_FIRED',       label: 'Misconduct' },
    { key: 'FORMAL_ACTION',  label: 'Formal Action' },
    { key: 'SLA_BREACH',     label: 'SLA Breach' },
  ];

  const filtered = tab === 0
    ? alerts
    : alerts.filter(a => a.alert_type === TABS[tab].key);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography sx={{
            fontWeight: 800, color: INK, fontFamily: FONT,
            fontSize: { xs: '1.25rem', sm: '1.4rem' }, letterSpacing: '-0.01em',
          }}>
            Critical Alerts
          </Typography>
          <Typography sx={{ fontSize: '0.82rem', color: MUTED, fontFamily: FONT, mt: 0.3 }}>
            {unreadCount > 0
              ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''} requiring attention`
              : 'No unread alerts'}
          </Typography>
        </Box>
        <Chip
          label={alerts.length}
          size="small"
          sx={{
            fontWeight: 700, fontFamily: FONT, fontSize: '0.78rem',
            bgcolor: SUBTLE, color: MUTED, border: `1px solid ${LINE}`,
            height: 26, borderRadius: '8px',
          }}
        />
      </Box>

      {/* Tabs + list */}
      <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${LINE}`, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: `1px solid ${LINE}` }}>
          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setPage(0); }}
            sx={{
              px: 1.5, minHeight: 42,
              '& .MuiTab-root': {
                textTransform: 'none', fontWeight: 600, fontFamily: FONT,
                color: FAINT, fontSize: '0.82rem', minHeight: 42, px: 2,
                '&.Mui-selected': { color: P, fontWeight: 700 },
              },
              '& .MuiTabs-indicator': { backgroundColor: P, height: 2.5, borderRadius: '2px 2px 0 0' },
            }}
          >
            {TABS.map((t, i) => {
              const count = i === 0 ? alerts.length : alerts.filter(a => a.alert_type === t.key).length;
              return (
                <Tab
                  key={t.key}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <span>{t.label}</span>
                      {count > 0 && (
                        <Box sx={{
                          fontSize: '0.62rem', fontWeight: 700,
                          bgcolor: i === 0 ? SUBTLE : (ALERT_TYPES[t.key]?.bg || SUBTLE),
                          color: i === 0 ? MUTED : (ALERT_TYPES[t.key]?.color || MUTED),
                          px: 0.75, py: 0.15, borderRadius: '5px', lineHeight: 1.4,
                        }}>
                          {count}
                        </Box>
                      )}
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Box>

        {/* List */}
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2, mb: 1 }} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ color: FAINT, fontFamily: FONT, fontSize: '0.88rem' }}>
              No alerts in this category.
            </Typography>
          </Box>
        ) : (
          <>
            <Box>
              {filtered.slice(page * ALERTS_PER_PAGE, (page + 1) * ALERTS_PER_PAGE).map(a => (
                <AlertRow
                  key={a.id}
                  alert={a}
                  onClick={() => navigate(`/compliance/cases/${a.case_pk || a.case_id}`)}
                />
              ))}
            </Box>
            {(() => {
              const totalPages = Math.ceil(filtered.length / ALERTS_PER_PAGE);
              if (totalPages <= 1) return null;
              return (
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  px: 2.5, py: 1.25, borderTop: `1px solid ${LINE}`, bgcolor: SUBTLE,
                }}>
                  <Typography sx={{ fontSize: '0.75rem', color: FAINT, fontFamily: FONT }}>
                    {page * ALERTS_PER_PAGE + 1}–{Math.min((page + 1) * ALERTS_PER_PAGE, filtered.length)} of {filtered.length} alerts
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box onClick={() => page > 0 && setPage(p => p - 1)}
                      sx={{
                        width: 28, height: 28, borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 600, fontFamily: FONT,
                        color: page === 0 ? LINE : MUTED,
                        cursor: page === 0 ? 'default' : 'pointer',
                        border: `1px solid ${page === 0 ? LINE : '#D5DAD2'}`,
                        bgcolor: 'transparent',
                        transition: 'all 0.15s',
                        '&:hover': page > 0 ? { bgcolor: SAGE_SOFT, borderColor: P, color: P } : {},
                      }}>‹</Box>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Box key={i} onClick={() => setPage(i)}
                        sx={{
                          width: 28, height: 28, borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.72rem', fontWeight: i === page ? 700 : 500, fontFamily: FONT,
                          color: i === page ? '#FFFFFF' : MUTED,
                          bgcolor: i === page ? P : 'transparent',
                          border: `1px solid ${i === page ? P : '#D5DAD2'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                          '&:hover': i !== page ? { bgcolor: SAGE_SOFT, borderColor: P, color: P } : {},
                        }}>{i + 1}</Box>
                    ))}
                    <Box onClick={() => page < totalPages - 1 && setPage(p => p + 1)}
                      sx={{
                        width: 28, height: 28, borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 600, fontFamily: FONT,
                        color: page >= totalPages - 1 ? LINE : MUTED,
                        cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                        border: `1px solid ${page >= totalPages - 1 ? LINE : '#D5DAD2'}`,
                        bgcolor: 'transparent',
                        transition: 'all 0.15s',
                        '&:hover': page < totalPages - 1 ? { bgcolor: SAGE_SOFT, borderColor: P, color: P } : {},
                      }}>›</Box>
                  </Box>
                </Box>
              );
            })()}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ComplianceAlerts;