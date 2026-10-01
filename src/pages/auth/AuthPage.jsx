import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import LoginForm             from './components/LoginForm';
import ForgotPasswordForm    from './components/ForgotPasswordForm';
import CompanyRegisterForm   from './components/CompanyRegisterForm';
import JobseekerRegisterForm from './components/JobseekerRegisterForm';
import InterviewerRegisterForm from './components/InterviewerRegisterForm'; // BUILD: 2026-08-24-iaem-gaps-v1
import { ThemeProvider } from '@mui/material/styles';
import publicSageTheme from '@/theme/publicSageTheme';
import { AC, FONT, AuthBrand, RightPanel, Eyebrow } from './authTheme';


const ART_LEFT_VIEWS = ['login', 'forgot'];
const EASE  = 'cubic-bezier(0.22,1,0.36,1)';
const SLIDE = `transform 0.65s ${EASE}`;

const PANEL_W = 50;  
const SHIFT   = 100;  

const RoleCard = ({ icon, title, desc, onClick }) => (
  <Box
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    sx={{
      border: `1px solid ${AC.line}`,
      borderRadius: '16px',
      p: 3,
      textAlign: 'center',
      cursor: 'pointer',
      bgcolor: AC.white,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1.25,
      outline: 'none',
      transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
      '&:hover, &:focus-visible': {
        borderColor: AC.sage,
        bgcolor: AC.sageSoft,
        transform: 'translateY(-3px)',
        boxShadow: '0 14px 30px rgba(2,33,36,0.10)',
      },
    }}
  >
    <Box sx={{
      width: 58, height: 58, borderRadius: '14px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 26, bgcolor: AC.sageSoft, border: `1px solid rgba(127,158,126,0.3)`,
    }}>
      {icon}
    </Box>
    <Typography sx={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: AC.ink }}>
      {title}
    </Typography>
    <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: AC.muted, lineHeight: 1.55 }}>
      {desc}
    </Typography>
    <Typography sx={{ fontSize: 18, color: AC.sage }}>→</Typography>
  </Box>
);

const RoleSelector = ({ onSelect, onBack }) => (
  <Box>
    <Eyebrow label="GET STARTED" />
    <Typography sx={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, letterSpacing: '-1.2px', color: AC.ink, mb: 0.75 }}>
      Create an{' '}
      <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: AC.sage }}>account</Box>
    </Typography>
    <Typography sx={{ fontFamily: FONT, fontSize: 13, color: AC.muted, mb: 3, lineHeight: 1.6 }}>
      How would you like to join <Box component="span" sx={{ color: AC.ink, fontWeight: 600 }}>IEvalx</Box>?
    </Typography>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
      <RoleCard
        icon="🏢"
        title="I'm a Company"
        desc="Post jobs and hire talent with AI-powered screening."
        onClick={() => onSelect('register-company')}
      />
      <RoleCard
        icon="👤"
        title="I'm a Jobseeker"
        desc="Build your profile, take AI interviews, get matched."
        onClick={() => onSelect('register-jobseeker')}
      />
      {/* BUILD: 2026-08-24-iaem-gaps-v1 — Interviewer registration card */}
      <RoleCard
        icon="🎙️"
        title="I'm an Interviewer"
        desc="Conduct interviews, submit evaluations, get calibrated."
        onClick={() => onSelect('register-interviewer')}
      />
    </Box>

    <Typography sx={{ fontFamily: FONT, textAlign: 'center', fontSize: 12.5, color: AC.muted }}>
      Already have an account?{' '}
      <Box
        component="span"
        onClick={() => onBack('login')}
        sx={{ color: AC.sageDark, fontWeight: 600, cursor: 'pointer', '&:hover': { color: AC.sage } }}
      >
        Sign in
      </Box>
    </Typography>
  </Box>
);

const AuthPage = () => {
  const navigate = useNavigate();
 
  const [view, setView] = useState(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    const allowed = ['login', 'register', 'register-company', 'register-jobseeker', 'register-interviewer', 'forgot'];
    return allowed.includes(v) ? v : 'login';
  });
  const forgotBackRef = useRef(null);

  const goHome = () => navigate('/');

  
  const isWide  = view === 'register-company' || view === 'register-jobseeker' || view === 'register-interviewer'; // BUILD: 2026-08-24-iaem-gaps-v1
  const artLeft = ART_LEFT_VIEWS.includes(view);

  const inWizard = view === 'register-company' || view === 'register-jobseeker' || view === 'register-interviewer'; // BUILD: 2026-08-24-iaem-gaps-v1

  return (
    <Box sx={{
      minHeight: '100vh',
      position: 'relative',
      bgcolor: AC.cream,
      fontFamily: FONT,
    }}>

      <Box sx={{
        width: { xs: '100%', md: `${PANEL_W}%` },
        minWidth: 0,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
        p: { xs: '28px 22px', sm: '40px 44px', lg: '48px 56px' },
        transform: { xs: 'none', md: artLeft ? `translateX(${SHIFT}%)` : 'none' },
        transition: SLIDE,
        willChange: 'transform',
      }}>

        {/* Top row: mobile brand + back-to-home */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: { xs: 3, md: 2 } }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <AuthBrand onClick={goHome} size="sm" />
          </Box>
          <Box
            onClick={() => {
              if (inWizard) { setView('register'); return; }
              if (view === 'forgot' && forgotBackRef.current) { forgotBackRef.current(); return; }
              goHome();
            }}
            sx={{
              ml: 'auto',
              display: 'flex', alignItems: 'center', gap: 0.5,
              fontFamily: FONT, fontSize: 13, color: AC.muted, cursor: 'pointer',
              '&:hover': { color: AC.ink },
            }}
          >
            <ArrowBack sx={{ fontSize: 15 }} /> {inWizard || view === 'forgot' ? 'Back' : 'Back to home'}
          </Box>
        </Stack>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Box
            key={view}
            sx={{
              width: '100%',
              minWidth: 0,
              maxWidth: isWide ? 660 : 400,
              mx: 'auto',
              animation: 'authIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
              animationDelay: '0.12s',
              '@keyframes authIn': {
                from: { opacity: 0, transform: 'translateY(14px)' },
                to:   { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            {view === 'login'    && <LoginForm    onSwitch={setView} />}
            {view === 'register' && <RoleSelector onSelect={setView} onBack={setView} />}

          
            {view === 'register-company' && (
              <ThemeProvider theme={publicSageTheme}>
                <CompanyRegisterForm onSwitch={setView} />
              </ThemeProvider>
            )}
            {view === 'register-jobseeker' && (
              <ThemeProvider theme={publicSageTheme}>
                <JobseekerRegisterForm onSwitch={setView} />
              </ThemeProvider>
            )}
            {/* BUILD: 2026-08-24-iaem-gaps-v1 — Interviewer registration form */}
            {view === 'register-interviewer' && (
              <ThemeProvider theme={publicSageTheme}>
                <InterviewerRegisterForm onSwitch={setView} />
              </ThemeProvider>
            )}

            {view === 'forgot' && <ForgotPasswordForm onSwitch={setView} backRef={forgotBackRef} />}
          </Box>
        </Box>
      </Box>

      <Box sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: `${PANEL_W}%`,
        display: { xs: 'none', md: 'block' },
        zIndex: 2,
        transform: artLeft ? 'none' : `translateX(${SHIFT}%)`,
        transition: SLIDE,
        willChange: 'transform',
        pointerEvents: 'none',
      }}>
        <Box sx={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          pointerEvents: 'auto',
        }}>
         
          <RightPanel />
        </Box>
      </Box>

    </Box>
  );
};

export default AuthPage;