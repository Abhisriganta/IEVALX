

import { useState } from "react";
import { useSnackbar } from "notistack";
import aiGenerationService, {
  aiPaperService,
} from "../../services/api/employer/aiGenerationService";

export default function usePaperRepository(
  { companyId = null, jobId = null, jobTitle = "" } = {},
  config,
  gen,
) {
  const { enqueueSnackbar } = useSnackbar();

  const [savePaperOpen, setSavePaperOpen] = useState(false);
  const [savePaperName, setSavePaperName] = useState("");
  const [savePaperDesc, setSavePaperDesc] = useState("");
  const [savingPaper, setSavingPaper] = useState(false);
  const [loadRepoOpen, setLoadRepoOpen] = useState(false);
  const [repoPapers, setRepoPapers] = useState([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // full paper row
  const [renameName, setRenameName] = useState("");
  const [renameDesc, setRenameDesc] = useState("");
  const [renamingPaper, setRenamingPaper] = useState(false);
// Delete-confirm dialog state (replaces window.confirm).
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name } or null
  const [deletingPaper, setDeletingPaper] = useState(false);

  const [previewPaperId, setPreviewPaperId] = useState(null);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [regenFromPreview, setRegenFromPreview] = useState(false);
  const onSavePaper = async () => {
    if (!gen.version) {
      enqueueSnackbar("Generate the paper first — nothing to save yet.", {
        variant: "warning",
        autoHideDuration: 8000,
      });
      return;
    }
    if (!gen.configId) {
      enqueueSnackbar("Save the draft once before saving to the repository.", {
        variant: "warning",
        autoHideDuration: 8000,
      });
      return;
    }

    const base = (config.name || "").trim() || "AI Paper";
    const ts = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const paperName = `${base} — ${ts}`;

    try {
      setSavingPaper(true);
      // eslint-disable-next-line no-console
      console.info("[AIAssessmentBuilder] Save Paper — sending", {
        company_id: companyId,
        config_id: gen.configId,
        paper_name: paperName,
      });
      const saveResp = await aiPaperService.saveFromConfig({
        company_id: companyId,
        config_id: gen.configId,
        paper_name: paperName,
      });
      // eslint-disable-next-line no-console
      console.info("[AIAssessmentBuilder] Save Paper — response", {
        status: saveResp?.status,
        data: saveResp?.data,
      });

      const savedId = saveResp?.data?.paper?.id ?? null;
      enqueueSnackbar(
        `"${paperName}" saved to AI Paper Repository${savedId ? ` (id ${savedId})` : ""}. Open Load from repository to reuse it.`,
        { variant: "success", autoHideDuration: 10000 },
      );
    } catch (e) {
      const d = e?.response?.data || {};
      const detail =
        d.error ||
        d.Error ||
        d.message ||
        e?.message ||
        "Could not save paper. Check the server logs.";

      console.error("[AIAssessmentBuilder] Save Paper failed:", {
        status: e?.response?.status,
        data: d,
        message: e?.message,
      });
      enqueueSnackbar(detail, { variant: "error", autoHideDuration: 12000 });
    } finally {
      setSavingPaper(false);
    }
  };

  const confirmSavePaper = async () => {
    const paperName = savePaperName.trim();
    if (!paperName) {
      enqueueSnackbar("Paper name is required.", { variant: "warning" });
      return;
    }
    if (!gen.configId) {
      enqueueSnackbar("Save the draft once before saving to the repository.", {
        variant: "warning",
      });
      return;
    }
    if (!gen.version) {
      enqueueSnackbar("Generate the paper first — nothing to save yet.", {
        variant: "warning",
      });
      return;
    }
    try {
      setSavingPaper(true);

      console.info("[AIAssessmentBuilder] Save Paper — sending", {
        company_id: companyId,
        config_id: gen.configId,
        paper_name: paperName,
        has_desc: !!savePaperDesc,
      });
      const saveResp = await aiPaperService.saveFromConfig({
        company_id: companyId,
        config_id: gen.configId,
        paper_name: paperName,
        description: savePaperDesc.trim() || undefined,
      });

      console.info("[AIAssessmentBuilder] Save Paper — response", {
        status: saveResp?.status,
        data: saveResp?.data,
      });

      const savedPaper = saveResp?.data?.paper || null;
      const savedId = savedPaper?.id ?? null;

      try {
        const listResp = await aiPaperService.list(companyId, {
          page_size: 50,
        });
        const papers = listResp?.data?.papers || [];
        // eslint-disable-next-line no-console
        console.info("[AIAssessmentBuilder] Save Paper — verify list", {
          company_id: companyId,
          count: papers.length,
          first_ids: papers.slice(0, 5).map((p) => p.id),
        });

        const foundById =
          savedId != null && papers.some((p) => p.id === savedId);
        const foundByName = papers.some(
          (p) => (p.paper_name || "").trim() === paperName,
        );

        if (!foundById && !foundByName) {
          // Save endpoint said 2xx but the row isn't in the list Load
          // Repository will fetch. Show the raw diagnostic in the toast.
          const msg =
            `Save endpoint returned ${saveResp?.status}, but the paper is ` +
            `NOT in the repository list (company_id=${companyId}, ` +
            `${papers.length} papers returned). ` +
            `Check server logs and tbl_ai_paper directly.`;
          // eslint-disable-next-line no-console
          console.error("[AIAssessmentBuilder] Save-vs-List mismatch", {
            saveResp: saveResp?.data,
            listPapers: papers,
          });
          enqueueSnackbar(msg, { variant: "error", autoHideDuration: 12000 });
          setSavingPaper(false);
          return;
        }
      } catch (verifyErr) {
        // eslint-disable-next-line no-console
        console.warn("[AIAssessmentBuilder] Verify list failed", verifyErr);
        // Non-fatal — save may still have worked. Fall through to success.
      }

      enqueueSnackbar(
        `"${paperName}" saved to AI Paper Repository${savedId ? ` (id ${savedId})` : ""}.`,
        { variant: "success" },
      );
      setSavePaperOpen(false);
    } catch (e) {
      const d = e?.response?.data || {};
      const detail =
        d.error ||
        d.Error ||
        d.message ||
        e?.message ||
        "Could not save paper. Check the server logs.";
      // eslint-disable-next-line no-console
      console.error("[AIAssessmentBuilder] Save Paper failed:", {
        status: e?.response?.status,
        data: d,
        message: e?.message,
      });
      enqueueSnackbar(detail, { variant: "error", autoHideDuration: 10000 });
    } finally {
      setSavingPaper(false);
    }
  };

  const loadRepoList = async () => {
    if (!companyId) {
      enqueueSnackbar("No company context — cannot load repository.", {
        variant: "warning",
      });
      return;
    }
    setRepoLoading(true);
    try {
      const { data } = await aiPaperService.list(companyId, {
        search: repoSearch || undefined,
        page_size: 50,
      });
      setRepoPapers(data?.papers || []);
    } catch (e) {
      enqueueSnackbar(
        e?.response?.data?.error || "Could not load repository.",
        { variant: "error" },
      );
    } finally {
      setRepoLoading(false);
    }
  };

  const onOpenLoadRepo = () => {
    console.info(
      "%c[AIAssessmentBuilder] onOpenLoadRepo — dialog opening",
      "color:#DC2626;font-weight:700",
    );
    setRepoSearch("");
    setPreviewPaperId(null);
    setPreviewSnapshot(null);
    setLoadRepoOpen(true);
    loadRepoList();
  };

  const onLoadPaper = async (paperId) => {
    try {
      gen.setBusy(true);
      const { data } = await aiPaperService.loadIntoConfig(paperId, {
        company_id: companyId,
        job_id: jobId ? Number(jobId) : null,
        job_title: jobTitle || null,
      });
      // Adopt the config the backend created (or reused) and jump to Review
      const newConfigId = data.config_id;
      gen.setConfigId(newConfigId);
      const cfg = await aiGenerationService.getConfig(newConfigId, companyId);
      const v = cfg?.data?.version;
      if (v) {
        gen.setVersion(v);
        // Reflect any config fields the snapshot brought back into the form
        const c = cfg?.data?.config || {};
if (c.name && !((config.name || "").trim())) config.setName(c.name);
        if (c.role) config.setRole(c.role);
        if (c.experience_level) config.setLevel(c.experience_level);
        if (c.source_document) {
          config.setDocText(c.source_document);
          config.setDocName("from repository");
        }
        if (c.ai_instructions) config.setInstructions(c.ai_instructions);
        if (c.passing_marks != null)
          config.setPassingMarks(String(c.passing_marks));
        const firstSec = v?.paper?.sections?.[0];
        if (firstSec) gen.setOpenSecs({ [firstSec.id]: true });
      }
      setLoadRepoOpen(false);
      gen.setStep(1);
      enqueueSnackbar("Paper loaded from repository — review and approve.", {
        variant: "success",
      });
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "Could not load paper.", {
        variant: "error",
      });
    } finally {
      gen.setBusy(false);
    }
  };

  // Opens the delete-confirm dialog. Actual delete happens on confirmDeleteRepoPaper().
  const onDeleteRepoPaper = (paperId, paperName) => {
    setDeleteTarget({ id: paperId, name: paperName });
  };

  // Called from the "Cancel" button in the confirm dialog.
  const closeDeleteConfirm = () => {
    if (deletingPaper) return; // don't allow closing mid-delete
    setDeleteTarget(null);
  };

  // Called from the "Delete" button in the confirm dialog.
  const confirmDeleteRepoPaper = async () => {
    if (!deleteTarget) return;
    const { id: paperId, name: paperName } = deleteTarget;
    try {
      setDeletingPaper(true);
      await aiPaperService.delete(paperId, companyId);
      setRepoPapers((prev) => prev.filter((p) => p.id !== paperId));
      // If we're currently previewing this paper, clear the preview too.
      if (previewPaperId === paperId) {
        setPreviewPaperId(null);
        setPreviewSnapshot(null);
      }
      enqueueSnackbar(`"${paperName}" deleted.`, { variant: "success" });
      setDeleteTarget(null);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "Could not delete paper.", {
        variant: "error",
      });
    } finally {
      setDeletingPaper(false);
    }
  };

  const onPreviewPaper = async (paperId) => {
    if (previewPaperId === paperId && previewSnapshot) return; // already loaded
    setPreviewPaperId(paperId);
    setPreviewSnapshot(null);
    try {
      setPreviewLoading(true);
      const { data } = await aiPaperService.get(paperId, companyId);
      // Backend returns { paper: { ...metadata..., snapshot: {...full Mongo doc...} } }
      const snap = data?.paper?.snapshot || null;
      if (!snap) {
        enqueueSnackbar("Could not load paper preview — snapshot missing.", {
          variant: "error",
        });
        setPreviewPaperId(null);
        return;
      }
      setPreviewSnapshot(snap);
    } catch (e) {
      const d = e?.response?.data || {};
      const detail =
        d.error || d.Error || d.message || e?.message || "Preview failed.";
      // eslint-disable-next-line no-console
      console.error("[AIAssessmentBuilder] Preview paper failed:", {
        paperId,
        status: e?.response?.status,
        data: d,
      });
      enqueueSnackbar(detail, { variant: "error" });
      setPreviewPaperId(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const onUsePreviewedPaper = () => {
    if (previewPaperId != null) onLoadPaper(previewPaperId);
  };

  const onRegenerateFromPreviewedPaper = () => {
    const snap = previewSnapshot;
    if (!snap) return;
    const c = snap.config_snapshot || {};
    try {
      setRegenFromPreview(true);
      if (c.name) config.setName(c.name);
      if (c.role) config.setRole(c.role);
      if (c.experience_level) config.setLevel(c.experience_level);
      if (c.source_document) {
        config.setDocText(c.source_document);
        config.setDocName(c.source_document ? "from repository" : "");
      }
      if (
        typeof c.passing_marks === "number" ||
        typeof c.passing_marks === "string"
      ) {
        config.setPassingMarks(String(c.passing_marks));
      }
      if (c.ai_instructions != null)
        config.setInstructions(c.ai_instructions || "");
      if (Array.isArray(c.sections) && c.sections.length > 0) {
        config.setSections(
          c.sections.map((s, i) => ({
            _uid: `sec_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
            name: s.name || `Section ${i + 1}`,
            durationMinutes:
              s.duration_minutes != null ? String(s.duration_minutes) : "",
            typeCounts: { ...(s.question_types || {}) },
            pendingType: "",
          })),
        );
      }
      gen.setVersion(null);
      // Close the picker and jump to Configure step.
      setLoadRepoOpen(false);
      setPreviewPaperId(null);
      setPreviewSnapshot(null);
      gen.setStep(0);
      enqueueSnackbar(
        'Settings loaded from paper. Review, then click "Generate assessment" to produce fresh questions.',
        { variant: "success", autoHideDuration: 10000 },
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[AIAssessmentBuilder] Regenerate-from-preview failed:", e);
      enqueueSnackbar("Could not load settings from paper.", {
        variant: "error",
      });
    } finally {
      setRegenFromPreview(false);
    }
  };

  const onOpenRenamePaper = (paper) => {
    setRenameTarget(paper);
    setRenameName(paper.paper_name || "");
    setRenameDesc(paper.description || "");
    setRenameOpen(true);
  };

  const onSaveRenamePaper = async () => {
    const newName = renameName.trim();
    const newDesc = renameDesc.trim();
    if (!newName) {
      enqueueSnackbar("Paper name is required.", { variant: "warning" });
      return;
    }
    if (!renameTarget) return;
    // Skip the round trip if nothing actually changed.
    const oldName = (renameTarget.paper_name || "").trim();
    const oldDesc = (renameTarget.description || "").trim();
    if (newName === oldName && newDesc === oldDesc) {
      setRenameOpen(false);
      return;
    }
    try {
      setRenamingPaper(true);
      const { data } = await aiPaperService.update(renameTarget.id, {
        company_id: companyId,
        paper_name: newName,
        description: newDesc || undefined,
      });
      const updated = data?.paper || {};
      setRepoPapers((prev) =>
        prev.map((p) =>
          p.id === renameTarget.id
            ? {
                ...p,
                ...updated,
                paper_name: newName,
                description: newDesc || null,
              }
            : p,
        ),
      );
      enqueueSnackbar(`Renamed to "${newName}".`, { variant: "success" });
      setRenameOpen(false);
    } catch (e) {
      const d = e?.response?.data || {};
      const detail =
        d.error ||
        d.Error ||
        d.message ||
        e?.message ||
        "Could not rename paper. Check the server logs.";
      // eslint-disable-next-line no-console
      console.error("[AIAssessmentBuilder] Rename paper failed:", {
        paper_id: renameTarget?.id,
        status: e?.response?.status,
        data: d,
        message: e?.message,
      });
      enqueueSnackbar(detail, { variant: "error", autoHideDuration: 10000 });
    } finally {
      setRenamingPaper(false);
    }
  };

  return {
    // state
    savePaperOpen,
    setSavePaperOpen,
    savePaperName,
    setSavePaperName,
    savePaperDesc,
    setSavePaperDesc,
    savingPaper,
    setSavingPaper,
    loadRepoOpen,
    setLoadRepoOpen,
    repoPapers,
    setRepoPapers,
    repoLoading,
    setRepoLoading,
    repoSearch,
    setRepoSearch,
    renameOpen,
    setRenameOpen,
    renameTarget,
    setRenameTarget,
    renameName,
    setRenameName,
    renameDesc,
    setRenameDesc,
    renamingPaper,
    setRenamingPaper,
    previewPaperId,
    setPreviewPaperId,
    previewSnapshot,
    setPreviewSnapshot,
    previewLoading,
    setPreviewLoading,

   regenFromPreview,
    setRegenFromPreview,
    deleteTarget,
    setDeleteTarget,
    deletingPaper,
    setDeletingPaper,
    // actions
    onSavePaper,
    confirmSavePaper,
    loadRepoList,
    onOpenLoadRepo,
    onLoadPaper,
    onDeleteRepoPaper,
    closeDeleteConfirm,
    confirmDeleteRepoPaper,
    onPreviewPaper,

    onUsePreviewedPaper,
    onRegenerateFromPreviewedPaper,
    onOpenRenamePaper,
    onSaveRenamePaper,
  };
}