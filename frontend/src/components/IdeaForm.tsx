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
    if (!title.trim()) {
      setErr("Titel darf nicht leer sein");
      return;
    }
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || undefined, source: source.trim() || undefined, tags });
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
    <form onSubmit={handle} className="space-y-3 bg-card border border-border rounded-xl p-4">
      <h3 className="font-medium">{initial?.id ? "Idee bearbeiten" : "Neue Idee"}</h3>
      <div>
        <label className="text-xs text-muted">Titel *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Dezentrale Wissensgraphen"
          className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs text-muted">Beschreibung</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Worum geht's?"
          className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs text-muted">Quelle / Referenz</label>
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Buch, Link, Person…"
          className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs text-muted">Tags (komma-getrennt)</label>
        <input
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="z. B. philosophie, ki, netzwerk"
          className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>
      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{err}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-accent hover:bg-accent2 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Speichert…" : initial?.id ? "Speichern" : "Erstellen"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-surface border border-border text-sm">
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
