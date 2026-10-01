import React, { useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from "@mui/icons-material";


const DEVICON_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const DEVICON_MAP = {
  python: "python/python-original.svg",
  javascript: "javascript/javascript-original.svg",
  java: "java/java-original.svg",
  cpp: "cplusplus/cplusplus-original.svg",
  c: "c/c-original.svg",
  typescript: "typescript/typescript-original.svg",
  go: "go/go-original.svg",
};

export const LanguageIcon = ({ id, size = 18, style }) => {
  const s = size;
  const path = DEVICON_MAP[id];

  const fallback = (
    <svg width={s} height={s} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="16" fill="#64748b" />
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontFamily="Arial,sans-serif"
        fontWeight="bold"
        fontSize="36"
        fill="#fff"
      >
        &lt;/&gt;
      </text>
    </svg>
  );

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s,
        height: s,
        flexShrink: 0,
      }}
    >
      {path ? (
        <img
          src={`${DEVICON_BASE}/${path}`}
          alt={id}
          width={s}
          height={s}
          loading="lazy"
          draggable={false}
          style={{ display: "block", objectFit: "contain", ...style }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        fallback
      )}
    </Box>
  );
};

export const themes = {

  dark: {
    id: "dark",
    bg: "#022124",           
    bgEditor: "#04292C",     
    bgToolbar: "#022124",
    bgPanel: "#022124",
    bgInput: "#0A3A38",      
    bgHover: "rgba(127,158,126,0.10)",
    bgSelected: "rgba(127,158,126,0.16)",
    bgSuccess: "rgba(127,158,126,0.10)",
    bgSuccessBd: "rgba(127,158,126,0.35)",
    bgError: "rgba(217,120,105,0.08)",
    bgErrorBd: "rgba(217,120,105,0.28)",
    bgWarning: "rgba(216,152,88,0.10)",
    bgWarningBd: "rgba(216,152,88,0.28)",
    border: "#0F3336",
    borderHover: "#24433E",  
    borderFocus: "#7F9E7E",
    text: "#EDF3EC",         
    textCode: "#DDE7DC",
    textMuted: "rgba(255,255,255,0.62)",
    textDim: "rgba(255,255,255,0.28)",
    textLabel: "rgba(255,255,255,0.72)",
    lineNum: "rgba(237,243,236,0.32)",
    lineNumBorder: "#0F3336",
    accent: "#9FBB9E",        // lighter sage for dark bg contrast
    accentSoft: "rgba(127,158,126,0.16)",
    green: "#A9C6A8",
    greenSoft: "rgba(127,158,126,0.16)",
    greenDark: "#3E6E3E",
    red: "#D97869",           // warm danger
    redSoft: "rgba(217,120,105,0.14)",
    redDark: "#7A2E24",
    yellow: "#D89858",        // warm amber
    yellowSoft: "rgba(216,152,88,0.14)",
    peach: "#D89858",
    peachSoft: "rgba(216,152,88,0.14)",
    runBg: "linear-gradient(135deg, #7F9E7E, #6C8B6B)",
    runBgHover: "linear-gradient(135deg, #92AE91, #7F9E7E)",
    runShadow: "0 2px 14px rgba(127,158,126,0.35)",
    testBg: "rgba(216,152,88,0.10)",
    testBorder: "rgba(216,152,88,0.28)",
    testColor: "#D89858",
    scrollThumb: "rgba(127,158,126,0.22)",
    scrollTrack: "transparent",
    caret: "#7F9E7E",
    qBg: "#022124",
    qBorderRight: "#0F3336",
    qText: "#EDF3EC",
    qTextSecondary: "rgba(255,255,255,0.75)",
    qTextMuted: "rgba(255,255,255,0.55)",
    qHeading: "#FFFFFF",
    qStrong: "#FFFFFF",
    qLink: "#9FBB9E",
    qLinkHover: "#B8CFB7",
    qCodeBg: "rgba(255,255,255,0.06)",
    qCodeText: "#E6C0A8",
    qCodeBorder: "rgba(255,255,255,0.08)",
    qPreBg: "#04292C",
    qPreBorder: "#0F3336",
    qPreText: "#DDE7DC",
    qExampleBg: "transparent",
    qExampleBorder: "#24433E",
    qExampleLabel: "#EDF3EC",
    qConstraintBg: "rgba(255,255,255,0.03)",
    qConstraintBd: "#24433E",
    qEasyBg: "rgba(127,158,126,0.16)",
    qEasyColor: "#A9C6A8",
    qMediumBg: "rgba(216,152,88,0.16)",
    qMediumColor: "#E5B078",
    qHardBg: "rgba(217,120,105,0.16)",
    qHardColor: "#E48D80",
    qSeparator: "#0F3336",
    qScrollThumb: "rgba(255,255,255,0.10)",
    fsBg: "#04292C",
    fsShadow: "0 1px 4px rgba(0,0,0,0.35)",
    fsBadge: "#7F9E7E",
    fsTypeBg: "rgba(127,158,126,0.14)",
    fsTypeColor: "#9FBB9E",
    fsTitle: "rgba(255,255,255,0.72)",
    fsHint: "#0A3A38",
    fsHintText: "rgba(255,255,255,0.55)",
    fsHintBorder: "#0F3336",
    divider: "#0F3336",
    dividerHover: "#7F9E7E",
  },

  light: {
    id: "light",
    bg: "#FFFFFF",
    bgEditor: "#F6F8F3",     // cream
    bgToolbar: "#FFFFFF",
    bgPanel: "#FFFFFF",
    bgInput: "#EDF3EC",      // sageSoft
    bgHover: "rgba(127,158,126,0.06)",
    bgSelected: "rgba(127,158,126,0.12)",
    bgSuccess: "rgba(62,110,62,0.06)",
    bgSuccessBd: "rgba(62,110,62,0.22)",
    bgError: "rgba(166,61,47,0.06)",
    bgErrorBd: "rgba(166,61,47,0.22)",
    bgWarning: "rgba(163,90,45,0.06)",
    bgWarningBd: "rgba(163,90,45,0.22)",
    border: "#E7EAE3",       // line
    borderHover: "#D8DDD4",  // borderStrong
    borderFocus: "#7F9E7E",  // sage
    text: "#1F1F1F",         // ink
    textCode: "#2C2C2C",
    textMuted: "#7A7E76",    // faint
    textDim: "#B7BBB3",
    textLabel: "#55584F",    // muted
    lineNum: "#B7BBB3",
    lineNumBorder: "#E7EAE3",
    accent: "#7F9E7E",       // sage
    accentSoft: "#EDF3EC",   // sageSoft
    green: "#3E6E3E",        // done
    greenSoft: "#EAF2E9",    // doneSoft
    greenDark: "#2F5530",
    red: "#A63D2F",          // danger
    redSoft: "#FAEAE8",      // dangerSoft
    redDark: "#7A2E24",
    yellow: "#A35A2D",       // amber
    yellowSoft: "#FBF0E7",   // amberSoft
    peach: "#A35A2D",
    peachSoft: "#FBF0E7",
    runBg: "linear-gradient(135deg, #7F9E7E, #6C8B6B)",  // sage → sageDark
    runBgHover: "linear-gradient(135deg, #92AE91, #7F9E7E)",
    runShadow: "0 2px 12px rgba(127,158,126,0.32)",
    testBg: "rgba(163,90,45,0.06)",
    testBorder: "rgba(163,90,45,0.25)",
    testColor: "#8A4A24",
    scrollThumb: "rgba(127,158,126,0.22)",
    scrollTrack: "transparent",
    caret: "#7F9E7E",
    qBg: "#FFFFFF",
    qBorderRight: "#E7EAE3",
    qText: "#1F1F1F",
    qTextSecondary: "#55584F",
    qTextMuted: "#7A7E76",
    qHeading: "#022124",     // pine — question titles
    qStrong: "#022124",
    qLink: "#5E815D",        // sageText
    qLinkHover: "#3E6E3E",
    qCodeBg: "#EDF3EC",      // sageSoft (inline `code`)
    qCodeText: "#022124",
    qCodeBorder: "transparent",
    qPreBg: "#F6F8F3",       // cream (code blocks)
    qPreBorder: "#E7EAE3",
    qPreText: "#1F1F1F",
    qExampleBg: "transparent",
    qExampleBorder: "#E7EAE3",
    qExampleLabel: "#022124",
    qConstraintBg: "#F6F8F3",
    qConstraintBd: "#E7EAE3",
    qEasyBg: "#EAF2E9",
    qEasyColor: "#3E6E3E",
    qMediumBg: "#FBF0E7",
    qMediumColor: "#A35A2D",
    qHardBg: "#FAEAE8",
    qHardColor: "#A63D2F",
    qSeparator: "#E7EAE3",
    qScrollThumb: "rgba(31,31,31,0.10)",
    fsBg: "#FFFFFF",
    fsShadow: "0 1px 4px rgba(2,33,36,0.06)",
    fsBadge: "#7F9E7E",
    fsTypeBg: "#EDF3EC",
    fsTypeColor: "#5E815D",
    fsTitle: "#55584F",
    fsHint: "#F6F8F3",
    fsHintText: "#55584F",
    fsHintBorder: "#E7EAE3",
    divider: "#E7EAE3",
    dividerHover: "#7F9E7E",
  },
};

export const LineNumbers = React.forwardRef(
  ({ count, fontSize, theme }, ref) => (
    <Box
      ref={ref}
      sx={{
        pt: "16px",
        pb: "16px",
        pr: "14px",
        pl: "12px",
        minWidth: 48,
        textAlign: "right",
        color: theme.lineNum,
        fontSize: fontSize - 1,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        // lineHeight: "1.7",
        lineHeight: `${fontSize * 1.7}px`,
        userSelect: "none",
        borderRight: `1px solid ${theme.lineNumBorder}`,
        flexShrink: 0,
        willChange: "transform",
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </Box>
  ),
);

export const ResizableDivider = ({ onDrag, theme }) => {
  const [active, setActive] = useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setActive(true);
    const startX = e.clientX;
    const move = (ev) => onDrag(ev.clientX - startX);
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setActive(false);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  return (
    <Box
      onMouseDown={handleMouseDown}
      sx={{
        width: 5,
        cursor: "col-resize",
        flexShrink: 0,
        bgcolor: active ? theme.dividerHover : theme.divider,
        transition: "background 0.2s ease",
        "&:hover": { bgcolor: theme.dividerHover },
        position: "relative",
        "&::after": {
          content: '""',
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 3,
          height: 40,
          borderRadius: 2,
          bgcolor: active ? "#fff" : theme.textDim,
          transition: "all 0.2s ease",
          opacity: 0.5,
        },
        "&:hover::after": { opacity: 1, bgcolor: "#fff" },
      }}
    />
  );
};

export const PORTAL_Z = 10001;

export const ThemeToggle = ({ isDark, onToggle, theme }) => (
  <Tooltip
    title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
    arrow
    PopperProps={{ sx: { zIndex: PORTAL_Z } }}
  >
    <IconButton
      size="small"
      onClick={onToggle}
      sx={{
        color: theme.textMuted,
        p: "4px",
        borderRadius: "8px",
        bgcolor: theme.bgInput,
        border: `1px solid ${theme.border}`,
        transition: "all 0.25s ease",
        "&:hover": {
          bgcolor: theme.accentSoft,
          borderColor: theme.accent,
          color: theme.accent,
          transform: "rotate(15deg)",
        },
      }}
    >
      {isDark ? (
        <LightModeIcon sx={{ fontSize: 16 }} />
      ) : (
        <DarkModeIcon sx={{ fontSize: 16 }} />
      )}
    </IconButton>
  </Tooltip>
);
export const parseErrorSummary = (
  stderr,
  isCompileError,
  isRuntimeError,
  isTimeout,
) => {
  if (!stderr && !isTimeout) return null;

  if (isTimeout) {
    return {
      type: "TimeoutError",
      message: "Your code took too long to execute. Check for infinite loops.",
      line: null,
    };
  }

  const errorStr = (stderr || "").trim();
  if (!errorStr) return null;

  const pyMatch = errorStr.match(
    /File\s+"[^"]*",\s+line\s+(\d+)[\s\S]*?(\w+Error):\s*(.+)/,
  );
  if (pyMatch) {
    return {
      type: pyMatch[2],
      message: pyMatch[3].trim(),
      line: parseInt(pyMatch[1]),
    };
  }

  const pySyntax = errorStr.match(/line\s+(\d+)[\s\S]*?(SyntaxError):\s*(.+)/);
  if (pySyntax) {
    return {
      type: pySyntax[2],
      message: pySyntax[3].trim(),
      line: parseInt(pySyntax[1]),
    };
  }

  const pySimple = errorStr.match(/(\w+Error):\s*(.+)/);
  if (pySimple) {
    // Try to find a line number somewhere
    const lineMatch = errorStr.match(/line\s+(\d+)/);
    return {
      type: pySimple[1],
      message: pySimple[2].trim().substring(0, 120),
      line: lineMatch ? parseInt(lineMatch[1]) : null,
    };
  }

  const jsMatch = errorStr.match(
    /(?:main\.js|[\w.]+\.js):(\d+)[\s\S]*?(\w+Error):\s*(.+)/,
  );
  if (jsMatch) {
    return {
      type: jsMatch[2],
      message: jsMatch[3].trim(),
      line: parseInt(jsMatch[1]),
    };
  }

  const cppMatch = errorStr.match(/main\.(?:cpp|c):(\d+):\d+:\s*error:\s*(.+)/);
  if (cppMatch) {
    return {
      type: "CompilationError",
      message: cppMatch[2].trim().substring(0, 120),
      line: parseInt(cppMatch[1]),
    };
  }


  const javaMatch = errorStr.match(/\w+\.java:(\d+):\s*error:\s*(.+)/);
  if (javaMatch) {
    return {
      type: "CompilationError",
      message: javaMatch[2].trim().substring(0, 120),
      line: parseInt(javaMatch[1]),
    };
  }

  const javaRuntime = errorStr.match(/(?:java\.lang\.)(\w+)(?::\s*(.+))?/);
  if (javaRuntime) {
    const lineMatch = errorStr.match(/(?:Main\.java):(\d+)/);
    return {
      type: javaRuntime[1],
      message: javaRuntime[2]?.trim() || javaRuntime[1],
      line: lineMatch ? parseInt(lineMatch[1]) : null,
    };
  }

  if (isCompileError) {
    return {
      type: "CompilationError",
      message: errorStr.split("\n")[0].substring(0, 120),
      line: null,
    };
  }

  if (isRuntimeError) {
    return {
      type: "RuntimeError",
      message: errorStr.split("\n")[0].substring(0, 120),
      line: null,
    };
  }

  return {
    type: "Error",
    message: errorStr.split("\n")[0].substring(0, 120),
    line: null,
  };
};


export const HIGHLIGHT_RULES = {

  comment_block: {
    pattern: /\/\*[\s\S]*?\*\//g,
    color: "#7A7E76",           // faint (comments — muted on both themes)
    // italic: true,
  },
  comment_line: { pattern: /\/\/[^\n]*/g, color: "#7A7E76" },
  string_bt:    { pattern: /`(?:[^`\\]|\\.)*`/g,     color: "#C97B4A" }, // warm terracotta
  string_dq:    { pattern: /"(?:[^"\\]|\\.)*"/g,     color: "#C97B4A" },
  string_sq:    { pattern: /'(?:[^'\\]|\\.)*'/g,     color: "#C97B4A" },
  number:       { pattern: /\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b/g, color: "#C89058" }, // warm amber
  keyword: {
    pattern:
      /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|true|false|try|void|volatile|while|def|del|elif|except|exec|from|global|lambda|nonlocal|pass|print|raise|with|yield|async|await|let|const|var|function|typeof|instanceof|in|of|export|default|type|interface|namespace|module|declare|readonly|override|sealed|record|permits)\b/g,
    color: "#B37AC6",           // muted violet — sits well on both themes
    // bold: true,
  },
  identifier: { pattern: /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g, color: "#7BA47A" }, // mid-sage — legible on both themes
};

export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function highlightCode(code) {
  if (!code) return "";

  // Build a flat list of [start, end, color, italic, bold] spans
  const spans = [];

  for (const rule of Object.values(HIGHLIGHT_RULES)) {
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(code)) !== null) {
      spans.push({
        start: m.index,
        end: m.index + m[0].length,
        color: rule.color,
        italic: !!rule.italic,
        bold: !!rule.bold,
      });
    }
  }

 
  spans.sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  );

 
  const merged = [];
  let cursor = 0;
  for (const sp of spans) {
    if (sp.start < cursor) continue; // overlaps previous — skip
    merged.push(sp);
    cursor = sp.end;
  }

  // Build HTML
  let html = "";
  let pos = 0;
  for (const sp of merged) {
    if (sp.start > pos) html += escapeHtml(code.slice(pos, sp.start));
    const style = [
      `color:${sp.color}`,
      sp.italic ? "font-style:italic" : "",
      sp.bold ? "font-weight:700" : "",
    ]
      .filter(Boolean)
      .join(";");
    html += `<span style="${style}">${escapeHtml(code.slice(sp.start, sp.end))}</span>`;
    pos = sp.end;
  }
  if (pos < code.length) html += escapeHtml(code.slice(pos));

 
  return html + "\n";
}