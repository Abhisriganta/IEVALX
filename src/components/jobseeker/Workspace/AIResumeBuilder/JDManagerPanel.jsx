// ============================================================================
// JDManagerPanel.jsx — Side panel for adding and managing stored Job
//                      Descriptions used by the Resume Match feature.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/JDManagerPanel.jsx
// ============================================================================

import React, { useState, useEffect } from "react";
import { Box, Stack, Typography, Paper, TextField, MenuItem, Button } from "@mui/material";
import { FileText } from "lucide-react";
import { SpinnerEl, RippleBtn, PillEl, Ico } from "./atoms";

import resumeAiService from "@/services/api/jobseeker/resumeAiService";

function JDManagerPanel({ onClose, showToast }) {
  const [tab, setTab] = useState("add");
  const [role, setRole] = useState(""); const [level, setLevel] = useState("fresher"); const [company, setCompany] = useState(""); const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false); const [roles, setRoles] = useState([]); const [jds, setJds] = useState([]);
  const [loadingJDs, setLoadingJDs] = useState(false); const [selectedRole, setSelectedRole] = useState(""); const [selectedLevel, setSelectedLevel] = useState("fresher"); const [deletingId, setDeletingId] = useState(null);
  useEffect(() => { fetchRoles(); }, []);
  const fetchRoles = async () => { try { const d = await resumeAiService.getJDRoles(); setRoles(d.roles || []); } catch {} };
  const fetchJDs = async (r, l) => {
    if (!r) return; setLoadingJDs(true);
    try { const d = await resumeAiService.getJDList(r, l); setJds(d.jds || []); }
    catch { showToast("Failed to load JDs", "error"); } setLoadingJDs(false);
  };
  const addJD = async () => {
    if (!role.trim() || jdText.trim().length < 50) { showToast("Role and JD text (min 50 chars) required", "error"); return; }
    setLoading(true);
    try {
      const d = await resumeAiService.addJD({ role: role.trim(), level, jd_text: jdText.trim(), company: company.trim() });
      if (d.success) { showToast(`JD added — ${d.skills_extracted} skills extracted ✓`, "success"); setJdText(""); setCompany(""); fetchRoles(); }
      else showToast(d.detail || d.error || "Failed", "error");
    } catch { showToast("Error adding JD", "error"); }
    setLoading(false);
  };
  const deleteJD = async (id) => {
    setDeletingId(id);
    try { const r = await resumeAiService.deleteJD(id); if (r.ok) { showToast("Deleted", "success"); fetchJDs(selectedRole, selectedLevel); fetchRoles(); } else showToast("Failed", "error"); }
    catch { showToast("Error", "error"); }
    setDeletingId(null);
  };
  const inputSx = { mb: 1.5, "& .MuiOutlinedInput-root": { bgcolor: "#F6F8F3", fontSize: 12, borderRadius: 1.5 } };
  return (
    <>
      <div className="panel-overlay" onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(2,33,36,.35)", backdropFilter:"blur(4px)", zIndex:200, animation:"fadeIn .2s ease both" }} />
      <div className="side-panel" style={{ position:"fixed", top:0, right:0, height:"100vh", width:480, maxWidth:"95vw", background:"#fff", borderLeft:"1px solid #E7EAE3", zIndex:201, display:"flex", flexDirection:"column", boxShadow:"-12px 0 48px rgba(2,33,36,.14)", animation:"panelSlide .32s cubic-bezier(.22,.8,.36,1) both", willChange:"transform" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: "16px 20px", borderBottom: "1px solid #E7EAE3", flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ width: 32, height: 32, borderRadius: 2, background: "linear-gradient(135deg,#2E6E62,#3F8C7F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Ico.JD /></Box>
            <Box><Typography sx={{ fontSize: 14, fontWeight: 700 }}>JD Manager</Typography><Typography sx={{ fontSize: 10, color: "text.disabled" }}>Manage Job Descriptions</Typography></Box>
          </Stack>
          <RippleBtn variant="ghost" onClick={onClose} style={{ padding: "6px 9px", marginLeft: "auto", borderRadius: 9 }}><Ico.X /></RippleBtn>
        </Stack>
        <Box sx={{ display: "flex", borderBottom: "1px solid #E7EAE3", flexShrink: 0 }}>
          {[["add", "Add JD"], ["list", "Stored JDs"]].map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); if (k === "list" && selectedRole) fetchJDs(selectedRole, selectedLevel); }}
              style={{ flex: 1, padding: "10px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: tab === k ? 700 : 500, color: tab === k ? "#5E815D" : "#7A8073", borderBottom: `2px solid ${tab === k ? "#5E815D" : "transparent"}`, fontFamily: "inherit", transition: "all .2s" }}>{l}</button>
          ))}
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto", p: "16px 20px" }}>
          {tab === "add" && (
            <Stack spacing={1.5}>
              <Box sx={{ p: "10px 14px", bgcolor: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.3)", borderRadius: 2, fontSize: 11, color: "#3F8C7F", lineHeight: 1.6 }}>Paste a job description — GPT extracts skills automatically.</Box>
              <Stack direction="row" spacing={1}>
                <TextField label="Role *" size="small" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Data Scientist" sx={{ flex: 1, ...inputSx }} />
                <TextField select label="Level" size="small" value={level} onChange={e => setLevel(e.target.value)} sx={{ width: 110, ...inputSx }}>
                  <MenuItem value="fresher">Fresher</MenuItem><MenuItem value="experienced">Experienced</MenuItem>
                </TextField>
              </Stack>
              <TextField label="Company (optional)" size="small" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google" sx={inputSx} />
              <TextField label="Job Description *" multiline rows={10} value={jdText} onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here…"
                helperText={<span style={{ color: jdText.length < 50 ? "#ef4444" : "#7A8073" }}>{jdText.length} chars</span>}
                sx={{ ...inputSx, "& textarea": { fontSize: 11.5 } }} />
              <RippleBtn variant="teal" onClick={addJD} disabled={loading} style={{ justifyContent: "center", padding: "10px" }}>
                {loading ? <><SpinnerEl size={12} color="#fff" /> Extracting with GPT…</> : <><Ico.Plus /> Add JD</>}
              </RippleBtn>
            </Stack>
          )}
          {tab === "list" && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1}>
                <TextField select label="Role" size="small" value={selectedRole} onChange={e => { setSelectedRole(e.target.value); if (e.target.value) fetchJDs(e.target.value, selectedLevel); else setJds([]); }}
                  sx={{ flex: 1, ...inputSx }} SelectProps={{ displayEmpty: true }}>
                  <MenuItem value=""><em>Select a role…</em></MenuItem>
                  {roles.map(r => <MenuItem key={`${r.role}-${r.level}`} value={r.role}>{r.role} ({r.level}) — {r.jd_count} JDs</MenuItem>)}
                </TextField>
                <TextField select label="Level" size="small" value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); if (selectedRole) fetchJDs(selectedRole, e.target.value); }} sx={{ width: 100, ...inputSx }}>
                  <MenuItem value="fresher">Fresher</MenuItem><MenuItem value="experienced">Experienced</MenuItem>
                </TextField>
              </Stack>
              {!selectedRole && <Typography sx={{ textAlign: "center", p: "40px 20px", color: "text.disabled", fontSize: 12 }}>Select a role to view stored JDs</Typography>}
              {selectedRole && loadingJDs && <Stack alignItems="center" sx={{ py: 4, gap: 1 }}><SpinnerEl size={20} color="#5E815D" /><Typography sx={{ fontSize: 12, color: "text.disabled" }}>Loading…</Typography></Stack>}
              {selectedRole && !loadingJDs && jds.length === 0 && <Typography sx={{ textAlign: "center", p: "40px 20px", color: "text.disabled", fontSize: 12 }}>No JDs found.</Typography>}
              {jds.map((jd, i) => (
                <Paper key={jd.id} elevation={0} sx={{ bgcolor: "#F8FAF6", borderRadius: 2, border: "1px solid #E7EAE3", p: "12px 14px" }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Box><Typography component="span" sx={{ fontSize: 12, fontWeight: 700 }}>{jd.company || `JD #${i + 1}`}</Typography><PillEl style={{ marginLeft: 8, fontSize: 9 }}>{jd.skill_count} skills</PillEl></Box>
                    <RippleBtn onClick={() => deleteJD(jd.id)} disabled={deletingId === jd.id} style={{ padding: "3px 7px", background: "rgba(220,38,38,0.08)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)", fontSize: 10 }}>
                      {deletingId === jd.id ? <SpinnerEl size={9} color="#ef4444" /> : <Ico.Trash />}
                    </RippleBtn>
                  </Stack>
                  <Typography sx={{ fontSize: 10.5, color: "text.disabled", mb: 1, lineHeight: 1.5 }}>{jd.jd_preview}</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {jd.skills.slice(0, 12).map(s => <span key={s} style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 4, background: "rgba(8,145,178,0.08)", color: "#3F8C7F", border: "1px solid rgba(8,145,178,0.25)" }}>{s}</span>)}
                    {jd.skills.length > 12 && <Typography component="span" sx={{ fontSize: 9.5, color: "text.disabled" }}>+{jd.skills.length - 12} more</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: 9.5, color: "text.disabled", mt: 0.75 }}>Added: {jd.created_at?.slice(0, 16) || "—"}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   AI CHAT PANEL  — context-aware resume assistant
══════════════════════════════════════════════════════════════════════ */
export default JDManagerPanel;