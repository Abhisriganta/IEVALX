// ============================================================================
// publicSageTheme.js                                                    (NEW)
// Scoped MUI theme for every PUBLIC surface — the landing page and everything
// under PublicLayout (/jobs, /categories, /jobs/:id, /blogs, /support).
//
// WHY THIS EXISTS:
// The app-wide theme (src/theme/*) is the ORIGINAL BLUE dashboard system —
// primary #4666B8, navy text #1A2A4A, blue-tinted greys/dividers, and a
// MuiDrawer override that paints every drawer navy (#1A2A4A). Public pages
// render inside that provider, so any MUI default that wasn't explicitly
// styled leaked blue: the /jobs mobile filter drawer, checkbox ticks,
// text-field focus rings, select backgrounds, dividers.
//
// Wrapping the public roots in <ThemeProvider theme={publicSageTheme}> fully
// REPLACES the blue theme for that subtree (nested MUI providers don't
// merge), giving the sage/pine system everywhere — while the jobseeker /
// employer / admin dashboards keep their existing blue theme untouched.
//
// Tokens mirror src/pages/landing/theme.js (C.*) — keep the two in sync.
// ============================================================================

import { createTheme } from '@mui/material/styles';

const SAGE      = '#7F9E7E';
const SAGE_DARK = '#6C8B6B';
const SAGE_SOFT = '#EDF3EC';
const PINE      = '#022124';
const PINE_2    = '#24433E';
const INK       = '#1F1F1F';
const MUTED     = '#6F7470';
const LINE      = '#E7EAE3';
const CREAM     = '#F6F8F3';

const FONT = "'Jost','DM Sans',sans-serif";

const publicSageTheme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: SAGE, light: SAGE_SOFT, dark: SAGE_DARK, contrastText: '#FFFFFF' },
    secondary: { main: PINE, light: PINE_2, dark: '#01181A', contrastText: '#FFFFFF' },
    background: { default: CREAM, paper: '#FFFFFF' },
    text: { primary: INK, secondary: MUTED, disabled: '#A8ADA8' },
    divider: LINE,
    success: { main: SAGE_DARK, light: SAGE_SOFT, contrastText: '#FFFFFF' },
    warning: { main: '#C08A5B', light: '#F7EFE6', contrastText: '#FFFFFF' },
    error:   { main: '#C0392B', light: '#F9ECEB', contrastText: '#FFFFFF' },
    info:    { main: '#4B9E9A', light: '#E8F4F3', contrastText: '#FFFFFF' },
    grey: {
      50:  '#F6F8F3',
      100: '#EDF3EC',
      200: '#E7EAE3',
      300: '#CDD4CC',
      400: '#A8ADA8',
      500: '#6F7470',
      600: '#565B57',
      700: '#3E443F',
      800: '#2C2C2C',
      900: '#1F1F1F',
    },
  },

  typography: {
    fontFamily: FONT,
    h1: { fontFamily: FONT, fontWeight: 700, color: INK },
    h2: { fontFamily: FONT, fontWeight: 700, color: INK },
    h3: { fontFamily: FONT, fontWeight: 700, color: INK },
    h4: { fontFamily: FONT, fontWeight: 600, color: INK },
    h5: { fontFamily: FONT, fontWeight: 600, color: INK },
    h6: { fontFamily: FONT, fontWeight: 600, color: INK },
    subtitle2: { color: MUTED },
    body2: { color: MUTED },
    caption: { color: MUTED },
    button: { fontFamily: FONT, fontWeight: 500, textTransform: 'none' },
  },

  shape: { borderRadius: 10 },

  components: {
    /* THE navy-drawer fix: public drawers (the /jobs mobile filter sheet)
       are cream with ink text — never the dashboard's #1A2A4A. */
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: CREAM,
          color: INK,
          border: 'none',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'all 0.25s ease',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          '&:hover': { boxShadow: '0 8px 20px rgba(127,158,126,0.28)' },
        },
        outlined: { borderWidth: '1.5px', '&:hover': { borderWidth: '1.5px' } },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#FFFFFF',
            '& fieldset': { borderColor: LINE, borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: SAGE },
            '&.Mui-focused fieldset': { borderColor: SAGE, borderWidth: '1.5px' },
          },
        },
      },
    },

    // Neutralise the dashboard's pale-blue select background.
    MuiSelect: {
      styleOverrides: {
        root: { backgroundColor: 'transparent' },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: 'rgba(31,31,31,0.3)',
          '&.Mui-checked': { color: SAGE },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          color: 'rgba(31,31,31,0.3)',
          '&.Mui-checked': { color: SAGE },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': { color: SAGE },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: SAGE },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
        outlined: { border: `1px solid ${LINE}` },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontFamily: FONT, fontWeight: 500 },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: LINE },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: 'rgba(127,158,126,0.14)',
            '&:hover': { backgroundColor: 'rgba(127,158,126,0.2)' },
          },
          '&:hover': { backgroundColor: 'rgba(127,158,126,0.08)' },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: PINE,
          color: '#FFFFFF',
          fontFamily: FONT,
          fontSize: '0.76rem',
          fontWeight: 600,
          borderRadius: 8,
          padding: '6px 10px',
          boxShadow: '0 6px 18px rgba(2,33,36,0.28)',
        },
        arrow: { color: PINE },
      },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(31,31,31,0.08)' },
      },
    },

    MuiCircularProgress: {
      styleOverrides: {
        root: { color: SAGE },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: SAGE_SOFT },
        bar: { backgroundColor: SAGE },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: INK,
          boxShadow: `0 1px 0 ${LINE}`,
        },
      },
    },
  },
});

export default publicSageTheme;