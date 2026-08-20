import SwiftUI
import Combine

struct GraphView: View {
    @State private var graph: Graph?
    @State private var ideas: [Idea] = []
    @State private var loading = true
    @State private var error: String?
    @State private var filterTag = "Alle"
    @State private var search = ""
    @State private var selectedIdea: Idea?
    @State private var hoveredId: Int?
    @StateObject private var sidecar = SidecarManager.shared

    private var allTags: [String] {
        let s = Set(ideas.flatMap { $0.tags })
        return ["Alle"] + s.sorted()
    }

    var body: some View {
        VStack(spacing: 0) {
            header.padding(16)
            Divider()
            if !sidecar.isReady && loading {
                VStack(spacing: 8) {
                    ProgressView("Backend startet… Port \(sidecar.port)").frame(maxWidth: .infinity, maxHeight: .infinity)
                    Text(sidecar.baseURL.absoluteString).font(.system(size: 11)).foregroundStyle(.secondary)
                }
            } else if loading {
                ProgressView("Lade Graph…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = error {
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle").foregroundStyle(.red)
                    Text(error).font(.system(size: 12)).foregroundStyle(.secondary).multilineTextAlignment(.center).padding(.horizontal)
                    Text("Sidecar \(sidecar.baseURL.absoluteString) – \(sidecar.isReady ? "läuft" : "wartet…")").font(.system(size: 11)).foregroundStyle(.secondary)
                    Button("Neu laden") { Task { await load() } }.buttonStyle(.bordered).controlSize(.small)
                }.frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let graph = graph {
                GraphCanvas(graph: graph, ideas: ideas, filterTag: $filterTag, search: $search, selectedIdea: $selectedIdea, hoveredId: $hoveredId)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(nsColor: .windowBackgroundColor))
            }
        }
        .task { await load() }
        .sheet(item: $selectedIdea) { idea in
            IdeaDetailSheet(idea: idea, onEdit: {}, onDelete: {})
                .frame(width: 460)
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Graph").font(.system(size: 20, weight: .semibold, design: .rounded))
                if let graph = graph {
                    Text("\(graph.nodes.count) Nodes • \(graph.edges.count) Edges • Force-directed • D3-Äquivalent").font(.system(size: 11)).foregroundStyle(.secondary)
                } else {
                    Text("Force-directed • SwiftUI Canvas").font(.system(size: 11)).foregroundStyle(.secondary)
                }
            }
            Spacer()
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.secondary).font(.system(size: 11))
                    TextField("Filter Titel/Tags…", text: $search).font(.system(size: 12)).textFieldStyle(.plain).frame(width: 160)
                    if !search.isEmpty { Button { search = "" } label: { Image(systemName: "xmark.circle.fill").font(.system(size: 11)).foregroundStyle(.secondary) }.buttonStyle(.plain) }
                }.padding(.horizontal, 10).padding(.vertical, 6).background(RoundedRectangle(cornerRadius: 8).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                Picker("", selection: $filterTag) {
                    ForEach(allTags, id: \.self) { t in Text(t == "Alle" ? "Alle Tags" : "#\(t)").tag(t) }
                }.frame(width: 150).labelsHidden()
                Button { Task { await load() } } label: { Image(systemName: "arrow.clockwise").font(.system(size: 11)) }.help("Aktualisieren").buttonStyle(.bordered).controlSize(.small)
            }
        }
    }

    private func load() async {
        loading = true
        for _ in 0..<20 {
            if sidecar.isReady { break }
            try? await Task.sleep(nanoseconds: 500_000_000)
        }
        for attempt in 0..<5 {
            do {
                async let g = APIClient.shared.getGraph()
                async let is_ = APIClient.shared.listIdeas()
                graph = try await g
                ideas = try await is_
                error = nil
                loading = false
                return
            } catch {
                if attempt == 4 { self.error = error.localizedDescription + " (Port \(sidecar.port))" }
                try? await Task.sleep(nanoseconds: 700_000_000)
            }
        }
        loading = false
    }
}

// MARK: - Canvas with Force Simulation

struct GraphCanvas: View {
    var graph: Graph
    var ideas: [Idea]
    @Binding var filterTag: String
    @Binding var search: String
    @Binding var selectedIdea: Idea?
    @Binding var hoveredId: Int?

    @State private var nodes: [NodeState] = []
    @State private var edges: [EdgeState] = []
    @State private var scale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var dragNodeId: Int?
    @State private var isPanning = false
    @State private var lastPan: CGSize = .zero

    // For simulation timer
    @State private var timerCancellable: AnyCancellable?

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            ZStack {
                // Grid background
                Canvas { ctx, sz in
                    // grid lines very subtle
                    ctx.fill(Path(CGRect(origin: .zero, size: sz)), with: .color(Color(nsColor: .windowBackgroundColor)))
                    let grid: CGFloat = 28
                    ctx.stroke(Path { p in
                        for x in stride(from: 0, through: sz.width, by: grid) { p.move(to: CGPoint(x: x, y: 0)); p.addLine(to: CGPoint(x: x, y: sz.height)) }
                        for y in stride(from: 0, through: sz.height, by: grid) { p.move(to: CGPoint(x: 0, y: y)); p.addLine(to: CGPoint(x: sz.width, y: y)) }
                    }, with: .color(Color.white.opacity(0.04)), lineWidth: 0.5)
                }.allowsHitTesting(false)

                Canvas { ctx, sz in
                    // Apply pan/zoom transform
                    ctx.translateBy(x: offset.width, y: offset.height)
                    ctx.scaleBy(x: scale, y: scale)

                    // Edges
                    for edge in edges {
                        guard let s = nodes.first(where: { $0.id == edge.source }), let t = nodes.first(where: { $0.id == edge.target }) else { continue }
                        let isHighlighted = isEdgeHighlighted(edge: edge)
                        let color: Color = edgeColor(for: edge.type).opacity(isHighlighted ? 0.9 : 0.35)
                        let width: CGFloat = isHighlighted ? 1.6 : 1.0
                        var path = Path()
                        path.move(to: CGPoint(x: s.x, y: s.y))
                        path.addLine(to: CGPoint(x: t.x, y: t.y))
                        // dash per type
                        let dash: [CGFloat]? = dashForType(edge.type)
                        ctx.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: width, lineCap: .round, dash: dash ?? []))

                        // Label pill at midpoint
                        let mx = (s.x + t.x) / 2
                        let my = (s.y + t.y) / 2
                        let label = edge.type
                        let font = NSFont.systemFont(ofSize: 8, weight: .medium)
                        let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor(colorForTypeLabel(edge.type))]
                        let size = (label as NSString).size(withAttributes: attrs)
                        let rect = CGRect(x: mx - size.width/2 - 6, y: my - 9, width: size.width + 12, height: 14)
                        ctx.fill(Path(roundedRect: rect, cornerRadius: 6), with: .color(Color(nsColor: .controlBackgroundColor).opacity(isHighlighted ? 1 : 0.9)))
                        ctx.stroke(Path(roundedRect: rect, cornerRadius: 6), with: .color(Color.white.opacity(0.06)), lineWidth: 0.5)
                        ctx.draw(Text(label).font(.system(size: 8, weight: .medium)).foregroundStyle(colorForTypeLabel(edge.type)), at: CGPoint(x: mx, y: my), anchor: .center)
                    }

                    // Nodes (absolute coordinates, no saveGState)
                    for node in nodes {
                        let isHovered = hoveredId == node.id
                        let isSelected = selectedIdea?.id == node.id
                        let isFocused = isHovered || isSelected
                        let isDimmed = isDimmed(node: node)

                        // Shadow for node
                        ctx.addFilter(.shadow(color: .black.opacity(0.35), radius: 8, x: 0, y: 4))

                        // Outer ring for focused
                        if isFocused {
                            let ring = Path(ellipseIn: CGRect(x: node.x - 28, y: node.y - 28, width: 56, height: 56))
                            ctx.stroke(ring, with: .color(.indigo.opacity(0.9)), lineWidth: 1.2)
                            ctx.addFilter(.shadow(color: .indigo.opacity(0.4), radius: 12))
                        }

                        // Main circle
                        let mainStroke: Color = isFocused ? .indigo : Color(nsColor: .separatorColor)
                        let fillColor = isFocused ? Color.indigo.opacity(0.18) : Color(nsColor: .controlBackgroundColor)
                        ctx.fill(Path(ellipseIn: CGRect(x: node.x - 20, y: node.y - 20, width: 40, height: 40)), with: .color(fillColor))
                        ctx.stroke(Path(ellipseIn: CGRect(x: node.x - 20, y: node.y - 20, width: 40, height: 40)), with: .color(mainStroke), lineWidth: isFocused ? 1.4 : 1)

                        // Tag dot small bottom-right
                        let dotColor = node.tags.first.map { colorForTagDot($0) } ?? Color(nsColor: .separatorColor)
                        ctx.fill(Path(ellipseIn: CGRect(x: node.x + 10, y: node.y + 10, width: 10, height: 10)), with: .color(dotColor))
                        ctx.stroke(Path(ellipseIn: CGRect(x: node.x + 10, y: node.y + 10, width: 10, height: 10)), with: .color(Color(nsColor: .windowBackgroundColor)), lineWidth: 2)

                        // Letter
                        let letter = String(node.title.prefix(1).uppercased())
                        ctx.draw(Text(letter).font(.system(size: 11, weight: .bold, design: .rounded)).foregroundStyle(.primary), at: CGPoint(x: node.x, y: node.y), anchor: .center)

                        // Label below
                        let label = node.title.count > 16 ? String(node.title.prefix(16)) + "…" : node.title
                        let labelFont = NSFont.systemFont(ofSize: 10, weight: .medium)
                        let attrs: [NSAttributedString.Key: Any] = [.font: labelFont]
                        let size = (label as NSString).size(withAttributes: attrs)
                        let w = min(120, size.width + 16)
                        let rect = CGRect(x: node.x - w/2, y: node.y + 26, width: w, height: 18)
                        let bgOpacity: Double = isDimmed ? 0.4 : 0.92
                        ctx.fill(Path(roundedRect: rect, cornerRadius: 8), with: .color(Color(nsColor: .controlBackgroundColor).opacity(bgOpacity)))
                        ctx.stroke(Path(roundedRect: rect, cornerRadius: 8), with: .color(Color.white.opacity(0.07)), lineWidth: 0.5)
                        ctx.draw(Text(label).font(.system(size: 10, weight: .medium)).foregroundStyle(isDimmed ? Color.secondary.opacity(0.6) : Color.primary), at: CGPoint(x: node.x, y: node.y + 35), anchor: .center)

                        _ = isDimmed
                    }
                }
                .contentShape(Rectangle())
                .gesture(
                    SimultaneousGesture(
                        MagnificationGesture().onChanged { v in
                            let newScale = max(0.4, min(3.0, scale * v))
                            // Keep centered
                            scale = newScale
                        },
                        DragGesture(minimumDistance: 2, coordinateSpace: .local)
                            .onChanged { value in
                                let loc = value.location
                                // Transform to canvas coordinates
                                let canvasLoc = CGPoint(x: (loc.x - offset.width) / scale, y: (loc.y - offset.height) / scale)
                                if let hit = hitTest(at: canvasLoc) {
                                    if dragNodeId == nil {
                                        dragNodeId = hit
                                    }
                                    if let idx = nodes.firstIndex(where: { $0.id == dragNodeId }) {
                                        nodes[idx].x = canvasLoc.x
                                        nodes[idx].y = canvasLoc.y
                                        nodes[idx].fx = canvasLoc.x
                                        nodes[idx].fy = canvasLoc.y
                                    }
                                } else {
                                    // Pan
                                    if dragNodeId == nil {
                                        if !isPanning {
                                            isPanning = true
                                            lastPan = offset
                                        }
                                        offset = CGSize(width: lastPan.width + value.translation.width, height: lastPan.height + value.translation.height)
                                    }
                                }
                                // hover update
                                hoveredId = hitTest(at: canvasLoc)
                            }
                            .onEnded { _ in
                                if let id = dragNodeId, let idx = nodes.firstIndex(where: { $0.id == id }) {
                                    nodes[idx].fx = nil
                                    nodes[idx].fy = nil
                                }
                                dragNodeId = nil
                                isPanning = false
                                // click detection: if small movement, treat as tap
                                // We handle tap via separate TapGesture below via onTap
                            }
                    )
                )
                .simultaneousGesture(
                    TapGesture(count: 1).onEnded {
                        // Use last hovered for tap
                        if let hid = hoveredId, let node = nodes.first(where: { $0.id == hid }) {
                            Task {
                                // Fetch full idea
                                if let idea = try? await APIClient.shared.getIdea(id: node.id) {
                                    selectedIdea = idea
                                } else if let idea = ideas.first(where: { $0.id == node.id }) {
                                    selectedIdea = idea
                                }
                            }
                        }
                    }
                )
                .onContinuousHover { phase in
                    switch phase {
                    case .active(let loc):
                        let canvasLoc = CGPoint(x: (loc.x - offset.width) / scale, y: (loc.y - offset.height) / scale)
                        hoveredId = hitTest(at: canvasLoc)
                    case .ended:
                        hoveredId = nil
                    }
                }

                // Zoom controls
                VStack {
                    HStack {
                        Spacer()
                        VStack(spacing: 4) {
                            Button { withAnimation(.easeInOut(duration: 0.3)) { scale = min(3.0, scale * 1.25) } } label: { Image(systemName: "plus.magnifyingglass").font(.system(size: 11)) }.buttonStyle(.bordered).controlSize(.small)
                            Button { withAnimation(.easeInOut(duration: 0.3)) { scale = max(0.4, scale * 0.8) } } label: { Image(systemName: "minus.magnifyingglass").font(.system(size: 11)) }.buttonStyle(.bordered).controlSize(.small)
                            Divider().frame(width: 24)
                            Button { withAnimation(.easeInOut(duration: 0.4)) { scale = 1.0; offset = .zero } } label: { Text("Fit").font(.system(size: 10, weight: .medium)) }.buttonStyle(.bordered).controlSize(.small)
                        }.padding(6).background(RoundedRectangle(cornerRadius: 10).fill(Color(nsColor: .controlBackgroundColor).opacity(0.9)).overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)).shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4))
                    }
                    Spacer()
                    HStack {
                        Text("Drag • Scroll-Zoom • Click → Details").font(.system(size: 10)).foregroundStyle(.secondary).padding(.horizontal, 10).padding(.vertical, 6).background(Capsule().fill(Color(nsColor: .controlBackgroundColor).opacity(0.9)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                        Spacer()
                        if search != "" || filterTag != "Alle" {
                            Button("Filter löschen") { search = ""; filterTag = "Alle" }.font(.system(size: 11, weight: .medium)).buttonStyle(.borderedProminent).tint(.indigo).controlSize(.small)
                        }
                    }
                }.padding(12)
            }
            .onAppear { resetSimulation(size: size) }
            .onChange(of: graph) { _ in resetSimulation(size: size) }
            .onChange(of: filterTag) { _ in resetSimulation(size: size) }
            .onChange(of: search) { _ in resetSimulation(size: size) }
            .onChange(of: size) { newSize in resetSimulation(size: newSize) }
            .onReceive(Timer.publish(every: 1.0/60, on: .main, in: .common).autoconnect()) { _ in tick() }
        }
    }

    // MARK: - Simulation
    private func resetSimulation(size: CGSize) {
        let filteredNodes = filteredNodes()
        let filteredEdges = filteredEdges(nodes: filteredNodes)
        // Initialize positions randomly around center or keep existing if same ids
        var newNodes: [NodeState] = []
        for n in filteredNodes {
            if let existing = nodes.first(where: { $0.id == n.id }) {
                newNodes.append(existing)
            } else {
                let angle = Double.random(in: 0..<2*Double.pi)
                let r = Double.random(in: 0..<80)
                let cx = Double(size.width/2), cy = Double(size.height/2)
                newNodes.append(NodeState(id: n.id, title: n.title, tags: n.tags, x: cx + cos(angle)*r, y: cy + sin(angle)*r, vx: 0, vy: 0))
            }
        }
        nodes = newNodes
        edges = filteredEdges.map { EdgeState(id: $0.id, source: $0.source, target: $0.target, type: $0.type, label: $0.label) }
        // Reset forces
        if nodes.count > 0 {
            // Center offset
            offset = .zero
            scale = 1.0
        }
    }

    private func filteredNodes() -> [GraphNode] {
        var list = graph.nodes
        if filterTag != "Alle" {
            list = list.filter { $0.tags.contains(filterTag) }
        }
        if !search.trimmingCharacters(in: .whitespaces).isEmpty {
            let s = search.lowercased()
            list = list.filter { $0.title.lowercased().contains(s) || $0.tags.joined(separator: " ").lowercased().contains(s) }
        }
        return list
    }

    private func filteredEdges(nodes: [GraphNode]) -> [GraphEdge] {
        let ids = Set(nodes.map { $0.id })
        let list = graph.edges.filter { ids.contains($0.source) && ids.contains($0.target) }
        return list
    }

    private func tick() {
        guard !nodes.isEmpty else { return }
        let centerX = 400.0 // will be updated via geometry? use fixed 400,600 approx center, simulation still works with pan/zoom
        let centerY = 310.0
        let n = nodes.count
        // Repulsion
        for i in 0..<n {
            for j in i+1..<n {
                let dx = nodes[i].x - nodes[j].x
                let dy = nodes[i].y - nodes[j].y
                var dist2 = dx*dx + dy*dy
                dist2 = max(1, dist2)
                let dist = sqrt(dist2)
                let force = 2600 / dist2 // ManyBody
                let fx = force * dx / dist
                let fy = force * dy / dist
                if nodes[i].fx == nil { nodes[i].vx += fx * 0.02 }
                if nodes[j].fx == nil { nodes[j].vx -= fx * 0.02 }
                if nodes[i].fy == nil { nodes[i].vy += fy * 0.02 }
                if nodes[j].fy == nil { nodes[j].vy -= fy * 0.02 }
            }
        }
        // Attraction along edges
        for e in edges {
            guard let si = nodes.firstIndex(where: { $0.id == e.source }), let ti = nodes.firstIndex(where: { $0.id == e.target }) else { continue }
            let dx = nodes[ti].x - nodes[si].x
            let dy = nodes[ti].y - nodes[si].y
            let dist = max(1, sqrt(dx*dx + dy*dy))
            let desired: Double = 130
            let diff = dist - desired
            let k: Double = 0.06
            let fx = k * diff * dx / dist
            let fy = k * diff * dy / dist
            if nodes[si].fx == nil { nodes[si].vx += fx; nodes[si].vy += fy }
            if nodes[ti].fx == nil { nodes[ti].vx -= fx; nodes[ti].vy -= fy }
        }
        // Center gravity and update
        for i in 0..<n {
            if nodes[i].fx != nil && nodes[i].fy != nil {
                nodes[i].x = nodes[i].fx!
                nodes[i].y = nodes[i].fy!
                nodes[i].vx = 0; nodes[i].vy = 0
                continue
            }
            // center
            let dx = centerX - nodes[i].x
            let dy = centerY - nodes[i].y
            nodes[i].vx += dx * 0.008
            nodes[i].vy += dy * 0.008
            // velocity decay
            nodes[i].vx *= 0.88
            nodes[i].vy *= 0.88
            nodes[i].x += nodes[i].vx
            nodes[i].y += nodes[i].vy
            // clamp to bounds
            nodes[i].x = max(40, min(760, nodes[i].x))
            nodes[i].y = max(40, min(580, nodes[i].y))
        }
        // Collision simple
        for i in 0..<n {
            for j in i+1..<n {
                let dx = nodes[i].x - nodes[j].x
                let dy = nodes[i].y - nodes[j].y
                let dist = sqrt(dx*dx+dy*dy)
                let minDist: Double = 48
                if dist < minDist && dist > 0 {
                    let overlap = (minDist - dist) / 2
                    let nx = dx / dist, ny = dy / dist
                    if nodes[i].fx == nil { nodes[i].x += nx * overlap; nodes[i].y += ny * overlap }
                    if nodes[j].fx == nil { nodes[j].x -= nx * overlap; nodes[j].y -= ny * overlap }
                }
            }
        }
    }

    private func hitTest(at point: CGPoint) -> Int? {
        for node in nodes {
            let dx = Double(point.x - CGFloat(node.x))
            let dy = Double(point.y - CGFloat(node.y))
            if sqrt(dx*dx+dy*dy) < 22 { return node.id }
        }
        return nil
    }

    private func isEdgeHighlighted(edge: EdgeState) -> Bool {
        guard let hid = hoveredId ?? selectedIdea?.id else { return false }
        return edge.source == hid || edge.target == hid
    }

    private func isDimmed(node: NodeState) -> Bool {
        guard let hid = hoveredId ?? selectedIdea?.id else { return false }
        if node.id == hid { return false }
        // check if neighbor
        for e in edges {
            if (e.source == hid && e.target == node.id) || (e.target == hid && e.source == node.id) { return false }
        }
        return true
    }

    private func edgeColor(for type: String) -> Color {
        switch type {
        case "entstand aus": return .indigo
        case "ähnlich zu": return Color(nsColor: .secondaryLabelColor)
        case "kontrastiert mit": return .pink
        default: return Color(nsColor: .separatorColor)
        }
    }

    private func colorForTypeLabel(_ type: String) -> Color {
        switch type {
        case "entstand aus": return .indigo
        case "ähnlich zu": return .secondary
        case "kontrastiert mit": return .pink
        default: return .secondary
        }
    }

    private func dashForType(_ type: String) -> [CGFloat]? {
        switch type {
        case "ähnlich zu": return [4,4]
        case "kontrastiert mit": return [2,6]
        default: return nil
        }
    }

    private func colorForTagDot(_ tag: String) -> Color {
        var hash = 0
        for c in tag.unicodeScalars { hash = (hash &* 31) &+ Int(c.value) }
        let hue = Double(abs(hash) % 360) / 360.0
        return Color(hue: hue, saturation: 0.65, brightness: 0.85)
    }
}

// MARK: - State models
struct NodeState: Identifiable, Equatable {
    var id: Int
    var title: String
    var tags: [String]
    var x: Double
    var y: Double
    var vx: Double = 0
    var vy: Double = 0
    var fx: Double?
    var fy: Double?
}

struct EdgeState: Identifiable, Equatable {
    var id: Int
    var source: Int
    var target: Int
    var type: String
    var label: String?
}
