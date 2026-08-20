import SwiftUI

@main
struct IdeaGraphApp: App {
    @StateObject private var sidecar = SidecarManager.shared
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
                .frame(minWidth: 1200, minHeight: 750)
                .frame(idealWidth: 1320, idealHeight: 840)
                .task {
                    sidecar.start()
                }
                .alert("Backend Fehler", isPresented: Binding(
                    get: { sidecar.errorMessage != nil },
                    set: { if !$0 { sidecar.errorMessage = nil } }
                )) {
                    Button("OK") { sidecar.errorMessage = nil }
                } message: {
                    Text(sidecar.errorMessage ?? "Unbekannter Fehler")
                }
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("Über IdeaGraph") {
                    NSApplication.shared.orderFrontStandardAboutPanel(
                        options: [
                            NSApplication.AboutPanelOptionKey.applicationName: "IdeaGraph",
                            NSApplication.AboutPanelOptionKey.applicationVersion: "1.0 (MVP)",
                            NSApplication.AboutPanelOptionKey.credits: NSAttributedString(string: "Ideen vernetzen – SwiftUI + FastAPI Sidecar\nInspiriert von Linear, Notion, Raycast.")
                        ]
                    )
                }
            }
        }

        Settings {
            SettingsView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        Task { @MainActor in
            SidecarManager.shared.stop()
        }
    }
}

struct ContentView: View {
    @State private var selection: SidebarItem = .dashboard

    var body: some View {
        NavigationSplitView {
            SidebarView(selection: $selection)
                .navigationSplitViewColumnWidth(min: 220, ideal: 260, max: 320)
        } detail: {
            Group {
                switch selection {
                case .dashboard: DashboardView()
                case .ideas: IdeaListView()
                case .graph: GraphView()
                case .timeline: TimelineView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(nsColor: NSColor.windowBackgroundColor))
        }
        .toolbar {
            ToolbarItem(placement: .navigation) {
                Button(action: toggleSidebar) {
                    Image(systemName: "sidebar.leading")
                }
                .help("Sidebar umschalten")
            }
        }
    }

    private func toggleSidebar() {
        NSApp.keyWindow?.firstResponder?.tryToPerform(#selector(NSSplitViewController.toggleSidebar(_:)), with: nil)
    }
}

struct SettingsView: View {
    @StateObject private var sidecar = SidecarManager.shared
    var body: some View {
        Form {
            Section("Backend") {
                LabeledContent("Status", value: sidecar.isRunning ? "Läuft" : "Gestoppt")
                LabeledContent("Port", value: "\(sidecar.port)")
                LabeledContent("Base URL", value: sidecar.baseURL.absoluteString)
                LabeledContent("Datenbank", value: sidecar.databaseURL)
                Button(sidecar.isRunning ? "Neustart" : "Starten") {
                    if sidecar.isRunning { sidecar.stop() }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { sidecar.start() }
                }
            }
            Section("Info") {
                Text("IdeaGraph MVP – SwiftUI + FastAPI Sidecar (PyInstaller, Python 3.12). Daten liegen in ~/Library/Application Support/IdeaGraph/ideagraph.db")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .frame(width: 500, height: 300)
        .padding()
    }
}
