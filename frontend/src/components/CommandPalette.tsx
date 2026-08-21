import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { Idea } from "../types";

type View = "dashboard" | "ideas" | "graph" | "timeline";

interface Cmd {
  id: string;
  label: string;
  sub: string;
  icon: string;
  run: () => void;
}

const BASE_COMMANDS: Omit<Cmd, "run">[] = [
  { id: "c-dash", label: "Dashboard", sub: "Übersicht", icon: "▦" },
  { id: "c-ideas", label: "Ideen", sub: "Capture & Liste", icon: "◈" },
  { id: "c-graph", label: "Graph", sub: "Netzwerk", icon: "⬢" },
  { id: "c-timeline", label: "Zeitleiste", sub: "Chronologie", icon: "◐" },
];

type Item =
  | { key: string; kind: "cmd"; cmd: Cmd }
  | { key: string; kind: "idea"; idea: Idea };

export default function CommandPalette({
  open,
  onClose,
  onJumpToIdea,
  onCommand,
}: {
  open: boolean;
  onClose: () => void;
  onJumpToIdea: (id: number) => void;
  onCommand: (view: View) => void;
}) {
  const [q, setQ] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // reset + refocus each time it opens
  useEffect(() => {
    if (open) {
      setQ("");
      setIdeas([]);
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // debounced idea search via existing /ideas?q= API
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = q.trim() ? await api.listIdeas(q) : [];
        const ql = q.trim().toLowerCase();
        const rank = (i: Idea) => {
          if (!ql) return 0;
          const t = i.title.toLowerCase();
          if (t.startsWith(ql)) return 0;
          if (t.includes(ql)) return 1;
          if (i.tags.some((tag) => tag.toLowerCase().includes(ql))) return 2;
          if ((i.source || "").toLowerCase().includes(ql)) return 3;
          return 4;
        };
        setIdeas([...res].sort((a, b) => rank(a) - rank(b)));
      } catch {
        setIdeas([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [open, q]);

  const commands: Cmd[] = useMemo(
    () =>
      BASE_COMMANDS.map((c) => ({
        ...c,
        run: () => onCommand(c.id.replace("c-", "") as View),
      })),
    [onCommand]
  );

  const filteredCommands = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return commands;
    return commands.filter((c) => `${c.label} ${c.sub}`.toLowerCase().includes(ql));
  }, [commands, q]);

  const items: Item[] = useMemo(() => {
    const list: Item[] = filteredCommands.map((cmd) => ({ key: cmd.id, kind: "cmd", cmd }));
    ideas.forEach((idea) => list.push({ key: `idea-${idea.id}`, kind: "idea", idea }));
    return list;
  }, [filteredCommands, ideas]);

  // keep active index within range when the list changes
  useEffect(() => {
    setActive((a) => (items.length ? Math.min(a, items.length - 1) : 0));
  }, [items.length]);

  const choose = (item: Item) => {
    if (item.kind === "cmd") item.cmd.run();
    else onJumpToIdea(item.idea.id);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (items.length ? (a + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (items.length ? (a - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) choose(items[active]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        onKeyDown={onKeyDown}
        className="relative w-full max-w-[580px] bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60">
          <span className="text-muted text-base">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche Ideen oder springe zu einer Ansicht…"
            className="flex-1 bg-transparent outline-none text-[14px] text-heading placeholder:text-muted/50"
          />
          <span className="text-[10px] font-medium text-muted bg-white/[0.05] border border-white/[0.06] px-2 py-1 rounded-md">Esc</span>
        </div>

        {/* Results */}
        <div className="max-h-[46vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-muted">
              {loading ? "Suche…" : q.trim() ? "Keine Treffer" : "Tippe, um Ideen zu durchsuchen"}
            </div>
          )}

          {items.length > 0 && (
            <div className="mb-1 px-2 pt-1 text-[11px] font-medium tracking-widest uppercase text-muted/60">
              {q.trim() ? "Ergebnisse" : "Navigation"}
            </div>
          )}

          {items.map((item, idx) => {
            const isActive = idx === active;
            const activeCls = isActive ? "bg-accent/15 border-accent/30" : "border-transparent";
            return (
              <button
                key={item.key}
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border transition ${activeCls} ${isActive ? "bg-accent/15" : "hover:bg-white/[0.04]"}`}
              >
                <span
                  className={`w-8 h-8 grid place-items-center rounded-lg text-[13px] shrink-0 ${
                    isActive ? "bg-accent text-white shadow-glow" : "bg-card border border-border text-muted"
                  }`}
                >
                  {item.kind === "cmd" ? item.cmd.icon : "◈"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-heading leading-tight truncate">
                    {item.kind === "cmd" ? item.cmd.label : item.idea.title}
                  </span>
                  <span className="block text-[11px] text-muted leading-tight mt-0.5 truncate">
                    {item.kind === "cmd"
                      ? item.cmd.sub
                      : (item.idea.tags.length ? item.idea.tags.map((t) => `#${t}`).join(" ") : "ohne Tags") +
                        (item.idea.source ? `  •  ${item.idea.source}` : "")}
                  </span>
                </span>
                <span className={`text-[11px] text-muted/60 shrink-0 ${isActive ? "text-accent" : ""}`}>
                  {item.kind === "cmd" ? "↗" : "↵"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border/60 text-[11px] text-muted/70">
          <span className="flex items-center gap-1"><span className="text-accent">↑↓</span> navigieren</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1"><span className="text-accent">↵</span> öffnen</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1"><span className="text-accent">esc</span> schließen</span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] font-mono">⌘K</kbd>
            jederzeit
          </span>
        </div>
      </div>
    </div>
  );
}
