type View = "dashboard" | "ideas" | "graph" | "timeline";

export default function Sidebar({
  view,
  setView,
  collapsed,
  setCollapsed,
}: {
  view: View;
  setView: (v: View) => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
}) {
  const items: { id: View; label: string; icon: string; desc: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "◈", desc: "Übersicht" },
    { id: "ideas", label: "Ideen", icon: "◆", desc: "Liste & Suche" },
    { id: "graph", label: "Graph", icon: "⬢", desc: "Netzwerk" },
    { id: "timeline", label: "Zeitleiste", icon: "◐", desc: "Chronologie" },
  ];

  return (
    <aside
      className={`${
        collapsed ? "w-[64px]" : "w-[240px]"
      } shrink-0 bg-surface border-r border-border flex flex-col transition-all duration-200 h-screen sticky top-0`}
    >
      <div className="h-[64px] flex items-center gap-3 px-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center font-bold text-white shrink-0">
          I
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-semibold tracking-tight leading-none">IdeaGraph</div>
            <div className="text-xs text-muted">Ideen vernetzen</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-muted hover:text-white p-1"
          title="Toggle"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
              ${view === it.id ? "bg-card border border-border text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}
            `}
          >
            <span className="text-base w-6 text-center shrink-0">{it.icon}</span>
            {!collapsed && (
              <span className="text-left">
                <div className="font-medium leading-none">{it.label}</div>
                <div className="text-xs text-muted leading-none mt-1">{it.desc}</div>
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        {!collapsed ? (
          <div className="text-xs text-muted bg-card rounded-lg p-3 border border-border">
            <div className="font-medium text-zinc-300 mb-1">MVP Fokus</div>
            Tracke Ideen, entdecke Zusammenhänge.
          </div>
        ) : (
          <div className="w-8 h-8 rounded bg-card border border-border mx-auto" />
        )}
      </div>
    </aside>
  );
}
