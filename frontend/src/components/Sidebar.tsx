type View = "dashboard" | "ideas" | "graph" | "timeline";

const NAV: { id: View; label: string; desc: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", desc: "Übersicht", icon: "▦" },
  { id: "ideas", label: "Ideen", desc: "Capture & Suche", icon: "◈" },
  { id: "graph", label: "Graph", desc: "Netzwerk", icon: "⬢" },
  { id: "timeline", label: "Zeitleiste", desc: "Chronologie", icon: "◐" },
];

export default function Sidebar({
  view,
  setView,
  collapsed,
  setCollapsed,
  onOpenCommand,
}: {
  view: View;
  setView: (v: View) => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
  onOpenCommand?: () => void;
}) {
  return (
    <aside
      className={`${
        collapsed ? "w-[68px]" : "w-[280px]"
      } shrink-0 bg-bg border-r border-border flex flex-col h-screen sticky top-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]`}
    >
      {/* Header – Workspace */}
      <div className="h-[56px] flex items-center gap-3 px-3 border-b border-border/60 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white font-semibold text-[13px] tracking-tight shadow-glow shrink-0">
          ◐
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 animate-fade-in">
            <div className="text-[13px] font-semibold text-heading tracking-tight leading-none">IdeaGraph</div>
            <div className="text-[11px] text-muted/80 leading-none mt-1">workspace • SaaS</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-heading hover:bg-white/[0.06] transition"
          aria-label="Sidebar toggle"
        >
          <span className="text-sm">{collapsed ? "›" : "‹"}</span>
        </button>
      </div>

      {/* Search – opens the ⌘K command palette */}
      {!collapsed && (
        <div className="p-3">
          <button
            onClick={() => onOpenCommand?.()}
            className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg bg-surface border border-border text-[13px] text-muted hover:text-heading hover:border-white/10 transition cursor-pointer"
          >
            <span className="opacity-60">⌕</span>
            <span className="flex-1 text-left">Suchen…</span>
            <span className="text-[10px] bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 rounded">⌘ K</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-4 overflow-y-auto">
        <div>
          {!collapsed && <div className="px-2 mb-2 text-[11px] font-medium tracking-widest uppercase text-muted/60">Navigation</div>}
          <div className="space-y-0.5">
            {NAV.map((it) => {
              const active = view === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => setView(it.id)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] transition duration-200 group
                    ${active
                      ? "bg-white/[0.07] text-heading shadow-sm border border-white/[0.06]"
                      : "text-muted hover:text-heading hover:bg-white/[0.04] border border-transparent"
                    }`}
                >
                  <span
                    className={`w-7 h-7 grid place-items-center rounded-md text-[13px] shrink-0 transition
                      ${active ? "bg-accent text-white shadow-glow" : "bg-surface border border-border group-hover:border-white/10 text-muted group-hover:text-heading"}`}
                  >
                    {it.icon}
                  </span>
                  {!collapsed && (
                    <span className="text-left min-w-0 flex-1">
                      <span className="block font-[500] leading-none tracking-tight">{it.label}</span>
                      <span className={`block text-[11px] leading-none mt-1 ${active ? "text-white/60" : "text-muted/70"}`}>{it.desc}</span>
                    </span>
                  )}
                  {!collapsed && active && <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-glow shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {!collapsed && (
          <div className="pt-4 border-t border-border/60">
            <div className="px-2 mb-2 text-[11px] font-medium tracking-widest uppercase text-muted/60">Aktuell</div>
            <div className="rounded-xl bg-surface border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-medium text-heading">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                MVP aktiv
              </div>
              <p className="text-[12px] leading-relaxed text-muted">
                Premium-Feeling • Linear • Notion • Vercel inspiriert. Dunkles Theme #09090b.
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* Footer – User */}
      <div className="p-2 border-t border-border/60">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition cursor-default">
            <img src="https://i.pravatar.cc/100?img=32" alt="avatar" className="w-7 h-7 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-heading leading-none">Niklas</div>
              <div className="text-[11px] text-muted leading-none mt-1">pro • IdeaGraph</div>
            </div>
            <span className="text-muted text-xs">›</span>
          </div>
        ) : (
          <img src="https://i.pravatar.cc/100?img=32" alt="avatar" className="w-7 h-7 rounded-full mx-auto" />
        )}
      </div>
    </aside>
  );
}
