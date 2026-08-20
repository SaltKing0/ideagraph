import SwiftUI

enum SidebarItem: String, CaseIterable, Identifiable, Hashable {
    case dashboard = "Dashboard"
    case ideas = "Ideen"
    case graph = "Graph"
    case timeline = "Zeitleiste"

    var id: String { rawValue }
    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .ideas: return "lightbulb"
        case .graph: return "point.3.connected.trianglepath.dotted"
        case .timeline: return "clock.arrow.circlepath"
        }
    }
    var desc: String {
        switch self {
        case .dashboard: return "Übersicht"
        case .ideas: return "Capture & Suche"
        case .graph: return "Netzwerk"
        case .timeline: return "Chronologie"
        }
    }
}

struct SidebarView: View {
    @Binding var selection: SidebarItem
    @StateObject private var sidecar = SidecarManager.shared

    var body: some View {
        List(selection: $selection) {
            Section {
                ForEach(SidebarItem.allCases) { item in
                    NavigationLink(value: item) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.rawValue).font(.system(size: 13, weight: .medium))
                                Text(item.desc).font(.system(size: 11)).foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: item.icon)
                                .font(.system(size: 13))
                                .frame(width: 28, height: 28)
                                .background(
                                    RoundedRectangle(cornerRadius: 7)
                                        .fill(selection == item ? Color.accentColor : Color(nsColor: .controlBackgroundColor))
                                )
                                .foregroundStyle(selection == item ? .white : .secondary)
                        }
                    }
                    .listRowBackground(selection == item ? Color.accentColor.opacity(0.12) : Color.clear)
                }
            } header: {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 10) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8).fill(LinearGradient(colors: [.indigo, .purple], startPoint: .topLeading, endPoint: .bottomTrailing))
                            Text("◐").font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
                        }
                        .frame(width: 28, height: 28)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("IdeaGraph").font(.system(size: 13, weight: .semibold))
                            Text("workspace • SwiftUI").font(.system(size: 11)).foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 4)
                    HStack(spacing: 6) {
                        Circle().fill(sidecar.isRunning ? Color.green : Color.red).frame(width: 8, height: 8)
                            .shadow(color: sidecar.isRunning ? .green.opacity(0.6) : .clear, radius: 4)
                        Text(sidecar.isRunning ? "Backend läuft" : "Backend stoppt").font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary)
                        Spacer()
                        Text(":\(sidecar.port)").font(.system(size: 11, design: .monospaced)).foregroundStyle(.secondary)
                    }
                    .padding(8)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color(nsColor: .controlBackgroundColor)))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(nsColor: .separatorColor).opacity(0.4), lineWidth: 1))
                }
                .textCase(nil)
                .padding(.vertical, 4)
            }

            Section("Aktuell") {
                VStack(alignment: .leading, spacing: 6) {
                    Label("MVP aktiv", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.primary)
                    Text("SwiftUI + FastAPI Sidecar.\nDaten in Application Support.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineSpacing(2)
                }
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 10).fill(Color(nsColor: .controlBackgroundColor)))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1))
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("IdeaGraph")
    }
}
