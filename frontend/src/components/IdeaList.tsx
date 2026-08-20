import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Idea } from "../types";
import IdeaForm from "./IdeaForm";
import ConnectionForm from "./ConnectionForm";

export default function IdeaList() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [editing, setEditing] = useState<Idea | null>(null);
  const [selected, setSelected] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const createIdea = async (data: any) => {
    await api.createIdea(data);
    await fetchAll();
  };
  const updateIdea = async (data: any) => {
    if (!editing) return;
    await api.updateIdea(editing.id, data);
    setEditing(null);
    await fetchAll();
  };
  const delIdea = async (id: number) => {
    if (!confirm("Idee wirklich löschen? Verbindungen werden ebenfalls gelöscht.")) return;
    await api.deleteIdea(id);
    setSelected(null);
    await fetchAll();
  };
  const delConn = async (id: number) => {
    await api.deleteConnection(id);
    await fetchAll();
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

  // connections for selected idea
  const related = selected
    ? connections.filter((c) => c.source_id === selected.id || c.target_id === selected.id)
    : [];

  if (loading) return <div className="p-8 text-muted">Lade Ideen …</div>;
  if (error) return <div className="p-8 text-red-400">Fehler: {error}</div>;

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ideen</h1>
          <p className="text-sm text-muted mt-1">{filtered.length} von {ideas.length} Ideen</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche Titel, Beschreibung, Tags…"
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm w-[260px] focus:outline-none focus:border-accent"
          />
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Alle Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form + Connections */}
        <div className="space-y-4 lg:col-span-1">
          {editing ? (
            <IdeaForm initial={editing} onSubmit={updateIdea} onCancel={() => setEditing(null)} />
          ) : (
            <IdeaForm onSubmit={createIdea} />
          )}
          <ConnectionForm ideas={ideas} onCreated={fetchAll} preselectedSource={selected?.id} />
          {related.length > 0 && selected && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-medium text-sm mb-2">Verbindungen für "{selected.title}"</h3>
              <ul className="space-y-2">
                {related.map((c) => {
                  const otherId = c.source_id === selected.id ? c.target_id : c.source_id;
                  const other = ideas.find((i) => i.id === otherId);
                  const dir = c.source_id === selected.id ? "→" : "←";
                  return (
                    <li key={c.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2 text-sm">
                      <span>
                        <span className="text-accent font-medium">{c.type}</span> {dir} {other?.title || `#${otherId}`}
                        {c.label && <span className="text-muted text-xs ml-2">({c.label})</span>}
                      </span>
                      <button onClick={() => delConn(c.id)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right: List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-muted">
              Keine Ideen gefunden. Erstelle deine erste Idee!
            </div>
          ) : (
            filtered.map((idea) => (
              <div
                key={idea.id}
                onClick={() => setSelected(idea)}
                className={`bg-card border rounded-xl p-4 cursor-pointer transition hover:border-accent/40 ${
                  selected?.id === idea.id ? "border-accent ring-1 ring-accent/30" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{idea.title}</div>
                    {idea.description && <div className="text-sm text-muted mt-1 line-clamp-2">{idea.description}</div>}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {idea.tags.map((t) => (
                        <span key={t} className="text-xs bg-surface border border-border px-2 py-1 rounded-full">
                          #{t}
                        </span>
                      ))}
                      {idea.tags.length === 0 && <span className="text-xs text-muted">ohne Tags</span>}
                    </div>
                    <div className="text-xs text-muted mt-3 flex gap-3 flex-wrap">
                      <span>{new Date(idea.created_at).toLocaleString("de-DE")}</span>
                      {idea.source && <span>Quelle: {idea.source}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditing(idea)}
                      className="text-xs bg-surface border border-border rounded px-3 py-1 hover:border-accent/50"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => delIdea(idea.id)}
                      className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded px-3 py-1 hover:bg-red-500/20"
                    >
                      Löschen
                    </button>
                    <button
                      onClick={() => setSelected(idea)}
                      className="text-xs bg-accent/10 border border-accent/20 text-accent rounded px-3 py-1"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 z-50" onClick={() => setSelected(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-xl max-h-[85vh] overflow-auto p-6"
          >
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="text-sm text-muted mt-2">{new Date(selected.created_at).toLocaleString("de-DE")} · Zuletzt {new Date(selected.updated_at).toLocaleString("de-DE")}</div>
            {selected.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>}
            {selected.source && <div className="mt-3 text-sm"><span className="text-muted">Quelle:</span> {selected.source}</div>}
            <div className="flex flex-wrap gap-2 mt-4">
              {selected.tags.map((t) => (
                <span key={t} className="text-sm bg-accent/10 border border-accent/20 text-accent px-3 py-1 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => { setEditing(selected); setSelected(null); }} className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm">Bearbeiten</button>
              <button onClick={() => delIdea(selected.id)} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
