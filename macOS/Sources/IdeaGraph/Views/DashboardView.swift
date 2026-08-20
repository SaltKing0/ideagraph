import SwiftUI

struct DashboardView: View {
    @State private var stats: Stats?
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                if loading {
                    ProgressView("Lade Dashboard…").frame(maxWidth: .infinity, minHeight: 200)
                } else if let error = error {
                    Text("Fehler: \(error)").foregroundStyle(.red).padding()
                } else if let stats = stats {
                    kpiGrid(stats: stats)
                    HStack(alignment: .top, spacing: 16) {
                        tagCloud(stats: stats)
                        recentList(stats: stats)
                    }
                    heatmap(stats: stats)
                    miniBars(stats: stats)
                }
            }
            .padding(24)
            .frame(maxWidth: 1100)
            .frame(maxWidth: .infinity)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .task { await load() }
        .refreshable { await load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Dashboard • Premium", systemImage: "sparkles")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(Color(nsColor: .controlBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
            Text("Übersicht").font(.system(size: 28, weight: .semibold, design: .rounded)).tracking(-0.5)
            Text("Deine Ideenwelt auf einen Blick — SwiftUI nativ, Sidecar FastAPI.").font(.system(size: 13)).foregroundStyle(.secondary)
        }
    }

    private func kpiGrid(stats: Stats) -> some View {
        HStack(spacing: 12) {
            ForEach([
                (label: "Ideen", value: stats.totalIdeas, sub: "Gesamt erfasst", icon: "lightbulb"),
                (label: "Verbindungen", value: stats.totalConnections, sub: "Edges im Graph", icon: "point.3.connected.trianglepath.dotted"),
                (label: "Tags", value: stats.topTags.count, sub: "Schlagworte", icon: "tag"),
            ], id: \.label) { item in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(item.label.uppercased()).font(.system(size: 10, weight: .medium)).tracking(0.5).foregroundStyle(.secondary)
                        Spacer()
                        Image(systemName: item.icon).font(.system(size: 12)).foregroundStyle(.secondary).frame(width: 28, height: 28).background(RoundedRectangle(cornerRadius: 7).fill(Color(nsColor: .controlBackgroundColor)))
                    }
                    Text("\(item.value)").font(.system(size: 32, weight: .semibold, design: .rounded)).tracking(-1)
                    Text(item.sub).font(.system(size: 11)).foregroundStyle(.secondary)
                }
                .padding(16)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color(nsColor: .controlBackgroundColor)).shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4).overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(nsColor: .separatorColor).opacity(0.4), lineWidth: 1)))
            }
        }
    }

    private func tagCloud(stats: Stats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Tag-Cloud").font(.system(size: 13, weight: .semibold))
                Spacer()
                Text("\(stats.topTags.count) Tags").font(.system(size: 11)).foregroundStyle(.secondary)
            }
            if stats.topTags.isEmpty {
                Text("Noch keine Tags vorhanden.").font(.system(size: 12)).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .center).padding(.vertical, 24).background(RoundedRectangle(cornerRadius: 10).strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4]))).foregroundStyle(Color(nsColor: .separatorColor))
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(stats.topTags) { t in
                        HStack(spacing: 6) {
                            Text("#\(t.tag)").font(.system(size: 12, weight: .medium))
                            Text("\(t.count)").font(.system(size: 10, weight: .semibold)).padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(Color.white.opacity(0.12)))
                        }
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(Capsule().fill(Color(nsColor: .windowBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                    }
                }
                ForEach(stats.topTags.prefix(5), id: \.tag) { t in
                    HStack(spacing: 12) {
                        Text(t.tag).font(.system(size: 12, weight: .medium)).frame(width: 100, alignment: .leading).lineLimit(1)
                        GeometryReader { geo in
                            let maxW = geo.size.width
                            let w = CGFloat(t.count) / CGFloat(max(1, stats.topTags.map{ $0.count }.max() ?? 1)) * maxW
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color(nsColor: .separatorColor).opacity(0.2)).frame(height: 6)
                                Capsule().fill(LinearGradient(colors: [.indigo, .purple], startPoint: .leading, endPoint: .trailing)).frame(width: w, height: 6)
                            }
                        }.frame(height: 6)
                        Text("\(t.count)").font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary).frame(width: 20, alignment: .trailing)
                    }
                }
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(nsColor: .separatorColor).opacity(0.4), lineWidth: 1)))
        .frame(maxWidth: .infinity)
    }

    private func recentList(stats: Stats) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Neueste Ideen").font(.system(size: 13, weight: .semibold))
            Text("Zuletzt erstellt").font(.system(size: 11)).foregroundStyle(.secondary)
            ForEach(stats.recentIdeas) { idea in
                VStack(alignment: .leading, spacing: 6) {
                    Text(idea.title).font(.system(size: 12, weight: .semibold)).lineLimit(1)
                    if let desc = idea.description, !desc.isEmpty {
                        Text(desc).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(2)
                    }
                    HStack(spacing: 6) {
                        Text(idea.createdAt, style: .date).font(.system(size: 10)).foregroundStyle(.secondary)
                        Text("•").font(.system(size: 10)).foregroundStyle(.secondary)
                        Text(idea.tags.joined(separator: " · ")).font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 10).fill(Color(nsColor: .windowBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(nsColor: .separatorColor).opacity(0.3), lineWidth: 1)))
            }
            if stats.recentIdeas.isEmpty {
                Text("Noch keine Ideen.").font(.system(size: 12)).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .center).padding(.vertical, 12)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(nsColor: .separatorColor).opacity(0.4), lineWidth: 1)))
        .frame(width: 320)
    }

    private func heatmap(stats: Stats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Aktivität").font(.system(size: 13, weight: .semibold))
                    Text("Heatmap • Letzte 30 Tage").font(.system(size: 11)).foregroundStyle(.secondary)
                }
                Spacer()
                HStack(spacing: 4) {
                    Text("Weniger").font(.system(size: 10)).foregroundStyle(.secondary)
                    ForEach(0..<4) { i in
                        RoundedRectangle(cornerRadius: 4).fill(heatmapColor(count: i, max: 3)).frame(width: 12, height: 12).overlay(RoundedRectangle(cornerRadius: 4).stroke(Color(nsColor: .separatorColor).opacity(0.3), lineWidth: 0.5))
                    }
                    Text("Mehr").font(.system(size: 10)).foregroundStyle(.secondary)
                }
            }
            let maxC = max(1, stats.heatmap.map{ $0.count }.max() ?? 1)
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(44), spacing: 6), count: 10), spacing: 6) {
                ForEach(stats.heatmap) { d in
                    VStack(spacing: 2) {
                        Text("\(d.count)").font(.system(size: 11, weight: .semibold))
                        Text(formattedHeatmapDate(d.date)).font(.system(size: 8, weight: .medium)).foregroundStyle(.secondary)
                    }
                    .frame(width: 44, height: 44)
                    .background(RoundedRectangle(cornerRadius: 8).fill(heatmapColor(count: d.count, max: maxC)).overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(nsColor: .separatorColor).opacity(0.3), lineWidth: 1)))
                }
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(nsColor: .separatorColor).opacity(0.4), lineWidth: 1)))
    }

    private func miniBars(stats: Stats) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Ideen pro Tag").font(.system(size: 11, weight: .medium)).tracking(0.5).foregroundStyle(.secondary).textCase(.uppercase)
            let maxC = max(1, stats.ideasPerDay.map{ $0.count }.max() ?? 1)
            HStack(alignment: .bottom, spacing: 3) {
                ForEach(stats.ideasPerDay) { d in
                    let h = max(4, CGFloat(d.count) / CGFloat(maxC) * 56)
                    RoundedRectangle(cornerRadius: 3).fill(LinearGradient(colors: [.purple, .indigo], startPoint: .top, endPoint: .bottom)).frame(height: h).opacity(d.count == 0 ? 0.12 : 1)
                }
            }.frame(height: 56).padding(8).background(RoundedRectangle(cornerRadius: 10).fill(Color(nsColor: .windowBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(nsColor: .separatorColor).opacity(0.3), lineWidth: 1)))
            HStack {
                Text(stats.ideasPerDay.first?.date ?? "").font(.system(size: 9)).foregroundStyle(.secondary)
                Spacer()
                Text(stats.ideasPerDay.last?.date ?? "").font(.system(size: 9)).foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(nsColor: .separatorColor).opacity(0.4), lineWidth: 1)))
    }

    private func heatmapColor(count: Int, max: Int) -> Color {
        if count == 0 { return Color(nsColor: .controlBackgroundColor) }
        let intensity = Double(count) / Double(max)
        if intensity < 0.25 { return .indigo.opacity(0.2) }
        if intensity < 0.5 { return .indigo.opacity(0.4) }
        if intensity < 0.75 { return .indigo.opacity(0.65) }
        return .indigo
    }

    private func formattedHeatmapDate(_ iso: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        guard let d = f.date(from: iso) else { return String(iso.suffix(5)) }
        let out = DateFormatter()
        out.dateFormat = "dd MMM"
        out.locale = Locale(identifier: "de_DE")
        return out.string(from: d)
    }

    private func load() async {
        loading = true
        do {
            stats = try await APIClient.shared.getStats()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

// Simple FlowLayout for SwiftUI
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        var h: CGFloat = 0
        for row in rows { h += row.size.height + spacing }
        if !rows.isEmpty { h -= spacing }
        return CGSize(width: proposal.width ?? 0, height: h)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        var y = bounds.minY
        for row in rows {
            var x = bounds.minX
            for idx in row.indices {
                let view = subviews[idx]
                let size = view.sizeThatFits(.unspecified)
                view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.size.height + spacing
        }
    }
    private struct Row { var indices: [Int]; var size: CGSize }
    private func computeRows(proposal: ProposedViewSize, subviews: Subviews) -> [Row] {
        var rows: [Row] = []
        var current: [Int] = []
        var currentWidth: CGFloat = 0
        var currentHeight: CGFloat = 0
        let maxWidth = proposal.width ?? .infinity
        for (i, v) in subviews.enumerated() {
            let size = v.sizeThatFits(.unspecified)
            if currentWidth + size.width > maxWidth && !current.isEmpty {
                rows.append(Row(indices: current, size: CGSize(width: currentWidth - spacing, height: currentHeight)))
                current = [i]; currentWidth = size.width + spacing; currentHeight = size.height
            } else {
                current.append(i); currentWidth += size.width + spacing; currentHeight = max(currentHeight, size.height)
            }
        }
        if !current.isEmpty { rows.append(Row(indices: current, size: CGSize(width: currentWidth - spacing, height: currentHeight))) }
        return rows
    }
}
