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

  if (loading)
    return (
      <div className="p-6 md:p-10 space-y-4">
        <div className="h-8 w-48 bg-border/60 rounded-xl animate-skeleton" />
        <div className="h-64 bg-surface border border-border rounded-2xl animate-skeleton" />
      </div>
    );
  if (err) return <div className="p-8 text-red-400">Fehler: {err}</div>;

  return (
    <div className="p-6 md:p-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-[30px] md:text-[32px] font-semibold tracking-[-0.03em] text-heading leading-none">Zeitleiste</h1>
          <p className="mt-2 text-[13px] text-muted">
            {filtered.length} Ideen {filter === "week" ? "• letzte 7 Tage" : filter === "month" ? "• letzte 30 Tage" : "• gesamt"} — chronologisch
          </p>
        </div>
        <div className="flex p-1 rounded-xl bg-surface border border-border">
          {[
            { id: "all", label: "Alle" },
            { id: "week", label: "Woche" },
            { id: "month", label: "Monat" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition duration-200 ${
                filter === btn.id ? "bg-heading text-bg shadow" : "text-muted hover:text-heading"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <div className="text-[13px] text-muted">Keine Ideen in diesem Zeitraum.</div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent hidden md:block" />
          <div className="space-y-10">
            {groups.map(([dateStr, items]) => (
              <div key={dateStr} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="hidden md:grid w-8 h-8 rounded-full bg-accent text-white place-items-center text-xs shadow-glow shrink-0">●</div>
                  <div className="px-3.5 py-1.5 rounded-full bg-surface border border-border text-[13px] font-medium text-heading">{dateStr}</div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-bg border border-border text-muted">{items.length} Ideen</span>
                </div>
                <div className="md:ml-10 grid gap-3">
                  {items.map((idea) => (
                    <div key={idea.id} className="group card card-hover p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold tracking-tight text-heading group-hover:text-accent transition">{idea.title}</div>
                        {idea.description && <div className="text-[13px] leading-relaxed text-muted line-clamp-2 mt-1.5">{idea.description}</div>}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {idea.tags.map((t) => (
                            <span key={t} className="text-[11px] font-medium bg-bg border border-border px-2.5 py-1 rounded-full text-muted">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end gap-1">
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-bg border border-border text-muted">
                          {new Date(idea.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {idea.source && <span className="text-[11px] text-muted/70">↗ {idea.source}</span>}
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
