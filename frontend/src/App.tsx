import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import IdeaList from "./components/IdeaList";
import GraphView from "./components/GraphView";
import Timeline from "./components/Timeline";
import CommandPalette from "./components/CommandPalette";

type View = "dashboard" | "ideas" | "graph" | "timeline";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusIdea, setFocusIdea] = useState<number | null>(null);

  // global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const jumpToIdea = (id: number) => {
    setFocusIdea(id);
    setView("ideas");
  };

  return (
    <div className="min-h-screen bg-bg flex selection:bg-accent/30">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} onOpenCommand={() => setCommandOpen(true)} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-[280px] max-w-[84vw] bg-bg border-r border-border shadow-2xl animate-slide-up">
            <Sidebar
              view={view}
              setView={(v) => {
                setView(v);
                setMobileOpen(false);
              }}
              collapsed={false}
              setCollapsed={() => {}}
              onOpenCommand={() => {
                setMobileOpen(false);
                setCommandOpen(true);
              }}
            />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header – Linear compact */}
        <header className="md:hidden h-[52px] bg-bg/80 backdrop-blur-xl border-b border-border/60 flex items-center px-4 gap-3 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 grid place-items-center rounded-lg bg-surface border border-border text-heading"
          >
            ≡
          </button>
          <div className="font-semibold tracking-tight text-heading text-[14px]">IdeaGraph</div>
          <div className="ml-auto text-[11px] px-2 py-1 rounded-full bg-accent text-white font-medium">MVP • Premium</div>
        </header>

        {/* Main – max content width for readability */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1280px] mx-auto w-full">
            {view === "dashboard" && (
              <Dashboard
                onSelectTag={(tag) => {
                  console.log("select tag", tag);
                  setView("ideas");
                }}
              />
            )}
            {view === "ideas" && <IdeaList focusId={focusIdea} onFocusHandled={() => setFocusIdea(null)} />}
            {view === "graph" && <GraphView />}
            {view === "timeline" && <Timeline />}
          </div>
        </main>

        <footer className="border-t border-border/60 bg-bg px-6 py-3 text-[11px] tracking-wide text-muted flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            IdeaGraph • Premium SaaS • FastAPI • React • D3
          </span>
          <span className="hidden sm:inline opacity-60">
            {window.location.hostname === "localhost" ? "localhost:8000 proxy" : "prod"}
            {"  "}• Linear • Notion • Raycast
          </span>
        </footer>
      </div>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onJumpToIdea={jumpToIdea}
        onCommand={setView}
      />
    </div>
  );
}
