// MUI component overrides — extracted from original ThemeContext.jsx (unchanged).
const components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: '#EEF4FC',
        fontFamily: "'DM Sans', sans-serif",
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 20px',
        fontWeight: 500,
        boxShadow: 'none',
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: 'none', transform: 'translateY(-1px)' },
        '&:active': { transform: 'translateY(0)' },
      },
      contained: {
        '&:hover': { boxShadow: '0 4px 12px rgba(70,102,184,0.25)' },
      },
      outlined: {
        borderWidth: '1.5px',
        '&:hover': { borderWidth: '1.5px' },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 14,
        border: '1px solid #D5E6F7',
        boxShadow: 'none',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { borderRadius: 12 },
      outlined: { border: '1px solid #D5E6F7' },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          backgroundColor: '#F4F8FD',
          transition: 'all 0.2s ease',
          '& fieldset': { borderColor: '#D5E6F7', borderWidth: '1.5px' },
          '&:hover fieldset': { borderColor: '#79AFEC' },
          '&.Mui-focused fieldset': { borderColor: '#4666B8', borderWidth: '1.5px' },
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        fontSize: '0.78rem',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: '#1A2A4A',
        color: '#E8F1FC',
        border: 'none',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        margin: '1px 4px',
        padding: '8px 12px',
        transition: 'all 0.15s ease',
        '&.Mui-selected': {
          backgroundColor: 'rgba(121,175,236,0.13)',
          '&:hover': { backgroundColor: 'rgba(121,175,236,0.18)' },
        },
        '&:hover': { backgroundColor: 'rgba(121,175,236,0.07)' },
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-head': {
          backgroundColor: '#F5F9FE',
          fontWeight: 700,
          fontSize: '0.68rem',
          color: '#7A95C0',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: '1px solid #EBF3FB',
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: { borderBottom: '1px solid #F2F7FD', padding: '12px 16px' },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        textTransform: 'none',
        fontSize: '0.9rem',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 12 },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: { borderRadius: 4, height: 6 },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: { borderColor: '#D5E6F7' },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: '#FFFFFF',
        color: '#1A2A4A',
        boxShadow: '0 1px 0 #D5E6F7',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      // Pine tooltip — matches the app's pine/sage system (Jost, rounded,
      // soft shadow) instead of the old navy bubble.
      tooltip: {
        backgroundColor: '#022124',
        color: '#FFFFFF',
        fontFamily: "'Jost','DM Sans',sans-serif",
        fontSize: '0.76rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        borderRadius: 8,
        padding: '6px 10px',
        boxShadow: '0 6px 18px rgba(2,33,36,0.28)',
      },
      arrow: {
        color: '#022124',
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        backgroundColor: '#F4F8FD',
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: { fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.7rem' },
    },
  },
};

export default components;