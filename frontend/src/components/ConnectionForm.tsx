import { useState } from "react";
import type { Idea } from "../types";
import { CONNECTION_TYPES } from "../types";
import { api } from "../api";

export default function ConnectionForm({
  ideas,
  onCreated,
  preselectedSource,
}: {
  ideas: Idea[];
  onCreated: () => void;
  preselectedSource?: number;
}) {
  const [source, setSource] = useState<number | "">(preselectedSource ?? "");
  const [target, setTarget] = useState<number | "">("");
  const [type, setType] = useState<string>(CONNECTION_TYPES[0]);
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (source === "" || target === "") {
      setErr("Quelle und Ziel wählen");
      return;
    }
    if (source === target) {
      setErr("Quelle und Ziel dürfen nicht gleich sein");
      return;
    }
    setSaving(true);
    try {
      await api.createConnection({
        source_id: Number(source),
        target_id: Number(target),
        type,
        label: label.trim() || undefined,
      });
      setOk("Verbindung erstellt");
      setTarget("");
      setLabel("");
      onCreated();
      setTimeout(() => setOk(null), 2000);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="font-medium text-sm">Verbindung erstellen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted">Quelle</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value ? Number(e.target.value) : "")}
            className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— wählen —</option>
            {ideas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted">Ziel</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : "")}
            className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— wählen —</option>
            {ideas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted">Typ</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm">
          {CONNECTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted">Label / Beschreibung (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="z. B. baut darauf auf"
          className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{err}</div>}
      {ok && <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2">{ok}</div>}
      <button disabled={saving} className="w-full bg-accent hover:bg-accent2 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
        {saving ? "Erstelle…" : "Verbinden"}
      </button>
      <p className="text-[11px] text-muted">Tipp: Auch im Graph kannst du Details per Klick öffnen.</p>
    </form>
  );
}
