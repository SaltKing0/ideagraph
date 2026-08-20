import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { api } from "../api";
import type { Graph, Idea } from "../types";

type D3Node = Graph["nodes"][0] & { x?: number; y?: number; fx?: number | null; fy?: number | null };
type D3Link = { id: number; source: D3Node | number; target: D3Node | number; type: string; label?: string | null };

export default function GraphView() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selected, setSelected] = useState<Idea | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [filterTag, setFilterTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  const allTags = Array.from(new Set(ideas.flatMap((i) => i.tags))).sort();

  const colorFor = (node: D3Node) => {
    const tag = node.tags[0] || "untagged";
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    // keep within indigo/violet family variation but allow full spectrum subtly
    return `hsl(${hue} 72% 62%)`;
  };

  const typeColor: Record<string, string> = {
    "entstand aus": "#6366f1",
    "ähnlich zu": "#22d3ee",
    "kontrastiert mit": "#f472b6",
  };

  useEffect(() => {
    if (!graph || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = 640;

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    // defs – glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // premium glow for accent
    const filterAccent = defs.append("filter").attr("id", "accentGlow");
    filterAccent.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
    filterAccent.append("feColorMatrix").attr("type", "matrix").attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0");

    let nodes: D3Node[] = graph.nodes.map((n) => ({ ...n }));
    let links: D3Link[] = graph.edges.map((e) => ({ ...e }));

    if (filterTag) {
      const keepIds = new Set(nodes.filter((n) => n.tags.includes(filterTag)).map((n) => n.id));
      nodes = nodes.filter((n) => keepIds.has(n.id));
      links = links.filter((l) => keepIds.has(l.source as number) && keepIds.has(l.target as number));
    }

    if (nodes.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#a1a1aa")
        .attr("font-size", "13px")
        .text(filterTag ? `Keine Ideen mit Tag "${filterTag}"` : "Noch keine Ideen – erstelle Ideen, um den Graph zu sehen");
      return;
    }

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3.5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    // smooth transition
    svg.call(zoom as any).on("dblclick.zoom", null);

    const simNodes = nodes as any[];
    const simLinks = links.map((l) => ({ ...l })) as any[];

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3.forceLink(simLinks).id((d: any) => d.id).distance(150).strength(0.45)
      )
      .force("charge", d3.forceManyBody().strength(-620))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(52));

    // Edges – thin, semi-transparent
    const link = g
      .append("g")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d: any) => typeColor[d.type] || "rgba(161,161,170,0.25)")
      .attr("stroke-width", 1.2)
      .attr("stroke-opacity", 0.55)
      .attr("stroke-linecap", "round");

    // Edge labels – subtle
    const linkLabel = g
      .append("g")
      .selectAll("text")
      .data(simLinks)
      .join("text")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("letter-spacing", "0.02em")
      .attr("fill", "#71717a")
      .attr("text-anchor", "middle")
      .attr("paint-order", "stroke")
      .attr("stroke", "#09090b")
      .attr("stroke-width", "4px")
      .attr("stroke-linejoin", "round")
      .text((d: any) => d.type);

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
            if (!event.active) simulation.alphaTarget(0.3).restart();
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

    // outer glow circle
    node
      .append("circle")
      .attr("r", 26)
      .attr("fill", (d: any) => colorFor(d))
      .attr("opacity", 0.16)
      .attr("filter", "url(#glow)")
      .attr("class", "transition-all duration-300");

    // main circle – glow on hover via filter
    const circles = node
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d: any) => colorFor(d))
      .attr("stroke", "#09090b")
      .attr("stroke-width", 2.5)
      .attr("filter", "url(#glow)")
      .style("transition", "all 250ms cubic-bezier(0.2,0,0,1)");

    // inner highlight
    node
      .append("circle")
      .attr("r", 6)
      .attr("fill", "white")
      .attr("opacity", 0.9)
      .attr("transform", "translate(-6,-6)")
      .style("pointer-events", "none");

    // initials
    node
      .append("text")
      .text((d: any) => d.title.slice(0, 2).toUpperCase())
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.04em")
      .style("pointer-events", "none");

    // labels under node
    const labels = node
      .append("text")
      .text((d: any) => (d.title.length > 18 ? d.title.slice(0, 18) + "…" : d.title))
      .attr("y", 34)
      .attr("text-anchor", "middle")
      .attr("fill", "#fafafa")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .attr("paint-order", "stroke")
      .attr("stroke", "#09090b")
      .attr("stroke-width", "5px")
      .attr("stroke-linejoin", "round");

    // interactions
    node
      .on("mouseenter", (_event, d: any) => {
        setHovered(d.id);
        d3.select(_event.currentTarget).selectAll("circle").filter((_ : any, i: number) => i === 1).attr("r", 24).attr("stroke-width", 3);
      })
      .on("mouseleave", (_event) => {
        setHovered(null);
        d3.select(_event.currentTarget).selectAll("circle").filter((_ : any, i: number) => i === 1).attr("r", 20).attr("stroke-width", 2.5);
      })
      .on("click", (_event, d: any) => {
        const idea = ideas.find((i) => i.id === d.id) || null;
        setSelected(idea);
      });

    // tooltip native
    node.append("title").text((d: any) => `${d.title}\nTags: ${d.tags.join(", ") || "—"}\n${d.description || ""}`);

    // pulse ring for hovered node (optional via react state, but also handle visually)
    void circles;
    void labels;

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, ideas, filterTag]);

  useEffect(() => {
    const onResize = () => graph && setGraph({ ...graph });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [graph]);

  if (loading)
    return (
      <div className="p-6 md:p-10 space-y-4">
        <div className="h-8 w-48 bg-border/50 rounded-xl animate-skeleton" />
        <div className="h-[640px] bg-surface border border-border rounded-2xl animate-skeleton" />
      </div>
    );
  if (err) return <div className="p-8 text-red-400">Fehler: {err}</div>;

  const hoveredIdea = hovered ? ideas.find((i) => i.id === hovered) : null;

  return (
    <div className="p-6 md:p-10 space-y-5 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <h1 className="text-[30px] md:text-[32px] font-semibold tracking-[-0.03em] text-heading leading-none">Graph</h1>
          <p className="mt-2 text-[13px] text-muted">
            {graph?.nodes.length || 0} Nodes • {graph?.edges.length || 0} Edges • <span className="text-heading">Force-directed • D3</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="h-9 bg-surface border border-border rounded-xl px-3 text-[13px] text-heading focus:outline-none focus:border-accent/40 transition"
          >
            <option value="">Alle Tags (Farbe)</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <button onClick={fetchData} className="h-9 px-4 rounded-xl bg-heading text-bg text-[13px] font-semibold hover:bg-white transition flex items-center gap-2">
            ↻ Aktualisieren
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted tracking-widest uppercase font-medium">Legende</span>
        <span className="px-2.5 py-1 rounded-full border text-[11px] font-medium" style={{ borderColor: typeColor["entstand aus"], color: typeColor["entstand aus"], background: "rgba(99,102,241,0.08)" }}>
          ─ entstand aus
        </span>
        <span className="px-2.5 py-1 rounded-full border" style={{ borderColor: typeColor["ähnlich zu"], color: typeColor["ähnlich zu"], background: "rgba(34,211,238,0.08)" }}>
          ─ ähnlich zu
        </span>
        <span className="px-2.5 py-1 rounded-full border" style={{ borderColor: typeColor["kontrastiert mit"], color: typeColor["kontrastiert mit"], background: "rgba(244,114,182,0.08)" }}>
          ─ kontrastiert mit
        </span>
        <span className="text-muted ml-2 hidden sm:inline">Hover skaliert Node • Glow via SVG Filter • Dot-Grid</span>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="card overflow-hidden p-0 border-white/[0.06] bg-[#0a0a0f] dot-grid relative"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)" }}
        >
          <svg ref={svgRef} className="w-full block" style={{ height: 640, background: "transparent" }} />
          {/* Hover preview – premium */}
          {hoveredIdea && (
            <div className="absolute left-4 top-4 max-w-[320px] card p-4 animate-slide-up pointer-events-none border-white/10">
              <div className="text-[11px] font-medium tracking-widest uppercase text-accent">Preview</div>
              <div className="mt-1 text-[14px] font-semibold tracking-tight text-heading leading-tight">{hoveredIdea.title}</div>
              <div className="mt-1.5 text-[12px] leading-relaxed text-muted line-clamp-2">{hoveredIdea.description || "Keine Beschreibung"}</div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {hoveredIdea.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-1 rounded-full bg-accentSoft border border-accent/20 text-accent">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Controls hint */}
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5 text-[11px] text-muted bg-bg/80 backdrop-blur border border-border rounded-full px-3 py-1.5">
            <span>⤢</span> Zoom • <span>✋</span> Pan • <span>↔</span> Drag
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted/70 text-center">Smooth Zoom 300ms • Nodes mit Glow (feGaussianBlur) • Raycast-inspiriert</p>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-bg/70 backdrop-blur-xl" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[520px] card p-7 animate-slide-up border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent2 grid place-items-center text-white font-semibold shadow-glow">
              {selected.title.slice(0, 1).toUpperCase()}
            </div>
            <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-heading leading-tight">{selected.title}</h2>
            <div className="mt-2 text-[11px] text-muted border border-border rounded-full inline-flex px-2.5 py-1 bg-bg">
              {new Date(selected.created_at).toLocaleString("de-DE")} • #{selected.id}
            </div>
            {selected.description && <p className="mt-4 text-[13px] leading-relaxed text-muted">{selected.description}</p>}
            {selected.source && (
              <div className="mt-3 text-[13px] px-3 py-2 rounded-xl bg-bg border border-border">
                <span className="text-muted">Quelle</span> <span className="text-heading ml-2">{selected.source}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {selected.tags.map((t) => (
                <span key={t} className="text-[12px] bg-accentSoft border border-accent/20 text-accent px-3 py-1 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
            {graph && (
              <div className="mt-6 pt-5 border-t border-border/60">
                <div className="text-[11px] font-medium tracking-widest uppercase text-muted">Verbindungen</div>
                <ul className="mt-3 space-y-2">
                  {graph.edges
                    .filter((e) => e.source === selected.id || e.target === selected.id)
                    .map((e) => {
                      const otherId = e.source === selected.id ? e.target : e.source;
                      const other = ideas.find((i) => i.id === otherId);
                      return (
                        <li key={e.id} className="flex items-center gap-2 text-[13px] bg-bg border border-border rounded-xl px-3 py-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: typeColor[e.type] }} />
                          <span className="font-medium" style={{ color: typeColor[e.type] }}>
                            {e.type}
                          </span>
                          <span className="text-muted">{e.source === selected.id ? "→" : "←"}</span>
                          <span className="text-heading font-medium truncate">{other?.title || `#${otherId}`}</span>
                          {e.label && <span className="text-muted text-xs ml-auto">({e.label})</span>}
                        </li>
                      );
                    })}
                  {graph.edges.filter((e) => e.source === selected.id || e.target === selected.id).length === 0 && (
                    <li className="text-[13px] text-muted">Keine Verbindungen.</li>
                  )}
                </ul>
              </div>
            )}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-xl bg-surface border border-border text-muted hover:text-heading transition"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
