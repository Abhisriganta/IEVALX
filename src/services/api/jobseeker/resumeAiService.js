// Uses iEvalx Vite proxy: VITE_API_BASE_URL=/api → proxied to Django backend
const API_BASE   = import.meta.env.VITE_API_BASE_URL || "/api";
const RB         = `${API_BASE}/resume-builder`;

// ── Auth header ───────────────────────────────────────────────────────────────
const authHeaders = () => {
  const token = localStorage.getItem("ievalx_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Candidate ID from JWT ─────────────────────────────────────────────────────
export const getCandidateId = () => {
  try {
    // iEvalx stores user object as ievalx_user with id = Candidate_Id
    const raw = localStorage.getItem("ievalx_user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.id) return user.id;
    }
    // Fallback: decode JWT (payload.Candidate_Id)
    const token = localStorage.getItem("ievalx_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.Candidate_Id || payload.candidate_id || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
};

// ── Shared helpers ────────────────────────────────────────────────────────────

const extractRaw = (d) => d.fields || d.segments || [];

/**
 * Normalize any backend response that contains fields/segments into the
 * standard { ...d, fields: Field[] } shape consumed by the UI.
 * Replaces the 17 identical `{ ...d, fields: segmentsToFields(extractRaw(d)) }`
 * lines that were previously copy-pasted across every mutating endpoint.
 */
const withFields = (d) => ({ ...d, fields: segmentsToFields(extractRaw(d)) });

/**
 * Map an array of InlineEditor segments into the backend format.
 * Used by editField and addLine — avoids duplicating the same 8-key map.
 */
const mapSegs = (segs) => segs.map(s => ({
  text:       s.text       ?? "",
  bold:       s.bold       ?? false,
  italic:     s.italic     ?? false,
  underline:  s.underline  ?? false,
  strike:     s.strike     ?? false,
  color:      s.color      ?? "",
  fontFamily: s.fontFamily ?? "",
  fontSize:   s.fontSize   ?? "",
}));

const SECTION_COLORS = {
  header:         "#c026d3",
  contact:        "#6366f1",
  summary:        "#7c3aed",
  skills:         "#059669",
  experience:     "#2563eb",
  projects:       "#dc2626",
  education:      "#d97706",
  certifications: "#0891b2",
  languages:      "#4f46e5",
  awards:         "#b45309",
  references:     "#6b7280",
  other:          "#374151",
};

export const segmentsToFields = (segments) => {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  // [FIX] Sequential image counter — assigned entirely in the frontend.
  // Backend imageIndex is unreliable (returns null for all images when
  // inline_shapes lookup fails for table-cell icon images).
  // imgCounter gives: profile photo = 0, LinkedIn icon = 1, GitHub = 2, etc.
  // FieldRow uses this to show Replace only for imageIndex === 0.
  let imgCounter = 0;

  return segments.map((seg, i) => {
   
    const section = seg.section && seg.section.key
      ? {
          key:   seg.section.key,
          label: seg.section.label || (seg.section.key.charAt(0).toUpperCase() + seg.section.key.slice(1)),
          color: seg.section.color || SECTION_COLORS[seg.section.key] || "#374151",
        }
      : { key: "other", label: "Other", color: "#374151" };

   
    const paraIndex  = seg.paraIndex  ?? seg.index ?? seg.paragraph_index ?? i;
    const isHeader   = seg.isHeader   ?? seg.is_heading ?? false;
    const isBold     = seg.isBold     ?? seg.bold ?? false;
    const text       = (seg.text ?? seg.content ?? "").toString();
    const source     = seg.source     || "body";
    const runIndices = seg.runIndices  ?? null;
    const hasHyperlink = seg.hasHyperlink ?? false;
    const inlineLinks  = seg.inlineLinks
      ? seg.inlineLinks.map(h => ({
          rId:   h.rId   || h.r_id || "__noid__",
          text:  h.text  || "",
          url:   h.url   || "",
          label: h.label || "Link",
          // [TWO-FIELD LINK API] forward the new explicit keys when present
          displayText: h.displayText ?? h.text ?? "",
          targetUrl:   h.targetUrl   ?? h.url  ?? "",
          isLabelOnly: h.isLabelOnly ?? false,
          tooltip:     h.tooltip     ?? null,
        }))
      : null;

    // Compute imageIndex for image-type fields using the frontend counter.
    // If backend already sends a valid number, prefer it; otherwise use counter.
    const isImage = (seg.type || "text") === "image";
    let imageIndex = null;
    if (isImage) {
      imageIndex = (seg.imageIndex != null) ? seg.imageIndex : imgCounter;
      imgCounter++;
    }

    return {
      id:           seg.id || `seg_${paraIndex}`,
      text,
      originalText: seg.originalText || text,
      paraIndex,
      source,
      isBold:       isHeader || isBold,
      isHeader,
      format:       seg.format || (isHeader ? "HEADER" : "TEXT"),
      section,
      runIndices,
      linkRId:      null,
      isTextbox:    seg.isTextbox || false,
      type:         seg.type || "text",
      label:        null,
      inlineLinks,
      hasHyperlink,
      isInserted:   false,
      imageIndex,
      isIcon:       seg.isIcon ?? false,
      isSplitField: seg.isSplitField ?? false,
      fieldRole:    seg.fieldRole    || null,
      splitIndex:   seg.splitIndex   ?? null,
      // [PROFILE PHOTO] forward photo-style metadata so the UI can render
      // shape-matched previews if it chooses to. Safe-default null otherwise.
      photoShape:   seg.photoShape   ?? null,
      photoSize:    seg.photoSize    ?? null,
      photoCrop:    seg.photoCrop    ?? null,
      photoAlign:   seg.photoAlign   ?? null,
      // [PHOTO ADJUST] position fields — null until user has manually positioned
      // the photo via adjust-profile-photo. Used by PDFViewer drag handle to
      // render the photo at its saved position on reopen.
      photoPosXInches: seg.photoPosXInches ?? null,
      photoPosYInches: seg.photoPosYInches ?? null,
      // [PHOTO ALIGNMENT] layout hint from backend header analysis
      headerLayout:   seg.headerLayout   ?? null,
      hasHeaderTable: seg.hasHeaderTable ?? false,
    };
  });
};

// ── Base fetch helpers ─────────────────────────────────────────────────────────
const postJson = (url, body) =>
  fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body:    JSON.stringify(body),
  }).then(r => r.json());

const getJson = (url) =>
  fetch(url, { headers: authHeaders() }).then(r => r.json());

const deleteReq = (url) =>
  fetch(url, { method: "DELETE", headers: authHeaders() }).then(r => r.json());

/**
 * POST a FormData body with auth. No Content-Type header — browser sets the
 * multipart boundary automatically. Used by replaceImage, addProfilePhoto.
 */
const postForm = async (url, fd) => {
  const r = await fetch(url, { method: "POST", headers: authHeaders(), body: fd });
  return r.json();
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SESSION — resume_session.py
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upload a .docx file and create a new resume session.
 * @param {File}     file         — .docx file object
 * @param {Function} onProgress   — (ProgressEvent) => void
 * @returns Promise<{ success, session_id, candidate_id, ... }>
 */
export const uploadResume = (file, onProgress) => {
  const candidateId = getCandidateId();
  if (!candidateId) {
    console.error("[ResumeAI] candidate_id is null — user may not be logged in or ievalx_user not set");
  }
  console.log("[ResumeAI] uploadResume: candidateId =", candidateId, "file =", file?.name);
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    // Backend requires candidate_id — use 0 as fallback so we get a real error from Django
    fd.append("candidate_id", candidateId ? String(candidateId) : "0");
    fd.append("session_name", file.name.replace(/\.(docx|pdf)$/i, ""));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${RB}/upload`);
    // Attach auth header (no Content-Type header — browser sets multipart boundary)
    const token = localStorage.getItem("ievalx_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (onProgress) xhr.upload.onprogress = onProgress;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try   { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Invalid response")); }
      } else {
        try   { const e = JSON.parse(xhr.responseText); reject(new Error(e.detail || e.error || `Upload failed (${xhr.status})`)); }
        catch { reject(new Error(`Upload failed (${xhr.status})`)); }
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
};


// FIX: Use the dedicated /clone endpoint — avoids slow download+re-upload,
// wrong session_name, and candidate_id being null during re-upload.
export const cloneSession = async (sessionId) => {
  try {
    const d = await postJson(`${RB}/sessions/${sessionId}/clone`, {});
    return { success: d.success, session_id: d.session_id, ...d };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export const resetSession  = (sid)  => postJson(`${RB}/sessions/${sid}/reset`, {});
export const deleteSession = (sid)  => deleteReq(`${RB}/sessions/${sid}`);
export const listSessions  = (cid)  => getJson(`${RB}/sessions?candidate_id=${cid}`);


export const getPreviewPdf = (sid) =>
  fetch(`${RB}/sessions/${sid}/download-pdf?inline=true`, { headers: authHeaders() });


export const getDownloadDocxUrl = (sid) => `${RB}/sessions/${sid}/download`;
export const getDownloadPdfUrl  = (sid) => `${RB}/sessions/${sid}/download-pdf`;



/**
 * @returns Promise<{ fields: field[] }>
 */
export const getFields = async (sid) => {
  const d = await getJson(`${RB}/sessions/${sid}/segments`);
  // [FIX] Backend key is "fields" (from extract_fields). Fall back to "segments" for safety.
  return { fields: segmentsToFields(extractRaw(d)) };
};


export const editField = async ({ session_id, para_index, new_text, old_text, segments: segs, source }) => {
  const body = { segment_id: para_index };

  if (segs && segs.length > 0) {
    body.segments = mapSegs(segs);
    // Also send new_text for logging/response (backend derives it from segments anyway)
    body.new_text = segs.map(s => s.text ?? "").join("");
  } else {
    // ── Plain text path ────────────────────────────────────────────────────────
    body.new_text = String(new_text ?? "");
  }

  // [FIX] Send old_text so backend uses apply_edit_to_bytes (surgical find-and-replace)
  // instead of _update_para_text_preserve_runs (which diffs the full paragraph and
  // replaces the ENTIRE contact line with just the LinkedIn URL, erasing the email).
  if (old_text) body.old_text = String(old_text);
  if (source) body.source = source;

  const d = await postJson(`${RB}/sessions/${session_id}/edit-text`, body);
  // [FIX] Backend returns key "fields", not "segments"
  return withFields(d);
};

/** Alias — called when rich segment edits are made */
export const editSegments = ({ session_id, para_index, segments: segs, source }) =>
  editField({ session_id, para_index, segments: segs, source });


export const getSegments = async (sid, paraIndex) => {
  const d = await getJson(`${RB}/sessions/${sid}/segments`);
  // [FIX] Read from "fields" key
  const raw = extractRaw(d);
  const seg = raw.find(
    s => (s.paraIndex ?? s.index ?? s.paragraph_index) === paraIndex
  );
  if (!seg) return { success: false, segments: [] };
  return {
    success:  true,
    segments: [{ text: seg.text || "", bold: seg.isBold || seg.bold || false, italic: false,
                 underline: false, strike: false, color: "", fontFamily: "", fontSize: "" }],
  };
};

/**
 * Get rich run-level segments for a single paragraph (used by FieldRow inline editor).
 * FIX: Calls the dedicated GET /sessions/<sid>/get-segments?para=N&source=... endpoint
 * which returns actual per-run bold/italic/color/font/fontSize from the DOCX XML.
 * The old implementation fetched all fields and returned a single flat segment,
 * causing InlineEditor to initialize blind (no mixed formatting).
 * @param {string} sid        — session ID
 * @param {number} paraIndex  — paragraph index within the source
 * @param {string} source     — "body" | "table-T-R-C"
 * @returns Promise<{ success, segments: [{text, bold, italic, underline, strike, color, fontFamily, fontSize}] }>
 */
export const getParaSegments = async (sid, paraIndex, source = "body") => {
  try {
    const url = `${RB}/sessions/${encodeURIComponent(sid)}/get-segments?para=${paraIndex}&source=${encodeURIComponent(source)}`;
    const d = await getJson(url);
    return d; // backend returns { success, segments: [...] }
  } catch (e) {
    return { success: false, segments: [] };
  }
};


// FIX: Send full segments[] with formatting so new lines preserve bold/italic/color/font.
// Old version joined segments to plain text, losing all formatting from InlineEditor.
export const addLine = async ({ session_id, after_para_index, segments: segs, source }) => {
  const body = {
    after_segment_id: after_para_index,
    source:           source || "body",
  };

  if (Array.isArray(segs) && segs.length > 0) {
    // Rich path — send full per-run formatting so backend builds styled runs
    body.segments = mapSegs(segs);
    body.text = segs.map(s => s.text ?? "").join("");
  } else {
    body.text = "";
  }

  const d = await postJson(`${RB}/sessions/${session_id}/add-line`, body);
  return withFields(d);
};

// FIX: Pass source so backend uses _source_paras(doc, source) instead of
// doc.paragraphs — otherwise deleting a table-cell field removes the wrong paragraph.
export const deleteLine = async ({ session_id, para_index, source }) => {
  const d = await postJson(`${RB}/sessions/${session_id}/delete-line`, {
    segment_id: para_index,
    source:     source || "body",
  });
  return withFields(d);
};

export const deleteField = ({ session_id, para_index, source }) =>
  deleteLine({ session_id, para_index, source });


// ═══════════════════════════════════════════════════════════════════════════════
//  ADD SECTION — resume_editor.py (add-section)
//
//  Inserts a new section header paragraph + one blank body line after the last
//  field of the current section. The header paragraph clones its formatting
//  (pPr + rPr) from the nearest existing section header so the new section
//  is visually consistent with the rest of the template.
//
//  This is intentionally separate from addLine — section creation is a
//  structural operation (new heading + blank content line), not a content edit.
//
//  @param {object} args
//  @param {string} args.session_id        — active session ID
//  @param {number} args.after_segment_id  — paraIndex of the last field in the
//                                           current section (new header inserts after it)
//  @param {string} args.section_title     — user-supplied section name
//  @param {string} [args.source="body"]   — paragraph source (always "body" for now)
//  @returns Promise<{
//    success:            boolean,
//    session_id:         string,
//    header_inserted_at: number,   — paraIndex of the new section header
//    body_inserted_at:   number,   — paraIndex of the blank line after the header
//    section_title:      string,
//    fields:             Field[],
//  }>
// ═══════════════════════════════════════════════════════════════════════════════
export const addSection = async ({
  session_id,
  after_segment_id,
  section_title,
  source = "body",
}) => {
  const d = await postJson(`${RB}/sessions/${session_id}/add-section`, {
    after_segment_id,
    section_title,
    source,
  });
  return withFields(d);
};


export const editHyperlinkText = async ({
  session_id, para_index, r_id, new_text, new_url, source, hyperlink_index,
  // [TWO-FIELD LINK API] new explicit keys preferred by backend
  display_text, target_url,
}) => {
  const d = await postJson(`${RB}/sessions/${session_id}/edit-hyperlink`, {
    segment_id:      para_index,
    hyperlink_index: hyperlink_index ?? 0,
    source:          source || "body",
    // [FIX] Send r_id explicitly so the backend can target the correct hyperlink
    // relationship even if hyperlink_index drifts after edits. Backend can fall
    // back to hyperlink_index if r_id is missing or "__noid__".
    r_id:            r_id,
    ...(new_text     !== undefined ? { new_text }     : {}),
    ...(new_url      !== undefined ? { new_url  }     : {}),
    ...(display_text !== undefined ? { display_text } : {}),
    ...(target_url   !== undefined ? { target_url }   : {}),
  });
  return withFields(d);
};

export const replaceImage = async (sessionId, imageTarget, file) => {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("image_index", "0");   // use index 0; imageTarget used as hint only
  // [PROFILE PHOTO] explicit flag — backend defaults to true anyway, but
  // sending it explicitly makes the intent obvious in network logs.
  fd.append("preserve_style", "true");
  const d = await postForm(`${RB}/sessions/${sessionId}/replace-image`, fd);
  return withFields(d);
};

export const undoImageReplace = async (sessionId, imageIndex = 0) => {
  const r = await fetch(`${RB}/sessions/${sessionId}/undo-image-replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ image_index: imageIndex }),
  });
  const d = await r.json();
  return { ...withFields(d), ok: r.ok, status: r.status };
};


// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE PHOTO — add / adjust / remove (Phase 3 + Phase 4 adjust)
//  Used by ProfilePhotoCard, FieldRow's Remove button, and PDFViewer drag handle.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Insert a new profile photo into the header when none currently exists.
 * Backend places it inline on target_segment_id paragraph with a preset shape.
 *
 * [PHOTO ALIGNMENT] Now accepts header_layout so the backend can choose
 * the correct injection strategy (inline vs create-table) based on the
 * original DOCX structure.
 *
 * @param {object} args
 * @param {string} args.session_id
 * @param {number} args.target_segment_id  — anchor paragraph (typically the name field's paraIndex)
 * @param {string} args.source             — "body" or "table-T-R-C"
 * @param {File}   args.file               — image file (PNG/JPG)
 * @param {string} args.shape              — "circle" | "square" | "roundRect" | "rect" (default "circle")
 * @param {number} args.size_inches        — clamped to [0.4, 3.0] (default 1.2)
 * @param {string} args.align              — "right" | "left" | "center" (forward-compat; inline placement currently)
 * @param {string} args.header_layout      — "LEFT_CELL" | "RIGHT_CELL" | "INLINE" | "TABLE_NO_PHOTO" | "NONE" (from backend)
 * @returns Promise<{ success, added, shape, size_inches, fields: [] }>
 */
export const addProfilePhoto = async ({
  session_id, target_segment_id, source = "body",
  file, shape = "circle", size_inches = 1.2, align = "right",
  header_layout = null,
  position = "top-right",   // [POSITION] new — "top-left" | "top-right" | "center-top"
}) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("target_segment_id", String(target_segment_id));
  fd.append("source", source);
  fd.append("shape", shape);
  fd.append("size_inches", String(size_inches));
  fd.append("align", align);
  if (header_layout) fd.append("header_layout", header_layout);
  if (position) fd.append("position", position);   // [POSITION] send placement choice

  const d = await postForm(`${RB}/sessions/${session_id}/add-profile-photo`, fd);
  return withFields(d);
};

/**
 * Adjust the position and/or size of the floating profile photo.
 * Positions are in inches from the page margin origin (relativeFrom="margin").
 * Send only the values that changed; omitted keys are left untouched in the DOCX.
 *
 * Called by the PDFViewer drag/resize handle on pointer-up (commit once on release).
 * Backend converts inches → EMU, swaps align→posOffset on the drawing anchor,
 * and updates wp:extent + a:ext for size changes.
 *
 * @param {object}  args
 * @param {string}  args.session_id
 * @param {number}  [args.image_index=0]   — typically 0 for the profile photo
 * @param {number}  [args.pos_x_inches]    — horizontal offset from left margin
 * @param {number}  [args.pos_y_inches]    — vertical offset from top margin
 * @param {number}  [args.width_inches]    — new width
 * @param {number}  [args.height_inches]   — new height
 * @returns Promise<{ success, fields: [] }>
 */
export const adjustProfilePhoto = async ({
  session_id, image_index = 0,
  pos_x_inches, pos_y_inches, width_inches, height_inches,
}) => {
  const body = { image_index };
  if (pos_x_inches  != null) body.pos_x_inches  = pos_x_inches;
  if (pos_y_inches  != null) body.pos_y_inches  = pos_y_inches;
  if (width_inches  != null) body.width_inches  = width_inches;
  if (height_inches != null) body.height_inches = height_inches;
  const d = await postJson(`${RB}/sessions/${session_id}/adjust-profile-photo`, body);
  return withFields(d);
};

/**
 * Remove the profile photo (deletes the drawing element).
 * Bytes are backed up server-side; user can re-upload via addProfilePhoto.
 *
 * @param {object} args
 * @param {string} args.session_id
 * @param {number} args.image_index  — typically 0 for the profile photo
 * @returns Promise<{ success, removed, fields: [] }>
 */
export const removeProfilePhoto = async ({ session_id, image_index = 0 }) => {
  const d = await postJson(`${RB}/sessions/${session_id}/remove-profile-photo`, {
    image_index,
  });
  return withFields(d);
};



export const aiRewrite = async (text, mode) => {
  const r = await fetch(`${RB}/ai-suggest`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body:    JSON.stringify({ text, mode }),
    signal:  AbortSignal.timeout(30000),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `AI suggest failed (${r.status})`);
  }
  const data = await r.json();
  
  const suggestion = data.suggestion ?? data.rewritten_text ?? data.result ?? data.text ?? null;
  if (!suggestion) throw new Error("Empty AI response");
  return { suggestion };
};

/** Mode → natural language instruction map for the backend AI_Rewrite endpoint */
const MODE_INSTRUCTIONS = {
  Polish:         "polish and improve the writing quality",
  Elaborate:      "elaborate with more relevant detail",
  Formalise:      "make more formal and professional",
  Condense:       "condense and make more concise",
  Quantify:       "add specific metrics, numbers and quantifiable achievements",
  "Action Verbs": "start with strong action verbs and make more impactful",
};


export const applyAiRewrite = async (sessionId, paraIndex, mode) => {
  const instruction = MODE_INSTRUCTIONS[mode] || "make more professional and concise";
  const d = await postJson(`${RB}/sessions/${sessionId}/ai-rewrite`, {
    segment_id:  paraIndex,
    instruction,
  });
  return withFields(d);
};


// ═══════════════════════════════════════════════════════════════════════════════
//  AI CHAT — external service (context-aware chat; no docx mutation)
// ═══════════════════════════════════════════════════════════════════════════════

export const aiChat = async ({ session_id, messages, context }) =>
  postJson(`${RB}/sessions/${session_id}/ai-chat`, { messages, context });


// ═══════════════════════════════════════════════════════════════════════════════
//  JD MANAGER — resume_jd.py
// ═══════════════════════════════════════════════════════════════════════════════

export const getJDRoles = ()             => getJson(`${RB}/jd/roles`);
export const getJDList  = (role, level)  =>
  getJson(`${RB}/jd/list?role=${encodeURIComponent(role)}&level=${encodeURIComponent(level)}`);

export const addJD = (body) =>
  postJson(`${RB}/jd/add`, {
    role:       body.role,
    level:      body.level,
    jd_text:    body.jd_text,
    company_id: body.company_id || null,
  });

export const deleteJD = (id) => deleteReq(`${RB}/jd/${id}/delete`);



export const runMatch = (body) =>
  postJson(`${RB}/compare`, {
    session_id:    body.session_id,
    role:          body.role,
    level:         body.level,
    force_refresh: body.force_refresh ?? true,
  });

export const getMatchReport = (body) =>
  fetch(`${RB}/compare-report`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body:    JSON.stringify({ session_id: body.session_id, role: body.role, level: body.level }),
  });

export const getComparisonHistory = (sid) => getJson(`${RB}/history/${sid}`);

export const checkHealth = () => Promise.resolve({ ok: true });




// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE OPERATIONS — resume_editor.py (add-page, page-breaks, clear, delete)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all page-break paragraph indices for a session.
 * @param {string} sid — session ID
 * @returns Promise<{ success, page_breaks: number[] }>
 */
export const getPageBreaks = (sid) =>
  getJson(`${RB}/sessions/${sid}/page-breaks`);

/**
 * Insert a page-break paragraph at the end of the document (or after a specific para).
 * @param {string}      sid       — session ID
 * @param {number|null} afterPara — optional paragraph index to insert after (default = end)
 * @returns Promise<{ success, page_breaks: number[], fields: [] }>
 */
export const addPage = async (sid, afterPara = null) => {
  const body = { source: "body" };
  if (afterPara !== null && afterPara !== undefined) {
    body.after_para = afterPara;
  }
  const d = await postJson(`${RB}/sessions/${sid}/add-page`, body);
  return withFields(d);
};

/**
 * Remove all content paragraphs between a page break and the next one (keeps the break itself).
 * @param {string} sid           — session ID
 * @param {number} pageBreakPara — paragraph index of the page break
 * @returns Promise<{ success, cleared, page_breaks: number[], fields: [] }>
 */
export const clearPage = async (sid, pageBreakPara) => {
  const d = await postJson(`${RB}/sessions/${sid}/clear-page`, {
    source: "body",
    page_break_para: pageBreakPara,
  });
  return withFields(d);
};

/**
 * Delete the page break paragraph AND all its content until the next break.
 * @param {string} sid           — session ID
 * @param {number} pageBreakPara — paragraph index of the page break
 * @returns Promise<{ success, deleted, page_breaks: number[], fields: [] }>
 */
export const deletePage = async (sid, pageBreakPara) => {
  const d = await postJson(`${RB}/sessions/${sid}/delete-page`, {
    source: "body",
    page_break_para: pageBreakPara,
  });
  return withFields(d);
};

/**
 * Append a new hyperlink (LinkedIn / GitHub / Portfolio / ...) to an existing
 * contact paragraph via run-level insertion. No new paragraph is created — the
 * link is appended as runs inside the target paragraph, preserving the
 * vertical layout of the contact block (photo + name baseline stay put).
 *
 * Typical usage: target the LAST contact paragraph's paraIndex so the new
 * entry extends the natural " | LinkedIn | GitHub | " pattern.
 *
 * @param {object}  args
 * @param {string}  args.session_id
 * @param {number}  args.target_segment_id  — paraIndex of the contact paragraph
 * @param {string}  args.source             — "body" or "table-T-R-C"
 * @param {string}  args.contact_type       — "linkedin" | "github" | "portfolio"
 * @param {string}  args.label              — display label (e.g. "LinkedIn")
 * @param {string}  args.url                — full URL (must start with https://)
 * @param {string}  args.display_text       — visible text in the resume
 * @returns Promise<{ success, added_url, added_label, fields: [] }>
 */
export const addContactLink = async ({
  session_id, target_segment_id, source, contact_type, label, url, display_text,
}) => {
  const d = await postJson(`${RB}/sessions/${session_id}/add-contact-link`, {
    target_segment_id,
    source:        source || "body",
    contact_type:  contact_type || "",
    label:         label || "Link",
    url:           url || "",
    display_text:  display_text || url || "",
  });
  return withFields(d);
};

/**
 * Remove a specific hyperlink (by rId) from a contact paragraph. The adjacent
 * " | " separator run is removed along with it so the remaining links stay
 * cleanly pipe-separated.
 *
 * @param {object} args
 * @param {string} args.session_id
 * @param {number} args.target_segment_id  — paraIndex of the contact paragraph
 * @param {string} args.source             — "body" or "table-T-R-C"
 * @param {string} args.r_id               — rId of the hyperlink to remove
 * @returns Promise<{ success, removed_rid, fields: [] }>
 */
export const removeContactLink = async ({
  session_id, target_segment_id, source, r_id,
}) => {
  const d = await postJson(`${RB}/sessions/${session_id}/remove-contact-link`, {
    target_segment_id,
    source: source || "body",
    r_id:   r_id || "",
  });
  return withFields(d);
};



/**
 * Wrap the text runs of a project title paragraph in a hyperlink.
 * The title text itself becomes the clickable link in the document.
 *
 * @param {object} args
 * @param {string} args.session_id
 * @param {number} args.para_index  — paraIndex of the project title field
 * @param {string} args.source      — "body" or "table-T-R-C"
 * @param {string} args.url         — full URL (https://... or other valid URI)
 * @returns Promise<{ success, added_url, fields: [] }>
 */
export const addProjectLink = async ({ session_id, para_index, source, url }) => {
  const d = await postJson(`${RB}/sessions/${session_id}/add-project-link`, {
    para_index,
    source: source || "body",
    url:    url || "",
  });
  return withFields(d);
};

/**
 * Unwrap the hyperlink from a project title paragraph, restoring plain runs.
 * The title text is preserved; only the hyperlink wrapper is removed.
 *
 * @param {object} args
 * @param {string} args.session_id
 * @param {number} args.para_index  — paraIndex of the project title field
 * @param {string} args.source      — "body" or "table-T-R-C"
 * @param {string} args.r_id        — rId of the hyperlink to remove (from field.inlineLinks[].rId)
 * @returns Promise<{ success, removed_url, fields: [] }>
 */
export const removeProjectLink = async ({ session_id, para_index, source, r_id }) => {
  const d = await postJson(`${RB}/sessions/${session_id}/remove-project-link`, {
    para_index,
    source: source || "body",
    r_id:   r_id  || "",
  });
  return withFields(d);
};

const resumeAiService = {
  getCandidateId, segmentsToFields,
  // Session
  uploadResume, cloneSession, resetSession, deleteSession, listSessions,
  getPreviewPdf, getDownloadDocxUrl, getDownloadPdfUrl,
  // Segments / Fields
  getFields, getSegments, getParaSegments,
  // Edit
  editField, editSegments, addLine, deleteLine, deleteField,
  // [ADD SECTION] Insert a new section header + blank body line
  addSection,
  // Hyperlink / Image
  editHyperlinkText, replaceImage, undoImageReplace,
  // Profile photo (Phase 3 + Phase 4 adjust)
  addProfilePhoto, adjustProfilePhoto, removeProfilePhoto,
  // AI
  aiRewrite, applyAiRewrite, aiChat,
  // JD
  getJDRoles, getJDList, addJD, deleteJD,
  // Compare
  runMatch, getMatchReport, getComparisonHistory,
  // Page operations
  getPageBreaks, addPage, clearPage, deletePage,
  // Contact link operations (Phase 2 — Add Contact Info feature)
  addContactLink, removeContactLink,
  // Project link operations — add/remove live link on project title fields
  addProjectLink, removeProjectLink,
  // Health
  checkHealth,
};

export default resumeAiService;