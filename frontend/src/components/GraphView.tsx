import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { api } from "../api";
import type { Graph, Idea } from "../types";

type D3Node = Graph["nodes"][0] & { x?: number; y?: number; fx?: number | null; fy?: number | null };
type D3Link = { id: number; source: D3Node | number; target: D3Node | number; type: string; label?: string | null };

// --- module-scope helpers (stable references, so they never re-trigger the graph effects) ---
const tagDot = (tag: string) => {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 65% 58%)`;
};

const typeMeta: Record<string, { color: string; dash: string | null; label: string }> = {
  "entstand aus": { color: "#6366f1", dash: null, label: "—" },
  "ähnlich zu": { color: "#a1a1aa", dash: "4 4", label: "╌" },
  "kontrastiert mit": { color: "#f43f5e", dash: "2 6", label: "┈" },
};

// neighbors of a focused node (or empty when nothing is focused)
function computeNeighbors(hov: number | null, sel: Idea | null, links: D3Link[]) {
  const s = new Set<number>();
  const id = sel?.id ?? hov;
  if (id == null) return s;
  links.forEach((l) => {
    const si = l.source as number;
    const ti = l.target as number;
    if (si === id) s.add(ti);
    if (ti === id) s.add(si);
  });
  return s;
}

export default function GraphView() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  // D3 selections kept in refs so the highlight effect can restyle without rebuilding the graph
  const nodeSelRef = useRef<any | null>(null);
  const linkSelRef = useRef<any | null>(null);
  const linkLabelSelRef = useRef<any | null>(null);
  const ideasRef = useRef<Idea[]>([]);

  const [graph, setGraph] = useState<Graph | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selected, setSelected] = useState<Idea | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [filterTag, setFilterTag] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    ideasRef.current = ideas;
  }, [ideas]);

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [g, is] = await Promise.all([api.getGraph(), api.listIdeas()]);
      setGraph(g);
      setIdeas(is);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allTags = useMemo(() => Array.from(new Set(ideas.flatMap((i) => i.tags))).sort(), [ideas]);

  // close the side sheet with Escape
  useEffect(() => {
    if (!selected) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected]);

  // derived filter
  const filtered = useMemo(() => {
    if (!graph) return null;
    let nodes: D3Node[] = graph.nodes.map((n) => ({ ...n }));
    let links: D3Link[] = graph.edges.map((e) => ({ ...e }));
    if (filterTag) {
      const keep = new Set(nodes.filter((n) => n.tags.includes(filterTag)).map((n) => n.id));
      nodes = nodes.filter((n) => keep.has(n.id));
      links = links.filter((l) => keep.has(l.source as number) && keep.has(l.target as number));
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      const keep = new Set(
        nodes.filter((n) => `${n.title} ${n.tags.join(" ")}`.toLowerCase().includes(s)).map((n) => n.id)
      );
      nodes = nodes.filter((n) => keep.has(n.id));
      links = links.filter((l) => keep.has(l.source as number) && keep.has(l.target as number));
    }
    return { nodes, links };
  }, [graph, filterTag, q]);

  // Build the graph once per data change. Hovering/selecting does NOT rebuild it:
  // the highlight effect below just restyles the existing elements.
  useEffect(() => {
    if (!filtered || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svgSelRef.current = svg as any;
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = 620;
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    const { nodes, links } = filtered;

    if (nodes.length === 0) {
      nodeSelRef.current = null;
      linkSelRef.current = null;
      linkLabelSelRef.current = null;
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#71717a")
        .attr("font-size", "13px")
        .attr("font-weight", "500")
        .text(q || filterTag ? "Kein Treffer für Filter" : "Noch keine Ideen");
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 + 22)
        .attr("text-anchor", "middle")
        .attr("fill", "#52525b")
        .attr("font-size", "12px")
        .text(q || filterTag ? "Filter zurücksetzen" : "Erstelle Ideen, um den Graph zu sehen");
      return;
    }

    // subtle line grid – Linear style, not dot
    const grid = svg.append("g").attr("opacity", 0.04);
    for (let x = 0; x < width; x += 28) grid.append("line").attr("x1", x).attr("y1", 0).attr("x2", x).attr("y2", height).attr("stroke", "#fff").attr("stroke-width", 0.5);
    for (let y = 0; y < height; y += 28) grid.append("line").attr("x1", 0).attr("y1", y).attr("x2", width).attr("y2", y).attr("stroke", "#fff").attr("stroke-width", 0.5);

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    zoomRef.current = zoom;
    svg.call(zoom as any).on("dblclick.zoom", null);
    svg.call(zoom.transform as any, d3.zoomIdentity);

    const simNodes = nodes as any[];
    const simLinks = links.map((l) => ({ ...l })) as any[];

    const simulation = d3
      .forceSimulation(simNodes)
      .force("link", d3.forceLink(simLinks).id((d: any) => d.id).distance(130).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-520))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(48))
      .force("x", d3.forceX(width / 2).strength(0.04))
      .force("y", d3.forceY(height / 2).strength(0.04));

    // edges – ultra thin, muted
    const link = g
      .append("g")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d: any) => typeMeta[d.type]?.color || "#27272a")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.35)
      .attr("stroke-dasharray", (d: any) => typeMeta[d.type]?.dash || null)
      .attr("stroke-linecap", "round");

    // edge type pills – very subtle
    const linkLabel = g
      .append("g")
      .selectAll("g")
      .data(simLinks)
      .join("g")
      .attr("pointer-events", "none");

    linkLabel
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "#18181b")
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("width", 72)
      .attr("height", 16)
      .attr("x", -36)
      .attr("y", -8);

    linkLabel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "9px")
      .attr("font-weight", "600")
      .attr("letter-spacing", "0.04em")
      .attr("fill", (d: any) => typeMeta[d.type]?.color || "#a1a1aa")
      .text((d: any) => d.type);

    // nodes – Linear minimal
    const node = g
      .append("g")
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<any, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.25).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    // outer ring for selected/hovered – premium subtle (opacity driven by highlight effect)
    node
      .append("circle")
      .attr("class", "focus-ring")
      .attr("r", 28)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 1.2)
      .attr("opacity", 0);

    // main node – surface (stroke/filter driven by highlight effect)
    node
      .append("circle")
      .attr("class", "node-core")
      .attr("r", 20)
      .attr("fill", "#18181b")
      .attr("stroke", "#27272a")
      .attr("stroke-width", 1)
      .style("transition", "all 200ms ease");

    // tag dot – small bottom-right
    node
      .append("circle")
      .attr("r", 5)
      .attr("cx", 13)
      .attr("cy", 13)
      .attr("fill", (d: any) => (d.tags[0] ? tagDot(d.tags[0]) : "#3f3f46"))
      .attr("stroke", "#09090b")
      .attr("stroke-width", 2);

    // letter
    node
      .append("text")
      .text((d: any) => d.title.slice(0, 1).toUpperCase())
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fafafa")
      .attr("font-size", "11px")
      .attr("font-weight", "650")
      .style("pointer-events", "none");

    // title pill below – Linear style
    const labelGroup = node.append("g").attr("transform", "translate(0,30)");

    labelGroup
      .append("rect")
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "rgba(24,24,27,0.92)")
      .attr("stroke", "rgba(255,255,255,0.07)")
      .attr("height", 20)
      .style("backdrop-filter", "blur(8px)");

    labelGroup
      .append("text")
      .text((d: any) => (d.title.length > 16 ? d.title.slice(0, 16) + "…" : d.title))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("y", 10)
      .attr("fill", "#fafafa")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .style("pointer-events", "none");

    // size rect to fit text
    labelGroup.each(function (this: any) {
      const text = d3.select(this).select("text");
      const bbox = (text.node() as SVGTextElement).getBBox();
      d3.select(this)
        .select("rect")
        .attr("width", Math.min(140, bbox.width + 16))
        .attr("x", -Math.min(140, bbox.width + 16) / 2);
      text.attr("x", 0);
    });

    // keep refs so the highlight effect can restyle without rebuilding
    nodeSelRef.current = node;
    linkSelRef.current = link;
    linkLabelSelRef.current = linkLabel;

    node
      .on("mouseenter", (_e, d: any) => setHovered(d.id))
      .on("mouseleave", () => setHovered(null))
      .on("click", (_e, d: any) => {
        const idea = ideasRef.current.find((i) => i.id === d.id) || null;
        setSelected(idea);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      linkLabel.attr("transform", (d: any) => `translate(${(d.source.x + d.target.x) / 2},${(d.source.y + d.target.y) / 2})`);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      nodeSelRef.current = null;
      linkSelRef.current = null;
      linkLabelSelRef.current = null;
    };
  }, [filtered, q, filterTag]);

  // Ego-highlight on hover/selection: restyles existing elements, never rebuilds.
  useEffect(() => {
    if (!filtered || !nodeSelRef.current || !linkSelRef.current || !linkLabelSelRef.current) return;
    const focusedId = selected?.id ?? hovered ?? null;
    const neighborIds = computeNeighbors(hovered, selected, filtered.links);

    nodeSelRef.current
      .select(".focus-ring")
      .attr("opacity", (d: any) => (d.id === focusedId ? 0.9 : 0));
    nodeSelRef.current
      .select(".node-core")
      .attr("stroke", (d: any) => (d.id === focusedId ? "#6366f1" : "#27272a"))
      .attr("stroke-width", (d: any) => (d.id === focusedId ? 1.4 : 1))
      .style("filter", (d: any) =>
        d.id === focusedId ? "drop-shadow(0 0 12px rgba(99,102,241,0.35))" : "none"
      );
    nodeSelRef.current.style("opacity", (d: any) => {
      const dim = focusedId !== null && d.id !== focusedId && !neighborIds.has(d.id);
      return dim ? 0.22 : 1;
    });
    linkSelRef.current.style("opacity", (d: any) => {
      if (focusedId === null) return 0.35;
      const s = (d.source as any).id ?? d.source;
      const t = (d.target as any).id ?? d.target;
      return s === focusedId || t === focusedId ? 0.9 : 0.08;
    });
    linkLabelSelRef.current.style("opacity", (d: any) => {
      if (focusedId === null) return 0.9;
      const s = (d.source as any).id ?? d.source;
      const t = (d.target as any).id ?? d.target;
      return s === focusedId || t === focusedId ? 1 : 0.12;
    });
  }, [filtered, ideas, hovered, selected]);

  const handleZoom = (dir: "in" | "out" | "reset") => {
    const svg = svgSelRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    if (dir === "in") svg.transition().duration(300).call(zoom.scaleBy as any, 1.28);
    if (dir === "out") svg.transition().duration(300).call(zoom.scaleBy as any, 0.78);
    if (dir === "reset") svg.transition().duration(400).call(zoom.transform as any, d3.zoomIdentity);
  };

  if (loading)
    return (
      <div className="p-6 md:p-10 space-y-4">
        <div className="h-8 w-44 bg-border/40 rounded-xl animate-skeleton" />
        <div className="h-[620px] bg-surface border border-border rounded-2xl animate-skeleton" />
      </div>
    );
  if (err) return <div className="p-8 text-red-400">Fehler: {err}</div>;

  const stats = filtered ? { n: filtered.nodes.length, e: filtered.links.length } : { n: 0, e: 0 };

  return (
    <div className="p-6 md:p-10 space-y-5 animate-fade-in">
      {/* Header – Linear clean */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-muted border border-border rounded-full px-3 py-1 bg-surface">
            Graph • Force-directed
          </div>
          <h1 className="mt-3 text-[30px] md:text-[32px] font-semibold tracking-[-0.03em] text-heading leading-none">Netzwerk</h1>
          <p className="mt-2 text-[13px] text-muted max-w-xl">
            Minimal, fokussiert — Dünne Linien, monochrome Nodes mit kleinem Tag-Punkt. Hover hebt Ego-Netzwerk hervor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter Titel/Tags…"
              className="h-9 w-[200px] bg-surface border border-border rounded-xl pl-8 pr-3 text-[13px] text-heading placeholder:text-muted/50 focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 transition"
            />
          </div>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="h-9 bg-surface border border-border rounded-xl px-3 text-[13px] text-heading focus:outline-none focus:border-accent/40 transition"
          >
            <option value="">Alle Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <button onClick={fetchData} className="h-9 px-3.5 rounded-xl bg-surface border border-border text-[13px] font-medium text-heading hover:bg-white/[0.06] transition">
            ↻
          </button>
        </div>
      </div>

      {/* Stats + legend – very subtle */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span className="px-2.5 py-1 rounded-full bg-surface border border-border text-muted">
          {stats.n} Nodes • {stats.e} Edges
        </span>
        <span className="hidden sm:flex items-center gap-2 text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px bg-accent" /> entstand aus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px bg-muted border-t border-dashed border-muted" /> ähnlich
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px bg-red-400/60" style={{ borderTop: "1px dotted #f43f5e" }} /> kontrastiert
          </span>
        </span>
        <span className="ml-auto text-muted/60 hidden lg:inline">Monochrom • Tag-Punkt • Linear inspiriert</span>
      </div>

      {/* Graph card – premium minimal */}
      <div className="card overflow-hidden p-0 border-white/[0.06] bg-bg relative">
        <div
          ref={containerRef}
          className="relative overflow-hidden"
          style={{ background: "#09090b" }}
        >
          <svg ref={svgRef} className="w-full block" style={{ height: 620, display: "block" }} />

          {/* Zoom controls – Raycast style */}
          <div className="absolute right-3 top-3 flex items-center gap-1 bg-surface border border-border rounded-xl p-1 shadow-card">
            <button onClick={() => handleZoom("in")} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-white/[0.06] text-heading text-sm transition" title="Zoom in">
              ＋
            </button>
            <button onClick={() => handleZoom("out")} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-white/[0.06] text-heading text-sm transition" title="Zoom out">
              －
            </button>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button onClick={() => handleZoom("reset")} className="px-2.5 h-7 rounded-lg hover:bg-white/[0.06] text-[11px] font-medium text-muted hover:text-heading transition" title="Fit">
              Fit
            </button>
          </div>

          {/* Hint */}
          <div className="absolute left-3 bottom-3 text-[11px] text-muted bg-surface/90 backdrop-blur border border-border rounded-full px-3 py-1.5 hidden sm:flex items-center gap-2">
            <span>Drag</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Scroll-Zoom</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Click → Details</span>
          </div>

          {(q || filterTag) && (
            <button
              onClick={() => {
                setQ("");
                setFilterTag("");
              }}
              className="absolute left-1/2 -translate-x-1/2 top-3 text-[12px] font-medium bg-accent text-white px-3 py-1.5 rounded-full shadow-glow hover:bg-accent2 transition"
            >
              Filter löschen ({stats.n} Treffer) ×
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-center text-muted/60">Ego-Highlight on Hover • Dünne Linien • Kein Regenbogen — Raycast/SaaS minimal</p>

      {/* Side sheet – Linear slide */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-bg/50 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] bg-surface border-l border-border h-full overflow-auto p-6 animate-slide-up shadow-2xl"
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-xl bg-bg border border-border text-muted hover:text-heading transition"
            >
              ×
            </button>
            <div className="w-10 h-10 rounded-xl bg-heading text-bg grid place-items-center font-semibold text-sm">
              {selected.title.slice(0, 1).toUpperCase()}
            </div>
            <h2 className="mt-4 text-[18px] font-semibold tracking-tight text-heading leading-tight pr-8">{selected.title}</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-bg border border-border px-2.5 py-1 rounded-full text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ background: tagDot(t) }} /> #{t}
                </span>
              ))}
              {selected.tags.length === 0 && <span className="text-[11px] text-muted/60">ohne Tags</span>}
            </div>
            {selected.description && <p className="mt-5 text-[13px] leading-relaxed text-muted whitespace-pre-wrap">{selected.description}</p>}
            {selected.source && (
              <div className="mt-4 text-[12px] px-3 py-2.5 rounded-xl bg-bg border border-border flex items-center gap-2">
                <span className="text-muted">Quelle</span>
                <span className="text-heading font-medium truncate">{selected.source}</span>
              </div>
            )}
            <div className="mt-2 text-[11px] text-muted/60">{new Date(selected.created_at).toLocaleString("de-DE")} • #{selected.id}</div>

            {graph && (
              <div className="mt-7 pt-6 border-t border-border">
                <div className="text-[11px] font-medium tracking-widest uppercase text-muted">Verbindungen</div>
                <ul className="mt-3 space-y-2">
                  {graph.edges
                    .filter((e) => e.source === selected.id || e.target === selected.id)
                    .map((e) => {
                      const otherId = e.source === selected.id ? e.target : e.source;
                      const other = ideas.find((i) => i.id === otherId);
                      return (
                        <li key={e.id} className="group flex items-center gap-2.5 bg-bg border border-border rounded-xl px-3 py-2.5 hover:border-white/10 transition">
                          <span className="w-6 h-6 rounded-lg bg-surface border border-border grid place-items-center text-[10px] font-bold" style={{ color: typeMeta[e.type]?.color }}>
                            {typeMeta[e.type]?.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-medium" style={{ color: typeMeta[e.type]?.color }}>
                              {e.type}
                              {e.label ? ` • ${e.label}` : ""}
                            </div>
                            <div className="text-[13px] font-medium text-heading truncate">
                              {e.source === selected.id ? "→" : "←"} {other?.title || `#${otherId}`}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  {graph.edges.filter((e) => e.source === selected.id || e.target === selected.id).length === 0 && (
                    <li className="text-[13px] text-muted py-2">Keine Verbindungen — im Ideen-Tab erstellen.</li>
                  )}
                </ul>
              </div>
            )}

            <div className="mt-8 flex gap-2">
              <button onClick={() => setSelected(null)} className="flex-1 h-9 rounded-xl bg-bg border border-border text-[13px] font-medium text-heading hover:bg-white/[0.04] transition">
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
