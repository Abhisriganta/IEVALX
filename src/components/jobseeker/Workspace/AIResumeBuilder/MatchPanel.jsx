// ============================================================================
// MatchPanel.jsx — ATS Resume Match side panel: compares resume against
//                  stored JDs, shows per-JD scores and skill gaps.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/MatchPanel.jsx
// ============================================================================

import React, { useState, useEffect } from "react";
import { Box, Stack, Typography, Paper, TextField, MenuItem, Button } from "@mui/material";
import { SpinnerEl, RippleBtn, PillEl, ScoreRing, Ico } from "./atoms";


import useSparkle from "@/hooks/jobseeker/useSparkle";    
import resumeAiService from "@/services/api/jobseeker/resumeAiService";
function MatchPanel({ sessionId, onClose, showToast, onGoToSection, onAddSkill }) {
  const [role, setRole] = useState(""); const [level, setLevel] = useState("fresher"); const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false); const [result, setResult] = useState(null);
  const [dlLoading, setDlLoading] = useState(false); const [expandedJD, setExpandedJD] = useState(null);
  const [addingSkill, setAddingSkill] = useState(null);
  const sparkle = useSparkle();
  useEffect(() => { fetchRoles(); }, []);
  const fetchRoles = async () => { try { const d = await resumeAiService.getJDRoles(); setRoles(d.roles || []); } catch {} };
  const runMatch = async () => {
    if (!role.trim()) { showToast("Select a role first","error"); return; }
    setLoading(true); setResult(null);
    try {
      const d = await resumeAiService.runMatch({session_id:sessionId,role:role.trim(),level,force_refresh:true});
      if (d.detail) showToast(d.detail||"Match error","error"); else setResult(d);
    } catch(e){ showToast(`Failed: ${e.message}`,"error"); }
    setLoading(false);
  };
  const downloadReport = async (e) => {
    if (!result) return; setDlLoading(true);
    try {
      const r = await resumeAiService.getMatchReport({session_id:sessionId,role:role.trim(),level});
      if (!r.ok){showToast("PDF generation failed","error");setDlLoading(false);return;}
      const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");
      a.href=url;a.download=`resume_vs_${role.replace(/\s+/g,"_")}_report.pdf`;a.click();URL.revokeObjectURL(url);
      showToast("Report downloaded ✓","success");sparkle(e.clientX,e.clientY,"#22c55e");
    } catch{showToast("Download failed","error");}
    setDlLoading(false);
  };
  const handleFixSkill = async (skillName) => {
    if (!onAddSkill) return; setAddingSkill(skillName);
    try { await onAddSkill(skillName); showToast(`"${skillName}" added ✓`,"success"); }
    catch(e){ showToast(`Failed: ${e.message}`,"error"); }
    setAddingSkill(null);
  };
  const score = Number(result?.overall_score)||0;
  const iSx = {mb:1,"& .MuiOutlinedInput-root":{bgcolor:"#F6F8F3",fontSize:12,borderRadius:1.5}};
  return (
    <>
      <div className="panel-overlay" onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(2,33,36,.35)", backdropFilter:"blur(4px)", zIndex:200, animation:"fadeIn .2s ease both" }} />
      <div className="side-panel" style={{ position:"fixed", top:0, right:0, height:"100vh", width:480, maxWidth:"95vw", background:"#fff", borderLeft:"1px solid #E7EAE3", zIndex:201, display:"flex", flexDirection:"column", boxShadow:"-12px 0 48px rgba(2,33,36,.14)", animation:"panelSlide .32s cubic-bezier(.22,.8,.36,1) both", willChange:"transform" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{p:"16px 20px",borderBottom:"1px solid #E7EAE3",flexShrink:0}}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{width:32,height:32,borderRadius:2,background:"linear-gradient(135deg,#5E815D,#7F9E7E)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Ico.Match/></Box>
            <Box><Typography sx={{fontSize:14,fontWeight:700}}>Resume Match</Typography><Typography sx={{fontSize:10,color:"text.disabled"}}>ATS Score vs Real JDs</Typography></Box>
          </Stack>
          <RippleBtn variant="ghost" onClick={onClose} style={{padding:"6px 9px", marginLeft:"auto", borderRadius:9}}><Ico.X/></RippleBtn>
        </Stack>
        <Box sx={{flex:1,overflowY:"auto",p:"16px 20px"}}>
          <Stack direction="row" spacing={1} sx={{mb:1.5}}>
            <TextField select label="Role" size="small" value={role} onChange={e=>setRole(e.target.value)} sx={{flex:1,...iSx}} SelectProps={{displayEmpty:true}}>
              <MenuItem value=""><em>Select role…</em></MenuItem>
              {roles.map(r=><MenuItem key={`${r.role}-${r.level}`} value={r.role}>{r.role} — {r.jd_count} JDs</MenuItem>)}
            </TextField>
            <TextField select label="Level" size="small" value={level} onChange={e=>setLevel(e.target.value)} sx={{width:100,...iSx}}>
              <MenuItem value="fresher">Fresher</MenuItem><MenuItem value="experienced">Experienced</MenuItem>
            </TextField>
          </Stack>
          {roles.length===0 && <Box sx={{p:"10px 14px",bgcolor:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:2,fontSize:11,color:"#ef4444",mb:1.5}}>No JDs stored yet — add some via <strong>JD Manager</strong>.</Box>}
          {result?.error && <Box sx={{p:"10px 14px",bgcolor:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:2,fontSize:11,color:"#ef4444",mb:1.5}}>{result.error}</Box>}
          <RippleBtn variant="accent" onClick={runMatch} disabled={loading||!role} style={{width:"100%",justifyContent:"center",padding:"10px",marginBottom:16}}>
            {loading?<><SpinnerEl size={12} color="#fff"/> Analyzing…</>:<><Ico.Match/> Run Match</>}
          </RippleBtn>
          {result && !result.error && (
            <Stack spacing={1.75}>
              <Paper elevation={0} sx={{bgcolor:"#F8FAF6",borderRadius:2,border:"1px solid #E7EAE3",p:"16px"}}>
                <Box sx={{display:"flex",gap:2,alignItems:"center"}}>
                  <ScoreRing score={Math.round(score)} size={80}/>
                  <Box sx={{flex:1}}>
                    <Typography sx={{fontSize:11,color:"text.disabled",mb:0.4}}>Average Match Score</Typography>
                    <Typography sx={{fontSize:22,fontWeight:800,color:"#16a34a",mb:0.4}}>{score}%</Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      <PillEl bg="rgba(22,163,74,0.08)" color="#22c55e" border="rgba(22,163,74,0.3)">Best: {result.max_score}%</PillEl>
                      <PillEl bg="rgba(220,38,38,0.08)" color="#ef4444" border="rgba(220,38,38,0.3)">Worst: {result.min_score}%</PillEl>
                      <PillEl>{result.total_jds} JDs</PillEl>
                    </Stack>
                  </Box>
                </Box>
              </Paper>
              {result.common_matched?.length>0 && (
                <Paper elevation={0} sx={{bgcolor:"#F8FAF6",borderRadius:2,border:"1px solid #E7EAE3",p:"12px 14px"}}>
                  <Typography sx={{fontSize:10,fontWeight:700,color:"#16a34a",textTransform:"uppercase",letterSpacing:".06em",mb:1}}>✓ Skills You Have</Typography>
                  <Box sx={{display:"flex",flexWrap:"wrap",gap:0.5}}>
                    {result.common_matched.slice(0,15).map(s=>(
                      <span key={s.skill} style={{fontSize:10,padding:"3px 8px",borderRadius:4,background:"rgba(22,163,74,0.08)",color:"#16a34a",border:"1px solid rgba(22,163,74,0.25)"}}>
                        {s.skill} <span style={{opacity:.7}}>({s.pct}%)</span>
                      </span>
                    ))}
                  </Box>
                </Paper>
              )}
              {result.common_missing?.length>0 && (
                <Paper elevation={0} sx={{bgcolor:"#F8FAF6",borderRadius:2,border:"1px solid #E7EAE3",p:"12px 14px"}}>
                  <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between",mb:1}}>
                    <Typography sx={{fontSize:10,fontWeight:700,color:"#ef4444",textTransform:"uppercase",letterSpacing:".06em"}}>✗ Skills to Add</Typography>
                    {onGoToSection && <button onClick={()=>onGoToSection("skills")} style={{fontSize:9.5,fontWeight:700,padding:"3px 9px",borderRadius:99,border:"1.5px solid #5E815D",background:"rgba(94,129,93,0.07)",color:"#5E815D",cursor:"pointer",fontFamily:"'Jost',sans-serif"}}>➕ Go to Skills</button>}
                  </Box>
                  <Stack spacing={0.6}>
                    {result.common_missing.slice(0,12).map(s=>(
                      <Box key={s.skill} sx={{display:"flex",alignItems:"center",justifyContent:"space-between",p:"5px 8px",bgcolor:"rgba(220,38,38,0.04)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:1}}>
                        <Typography sx={{fontSize:10.5,color:"#ef4444",fontWeight:600}}>{s.skill} <span style={{opacity:.65,fontWeight:400}}>({s.pct}%)</span></Typography>
                        {onAddSkill && <button onClick={()=>handleFixSkill(s.skill)} disabled={addingSkill===s.skill} style={{fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:99,border:"1px solid rgba(22,163,74,0.4)",background:"rgba(22,163,74,0.08)",color:"#16a34a",cursor:addingSkill===s.skill?"not-allowed":"pointer",fontFamily:"'Jost',sans-serif",opacity:addingSkill===s.skill?0.6:1}}>{addingSkill===s.skill?"Adding…":"+ Fix This"}</button>}
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}
              {result.jd_results?.length>0 && (
                <Paper elevation={0} sx={{bgcolor:"#F8FAF6",borderRadius:2,border:"1px solid #E7EAE3",p:"12px 14px"}}>
                  <Typography sx={{fontSize:10,fontWeight:700,color:"text.disabled",textTransform:"uppercase",letterSpacing:".06em",mb:1.25}}>Per-JD Breakdown</Typography>
                  <Stack spacing={0.75}>
                    {result.jd_results.map((jd,i)=>{
                      const jc=jd.score>=70?"#16a34a":jd.score>=50?"#d97706":"#dc2626";
                      const isOpen=expandedJD===i;
                      return(
                        <Box key={i} sx={{borderRadius:1,border:"1px solid #E7EAE3",overflow:"hidden"}}>
                          <Box onClick={()=>setExpandedJD(isOpen?null:i)} sx={{p:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:1,bgcolor:isOpen?"#F6F8F3":"transparent"}}>
                            <Box sx={{width:36,height:36,borderRadius:1,bgcolor:`${jc}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <Typography sx={{fontSize:13,fontWeight:800,color:jc}}>{jd.score}</Typography>
                            </Box>
                            <Box sx={{flex:1,minWidth:0}}>
                              <Typography sx={{fontSize:11.5,fontWeight:600}}>{jd.company||`JD #${i+1}`}</Typography>
                              <Typography sx={{fontSize:10,color:"text.disabled",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{jd.verdict}</Typography>
                            </Box>
                            <Typography component="span" sx={{color:"text.disabled",fontSize:10}}>{isOpen?"▲":"▼"}</Typography>
                          </Box>
                          {isOpen&&(
                            <Box sx={{p:"10px 12px",borderTop:"1px solid #E7EAE3"}}>
                              {jd.strengths&&<Typography sx={{fontSize:10.5,color:"#16a34a",mb:0.75}}>✓ {jd.strengths}</Typography>}
                              {jd.gaps&&<Typography sx={{fontSize:10.5,color:"#ef4444",mb:0.75}}>✗ {jd.gaps}</Typography>}
                              {jd.matched_skills?.length>0&&<Typography sx={{fontSize:10,color:"text.disabled",mb:0.5}}>Matched: <span style={{color:"#16a34a"}}>{jd.matched_skills.join(", ")}</span></Typography>}
                              {jd.missing_skills?.length>0&&<Typography sx={{fontSize:10,color:"text.disabled"}}>Missing: <span style={{color:"#ef4444"}}>{jd.missing_skills.slice(0,6).join(", ")}</span></Typography>}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              )}
              <RippleBtn variant="green" onClick={downloadReport} disabled={dlLoading} style={{width:"100%",justifyContent:"center",padding:"10px"}}>
                {dlLoading?<><SpinnerEl size={12} color="#fff"/> Generating…</>:<><Ico.Dl/> Download PDF Report</>}
              </RippleBtn>
            </Stack>
          )}
        </Box>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PDF VIEWER  — with text-search highlight overlay + page tracking
══════════════════════════════════════════════════════════════════════ */

export default MatchPanel;