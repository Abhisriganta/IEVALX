import React, { useMemo } from 'react';
import { Box, Stack, Typography, Avatar, Divider } from '@mui/material';
import { CalendarTodayRounded, TrendingUpRounded, CloseRounded } from '@mui/icons-material';

const T = {
  ink:      '#101210',
  sage:     '#7F9E7E',
  sageText: '#5E815D',
  pine:     '#022124',
  cream:    '#F6F8F3',
  white:    '#FFFFFF',
  muted:    '#55584F',
  line:     '#E7EAE3',
  lineSoft: '#D8DDD4',
  sageSoft: '#EDF3EC',
  sageStrong: 'rgba(143,176,142,0.30)',
};

const scrollbarSx = {
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: T.lineSoft,
    borderRadius: 4,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: T.sage,
  },
  scrollbarWidth: 'thin',
  scrollbarColor: `${T.lineSoft} transparent`,
};

const RailCard = ({ title, icon: Icon, children, action }) => (
  <Box sx={{
    bgcolor: T.white,
    border: `1px solid ${T.line}`,
    borderRadius: '12px',
    p: 1.5,
    fontFamily: "'Jost','DM Sans',sans-serif",
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  }}>
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1, flexShrink: 0 }}>
      {Icon && <Icon sx={{ fontSize: 15, color: T.sage }} />}
      <Typography sx={{
        fontSize: '0.78rem', fontWeight: 800, color: T.ink,
        letterSpacing: '-0.01em',
      }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1 }} />
      {action}
    </Stack>
    {children}
  </Box>
);

const formatEventBlock = (iso) => {
  if (!iso) return { day: '--', month: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: '--', month: '' };
  return {
    day:   d.toLocaleDateString(undefined, { day: 'numeric' }),
    month: d.toLocaleDateString(undefined, { month: 'short' }),
  };
};

const FeedRightRail = ({
  upcomingEvents = [],
  posts = [],
  activeCompanyId = null,
  onCompanyClick = () => {},
}) => {
  /* Aggregate companies from loaded posts */
  const trending = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => {
      const key = p.company?.id;
      if (!key) return;
      const rec = map.get(key) || {
        id:   key,
        name: p.company?.name,
        logo: p.company?.logo,
        count: 0,
      };
      rec.count += 1;
      map.set(key, rec);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // was 6 — allow scroll for more
  }, [posts]);

  const handleRowClick = (companyId) => {
    if (activeCompanyId === companyId) onCompanyClick(null);
    else                                onCompanyClick(companyId);
  };

  return (
    <Stack spacing={1.5} sx={{ minHeight: 0 }}>
      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <RailCard title="Upcoming events" icon={CalendarTodayRounded}>
          <Stack divider={<Divider sx={{ borderColor: T.cream }} />}>
            {upcomingEvents.map((ev) => {
              const { day, month } = formatEventBlock(ev.event_date);
              return (
                <Stack
                  key={ev.id}
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={{ py: 0.75 }}
                >
                  <Box sx={{
                    width: 40, textAlign: 'center', flexShrink: 0,
                    bgcolor: T.cream, borderRadius: '8px', py: 0.5,
                    border: `1px solid ${T.line}`,
                  }}>
                    <Typography sx={{
                      fontSize: '0.55rem', fontWeight: 800,
                      color: '#8A6A1F', letterSpacing: '0.08em',
                      textTransform: 'uppercase', lineHeight: 1,
                    }}>
                      {month}
                    </Typography>
                    <Typography sx={{
                      fontSize: '1rem', fontWeight: 800, color: T.ink, lineHeight: 1.1, mt: 0.25,
                    }}>
                      {day}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{
                      fontSize: '0.78rem', fontWeight: 700, color: T.ink,
                      letterSpacing: '-0.01em',
                    }}>
                      {ev.title}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.25 }}>
                      {ev.company?.name}
                      {ev.event_location ? ` · ${ev.event_location}` : ''}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </RailCard>
      )}

      {/* Active companies — INTERNAL SCROLL */}
      {trending.length > 0 && (
        <RailCard
          title="Active companies"
          icon={TrendingUpRounded}
          action={
            activeCompanyId && (
              <Box
                onClick={() => onCompanyClick(null)}
                role="button"
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.4,
                  fontSize: '0.62rem', fontWeight: 700, color: T.sageText,
                  cursor: 'pointer', px: 0.75, py: 0.25, borderRadius: '6px',
                  '&:hover': { bgcolor: T.sageSoft, color: T.pine },
                }}
              >
                <CloseRounded sx={{ fontSize: 12 }} />
                Clear
              </Box>
            )
          }
        >
          {/* Scrollable inner region */}
          <Box sx={{
            maxHeight: 340,          // ~5-6 rows before scroll
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 0.5,                  // room for scrollbar
            mr: -0.5,
            ...scrollbarSx,
          }}>
            <Stack divider={<Divider sx={{ borderColor: T.cream }} />}>
              {trending.map((c) => {
                const isSelected = activeCompanyId === c.id;
                return (
                  <Stack
                    key={c.id}
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    onClick={() => handleRowClick(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(c.id);
                      }
                    }}
                    sx={{
                      py: 0.75, px: 0.75, mx: -0.75,
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease',
                      bgcolor:   isSelected ? T.sageStrong : 'transparent',
                      '&:hover': { bgcolor: isSelected ? T.sageStrong : T.sageSoft },
                      '&:focus-visible': { outline: `2px solid ${T.sage}`, outlineOffset: 1 },
                    }}
                  >
                    <Avatar
                      src={c.logo || undefined}
                      variant="rounded"
                      sx={{
                        width: 30, height: 30, borderRadius: '8px',
                        bgcolor: T.sageSoft, color: T.sageText,
                        fontSize: '0.7rem', fontWeight: 700,
                        fontFamily: "'Jost','DM Sans',sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      {(c.name || 'CO').split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 800 : 700,
                        color: isSelected ? T.pine : T.ink,
                      }}>
                        {c.name}
                      </Typography>
                      <Typography sx={{
                        fontSize: '0.68rem',
                        color: isSelected ? T.sageText : T.muted,
                        fontWeight: isSelected ? 700 : 500,
                        mt: 0.15,
                      }}>
                        {isSelected
                          ? 'Showing this company only'
                          : `${c.count} post${c.count === 1 ? '' : 's'}`}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        </RailCard>
      )}
    </Stack>
  );
};

export default React.memo(FeedRightRail);