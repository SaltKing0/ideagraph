import { useEffect, useState } from "react";
import { api } from "../api";
import type { Stats } from "../types";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-skeleton bg-border/60 rounded ${className}`} />;
}

export default function Dashboard({ onSelectTag }: { onSelectTag?: (tag: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="p-8 md:p-10 space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[118px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[280px] rounded-2xl" />
      </div>
    );
  if (err) return <div className="p-8 text-red-400">Fehler: {err}</div>;
  if (!stats) return null;

  const maxCount = Math.max(1, ...stats.heatmap.map((d) => d.count));
  const maxTag = Math.max(1, ...stats.top_tags.map((t) => t.count));

  return (
    <div className="p-6 md:p-10 space-y-8 animate-fade-in">
      {/* Header – large, clean */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-muted border border-border rounded-full px-3 py-1 bg-surface">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-glow" />
          Dashboard • Premium
        </div>
        <h1 className="text-[32px] md:text-[36px] font-semibold tracking-[-0.03em] text-heading leading-none">Übersicht</h1>
        <p className="text-[14px] leading-relaxed text-muted max-w-2xl">
          Deine Ideenwelt auf einen Blick — minimal, fokussiert, inspiriert von Linear & Vercel.
        </p>
      </div>

      {/* KPIs – SaaS premium cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Ideen", value: stats.total_ideas, sub: "Gesamt erfasst", icon: "◈" },
          { label: "Verbindungen", value: stats.total_connections, sub: "Edges im Graph", icon: "⬢" },
          { label: "Tags", value: stats.top_tags.length, sub: "Schlagworte", icon: "＃" },
        ].map((k) => (
          <div key={k.label} className="card card-hover p-5 md:p-6 group">
            <div className="flex items-start justify-between">
              <div className="text-[11px] font-medium tracking-widest uppercase text-muted">{k.label}</div>
              <span className="w-8 h-8 grid place-items-center rounded-xl bg-white/[0.06] border border-white/[0.06] text-heading group-hover:bg-accent group-hover:text-white transition duration-200 text-sm">
                {k.icon}
              </span>
            </div>
            <div className="mt-3 text-[36px] font-semibold tracking-[-0.04em] text-heading leading-none">{k.value}</div>
            <div className="mt-2 text-[12px] text-muted">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tag Cloud */}
        <div className="card p-6 md:p-7 lg:col-span-2">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="text-[14px] font-semibold tracking-tight text-heading">Tag-Cloud</h3>
            <span className="text-[11px] text-muted">{stats.top_tags.length} Tags</span>
          </div>
          {stats.top_tags.length === 0 ? (
            <div className="text-sm text-muted py-8 text-center border border-dashed border-border rounded-xl">Noch keine Tags vorhanden.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {stats.top_tags.map((t) => {
                  const size = 12 + (t.count / maxTag) * 8; // 12..20
                  const opacity = 0.6 + (t.count / maxTag) * 0.4;
                  return (
                    <button
                      key={t.tag}
                      onClick={() => onSelectTag?.(t.tag)}
                      className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-card border border-border hover:border-accent/30 hover:bg-accentSoft transition duration-200"
                      style={{ fontSize: size }}
                    >
                      <span className="font-medium tracking-tight text-heading group-hover:text-accent transition" style={{ opacity }}>
                        #{t.tag}
                      </span>
                      <span className="text-[11px] font-medium bg-white/[0.08] border border-white/[0.06] text-muted group-hover:bg-accent group-hover:text-white px-1.5 py-0.5 rounded-full transition">
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 space-y-3">
                {stats.top_tags.slice(0, 5).map((t) => (
                  <div key={t.tag} className="flex items-center gap-4 group">
                    <div className="w-28 text-[13px] font-medium text-heading truncate">{t.tag}</div>
                    <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden border border-border/50">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all duration-700"
                        style={{ width: `${(t.count / maxTag) * 100}%` }}
                      />
                    </div>
                    <div className="w-6 text-right text-[12px] font-medium text-muted">{t.count}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent */}
        <div className="card p-6">
          <h3 className="text-[14px] font-semibold tracking-tight text-heading">Neueste Ideen</h3>
          <p className="text-[12px] text-muted mt-1">Zuletzt erstellt</p>
          {stats.recent_ideas.length === 0 ? (
            <div className="text-sm text-muted mt-6 text-center py-6">Noch keine Ideen.</div>
          ) : (
            <ul className="mt-5 space-y-3">
              {stats.recent_ideas.map((idea) => (
                <li key={idea.id} className="group rounded-xl bg-bg border border-border p-3.5 hover:border-white/10 hover:bg-white/[0.03] transition duration-200">
                  <div className="text-[13px] font-semibold tracking-tight text-heading truncate group-hover:text-accent transition">{idea.title}</div>
                  <div className="text-[12px] leading-relaxed text-muted line-clamp-2 mt-1.5">{idea.description || "—"}</div>
                  <div className="flex items-center gap-2 mt-3 text-[11px]">
                    <span className="text-muted">{new Date(idea.created_at).toLocaleDateString("de-DE")}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="truncate text-muted/80">{idea.tags.join(" · ") || "ohne Tags"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Heatmap – premium */}
      <div className="card p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-heading">Aktivität</h3>
            <p className="text-[12px] text-muted mt-1">GitHub-Style Heatmap • Letzte 30 Tage</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            Weniger
            <div className="flex gap-1.5">
              <div className="w-3.5 h-3.5 rounded-md bg-card border border-border" />
              <div className="w-3.5 h-3.5 rounded-md bg-accent/20 border border-accent/20" />
              <div className="w-3.5 h-3.5 rounded-md bg-accent/50 border border-accent/30" />
              <div className="w-3.5 h-3.5 rounded-md bg-accent border border-accent shadow-glow" />
            </div>
            Mehr
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {stats.heatmap.map((d) => {
            const intensity = d.count === 0 ? 0 : Math.ceil((d.count / maxCount) * 4);
            const cls =
              intensity === 0
                ? "bg-card border border-border"
                : intensity === 1
                ? "bg-accent/15 border border-accent/20"
                : intensity === 2
                ? "bg-accent/35 border border-accent/30"
                : intensity === 3
                ? "bg-accent/65 border border-accent/40"
                : "bg-accent border border-accent shadow-glow";
            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} Ideen`}
                className={`w-[44px] h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 ${cls} transition duration-200 hover:scale-[1.03] hover:border-accent/50`}
              >
                <span className="text-[13px] font-semibold tracking-tight text-heading">{d.count}</span>
                <span className="text-[10px] font-medium tracking-wide text-muted/80">
                  {new Date(d.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mini bars */}
        <div className="mt-8">
          <div className="text-[11px] font-medium tracking-widest uppercase text-muted mb-3">Ideen pro Tag</div>
          <div className="flex items-end gap-[3px] h-[72px] p-2 rounded-xl bg-bg border border-border">
            {stats.ideas_per_day.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count}`}
                className="flex-1 rounded-full bg-gradient-to-t from-accent2 to-accent transition-all duration-700"
                style={{ height: `${Math.max(4, (d.count / maxCount) * 100)}%`, opacity: d.count ? 1 : 0.12 }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] tracking-wide text-muted mt-2 px-1">
            <span>{stats.ideas_per_day[0]?.date}</span>
            <span>{stats.ideas_per_day[stats.ideas_per_day.length - 1]?.date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
