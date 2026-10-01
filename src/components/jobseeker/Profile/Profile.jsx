

import React, { useCallback } from 'react';
import {
  Box, Container, Grid, Typography, Stack, Card, Button,
  LinearProgress, Avatar, Skeleton, Alert, IconButton, Tooltip,
} from '@mui/material';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';

import useJobseekerProfile, { computeCompletion as computeCompletionV2 }
  from '@/hooks/jobseeker/useJobseekerProfile';
import { PROFILE_SECTIONS, PALETTE, FONTS } from '@/constants/profileConstants';

import {
  usePersonalDetailsEditor,
  usePhotoEditor,
} from '@/hooks/jobseeker/usePersonalDetailsEditor';
import {
  PhotoSection,
  PersonalDetailsSection,
  OnlineProfilesSection,
  QuickInterviewSection,
} from './sections/IdentitySections';
import ProfileHeroCard from './sections/ProfileHeroCard';
import EducationSection from './sections/EducationSection';
import EmploymentSection from './sections/EmploymentSection';
import ResumeSection from './sections/ResumeSection';
import KeySkillsSection from './sections/KeySkillsSection';
import LanguagesSection from './sections/LanguagesSection';
import ProjectsSection from './sections/ProjectsSection';
import CareerProfileSection from './sections/CareerProfileSection';
import DiversitySection from './sections/DiversitySection';
import { CertificationsSection, AccomplishmentsSection } from './sections/AccomplishmentSections';
import { HeadlineSection, SummarySection } from './sections/TextSections';


export const EMPTY_PROFILE = {
  id: null,
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  country_code: '',
  date_of_birth: '',
  gender: '',
  gender_other: '',
  category: '',
  marital_status: '',
  more_information: [],
  notice_period: '',
  expected_salary: '',

  current_address: '',
  current_city: '',
  current_district: '',
  current_state: '',
  current_country: '',
  current_pincode: '',

  permanent_address: '',
  permanent_city: '',
  permanent_district: '',
  permanent_state: '',
  permanent_country: '',
  permanent_pincode: '',

  hometown: '',
  profile_image: '',
  status: 1,
};

/**
 * Empty extended profile.
 * Keys are exactly the `extended.*` properties the legacy code reads.
 */
export const EMPTY_EXTENDED = {
  resume_headline: '',
  profile_summary: '',
  key_skills: [],
  education: [],
  employment: [],
  projects: [],
  accomplishments: [],
  certifications: [],
  languages: [],
  social_profiles: [],
  career_profile: null,
  diversity: null,
  resume_filename: '',
  resume_url: '',
};


export function buildRequestBody(fields = {}, files = {}) {
  const body = {};

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    body[key] = typeof value === 'string' ? value.trim() : value;
  });

  Object.entries(files || {}).forEach(([key, file]) => {
    if (file) body[key] = file;
  });

  return body;
}


const WEIGHTS = {
  resume: 15,
  skills: 12,
  summary: 8,
  employment: 10,
  education: 10,
  projects: 8,
  quickInterview: 8,
  headline: 4,
  photo: 4,
  career: 5,
  certifications: 4,
  accomplishments: 3,
  onlineProfiles: 3,
  languages: 2,
  basic: 2,
  diversity: 2,
};

const notEmpty = (v) => Array.isArray(v) ? v.length > 0 : Boolean(v);


function computeCompletionLegacy(form = {}, extended = {}) {
  const f = form || {};
  const e = extended || {};

  const map = {
    resume: notEmpty(e.resume_filename || e.resume_url),
    skills: notEmpty(e.key_skills),
    summary: notEmpty(e.profile_summary),
    employment: notEmpty(e.employment),
    education: notEmpty(e.education),
    projects: notEmpty(e.projects),

    quickInterview: Boolean(e.quick_interview_completed),
    headline: notEmpty(e.resume_headline),
    photo: notEmpty(f.profile_image),
    career: Boolean(
      e.career_profile && (
        e.career_profile.current_industry ||
        e.career_profile.job_role ||
        e.career_profile.expected_salary
      ),
    ),
    certifications: (e.accomplishments || []).some(
      (a) => a.accomplishment_type === 'Certification',
    ),
    accomplishments: (e.accomplishments || []).some(
      (a) => a.accomplishment_type !== 'Certification',
    ),
    onlineProfiles: notEmpty(e.online_profiles),
    languages: notEmpty(e.languages),
    basic: Boolean(f.first_name && f.last_name && (f.email || f.phone)),
    diversity: Boolean(
      e.diversity && (
        e.diversity.disability_status ||
        e.diversity.military_status ||
        e.diversity.career_break_status
      ),
    ),
  };


  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const earned = Object.keys(WEIGHTS)
    .reduce((sum, key) => sum + (map[key] ? WEIGHTS[key] : 0), 0);

  const percent = total ? Math.round((earned / total) * 100) : 0;


  return percent;
}


export function computeCompletion(a, b) {
  if (arguments.length >= 2) return computeCompletionLegacy(a, b);
  return computeCompletionV2(a);
}

export default function Profile({ candidateId: candidateIdProp }) {
  const {
    candidateId, photoUrl, bustPhotoCache, data, loading, error,
    completion, displayName, reload, refresh,
  } = useJobseekerProfile(candidateIdProp);


  const personalEditor = usePersonalDetailsEditor({
    basic: data.basic,
    onSaved: refresh,
  });

  const photoEditor = usePhotoEditor({
    candidateId,
    basic: data.basic,
    photoUrl,
    onSaved: refresh,
    onPhotoChanged: bustPhotoCache,
  });

  const scrollToSection = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <Box sx={{ bgcolor: PALETTE.offWhite, minHeight: '100vh', pb: 6 }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3 } }}>

        {error && (
          <Alert
            severity="error"
           sx={{ mb: 2, fontFamily: FONTS.body, fontSize: '0.8125rem' }}
            action={
              <Button
                size="small"
                onClick={() => reload()}
               sx={{ fontFamily: FONTS.body, textTransform: 'none', fontWeight: 600 }}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={{ xs: 2, md: 3 }}>

          {/* ── Left rail ──────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>

              <Card
                elevation={0}
               sx={{
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 2,
                  mt: 2,
                  bgcolor: PALETTE.surface,
                  display: { xs: 'none', md: 'block' },
                  py: 1 }}
              >
                {PROFILE_SECTIONS.map((section) => {
                  const done = completion.map[section.id];
                  return (
                    <Box
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          scrollToSection(section.id);
                        }
                      }}
                     sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 2, py: 1, cursor: 'pointer',
                        '&:hover': { bgcolor: PALETTE.offWhite },
                        '&:focus-visible': {
                          outline: `2px solid ${PALETTE.accent}`,
                          outlineOffset: -2,
                        } }}
                    >
                      {done ? (
                        <CheckCircleOutlined sx={{ fontSize: 16, color: PALETTE.success }} />
                      ) : (
                        <RadioButtonUncheckedOutlined sx={{ fontSize: 16, color: PALETTE.border }} />
                      )}
                      <Typography
                       sx={{
                          fontFamily: FONTS.body,
                          fontSize: '0.8125rem',
                          color: done ? PALETTE.navy : PALETTE.muted,
                          fontWeight: done ? 500 : 400 }}
                      >
                        {section.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Card>
            </Box>
          </Grid>

          {/* ── Sections ───────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <Stack gap={{ xs: 3, sm: 4 }}>

              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  component="h1"
                 sx={{
                    fontFamily: FONTS.display,
                    fontSize: { xs: '1.375rem', sm: '1.625rem' },
                    color: PALETTE.navy }}
                >
                  Your profile
                </Typography>
                <Tooltip title="Reload">
                  <span>
                    <IconButton
                      onClick={() => reload()}
                      disabled={loading}
                      size="small"
                      aria-label="Reload profile"
                    >
                      <RefreshOutlined sx={{ fontSize: 19, color: PALETTE.muted }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              <ProfileHeroCard
                candidateId={candidateId}
                basic={data.basic}
                photoUrl={photoUrl}
                employment={data.employment}
                quickInterview={data.quickInterview}
                completion={completion}
                personalEditor={personalEditor}
                photoEditor={photoEditor}
                scrollToSection={scrollToSection}
              />

              

              <PersonalDetailsSection
                basic={data.basic}
                loading={loading}
                onRefresh={refresh}
                editor={personalEditor}
              />

              
              <ResumeSection
                candidateId={candidateId}
                resume={data.resume}
                loading={loading}
                onRefresh={refresh}
              />

              <Box sx={{ my: { xs: 2, sm: 3 } }}>
                <HeadlineSection
                  candidateId={candidateId}
                  headline={data.headline}
                  loading={loading}
                  onRefresh={refresh}
                />
              </Box>

              <SummarySection
                candidateId={candidateId}
                summary={data.summary}
                loading={loading}
                onRefresh={refresh}
              />

              <KeySkillsSection
                candidateId={candidateId}
                skills={data.skills}
                loading={loading}
                onRefresh={refresh}
              />

              <EducationSection
                candidateId={candidateId}
                education={data.education}
                loading={loading}
                onRefresh={refresh}
                dateOfBirth={data.basic?.date_of_birth}
              />

              <EmploymentSection
                candidateId={candidateId}
                employment={data.employment}
                loading={loading}
                onRefresh={refresh}
                dateOfBirth={data.basic?.date_of_birth}
              />

              <ProjectsSection
                candidateId={candidateId}
                projects={data.projects}
                loading={loading}
                onRefresh={refresh}
                dateOfBirth={data.basic?.date_of_birth}
              />

              <Box sx={{ mt: 2 }}>
             <CertificationsSection
                candidateId={candidateId}
                accomplishments={data.accomplishments}
                loading={loading}
                onRefresh={refresh}
                dateOfBirth={data.basic?.date_of_birth}
              />
              </Box>

              <Box sx={{ mt: 2 }}>
              <AccomplishmentsSection
                candidateId={candidateId}
                accomplishments={data.accomplishments}
                loading={loading}
                onRefresh={refresh}
                dateOfBirth={data.basic?.date_of_birth}
              />
              </Box>

              <Box sx={{ mt: 2 }}>
              <LanguagesSection
                candidateId={candidateId}
                languages={data.languages}
                loading={loading}
                onRefresh={refresh}
              />
              </Box>

              <Box sx={{ mt: 2 }}>
              <CareerProfileSection
                candidateId={candidateId}
                career={data.career}
                loading={loading}
                onRefresh={refresh}
              />
              </Box>

              <Box sx={{ mt: 2 }}>
              <OnlineProfilesSection
                candidateId={candidateId}
                onlineProfiles={data.onlineProfiles}
                loading={loading}
                onRefresh={refresh}
              />
              </Box>

              <Box sx={{ mt: 2 }}>
              <DiversitySection
                candidateId={candidateId}
                diversity={data.diversity}
                loading={loading}
                onRefresh={refresh}
                dateOfBirth={data.basic?.date_of_birth}
              />
              </Box>

            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
