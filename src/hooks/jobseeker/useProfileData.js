import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSnackbar } from "notistack";
import jobseekerService from "@/services/api/jobseeker/jobseekerService";
import { EMPTY_PROFILE, EMPTY_EXTENDED } from "@/components/jobseeker/Profile/Profile";

/**
 * 🔧 CHANGE 1/7: sessionStorage stale-while-revalidate cache (unchanged from v1).
 * Cache is scoped per user + versioned so it can be invalidated by bumping the version.
 */
const CACHE_VERSION = "v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes safety net

const getCacheKey = (userId) =>
  `ievalx_profile_cache_${CACHE_VERSION}_${userId || "anon"}`;

const readCache = (userId) => {
  try {
    const raw = sessionStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (userId, payload) => {
  try {
    sessionStorage.setItem(
      getCacheKey(userId),
      JSON.stringify({ ...payload, timestamp: Date.now() }),
    );
  } catch {
    /* ignore quota / private-mode errors */
  }
};

/**
 * 🔧 CHANGE 2/7: MODULE-LEVEL Promise cache — the key fix for React 19
 * StrictMode double-invoke.
 *
 * Why useRef didn't work: StrictMode does mount → cleanup → remount, and the
 * remount is a FRESH component instance with a FRESH ref (didInitRef resets
 * to false). Any per-component guard is defeated by design.
 *
 * Module-level state lives OUTSIDE React and survives mount/unmount cycles.
 * If a fetch is already in flight when the second mount happens, we simply
 * hand back the same in-flight Promise instead of firing a duplicate request.
 */
let inFlightFetch = null; // Promise | null
let inFlightKey = null;   // string used to detect user switch

/**
 * 🔧 CHANGE 3/7: The actual network work is pulled out of the hook body
 * into a plain async function so both the mount effect and any later
 * `loadProfile()` calls share the same code path.
 */
const doFullProfileFetch = async (
  preservePhotoUrl,
  preserveDocFilename,
) => {
  // ---- STEP 1: base profile (serial — we need merged.id) ----
  const res = await jobseekerService.getProfile();
  const data = res.data?.data || res.data || {};
  const merged = { ...EMPTY_PROFILE, ...data };

  if (preservePhotoUrl) {
    merged.profile_image_url = preservePhotoUrl;
    merged.profile_image = preservePhotoUrl;
  }
  if (preserveDocFilename) {
    merged.disability_proof_doc = preserveDocFilename;
  }

  // ---- STEP 2: all 13 dependent endpoints IN PARALLEL ----
  let resumeInfo = { resume_filename: "", resume_url: "", resume_uploaded_at: "" };
  let profileSummaryData = "";
  let resumeHeadlineData = "";
  let keySkillsData = [];
  let educationData = [];
  let employmentData = [];
  let projectsData = [];
  let languagesData = [];
  let careerProfileData = {
    current_industry: "",
    department: "",
    role_category: "",
    job_role: "",
    desired_job_type: "",
    desired_employment_type: "",
    preferred_shift: "",
    preferred_work_location: "",
    expected_salary: "",
  };
  let onlineProfilesData = [];
  let certificationsData = [];
  let accomplishmentsData = [];
  let diversityData = {
    disability_status: "",
    disability_type: "",
    disability_reason: "",
    disability_percentage: "",
    military_experience: "",
    career_break: "",
  };
  let diversityDocFromApi = null;

  if (merged.id) {
    const [
      resumeR, summaryR, headlineR, skillsR, eduR, empR,
      projR, langR, careerR, profilesR, certsR, accsR, divR,
    ] = await Promise.allSettled([
      jobseekerService.getResumeInfo(merged.id),
      jobseekerService.getProfileSummary(merged.id),
      jobseekerService.getResumeHeadline(merged.id),
      jobseekerService.getSkills(merged.id),
      jobseekerService.getEducation(merged.id),
      jobseekerService.getEmployment(merged.id),
      jobseekerService.getProjects(merged.id),
      jobseekerService.getLanguages(merged.id),
      jobseekerService.getCareerProfile(merged.id),
      jobseekerService.getOnlineProfiles(merged.id),
      jobseekerService.getAccomplishments(merged.id, "Certification"),
      jobseekerService.getAccomplishments(merged.id, "Accomplishment"),
      jobseekerService.getDiversity(merged.id),
    ]);

    // ---- Result mapping (identical to previous logic) ----
    if (resumeR.status === "fulfilled") {
      const resumeData =
        resumeR.value.data?._normalized ||
        resumeR.value.data?.resume ||
        resumeR.value.data ||
        {};
      resumeInfo = {
        resume_filename:
          resumeData.filename ||
          resumeData.original_filename ||
          resumeData.Original_Filename ||
          "",
        resume_url: jobseekerService.resumeViewUrl(merged.id),
        resume_uploaded_at:
          resumeData.updated_at || resumeData.created_at || "",
      };
    }

    if (summaryR.status === "fulfilled") {
      profileSummaryData =
        summaryR.value.data?.profile_summary?.profile_summary || "";
    }

    if (headlineR.status === "fulfilled") {
      resumeHeadlineData =
        headlineR.value.data?.resume_headline?.resume_headline || "";
    }

    if (skillsR.status === "fulfilled") {
      keySkillsData =
        skillsR.value.data?.skills || skillsR.value.data?.key_skills || [];
    }

    if (eduR.status === "fulfilled") {
      educationData = eduR.value.data?.education || [];
    }

    if (empR.status === "fulfilled") {
      employmentData =
        empR.value.data?.employment || empR.value.data?.employments || [];
    }

    if (projR.status === "fulfilled") {
      projectsData = projR.value.data?.projects || [];
    }

    if (langR.status === "fulfilled") {
      const rawLanguages = langR.value.data?.languages || [];
      languagesData = rawLanguages.map((lang) => ({
        id: lang.language_id,
        language: lang.language_name,
        proficiency: lang.proficiency,
        read: lang.can_read,
        write: lang.can_write,
        speak: lang.can_speak,
      }));
    }

    if (careerR.status === "fulfilled") {
      const careerData = careerR.value.data?.career_profile || {};
      careerProfileData = {
        current_industry: careerData.current_industry || "",
        department: careerData.department || "",
        role_category: careerData.role_category || "",
        job_role: careerData.job_role || "",
        desired_job_type: Array.isArray(careerData.desired_job_type)
          ? careerData.desired_job_type.join(", ")
          : careerData.desired_job_type || "",
        desired_employment_type: Array.isArray(
          careerData.desired_employment_type,
        )
          ? careerData.desired_employment_type.join(", ")
          : careerData.desired_employment_type || "",
        preferred_shift: careerData.preferred_shift || "",
        preferred_work_location: Array.isArray(
          careerData.preferred_work_location,
        )
          ? careerData.preferred_work_location.join(", ")
          : careerData.preferred_work_location || "",
        expected_salary: careerData.expected_salary || "",
      };
    }

    if (profilesR.status === "fulfilled") {
      const rawProfiles = profilesR.value.data?.profiles || [];
      onlineProfilesData = rawProfiles.map((profile) => ({
        id: profile.profile_id || profile.id,
        key: profile.platform_key || profile.key,
        platform_key: profile.platform_key || profile.key,
        label: profile.label || "",
        url: profile.url || "",
        is_custom: ![
          "linkedin", "github", "twitter", "facebook", "instagram",
          "youtube", "medium", "stackoverflow", "behance", "dribbble",
          "portfolio", "website", "blog",
        ].includes((profile.platform_key || profile.key || "").toLowerCase()),
      }));
    }

    if (certsR.status === "fulfilled") {
      const rawCerts = certsR.value.data?.accomplishments || [];
      certificationsData = rawCerts.map((cert) => ({
        id: cert.accomplishment_id,
        name: cert.certification_name,
        issuing_organisation: cert.title || "",
        completion_date:
          cert.validity_from_year && cert.validity_from_month
            ? `${cert.validity_from_year}-${String(cert.validity_from_month).padStart(2, "0")}-01`
            : "",
        expiry_date:
          cert.validity_to_year && cert.validity_to_month
            ? `${cert.validity_to_year}-${String(cert.validity_to_month).padStart(2, "0")}-01`
            : "",
        does_not_expire: cert.does_not_expire || false,
        certificate_url: cert.certification_url || cert.url || "",
      }));
    }

    if (accsR.status === "fulfilled") {
      const rawAccs = accsR.value.data?.accomplishments || [];
      accomplishmentsData = rawAccs.map((acc) => ({
        id: acc.accomplishment_id,
        title: acc.title || "",
        issuer: acc.social_profile || "",
        date:
          acc.published_on_year && acc.published_on_month
            ? `${acc.published_on_year}-${String(acc.published_on_month).padStart(2, "0")}-01`
            : "",
        description: acc.description || "",
        url: acc.url || "",
      }));
    }

    if (divR.status === "fulfilled") {
      const divRaw = divR.value.data?.diversity_inclusion || {};
      diversityData = {
        disability_status: divRaw.disability?.disability_status || "",
        disability_type: divRaw.disability?.disability_type || "",
        disability_reason: divRaw.disability?.disability_reason || "",
        disability_percentage: divRaw.disability?.disability_percentage || "",
        military_experience: divRaw.military?.military_status || "",
        career_break: divRaw.career_break?.career_break_status || "",
      };
      diversityDocFromApi = divRaw.disability?.disability_proof_doc || null;
      if (diversityDocFromApi) {
        merged.disability_proof_doc = diversityDocFromApi;
      }
    }
  }

  // Best-effort sync of notice_period from current employment (unchanged)
  try {
    const currentEmp = (employmentData || []).find(
      (e) => e.is_current_employment || e.is_current,
    );
    if (currentEmp?.notice_period) {
      merged.notice_period = currentEmp.notice_period;
    }
  } catch (e) {
    /* best-effort sync, never block load */
  }

  if (careerProfileData?.expected_salary) {
    merged.expected_salary = careerProfileData.expected_salary;
  }

  const nextExtended = {
    ...EMPTY_EXTENDED,
    ...resumeInfo,
    resume_headline: resumeHeadlineData,
    profile_summary: profileSummaryData,
    key_skills: keySkillsData,
    education: educationData,
    employment: employmentData,
    projects: projectsData,
    languages: languagesData,
    career_profile: careerProfileData,
    social_profiles: onlineProfilesData,
    certifications: certificationsData,
    accomplishments: accomplishmentsData,
    diversity: diversityData,
  };

  return { profile: merged, extended: nextExtended };
};

/**
 * 🔧 CHANGE 4/7: The dedupe wrapper — this is what makes StrictMode's double
 * mount harmless. First caller starts the request; second caller sees the
 * in-flight Promise for the same key and awaits the SAME network response.
 */
const dedupedFetch = (key, preservePhotoUrl, preserveDocFilename) => {
  if (inFlightFetch && inFlightKey === key) {
    return inFlightFetch;
  }
  inFlightKey = key;
  inFlightFetch = doFullProfileFetch(preservePhotoUrl, preserveDocFilename)
    .finally(() => {
      // Clear as soon as done so a later explicit reload (after edit)
      // actually hits the network instead of getting a stale Promise.
      inFlightFetch = null;
      inFlightKey = null;
    });
  return inFlightFetch;
};

const useProfileData = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [extended, setExtended] = useState(EMPTY_EXTENDED);
  const [loading, setLoading] = useState(true);

  /**
   * 🔧 CHANGE 5/7: loadProfile — used by useProfileEditor after save.
   * Bypasses the dedupe cache when preserve args are set (explicit reloads
   * should always hit the network), and always overwrites sessionStorage.
   */
  const loadProfile = async (
    preservePhotoUrl = null,
    preserveDocFilename = null,
  ) => {
    const cacheUserId = user?.user_id || "anon";
    const useDedupe = !preservePhotoUrl && !preserveDocFilename;

    const result = useDedupe
      ? await dedupedFetch(`init:${cacheUserId}`, null, null)
      : await doFullProfileFetch(preservePhotoUrl, preserveDocFilename);

    setProfile(result.profile);
    setForm(result.profile);
    setExtended((prev) => ({ ...prev, ...result.extended }));
    writeCache(cacheUserId, result);
    return result.profile;
  };

  /**
   * 🔧 CHANGE 6/7: Mount effect. StrictMode will still call this twice, but
   * both calls hit `dedupedFetch` and share the SAME in-flight Promise — so
   * only ONE wave of 14 requests actually fires.
   */
  useEffect(() => {
    let cancelled = false;
    const cacheUserId = user?.user_id || "anon";

    // Paint cache instantly if present — 0ms perceived load on repeat visits
    const cached = readCache(cacheUserId);
    if (cached?.profile) {
      setProfile(cached.profile);
      setForm(cached.profile);
      if (cached.extended) {
        setExtended((prev) => ({ ...prev, ...cached.extended }));
      }
      setLoading(false);
    }

    (async () => {
      try {
        const result = await dedupedFetch(`init:${cacheUserId}`, null, null);
        if (cancelled) return;
        setProfile(result.profile);
        setForm(result.profile);
        setExtended((prev) => ({ ...prev, ...result.extended }));
        writeCache(cacheUserId, result);
      } catch (err) {
        if (cancelled) return;
        enqueueSnackbar(
          err?.response?.data?.Error || "Failed to load profile",
          { variant: "error" },
        );
        if (!cached) {
          const seed = { ...EMPTY_PROFILE, email: user?.email || "" };
          setProfile(seed);
          setForm(seed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 🔧 CHANGE 7/7: Same exported API as v1 — zero disturbance to Profile.jsx,
   * ProfileHero, ProfileMainSections, ProfileFooterSections, useProfileEditor.
   */
  return {
    profile,
    setProfile,
    form,
    setForm,
    extended,
    setExtended,
    loading,
    loadProfile,
  };
};

export default useProfileData;