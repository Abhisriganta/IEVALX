// Theme entry — assembles palette, typography, shadows, and component overrides.
// Values are byte-identical to the original ThemeContext.jsx (just modularised).
import { createTheme } from '@mui/material/styles';
import palette from './palette';
import typography from './typography';
import shadows from './shadows';
import components from './components';

const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 10 },
  shadows,
  components,
});

export default theme;
