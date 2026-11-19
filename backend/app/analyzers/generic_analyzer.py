"""Rule-based pattern scanner and heuristic metrics, used for every language."""
from __future__ import annotations

import re
from typing import Optional

from app.schemas.review import StaticFinding, StaticMetrics, ToolStatus

JS = ("javascript", "typescript")
CF = ("c", "cpp")

# (id, languages | None for all, regex, severity, category, message)
RULES: list[tuple[str, Optional[tuple[str, ...]], str, str, str, str]] = [
    ("hardcoded-secret", None, r"(?i)\b(password|passwd|secret|api[_-]?key|token|private[_-]?key)\w*\s*[:=]\s*[\"'`][^\"'`\s]{6,}[\"'`]", "High", "Security", "Possible hardcoded credential or secret."),
    ("aws-access-key", None, r"AKIA[0-9A-Z]{16}", "Critical", "Security", "String resembles an AWS access key id."),
    ("private-key-block", None, r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----", "Critical", "Security", "Private key material embedded in source."),
    ("sql-concat", None, r"(?i)\b(SELECT\s.+\sFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b.*([\"']\s*\+|\+\s*[\"']|%s|\$\{|\bf[\"']|\.format\()", "High", "Security", "SQL statement appears to be built with string concatenation or formatting (SQL injection risk)."),
    ("py-eval", ("python",), r"(^|[^\w.])(eval|exec)\s*\(", "High", "Security", "Use of eval()/exec() on dynamic input can lead to code execution."),
    ("py-pickle", ("python",), r"\bpickle\.loads?\s*\(", "High", "Security", "Unsafe deserialization with pickle."),
    ("py-yaml-load", ("python",), r"\byaml\.load\s*\((?!.*Loader\s*=\s*yaml\.SafeLoader)", "Medium", "Security", "yaml.load() without SafeLoader can execute arbitrary objects."),
    ("py-shell-true", ("python",), r"subprocess\.\w+\(.*shell\s*=\s*True", "High", "Security", "subprocess call with shell=True is vulnerable to command injection."),
    ("py-os-system", ("python",), r"\bos\.(system|popen)\s*\(", "High", "Security", "os.system()/os.popen() can allow shell command injection."),
    ("py-weak-hash", ("python",), r"\bhashlib\.(md5|sha1)\s*\(", "Medium", "Security", "MD5/SHA-1 are weak hash functions (not suitable for passwords or integrity)."),
    ("py-verify-false", ("python",), r"verify\s*=\s*False", "Medium", "Security", "TLS certificate verification disabled."),
    ("py-none-eq", ("python",), r"[=!]=\s*None\b", "Low", "Quality", "Compare to None using 'is' / 'is not'."),
    ("py-debug-true", ("python",), r"\bdebug\s*=\s*True", "Medium", "Security", "Debug mode enabled."),
    ("js-eval", JS, r"(^|[^\w.])eval\s*\(|new\s+Function\s*\(", "High", "Security", "eval()/new Function() executes dynamic code."),
    ("js-innerhtml", JS, r"\.innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(", "Medium", "Security", "Writing raw HTML can introduce cross-site scripting (XSS)."),
    ("js-reflected-html", JS, r"res\.send\(\s*[\"'`]<.*(\+|\$\{)", "High", "Security", "HTML response built from concatenated values may reflect user input (XSS)."),
    ("js-console", JS, r"\bconsole\.(log|debug)\s*\(", "Info", "Quality", "console logging left in code."),
    ("java-empty-catch", ("java",), r"catch\s*\([^)]*\)\s*\{\s*\}", "Medium", "Bug", "Empty catch block silently swallows exceptions."),
    ("java-print-stack", ("java",), r"\.printStackTrace\s*\(", "Low", "Quality", "printStackTrace() instead of structured logging."),
    ("java-string-eq", ("java",), r"\w+\s*==\s*\"[^\"]*\"|\"[^\"]*\"\s*==\s*\w+", "Medium", "Bug", "Strings compared with == compare references, use equals()."),
    ("java-runtime-exec", ("java",), r"Runtime\.getRuntime\(\)\.exec\s*\(", "High", "Security", "Runtime.exec() may allow command injection."),
    ("java-deserialize", ("java",), r"\bObjectInputStream\b", "Medium", "Security", "Java deserialization of untrusted data is dangerous."),
    ("java-weak-random", ("java",), r"new\s+Random\s*\(", "Low", "Security", "java.util.Random is not cryptographically secure."),
    ("c-gets", CF, r"\bgets\s*\(", "Critical", "Security", "gets() cannot limit input length and always risks buffer overflow."),
    ("c-strcpy", CF, r"\b(strcpy|strcat)\s*\(", "High", "Security", "strcpy()/strcat() do not check destination size (buffer overflow)."),
    ("c-sprintf", CF, r"\bsprintf\s*\(", "Medium", "Security", "sprintf() has no bounds check; use snprintf()."),
    ("c-scanf-s", CF, r"scanf\s*\(\s*\"[^\"]*%s", "High", "Security", "scanf %s without width limit can overflow the buffer."),
    ("c-system", CF, r"\bsystem\s*\(", "High", "Security", "system() executes shell commands."),
    ("c-rand", CF, r"\brand\s*\(\s*\)", "Low", "Security", "rand() is predictable and not suitable for security purposes."),
    ("cpp-using-std", ("cpp",), r"using\s+namespace\s+std\s*;", "Low", "Quality", "'using namespace std' pollutes the global namespace."),
    ("cpp-raw-new", ("cpp",), r"=\s*new\s+\w+(\[[^\]]*\])?\s*;", "Low", "Maintainability", "Raw new: prefer smart pointers or containers to avoid leaks."),
    ("c-malloc-cast", ("cpp",), r"\(\s*\w+\s*\*\s*\)\s*malloc\s*\(", "Low", "Quality", "malloc() in C++; prefer new/containers/smart pointers."),
    ("c-off-by-one", CF, r"for\s*\([^;]*;\s*\w+\s*<=\s*\w+(\.size\(\)|\.length)", "High", "Bug", "Loop condition uses <= with size(): likely off-by-one out-of-bounds access."),
    ("sql-select-star", ("sql",), r"(?i)\bSELECT\s+\*", "Low", "Performance", "SELECT * fetches unnecessary columns."),
    ("sql-no-where", ("sql",), r"(?i)^\s*(DELETE\s+FROM\s+\w+|UPDATE\s+\w+\s+SET\s[^;]*?)\s*;?\s*$", "Medium", "Bug", "DELETE/UPDATE without a WHERE clause affects every row."),
    ("sql-grant-all", ("sql",), r"(?i)\bGRANT\s+ALL\b", "Medium", "Security", "GRANT ALL violates least privilege."),
    ("html-inline-handler", ("html",), r"(?i)\son(click|load|error|mouseover)\s*=", "Low", "Security", "Inline event handlers hinder Content-Security-Policy."),
    ("html-http-script", ("html",), r"(?i)<script[^>]+src=[\"']http://", "Medium", "Security", "Script loaded over insecure HTTP."),
    ("html-img-alt", ("html",), r"(?i)<img(?![^>]*\balt=)[^>]*>", "Low", "Accessibility", "<img> without alt attribute."),
    ("html-blank-rel", ("html",), r"(?i)target=[\"']_blank[\"'](?![^>]*rel=)", "Low", "Security", "target=_blank without rel=noopener."),
    ("css-important", ("css",), r"!important", "Low", "Maintainability", "!important makes styles harder to override and maintain."),
]
# Python rules that ruff/AST already cover well (bare except, mutable defaults) live in python_analyzer.
# JS rules covered by ESLint (var, ==) are applied here only when ESLint is not available.
JS_FALLBACK_RULES = [
    ("js-loose-eq", JS, r"[^=!<>]==[^=]|!=[^=]", "Low", "Quality", "Loose equality (==/!=) performs type coercion; prefer ===/!==."),
    ("js-var", JS, r"^\s*var\s+\w+", "Low", "Quality", "Prefer const/let over var."),
]

_COMPILED = [(i, l, re.compile(p), s, c, m) for i, l, p, s, c, m in RULES]
_JS_COMPILED = [(i, l, re.compile(p), s, c, m) for i, l, p, s, c, m in JS_FALLBACK_RULES]

COMMENT_PREFIX = {
    "python": r"^\s*#", "java": r"^\s*(//|/\*|\*)", "c": r"^\s*(//|/\*|\*)", "cpp": r"^\s*(//|/\*|\*)",
    "javascript": r"^\s*(//|/\*|\*)", "typescript": r"^\s*(//|/\*|\*)", "html": r"^\s*<!--",
    "css": r"^\s*(/\*|\*)", "sql": r"^\s*(--|/\*|\*)",
}


def _is_comment(line: str, language: str) -> bool:
    return re.match(COMMENT_PREFIX[language], line) is not None


def pattern_scan(code: str, language: str, include_js_fallback: bool = False) -> tuple[list[StaticFinding], ToolStatus]:
    findings: list[StaticFinding] = []
    rules = list(_COMPILED) + (list(_JS_COMPILED) if include_js_fallback else [])
    for idx, line in enumerate(code.split("\n")):
        comment = _is_comment(line, language)
        if comment:
            if re.search(r"\b(TODO|FIXME|HACK|XXX)\b", line):
                findings.append(StaticFinding(tool="pattern-scan", rule="todo-marker", message="Unresolved TODO/FIXME marker.", severity="Info", category="Maintainability", line=idx + 1))
            continue
        for rid, langs, rx, sev, cat, msg in rules:
            if langs is not None and language not in langs:
                continue
            if rx.search(line):
                findings.append(StaticFinding(tool="pattern-scan", rule=rid, message=msg, severity=sev, category=cat, line=idx + 1))  # type: ignore[arg-type]
    status = ToolStatus(tool="pattern-scan", status="ok", detail="Built-in rule-based scanner", findings=len(findings))
    return findings, status


_FUNC_PATTERNS = {
    "javascript": r"\bfunction\s+\w*\s*\(|=>\s*[{(]|^\s*(async\s+)?\w+\s*\([^)]*\)\s*\{",
    "typescript": r"\bfunction\s+\w*\s*\(|=>\s*[{(]|^\s*(async\s+)?\w+\s*\([^)]*\)\s*(:\s*[\w<>\[\]|]+\s*)?\{",
    "java": r"^\s*(public|private|protected)\s+(static\s+)?[\w<>\[\],\s]+\s+\w+\s*\([^)]*\)\s*(throws\s+[\w,\s]+)?\{",
    "c": r"^[\w*\s]+\s+\**\w+\s*\([^;)]*\)\s*\{",
    "cpp": r"^[\w:<>*&\s]+\s+[*&]*\w+\s*\([^;)]*\)\s*(const\s*)?\{",
    "python": r"^\s*(async\s+)?def\s+\w+",
}


def _max_nesting(lines: list[str], language: str) -> int:
    if language == "python":
        best = 0
        for line in lines:
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            indent = len(line) - len(line.lstrip(" \t"))
            indent = len(line[:indent].replace("\t", "    "))
            best = max(best, indent // 4)
        return best
    depth = best = 0
    for line in lines:
        for ch in line:
            if ch == "{":
                depth += 1
                best = max(best, depth)
            elif ch == "}":
                depth = max(0, depth - 1)
    return best


def heuristic_metrics(code: str, language: str) -> StaticMetrics:
    lines = code.split("\n")
    blank = sum(1 for l in lines if not l.strip())
    comment = sum(1 for l in lines if _is_comment(l, language))
    pat = _FUNC_PATTERNS.get(language)
    funcs = len(re.findall(pat, code, flags=re.M)) if pat else None
    decisions = len(re.findall(r"\b(if|elif|else if|for|while|case|catch|except|and|or)\b|&&|\|\||\?[^?.]", code))
    return StaticMetrics(
        total_lines=len(lines),
        code_lines=max(0, len(lines) - blank - comment),
        comment_lines=comment,
        blank_lines=blank,
        function_count=funcs,
        max_nesting_depth=_max_nesting(lines, language),
        cyclomatic_complexity=None if language in ("html", "css") else decisions + 1,
        source="heuristic",
    )
