import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import jobService from '@/services/api/jobseeker/jobService';


const EMPTY_FILTERS = {
  query: '',
  city: '',
  jobType: [],
  workMode: [],
  shift: [],
  salaryRange: [0, 100],
  experienceRange: [0, 20],
  skills: [],
};

export const useJobs = () => {
  const { enqueueSnackbar } = useSnackbar();

  // allJobs = the full, untouched result set from the server (master list).
  // jobs    = what the UI shows = allJobs after client-side filter + sort.
  //
  // Derivation is REACTIVE: a single effect re-computes `jobs` whenever the
  // master list, the filters, or the sort change. That keeps everything in
  // sync, makes filters fully reversible (we always re-derive from the master,
  // never from the already-filtered list), and removes the races you'd get
  // from manually re-deriving inside every async handler.
  const [allJobs, setAllJobs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  // Filters and sort state
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState('newest');

  // ── Reactive derivation: master list → filtered → sorted → displayed ──
  useEffect(() => {
    const filtered = jobService.filterJobs(allJobs, filters);
    const sorted = jobService.sortJobs(filtered, sortBy);
    setJobs(sorted);
    setTotalResults(sorted.length);
  }, [allJobs, filters, sortBy]);

  // ==========================================================================
  // DATA FETCHING (each just refreshes the master list; the effect derives)
  // ==========================================================================

  /**
   * Fetch the full public job list — the master list everything filters against.
   * Does NOT touch `filters`, so a query the user is typing is never clobbered.
   */
  const fetchAllJobs = useCallback(async (showNotification = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobService.searchJobs({});
      setAllJobs(response.jobs || []);
      setLoading(false);
      return { success: true, data: response };
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.message || 'Failed to load jobs';
      setError(errorMsg);
      if (showNotification) enqueueSnackbar(errorMsg, { variant: 'error' });
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [enqueueSnackbar]);

  /**
   * Run a server-side search. Refreshes the master list AND records the search
   * terms into `filters` so the displayed list, chips and search box stay in
   * sync. (The component does instant client-side searching via applyFilters,
   * but this remains available for an authoritative server search.)
   */
  const searchJobs = useCallback(async (searchParams = {}, showNotification = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobService.searchJobs(searchParams);
      setAllJobs(response.jobs || []);
      // Only fold in keys that were actually provided, so we never reset a
      // value (like an in-progress query) that wasn't part of this search.
      setFilters((prev) => {
        const next = { ...prev };
        Object.keys(searchParams).forEach((k) => { next[k] = searchParams[k]; });
        return next;
      });
      setLoading(false);
      return { success: true, data: response };
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.message || 'Search failed';
      setError(errorMsg);
      if (showNotification) enqueueSnackbar(errorMsg, { variant: 'error' });
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [enqueueSnackbar]);

  /**
   * Fetch all jobs with optional server-side filter params (legacy helper).
   */
  const fetchJobs = useCallback(async (filterParams = {}, showNotification = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobService.listJobs(filterParams);
      setAllJobs(response.jobs || []);
      setLoading(false);
      return { success: true, data: response };
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.message || 'Failed to fetch jobs';
      setError(errorMsg);
      if (showNotification) enqueueSnackbar(errorMsg, { variant: 'error' });
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [enqueueSnackbar]);

  /**
   * Fetch single job details (for job details page)
   */
  const fetchJobDetails = useCallback(async (jobId, showNotification = false) => {
    setLoading(true);
    setError(null);
    try {
      const job = await jobService.getJobDetails(jobId);
      setSelectedJob(job);
      setLoading(false);
      return { success: true, data: job };
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.message || 'Failed to fetch job details';
      setError(errorMsg);
      if (showNotification) enqueueSnackbar(errorMsg, { variant: 'error' });
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [enqueueSnackbar]);

  /**
   * Fetch jobs by company (for "View all jobs from this company")
   */
  const fetchJobsByCompany = useCallback(async (companyId, showNotification = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobService.getJobsByCompany(companyId);
      setAllJobs(response.jobs || []);
      setLoading(false);
      return { success: true, data: response };
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.message || 'Failed to fetch company jobs';
      setError(errorMsg);
      if (showNotification) enqueueSnackbar(errorMsg, { variant: 'error' });
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [enqueueSnackbar]);

  // ==========================================================================
  // CLIENT-SIDE FILTERING & SORTING (just update state; the effect re-derives)
  // ==========================================================================

  /**
   * Merge in new client-side filters. Because derivation always runs against
   * the master list, changing or removing a filter widens the results again
   * instead of permanently shrinking them.
   */
  const applyFilters = useCallback((newFilters = {}) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Clear all client-side filters back to defaults.
   */
  const clearFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
  }, []);

  /**
   * Sort jobs.
   */
  const applySorting = useCallback((sortOption) => {
    setSortBy(sortOption);
  }, []);

  /**
   * Group jobs by category
   */
  const groupJobsBy = useCallback((groupBy = 'jobType') => {
    return jobService.groupJobs(jobs, groupBy);
  }, [jobs]);

  // ==========================================================================
  // SKILL MATCHING
  // ==========================================================================

  const calculateSkillMatch = useCallback((job, seekerSkills) => {
    return jobService.calculateSkillMatch(job.skills, seekerSkills);
  }, []);

  const getRecommendedJobs = useCallback((seekerSkills, minMatchPercentage = 50) => {
    return allJobs
      .map((job) => ({
        ...job,
        skillMatch: jobService.calculateSkillMatch(job.skills, seekerSkills),
      }))
      .filter((job) => job.skillMatch.matchPercentage >= minMatchPercentage)
      .sort((a, b) => b.skillMatch.matchPercentage - a.skillMatch.matchPercentage);
  }, [allJobs]);

  // ==========================================================================
  // FORMATTING HELPERS
  // ==========================================================================

  const formatPostedDate = useCallback((createdAt) => {
    return jobService.getPostedDaysAgo(createdAt);
  }, []);

  const formatDeadline = useCallback((applicationDeadline, daysLeft) => {
    return jobService.formatDeadline(applicationDeadline, daysLeft);
  }, []);

  // ==========================================================================
  // AUTO-REFRESH (optional - for "New jobs available" notification)
  // ==========================================================================

  const setupAutoRefresh = useCallback((intervalMinutes = 5) => {
    const interval = setInterval(async () => {
      const response = await jobService.listJobs(filters);
      if (response.total > totalResults) {
        enqueueSnackbar(
          `${response.total - totalResults} new job(s) available! Refresh to see.`,
          { variant: 'info', persist: true }
        );
      }
    }, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [filters, totalResults, enqueueSnackbar]);

  return {
    // State
    jobs,
    allJobs,
    selectedJob,
    loading,
    error,
    totalResults,
    filters,
    sortBy,

    // Search & Fetch
    fetchAllJobs,
    searchJobs,
    fetchJobs,
    fetchJobDetails,
    fetchJobsByCompany,

    // Filtering & Sorting
    applyFilters,
    clearFilters,
    applySorting,
    groupJobsBy,

    // Skill Matching
    calculateSkillMatch,
    getRecommendedJobs,

    // Formatting
    formatPostedDate,
    formatDeadline,

    // Utilities
    setJobs,
    setSelectedJob,
    setFilters,
    setSortBy,
    setupAutoRefresh,
  };
};

export default useJobs;