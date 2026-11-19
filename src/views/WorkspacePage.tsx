"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Menu, PanelRight, UploadCloud } from "lucide-react";
import type { HistoryEntry, LanguageId, ReviewMode } from "@/types/review";
import { api, ApiClientError } from "@/services/api";
import { useHistory } from "@/hooks/useHistory";
import { useToast } from "@/components/ui/Toast";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { WorkspaceSidebar, type EditorSettings } from "@/components/layout/WorkspaceSidebar";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/CodeEditor";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { ResultsPanel, type AnalysisState } from "@/components/review/ResultsPanel";
import { detectLanguage, getLanguage, languageFromFilename } from "@/utils/languages";
import { SAMPLES, type Sample } from "@/utils/samples";

const DRAFT_KEY = "codelens-draft-v1";
const MAX_CHARS = 60_000;
const MAX_UPLOAD_BYTES = 300_000;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function WorkspacePage() {
  const { toast } = useToast();
  const history = useHistory();
  const addHistory = history.add;
  const inFlight = useRef(false);
  const editorRef = useRef<CodeEditorHandle>(null);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<LanguageId>("python");
  const [autoDetected, setAutoDetected] = useState(false);
  const [mode, setMode] = useState<ReviewMode>("full");
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<EditorSettings>({ fontSize: 13, wordWrap: false, autoDetect: true });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(470);
  const [expanded, setExpanded] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "results">("editor");
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  // restore draft
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft) as { code: string; language: LanguageId };
        setCode(parsed.code);
        setLanguage(parsed.language);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // persist draft
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ code, language }));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [code, language]);

  // auto-detect language (debounced)
  useEffect(() => {
    if (!settings.autoDetect || code.trim().length < 20) return;
    const t = setTimeout(() => {
      const detected = detectLanguage(code);
      if (detected && detected !== language) {
        setLanguage(detected);
        setAutoDetected(true);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [code, settings.autoDetect, language]);

  // open a saved review from ?review=<id>
  useEffect(() => {
    if (!history.loaded) return;
    const id = new URLSearchParams(window.location.search).get("review");
    if (!id) return;
    const entry = history.entries.find((e) => e.id === id);
    if (entry) openEntry(entry);
    window.history.replaceState(null, "", "/workspace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.loaded]);

  function openEntry(e: HistoryEntry) {
    setCode(e.code);
    setLanguage(e.language);
    setAutoDetected(false);
    setActiveId(e.id);
    setState({ status: "success", review: e.review, analyzedCode: e.code, language: e.language });
    setPanelOpen(true);
    setMobileSidebar(false);
  }

  const analyze = useCallback(async () => {
    if (state.status === "loading" || inFlight.current) return;
    if (!code.trim()) {
      toast("The editor is empty. Paste some code or load a sample first.", "error");
      return;
    }
    if (code.length > MAX_CHARS) {
      toast(`Code is too large (${code.length.toLocaleString()} chars). Limit is ${MAX_CHARS.toLocaleString()}.`, "error");
      return;
    }
    const snapshot = code;
    const lang = language;
    setPanelOpen(true);
    setMobileView("results");
    inFlight.current = true;
    setState({ status: "loading" });
    try {
      const review = await api.review({ code: snapshot, language: lang, review_mode: mode });
      setState({ status: "success", review, analyzedCode: snapshot, language: lang });
      setActiveId(review.id);
      addHistory(snapshot, lang, review);
      toast(`Review complete: ${review.issues.length} issue${review.issues.length === 1 ? "" : "s"} found`, "success");
    } catch (e) {
      const err = e instanceof ApiClientError ? e : new ApiClientError("unknown", "An unexpected error occurred.", null);
      setState({ status: "error", code: err.code, message: err.message });
      toast(err.message, "error");
    } finally {
      inFlight.current = false;
    }
  }, [code, language, mode, state.status, toast, addHistory]);

  // Ctrl/Cmd + Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void analyze();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analyze]);

  async function handleFile(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast("File is too large. Maximum upload size is 300 KB.", "error");
      return;
    }
    try {
      const text = await file.text();
      if (text.includes("\u0000")) {
        toast("This looks like a binary file and cannot be analyzed.", "error");
        return;
      }
      setCode(text);
      const lang = languageFromFilename(file.name) ?? detectLanguage(text);
      if (lang) {
        setLanguage(lang);
        setAutoDetected(false);
      } else toast("Could not determine the language. Please select it manually.", "info");
      setState({ status: "idle" });
      setActiveId(null);
      toast(`Loaded ${file.name}`, "success");
    } catch {
      toast("Could not read that file.", "error");
    }
  }

  function loadSample(s: Sample) {
    setCode(s.code);
    setLanguage(s.language);
    setAutoDetected(false);
    setState({ status: "idle" });
    setActiveId(null);
    toast(`Loaded sample: ${s.label}`, "info");
  }

  function newReview() {
    setCode("");
    setState({ status: "idle" });
    setActiveId(null);
    setAutoDetected(false);
    setMobileSidebar(false);
    editorRef.current?.focus();
  }

  function goToLine(line: number) {
    setMobileView("editor");
    setTimeout(() => editorRef.current?.goToLine(line), 60);
  }

  function replaceCode(next: string) {
    setCode(next);
    setMobileView("editor");
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidth;
    setDragging(true);
    setExpanded(false);
    const move = (ev: PointerEvent) => setPanelWidth(clamp(startW - (ev.clientX - startX), 340, window.innerWidth * 0.7));
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const issues = useMemo(() => (state.status === "success" ? state.review.issues : []), [state]);
  const lineCount = code ? code.split("\n").length : 0;
  const langInfo = getLanguage(language);
  const effectiveWidth = expanded ? "min(62vw, 900px)" : `${panelWidth}px`;

  const sidebar = (onClose?: () => void) => (
    <WorkspaceSidebar
      entries={history.entries}
      activeId={activeId}
      onNew={newReview}
      onOpen={openEntry}
      onRemove={history.remove}
      settings={settings}
      onSettings={setSettings}
      onClose={onClose}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      {/* top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
        <button
          className="rounded-md p-1.5 text-muted hover:bg-panel2 hover:text-fg"
          aria-label="Toggle sidebar"
          onClick={() => (window.innerWidth < 1024 ? setMobileSidebar(true) : setSidebarOpen((o) => !o))}
        >
          <Menu className="h-4 w-4" />
        </button>
        <Logo href="/" />
        <span className="hidden items-center gap-2 text-xs text-subtle sm:flex">
          <span className="text-line-strong">/</span>
          <Link href="/workspace" className="text-muted hover:text-fg">
            workspace
          </Link>
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/history" className="hidden rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-panel2 hover:text-fg sm:block">
            History
          </Link>
          <ThemeToggle />
          <button
            onClick={() => setPanelOpen((o) => !o)}
            aria-label="Toggle analysis panel"
            aria-pressed={panelOpen}
            className={`hidden rounded-md p-1.5 transition lg:block ${panelOpen ? "bg-panel3 text-fg" : "text-muted hover:bg-panel2 hover:text-fg"}`}
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* desktop sidebar */}
        {sidebarOpen && <div className="hidden lg:block">{sidebar()}</div>}
        {/* mobile sidebar drawer */}
        {mobileSidebar && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="h-full">{sidebar(() => setMobileSidebar(false))}</div>
            <button className="flex-1 bg-black/60" aria-label="Close sidebar" onClick={() => setMobileSidebar(false)} />
          </div>
        )}

        {/* mobile view switch */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 gap-1 border-b border-line bg-panel p-1.5 lg:hidden">
            {(["editor", "results"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMobileView(v)}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize ${mobileView === v ? "bg-panel3 text-fg" : "text-muted"}`}
              >
                {v === "results" ? "Analysis" : "Editor"}
                {v === "results" && issues.length > 0 && <span className="ml-1.5 rounded bg-accent/20 px-1.5 text-[10px] text-accentstrong">{issues.length}</span>}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1">
            {/* editor column */}
            <section
              className={`${mobileView === "editor" ? "flex" : "hidden"} min-w-0 flex-1 flex-col lg:flex`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
            >
              <EditorToolbar
                language={language}
                onLanguageChange={(l) => {
                  setLanguage(l);
                  setAutoDetected(false);
                }}
                mode={mode}
                onModeChange={setMode}
                autoDetected={autoDetected}
                onUpload={handleFile}
                onSample={loadSample}
                onClear={() => {
                  setCode("");
                  setState({ status: "idle" });
                  setActiveId(null);
                  toast("Editor cleared", "info");
                }}
                onAnalyze={analyze}
                analyzing={state.status === "loading"}
                canClear={code.length > 0}
              />
              <div className="relative min-h-0 flex-1">
                <CodeEditor
                  ref={editorRef}
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                  }}
                  monacoLanguage={langInfo.monaco}
                  issues={issues}
                  fontSize={settings.fontSize}
                  wordWrap={settings.wordWrap}
                  onRun={analyze}
                />
                {code.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="pointer-events-auto max-w-sm rounded-xl border border-line bg-panel/90 p-5 text-center backdrop-blur">
                      <UploadCloud className="mx-auto h-6 w-6 text-accentstrong" />
                      <p className="mt-3 text-sm font-medium">Paste code, drop a file, or try a sample</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        Samples contain realistic bugs and vulnerabilities so you can test the reviewer right away.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {SAMPLES.map((s) => (
                          <Button key={s.id} size="sm" onClick={() => loadSample(s)}>
                            {s.label.split(" — ")[0]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {dragOver && (
                  <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 text-sm font-medium text-accentstrong">
                    Drop a source file to load it
                  </div>
                )}
              </div>
              <div className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-panel px-3 text-[11px] text-subtle">
                <span>{langInfo.label}</span>
                <span>{lineCount} lines</span>
                <span>{code.length.toLocaleString()} chars</span>
                <span className="ml-auto hidden sm:inline">Code is analysed statically and never executed</span>
              </div>
            </section>

            {/* resizer */}
            {panelOpen && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize analysis panel"
                tabIndex={0}
                onPointerDown={startResize}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") setPanelWidth((w) => clamp(w + 24, 340, window.innerWidth * 0.7));
                  if (e.key === "ArrowRight") setPanelWidth((w) => clamp(w - 24, 340, window.innerWidth * 0.7));
                }}
                className={`hidden w-1 shrink-0 cursor-col-resize transition lg:block ${dragging ? "bg-accent" : "bg-line hover:bg-accent/70"}`}
              />
            )}

            {/* analysis panel */}
            {panelOpen && (
              <aside
                className={`${mobileView === "results" ? "block" : "hidden"} min-w-0 flex-1 lg:block lg:w-(--panel-w) lg:flex-none`}
                style={{ "--panel-w": effectiveWidth } as React.CSSProperties}
              >
                <ResultsPanel
                  state={state}
                  onAnalyze={analyze}
                  onGoToLine={goToLine}
                  onReplace={replaceCode}
                  expanded={expanded}
                  onToggleExpand={() => setExpanded((x) => !x)}
                />
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
