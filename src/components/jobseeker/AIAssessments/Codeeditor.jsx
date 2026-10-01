import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import ReactDOM from "react-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Select,
  MenuItem,
  Menu,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  PlayArrow as RunIcon,
  KeyboardArrowDownRounded,
  RestartAlt as ResetIcon,
  Close as CloseIcon,
  Terminal as TerminalIcon,
  Science as ScienceIcon,
  Timer as TimerIcon,
  ArrowBackOutlined,
  ArrowForwardOutlined,
  CloudDoneOutlined,
  Check as CheckIcon,
} from "@mui/icons-material";
import {
  LANGUAGES,
  executeCode,
  runTestCasesServer,
  getTestCases,
} from "@/services/api/jobseeker/compilerService";
import {
  LanguageIcon,
  themes,
  LineNumbers,
  ResizableDivider,
  PORTAL_Z,
  ThemeToggle,
  highlightCode,
} from "./CodeEditorParts";

import {
  useNativeFullscreen,
  useBodyScrollLock,
} from "@/hooks/jobseeker/useCodeEditor";

import { QuestionPanel, OutputPanel } from "./CodeEditorPanels";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const CodeEditor = ({
  value,
  startFullscreen = false,
  onChange,
  questionNumber,         

  apiQuestionNumber,
  questionHtml,
  questionTitle,
  placeholder,
  testId,
  timeLeft,
  sectionTimeLeft,
  onPrevious,
  onSkip,
  onNext,
  canGoPrevious,
  isLastQuestion,
  hasAnswer,
  isSubmitting,
isTimeExpired,
  isAnswered,
  language: languageProp = null,
  onLanguageChange,
  lockLanguage = false,
  boilerplate = "",
  themeMode: themeProp,
  onThemeChange,
  allQuestions = [],
  onQuestionJump = null,
}) => {
  const backendQuestionNumber = apiQuestionNumber ?? questionNumber;

  const [language, setLanguage] = useState(
    languageProp
      ? LANGUAGES.find((l) => l.id === languageProp)?.id || "python"
      : "python",
  );
useEffect(() => {
    if (languageProp) {
      const matchedId = LANGUAGES.find((l) => l.id === languageProp)?.id;
      if (matchedId) {
        setLanguage(matchedId);

        const _bpTrim = (boilerplate || "").trim();
        const isBackendBoilerplate =
          _bpTrim && value?.trim() === _bpTrim;
        const isLegacyBoilerplate = LANGUAGES.some(
          (l) =>
            (l.defaultCode || "").trim() &&
            value?.trim() === l.defaultCode.trim(),
        );
        if (!value?.trim() || isBackendBoilerplate || isLegacyBoilerplate) {
          // Prefer backend boilerplate; fall back to language default.
          const config = LANGUAGES.find((l) => l.id === matchedId);
          onChange(boilerplate || config?.defaultCode || "");
        }
      }
    }
  }, [languageProp, questionNumber, boilerplate]);

  const [fontSize, setFontSize] = useState(14);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [activeTab, setActiveTab] = useState("output");
  const [customInput, setCustomInput] = useState("");
  const [testResults, setTestResults] = useState(null);
  const [backendTestCases, setBackendTestCases] = useState([]);
  const [testCasesError, setTestCasesError] = useState(null);

  const [hiddenCount, setHiddenCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  // 🔧 CHANGE 3/4: State for question picker dropdown anchor
  const [questionMenuAnchor, setQuestionMenuAnchor] = useState(null);

  const [internalThemeMode, setInternalThemeMode] = useState(() => {
    if (themeProp) return themeProp;
    try {
      const stored = localStorage.getItem("ievalx_code_editor_theme");
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      /* localStorage may be unavailable */
    }
    return "light";
  });
  const themeMode = themeProp ?? internalThemeMode;

  const [splitPercent, setSplitPercent] = useState(32);
  const [isFullscreen, setIsFullscreen] = useState(startFullscreen);
  const [outputPanelHeight, setOutputPanelHeight] = useState(200);

  useNativeFullscreen(startFullscreen);

  const textareaRef = useRef(null);
  const editorContainerRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fullscreenRef = useRef(null);
  const defaultDisplayRef = useRef("");
  const userClearedRef = useRef(false);

  const customInputRef = useRef("");

  const highlightRef = useRef(null);
  const cursorPosRef = useRef(null);
  const stickyColRef = useRef(0);
  const T = themes[themeMode];
  const isDark = themeMode === "dark";
  const langConfig = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
  const lineCount = (value || "").split("\n").length;

  const toggleTheme = useCallback(() => {
    const next = themeMode === "dark" ? "light" : "dark";
    if (themeProp === undefined) {
      setInternalThemeMode(next);
      try {
        localStorage.setItem("ievalx_code_editor_theme", next);
      } catch {
        /* ignore quota / privacy errors */
      }
    }
    onThemeChange?.(next);
  }, [themeMode, themeProp, onThemeChange]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const entering = !prev;
      if (entering) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch((err) => {
            console.warn("Fullscreen failed:", err);
          });
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => {
            console.warn("Exit fullscreen failed:", err);
          });
        }
      }
      return entering;
    });
  };

  useBodyScrollLock(isFullscreen);

  const handleSplitDrag = useCallback((deltaX) => {
    if (!fullscreenRef.current) return;
    const w = fullscreenRef.current.offsetWidth;
    setSplitPercent((prev) =>
      Math.min(55, Math.max(20, prev + (deltaX / w) * 100)),
    );
  }, []);

  const prevQuestionRef = useRef(null);
  useEffect(() => {
    if (testId && backendQuestionNumber) {
      const qKey = `${testId}-${backendQuestionNumber}`;
      const isNewQuestion = prevQuestionRef.current !== qKey;
      prevQuestionRef.current = qKey;
      if (isNewQuestion) {
        setOutput(null);
        setTestResults(null);
        setBackendTestCases([]);
        setHiddenCount(0);
        setActiveTab("output");
        setCustomInput("");
        customInputRef.current = "";

        const config = LANGUAGES.find(
          (l) => l.id === (languageProp || language),
        );
        if (!value || value.trim() === "") {
          onChange(boilerplate || config?.defaultCode || "");
        }
      }

      getTestCases(testId, backendQuestionNumber)
        .then((data) => {
          if (data?.test_cases?.length > 0) {
            setBackendTestCases(data.test_cases);
            setHiddenCount(data.total_hidden || 0);
            setTestCasesError(null);
          } else if (data?.error) {
            setBackendTestCases([]);
            setHiddenCount(0);
            setTestCasesError(data.error);
          } else {
            setBackendTestCases([]);
            setHiddenCount(0);
            setTestCasesError(null);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch test cases:", err);
          setTestCasesError(err.message || "Failed to load test cases");
        });
    }
  }, [testId, backendQuestionNumber]);

  const prevQuestionHtmlRef = useRef(null);

  useEffect(() => {
    if (
      questionHtml &&
      prevQuestionHtmlRef.current !== null &&
      prevQuestionHtmlRef.current !== questionHtml
    ) {
      setOutput(null);
      setTestResults(null);
      setCustomInput("");
      customInputRef.current = "";
      setActiveTab("output");
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      if (highlightRef.current) highlightRef.current.scrollTop = 0;
    }
    prevQuestionHtmlRef.current = questionHtml;
  }, [questionHtml]);

  const syncScroll = useCallback(() => {
    const sc = scrollContainerRef.current;
    const hl = highlightRef.current;
    if (!sc || !hl) return;
    hl.scrollTop = sc.scrollTop;
    hl.scrollLeft = sc.scrollLeft;
  }, []);

  useEffect(() => {
    if (cursorPosRef.current === null) return;
    if (textareaRef.current) {
      const pos = cursorPosRef.current;
      cursorPosRef.current = null;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(pos, pos);
        }
      });
    }
  }, [value]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    const newConfig = LANGUAGES.find((l) => l.id === newLang);
    const curConfig = LANGUAGES.find((l) => l.id === language);
    setLanguage(newLang);
    onLanguageChange?.(newLang);
    defaultDisplayRef.current = newConfig?.defaultCode || "";
    if (!value || value.trim() === "" || value === curConfig?.defaultCode) {
      onChange(newConfig?.defaultCode || "");
    }
    setOutput(null);
    setTestResults(null);
  };

  const handleRunCode = useCallback(async () => {
    if (!value || value.trim() === "" || running) return;

    setRunning(true);
    setActiveTab("output");
    setOutput(null);

    try {
      let stdinInput = customInputRef.current || "";
      let autoInputNote = "";
      let expectedOutput = null;

      if (!stdinInput.trim() && backendTestCases.length > 0) {
        const firstVisible = backendTestCases.find((tc) => !tc.is_hidden);
        if (firstVisible && firstVisible.input) {
          stdinInput = firstVisible.input.trim();
          autoInputNote = `Auto-used Test Case ${firstVisible.id || 1} input`;
          if (firstVisible.expected_output) {
            expectedOutput = firstVisible.expected_output.trim();
          }
        }
      }

      // 🔧 ISSUE 1 — FIX 5/6: use backend (global) question number
      const result = await executeCode(
        language,
        value,
        stdinInput,
        testId,
        backendQuestionNumber,
      );
      if (autoInputNote) result.autoInputNote = autoInputNote;

      if (expectedOutput !== null && result.stdout !== undefined) {
        const actualTrimmed = (result.stdout || "").trim();
        const expectedTrimmed = expectedOutput.trim();
        result.expectedOutput = expectedTrimmed;
        result.outputMatches =
          actualTrimmed.toLowerCase() === expectedTrimmed.toLowerCase();
      }

      setOutput(result);
    } catch (err) {
      setOutput({
        success: false,
        stdout: "",
        stderr: err.message,
        executionTime: "N/A",
        exitCode: -1,
        isNetworkError: true,
      });
    } finally {
      setRunning(false);
    }
  }, [value, language, running, backendTestCases, testId, backendQuestionNumber]);

  const handleRunTests = useCallback(async () => {
    if (!value || value.trim() === "" || running) return;
    setRunning(true);
    setActiveTab("testcases");
    setTestResults(null);

    try {
      const hasCustomInput = customInputRef.current.trim() !== "";

      let testCasesToRun = [];

      if (backendTestCases.length > 0) {
        testCasesToRun = [...backendTestCases];
      }

      if (hasCustomInput) {
        const customTC = {
          id: 999,
          label: "Custom Input",
          input: customInputRef.current.trim(),
          expected_output: "",
          is_hidden: false,
          weight: 0,
        };
        testCasesToRun = [customTC, ...testCasesToRun];
      }

      if (testCasesToRun.length === 0) {
        testCasesToRun = [
          {
            id: 1,
            label: "Run with no input",
            input: "",
            expected_output: "",
            is_hidden: false,
            weight: 1,
          },
        ];
      }

      // 🔧 ISSUE 1 — FIX 6/6: use backend (global) question number
      const response = await runTestCasesServer(
        language,
        value,
        testCasesToRun,
        testId,
        backendQuestionNumber,
      );

      setTestResults({
        results: (response.results || []).map((r) => {
          const sourceTC = backendTestCases.find((tc) => tc.id === r.id);
          const isHidden =
            r.id === 999
              ? false
              : (sourceTC?.is_hidden ?? r.is_hidden ?? false);

          return {
            id: r.id,
            isHidden,
            label: r.id === 999 ? "Custom Input" : r.label,
            input: r.id === 999 ? customInputRef.current.trim() : r.input,
            expected: r.id === 999 ? "" : r.expected_output,
            actualOutput: r.actual_output || "",
            passed:
              r.id === 999
                ? !r.is_compile_error && !r.is_runtime_error && !r.is_timeout
                : r.passed,
            executionTime: `${r.execution_time_ms || 0}ms`,
            error: r.stderr || null,
            isCompileError: r.is_compile_error || false,
            isRuntimeError: r.is_runtime_error || false,
            isTimeout: r.is_timeout || false,
          };
        }),
        totalPassed: response.total_passed || 0,
        totalFailed: response.total_failed || 0,
        totalCases: response.total_cases || 0,
        allPassed: response.all_passed || false,
        scorePercentage: response.score_percentage || 0,
        overallResult: response.overall_result || "",
        error: response.error || null,
        hiddenCount: hiddenCount,
      });
    } catch (err) {
      setTestResults({
        results: [],
        totalPassed: 0,
        totalFailed: 0,
        totalCases: 0,
        error: err.message,
      });
    } finally {
      setRunning(false);
    }
  }, [
    value,
    language,
    running,
    backendTestCases,
    hiddenCount,
    testId,
    backendQuestionNumber,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (suggestion) {
        const s = e.target.selectionStart;
        const newVal = value.substring(0, s) + suggestion + value.substring(s);
        cursorPosRef.current = s + suggestion.length;
        onChange(newVal);
        setSuggestion("");
        return;
      }
      setSuggestion("");
      const s = e.target.selectionStart;
      const end = e.target.selectionEnd;
      cursorPosRef.current = s + 4;
      onChange(value.substring(0, s) + "    " + value.substring(end));
      return;
    }

    // ── Auto-pair brackets & quotes ──
    const PAIRS = {
      "(": ")",
      "[": "]",
      "{": "}",
      '"': '"',
      "'": "'",
      "`": "`",
    };
    const CLOSERS = new Set([")", "]", "}", '"', "'", "`"]);

    if (PAIRS[e.key]) {
      e.preventDefault();
      const s = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const selected = value.substring(s, end);
      const closer = PAIRS[e.key];
      const newVal = selected
        ? value.substring(0, s) +
          e.key +
          selected +
          closer +
          value.substring(end)
        : value.substring(0, s) + e.key + closer + value.substring(end);
      cursorPosRef.current = s + 1;
      onChange(newVal);
      setSuggestion("");
      return;
    }

    // ── Skip over closing bracket if already present ──
    if (CLOSERS.has(e.key)) {
      const s = e.target.selectionStart;
      if (value[s] === e.key) {
        e.preventDefault();
        cursorPosRef.current = s + 1;
        onChange(value);
        return;
      }
    }

    // ── Backspace: delete pair at once ──
    if (e.key === "Backspace") {
      const s = e.target.selectionStart;
      const end = e.target.selectionEnd;
      if (s === end && s > 0) {
        const prev = value[s - 1];
        const next = value[s];
        if (PAIRS[prev] && PAIRS[prev] === next) {
          e.preventDefault();
          const newVal = value.substring(0, s - 1) + value.substring(s + 1);
          cursorPosRef.current = s - 1;
          onChange(newVal);
          setSuggestion("");
          return;
        }
      }
    }

    // ── Arrow Up / Down ──
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const s = textarea.selectionStart;
      const lines = textarea.value.split("\n");
      let charCount = 0;
      let currentLineIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineEnd = charCount + lines[i].length;
        if (s <= lineEnd) {
          currentLineIdx = i;
          break;
        }
        charCount += lines[i].length + 1;
      }
      if (e.key === "ArrowDown") {
        if (currentLineIdx >= lines.length - 1) return;
        const nextLineStart = charCount + lines[currentLineIdx].length + 1;
        const nextLineLen = lines[currentLineIdx + 1].length;
        const newPos =
          nextLineStart + Math.min(stickyColRef.current, nextLineLen);
        textarea.setSelectionRange(newPos, newPos);
      } else {
        if (currentLineIdx <= 0) return;
        let prevLineStart = 0;
        for (let i = 0; i < currentLineIdx - 1; i++) {
          prevLineStart += lines[i].length + 1;
        }
        const prevLineLen = lines[currentLineIdx - 1].length;
        const newPos =
          prevLineStart + Math.min(stickyColRef.current, prevLineLen);
        textarea.setSelectionRange(newPos, newPos);
      }
      syncScroll();
      return;
    }

    // ── Enter: smart indent ──
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const s = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const textBefore = value.substring(0, s);
      const textAfter = value.substring(end);
      const currentLineStart = textBefore.lastIndexOf("\n") + 1;
      const currentLine = textBefore.substring(currentLineStart);
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : "";
      const isPythonColon = /:\s*$/.test(currentLine.trimEnd());
      const isBraceOpen = /\{\s*$/.test(currentLine.trimEnd());
      const nextCharIsBrace = textAfter.trimStart().startsWith("}");
      let insertion = "";
      if (isPythonColon && language === "python") {
        insertion = "\n" + currentIndent + "    ";
      } else if (isBraceOpen) {
        if (nextCharIsBrace) {
          insertion = "\n" + currentIndent + "    " + "\n" + currentIndent;
          cursorPosRef.current = s + currentIndent.length + 5;
          onChange(textBefore + insertion + textAfter);
          return;
        } else {
          insertion = "\n" + currentIndent + "    ";
        }
      } else {
        insertion = "\n" + currentIndent;
      }
      cursorPosRef.current = s + insertion.length;
      onChange(textBefore + insertion + textAfter);
      return;
    }

    // ── Arrow Left / Right: update sticky col ──
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = textareaRef.current.selectionStart;
          const textBefore = (textareaRef.current?.value || "").substring(
            0,
            pos,
          );
          const lastNL = textBefore.lastIndexOf("\n");
          stickyColRef.current = pos - (lastNL + 1);
        }
      }, 0);
      return;
    }

    // ── Ctrl+Enter: run code ──
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRunCode();
      return;
    }

    // ── Escape: dismiss suggestion ──
    if (e.key === "Escape") {
      setSuggestion("");
      return;
    }

    // ── F11: toggle fullscreen ──
    if (e.key === "F11") {
      e.preventDefault();
      toggleFullscreen();
    }
  };

  const handleReset = () => {
    onChange(boilerplate || langConfig.defaultCode || "");
    setOutput(null);
    setTestResults(null);
  };

  // ─── Suggestion Engine ──────────────────────────────────────────────
  const computeSuggestion = useCallback((code, cursorPos, lang) => {
    const textBefore = code.substring(0, cursorPos);
    const lines = textBefore.split("\n");
    const currentLine = lines[lines.length - 1];
    const trimmed = currentLine.trimStart();
    const indent = currentLine.match(/^(\s*)/)[1];
    const nextChar = code[cursorPos] ?? "";

    if (nextChar && nextChar !== "\n") return "";

    if (lang === "python") {
      if (/^if\s+$/.test(trimmed)) return `condition:\n${indent}    pass`;
      if (/^elif\s+$/.test(trimmed)) return `condition:\n${indent}    pass`;
      if (/^while\s+$/.test(trimmed)) return `condition:\n${indent}    pass`;
      if (/^for\s+$/.test(trimmed))
        return `item in iterable:\n${indent}    pass`;
      if (/^def\s+$/.test(trimmed))
        return `function_name(params):\n${indent}    pass`;
      if (/^class\s+$/.test(trimmed)) return `ClassName:\n${indent}    pass`;
      if (/^try\s*$/.test(trimmed))
        return `:\n${indent}    pass\n${indent}except Exception as e:\n${indent}    pass`;
      if (/^with\s+$/.test(trimmed))
        return `expression as var:\n${indent}    pass`;
      if (/^import\s+$/.test(trimmed)) return `module_name`;
      if (/^from\s+$/.test(trimmed)) return `module import name`;
      if (/^return\s*$/.test(trimmed)) return `value`;
      if (/^print\s*$/.test(trimmed)) return `(value)`;
    }

    if (["javascript", "typescript"].includes(lang)) {
      if (/^if\s+$/.test(trimmed))
        return `(condition) {\n${indent}    \n${indent}}`;
      if (/^if\s*\($/.test(trimmed))
        return `condition) {\n${indent}    \n${indent}}`;
      if (/^else\s*$/.test(trimmed)) return ` {\n${indent}    \n${indent}}`;
      if (/^for\s+$/.test(trimmed))
        return `(let i = 0; i < n; i++) {\n${indent}    \n${indent}}`;
      if (/^while\s+$/.test(trimmed))
        return `(condition) {\n${indent}    \n${indent}}`;
      if (/^function\s+$/.test(trimmed))
        return `name(params) {\n${indent}    \n${indent}}`;
      if (/^const\s+$/.test(trimmed)) return `name = value;`;
      if (/^let\s+$/.test(trimmed)) return `name = value;`;
      if (/^return\s*$/.test(trimmed)) return `value;`;
      if (/^console\s*$/.test(trimmed)) return `.log(value);`;
      if (/^class\s+$/.test(trimmed))
        return `ClassName {\n${indent}    constructor() {\n${indent}        \n${indent}    }\n${indent}}`;
      if (/^switch\s+$/.test(trimmed))
        return `(value) {\n${indent}    case x:\n${indent}        break;\n${indent}    default:\n${indent}        break;\n${indent}}`;
    }

    if (["java", "cpp", "c"].includes(lang)) {
      if (/^if\s+$/.test(trimmed))
        return `(condition) {\n${indent}    \n${indent}}`;
      if (/^if\s*\($/.test(trimmed))
        return `condition) {\n${indent}    \n${indent}}`;
      if (/^else\s*$/.test(trimmed)) return ` {\n${indent}    \n${indent}}`;
      if (/^for\s+$/.test(trimmed))
        return `(int i = 0; i < n; i++) {\n${indent}    \n${indent}}`;
      if (/^while\s+$/.test(trimmed))
        return `(condition) {\n${indent}    \n${indent}}`;
      if (/^switch\s+$/.test(trimmed))
        return `(value) {\n${indent}    case x:\n${indent}        break;\n${indent}    default:\n${indent}        break;\n${indent}}`;
    }

    return "";
  }, []);

  const renderToolbar = () => (
    <Box
      sx={{
        bgcolor: T.bgToolbar,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        transition: "all 0.3s ease",
      }}
    >
      <Box
        sx={{
          height: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: "14px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <Select
            value={language}
            onChange={handleLanguageChange}
            size="small"
            disabled={lockLanguage}
            renderValue={(selected) => {
              const lang = LANGUAGES.find((l) => l.id === selected);
              return (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    width: "100%",
                    color: `${T.text} !important`,
                    WebkitTextFillColor: `${T.text} !important`,
                  }}
                >
                  <LanguageIcon id={selected} size={18} />
                  <span style={{ color: T.text, WebkitTextFillColor: T.text }}>
                    {lang?.label || selected}
                  </span>
                  <KeyboardArrowDownRounded
                    sx={{
                      ml: "auto",
                      fontSize: 20,
                      color: T.textMuted,
                      position: "relative",
                      zIndex: 5,
                    }}
                  />
                </Box>
              );
            }}
            sx={{
              bgcolor: T.bgInput,
              color: T.text,
              borderRadius: "8px",
              fontSize: 13,
              fontWeight: 600,
              minWidth: 148,
              height: 32,
              transition: "all 0.2s ease",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: T.border,
                transition: "border-color 0.2s",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: T.accent,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: T.accent,
                borderWidth: "1.5px",
              },

              "& .MuiSelect-icon": { display: "none" },
              "& .MuiSelect-select": {
                display: "flex",
                alignItems: "center",
                gap: 0.8,
                py: "4px",
                paddingRight: "12px !important",
              },

              "&.Mui-disabled": {
                WebkitTextFillColor: `${T.text} !important`,
                color: `${T.text} !important`,
                opacity: 1,
              },
              "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                borderColor: `${T.border} !important`,
              },
            }}
            MenuProps={{
              sx: { zIndex: PORTAL_Z + 1 },
              container: isFullscreen ? () => fullscreenRef.current : undefined,
              // 🔧 CHANGE 4/4: MUI v9 — PaperProps deprecated, use slotProps.paper
              slotProps: {
                paper: {
                  sx: {
                    bgcolor: T.bg,
                    border: `1px solid ${T.borderHover}`,
                    borderRadius: "10px",
                    boxShadow: isDark
                      ? "0 12px 40px rgba(0,0,0,0.5)"
                      : "0 12px 40px rgba(0,0,0,0.12)",
                    mt: 0.5,
                    "& .MuiMenuItem-root": {
                      color: T.text,
                      fontSize: 13,
                      gap: 1,
                      borderRadius: "6px",
                      mx: 0.5,
                      my: 0.2,
                      transition: "all 0.15s ease",
                      "&:hover": { bgcolor: T.bgHover },
                      "&.Mui-selected": {
                        bgcolor: T.bgSelected,
                        color: T.accent,
                      },
                    },
                  },
                },
              },
            }}
          >
            {LANGUAGES.map((l) => (
              <MenuItem
                key={l.id}
                value={l.id}
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mr: 0.8,
                    flexShrink: 0,
                  }}
                >
                  <LanguageIcon id={l.id} size={18} />
                </Box>
                {l.label}
                <Typography
                  component="span"
                  sx={{ ml: "auto", fontSize: 11, opacity: 0.4, pl: 2 }}
                >
                  {l.ext}
                </Typography>
              </MenuItem>
            ))}
          </Select>

          <Box sx={{ width: 1, height: 22, bgcolor: T.border, mx: 0.2 }} />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: T.bgInput,
              borderRadius: "8px",
              border: `1px solid ${T.border}`,
              px: 0.3,
              height: 30,
            }}
          >
            {/* 🔧 CHANGE 4/10: Real minus sign (was em-dash), symmetric +/- styling, hover bg */}
            <IconButton
              size="small"
              onClick={() => setFontSize((f) => Math.max(11, f - 1))}
              sx={{
                color: T.textMuted,
                p: "2px",
                width: 22,
                height: 22,
                fontSize: 16,
                fontWeight: 600,
                lineHeight: 1,
                borderRadius: "5px",
                transition: "all 0.15s ease",
                "&:hover": { color: T.accent, bgcolor: T.bgHover },
              }}
            >
              −
            </IconButton>
            <Typography
              sx={{
                color: T.textLabel,
                fontSize: 11,
                fontWeight: 600,
                minWidth: 32,
                textAlign: "center",
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fontSize}px
            </Typography>
            <IconButton
              size="small"
              onClick={() => setFontSize((f) => Math.min(22, f + 1))}
              sx={{
                color: T.textMuted,
                p: "2px",
                width: 22,
                height: 22,
                fontSize: 16,
                fontWeight: 600,
                lineHeight: 1,
                borderRadius: "5px",
                transition: "all 0.15s ease",
                "&:hover": { color: T.accent, bgcolor: T.bgHover },
              }}
            >
              +
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
          {/* 🔧 CHANGE 5/10: Visible reassurance that code is auto-saved */}
          {(value || "").trim() !== "" && (
            <Tooltip
              title="Your code is saved automatically as you type"
              arrow
              PopperProps={{ sx: { zIndex: PORTAL_Z } }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.2,
                  py: 0.4,
                  borderRadius: "8px",
                  bgcolor: isDark
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(34,197,94,0.08)",
                  border: `1px solid ${
                    isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.18)"
                  }`,
                  height: 30,
                  transition: "all 0.2s ease",
                }}
              >
                <CloudDoneOutlined
                  sx={{
                    fontSize: 14,
                    color: isDark ? "#A9C6A8" : "#3E6E3E",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isDark ? "#A9C6A8" : "#3E6E3E",
                    letterSpacing: 0.2,
                  }}
                >
                  Saved
                </Typography>
              </Box>
            </Tooltip>
          )}

          {!isFullscreen && (
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} theme={T} />
          )}

          <Tooltip
            title="Reset Code"
            arrow
            PopperProps={{ sx: { zIndex: PORTAL_Z } }}
          >
            <IconButton
              size="small"
              onClick={handleReset}
              sx={{
                color: T.textMuted,
                p: "4px",
                "&:hover": { color: T.red, bgcolor: T.redSoft },
              }}
            >
              <ResetIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            onClick={handleRunTests}
            disabled={running || !value?.trim()}
            startIcon={<ScienceIcon sx={{ fontSize: "15px !important" }} />}
            sx={{
              color: T.testColor,
              bgcolor: T.testBg,
              border: `1px solid ${T.testBorder}`,
              borderRadius: "8px",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "none",
              px: 1.5,
              height: 30,
              minWidth: "auto",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              "&:hover": { bgcolor: T.yellowSoft, borderColor: T.yellow },
              "&.Mui-disabled": { opacity: 0.3 },
              "& .MuiButton-startIcon": { mr: 0.5 },
            }}
          >
            Run Tests
          </Button>

          <Button
            size="small"
            onClick={handleRunCode}
            disabled={running || !value?.trim()}
            startIcon={
              running ? (
                <CircularProgress size={13} sx={{ color: "#fff" }} />
              ) : (
                <RunIcon sx={{ fontSize: "16px !important" }} />
              )
            }
            sx={{
              color: "#fff",
              background: running ? T.greenDark : T.runBg,
              border: "none",
              borderRadius: "8px",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              px: 2,
              height: 30,
              minWidth: 88,
              whiteSpace: "nowrap",
              boxShadow: T.runShadow,
              display: "flex",
              alignItems: "center",
              transition: "all 0.2s ease",
              "&:hover": {
                background: T.runBgHover,
                boxShadow: "0 4px 16px rgba(22,163,74,0.4)",
              },
              "&.Mui-disabled": {
                opacity: 0.3,
                background: T.bgInput,
                color: T.textMuted,
                boxShadow: "none",
              },
              "& .MuiButton-startIcon": { mr: 0.5 },
            }}
          >
            {running ? "Running…" : "Run Code"}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderCodeArea = (expand = false) => (
    <Box
      sx={{
        flex: expand ? 1 : "unset",
        bgcolor: T.bgEditor,
        display: "flex",
        alignItems: "stretch",
        position: "relative",
        minHeight: expand ? 0 : 320,
        maxHeight: expand ? "unset" : 450,
        overflow: "auto",
        "&::-webkit-scrollbar": { width: 6, height: 6 },
        "&::-webkit-scrollbar-thumb": {
          background: T.scrollThumb,
          borderRadius: 3,
        },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        transition: "background 0.3s ease",
      }}
      ref={scrollContainerRef}
      onScroll={syncScroll}
    >
      {/* ── Line numbers: sticky left so they never scroll horizontally ── */}
      <Box
        sx={{
          flexShrink: 0,
          position: "sticky",
          left: 0,
          zIndex: 3,
          bgcolor: T.bgEditor,
          borderRight: `1px solid ${T.lineNumBorder}`,
        }}
      >
        <LineNumbers
          ref={lineNumbersRef}
          count={Math.max(lineCount, 15)}
          fontSize={fontSize}
          theme={T}
        />
      </Box>
      {/* ── Code area: highlight overlay + textarea ── */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          minWidth: 0,
          "& textarea::selection": {
            color: "transparent",
            background: isDark
              ? "rgba(40,80,160,0.88)"
              : "rgba(37,99,235,0.40)",
          },
          "& textarea::-moz-selection": {
            color: "transparent",
            background: isDark
              ? "rgba(40,80,160,0.88)"
              : "rgba(37,99,235,0.40)",
          },
          "& textarea::-webkit-scrollbar": { display: "none" },
          "& textarea": { scrollbarWidth: "none", msOverflowStyle: "none" },
        }}
      >
        {/* ── Syntax highlight overlay ── */}
        <Box
          ref={highlightRef}
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            minHeight: "100%",
            pointerEvents: "none",
            zIndex: 0,
            mixBlendMode: "normal",
            overflow: "hidden",
            width: "max-content",
            minWidth: "100%",
            whiteSpace: "pre",
            overflowWrap: "normal",
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize,
            lineHeight: "1.7",
            padding: "16px 16px 16px 14px",
            tabSize: 4,
            color: T.textCode,
            wordBreak: "normal",
            userSelect: "none",
            boxSizing: "border-box",
            fontWeight: 400,
            fontKerning: "none",
            fontVariantLigatures: "none",
            letterSpacing: "0 !important",
            wordSpacing: "0 !important",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "geometricPrecision",
          }}
          dangerouslySetInnerHTML={{
            __html: highlightCode(value || ""),
          }}
        />
        {suggestion &&
          (() => {
            const cursorPos = textareaRef.current?.selectionStart ?? 0;
            const textBefore = (value || "").substring(0, cursorPos);
            const lines = textBefore.split("\n");
            const lineIndex = lines.length - 1;
            const colIndex = lines[lineIndex].length;
            const lh = fontSize * 1.7;
            const cw = fontSize * 0.6005; // tighter monospace estimate
            const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
            const scrollLeft = scrollContainerRef.current?.scrollLeft ?? 0;
            const top = 16 + lineIndex * lh - scrollTop; // ← subtract scroll
            const left = 14 + colIndex * cw - scrollLeft; // ← subtract scroll
            return (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  top,
                  left,
                  pointerEvents: "none",
                  zIndex: 2,
                  color: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)",
                  fontFamily:
                    "'JetBrains Mono','Fira Code','Cascadia Code','Consolas',monospace",
                  fontSize,
                  lineHeight: "1.7",
                  whiteSpace: "pre",
                  userSelect: "none",
                  fontStyle: "italic",
                }}
              >
                {suggestion}
              </Box>
            );
          })()}
        <textarea
          ref={textareaRef}
          value={value || ""}
          onChange={(e) => {
            const newVal = e.target.value;
            onChange(newVal);
            syncScroll();
            // compute suggestion at new cursor position
            const pos = e.target.selectionStart;
            setSuggestion(computeSuggestion(newVal, pos, language));
          }}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          onSelect={syncScroll}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onPaste={(e) => {
          }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseUp={() => {
            syncScroll();
            setSuggestion("");
            if (textareaRef.current) {
              const pos = textareaRef.current.selectionStart;
              const textBefore = (textareaRef.current?.value || "").substring(
                0,
                pos,
              );
              const lastNL = textBefore.lastIndexOf("\n");
              stickyColRef.current = pos - (lastNL + 1);
            }
          }}
          onKeyUp={(e) => {
            syncScroll();
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") {
              if (textareaRef.current) {
                const pos = textareaRef.current.selectionStart;
                const textBefore = (textareaRef.current?.value || "").substring(
                  0,
                  pos,
                );
                const lastNL = textBefore.lastIndexOf("\n");
                stickyColRef.current = pos - (lastNL + 1);
              }
            }
          }}
          onBlur={syncScroll}
          spellCheck={false}
          placeholder=""
          style={{
            width: "100%",
            minWidth: "100%",
            height: Math.max(
              expand ? 0 : 320,
              lineCount * (fontSize * 1.7) + 32,
            ),
            minHeight: expand ? "100%" : 320,
            resize: "none",
            background: "transparent",
            color: "transparent",
            WebkitTextFillColor: "transparent",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 1,
            display: "block",
            border: "none",
            outline: "none",
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize,
            lineHeight: "1.7",
            padding: "16px 16px 16px 14px",
            tabSize: 4,
            whiteSpace: "pre",
            overflowWrap: "normal",
            overflowX: "hidden",
            overflowY: "hidden",
            caretColor: T.caret,
            transition: "color 0.3s ease",
            fontWeight: 400,
            fontKerning: "none",
            fontVariantLigatures: "none",
            letterSpacing: "0",
            wordSpacing: "0",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "geometricPrecision",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            bottom: 10,
            right: 14,
            fontSize: 11,
            color: T.textDim,
            display: "flex",
            gap: 1.5,
            pointerEvents: "none",
          }}
        >
          <Box
            component="span"
            sx={{
              bgcolor: T.bgInput,
              px: 1,
              py: 0.3,
              borderRadius: "4px",
              border: `1px solid ${T.border}`,
            }}
          >
            Ctrl+Enter → Run
          </Box>
          <Box
            component="span"
            sx={{
              bgcolor: T.bgInput,
              px: 1,
              py: 0.3,
              borderRadius: "4px",
              border: `1px solid ${T.border}`,
            }}
          >
            Tab → Indent
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const outputPanelProps = {
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
  };

  const questionPanelProps = {
    splitPercent,
    T,
    isDark,
    questionNumber,
    questionTitle,
    questionHtml,
  };

  if (isFullscreen) {
    return ReactDOM.createPortal(
      <Box
        ref={fullscreenRef}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          bgcolor: T.bg,
          display: "flex",
          flexDirection: "column",
          transition: "background 0.3s ease",
          transform: "none",
          isolation: "isolate",
        }}
        style={{ zoom: 1 }}
      >
        <Box
          sx={{
            height: 48,
            bgcolor: T.fsBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            boxShadow: T.fsShadow,
            zIndex: 10,
            flexShrink: 0,
            borderBottom: `1px solid ${T.border}`,
            transition: "all 0.3s ease",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              minWidth: 0,
            }}
          >
            {/* Q-number badge */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: T.fsBadge,
                color: "#fff",
                height: 26,
                px: 1.4,
                borderRadius: "8px",
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: 0.3,
                fontFamily: "'JetBrains Mono', monospace",
                flexShrink: 0,
              }}
            >
              Q{questionNumber}
            </Box>

            {/* CODING type badge */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: T.fsTypeBg,
                color: T.fsTypeColor,
                height: 26,
                px: 1.2,
                borderRadius: "8px",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              <TerminalIcon sx={{ fontSize: 13 }} />
              Coding
            </Box>

            {/* 🔧 CHANGE 4/4: Question picker dropdown replaces the plain title */}
            <Box sx={{ width: '1px', height: 18, bgcolor: T.border, mx: 0.4, flexShrink: 0 }} />

            {allQuestions.length > 0 ? (
              <>
                {/* Trigger Button */}
                <Button
                  onClick={(e) => setQuestionMenuAnchor(e.currentTarget)}
                  endIcon={
                    <KeyboardArrowDownRounded
                      sx={{
                        fontSize: 16,
                        ml: -0.5,
                        transition: "transform 0.2s ease",
                        transform: Boolean(questionMenuAnchor)
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  }
                  sx={{
                    bgcolor: T.bgInput,
                    color: T.text,
                    borderRadius: "8px",
                    border: `1px solid ${Boolean(questionMenuAnchor) ? T.borderHover : T.border}`,
                    fontSize: 13,
                    fontWeight: 500,
                    textTransform: "none",
                    height: 30,
                    px: 1.4,
                    py: 0,
                    minWidth: 160,
                    maxWidth: 300,
                    justifyContent: "space-between",
                    gap: 0.5,
                    transition: "all 0.2s ease",
                    "&:hover": { bgcolor: T.bgHover, borderColor: T.borderHover },
                  }}
                >
                  <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                    {allQuestions.find((q) => q.questionNumber === questionNumber)?.title
                      || questionTitle
                      || `Problem ${questionNumber}`}
                  </Box>
                </Button>

                <Menu
                  anchorEl={questionMenuAnchor}
                  open={Boolean(questionMenuAnchor)}
                  onClose={() => setQuestionMenuAnchor(null)}
                  container={isFullscreen ? () => fullscreenRef.current : undefined}
                  sx={{ zIndex: PORTAL_Z + 2 }}
                  slotProps={{
                    paper: {
                      sx: {
                        bgcolor: T.bg,
                        border: `1px solid ${T.borderHover}`,
                        borderRadius: "12px",
                        boxShadow: isDark
                          ? "0 16px 48px rgba(0,0,0,0.6)"
                          : "0 8px 32px rgba(0,0,0,0.14)",
                        mt: 0.5,
                        minWidth: 280,
                        maxHeight: 420,
                        overflowY: "auto",
                        "&::-webkit-scrollbar": { width: 6 },
                        "&::-webkit-scrollbar-thumb": {
                          background: T.scrollThumb,
                          borderRadius: 3,
                        },
                        "&::-webkit-scrollbar-track": { background: "transparent" },
                      },
                    },
                    list: {
                      sx: { py: 0 },
                    },
                  }}
                >
                  {/* Header — 🔧 ISSUE 2: sticky so it stays pinned while scrolling */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderBottom: `1px solid ${T.border}`,
                      bgcolor: T.bg,
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                      }}
                    >
                      Coding Questions
                    </Typography>
                  </Box>

                  <Box sx={{ py: 0.5 }}>
                    {allQuestions.map((q, idx) => {
                      const qNum = q.questionNumber || idx + 1;
                      const isCurrent = qNum === questionNumber;
                      return (
                        <MenuItem
                          key={q.id || idx}
                          onClick={() => {
                            if (!isCurrent) onQuestionJump?.(idx);
                            setQuestionMenuAnchor(null);
                          }}
                          disableRipple={isCurrent}
                          sx={{
                            px: 1.5,
                            py: 1,
                            mx: 0.5,
                            my: 0.2,
                            borderRadius: "8px",
                            cursor: isCurrent ? "default" : "pointer",
                            bgcolor: isCurrent ? T.bgSelected : "transparent",
                            "&:hover": {
                              bgcolor: isCurrent ? T.bgSelected : T.bgHover,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              width: "100%",
                            }}
                          >
                            {/* Q-number chip */}
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                bgcolor: isCurrent
                                  ? T.fsBadge
                                  : q.isAnswered
                                    ? isDark
                                      ? "rgba(52,211,153,0.14)"
                                      : "rgba(22,163,74,0.10)"
                                    : T.bgInput,
                                border: `1px solid ${
                                  isCurrent
                                    ? "transparent"
                                    : q.isAnswered
                                      ? isDark
                                        ? "rgba(52,211,153,0.28)"
                                        : "rgba(22,163,74,0.22)"
                                      : T.border
                                }`,
                                color: isCurrent
                                  ? "#fff"
                                  : q.isAnswered
                                    ? T.green
                                    : T.textMuted,
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              Q{qNum}
                            </Box>

                            {/* Title + answered sub-label */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: 13,
                                  fontWeight: isCurrent ? 600 : 500,
                                  color: isCurrent ? T.accent : T.text,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  lineHeight: 1.35,
                                }}
                              >
                                {q.title || q.question_title || `Coding Question ${qNum}`}
                              </Typography>


                            </Box>

                            {/* NOW badge for current question */}
                            {isCurrent && (
                              <Box
                                sx={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  px: 0.8,
                                  py: 0.3,
                                  borderRadius: "5px",
                                  bgcolor: T.accentSoft,
                                  color: T.accent,
                                  flexShrink: 0,
                                  letterSpacing: 0.4,
                                  lineHeight: 1.4,
                                }}
                              >
                                NOW
                              </Box>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Box>
                </Menu>
              </>
            ) : questionTitle ? (
              /* Fallback: plain title when allQuestions is not provided */
              <Typography
                sx={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: T.fsTitle,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 360,
                }}
                title={questionTitle}
              >
                {questionTitle}
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {sectionTimeLeft != null &&
              (() => {
                const t = typeof sectionTimeLeft === "number" ? sectionTimeLeft : 0;
                const isCritical = t <= 60;
                const isLow = !isCritical && t <= 300;
                const accent = isCritical
                  ? T.red
                  : isLow
                    ? T.yellow
                    : T.textLabel;
                const accentStrong = isCritical
                  ? T.red
                  : isLow
                    ? T.yellow
                    : T.text;
                const m = Math.floor(t / 60);
                const s = t % 60;
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      bgcolor: isCritical
                        ? T.redSoft
                        : isLow
                          ? T.yellowSoft
                          : T.bgInput,
                      border: `1px solid ${
                        isCritical
                          ? T.bgErrorBd
                          : isLow
                            ? T.bgWarningBd
                            : T.border
                      }`,
                      px: 1.4,
                      height: 30,
                      borderRadius: "8px",
                      transition: "all 0.3s ease",
                      animation: isCritical
                        ? "pulse-timer 1.4s ease-in-out infinite"
                        : "none",
                      "@keyframes pulse-timer": {
                        "0%, 100%": { transform: "scale(1)" },
                        "50%": { transform: "scale(1.04)" },
                      },
                    }}
                  >
                    <TimerIcon sx={{ fontSize: 14, color: accent }} />
                    <Box
                      sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}
                    >
                      <Typography
                        sx={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: accent,
                          textTransform: "uppercase",
                          letterSpacing: 0.7,
                          lineHeight: 1,
                        }}
                      >
                        Time
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: accentStrong,
                          fontVariantNumeric: "tabular-nums",
                          lineHeight: 1,
                        }}
                      >
                        {m}:{s.toString().padStart(2, "0")}
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} theme={T} />
            <IconButton
              size="small"
              onClick={toggleFullscreen}
              sx={{
                color: T.textMuted,
                "&:hover": { color: T.red, bgcolor: T.redSoft },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <QuestionPanel {...questionPanelProps} />
          <ResizableDivider onDrag={handleSplitDrag} theme={T} />
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {renderToolbar()}
            {renderCodeArea(true)}
            <Box
              onMouseDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startH = outputPanelHeight;
                const move = (ev) => {
                  setOutputPanelHeight(
                    Math.max(50, Math.min(500, startH + (startY - ev.clientY))),
                  );
                };
                const up = () => {
                  document.removeEventListener("mousemove", move);
                  document.removeEventListener("mouseup", up);
                  document.body.style.cursor = "";
                };
                document.body.style.cursor = "row-resize";
                document.addEventListener("mousemove", move);
                document.addEventListener("mouseup", up);
              }}
              sx={{
                height: 5,
                cursor: "row-resize",
                flexShrink: 0,
                bgcolor: T.divider,
                transition: "background 0.2s",
                "&:hover": { bgcolor: T.dividerHover },
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  bgcolor: T.textDim,
                  opacity: 0.5,
                },
              }}
            />
            <OutputPanel {...outputPanelProps} />

            {(onPrevious || onSkip || onNext) && (
              <Box
                sx={{
                  flexShrink: 0,
                  bgcolor: "#fff",
                  borderTop: "1px solid #E7EAE3",
                  px: { xs: 2, md: 4 },
                  py: 1.5,
                  zIndex: 10,
                  boxShadow: "0 -2px 8px rgba(15, 23, 42, 0.04)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >

                  {/* ─── Left: Previous ─── */}
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "flex-start",
                    }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<ArrowBackOutlined />}
                      disabled={!canGoPrevious || isSubmitting}
                      onClick={onPrevious}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        bgcolor: "#022124",
                        color: "#fff",
                        px: 3,
                        py: 0.9,
                        boxShadow: "none",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          bgcolor: "#0A3A38",
                          boxShadow: "0 4px 12px rgba(30, 51, 88, 0.25)",
                          transform: "translateY(-1px)",
                        },
                        "&:active": { transform: "translateY(0)" },
                        "&.Mui-disabled": {
                          bgcolor: "#D8DDD4",
                          color: "#fff",
                        },
                      }}
                    >
                      Previous
                    </Button>
                  </Box>

                  {/* ─── Center: Skip for now (hidden on last question) ─── */}
                  <Box
                    sx={{ flex: 1, display: "flex", justifyContent: "center" }}
                  >
                    {!isLastQuestion && (
                      <Button
                        variant="contained"
                        onClick={onSkip}
                        disabled={isSubmitting}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          borderRadius: 2,
                          bgcolor: "#022124",
                          color: "#fff",
                          px: 3,
                          py: 0.9,
                          boxShadow: "none",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            bgcolor: "#0A3A38",
                            boxShadow: "0 4px 12px rgba(30, 51, 88, 0.25)",
                            transform: "translateY(-1px)",
                          },
                          "&:active": { transform: "translateY(0)" },
                          "&.Mui-disabled": { opacity: 0.4 },
                        }}
                      >
                        Skip for now
                      </Button>
                    )}
                  </Box>

                  {/* ─── Right: Next / Submit Test ─── */}
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      variant="contained"
                      endIcon={
                        isSubmitting ? (
                          <CircularProgress size={14} sx={{ color: "#fff" }} />
                        ) : (
                          <ArrowForwardOutlined />
                        )
                      }
                      onClick={() => onNext(value)}
                      disabled={isSubmitting || isTimeExpired}
                      sx={{
                        textTransform: "none",
                        fontWeight: isLastQuestion ? 700 : 600,
                        borderRadius: 2,
                        bgcolor: isLastQuestion ? "#3E6E3E" : "#022124",
                        color: "#fff",
                        px: 3,
                        py: 0.9,
                        boxShadow: "none",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          bgcolor: isLastQuestion ? "#3E6E3E" : "#0A3A38",
                          boxShadow: isLastQuestion
                            ? "0 4px 14px rgba(22, 163, 74, 0.35)"
                            : "0 4px 12px rgba(30, 51, 88, 0.25)",
                          transform: "translateY(-1px)",
                        },
                        "&:active": { transform: "translateY(0)" },
                        "&.Mui-disabled": { opacity: 0.4 },
                      }}
                    >
                      {isSubmitting
                        ? "Saving..."
                        : isLastQuestion
                          ? "Submit Test"
                          : "Next"}
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>,
      document.body,
    );
  }

  return (
    <Box
      ref={editorContainerRef}
      sx={{
        borderRadius: "12px",
        overflow: "hidden",
        border: `1px solid ${T.border}`,
        bgcolor: T.bg,
        display: "flex",
        flexDirection: "column",
        boxShadow: isDark
          ? "0 4px 24px rgba(0,0,0,0.3)"
          : "0 4px 24px rgba(0,0,0,0.06)",
        transition: "all 0.3s ease",
      }}
    >
      {renderToolbar()}
      {renderCodeArea(false)}
      <Box
        onMouseDown={(e) => {
          e.preventDefault();
          const startY = e.clientY;
          const startH = outputPanelHeight;
          const move = (ev) => {
            setOutputPanelHeight(
              Math.max(50, Math.min(350, startH + (startY - ev.clientY))),
            );
          };
          const up = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
            document.body.style.cursor = "";
          };
          document.body.style.cursor = "row-resize";
          document.addEventListener("mousemove", move);
          document.addEventListener("mouseup", up);
        }}
        sx={{
          height: 5,
          cursor: "row-resize",
          flexShrink: 0,
          bgcolor: T.divider,
          transition: "background 0.2s",
          "&:hover": { bgcolor: T.dividerHover },
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            width: 40,
            height: 3,
            borderRadius: 2,
            bgcolor: T.textDim,
            opacity: 0.5,
          },
        }}
      />
      <OutputPanel {...outputPanelProps} />
    </Box>
  );
};

export default React.memo(CodeEditor);