
import { useCallback, useEffect, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import aiGenerationService from "../../services/api/employer/aiGenerationService";

// rotating loader lines shown on the Generate spinner
const ROTATING_MESSAGES = [
  "Reading your topic document…",
  "Mapping concepts to question types…",
  "Calibrating difficulty level…",
  "Reviewing question quality…",
];

export default function useAssessmentGeneration(
  { companyId, jobId, jobTitle, embedded = false, onComplete = null } = {},
  config,
) {
  const { enqueueSnackbar } = useSnackbar();

  // ── wizard state ──────────────────────────────────────────────────────────
  // 0 = Configure, 1 = Generate & Review, 2 = Approve
  const [step, setStep] = useState(0);
  const [configId, setConfigId] = useState(null);
  const [version, setVersion] = useState(null);       // { paper, coverage, validation, version_no, ... }
  const [busy, setBusy] = useState(false);
  const [genStatus, setGenStatus] = useState(ROTATING_MESSAGES[0]);

  // review-screen UI state
  const [openSecs, setOpenSecs] = useState({});
  const [regenSection, setRegenSection] = useState(null); // section name currently regenerating
  const [regenQid, setRegenQid] = useState(null);         // question id currently regenerating

  // approve-screen state
  const [assessmentId, setAssessmentId] = useState(null);

  // rotating loader ticker while polling
  const rotateRef = useRef(null);
  useEffect(() => {
    if (!busy || step !== 1 || version) {
      if (rotateRef.current) {
        clearInterval(rotateRef.current);
        rotateRef.current = null;
      }
      return;
    }
    let i = 0;
    setGenStatus(ROTATING_MESSAGES[0]);
    rotateRef.current = setInterval(() => {
      i = (i + 1) % ROTATING_MESSAGES.length;
      setGenStatus(ROTATING_MESSAGES[i]);
    }, 3500);
    return () => {
      if (rotateRef.current) {
        clearInterval(rotateRef.current);
        rotateRef.current = null;
      }
    };
  }, [busy, step, version]);

  // default: open all sections on the review screen when a new version arrives
  useEffect(() => {
    if (version?.paper?.sections?.length) {
      const next = {};
      version.paper.sections.forEach((s) => {
        next[s.id] = true;
      });
      setOpenSecs(next);
    }
  }, [version?.version_no]);

  // ── helpers ───────────────────────────────────────────────────────────────
const buildSavePayload = useCallback(() => {
    return {
      id: configId || undefined,
      company_id: companyId,
      job_id: jobId,
      job_title: jobTitle,
      name: (config.name || "").trim(),
      role: (config.role || "").trim(),
      experience_level: config.level || "junior",
      source_document: config.docText || "",
     
      source_images: Array.isArray(config.docImages) ? config.docImages : [],
      sections: config.buildSections(),
      ai_instructions: config.instructions || "",
      passing_marks: config.passingMarks
        ? Number(config.passingMarks)
        : null,
      time_limit: null,
    };
  }, [configId, companyId, jobId, jobTitle, config]);

  const applyVersion = (v) => {
    setVersion(v);
    setBusy(false);
  };

  // ── STEP 0 → STEP 1: Generate ────────────────────────────────────────────
  const onGenerate = useCallback(async () => {
    // 1. validate the Configure form
    const errors = config.validateFields();
    if (Object.keys(errors).length > 0) {
      config.setFieldErrors(errors);
      enqueueSnackbar(
        errors.name || errors.role || errors.docText || errors.sections ||
          "Please fix the highlighted fields before generating.",
        { variant: "error" },
      );
      return;
    }
    if (!companyId) {
      enqueueSnackbar("Could not resolve company. Please re-login.", {
        variant: "error",
      });
      return;
    }

    // 2. save the config (create or update the draft)
    try {
      setBusy(true);
      setVersion(null);
      const payload = buildSavePayload();
      const { data: saveResp } = await aiGenerationService.saveConfig(payload);
      const savedId = saveResp?.id || saveResp?.data?.id;
      if (!savedId) throw new Error("Save returned no config id.");
      setConfigId(savedId);

      // 3. move to step 1 (Generate & Review) — spinner shows while we poll
      setStep(1);

      // 4. enqueue + poll for the version
      const v = await aiGenerationService.generateAndWait(
        savedId,
        companyId,
        (status) => {
          if (status === "generating") {
            // rotating text handled by the ticker above; nothing to do
          }
        },
      );
      applyVersion(v);
    } catch (e) {
      setBusy(false);
      enqueueSnackbar(
        e?.response?.data?.error || e?.message || "Could not generate paper.",
        { variant: "error" },
      );
      // keep the user on the current step so they can retry / edit config
    }
  }, [config, companyId, buildSavePayload, enqueueSnackbar]);

  // ── STEP 1: regenerate an entire section ─────────────────────────────────
  const onRegenerateSection = useCallback(
    async (sectionName) => {
      if (!configId || regenSection || regenQid) return;
      try {
        setRegenSection(sectionName);
        const { data } = await aiGenerationService.regenerateSection(
          configId,
          sectionName,
          companyId,
        );
        const v = data?.version || data;
        if (v) applyVersion(v);
        enqueueSnackbar(`Section "${sectionName}" regenerated.`, {
          variant: "success",
        });
      } catch (e) {
        enqueueSnackbar(
          e?.response?.data?.error || "Could not regenerate section.",
          { variant: "error" },
        );
      } finally {
        setRegenSection(null);
      }
    },
    [configId, companyId, regenSection, regenQid, enqueueSnackbar],
  );

  // ── STEP 1: regenerate a single question ─────────────────────────────────
  const onRegenerateQuestion = useCallback(
    async (questionId) => {
      if (!configId || regenSection || regenQid) return;
      try {
        setRegenQid(questionId);
        const { data } = await aiGenerationService.regenerateQuestion(
          configId,
          questionId,
          companyId,
        );
        const v = data?.version || data;
        if (v) applyVersion(v);
      } catch (e) {
        enqueueSnackbar(
          e?.response?.data?.error || "Could not regenerate question.",
          { variant: "error" },
        );
      } finally {
        setRegenQid(null);
      }
    },
    [configId, companyId, regenSection, regenQid, enqueueSnackbar],
  );

  // ── STEP 1: delete a question inline ─────────────────────────────────────
  const onDeleteQuestion = useCallback(
    async (questionId) => {
      if (!configId) return;
      try {
        const { data } = await aiGenerationService.deleteQuestion(
          configId,
          questionId,
          companyId,
        );
        const v = data?.version || data;
        if (v) setVersion(v);
      } catch (e) {
        enqueueSnackbar(
          e?.response?.data?.error || "Could not delete question.",
          { variant: "error" },
        );
      }
    },
    [configId, companyId, enqueueSnackbar],
  );

  // ── STEP 1: inline edit of the question stem ─────────────────────────────
  const onEditStem = useCallback(
    async (questionId, patch) => {
      if (!configId) return;
      try {
        const { data } = await aiGenerationService.editQuestion(
          configId,
          questionId,
          patch,
          companyId,
        );
        const v = data?.version || data;
        if (v) setVersion(v);
      } catch (e) {
        enqueueSnackbar(
          e?.response?.data?.error || "Could not save changes.",
          { variant: "error" },
        );
      }
    },
    [configId, companyId, enqueueSnackbar],
  );

  // ── STEP 1 → STEP 2: Approve & Materialise ───────────────────────────────
  const onApprove = useCallback(async () => {
    if (!configId) return;
    try {
      setBusy(true);
      try {
        await aiGenerationService.saveConfig(buildSavePayload());
      } catch (syncErr) {
        // eslint-disable-next-line no-console
        console.warn("[AIAssessmentBuilder] Pre-approve config sync failed:", syncErr);
      }

      const { data } = await aiGenerationService.approve(
        configId,
        companyId,
        config.instructions || "",
      );
      const aid = data?.assessment_id || data?.data?.assessment_id;
      if (aid) setAssessmentId(aid);
      setStep(2);
      enqueueSnackbar("Assessment approved.", { variant: "success" });
    } catch (e) {
      enqueueSnackbar(
        e?.response?.data?.error || "Could not approve assessment.",
        { variant: "error" },
      );
    } finally {
      setBusy(false);
    }
  }, [configId, companyId, config.instructions, buildSavePayload, enqueueSnackbar]);

  const copyAssessmentId = useCallback(() => {
    if (!assessmentId) return;
    try {
      navigator.clipboard.writeText(String(assessmentId));
      enqueueSnackbar("Assessment ID copied.", { variant: "success" });
    } catch {
      /* ignore clipboard errors */
    }
  }, [assessmentId, enqueueSnackbar]);

  return {
    // wizard state
    step,
    setStep,
    version,
    setVersion,
    configId,
    setConfigId,
    busy,
    setBusy,
    genStatus,

    // review UI state
    openSecs,
    setOpenSecs,
    regenSection,
    regenQid,

    // approve state
    assessmentId,
    copyAssessmentId,

    // actions
    onGenerate,
    onRegenerateSection,
    onRegenerateQuestion,
    onDeleteQuestion,
    onEditStem,
    onApprove,
  };
}
