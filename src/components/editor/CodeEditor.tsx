"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { Issue } from "@/types/review";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <EditorLoading />,
});

type Monaco = Parameters<BeforeMount>[0];
type StandaloneEditor = Parameters<OnMount>[0];

export interface CodeEditorHandle {
  goToLine: (line: number) => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  monacoLanguage: string;
  issues: Issue[];
  fontSize: number;
  wordWrap: boolean;
  onRun?: () => void;
}

function EditorLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-canvas text-xs text-subtle">
      <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      Loading editor…
    </div>
  );
}

const sevClass = (s: string) => s.toLowerCase();

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { value, onChange, monacoLanguage, issues, fontSize, wordWrap, onRun },
  ref,
) {
  const editorRef = useRef<StandaloneEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorations = useRef<ReturnType<StandaloneEditor["createDecorationsCollection"]> | null>(null);
  const flash = useRef<ReturnType<StandaloneEditor["createDecorationsCollection"]> | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [failed, setFailed] = useState(false);
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(() => {
    const read = () => setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Detect Monaco failing to load (e.g. CDN blocked) and fall back to a plain editor.
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled && !editorRef.current) setFailed(true);
    }, 15000);
    loader.init().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const goToLine = useCallback((line: number) => {
    const ed = editorRef.current;
    if (!ed) return;
    const total = ed.getModel()?.getLineCount() ?? 1;
    const target = Math.max(1, Math.min(line, total));
    ed.revealLineInCenter(target);
    ed.setPosition({ lineNumber: target, column: 1 });
    ed.focus();
    flash.current?.clear();
    flash.current = ed.createDecorationsCollection([
      {
        range: { startLineNumber: target, startColumn: 1, endLineNumber: target, endColumn: 1 },
        options: { isWholeLine: true, className: "cl-line-flash" },
      },
    ]);
    setTimeout(() => flash.current?.clear(), 1400);
  }, []);

  useImperativeHandle(ref, () => ({ goToLine, focus: () => editorRef.current?.focus() }), [goToLine]);

  // Highlight issue lines
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const total = ed.getModel()?.getLineCount() ?? 0;
    const decs = issues
      .filter((i) => i.line !== null && i.line >= 1 && i.line <= total)
      .map((i) => ({
        range: { startLineNumber: i.line as number, startColumn: 1, endLineNumber: i.line as number, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: `cl-line-${sevClass(i.severity)}`,
          linesDecorationsClassName: `cl-glyph-${sevClass(i.severity)}`,
          hoverMessage: { value: `**${i.severity}** · ${i.title}` },
        },
      }));
    decorations.current?.clear();
    decorations.current = ed.createDecorationsCollection(decs);
  }, [issues, value]);

  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme("codelens-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#09090b",
        "editor.lineHighlightBackground": "#14141a",
        "editorLineNumber.foreground": "#4b4b5a",
        "editorLineNumber.activeForeground": "#9a9aab",
        "editorGutter.background": "#09090b",
        "editor.selectionBackground": "#7c6cff40",
        "editorCursor.foreground": "#9488ff",
        "editorIndentGuide.background1": "#1c1c24",
        "scrollbarSlider.background": "#32323e80",
      },
    });
    monaco.editor.defineTheme("codelens-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
        "editor.lineHighlightBackground": "#f4f4f8",
        "editorLineNumber.foreground": "#a0a0b0",
        "editorGutter.background": "#ffffff",
      },
    });
  };

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
    setFailed(false);
  };

  if (failed) {
    return (
      <div className="flex h-full flex-col bg-canvas">
        <p className="border-b border-warning/30 bg-warning/5 px-3 py-1.5 text-[11px] text-warning">
          The Monaco editor could not be loaded (network blocked?). Using a basic editor — analysis still works.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Source code"
          className="min-h-0 flex-1 resize-none bg-canvas p-3 font-mono text-[13px] leading-6 text-fg outline-none"
          style={{ fontSize }}
        />
      </div>
    );
  }

  return (
    <MonacoEditor
      height="100%"
      language={monacoLanguage}
      value={value}
      theme={isDark ? "codelens-dark" : "codelens-light"}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(v) => onChange(v ?? "")}
      options={{
        fontSize,
        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: wordWrap ? "on" : "off",
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorSmoothCaretAnimation: "on",
        tabSize: 4,
        bracketPairColorization: { enabled: true },
        ariaLabel: "Source code editor",
        overviewRulerBorder: false,
      }}
    />
  );
});
