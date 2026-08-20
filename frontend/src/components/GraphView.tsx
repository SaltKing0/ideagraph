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

  // derived all tags
  const allTags = Array.from(new Set(ideas.flatMap((i) => i.tags))).sort();

  // color scale by tag
  const colorFor = (node: D3Node) => {
    const tag = node.tags[0] || "untagged";
    // simple hash -> hsl
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    return `hsl(${hue} 70% 60%)`;
  };

  const typeColor: Record<string, string> = {
    "entstand aus": "#a78bfa",
    "ähnlich zu": "#22d3ee",
    "kontrastiert mit": "#f472b6",
  };

  useEffect(() => {
    if (!graph || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = 600;

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    // filter nodes by tag if filter active
    let nodes: D3Node[] = graph.nodes.map((n) => ({ ...n }));
    let links: D3Link[] = graph.edges.map((e) => ({ ...e }));

    if (filterTag) {
      const keepIds = new Set(nodes.filter((n) => n.tags.includes(filterTag)).map((n) => n.id));
      // keep nodes that have tag plus their neighbors (to preserve edges visibility optionally)
      // simpler: only keep matching nodes and edges between them
      nodes = nodes.filter((n) => keepIds.has(n.id));
      links = links.filter((l) => keepIds.has(l.source as number) && keepIds.has(l.target as number));
    }

    if (nodes.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#9ca3af")
        .text(filterTag ? `Keine Ideen mit Tag "${filterTag}"` : "Noch keine Ideen – erstelle Ideen, um den Graph zu sehen");
      return;
    }

    const g = svg.append("g");

    // zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom as any);

    // simulation
    const simNodes = nodes as any[];
    const simLinks = links.map((l) => ({ ...l })) as any[];

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(140)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(45));

    // edges
    const link = g
      .append("g")
      .attr("stroke-opacity", 0.8)
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d: any) => typeColor[d.type] || "#52525b")
      .attr("stroke-width", 1.8);

    // edge labels
    const linkLabel = g
      .append("g")
      .selectAll("text")
      .data(simLinks)
      .join("text")
      .attr("font-size", "10px")
      .attr("fill", "#a1a1aa")
      .attr("text-anchor", "middle")
      .text((d: any) => d.type);

    // nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(simNodes)
      .join("g")
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

    node
      .append("circle")
      .attr("r", 22)
      .attr("fill", (d: any) => colorFor(d))
      .attr("stroke", "#18181b")
      .attr("stroke-width", 3)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        const idea = ideas.find((i) => i.id === d.id) || null;
        setSelected(idea);
      });

    node
      .append("text")
      .text((d: any) => d.title.slice(0, 2).toUpperCase())
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .style("pointer-events", "none");

    const labels = node
      .append("text")
      .text((d: any) => d.title.length > 18 ? d.title.slice(0, 18) + "…" : d.title)
      .attr("y", 32)
      .attr("text-anchor", "middle")
      .attr("fill", "#d4d4d8")
      .attr("font-size", "11px")
      .style("pointer-events", "none")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0f0f12")
      .attr("stroke-width", "3px")
      .attr("stroke-linejoin", "round");

    // tooltip title
    node.append("title").text((d: any) => `${d.title}\nTags: ${d.tags.join(", ") || "—"}\n${d.description || ""}`);

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
      void labels;
    });

    return () => {
      simulation.stop();
    };
  }, [graph, ideas, filterTag]);

  useEffect(() => {
    const onResize = () => {
      if (graph) {
        // trigger re-render by shallow copy
        setGraph({ ...graph });
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [graph]);

  if (loading) return <div className="p-8 text-muted">Lade Graph …</div>;
  if (err) return <div className="p-8 text-red-400">Fehler: {err}</div>;

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Graph</h1>
          <p className="text-sm text-muted mt-1">
            {graph?.nodes.length || 0} Nodes · {graph?.edges.length || 0} Edges · Zoom, Pan, Drag & Drop
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Alle Tags (Farbe)</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button onClick={fetchData} className="bg-card border border-border rounded-lg px-3 py-2 text-sm hover:border-accent">
            ↻ Update
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted">Typen:</span>
        <span className="px-2 py-1 rounded-full border" style={{ borderColor: typeColor["entstand aus"], color: typeColor["entstand aus"] }}>— entstand aus</span>
        <span className="px-2 py-1 rounded-full border" style={{ borderColor: typeColor["ähnlich zu"], color: typeColor["ähnlich zu"] }}>— ähnlich zu</span>
        <span className="px-2 py-1 rounded-full border" style={{ borderColor: typeColor["kontrastiert mit"], color: typeColor["kontrastiert mit"] }}>— kontrastiert mit</span>
        <span className="text-muted ml-2">Farbcodierung: je erster Tag</span>
      </div>

      <div ref={containerRef} className="bg-card border border-border rounded-xl overflow-hidden">
        <svg ref={svgRef} className="w-full block bg-[#121214]" style={{ height: 600 }} />
      </div>

      <p className="text-xs text-muted">Tipp: Ziehe Nodes zum Anordnen. Scroll zum Zoomen. Klick auf Node öffnet Details.</p>

      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-lg p-6">
            <div className="flex justify-between gap-4">
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white text-xl">×</button>
            </div>
            <div className="text-xs text-muted mt-1">{new Date(selected.created_at).toLocaleString("de-DE")}</div>
            {selected.description && <p className="mt-3 text-sm leading-relaxed">{selected.description}</p>}
            {selected.source && <div className="mt-2 text-sm"><span className="text-muted">Quelle:</span> {selected.source}</div>}
            <div className="flex flex-wrap gap-2 mt-3">
              {selected.tags.map((t) => (
                <span key={t} className="text-xs bg-surface border border-border px-2 py-1 rounded-full">#{t}</span>
              ))}
            </div>
            {graph && (
              <div className="mt-4">
                <div className="text-sm font-medium">Verbindungen</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {graph.edges
                    .filter((e) => e.source === selected.id || e.target === selected.id)
                    .map((e) => {
                      const otherId = e.source === selected.id ? e.target : e.source;
                      const other = ideas.find((i) => i.id === otherId);
                      return (
                        <li key={e.id} className="text-muted">
                          <span style={{ color: typeColor[e.type] }}>{e.type}</span> {e.source === selected.id ? "→" : "←"} {other?.title || `#${otherId}`} {e.label ? `(${e.label})` : ""}
                        </li>
                      );
                    })}
                  {graph.edges.filter((e) => e.source === selected.id || e.target === selected.id).length === 0 && (
                    <li className="text-muted">Keine Verbindungen.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
