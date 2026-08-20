import type { Idea, Connection, Graph, Stats } from "./types";

const BASE = ""; // proxied to localhost:8000 in dev, same origin in prod

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.detail || JSON.stringify(j);
    } catch {}
    throw new Error(msg || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listIdeas: (q?: string, tag?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    const qs = params.toString() ? `?${params}` : "";
    return req<Idea[]>(`/ideas${qs}`);
  },
  getIdea: (id: number) => req<Idea>(`/ideas/${id}`),
  createIdea: (data: Partial<Idea>) => req<Idea>(`/ideas`, { method: "POST", body: JSON.stringify(data) }),
  updateIdea: (id: number, data: Partial<Idea>) => req<Idea>(`/ideas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteIdea: (id: number) => req<void>(`/ideas/${id}`, { method: "DELETE" }),

  listConnections: () => req<Connection[]>(`/connections`),
  createConnection: (data: { source_id: number; target_id: number; type: string; label?: string }) =>
    req<Connection>(`/connections`, { method: "POST", body: JSON.stringify(data) }),
  deleteConnection: (id: number) => req<void>(`/connections/${id}`, { method: "DELETE" }),

  getGraph: () => req<Graph>(`/graph`),
  getStats: () => req<Stats>(`/stats`),
};
