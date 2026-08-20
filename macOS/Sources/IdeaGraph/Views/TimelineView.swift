import SwiftUI

struct TimelineView: View {
    @State private var ideas: [Idea] = []
    @State private var filter: TimelineFilter = .all
    @State private var loading = true
    @State private var error: String?

    enum TimelineFilter: String, CaseIterable, Identifiable {
        case all = "Alle"
        case week = "Letzte Woche"
        case month = "Letzter Monat"
        var id: String { rawValue }
    }

    var filtered: [Idea] {
        switch filter {
        case .all: return ideas
        case .week:
            let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
            return ideas.filter { $0.createdAt >= cutoff }
        case .month:
            let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: Date())!
            return ideas.filter { $0.createdAt >= cutoff }
        }
    }

    var grouped: [(String, [Idea])] {
        let sorted = filtered.sorted { $0.createdAt > $1.createdAt }
        var dict: [String: [Idea]] = [:]
        var order: [String] = []
        let fmt = DateFormatter(); fmt.dateStyle = .long; fmt.timeStyle = .none; fmt.locale = Locale(identifier: "de_DE")
        for idea in sorted {
            let key = fmt.string(from: idea.createdAt)
            if dict[key] == nil { order.append(key); dict[key] = [] }
            dict[key]?.append(idea)
        }
        return order.map { ($0, dict[$0]!) }
    }

    var body: some View {
        VStack(spacing: 0) {
            header.padding(16)
            Divider()
            if loading {
                ProgressView("Lade Timeline…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = error {
                Text("Fehler: \(error)").foregroundStyle(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if grouped.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "clock.slash").font(.system(size: 28)).foregroundStyle(.secondary)
                    Text("Keine Ideen in diesem Zeitraum.").font(.system(size: 12)).foregroundStyle(.secondary)
                }.frame(maxWidth: .infinity, maxHeight: .infinity).background(RoundedRectangle(cornerRadius: 12).strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4])).foregroundStyle(Color(nsColor: .separatorColor))).padding(24)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        ForEach(grouped, id: \.0) { dateStr, items in
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(spacing: 8) {
                                    Circle().fill(Color.indigo).frame(width: 8, height: 8).shadow(color: .indigo.opacity(0.5), radius: 4)
                                    Text(dateStr).font(.system(size: 12, weight: .semibold)).padding(.horizontal, 8).padding(.vertical, 4).background(Capsule().fill(Color(nsColor: .controlBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                                    Text("\(items.count) Ideen").font(.system(size: 10)).foregroundStyle(.secondary).padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(Color(nsColor: .windowBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.3), lineWidth: 1)))
                                    Rectangle().fill(Color(nsColor: .separatorColor).opacity(0.3)).frame(height: 1)
                                }
                                ForEach(items) { idea in
                                    HStack(spacing: 12) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(idea.title).font(.system(size: 13, weight: .semibold))
                                            if let desc = idea.description, !desc.isEmpty { Text(desc).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(2) }
                                            HStack(spacing: 4) {
                                                ForEach(idea.tags, id: \.self) { t in Text("#\(t)").font(.system(size: 10, weight: .medium)).padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(Color(nsColor: .windowBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1))).foregroundStyle(.secondary) }
                                            }
                                        }
                                        Spacer()
                                        VStack(alignment: .trailing, spacing: 2) {
                                            Text(idea.createdAt, style: .time).font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary).padding(.horizontal, 8).padding(.vertical, 4).background(Capsule().fill(Color(nsColor: .controlBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                                            if let src = idea.source, !src.isEmpty { Label(src, systemImage: "link").font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1) }
                                        }
                                    }.padding(12).background(RoundedRectangle(cornerRadius: 10).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)).shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2))
                                }
                            }
                        }
                    }.padding(16)
                }
            }
        }.task { await load() }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Zeitleiste").font(.system(size: 20, weight: .semibold, design: .rounded))
                Text("\(filtered.count) Ideen • chronologisch").font(.system(size: 11)).foregroundStyle(.secondary)
            }
            Spacer()
            Picker("", selection: $filter) {
                ForEach(TimelineFilter.allCases) { f in Text(f.rawValue).tag(f) }
            }.pickerStyle(.segmented).frame(width: 260).labelsHidden()
        }
    }

    private func load() async {
        loading = true
        do {
            ideas = try await APIClient.shared.listIdeas()
            error = nil
        } catch { self.error = error.localizedDescription }
        loading = false
    }
}
