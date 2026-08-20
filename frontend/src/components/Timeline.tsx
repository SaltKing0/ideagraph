import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Idea } from "../types";

export default function Timeline() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState<"all" | "week" | "month">("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .listIdeas()
      .then((data) => setIdeas(data))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const now = useMemo(() => new Date(), []);
  const filtered = useMemo(() => {
    if (filter === "all") return ideas;
    const cutoff = new Date(now);
    if (filter === "week") cutoff.setDate(now.getDate() - 7);
    if (filter === "month") cutoff.setDate(now.getDate() - 30);
    return ideas.filter((i) => new Date(i.created_at) >= cutoff);
  }, [ideas, filter, now]);

  // group by date string
  const groups = useMemo(() => {
    const map = new Map<string, Idea[]>();
    filtered
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach((idea) => {
        const d = new Date(idea.created_at).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(idea);
      });
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) return <div className="p-8 text-muted">Lade Timeline …</div>;
  if (err) return <div className="p-8 text-red-400">Fehler: {err}</div>;

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Zeitleiste</h1>
          <p className="text-sm text-muted mt-1">
            {filtered.length} Ideen {filter === "week" ? "· letzte 7 Tage" : filter === "month" ? "· letzte 30 Tage" : "· gesamt"} – sortiert nach Datum
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { id: "all", label: "Alle" },
            { id: "week", label: "Letzte Woche" },
            { id: "month", label: "Letzter Monat" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`px-4 py-2 rounded-lg text-sm border ${
                filter === btn.id ? "bg-accent text-white border-accent" : "bg-card border-border text-muted hover:text-white"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-muted">
          Keine Ideen in diesem Zeitraum.
        </div>
      ) : (
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border hidden md:block" />
          <div className="space-y-8">
            {groups.map(([dateStr, items]) => (
              <div key={dateStr} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="hidden md:flex w-8 h-8 rounded-full bg-accent/20 border border-accent/30 items-center justify-center text-accent text-sm shrink-0">
                    ●
                  </div>
                  <div className="bg-card border border-border rounded-full px-3 py-1 text-sm font-medium">{dateStr}</div>
                  <div className="text-xs text-muted">{items.length} Ideen</div>
                </div>
                <div className="md:ml-11 grid gap-3">
                  {items.map((idea) => (
                    <div key={idea.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{idea.title}</div>
                        {idea.description && <div className="text-sm text-muted line-clamp-2 mt-1">{idea.description}</div>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {idea.tags.map((t) => (
                            <span key={t} className="text-xs bg-surface border border-border px-2 py-0.5 rounded-full">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-muted shrink-0 text-right">
                        <div>{new Date(idea.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
                        {idea.source && <div className="mt-1">↗ {idea.source}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
