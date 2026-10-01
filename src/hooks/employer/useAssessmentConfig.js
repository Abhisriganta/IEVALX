import { useState, useEffect } from "react";
import { useSnackbar } from "notistack";
import axiosInstance from "../../services/api/axiosInstance";
import { DEFAULT_MARKS } from "../../components/employer/Assessments/AIBuilderShared";

// Fallback if a type isn't in DEFAULT_MARKS for any reason (defence in depth).
const _defaultMarksFor = (type) => {
  const v = DEFAULT_MARKS?.[type];
  return typeof v === "number" && v >= 0 ? v : 1;
};

// A type row's canonical shape is { count: number, marks: number }.
// This normalizer accepts either the new shape OR the legacy number-only shape
// (typeCounts[type] === 5) so a draft saved before this change still loads.
const _normalizeTypeCounts = (raw, ) => {
  const out = {};
  Object.entries(raw || {}).forEach(([type, val]) => {
    if (val && typeof val === "object") {
      out[type] = {
        count: Math.max(0, Number(val.count) || 0),
        marks: Math.max(0, Number(val.marks ?? _defaultMarksFor(type))),
      };
    } else {
      out[type] = {
        count: Math.max(0, Number(val) || 0),
        marks: _defaultMarksFor(type),
      };
    }
  });
  return out;
};

// pure factory — no state closure, safe at module scope
const makeSection = (idx = 0) => ({
  _uid: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name: idx === 0 ? "Section 1" : `Section ${idx + 1}`,
  durationMinutes: "",

  typeCounts: {},
  pendingType: "",
});

export default function useAssessmentConfig({ jobTitle = "" } = {}) {
  const { enqueueSnackbar } = useSnackbar();

  // ── config form ──
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("junior");
// multi-file topic documents
  const [docFiles, setDocFiles] = useState([]);       // [{ name, chars, text }]
  const [docText, setDocText] = useState("");         // combined + editable textarea value
  const [docName, setDocNameState] = useState("");    // legacy compat
  const [docBusy, setDocBusy] = useState(false);

  const [docImages, setDocImages] = useState([]);     // [{ s3_key, url, kind, page }]
  const [sections, setSections] = useState([makeSection(0)]);
  const [instructions, setInstructions] = useState("");
  const [passingMarks, setPassingMarks] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { name, role, docText, sections }
  // Per-section validation errors: { [uid]: { name?, duration?, typeCounts? } }
  const [sectionErrors, setSectionErrors] = useState({});

  useEffect(() => {
    if (jobTitle && !role) setRole(jobTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTitle]);

  // sectionQCount reads the new shape { [type]: { count, marks } } and
  // gracefully degrades on the legacy number-only shape so older sections
  // (loaded from a draft saved before this change) still render.
  const sectionQCount = (sec) =>
    Object.values(sec?.typeCounts || {}).reduce((a, tc) => {
      const n = tc && typeof tc === "object" ? Number(tc.count) : Number(tc);
      return a + (Number.isFinite(n) ? n : 0);
    }, 0);
  const totalRequested = sections.reduce((a, s) => a + sectionQCount(s), 0);

  // Marks subtotal for one section = Σ (count × marks) across its type rows.
  // Displayed as the chip in the section header + summed for the assessment
  // total below.
  const sectionMarksTotal = (sec) =>
    Object.values(sec?.typeCounts || {}).reduce((a, tc) => {
      if (!tc || typeof tc !== "object") return a;
      const c = Number(tc.count) || 0;
      const m = Number(tc.marks) || 0;
      return a + c * m;
    }, 0);

  // Assessment-wide total marks — sum of every section's subtotal. Auto-
  // computed so the recruiter never types this. The report will render the
  // same number as "Total Marks" once the candidate submits.
  const assessmentMarksTotal = sections.reduce(
    (a, s) => a + sectionMarksTotal(s),
    0,
  );

  // Send TWO fields per section:
  //   question_types: { mcq: 5, coding: 2 }        <- unchanged shape (count only)
  //   marks:          { mcq: 1, coding: 20 }       <- NEW per-type override,
  //                                                  read by ai_assessment_generator._marks_for
  // Only include rows with count > 0. Only include a marks entry when it
  // was actually set (>= 0); backend will fall back to DEFAULT_MARKS for anything absent.
  const buildSections = () =>
    sections.map((sec) => {
      const question_types = {};
      const marks = {};
      Object.entries(sec.typeCounts || {}).forEach(([type, tc]) => {
        const count = tc && typeof tc === "object" ? Number(tc.count) : Number(tc);
        if (!Number.isFinite(count) || count <= 0) return;
        question_types[type] = count;
        if (tc && typeof tc === "object" && Number.isFinite(Number(tc.marks))) {
          marks[type] = Number(tc.marks);
        }
      });
      return {
        name: (sec.name || "").trim() || "Section",
        type: "general",
        duration_minutes: sec.durationMinutes
          ? Number(sec.durationMinutes)
          : null,
        question_types,
        marks,
      };
    });

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // clear a specific section's per-field error
  const clearSectionError = (uid, field) => {
    setSectionErrors((prev) => {
      const cur = prev[uid];
      if (!cur || !(field in cur)) return prev;
      const nextSec = { ...cur };
      delete nextSec[field];
      const next = { ...prev, [uid]: nextSec };
      if (Object.keys(nextSec).length === 0) delete next[uid];
      return next;
    });
  };

  // ── section-level mutations ──
  const updateSection = (uid, patch) => {
    setSections((prev) =>
      prev.map((s) => (s._uid === uid ? { ...s, ...patch } : s)),
    );
  };
  const setSectionName = (uid, val) => {
    updateSection(uid, { name: val });
    clearSectionError(uid, "name");
    clearFieldError("sections");
  };
  const setSectionDuration = (uid, val) => {
    const cleaned = val === "" ? "" : Math.max(0, parseInt(val, 10) || 0);
    updateSection(uid, { durationMinutes: cleaned });
    clearSectionError(uid, "duration");
    clearFieldError("sections");
  };
  const addSection = () => {
    setSections((prev) => [...prev, makeSection(prev.length)]);
    clearFieldError("sections");
  };
  const removeSection = (uid) => {
    setSections((prev) =>
      prev.length <= 1 ? prev : prev.filter((s) => s._uid !== uid),
    );
    setSectionErrors((prev) => {
      if (!(uid in prev)) return prev;
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };

  // ── question type counts & marks, scoped to a section ──
  //
  // typeCounts shape: { [type]: { count: number, marks: number } }
  //
  // setTypeCount and setTypeMarks preserve whichever field is not being edited,
  // and defensively re-normalize the row in case it was still in the legacy
  // number-only shape (loaded from an older draft).
  const setTypeCount = (uid, type, count) => {
    const sec = sections.find((s) => s._uid === uid);
    const existing = _normalizeTypeCounts(sec?.typeCounts)[type] || {
      count: 0,
      marks: _defaultMarksFor(type),
    };
    updateSection(uid, {
      typeCounts: {
        ...(sec?.typeCounts || {}),
        [type]: { count: Math.max(0, Number(count) || 0), marks: existing.marks },
      },
    });
    clearSectionError(uid, "typeCounts");
    clearFieldError("sections");
  };
  const setTypeMarks = (uid, type, marks) => {
    const sec = sections.find((s) => s._uid === uid);
    const existing = _normalizeTypeCounts(sec?.typeCounts)[type] || {
      count: 0,
      marks: _defaultMarksFor(type),
    };
    updateSection(uid, {
      typeCounts: {
        ...(sec?.typeCounts || {}),
        [type]: { count: existing.count, marks: Math.max(0, Number(marks) || 0) },
      },
    });
  };
  const removeTypeRow = (uid, type) => {
    const sec = sections.find((s) => s._uid === uid);
    if (!sec) return;
    const next = { ...sec.typeCounts };
    delete next[type];
    updateSection(uid, { typeCounts: next });
  };
  const setPendingType = (uid, val) => updateSection(uid, { pendingType: val });
  const commitPendingType = (uid) => {
    const sec = sections.find((s) => s._uid === uid);
    if (!sec || !sec.pendingType) return;
    if (sec.pendingType in (sec.typeCounts || {})) {
      updateSection(uid, { pendingType: "" });
      return;
    }
    // New row seeded with count=1 and the type's default marks. Recruiter can
    // then bump either number independently.
    updateSection(uid, {
      typeCounts: {
        ...(sec.typeCounts || {}),
        [sec.pendingType]: { count: 1, marks: _defaultMarksFor(sec.pendingType) },
      },
      pendingType: "",
    });
    clearSectionError(uid, "typeCounts");
    clearFieldError("sections");
  };

  // ── topic document (multi-file) ─────────────────────────────────────────
  //
  // Upload one file: extract text via backend, push a chip to `docFiles`,
  // and append the extracted text to the combined `docText` textarea value.
  const onDocFile = async (file) => {
    if (!file) return;
    setDocBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axiosInstance.post(
        "/ai-assessment/extract-document/",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const text = data.text || "";
      const filename = data.filename || file.name;
      const chars = data.chars ?? text.length;

      setDocFiles((prev) => [...prev, { name: filename, chars, text }]);
      setDocText((prev) => (prev ? `${prev}\n\n${text}` : text));
      setDocNameState(filename);
     
      if (Array.isArray(data.images) && data.images.length > 0) {
        setDocImages((prev) => [...prev, ...data.images]);
      }
      clearFieldError("docText");

      if (data.truncated) {
        enqueueSnackbar(
          "Document was long — kept the first part for question generation.",
          { variant: "info" },
        );
      } else {
        enqueueSnackbar(
          `Loaded ${chars} characters from ${filename}.`,
          { variant: "success" },
        );
      }
    } catch (e) {
      enqueueSnackbar(
        e?.response?.data?.error ||
          "Could not read that file. Try PDF, DOCX, TXT — or paste the topics below.",
        { variant: "error" },
      );
    } finally {
      setDocBusy(false);
    }
  };

  // Remove one file chip. Best-effort: if that file's exact extracted text is
  // still present in the textarea, splice it out. If the user edited it, the
  // chip disappears but the text remains (safer than silently deleting user
  // edits).
  const removeDocFile = (idx) => {
    setDocFiles((prev) => {
      const target = prev[idx];
      if (target?.text) {
        setDocText((cur) => {
          if (!cur) return cur;
          // remove the segment plus a leading/trailing "\n\n" if present
          const withDelim = `\n\n${target.text}`;
          if (cur.includes(withDelim)) return cur.replace(withDelim, "");
          if (cur.includes(target.text)) return cur.replace(target.text, "");
          return cur;
        });
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

// Remove all files and their text.
  const clearAllDocs = () => {
    setDocFiles([]);
    setDocText("");
    setDocNameState("");
    setDocImages([]);
    clearFieldError("docText");
  };
 
  const setDocName = (val) => {
    setDocNameState(val || "");
    if (val) {
      setDocFiles((prev) => {
        if (prev.length > 0) return prev;
        return [{ name: val, chars: 0, text: "" }];
      });
    }
  };

  // ── validation of the form ──
  // returns an object of per-field error messages; empty object == valid
  const validateFields = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = "Assessment name is required.";
    }
    if (!role.trim()) {
      errors.role = "Job role is required.";
    }
    if (!docText.trim()) {
      errors.docText =
        "Topic document is required — upload a file or type the topics the test should cover.";
    } else if (docText.trim().length < 30) {
      errors.docText =
        "Topic document is too short — please provide at least 30 characters describing what the test should cover.";
    }

    const secErrs = {};
    sections.forEach((sec) => {
      const errs = {};
      if (!(sec.name || "").trim()) {
        errs.name = "Section name is required.";
      }
      const dur = Number(sec.durationMinutes);
      if (sec.durationMinutes === "" || Number.isNaN(dur) || dur <= 0) {
        errs.duration = "Required — must be > 0.";
      }
      if (sectionQCount(sec) <= 0) {
        errs.typeCounts =
          "Add at least one question — set a count greater than 0.";
      }
      if (Object.keys(errs).length > 0) secErrs[sec._uid] = errs;
    });
    setSectionErrors(secErrs);
    if (Object.keys(secErrs).length > 0) {
      errors.sections = "Fix the highlighted section fields before continuing.";
    }
    return errors;
  };

  return {
    // state
    name,
    setName,
    role,
    setRole,
    level,
    setLevel,
    docText,
    setDocText,
   docFiles,
    setDocFiles,
    docImages,
    setDocImages,
    docName,
    setDocName,
    docBusy,
    setDocBusy,
    sections,
    setSections,
    instructions,
    setInstructions,
    passingMarks,
    setPassingMarks,
    fieldErrors,
    setFieldErrors,
    sectionErrors,
    setSectionErrors,
    // derived
    sectionQCount,
    sectionMarksTotal,
    assessmentMarksTotal,
    totalRequested,
    buildSections,
    // mutations / helpers
    clearFieldError,
    clearSectionError,
    updateSection,
    setSectionName,
    setSectionDuration,
    addSection,
    removeSection,
    setTypeCount,
    setTypeMarks,
    removeTypeRow,
    setPendingType,
    commitPendingType,
    onDocFile,
    removeDocFile,
    clearAllDocs,
    validateFields,
  };
}