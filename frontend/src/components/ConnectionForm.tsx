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
      setTimeout(() => setOk(null), 2200);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 grid place-items-center rounded-lg bg-surface border border-border text-heading text-xs">⬡</span>
        <h3 className="text-[13px] font-semibold tracking-tight text-heading">Verbindung</h3>
        <span className="ml-auto text-[11px] text-muted border border-border rounded-full px-2 py-0.5 bg-bg">Graph-Edge</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Quelle</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value ? Number(e.target.value) : "")}
            className="mt-1.5 w-full h-10 bg-bg border border-border rounded-xl px-3 text-[13px] text-heading focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition"
          >
            <option value="">— wählen —</option>
            {ideas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Ziel</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : "")}
            className="mt-1.5 w-full h-10 bg-bg border border-border rounded-xl px-3 text-[13px] text-heading focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition"
          >
            <option value="">— wählen —</option>
            {ideas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Typ</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1.5 w-full h-10 bg-bg border border-border rounded-xl px-3 text-[13px] text-heading focus:outline-none focus:border-accent/50 transition"
        >
          {CONNECTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[11px] font-medium tracking-widest uppercase text-muted">Label (optional)</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="z. B. baut darauf auf"
          className="mt-1.5 w-full h-10 bg-bg border border-border rounded-xl px-3.5 text-[13px] text-heading placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition"
        />
      </label>

      {err && <div className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 animate-slide-up">{err}</div>}
      {ok && <div className="text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 animate-slide-up">{ok}</div>}

      <button
        disabled={saving}
        className="w-full h-10 bg-heading text-bg hover:bg-white rounded-xl text-[13px] font-semibold tracking-tight transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            Verbinde…
          </>
        ) : (
          "Verbinden →"
        )}
      </button>
      <p className="text-[11px] text-center text-muted/60">Typ bestimmt Kanten-Farbe im Graph. Klick im Graph öffnet Details.</p>
    </form>
  );
}
