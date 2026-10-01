import React from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Terminal as TerminalIcon,
  Science as ScienceIcon,
  Keyboard as KeyboardIcon,
  Timer as TimerIcon,
  AlarmOff as AlarmOffIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { parseErrorSummary, PORTAL_Z } from "./CodeEditorParts";

const SECTION_LABELS = [
  "Problem Statement",
  "Sample Input",
  "Sample Output",
  "Input Format",
  "Output Format",
  "Constraints",
  "Expected Time Complexity",
  "Expected Space Complexity",
  "Explanation",
  "Example",
  "Examples",
  "Note",
  "Notes",
];

const escHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const matchSectionLabel = (line) => {
  const t = line.trim().replace(/:$/, "");
  return SECTION_LABELS.find((label) => t.toLowerCase() === label.toLowerCase());
};

const isCodeBlockLabel = (label) =>
  /^(Sample (Input|Output)|Input Format|Output Format|Constraints|Expected (Time|Space) Complexity)$/i.test(
    label,
  );

const formatQuestionContent = (raw) => {
  if (!raw) return "";

  // Already real HTML? Pass through unchanged.
  if (/<(p|br|pre|h[1-6]|div|ul|ol|table|blockquote)\b/i.test(raw)) {
    return raw;
  }

  const lines = String(raw).split(/\r?\n/);
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const matchedLabel = matchSectionLabel(lines[i]);

    if (matchedLabel) {
      out.push(`<h3>${escHtml(matchedLabel)}</h3>`);
      i++;

      const blockLines = [];
      while (i < lines.length && !matchSectionLabel(lines[i])) {
        blockLines.push(lines[i]);
        i++;
      }
      while (blockLines.length && !blockLines[0].trim()) blockLines.shift();
      while (blockLines.length && !blockLines[blockLines.length - 1].trim())
        blockLines.pop();

      if (!blockLines.length) continue;

      if (isCodeBlockLabel(matchedLabel)) {
        out.push(`<pre>${escHtml(blockLines.join("\n"))}</pre>`);
      } else {
        const paras = blockLines.join("\n").split(/\n\s*\n/);
        for (const p of paras) {
          const txt = p.trim();
          if (txt) out.push(`<p>${escHtml(txt).replace(/\n/g, "<br>")}</p>`);
        }
      }
    } else {
      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !matchSectionLabel(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length) {
        out.push(
          `<p>${escHtml(paraLines.join("\n")).replace(/\n/g, "<br>")}</p>`,
        );
      }
    }
  }

  return out.join("");
};

// ═══════════════════════════════════════════════════════════════════
// QUESTION PANEL — pure presentational, no state, no API
// ═══════════════════════════════════════════════════════════════════

export const QuestionPanel = ({
  splitPercent,
  T,
  isDark,
  questionNumber,
  questionTitle,
  questionHtml,
}) => {
  const questionContentStyles = {
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji'`,
    fontSize: 14,
    lineHeight: 1.75,
    color: T.qText,
    wordWrap: "break-word",
    overflowWrap: "break-word",
    userSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    msUserSelect: "none",

    "& h1": {
      fontSize: 22,
      fontWeight: 700,
      color: T.qHeading,
      mt: 0,
      mb: 1.5,
      lineHeight: 1.3,
    },
    "& h2": {
      fontSize: 18,
      fontWeight: 700,
      color: T.qHeading,
      mt: 3,
      mb: 1.5,
      lineHeight: 1.3,
    },
    "& h3": {
      fontSize: 15,
      fontWeight: 700,
      color: T.qHeading,
      mt: 2.5,
      mb: 1,
      lineHeight: 1.4,
    },
    "& h4": {
      fontSize: 14,
      fontWeight: 700,
      color: T.qHeading,
      mt: 2,
      mb: 1,
      lineHeight: 1.4,
    },
    "& p": { mb: 1.5, mt: 0, fontSize: 14, lineHeight: 1.75, color: T.qText, whiteSpace: "pre-wrap", wordBreak: "break-word" },
    "& strong, & b": { color: T.qStrong, fontWeight: 700 },
    "& em, & i": { fontStyle: "italic" },
    "& a": {
      color: T.qLink,
      textDecoration: "none",
      "&:hover": { color: T.qLinkHover, textDecoration: "underline" },
    },

    "& code": {
      backgroundColor: T.qCodeBg,
      color: T.qCodeText,
      border: `1px solid ${T.qCodeBorder}`,
      padding: "1px 6px",
      borderRadius: "4px",
      fontFamily: `'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace`,
      fontSize: "0.875em",
      fontWeight: 500,
      whiteSpace: "nowrap",
    },

    "& pre": {
      backgroundColor: T.qPreBg,
      border: `1px solid ${T.qPreBorder}`,
      borderRadius: "8px",
      padding: "14px 18px",
      margin: "8px 0 16px 0",
      overflow: "auto",
      fontSize: 13,
      lineHeight: 1.65,
      color: T.qPreText,
      fontFamily: `'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace`,
      "& code": {
        backgroundColor: "transparent",
        border: "none",
        padding: 0,
        borderRadius: 0,
        fontSize: "inherit",
        color: "inherit",
        fontWeight: "inherit",
        whiteSpace: "pre",
      },
    },

    "& ul": {
      pl: 2.5,
      mb: 1.5,
      mt: 0.5,
      color: T.qText,
      "& li": {
        mb: 0.4,
        fontSize: 14,
        lineHeight: 1.75,
        "&::marker": { color: T.qTextMuted },
      },
    },
    "& ol": {
      pl: 2.5,
      mb: 1.5,
      mt: 0.5,
      color: T.qText,
      "& li": {
        mb: 0.4,
        fontSize: 14,
        lineHeight: 1.75,
        "&::marker": { color: T.qTextSecondary, fontWeight: 600 },
      },
    },

    "& sup": { fontSize: "0.75em", verticalAlign: "super", lineHeight: 0 },
    "& sub": { fontSize: "0.75em", verticalAlign: "sub", lineHeight: 0 },
    "& hr": { border: "none", borderTop: `1px solid ${T.qSeparator}`, my: 2.5 },

    "& table": {
      width: "100%",
      borderCollapse: "collapse",
      mb: 2,
      fontSize: 13,
      "& th": {
        textAlign: "left",
        fontWeight: 600,
        color: T.qHeading,
        borderBottom: `2px solid ${T.qSeparator}`,
        p: "8px 12px",
      },
      "& td": {
        borderBottom: `1px solid ${T.qSeparator}`,
        p: "8px 12px",
        color: T.qText,
      },
      "& tr:hover td": {
        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
      },
    },

    "& blockquote": {
      borderLeft: `3px solid ${T.accent}`,
      m: 0,
      mb: 1.5,
      pl: 2,
      py: 0.5,
      color: T.qTextSecondary,
      fontStyle: "italic",
      "& p": { mb: 0.5 },
    },

    "& img": { maxWidth: "100%", height: "auto", borderRadius: "6px", my: 1 },
    "& .example, & .example-block": { mb: 2 },
    "& .constraints, & .constraint-list": {
      "& li": { mb: 0.3, "& code": { fontSize: "0.85em" } },
    },
  };

  return (
    <Box
      sx={{
        width: `${splitPercent}%`,
        display: "flex",
        flexDirection: "column",
        bgcolor: T.qBg,
        flexShrink: 0,
        overflow: "hidden",
        borderRight: `1px solid ${T.qBorderRight}`,
        transition: "background 0.3s ease, border-color 0.3s ease",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: { xs: "20px", sm: "28px" },
          py: "24px",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: T.qScrollThumb,
            borderRadius: 3,
            "&:hover": {
              bgcolor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)",
            },
          },
        }}
      >
        {(questionNumber || questionTitle) && (
          <Box sx={{ mb: 2.5 }}>
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 700,
                color: T.qHeading,
                lineHeight: 1.35,
                mb: 1,
                fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
              }}
            >
              {questionNumber ? `${questionNumber}. ` : ""}
              {questionTitle || "Untitled"}
            </Typography>
            <Box
              sx={{
                width: "100%",
                height: "1px",
                bgcolor: T.qSeparator,
                mb: 2,
              }}
            />
          </Box>
        )}

        {questionHtml ? (
          <Box
            sx={questionContentStyles}
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            dangerouslySetInnerHTML={{ __html: formatQuestionContent(questionHtml) }}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              gap: 1.5,
            }}
          >
            <DescriptionIcon
              sx={{ fontSize: 32, opacity: 0.2, color: T.qTextMuted }}
            />
            <Typography sx={{ color: T.qTextMuted, fontSize: 14 }}>
              Question will appear here
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════
// OUTPUT PANEL — pure presentational; tabs: Output / Tests / Input
// ═══════════════════════════════════════════════════════════════════

export const OutputPanel = ({
  outputPanelHeight,
  T,
  isDark,
  activeTab,
  setActiveTab,
  output,
  running,
  testResults,
  customInput,
  setCustomInput,
  customInputRef,
  backendTestCases,
  hiddenCount,
}) => {
  const tabItems = [
    {
      key: "testcases",
      label: "Tests",
      icon: <ScienceIcon sx={{ fontSize: 15 }} />,
    },
    {
      key: "input",
      label: "Input",
      icon: <KeyboardIcon sx={{ fontSize: 15 }} />,
    },
    {
      key: "output",
      label: "Output",
      icon: <TerminalIcon sx={{ fontSize: 15 }} />,
    },
  ];

  return (
    <Box
      sx={{
        height: outputPanelHeight,
        bgcolor: T.bgPanel,
        borderTop: `2px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "all 0.3s ease",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          borderBottom: `1px solid ${T.border}`,
          px: "12px",
        }}
      >
        {tabItems.map((tab) => (
          <Button
            key={tab.key}
            size="small"
            onClick={() => setActiveTab(tab.key)}
            startIcon={tab.icon}
            sx={{
              color: activeTab === tab.key ? T.accent : T.textMuted,
              borderBottom:
                activeTab === tab.key
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              borderRadius: 0,
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: "none",
              px: 2,
              py: 1,
              minWidth: "auto",
              transition: "all 0.2s ease",
              "&:hover": { bgcolor: T.bgHover, color: T.accent },
              "& .MuiButton-startIcon": { mr: 0.5 },
            }}
          >
            {tab.label}
          </Button>
        ))}

        {output && (
          <Box
            sx={{
              ml: "auto",
              display: "flex",
              gap: 1.5,
              pr: 1,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.4,
                fontSize: 11,
                color: T.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <TimerIcon sx={{ fontSize: 13 }} />
              {output.executionTime}
            </Box>
            <Box
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: output.exitCode === 0 ? T.green : T.red,
                bgcolor: output.exitCode === 0 ? T.greenSoft : T.redSoft,
                px: 1,
                py: 0.2,
                borderRadius: "4px",
              }}
            >
              Exit: {output.exitCode}
            </Box>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: "14px",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: T.scrollThumb,
            borderRadius: 3,
          },
        }}
      >
        {activeTab === "output" && (
          <>
            {running ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  color: T.accent,
                }}
              >
                <CircularProgress size={14} sx={{ color: T.accent }} />
                <Typography sx={{ fontSize: 13 }}>
                  Compiling and executing…
                </Typography>
              </Box>
            ) : output ? (
              <Box>
                {output.isCompileError &&
                  (() => {
                    const errInfo = parseErrorSummary(
                      output.stderr,
                      true,
                      false,
                      false,
                    );
                    return (
                      <Box
                        sx={{
                          mb: 1,
                          p: 1.5,
                          borderRadius: "8px",
                          bgcolor: T.bgError,
                          border: `1px solid ${T.bgErrorBd}`,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: errInfo ? 0.8 : 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: T.red,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Compilation Error
                          </Typography>
                        </Box>
                        {errInfo && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                px: 0.8,
                                py: 0.2,
                                borderRadius: "4px",
                                bgcolor: T.red,
                                color: "#fff",
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {errInfo.type}
                            </Typography>
                            {errInfo.line && (
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  px: 0.8,
                                  py: 0.2,
                                  borderRadius: "4px",
                                  bgcolor: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.05)",
                                  color: T.textLabel,
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}
                              >
                                Line {errInfo.line}
                              </Typography>
                            )}
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: T.textLabel,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {errInfo.message}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })()}

                {output.isRuntimeError &&
                  !output.isCompileError &&
                  (() => {
                    const errInfo = parseErrorSummary(
                      output.stderr,
                      false,
                      true,
                      false,
                    );
                    return (
                      <Box
                        sx={{
                          mb: 1,
                          p: 1.5,
                          borderRadius: "8px",
                          bgcolor: T.peachSoft,
                          border: `1px solid rgba(251,146,60,0.2)`,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: errInfo ? 0.8 : 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: T.peach,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Runtime Error
                          </Typography>
                        </Box>
                        {errInfo && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                px: 0.8,
                                py: 0.2,
                                borderRadius: "4px",
                                bgcolor: T.peach,
                                color: "#fff",
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {errInfo.type}
                            </Typography>
                            {errInfo.line && (
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  px: 0.8,
                                  py: 0.2,
                                  borderRadius: "4px",
                                  bgcolor: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.05)",
                                  color: T.textLabel,
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}
                              >
                                Line {errInfo.line}
                              </Typography>
                            )}
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: T.textLabel,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {errInfo.message}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })()}

                {output.isTimeout && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      bgcolor: T.bgWarning,
                      border: `1px solid ${T.bgWarningBd}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <AlarmOffIcon sx={{ fontSize: 16, color: T.yellow }} />
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.yellow,
                        textTransform: "uppercase",
                      }}
                    >
                      Time Limit Exceeded
                    </Typography>
                  </Box>
                )}

                {output.isNetworkError && (
                  <Alert
                    severity="warning"
                    sx={{
                      borderRadius: "8px",
                      fontSize: 12,
                      bgcolor: T.bgWarning,
                      color: T.yellow,
                      border: `1px solid ${T.bgWarningBd}`,
                      "& .MuiAlert-icon": { color: T.yellow },
                    }}
                  >
                    {output.stderr}
                  </Alert>
                )}

                {output.autoInputNote && (
                  <Box
                    sx={{
                      mb: 1,
                      py: 0.5,
                      px: 1.2,
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      bgcolor: isDark
                        ? "rgba(6,182,212,0.08)"
                        : "rgba(6,182,212,0.1)",
                      border: `1px solid ${isDark ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.3)"}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: T.accent,
                        fontStyle: "italic",
                      }}
                    >
                      &#x2139; {output.autoInputNote}
                    </Typography>
                  </Box>
                )}

                {output.stdout && (
                  <pre
                    style={{
                      color: T.text,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      margin: 0,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {output.stdout}
                  </pre>
                )}

                {output.success &&
                  output.stdout?.trim() &&
                  output.outputMatches !== undefined && (
                    <>
                      {/* Expected vs Actual comparison */}
                      {output.expectedOutput !== undefined && (
                        <Box
                          sx={{
                            mt: 1,
                            p: "10px 14px",
                            borderRadius: "8px",
                            bgcolor: output.outputMatches
                              ? T.bgSuccess
                              : T.bgError,
                            border: `1px solid ${output.outputMatches ? T.bgSuccessBd : T.bgErrorBd}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.8,
                          }}
                        >
                          {/* Expected row */}
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "flex-start",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: T.textMuted,
                                minWidth: 70,
                                flexShrink: 0,
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                              }}
                            >
                              Expected
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: T.green,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                bgcolor: isDark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.03)",
                                px: 1,
                                py: 0.3,
                                borderRadius: "4px",
                                flex: 1,
                              }}
                            >
                              {output.expectedOutput}
                            </Typography>
                          </Box>
                          {/* Actual row */}
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "flex-start",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: output.outputMatches ? T.green : T.red,
                                minWidth: 70,
                                flexShrink: 0,
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                              }}
                            >
                              Your Output
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: output.outputMatches ? T.green : T.red,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                bgcolor: output.outputMatches
                                  ? isDark
                                    ? "rgba(52,211,153,0.06)"
                                    : "rgba(22,163,74,0.05)"
                                  : isDark
                                    ? "rgba(248,113,113,0.06)"
                                    : "rgba(220,38,38,0.05)",
                                border: `1px solid ${
                                  output.outputMatches
                                    ? isDark
                                      ? "rgba(52,211,153,0.12)"
                                      : "rgba(22,163,74,0.12)"
                                    : isDark
                                      ? "rgba(248,113,113,0.12)"
                                      : "rgba(220,38,38,0.12)"
                                }`,
                                px: 1,
                                py: 0.3,
                                borderRadius: "4px",
                                flex: 1,
                              }}
                            >
                              {output.stdout.trim()}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Status badge */}
                      <Box
                        sx={{
                          mt: 1.5,
                          py: 0.8,
                          px: 1.5,
                          borderRadius: "8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.8,
                          bgcolor:
                            output.outputMatches === false
                              ? T.bgError
                              : T.bgSuccess,
                          border: `1px solid ${output.outputMatches === false ? T.bgErrorBd : T.bgSuccessBd}`,
                        }}
                      >
                        {output.outputMatches === false ? (
                          <CloseIcon sx={{ fontSize: 14, color: T.red }} />
                        ) : (
                          <CheckIcon sx={{ fontSize: 14, color: T.green }} />
                        )}
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color:
                              output.outputMatches === false ? T.red : T.green,
                          }}
                        >
                          {output.outputMatches === false
                            ? `Wrong Answer · ${output.executionTime}`
                            : `Correct Answer · ${output.executionTime}`}
                        </Typography>
                      </Box>
                    </>
                  )}
                {output.success && !output.stdout?.trim() && (
                  <Box
                    sx={{
                      mt: 1.5,
                      py: 0.8,
                      px: 1.5,
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.8,
                      bgcolor: T.bgWarning,
                      border: `1px solid ${T.bgWarningBd}`,
                    }}
                  >
                    <AlarmOffIcon sx={{ fontSize: 14, color: T.yellow }} />
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 600, color: T.yellow }}
                    >
                      No output produced. Make sure your code prints a result
                      using print().
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              /* 🔧 CHANGE 9/10: Polished empty state — circular icon, two-line copy */
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pt: 5,
                  pb: 3,
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(15,23,42,0.04)",
                    border: `1px dashed ${T.border}`,
                  }}
                >
                  <TerminalIcon sx={{ color: T.textDim, fontSize: 26 }} />
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    sx={{
                      color: T.textLabel,
                      fontSize: 13.5,
                      fontWeight: 600,
                      mb: 0.3,
                    }}
                  >
                    Ready to run
                  </Typography>
                  <Typography sx={{ color: T.textDim, fontSize: 12 }}>
                    Click{" "}
                    <Box
                      component="span"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        px: 0.7,
                        py: 0.1,
                        bgcolor: T.bgInput,
                        border: `1px solid ${T.border}`,
                        borderRadius: "4px",
                        mx: 0.3,
                      }}
                    >
                      Run Code
                    </Box>{" "}
                    or press{" "}
                    <Box
                      component="span"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        px: 0.7,
                        py: 0.1,
                        bgcolor: T.bgInput,
                        border: `1px solid ${T.border}`,
                        borderRadius: "4px",
                        mx: 0.3,
                      }}
                    >
                      Ctrl+Enter
                    </Box>
                  </Typography>
                </Box>
              </Box>
            )}
          </>
        )}

        {activeTab === "testcases" && (
          <>
            {running ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  color: T.accent,
                }}
              >
                <CircularProgress size={14} sx={{ color: T.accent }} />
                <Typography sx={{ fontSize: 13 }}>
                  Running test cases…
                </Typography>
              </Box>
            ) : testResults ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {testResults.results.length === 0 && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      border: "1px solid rgba(220, 38, 38, 0.25)",
                      bgcolor: "rgba(220, 38, 38, 0.06)",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: 13, fontWeight: 700, color: "#A63D2F", mb: 0.5 }}
                    >
                      Couldn't run the test cases
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: "#7A2E24",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {testResults.error ||
                        testResults.overallResult ||
                        "The server returned no results. For SQL, confirm the question has a schema and expected query configured, and that the database user can create the temporary sandbox schema."}
                    </Typography>
                  </Box>
                )}
                {testResults.results.map((tc, i) => {
                  const errorInfo = !tc.passed
                    ? parseErrorSummary(
                        tc.error,
                        tc.isCompileError,
                        tc.isRuntimeError,
                        tc.isTimeout,
                      )
                    : null;

                  return (
                    <Box
                      key={i}
                      sx={{
                        p: "10px 14px",
                        borderRadius: "8px",
                        fontSize: 13,
                        bgcolor: tc.passed ? T.bgSuccess : T.bgError,
                        border: `1px solid ${tc.passed ? T.bgSuccessBd : T.bgErrorBd}`,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Top row: icon + label + status badge */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "7px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            bgcolor: tc.passed ? T.greenDark : T.redDark,
                            color: tc.passed ? T.green : T.red,
                          }}
                        >
                          {tc.passed ? (
                            <CheckIcon sx={{ fontSize: 15 }} />
                          ) : (
                            <CloseIcon sx={{ fontSize: 15 }} />
                          )}
                        </Box>
                        <Typography
                          sx={{
                            color: T.text,
                            flex: 1,
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {tc.label || `Test ${i + 1}`}
                        </Typography>
                        {tc.executionTime && (
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: T.textMuted,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {tc.executionTime}
                          </Typography>
                        )}
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            px: 1,
                            py: 0.3,
                            borderRadius: "5px",
                            textTransform: "uppercase",
                            flexShrink: 0,
                            bgcolor: tc.passed ? T.greenDark : T.redDark,
                            color: tc.passed ? T.green : T.red,
                          }}
                        >
                          {tc.passed ? "pass" : "fail"}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          mt: 1.2,
                          ml: "42px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.8,
                        }}
                      >
                        {/* Input */}
                        {tc.input && tc.input !== "[Hidden]" && (
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "flex-start",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: T.textMuted,
                                minWidth: 60,
                                flexShrink: 0,
                                pt: "1px",
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                              }}
                            >
                              Input
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: T.textLabel,
                                fontFamily: "'JetBrains Mono', monospace",
                                bgcolor: isDark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.03)",
                                px: 1,
                                py: 0.3,
                                borderRadius: "4px",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                maxHeight: 60,
                                overflow: "auto",
                                flex: 1,
                              }}
                            >
                              {tc.input.length > 100
                                ? tc.input.substring(0, 100) + "..."
                                : tc.input}
                            </Typography>
                          </Box>
                        )}

                        {/* Expected Output — for passed tests too */}
                        {tc.expected && tc.expected !== "[Hidden]" && (
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "flex-start",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: T.textMuted,
                                minWidth: 60,
                                flexShrink: 0,
                                pt: "1px",
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                              }}
                            >
                              Expected
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: tc.passed ? T.green : T.textLabel,
                                fontFamily: "'JetBrains Mono', monospace",
                                bgcolor: isDark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.03)",
                                px: 1,
                                py: 0.3,
                                borderRadius: "4px",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                flex: 1,
                              }}
                            >
                              {tc.expected.length > 100
                                ? tc.expected.substring(0, 100) + "..."
                                : tc.expected}
                            </Typography>
                          </Box>
                        )}

                        {tc.actualOutput != null &&
                          tc.actualOutput !== "[Hidden]" && (
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "flex-start",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: tc.passed ? T.green : T.red,
                                  minWidth: 60,
                                  flexShrink: 0,
                                  pt: "1px",
                                  textTransform: "uppercase",
                                  letterSpacing: 0.4,
                                }}
                              >
                                Output
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: 12,
                                  color: tc.passed ? T.green : T.red,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  bgcolor: tc.passed
                                    ? isDark
                                      ? "rgba(52,211,153,0.06)"
                                      : "rgba(22,163,74,0.05)"
                                    : isDark
                                      ? "rgba(248,113,113,0.06)"
                                      : "rgba(220,38,38,0.05)",
                                  px: 1,
                                  py: 0.3,
                                  borderRadius: "4px",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  maxHeight: 60,
                                  overflow: "auto",
                                  flex: 1,
                                  border: `1px solid ${
                                    tc.passed
                                      ? isDark
                                        ? "rgba(52,211,153,0.12)"
                                        : "rgba(22,163,74,0.12)"
                                      : isDark
                                        ? "rgba(248,113,113,0.12)"
                                        : "rgba(220,38,38,0.12)"
                                  }`,
                                }}
                              >
                                {tc.actualOutput
                                  ? tc.actualOutput.length > 100
                                    ? tc.actualOutput.substring(0, 100) + "..."
                                    : tc.actualOutput
                                  : "(no output)"}
                              </Typography>
                            </Box>
                          )}
                      </Box>
                      {!tc.passed && errorInfo && (
                        <Box
                          sx={{
                            mt: 1,
                            ml: "42px",
                            p: "8px 12px",
                            borderRadius: "6px",
                            bgcolor: tc.isCompileError
                              ? T.redSoft
                              : tc.isTimeout
                                ? T.yellowSoft
                                : T.peachSoft,
                            border: `1px solid ${
                              tc.isCompileError
                                ? T.bgErrorBd
                                : tc.isTimeout
                                  ? T.bgWarningBd
                                  : "rgba(251,146,60,0.2)"
                            }`,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              px: 0.8,
                              py: 0.2,
                              borderRadius: "4px",
                              bgcolor: tc.isTimeout ? T.yellow : T.red,
                              color: "#fff",
                              fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: 0.3,
                              flexShrink: 0,
                            }}
                          >
                            {errorInfo.type}
                          </Typography>

                          {/* Line number */}
                          {errorInfo.line && (
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 600,
                                px: 0.8,
                                py: 0.2,
                                borderRadius: "4px",
                                bgcolor: isDark
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.05)",
                                color: T.textLabel,
                                fontFamily: "'JetBrains Mono', monospace",
                                flexShrink: 0,
                              }}
                            >
                              Line {errorInfo.line}
                            </Typography>
                          )}

                          {/* Error message */}
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: T.textLabel,
                              fontFamily: "'JetBrains Mono', monospace",
                              lineHeight: 1.4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {errorInfo.message}
                          </Typography>
                        </Box>
                      )}

                      {!tc.passed &&
                        !errorInfo &&
                        !tc.isCompileError &&
                        !tc.isRuntimeError &&
                        !tc.isTimeout && (
                          <Box
                            sx={{
                              mt: 1,
                              ml: "42px",
                              p: "8px 12px",
                              borderRadius: "6px",
                              bgcolor: T.peachSoft,
                              border: `1px solid rgba(251,146,60,0.2)`,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                px: 0.8,
                                py: 0.2,
                                borderRadius: "4px",
                                bgcolor: T.peach,
                                color: "#fff",
                                fontFamily: "'JetBrains Mono', monospace",
                                flexShrink: 0,
                              }}
                            >
                              Wrong Answer
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: T.textLabel,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              Output doesn't match expected result
                            </Typography>
                          </Box>
                        )}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              /* 🔧 CHANGE 9/10 (cont.): Matching polished empty state for Tests tab */
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pt: 5,
                  pb: 3,
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(15,23,42,0.04)",
                    border: `1px dashed ${T.border}`,
                  }}
                >
                  <ScienceIcon sx={{ color: T.textDim, fontSize: 26 }} />
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    sx={{
                      color: T.textLabel,
                      fontSize: 13.5,
                      fontWeight: 600,
                      mb: 0.3,
                    }}
                  >
                    No tests run yet
                  </Typography>
                  <Typography sx={{ color: T.textDim, fontSize: 12 }}>
                    Click{" "}
                    <Box
                      component="span"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        px: 0.7,
                        py: 0.1,
                        bgcolor: T.bgInput,
                        border: `1px solid ${T.border}`,
                        borderRadius: "4px",
                        mx: 0.3,
                      }}
                    >
                      Run Tests
                    </Box>{" "}
                    to validate against all test cases
                  </Typography>
                </Box>
              </Box>
            )}
          </>
        )}

        {activeTab === "input" && (
          <Box>
            {/* Show test case inputs if available */}
            {false && backendTestCases.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: T.textLabel,
                    mb: 1,
                    fontWeight: 600,
                  }}
                >
                  Test Case Inputs
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}
                >
                  {backendTestCases
                    .filter((tc) => !tc.is_hidden)
                    .map((tc, i) => (
                      <Box
                        key={tc.id || i}
                        sx={{
                          p: "8px 12px",
                          borderRadius: "6px",
                          bgcolor: T.bgInput,
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: T.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: 0.4,
                            }}
                          >
                            Test Case {tc.id || i + 1}
                          </Typography>
                          <Tooltip
                            title="Use as custom input"
                            arrow
                            PopperProps={{ sx: { zIndex: PORTAL_Z } }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => setCustomInput(tc.input || "")}
                              sx={{
                                p: "2px",
                                color: T.textMuted,
                                "&:hover": { color: T.accent },
                              }}
                            >
                              <CopyIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box sx={{ display: "flex", gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: 10,
                                color: T.textMuted,
                                mb: 0.3,
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                            >
                              Input
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: T.textCode,
                                fontFamily: "'JetBrains Mono', monospace",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {(tc.input || "(empty)").length > 80
                                ? tc.input.substring(0, 80) + "..."
                                : tc.input || "(empty)"}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: 10,
                                color: T.textMuted,
                                mb: 0.3,
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                            >
                              Expected Output
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: T.green,
                                fontFamily: "'JetBrains Mono', monospace",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {(tc.expected_output || "").length > 80
                                ? tc.expected_output.substring(0, 80) + "..."
                                : tc.expected_output || ""}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  {hiddenCount > 0 && (
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: T.textMuted,
                        fontStyle: "italic",
                        mt: 0.3,
                      }}
                    >
                      + {hiddenCount} hidden test case
                      {hiddenCount > 1 ? "s" : ""} (used for final grading)
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            <Typography
              sx={{ fontSize: 12, color: T.textLabel, mb: 1, fontWeight: 600 }}
            >
              Custom Input (stdin)
            </Typography>
            <textarea
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                customInputRef.current = e.target.value;
              }}
              placeholder={
                backendTestCases.length > 0
                  ? "Leave empty to use Test Case 1 input automatically, or enter custom input here..."
                  : "Enter your input here... This will be sent as stdin when you click Run Code."
              }
              style={{
                width: "100%",
                height: backendTestCases.length > 0 ? 70 : 100,
                resize: "vertical",
                background: T.bgInput,
                border: `1px solid ${T.borderHover}`,
                borderRadius: 8,
                color: T.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                padding: 12,
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.borderFocus)}
              onBlur={(e) => (e.target.style.borderColor = T.borderHover)}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};