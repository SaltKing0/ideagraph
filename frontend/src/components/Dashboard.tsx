import { useEffect, useState } from "react";
import { api } from "../api";
import type { Stats } from "../types";

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

  if (loading) return <div className="p-8 text-muted">Lade Dashboard …</div>;
  if (err) return <div className="p-8 text-red-400">Fehler: {err}</div>;
  if (!stats) return null;

  const maxCount = Math.max(1, ...stats.heatmap.map((d) => d.count));
  const maxTag = Math.max(1, ...stats.top_tags.map((t) => t.count));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Überblick über deine Ideenwelt</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted">Ideen</div>
          <div className="text-3xl font-semibold mt-1">{stats.total_ideas}</div>
          <div className="text-xs text-muted mt-2">Gesamt erfasst</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted">Verbindungen</div>
          <div className="text-3xl font-semibold mt-1">{stats.total_connections}</div>
          <div className="text-xs text-muted mt-2">Edges im Graph</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted">Tags</div>
          <div className="text-3xl font-semibold mt-1">{stats.top_tags.length}</div>
          <div className="text-xs text-muted mt-2">Verschiedene Schlagworte</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tag Cloud */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h3 className="font-medium mb-3">Tag-Cloud</h3>
          {stats.top_tags.length === 0 ? (
            <div className="text-sm text-muted">Noch keine Tags vorhanden.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.top_tags.map((t) => {
                const size = 12 + (t.count / maxTag) * 10; // 12..22
                return (
                  <button
                    key={t.tag}
                    onClick={() => onSelectTag?.(t.tag)}
                    className="px-3 py-1.5 rounded-full bg-surface border border-border hover:border-accent/50 hover:bg-accent/10 transition"
                    style={{ fontSize: size }}
                    title={`${t.count} Ideen`}
                  >
                    <span className="text-zinc-200">{t.tag}</span>
                    <span className="ml-2 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{t.count}</span>
                  </button>
                );
              })}
            </div>
          )}
          {/* Top Tags Bars */}
          <div className="mt-6 space-y-2">
            {stats.top_tags.slice(0, 5).map((t) => (
              <div key={t.tag} className="flex items-center gap-3 text-sm">
                <div className="w-24 truncate text-muted">{t.tag}</div>
                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent2"
                    style={{ width: `${(t.count / maxTag) * 100}%` }}
                  />
                </div>
                <div className="w-6 text-right text-zinc-300">{t.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Ideas */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium mb-3">Neueste Ideen</h3>
          {stats.recent_ideas.length === 0 ? (
            <div className="text-sm text-muted">Noch keine Ideen.</div>
          ) : (
            <ul className="space-y-3">
              {stats.recent_ideas.map((idea) => (
                <li key={idea.id} className="bg-surface border border-border rounded-lg p-3">
                  <div className="font-medium text-sm truncate">{idea.title}</div>
                  <div className="text-xs text-muted line-clamp-2 mt-1">{idea.description || "—"}</div>
                  <div className="text-[11px] text-muted mt-2">
                    {new Date(idea.created_at).toLocaleDateString("de-DE")} · {idea.tags.join(", ") || "ohne Tags"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium">Aktivität – Letzte 30 Tage</h3>
        <p className="text-xs text-muted mt-1">Heatmap wie GitHub Contributions</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {stats.heatmap.map((d) => {
            const intensity = d.count === 0 ? 0 : Math.ceil((d.count / maxCount) * 4); // 0..4
            const bg =
              intensity === 0
                ? "bg-surface border border-border"
                : intensity === 1
                ? "bg-violet-900/40 border border-violet-800"
                : intensity === 2
                ? "bg-violet-800/60 border border-violet-700"
                : intensity === 3
                ? "bg-violet-600 border border-violet-500"
                : "bg-accent border border-accent";
            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} Ideen`}
                className={`w-9 h-9 rounded-md flex flex-col items-center justify-center text-[10px] ${bg} transition`}
              >
                <span className="font-medium text-white">{d.count}</span>
                <span className="text-[9px] opacity-60 hidden sm:block">
                  {new Date(d.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-1 text-xs text-muted items-center">
          <span>Weniger</span>
          <div className="flex gap-1 ml-2">
            <div className="w-4 h-4 rounded bg-surface border border-border" />
            <div className="w-4 h-4 rounded bg-violet-900/40 border border-violet-800" />
            <div className="w-4 h-4 rounded bg-violet-600 border border-violet-500" />
            <div className="w-4 h-4 rounded bg-accent" />
          </div>
          <span className="ml-2">Mehr</span>
        </div>
      </div>

      {/* Ideen pro Tag Bars */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium mb-4">Ideen pro Tag (Timeline mini)</h3>
        <div className="flex items-end gap-[2px] h-24">
          {stats.ideas_per_day.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              className="flex-1 bg-gradient-to-t from-accent2 to-accent rounded-t"
              style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count ? 6 : 2, opacity: d.count ? 1 : 0.15 }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-2">
          <span>{stats.ideas_per_day[0]?.date}</span>
          <span>{stats.ideas_per_day[stats.ideas_per_day.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
