const USE_MOCK = false; 
const EXECUTE_URL      = '/api/manual-code/execute/';
const RUN_TESTS_URL    = '/api/manual-code/run-tests/';
const TEST_CASES_URL   = '/api/manual-code/test-cases/';
const LANGUAGES_URL    = '/api/manual-code/languages/';

// ─── Auth helper (JWT from localStorage) ───
const authHeaders = () => {
  const token = localStorage.getItem('ievalx_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Language Configurations ───
export const LANGUAGES = [
  {
    id: 'python',
    label: 'Python 3',
    pistonId: 'python',
    version: '3.10.0',
    ext: '.py',
    monacoId: 'python',
    defaultCode: `import sys\ninput = sys.stdin.readline\n\ndef solution():\n    # Read input: e.g. n = int(input())\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    solution()`,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    pistonId: 'javascript',
    version: '18.15.0',
    ext: '.js',
    monacoId: 'javascript',
    defaultCode: `const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', line => lines.push(line.trim()));\nrl.on('close', () => {\n    solution(lines);\n});\n\nfunction solution(lines) {\n    // Read input: e.g. const n = parseInt(lines[0]);\n    // Your code here\n}`,
  },
  {
    id: 'java',
    label: 'Java',
    pistonId: 'java',
    version: '15.0.2',
    ext: '.java',
    monacoId: 'java',
    defaultCode: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        solution(sc);\n        sc.close();\n    }\n\n    public static void solution(Scanner sc) {\n        // Read input: e.g. int n = sc.nextInt();\n        // Your code here\n    }\n}`,
  },
  {
    id: 'cpp',
    label: 'C++',
    pistonId: 'c++',
    version: '10.2.0',
    ext: '.cpp',
    monacoId: 'cpp',
    defaultCode: `#include <iostream>\n#include <string>\nusing namespace std;\n\nvoid solution() {\n    // Read input: e.g. int n; cin >> n;\n    // Your code here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    solution();\n    return 0;\n}`,
  },
  {
    id: 'c',
    label: 'C',
    pistonId: 'c',
    version: '10.2.0',
    ext: '.c',
    monacoId: 'c',
    defaultCode: `#include <stdio.h>\n#include <string.h>\n\nvoid solution() {\n    // Read input: e.g. int n; scanf("%d", &n);\n    // Your code here\n}\n\nint main() {\n    solution();\n    return 0;\n}`,
  },
  // 🔧 SQL is a "virtual" language — it executes inside the application's
  // MySQL via the backend's sql_runner sandbox, not via a subprocess. The
  // backend reads the question's schema_ddl / seed_data / expected_resultset
  // and runs the candidate's SELECT/WITH against an ephemeral schema. The
  // starter snippet here is purely a SELECT scaffold — schema and seed are
  // pre-loaded by the server, so there's no `CREATE TABLE` boilerplate for
  // the candidate to write.
  {
    id: 'sql',
    label: 'SQL (MySQL)',
    pistonId: null,
    version: 'MySQL 8',
    ext: '.sql',
    monacoId: 'sql',
    defaultCode: `-- Write a SELECT or WITH query against the question's pre-loaded schema.\n-- The recruiter's CREATE TABLE + INSERT statements have already been applied.\n\nSELECT\n    -- columns...\nFROM /* table */\nWHERE /* condition */;`,
  },
];

// ═══════════════════════════════════════════════════════════════════
// MOCK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════

const _mockExecute = (languageId, code, stdin) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const langConfig = LANGUAGES.find(l => l.id === languageId);
      resolve({
        success: true,
        stdout: `[MOCK] Executed ${langConfig?.label || languageId}\nstdin: ${stdin || '(empty)'}\ncode length: ${code.length} chars\n`,
        stderr: '',
        output: '',
        exitCode: 0,
        signal: null,
        executionTime: '342ms',
        memory: 'N/A',
        language: langConfig?.label || languageId,
        isCompileError: false,
        isRuntimeError: false,
        isTimeout: false,
      });
    }, 350);
  });

const _mockRunTests = (languageId, code, testCases) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const results = (testCases || []).map((tc) => ({
        id: tc.id,
        label: tc.label || `Test ${tc.id}`,
        input: tc.input || '',
        expected_output: tc.expected_output || tc.expected || '',
        actual_output: tc.expected_output || tc.expected || '',
        passed: true,
        execution_time_ms: 120,
        stderr: '',
        is_compile_error: false,
        is_runtime_error: false,
        is_timeout: false,
        weight: tc.weight ?? 1,
      }));
      const total = results.length;
      resolve({
        results,
        total_passed: total,
        total_failed: 0,
        total_cases: total,
        all_passed: true,
        score_percentage: 100,
        overall_result: '[MOCK] All test cases passed',
      });
    }, 500);
  });

const _mockGetTestCases = () =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        test_cases: [
          {
            id: 1,
            label: 'Sample Case 1',
            input: 'AI is the future and AI is powerful',
            expected_output: "{'AI':2, 'is':2, 'the':1, 'future':1, 'and':1, 'powerful':1}",
            is_hidden: false,
            weight: 1,
          },
          {
            id: 2,
            label: 'Hidden Case 1',
            input: 'hello world hello',
            expected_output: "{'hello':2, 'world':1}",
            is_hidden: true,
            weight: 1,
          },
        ],
        total_hidden: 1,
      });
    }, 350);
  });

export const executeCode = async (languageId, code, stdin = '', testId = null, questionNumber = null) => {
  const langConfig = LANGUAGES.find(l => l.id === languageId);
  if (!langConfig) {
    throw new Error(`Unsupported language: ${languageId}`);
  }

  if (!code || code.trim().length === 0) {
    return {
      success: false,
      stdout: '',
      stderr: 'No code provided.',
      output: '',
      exitCode: -1,
      executionTime: '0ms',
      memory: 'N/A',
      language: langConfig.label,
    };
  }

  if (code.length > 100000) {
    return {
      success: false,
      stdout: '',
      stderr: 'Code exceeds maximum size limit (100KB).',
      output: '',
      exitCode: -1,
      executionTime: '0ms',
      memory: 'N/A',
      language: langConfig.label,
    };
  }

  if (USE_MOCK) {
    return _mockExecute(languageId, code, stdin);
  }

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // 🔧 CHANGE 1/2 — Backend now requires `assignment_id` on /execute/.
    // `testId` (the CodeEditor prop) already carries the assignment ID
    // — see URL pattern /manual-assignment/{id}/... vs payload test_id:"18".
    // We send both keys so the call works whether the backend reads
    // assignment_id (new) or test_id (legacy). Zero risk of regression.
    const response = await fetch(EXECUTE_URL, {
      method: 'POST',
      headers: authHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        assignment_id:   testId,
        test_id:         testId,
        question_number: questionNumber,
        language:        languageId,
        code:            code,
        stdin:           stdin,
      }),
    });
    clearTimeout(timeout);

    if (response.status === 403) {
      let serverMsg = "This section's time has expired.";
      try {
        const errJson = await response.json();
        if (errJson?.Error) serverMsg = errJson.Error;
      } catch { /* ignore */ }
      return {
        success: false,
        stdout: '',
        stderr: serverMsg,
        output: '',
        exitCode: -1,
        signal: null,
        executionTime: '0ms',
        memory: 'N/A',
        language: langConfig.label,
        isCompileError: false,
        isRuntimeError: false,
        isTimeout: false,
        isSectionExpired: true,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const elapsed = Math.round(performance.now() - startTime);

    return {
      success: data.success || false,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      output: data.stdout || '',
      exitCode: data.exit_code ?? -1,
      signal: null,
      executionTime: `${data.execution_time_ms || elapsed}ms`,
      memory: 'N/A',
      language: data.language || langConfig.label,
      isCompileError: data.is_compile_error || false,
      isRuntimeError: data.is_runtime_error || false,
      isTimeout: data.is_timeout || false,
    };
  } catch (error) {
    const elapsed = Math.round(performance.now() - startTime);

    if (error.name === 'AbortError') {
      return {
        success: false,
        stdout: '',
        stderr: 'Code execution timed out. Your code may have an infinite loop.',
        output: '',
        exitCode: -1,
        signal: null,
        executionTime: `${elapsed}ms`,
        memory: 'N/A',
        language: langConfig.label,
        isCompileError: false,
        isRuntimeError: false,
        isTimeout: true,
      };
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        success: false,
        stdout: '',
        stderr: 'Unable to reach the server. Please check your internet connection and try again.',
        output: '',
        exitCode: -1,
        signal: null,
        executionTime: `${elapsed}ms`,
        memory: 'N/A',
        language: langConfig?.label || languageId,
        isCompileError: false,
        isRuntimeError: false,
        isTimeout: false,
        isNetworkError: true,
      };
    }

    return {
      success: false,
      stdout: '',
      stderr: error.message,
      output: '',
      exitCode: -1,
      signal: null,
      executionTime: `${elapsed}ms`,
      memory: 'N/A',
      language: langConfig?.label || languageId,
      isCompileError: false,
      isRuntimeError: false,
      isTimeout: error.message.includes('timed out') || error.message.includes('infinite loop'),
      isNetworkError: false,
    };
  }
};

// ═══════════════════════════════════════════════════════════════════
// RUN TEST CASES (client-side loop, kept for custom-input fallback)
// ═══════════════════════════════════════════════════════════════════

export const runTestCases = async (languageId, code, testCases = []) => {
  const results = [];

  for (const tc of testCases) {
    try {
      const result = await executeCode(languageId, code, tc.input || '');
      const actualOutput = (result.stdout || '').trim();
      const expectedOutput = (tc.expected || tc.expected_output || '').trim();

      const isExactMatch = actualOutput === expectedOutput;
      const isPartialMatch = expectedOutput && actualOutput.toLowerCase().includes(expectedOutput.toLowerCase());

      results.push({
        ...tc,
        actualOutput: actualOutput,
        passed: isExactMatch || isPartialMatch,
        executionTime: result.executionTime,
        error: result.stderr || null,
        isCompileError: result.isCompileError,
        isRuntimeError: result.isRuntimeError,
        isTimeout: result.isTimeout,
      });
    } catch (err) {
      results.push({
        ...tc,
        actualOutput: '',
        passed: false,
        executionTime: 'N/A',
        error: err.message,
        isCompileError: false,
        isRuntimeError: true,
        isTimeout: false,
      });
    }
  }

  return {
    results,
    totalPassed: results.filter(r => r.passed).length,
    totalFailed: results.filter(r => !r.passed).length,
    totalCases: results.length,
    allPassed: results.every(r => r.passed),
  };
};

// ═══════════════════════════════════════════════════════════════════
// RUN TEST CASES (SERVER-SIDE — trusted scorer)
// ═══════════════════════════════════════════════════════════════════

export const runTestCasesServer = async (
  languageId,
  code,
  testCases = [],
  testId = null,
  questionNumber = null,
) => {
  if (USE_MOCK) {
    return _mockRunTests(languageId, code, testCases);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    // 🔧 CHANGE 2/2 — Same defensive both-keys pattern for /run-tests/.
    // Run-tests was working with test_id alone, but if backend rolls out
    // the same assignment_id rename, this won't break.
    const response = await fetch(RUN_TESTS_URL, {
      method: 'POST',
      headers: authHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        assignment_id:   testId,
        test_id:         testId,
        question_number: questionNumber,
        language:        languageId,
        code,
      }),
    });
    clearTimeout(timeout);

   if (response.status === 403) {
      let serverMsg = 'This section\'s time has expired.';
      try {
        const errJson = await response.json();
        if (errJson?.Error) serverMsg = errJson.Error;
      } catch { /* ignore */ }
      return {
        results: [],
        total_passed: 0,
        total_failed: 0,
        total_cases: 0,
        all_passed: false,
        score_percentage: 0,
        overall_result: serverMsg,
        error: serverMsg,
        isSectionExpired: true,
      };
    }

    if (!response.ok) {
      // Prefer the backend's clean { Error: "..." } message (e.g. an SQL
      // question missing its schema DDL) over a raw "Backend error (400): {…}".
      let serverMsg = `Backend error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.Error) serverMsg = errJson.Error;
        else if (errJson?.error) serverMsg = errJson.error;
      } catch { /* response wasn't JSON — keep the generic message */ }
      throw new Error(serverMsg);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    return {
      results: [],
      total_passed: 0,
      total_failed: 0,
      total_cases: 0,
      all_passed: false,
      score_percentage: 0,
      overall_result: error.message || 'Failed to run test cases',
      error: error.message,
    };
  }
};

export const getTestCases = async (testId, questionNumber) => {
  if (USE_MOCK) {
    return _mockGetTestCases();
  }

  try {
    const response = await fetch(
      `${TEST_CASES_URL}?test_id=${encodeURIComponent(testId)}&question_number=${encodeURIComponent(questionNumber)}`,
      { method: 'GET', headers: authHeaders() },
    );

    if (response.status === 403) {
      let serverMsg = 'Cannot load test cases for this question.';
      try {
        const errJson = await response.json();
        if (errJson?.Error) serverMsg = errJson.Error;
      } catch { /* ignore */ }
      return {
        test_cases: [],
        total_hidden: 0,
        error: serverMsg,
        isForbidden: true,
      };
    }

    if (!response.ok) {
      let serverMsg = `Backend error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.Error) serverMsg = errJson.Error;
      } catch { /* ignore */ }
      return {
        test_cases: [],
        total_hidden: 0,
        error: serverMsg,
      };
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch test cases:', error);
    return { test_cases: [], total_hidden: 0, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════════
// Available Runtimes / Health
// ═══════════════════════════════════════════════════════════════════

export const getAvailableRuntimes = async (testId = null, questionNumber = null) => {
  if (USE_MOCK) {
    return LANGUAGES.map(l => ({ language: l.pistonId, version: l.version }));
  }
  try {
    const qs = (testId != null && questionNumber != null)
      ? `?test_id=${encodeURIComponent(testId)}&question_number=${encodeURIComponent(questionNumber)}`
      : '';
    const response = await fetch(`${LANGUAGES_URL}${qs}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch runtimes');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch runtimes:', error);
    return [];
  }
};

export const testCompilerConnection = async () => {
  try {
    const result = await executeCode('python', 'print("OK")', '');
    return {
      connected: result.stdout.trim().includes('OK'),
      latency: result.executionTime,
      message: result.stdout.trim().includes('OK') ? 'Compiler connected' : 'Unexpected output',
      server: USE_MOCK ? 'mock' : 'ievalx-django',
    };
  } catch (error) {
    return {
      connected: false,
      latency: 'N/A',
      message: error.message,
      server: 'none',
    };
  }
};

export default {
  LANGUAGES,
  executeCode,
  runTestCases,
  runTestCasesServer,
  getTestCases,
  getAvailableRuntimes,
  testCompilerConnection,
};