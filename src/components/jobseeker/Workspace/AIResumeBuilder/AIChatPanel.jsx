// ============================================================================
// AIChatPanel.jsx — Context-aware AI resume coaching side panel.
//                   Knows the current section and active editing field.
// Location: src/components/jobseeker/Workspace/AIResumeBuilder/AIChatPanel.jsx
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Sparkles, X } from "lucide-react";
import { SpinnerEl, RippleBtn, Ico } from "./atoms";
import { SUGGESTED_PROMPTS } from "@/constants/resumeAiConstants";
import resumeAiService from "@/services/api/jobseeker/resumeAiService";



function AIChatPanel({ onClose, sessionId, fields, activeSection, editingField, showToast, isDark }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your AI resume coach. I can help you improve any section, write bullet points, tailor your resume to a JD, and more.\n\nWhat would you like to work on?", ts: Date.now() }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef         = useRef(null);
  const inputRef               = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  const buildContext = () => {
    const sectionFields = fields.filter(f => (f.section?.key || "other") === activeSection && f.text?.trim());
    const sectionText   = sectionFields.slice(0, 8).map(f => f.text).join("\n");
    const sectionLabel  = activeSection?.startsWith("__page_") ? "Custom Page" : (activeSection || "resume");
    return { sectionText, currentField: editingField?.text || "", sectionLabel };
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", text: text.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput(""); setLoading(true);
    try {
      const d = await resumeAiService.aiChat({
        session_id: sessionId,
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.text })),
        context: buildContext(),
      });
      if (d.reply) setMessages(prev => [...prev, { role: "assistant", text: d.reply, suggestion: d.suggestion || null, ts: Date.now() }]);
      else throw new Error(d.error || "No reply");
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again.", ts: Date.now() }]);
    }
    setLoading(false);
  };

  const copyText = async (t) => { await navigator.clipboard.writeText(t); showToast("Copied ✓", "success"); };

  const bg = isDark ? "#062C26" : "#fff";
  const hdrBg = isDark ? "rgba(3,32,28,.98)" : "#fff";
  const border = isDark ? "rgba(60,96,88,.18)" : "#E7EAE3";
  const txtCol = isDark ? "#E7EFE6" : "#101210";
  const mutedCol = isDark ? "rgba(168,191,167,.55)" : "#55584F";
  const aiBg = isDark ? "rgba(255,255,255,.06)" : "#F8FAF6";
  const aiBdr = isDark ? "rgba(60,96,88,.2)" : "#E7EAE3";
  const userGrad = "linear-gradient(135deg,#5E815D,#9FB89E)";

  return (
    <>
      <div className="panel-overlay" onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(2,33,36,.35)", backdropFilter:"blur(4px)", zIndex:210, animation:"fadeIn .2s ease both" }} />
      <div style={{ position:"fixed", top:0, right:0, height:"100vh", width:540, maxWidth:"95vw",
        background:bg, borderLeft:`1px solid ${border}`, zIndex:211,
        display:"flex", flexDirection:"column",
        animation:"panelSlide .32s cubic-bezier(.22,.8,.36,1) both", willChange:"transform",
        boxShadow:"-8px 0 40px rgba(0,0,0,.18)", fontFamily:"'Jost',sans-serif" }}>

        {/* Header */}
        <Box sx={{ p:"14px 18px", borderBottom:`1px solid ${border}`, flexShrink:0, bgcolor:hdrBg, display:"flex", alignItems:"center", gap:1.5 }}>
          <Box sx={{ width:36, height:36, borderRadius:2.5, background:"linear-gradient(135deg,#1D5A50,#2E6E62)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 14px rgba(29,90,80,.4)", flexShrink:0 }}>
            <Sparkles size={16} color="#fff" />
          </Box>
          <Box sx={{ flex:1 }}>
            <Typography sx={{ fontSize:14, fontWeight:800, color:txtCol, fontFamily:"'Jost',sans-serif", letterSpacing:"-.02em" }}>AI Resume Coach</Typography>
            <Box sx={{ display:"flex", alignItems:"center", gap:0.75 }}>
              <Box sx={{ width:6, height:6, borderRadius:"50%", bgcolor:"#22c55e", boxShadow:"0 0 6px #22c55e" }} />
              <Typography sx={{ fontSize:10.5, color:mutedCol }}>Knows your resume · Context-aware</Typography>
            </Box>
          </Box>
          <RippleBtn variant="ghost" onClick={onClose} style={{ padding:"6px 9px", border:"none", background:"transparent", marginLeft:"auto", borderRadius:9 }}><Ico.X /></RippleBtn>
        </Box>

        {/* Editing field strip */}
        {editingField && (
          <Box sx={{ px:2, py:0.875, bgcolor:isDark?"rgba(29,90,80,.1)":"#F1F6F4", borderBottom:`1px solid ${isDark?"rgba(29,90,80,.2)":"#E7EFEC"}`, display:"flex", alignItems:"center", gap:1, flexShrink:0 }}>
            <Box sx={{ width:5, height:5, borderRadius:"50%", bgcolor:"#6FA095", flexShrink:0, animation:"pulse 1.4s infinite" }} />
            <Typography sx={{ fontSize:10.5, color:isDark?"#A9C7C0":"#1D5A50", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
              Editing: "{editingField.text?.slice(0,55)}{editingField.text?.length > 55 ? "…" : ""}"
            </Typography>
          </Box>
        )}

        {/* Messages */}
        <Box sx={{ flex:1, overflowY:"auto", p:"14px 16px", display:"flex", flexDirection:"column", gap:1.5,
          "&::-webkit-scrollbar":{ width:4 },
          "&::-webkit-scrollbar-thumb":{ background:isDark?"rgba(60,96,88,.35)":"#E7EAE3", borderRadius:99 } }}>
          {messages.map((msg, i) => (
            <Box key={i} sx={{ display:"flex", flexDirection:"column", alignItems:msg.role==="user"?"flex-end":"flex-start" }}>
              {msg.role === "user" ? (
                <Box sx={{ maxWidth:"82%", px:2, py:1.25, borderRadius:"16px 16px 4px 16px",
                  background:userGrad, color:"#fff", fontSize:13, lineHeight:1.6, wordBreak:"break-word" }}>
                  {msg.text}
                </Box>
              ) : (
                <Box sx={{ maxWidth:"94%", display:"flex", flexDirection:"column", gap:0.75 }}>
                  <Box sx={{ display:"flex", alignItems:"flex-start", gap:1 }}>
                    <Box sx={{ width:24, height:24, borderRadius:"50%", flexShrink:0, mt:0.25, background:"linear-gradient(135deg,#1D5A50,#2E6E62)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Sparkles size={11} color="#fff" />
                    </Box>
                    <Box sx={{ flex:1, px:1.75, py:1.25, borderRadius:"4px 16px 16px 16px",
                      bgcolor:aiBg, border:`1px solid ${aiBdr}`,
                      fontSize:13, color:txtCol, lineHeight:1.7, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>
                      {msg.text}
                    </Box>
                  </Box>
                  {msg.suggestion && (
                    <Box sx={{ ml:4, p:"10px 14px", borderRadius:2, bgcolor:isDark?"rgba(29,90,80,.1)":"#F1F6F4", border:`1.5px solid ${isDark?"rgba(111,160,149,.3)":"#D6E4E0"}` }}>
                      <Typography sx={{ fontSize:9.5, fontWeight:700, color:"#6FA095", textTransform:"uppercase", letterSpacing:".06em", mb:0.75 }}>✦ Suggested Text</Typography>
                      <Typography sx={{ fontSize:12.5, color:txtCol, lineHeight:1.65, whiteSpace:"pre-wrap", mb:1 }}>{msg.suggestion}</Typography>
                      <Box component="button" onClick={() => copyText(msg.suggestion)}
                        sx={{ display:"inline-flex", alignItems:"center", gap:0.5, px:1.25, py:0.5, borderRadius:1.5,
                          border:`1px solid ${isDark?"rgba(111,160,149,.35)":"#D6E4E0"}`, bgcolor:"transparent",
                          color:isDark?"#A9C7C0":"#1D5A50", fontSize:10.5, fontWeight:600, cursor:"pointer", fontFamily:"'Jost',sans-serif",
                          "&:hover":{ bgcolor:isDark?"rgba(29,90,80,.15)":"#E7EFEC" } }}>
                        Copy
                      </Box>
                    </Box>
                  )}
                  {!msg.suggestion && i > 0 && (
                    <Box component="button" onClick={() => copyText(msg.text)}
                      sx={{ ml:4, border:"none", bgcolor:"transparent", color:mutedCol, fontSize:10,
                        cursor:"pointer", fontFamily:"'Jost',sans-serif", display:"flex", alignItems:"center", gap:0.5, p:0,
                        "&:hover":{ color:isDark?"#A9C7C0":"#1D5A50" } }}>
                      Copy reply
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ))}
          {loading && (
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <Box sx={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,#1D5A50,#2E6E62)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Sparkles size={11} color="#fff" /></Box>
              <Box sx={{ px:1.75, py:1.125, borderRadius:"4px 16px 16px 16px", bgcolor:aiBg, border:`1px solid ${aiBdr}`, display:"flex", alignItems:"center", gap:0.625 }}>
                {[0,1,2].map(j => <Box key={j} sx={{ width:5, height:5, borderRadius:"50%", bgcolor:"#6FA095", animation:`pulse 1.2s ${j*0.2}s infinite` }} />)}
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <Box sx={{ px:2, pb:1, flexShrink:0 }}>
            <Typography sx={{ fontSize:10, fontWeight:700, color:mutedCol, textTransform:"uppercase", letterSpacing:".06em", mb:1 }}>Quick prompts</Typography>
            <Box sx={{ display:"flex", flexWrap:"wrap", gap:0.75 }}>
              {SUGGESTED_PROMPTS.map((p, i) => (
                <Box key={i} component="button" onClick={() => sendMessage(p.text)}
                  sx={{ display:"flex", alignItems:"center", gap:0.625, px:1.25, py:0.625, borderRadius:99,
                    border:`1px solid ${isDark?"rgba(29,90,80,.3)":"#D6E4E0"}`,
                    bgcolor:isDark?"rgba(29,90,80,.08)":"#F1F6F4",
                    color:isDark?"#A9C7C0":"#1D5A50", fontSize:11.5, fontWeight:600,
                    cursor:"pointer", fontFamily:"'Jost',sans-serif", transition:"all .12s",
                    "&:hover":{ bgcolor:isDark?"rgba(29,90,80,.18)":"#E7EFEC" } }}>
                  {p.icon} {p.text}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Input */}
        <Box sx={{ p:"12px 14px", borderTop:`1px solid ${border}`, bgcolor:hdrBg, flexShrink:0 }}>
          <Box sx={{ display:"flex", gap:1.25, alignItems:"flex-end",
            bgcolor:isDark?"rgba(255,255,255,.05)":"#FFFFFF",
            border:`1.5px solid ${isDark?"rgba(29,90,80,.3)":"#E7EAE3"}`,
            borderRadius:"14px", px:1.75, py:1.1,
            transition:"border-color .15s ease, box-shadow .15s ease",
            "&:focus-within":{ borderColor:"#1D5A50", boxShadow:"0 0 0 3px rgba(29,90,80,.12)" } }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask anything about your resume…"
              rows={1}
              style={{ flex:1, resize:"none", border:"none", background:"transparent",
                fontFamily:"'Jost',sans-serif", fontSize:13.5, lineHeight:1.6,
                color:isDark?"#E7EFE6":"#101210", outline:"none", maxHeight:120, overflowY:"auto",
                padding:"4px 0", minWidth:0 }} />
            <Box component="button" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              title="Send (Enter)"
              sx={{ width:38, height:38, borderRadius:"50%", border:"none", flexShrink:0, mb:"-2px",
                background:(!input.trim()||loading)?(isDark?"rgba(255,255,255,.06)":"#EFF2EC"):"linear-gradient(135deg,#1D5A50,#2E6E62)",
                color:(!input.trim()||loading)?mutedCol:"#fff",
                cursor:(!input.trim()||loading)?"not-allowed":"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"transform .15s ease, box-shadow .15s ease, background .2s ease",
                boxShadow:(!input.trim()||loading)?"none":"0 4px 14px rgba(29,90,80,.4)",
                "&:hover":(!input.trim()||loading)?{}:{ transform:"scale(1.06)", boxShadow:"0 6px 18px rgba(29,90,80,.5)" } }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft:2 }}>
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </Box>
          </Box>
          <Typography sx={{ fontSize:10, color:mutedCol, mt:0.75, textAlign:"center" }}>Context-aware · Enter to send · Shift+Enter for newline</Typography>
        </Box>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MATCH PANEL
══════════════════════════════════════════════════════════════════════ */
export default AIChatPanel;