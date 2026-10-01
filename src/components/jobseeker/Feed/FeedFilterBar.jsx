

import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  RocketLaunchRounded, InfoOutlined, CelebrationRounded,
  FavoriteBorderRounded, WidgetsOutlined,
  NotificationsNoneRounded,
} from '@mui/icons-material';

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
};

const CHIPS = [
  { value: null,       label: 'All',       Icon: WidgetsOutlined,       color: T.pine    },
  { value: 'NEWS',     label: 'News',      Icon: RocketLaunchRounded,   color: '#5E815D' },
  { value: 'UPDATE',   label: 'Updates',   Icon: InfoOutlined,          color: '#185FA5' },
  { value: 'EVENT',    label: 'Events',    Icon: CelebrationRounded,    color: '#8A6A1F' },
  { value: 'GREETING', label: 'Greetings', Icon: FavoriteBorderRounded, color: '#712B13' },
  { value: 'ANNOUNCEMENT', label: 'Announcements', Icon: NotificationsNoneRounded, color: '#022124' },
];

const FeedFilterBar = ({ activeType, totalCount, onChange }) => (
  <Stack
    direction="row"
    spacing={0.75}
    sx={{
      flexWrap: 'wrap', rowGap: 0.75,
      fontFamily: "'Jost','DM Sans',sans-serif",
    }}
  >
    {CHIPS.map(({ value, label, Icon, color }) => {
      const active = activeType === value;
      return (
        <Box
          key={value ?? 'all'}
          onClick={() => onChange?.(value)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange?.(value); }
          }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1.25, py: 0.5, borderRadius: '999px',
            fontSize: '0.75rem', fontWeight: 700,
            cursor: 'pointer', userSelect: 'none',
            transition: 'all 0.15s ease',
            bgcolor: active ? T.pine : T.white,
            color:   active ? T.white : color,
            border: `1px solid ${active ? T.pine : T.lineSoft}`,
            '&:hover': {
              bgcolor: active ? T.pine : T.sageSoft,
              borderColor: active ? T.pine : T.line,
            },
            '&:focus-visible': { outline: `2px solid ${T.sage}`, outlineOffset: 2 },
          }}
        >
          <Icon sx={{ fontSize: 15 }} />
          <Typography component="span" sx={{
            fontSize: '0.75rem', fontWeight: 700,
            fontFamily: "'Jost','DM Sans',sans-serif",
          }}>
            {label}
            {value === null && totalCount != null && (
              <Typography component="span" sx={{
                fontSize: '0.72rem', fontWeight: 700,
                color: active ? 'rgba(255,255,255,0.75)' : T.muted,
                ml: 0.5,
              }}>
                · {totalCount}
              </Typography>
            )}
          </Typography>
        </Box>
      );
    })}
  </Stack>
);

export default React.memo(FeedFilterBar);