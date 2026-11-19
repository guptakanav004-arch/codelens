import type { LanguageId } from "@/types/review";

export interface LanguageInfo {
  id: LanguageId;
  label: string;
  monaco: string;
  ext: string;
  extensions: string[];
  /** honest description of the analysis depth available for this language */
  analysis: string;
}

export const LANGUAGES: LanguageInfo[] = [
  {
    id: "python",
    label: "Python",
    monaco: "python",
    ext: "py",
    extensions: ["py", "pyw"],
    analysis: "Ruff, Bandit, Radon and AST (Python backend) + AI review",
  },
  {
    id: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    ext: "js",
    extensions: ["js", "jsx", "mjs", "cjs"],
    analysis: "ESLint (Python backend, if installed) + pattern scan + AI review",
  },
  {
    id: "typescript",
    label: "TypeScript",
    monaco: "typescript",
    ext: "ts",
    extensions: ["ts", "tsx"],
    analysis: "ESLint (Python backend, if installed) + pattern scan + AI review",
  },
  { id: "java", label: "Java", monaco: "java", ext: "java", extensions: ["java"], analysis: "Pattern scan + AI review" },
  { id: "c", label: "C", monaco: "c", ext: "c", extensions: ["c", "h"], analysis: "Pattern scan + AI review" },
  {
    id: "cpp",
    label: "C++",
    monaco: "cpp",
    ext: "cpp",
    extensions: ["cpp", "cc", "cxx", "hpp", "hh"],
    analysis: "Pattern scan + AI review",
  },
  { id: "html", label: "HTML", monaco: "html", ext: "html", extensions: ["html", "htm"], analysis: "Pattern scan + AI review" },
  { id: "css", label: "CSS", monaco: "css", ext: "css", extensions: ["css", "scss"], analysis: "Pattern scan + AI review" },
  { id: "sql", label: "SQL", monaco: "sql", ext: "sql", extensions: ["sql"], analysis: "Pattern scan + AI review" },
];

export function getLanguage(id: LanguageId): LanguageInfo {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}

export function languageFromFilename(name: string): LanguageId | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return LANGUAGES.find((l) => l.extensions.includes(ext))?.id ?? null;
}

/** Best-effort language detection from content. Returns null if not confident. */
export function detectLanguage(code: string): LanguageId | null {
  const s = code.slice(0, 6000);
  if (s.trim().length < 12) return null;
  const tests: [LanguageId, RegExp[]][] = [
    ["python", [/^\s*def\s+\w+\(.*\)\s*(->.*)?:/m, /^\s*import\s+\w+$/m, /^\s*from\s+\w+[\w.]*\s+import\s/m, /\bself\./, /^\s*elif\s/m, /print\(.*\)\s*$/m]],
    ["java", [/\bpublic\s+(static\s+)?(class|void|interface)\b/, /System\.out\.print/, /\bimport\s+java\./, /\bString\[\]\s+args\b/]],
    ["cpp", [/#include\s*<(iostream|vector|string|map|algorithm|memory)>/, /\bstd::/, /\bcout\s*<</, /\busing\s+namespace\s+std/, /\btemplate\s*</]],
    ["c", [/#include\s*<(stdio|stdlib|string)\.h>/, /\bprintf\s*\(/, /\bint\s+main\s*\(/]],
    ["typescript", [/:\s*(string|number|boolean)\b/, /\binterface\s+\w+\s*\{/, /\btype\s+\w+\s*=/, /<[A-Z]\w*>\(/, /\bas\s+(string|number|const|unknown)\b/]],
    ["javascript", [/\b(const|let|var)\s+\w+\s*=/, /=>\s*[{(]?/, /\bfunction\s+\w*\(/, /console\.\w+\(/, /\brequire\(/, /\bmodule\.exports\b/]],
    ["html", [/<!doctype html>/i, /<html[\s>]/i, /<div[\s>]/i, /<\/(body|head|div|p|span)>/i]],
    ["css", [/^[.#]?[\w-]+\s*\{[^}]*:[^}]*;/m, /@media\s*\(/, /\bdisplay\s*:\s*(flex|grid|block)/]],
    ["sql", [/\bSELECT\b[\s\S]+\bFROM\b/i, /\bINSERT\s+INTO\b/i, /\bCREATE\s+TABLE\b/i, /\bUPDATE\b\s+\w+\s+SET\b/i]],
  ];
  let best: LanguageId | null = null;
  let bestScore = 0;
  for (const [id, regs] of tests) {
    const score = regs.reduce((n, r) => n + (r.test(s) ? 1 : 0), 0);
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return bestScore >= 1 ? best : null;
}
