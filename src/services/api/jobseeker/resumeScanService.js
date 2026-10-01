// ============================================================================
// resumeScanService.js
// Service for the Resume Scan ATS feature.
// Currently returns a mock result; swap the implementation of `scanResume`
// for a real backend call when the endpoint is ready (e.g. POST /resume/scan).
// Location: src/services/api/jobseeker/resumeScanService.js
// ============================================================================

const generateMockScanResult = () => {
  const r = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const breakdown = [
    { label: 'Keywords Match',         value: r(62, 90) },
    { label: 'Formatting & Structure', value: r(75, 95) },
    { label: 'Experience Detail',      value: r(60, 92) },
    { label: 'Skills Alignment',       value: r(65, 90) },
    { label: 'Education Section',      value: r(78, 95) },
  ];
  const score = Math.round(
    breakdown.reduce((s, b) => s + b.value, 0) / breakdown.length
  );

  const pool = [
    'Add quantifiable achievements (e.g., "Increased revenue by 30%").',
    'Include keywords from your target job descriptions.',
    'Use a clean, single-column layout for better ATS parsing.',
    'Ensure consistent date formatting across all roles.',
    'Add a concise professional summary aligned to target roles.',
    'Avoid tables, text boxes, headers, or footers — ATS tools may misread them.',
    'Spell out acronyms at least once for accurate indexing.',
    'Use standard section headings like "Experience" and "Education".',
    'Save and submit as a .pdf or .docx — never as an image.',
  ];
  const suggestions = [...pool].sort(() => 0.5 - Math.random()).slice(0, 3);
  return { score, breakdown, suggestions };
};

/**
 * Run an ATS scan against the given resume file.
 * @param {File} file - PDF, DOC, or DOCX resume file.
 * @returns {Promise<{score:number, breakdown:Array, suggestions:string[]}>}
 *
 * TODO: Replace the mock body with a real backend call, e.g.:
 *   const fd = new FormData();
 *   fd.append('file', file);
 *   const { data } = await axiosInstance.post('/jobseeker/resume/scan', fd, {
 *     headers: { 'Content-Type': 'multipart/form-data' },
 *   });
 *   return data;
 */
const scanResume = async (file) => {
  // Simulate network/processing latency for the mock
  await new Promise((resolve) => setTimeout(resolve, 1800));
  if (!file) throw new Error('No file provided');
  return generateMockScanResult();
};

const resumeScanService = {
  scanResume,
};

export default resumeScanService;