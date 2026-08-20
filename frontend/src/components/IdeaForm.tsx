import { useEffect, useState } from "react";
import type { Idea } from "../types";

export default function IdeaForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Idea>;
  onSubmit: (data: { title: string; description?: string; source?: string; tags: string[] }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [source, setSource] = useState(initial?.source || "");
  const [tagsStr, setTagsStr] = useState((initial?.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setSource(initial.source || "");
      setTagsStr((initial.tags || []).join(", "));
    }
  }, [initial]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(false);
    if (!title.trim()) {
      setErr("Titel darf nicht leer sein");
      return;
    }
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || undefined, source: source.trim() || undefined, tags });
      setOk(true);
      setTimeout(() => setOk(false), 1800);
      if (!initial?.id) {
        setTitle("");
        setDescription("");
        setSource("");
        setTagsStr("");
      }
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handle} className="card p-5 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold tracking-tight text-heading flex items-center gap-2">
          <span className="w-7 h-7 grid place-items-center rounded-lg bg-accent text-white text-sm shadow-glow">＋</span>
          {initial?.id ? "Idee bearbeiten" : "Neue Idee"}
        </h3>
        {ok && <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-slide-up">Gespeichert ✓</span>}
      </div>

      <div className="space-y-3.5">
        <label className="block">
          <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Titel *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Dezentrale Wissensgraphen"
            className="mt-1.5 w-full h-10 bg-bg border border-border rounded-xl px-3.5 text-[13px] text-heading placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Beschreibung</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Worum geht’s? KernThese in 2 Sätzen…"
            className="mt-1.5 w-full bg-bg border border-border rounded-xl px-3.5 py-3 text-[13px] leading-relaxed text-heading placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition resize-none"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <label className="block">
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Quelle / Referenz</span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Buch, Link, Person…"
              className="mt-1.5 w-full h-10 bg-bg border border-border rounded-xl px-3.5 text-[13px] text-heading placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Tags</span>
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="philosophie, ki, netzwerk"
              className="mt-1.5 w-full h-10 bg-bg border border-border rounded-xl px-3.5 text-[13px] text-heading placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition"
            />
          </label>
        </div>
      </div>

      {err && <div className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 animate-slide-up">{err}</div>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-10 bg-accent hover:bg-accent2 text-white rounded-xl text-[13px] font-semibold tracking-tight shadow-glow disabled:opacity-50 transition duration-200 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Speichert…
            </>
          ) : initial?.id ? (
            "Speichern"
          ) : (
            "Erstellen →"
          )}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-10 px-5 rounded-xl bg-bg border border-border text-[13px] font-medium text-muted hover:text-heading hover:border-white/10 transition">
            Abbrechen
          </button>
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-muted/60 text-center">Enter speichert • Tags komma-getrennt • ⌘+Enter</p>
    </form>
  );
}
