import type { LanguageId, Severity, StaticFinding, StaticMetrics, ToolStatus } from "@/types/review";

interface Rule {
  id: string;
  langs: LanguageId[] | "all";
  pattern: RegExp;
  severity: Severity;
  category: string;
  message: string;
}

const JS: LanguageId[] = ["javascript", "typescript"];
const CFAMILY: LanguageId[] = ["c", "cpp"];

const RULES: Rule[] = [
  // --- all languages
  { id: "hardcoded-secret", langs: "all", pattern: /\b(password|passwd|secret|api[_-]?key|token|private[_-]?key)\w*\s*[:=]\s*["'`][^"'`\s]{6,}["'`]/i, severity: "High", category: "Security", message: "Possible hardcoded credential or secret." },
  { id: "aws-access-key", langs: "all", pattern: /AKIA[0-9A-Z]{16}/, severity: "Critical", category: "Security", message: "String resembles an AWS access key id." },
  { id: "private-key-block", langs: "all", pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, severity: "Critical", category: "Security", message: "Private key material embedded in source." },
  { id: "sql-concat", langs: "all", pattern: /\b(SELECT\s.+\sFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b.*(["']\s*\+|\+\s*["']|%s|\$\{|\bf["']|\.format\()/i, severity: "High", category: "Security", message: "SQL statement appears to be built with string concatenation or formatting (SQL injection risk)." },
  { id: "todo-marker", langs: "all", pattern: /\b(TODO|FIXME|HACK|XXX)\b/, severity: "Info", category: "Maintainability", message: "Unresolved TODO/FIXME marker." },

  // --- python
  { id: "py-eval", langs: ["python"], pattern: /(^|[^\w.])(eval|exec)\s*\(/, severity: "High", category: "Security", message: "Use of eval()/exec() on dynamic input can lead to code execution." },
  { id: "py-pickle", langs: ["python"], pattern: /\bpickle\.loads?\s*\(/, severity: "High", category: "Security", message: "Unsafe deserialization with pickle." },
  { id: "py-yaml-load", langs: ["python"], pattern: /\byaml\.load\s*\((?!.*Loader\s*=\s*yaml\.SafeLoader)/, severity: "Medium", category: "Security", message: "yaml.load() without SafeLoader can execute arbitrary objects." },
  { id: "py-shell-true", langs: ["python"], pattern: /subprocess\.\w+\(.*shell\s*=\s*True/, severity: "High", category: "Security", message: "subprocess call with shell=True is vulnerable to command injection." },
  { id: "py-os-system", langs: ["python"], pattern: /\bos\.(system|popen)\s*\(/, severity: "High", category: "Security", message: "os.system()/os.popen() can allow shell command injection." },
  { id: "py-weak-hash", langs: ["python"], pattern: /\bhashlib\.(md5|sha1)\s*\(/, severity: "Medium", category: "Security", message: "MD5/SHA-1 are weak hash functions (not suitable for passwords or integrity)." },
  { id: "py-verify-false", langs: ["python"], pattern: /verify\s*=\s*False/, severity: "Medium", category: "Security", message: "TLS certificate verification disabled." },
  { id: "py-bare-except", langs: ["python"], pattern: /^\s*except\s*:/, severity: "Low", category: "Quality", message: "Bare except hides unexpected errors." },
  { id: "py-mutable-default", langs: ["python"], pattern: /def\s+\w+\(.*=\s*(\[\]|\{\}|set\(\))\s*[,)]/, severity: "Medium", category: "Bug", message: "Mutable default argument is shared between calls." },
  { id: "py-none-eq", langs: ["python"], pattern: /[=!]=\s*None\b/, severity: "Low", category: "Quality", message: "Compare to None using 'is' / 'is not'." },
  { id: "py-debug-true", langs: ["python"], pattern: /\bdebug\s*=\s*True/, severity: "Medium", category: "Security", message: "Debug mode enabled." },

  // --- js / ts
  { id: "js-eval", langs: JS, pattern: /(^|[^\w.])eval\s*\(|new\s+Function\s*\(/, severity: "High", category: "Security", message: "eval()/new Function() executes dynamic code." },
  { id: "js-innerhtml", langs: JS, pattern: /\.innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(/, severity: "Medium", category: "Security", message: "Writing raw HTML can introduce cross-site scripting (XSS)." },
  { id: "js-reflected-html", langs: JS, pattern: /res\.send\(\s*["'`]<.*(\+|\$\{)/, severity: "High", category: "Security", message: "HTML response built from concatenated values may reflect user input (XSS)." },
  { id: "js-loose-eq", langs: JS, pattern: /[^=!<>]==[^=]|!=[^=]/, severity: "Low", category: "Quality", message: "Loose equality (==/!=) performs type coercion; prefer ===/!==." },
  { id: "js-var", langs: JS, pattern: /^\s*var\s+\w+/, severity: "Low", category: "Quality", message: "Prefer const/let over var." },
  { id: "js-console", langs: JS, pattern: /\bconsole\.(log|debug)\s*\(/, severity: "Info", category: "Quality", message: "console logging left in code." },

  // --- java
  { id: "java-empty-catch", langs: ["java"], pattern: /catch\s*\([^)]*\)\s*\{\s*\}/, severity: "Medium", category: "Bug", message: "Empty catch block silently swallows exceptions." },
  { id: "java-print-stack", langs: ["java"], pattern: /\.printStackTrace\s*\(/, severity: "Low", category: "Quality", message: "printStackTrace() instead of structured logging." },
  { id: "java-string-eq", langs: ["java"], pattern: /\w+\s*==\s*"[^"]*"|"[^"]*"\s*==\s*\w+/, severity: "Medium", category: "Bug", message: "Strings compared with == compare references, use equals()." },
  { id: "java-runtime-exec", langs: ["java"], pattern: /Runtime\.getRuntime\(\)\.exec\s*\(/, severity: "High", category: "Security", message: "Runtime.exec() may allow command injection." },
  { id: "java-deserialize", langs: ["java"], pattern: /\bObjectInputStream\b/, severity: "Medium", category: "Security", message: "Java deserialization of untrusted data is dangerous." },
  { id: "java-weak-random", langs: ["java"], pattern: /new\s+Random\s*\(/, severity: "Low", category: "Security", message: "java.util.Random is not cryptographically secure." },

  // --- c / c++
  { id: "c-gets", langs: CFAMILY, pattern: /\bgets\s*\(/, severity: "Critical", category: "Security", message: "gets() cannot limit input length and always risks buffer overflow." },
  { id: "c-strcpy", langs: CFAMILY, pattern: /\b(strcpy|strcat)\s*\(/, severity: "High", category: "Security", message: "strcpy()/strcat() do not check destination size (buffer overflow)." },
  { id: "c-sprintf", langs: CFAMILY, pattern: /\bsprintf\s*\(/, severity: "Medium", category: "Security", message: "sprintf() has no bounds check; use snprintf()." },
  { id: "c-scanf-s", langs: CFAMILY, pattern: /scanf\s*\(\s*"[^"]*%s/, severity: "High", category: "Security", message: "scanf %s without width limit can overflow the buffer." },
  { id: "c-system", langs: CFAMILY, pattern: /\bsystem\s*\(/, severity: "High", category: "Security", message: "system() executes shell commands." },
  { id: "c-rand", langs: CFAMILY, pattern: /\brand\s*\(\s*\)/, severity: "Low", category: "Security", message: "rand() is predictable and not suitable for security purposes." },
  { id: "cpp-using-std", langs: ["cpp"], pattern: /using\s+namespace\s+std\s*;/, severity: "Low", category: "Quality", message: "'using namespace std' pollutes the global namespace." },
  { id: "cpp-raw-new", langs: ["cpp"], pattern: /=\s*new\s+\w+(\[[^\]]*\])?\s*;/, severity: "Low", category: "Maintainability", message: "Raw new: prefer smart pointers or containers to avoid leaks." },
  { id: "c-malloc-cast", langs: ["cpp"], pattern: /\(\s*\w+\s*\*\s*\)\s*malloc\s*\(/, severity: "Low", category: "Quality", message: "malloc() in C++; prefer new/containers/smart pointers." },
  { id: "c-off-by-one", langs: CFAMILY, pattern: /for\s*\([^;]*;\s*\w+\s*<=\s*\w+(\.size\(\)|\.length)/, severity: "High", category: "Bug", message: "Loop condition uses <= with size(): likely off-by-one out-of-bounds access." },

  // --- sql
  { id: "sql-select-star", langs: ["sql"], pattern: /\bSELECT\s+\*/i, severity: "Low", category: "Performance", message: "SELECT * fetches unnecessary columns." },
  { id: "sql-no-where", langs: ["sql"], pattern: /^\s*(DELETE\s+FROM\s+\w+|UPDATE\s+\w+\s+SET\s[^;]*?)\s*;?\s*$/i, severity: "Medium", category: "Bug", message: "DELETE/UPDATE without a WHERE clause affects every row." },
  { id: "sql-grant-all", langs: ["sql"], pattern: /\bGRANT\s+ALL\b/i, severity: "Medium", category: "Security", message: "GRANT ALL violates least privilege." },

  // --- html
  { id: "html-inline-handler", langs: ["html"], pattern: /\son(click|load|error|mouseover)\s*=/i, severity: "Low", category: "Security", message: "Inline event handlers hinder Content-Security-Policy." },
  { id: "html-http-script", langs: ["html"], pattern: /<script[^>]+src=["']http:\/\//i, severity: "Medium", category: "Security", message: "Script loaded over insecure HTTP." },
  { id: "html-img-alt", langs: ["html"], pattern: /<img(?![^>]*\balt=)[^>]*>/i, severity: "Low", category: "Accessibility", message: "<img> without alt attribute." },
  { id: "html-blank-rel", langs: ["html"], pattern: /target=["']_blank["'](?![^>]*rel=)/i, severity: "Low", category: "Security", message: "target=_blank without rel=noopener." },

  // --- css
  { id: "css-important", langs: ["css"], pattern: /!important/, severity: "Low", category: "Maintainability", message: "!important makes styles harder to override and maintain." },
];

const COMMENT_PREFIX: Record<LanguageId, RegExp> = {
  python: /^\s*#/,
  java: /^\s*(\/\/|\/\*|\*)/,
  c: /^\s*(\/\/|\/\*|\*)/,
  cpp: /^\s*(\/\/|\/\*|\*)/,
  javascript: /^\s*(\/\/|\/\*|\*)/,
  typescript: /^\s*(\/\/|\/\*|\*)/,
  html: /^\s*<!--/,
  css: /^\s*(\/\*|\*)/,
  sql: /^\s*(--|\/\*|\*)/,
};

function functionCount(code: string, lang: LanguageId): number | null {
  const patterns: Partial<Record<LanguageId, RegExp>> = {
    python: /^\s*(async\s+)?def\s+\w+/gm,
    javascript: /\bfunction\s+\w*\s*\(|=>\s*[{(]|^\s*(async\s+)?\w+\s*\([^)]*\)\s*\{/gm,
    typescript: /\bfunction\s+\w*\s*\(|=>\s*[{(]|^\s*(async\s+)?\w+\s*\([^)]*\)\s*(:\s*[\w<>\[\]|]+\s*)?\{/gm,
    java: /^\s*(public|private|protected)\s+(static\s+)?[\w<>\[\],\s]+\s+\w+\s*\([^)]*\)\s*(throws\s+[\w,\s]+)?\{/gm,
    c: /^[\w*\s]+\s+\**\w+\s*\([^;)]*\)\s*\{/gm,
    cpp: /^[\w:<>*&\s]+\s+[*&]*\w+\s*\([^;)]*\)\s*(const\s*)?\{/gm,
  };
  const p = patterns[lang];
  if (!p) return null;
  return (code.match(p) ?? []).length;
}

function maxNesting(lines: string[], lang: LanguageId): number {
  if (lang === "python") {
    let max = 0;
    for (const l of lines) {
      if (!l.trim() || /^\s*#/.test(l)) continue;
      const indent = l.match(/^[ \t]*/)![0].replace(/\t/g, "    ").length;
      max = Math.max(max, Math.floor(indent / 4));
    }
    return max;
  }
  let depth = 0;
  let max = 0;
  for (const l of lines) {
    for (const ch of l) {
      if (ch === "{") {
        depth++;
        max = Math.max(max, depth);
      } else if (ch === "}") depth = Math.max(0, depth - 1);
    }
  }
  return max;
}

export function computeMetrics(code: string, lang: LanguageId): StaticMetrics {
  const lines = code.split("\n");
  const blank = lines.filter((l) => l.trim() === "").length;
  const comment = lines.filter((l) => COMMENT_PREFIX[lang].test(l)).length;
  const decisionPoints = (code.match(/\b(if|elif|else if|for|while|case|catch|except|and|or)\b|&&|\|\||\?[^?.]/g) ?? []).length;
  return {
    total_lines: lines.length,
    code_lines: Math.max(0, lines.length - blank - comment),
    comment_lines: comment,
    blank_lines: blank,
    function_count: functionCount(code, lang),
    max_nesting_depth: maxNesting(lines, lang),
    cyclomatic_complexity: lang === "html" || lang === "css" ? null : decisionPoints + 1,
    source: "heuristic",
  };
}

export interface StaticResult {
  tools: ToolStatus[];
  findings: StaticFinding[];
  metrics: StaticMetrics;
}

export function runStaticAnalysis(code: string, lang: LanguageId): StaticResult {
  const findings: StaticFinding[] = [];
  const lines = code.split("\n");
  const seen = new Set<string>();

  lines.forEach((line, idx) => {
    const isComment = COMMENT_PREFIX[lang].test(line);
    for (const rule of RULES) {
      if (rule.langs !== "all" && !rule.langs.includes(lang)) continue;
      if (isComment && rule.id !== "todo-marker") continue;
      if (rule.id === "todo-marker" && !isComment && !/(#|\/\/|--)\s*(TODO|FIXME|HACK|XXX)/.test(line)) continue;
      if (!rule.pattern.test(line)) continue;
      const key = `${rule.id}:${idx}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        tool: "pattern-scan",
        rule: rule.id,
        message: rule.message,
        severity: rule.severity,
        category: rule.category,
        line: idx + 1,
      });
    }
  });

  const tools: ToolStatus[] = [
    { tool: "pattern-scan", status: "ok", detail: "Built-in rule-based scanner", findings: findings.length },
  ];
  const external: Partial<Record<LanguageId, string[]>> = {
    python: ["ruff", "bandit", "radon"],
    javascript: ["eslint"],
    typescript: ["eslint"],
  };
  for (const t of external[lang] ?? []) {
    tools.push({
      tool: t,
      status: "unavailable",
      detail: "Not run by the built-in engine. Start the Python backend (BACKEND_API_URL) to enable it.",
      findings: 0,
    });
  }
  tools.push({
    tool: "metrics",
    status: "ok",
    detail: "Heuristic line/nesting/branch counts (not a verified complexity measurement)",
    findings: 0,
  });

  return { tools, findings, metrics: computeMetrics(code, lang) };
}
