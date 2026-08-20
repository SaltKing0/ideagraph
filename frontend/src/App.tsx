import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import IdeaList from "./components/IdeaList";
import GraphView from "./components/GraphView";
import Timeline from "./components/Timeline";

type View = "dashboard" | "ideas" | "graph" | "timeline";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex-1 bg-surface w-[240px] max-w-[80vw]">
            <Sidebar
              view={view}
              setView={(v) => {
                setView(v);
                setMobileOpen(false);
              }}
              collapsed={false}
              setCollapsed={() => {}}
            />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden h-14 bg-surface border-b border-border flex items-center px-4 gap-3 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-zinc-300">
            ☰
          </button>
          <div className="font-semibold">IdeaGraph</div>
          <div className="ml-auto text-xs text-muted">MVP</div>
        </header>

        <main className="flex-1 overflow-auto">
          {view === "dashboard" && <Dashboard onSelectTag={(tag) => {
            // could navigate to ideas with filter; for MVP just switch view
            // we leave simple: set view ideas and could pass via query param later
            console.log("select tag", tag);
            setView("ideas");
          }} />}
          {view === "ideas" && <IdeaList />}
          {view === "graph" && <GraphView />}
          {view === "timeline" && <Timeline />}
        </main>

        <footer className="border-t border-border bg-surface/50 px-6 py-3 text-xs text-muted flex justify-between">
          <span>IdeaGraph MVP · FastAPI + React + D3 · Dunkles Theme</span>
          <span className="hidden sm:inline">API: {window.location.hostname === "localhost" ? "localhost:8000 (proxy)" : "/api"}</span>
        </footer>
      </div>
    </div>
  );
}
