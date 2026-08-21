import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Idea } from "../types";
import IdeaForm from "./IdeaForm";
import ConnectionForm from "./ConnectionForm";

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 w-2/3 bg-border/60 rounded" />
      <div className="h-3 w-full bg-border/40 rounded mt-3" />
      <div className="h-3 w-5/6 bg-border/30 rounded mt-2" />
    </div>
  );
}

export default function IdeaList({
  focusId,
  onFocusHandled,
}: {
  focusId?: number | null;
  onFocusHandled?: () => void;
}) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [editing, setEditing] = useState<Idea | null>(null);
  const [selected, setSelected] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [is, conns] = await Promise.all([api.listIdeas(), api.listConnections()]);
      setIdeas(is);
      setConnections(conns);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // jump-to-idea from the global ⌘K command palette: open its detail sheet
  useEffect(() => {
    if (focusId != null) {
      const idea = ideas.find((i) => i.id === focusId);
      if (idea) {
        setSelected(idea);
        onFocusHandled?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, ideas]);

  // close the detail modal with Escape
  useEffect(() => {
    if (!selected) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const createIdea = async (data: any) => {
    await api.createIdea(data);
    await fetchAll();
    showToast("Idee erstellt");
  };
  const updateIdea = async (data: any) => {
    if (!editing) return;
    await api.updateIdea(editing.id, data);
    setEditing(null);
    await fetchAll();
    showToast("Idee aktualisiert");
  };
  const delIdea = async (id: number) => {
    if (!confirm("Idee wirklich löschen? Verbindungen werden ebenfalls gelöscht.")) return;
    await api.deleteIdea(id);
    setSelected(null);
    await fetchAll();
    showToast("Idee gelöscht");
  };
  const delConn = async (id: number) => {
    await api.deleteConnection(id);
    await fetchAll();
    showToast("Verbindung entfernt");
  };

  const allTags = useMemo(() => {
    const s = new Set<string>();
    ideas.forEach((i) => i.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [ideas]);

  const filtered = ideas.filter((i) => {
    if (filterTag && !i.tags.includes(filterTag)) return false;
    if (q) {
      const hay = `${i.title} ${i.description || ""} ${i.tags.join(" ")} ${i.source || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const related = selected ? connections.filter((c) => c.source_id === selected.id || c.target_id === selected.id) : [];

  if (loading)
    return (
      <div className="p-6 md:p-10 space-y-4">
        <div className="h-8 w-40 bg-border/60 rounded-xl animate-skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  if (error) return <div className="p-8 text-red-400">Fehler: {error}</div>;

  return (
    <div className="p-6 md:p-10 animate-fade-in">
      {/* Header – Linear style */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-muted border border-border rounded-full px-3 py-1 bg-surface">
            Collection • {ideas.length} Ideen
          </div>
          <h1 className="mt-4 text-[30px] md:text-[32px] font-semibold tracking-[-0.03em] text-heading leading-none">Ideen</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted max-w-xl">
            Capture, Suche und Verknüpfung — {filtered.length} von {ideas.length} angezeigt • Notion-inspiriert
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suche Titel, Beschreibung, Tags…"
              className="h-9 w-[280px] bg-surface border border-border rounded-xl pl-9 pr-3 text-[13px] text-heading placeholder:text-muted/60 focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 transition"
            />
          </div>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="h-9 bg-surface border border-border rounded-xl px-3 text-[13px] text-heading focus:outline-none focus:border-accent/40 transition"
          >
            <option value="">Alle Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          {editing ? (
            <IdeaForm key={`edit-${editing.id}`} initial={editing} onSubmit={updateIdea} onCancel={() => setEditing(null)} />
          ) : (
            <IdeaForm key="new" onSubmit={createIdea} />
          )}
          <ConnectionForm ideas={ideas} onCreated={fetchAll} preselectedSource={selected?.id} />
          {related.length > 0 && selected && (
            <div className="card p-5">
              <h3 className="text-[11px] font-medium tracking-widest uppercase text-muted mb-3">Verbindungen • {selected.title}</h3>
              <ul className="space-y-2">
                {related.map((c) => {
                  const otherId = c.source_id === selected.id ? c.target_id : c.source_id;
                  const other = ideas.find((i) => i.id === otherId);
                  const dir = c.source_id === selected.id ? "→" : "←";
                  return (
                    <li key={c.id} className="flex items-center justify-between rounded-xl bg-bg border border-border px-3 py-2.5 text-[13px] group">
                      <span className="truncate pr-2">
                        <span className="font-medium text-accent">{c.type}</span> <span className="text-muted">{dir}</span>{" "}
                        <span className="text-heading">{other?.title || `#${otherId}`}</span>
                        {c.label && <span className="text-muted text-xs ml-2">({c.label})</span>}
                      </span>
                      <button onClick={() => delConn(c.id)} className="w-7 h-7 grid place-items-center rounded-lg bg-surface border border-border text-muted hover:text-red-400 hover:border-red-500/20 transition shrink-0">
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right – List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card p-12 text-center border-dashed">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-border grid place-items-center mx-auto text-muted">◈</div>
              <div className="mt-4 text-[14px] font-semibold text-heading">Keine Ideen gefunden</div>
              <div className="mt-1 text-[13px] text-muted">Erstelle deine erste Idee oder passe Filter an.</div>
            </div>
          ) : (
            filtered.map((idea) => (
              <div
                key={idea.id}
                onClick={() => setSelected(idea)}
                className={`group card card-hover p-5 cursor-pointer transition duration-200 ${
                  selected?.id === idea.id ? "border-accent/40 ring-1 ring-accent/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-bg border border-border grid place-items-center text-[11px] font-bold text-muted group-hover:text-heading transition">
                        {idea.title.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="text-[14px] font-semibold tracking-tight text-heading truncate group-hover:text-accent transition duration-200">
                        {idea.title}
                      </div>
                      <span className="hidden sm:inline text-[11px] text-muted border border-border rounded-full px-2 py-0.5 bg-bg">
                        {new Date(idea.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                    {idea.description && <div className="mt-2 text-[13px] leading-relaxed text-muted line-clamp-2">{idea.description}</div>}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {idea.tags.map((t) => (
                        <span key={t} className="text-[11px] font-medium bg-bg border border-border px-2.5 py-1 rounded-full text-muted hover:text-heading transition">
                          #{t}
                        </span>
                      ))}
                      {idea.tags.length === 0 && <span className="text-[11px] text-muted/60">ohne Tags</span>}
                    </div>
                    {idea.source && <div className="mt-2 text-[11px] text-muted/70">↗ {idea.source}</div>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition duration-200" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditing(idea)}
                      className="h-7 px-3 rounded-lg bg-surface border border-border text-[12px] font-medium text-muted hover:text-heading hover:bg-white/[0.06] transition"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => delIdea(idea.id)}
                      className="h-7 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] font-medium text-red-300 hover:bg-red-500/15 transition"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-heading text-bg px-4 py-2.5 rounded-full text-[13px] font-medium shadow-2xl flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent text-white grid place-items-center text-xs">✓</span>
            {toast}
          </div>
        </div>
      )}

      {/* Detail – Premium modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-bg/70 backdrop-blur-xl" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[560px] max-h-[86vh] overflow-auto card p-6 md:p-7 animate-slide-up border-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent2 grid place-items-center text-white font-semibold shadow-glow shrink-0">
                {selected.title.slice(0, 1).toUpperCase()}
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 grid place-items-center rounded-xl bg-surface border border-border text-muted hover:text-heading transition">
                ×
              </button>
            </div>
            <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-heading leading-tight">{selected.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="px-2.5 py-1 rounded-full bg-surface border border-border">
                {new Date(selected.created_at).toLocaleString("de-DE")}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface border border-border">ID #{selected.id}</span>
            </div>
            {selected.description && <p className="mt-5 text-[14px] leading-relaxed text-muted whitespace-pre-wrap">{selected.description}</p>}
            {selected.source && (
              <div className="mt-4 text-[13px] px-3 py-2 rounded-xl bg-bg border border-border">
                <span className="text-muted">Quelle</span> <span className="text-heading ml-2">{selected.source}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {selected.tags.map((t) => (
                <span key={t} className="text-[12px] font-medium bg-accentSoft border border-accent/20 text-accent px-3 py-1 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setEditing(selected);
                  setSelected(null);
                }}
                className="flex-1 h-10 rounded-xl bg-surface border border-border text-[13px] font-medium text-heading hover:bg-white/[0.06] transition"
              >
                Bearbeiten
              </button>
              <button onClick={() => delIdea(selected.id)} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 transition">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
