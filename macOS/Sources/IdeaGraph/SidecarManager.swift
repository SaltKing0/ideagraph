import Foundation
import Combine

@MainActor
final class SidecarManager: ObservableObject {
    static let shared = SidecarManager()

    @Published var port: Int = 8000
    @Published var isRunning: Bool = false
    @Published var isReady: Bool = false
    @Published var errorMessage: String?

    private var process: Process?
    private var logTask: Task<Void, Never>?

    private init() {}

    // Find Application Support directory and ensure DB path
    // NOTE: PyInstaller onefile has a bug with sqlite URLs containing spaces (e.g. "Application Support").
    // Python directly handles it, but the frozen binary hangs. We therefore use Caches (no space) for the sidecar,
    // while keeping the spec's Application Support path as fallback for migration.
    var databaseURL: String {
        let fm = FileManager.default
        // Use Caches to avoid space in "Application Support" for frozen binary
        let base = fm.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let dir = base.appendingPathComponent("IdeaGraph", isDirectory: true)
        if !fm.fileExists(atPath: dir.path) {
            try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        let dbFile = dir.appendingPathComponent("ideagraph.db")
        // Also ensure Application Support dir exists for backwards compat / spec
        let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!.appendingPathComponent("IdeaGraph", isDirectory: true)
        try? fm.createDirectory(at: appSupport, withIntermediateDirectories: true)
        return "sqlite:///" + dbFile.path
    }

    // Legacy spec path (for docs / migration)
    var legacyDatabaseURL: String {
        let fm = FileManager.default
        let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("IdeaGraph", isDirectory: true)
        return "sqlite:///" + dir.appendingPathComponent("ideagraph.db").path
    }

    func findBinaryURL() -> URL? {
        // 1. Embedded in app bundle Resources
        if let url = Bundle.main.url(forResource: "ideagraph-backend", withExtension: nil) {
            return url
        }
        if let url = Bundle.main.url(forResource: "ideagraph-backend-aarch64-apple-darwin", withExtension: nil) {
            return url
        }
        // 2. For development: look relative to project (macOS/Resources, sidecar/)
        let fm = FileManager.default
        let candidates: [URL] = [
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("macOS/Resources/ideagraph-backend"),
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("sidecar/ideagraph-backend"),
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("sidecar/ideagraph-backend-aarch64-apple-darwin"),
        ]
        for c in candidates where fm.fileExists(atPath: c.path) {
            return c
        }
        return nil
    }

    private func isPortAvailable(_ port: Int) -> Bool {
        // Try to connect; if connection succeeds, port is in use
        let url = URL(string: "http://127.0.0.1:\(port)/health")!
        var request = URLRequest(url: url)
        request.timeoutInterval = 0.5
        let semaphore = DispatchSemaphore(value: 0)
        var available = true
        let task = URLSession.shared.dataTask(with: request) { _, response, error in
            if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) {
                available = false
            } else if error == nil {
                // Something responded, so not available
                available = false
            }
            semaphore.signal()
        }
        task.resume()
        _ = semaphore.wait(timeout: .now() + 1.0)
        return available
    }

    func findAvailablePort(startingAt start: Int = 8000) -> Int {
        var p = start
        for _ in 0..<20 {
            if isPortAvailable(p) {
                return p
            }
            p += 1
        }
        return p
    }

    func start() {
        guard process == nil || process?.isRunning == false else {
            print("[Sidecar] Already running")
            return
        }

        port = findAvailablePort(startingAt: 8000)
        let dbURL = databaseURL
        print("[Sidecar] DB: \(dbURL)")
        print("[Sidecar] Port: \(port)")

        guard let binaryURL = findBinaryURL() else {
            let msg = "Backend-Binary nicht gefunden. Erwartet: ideagraph-backend in Resources oder sidecar/"
            print("[Sidecar] ERROR: \(msg)")
            errorMessage = msg
            return
        }
        print("[Sidecar] Binary: \(binaryURL.path)")

        // Ensure executable
        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: binaryURL.path)

        let proc = Process()
        proc.executableURL = binaryURL
        proc.environment = [
            "PORT": "\(port)",
            "DATABASE_URL": dbURL,
            "PYTHONUNBUFFERED": "1"
        ]
        let outPipe = Pipe()
        let errPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = errPipe

        // Log output asynchronously
        outPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if !data.isEmpty, let str = String(data: data, encoding: .utf8) {
                print("[Sidecar stdout] \(str)", terminator: "")
            }
        }
        errPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if !data.isEmpty, let str = String(data: data, encoding: .utf8) {
                print("[Sidecar stderr] \(str)", terminator: "")
            }
        }

        do {
            try proc.run()
            self.process = proc
            self.isRunning = true
            self.isReady = false
            print("[Sidecar] Started PID \(proc.processIdentifier)")

            // Wait a bit and health-check
            Task {
                await self.waitForHealth()
            }

            proc.terminationHandler = { p in
                DispatchQueue.main.async {
                    print("[Sidecar] Terminated with status \(p.terminationStatus)")
                    self.isRunning = false
                    self.isReady = false
                    self.process = nil
                }
            }
        } catch {
            print("[Sidecar] Failed to start: \(error)")
            errorMessage = "Backend konnte nicht gestartet werden: \(error.localizedDescription)"
        }
    }

    private func waitForHealth() async {
        let base = "http://127.0.0.1:\(port)/health"
        guard let url = URL(string: base) else { return }
        for i in 0..<20 {
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s
            do {
                let (data, response) = try await URLSession.shared.data(from: url)
                if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                    print("[Sidecar] Health OK after \(Double(i)*0.5)s: \(String(data: data, encoding: .utf8) ?? "")")
                    await MainActor.run { self.isReady = true }
                    return
                }
            } catch {
                // ignore, retry
            }
            print("[Sidecar] Waiting for health... \(i)")
        }
        print("[Sidecar] Health check timed out after 10s")
        await MainActor.run { self.isReady = false }
    }

    func stop() {
        guard let proc = process, proc.isRunning else { return }
        print("[Sidecar] Stopping PID \(proc.processIdentifier)")
        proc.terminate()
        // Give it a moment, then kill if needed
        DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
            if proc.isRunning {
                proc.interrupt()
            }
        }
        isRunning = false
        isReady = false
        process = nil
    }

    var baseURL: URL {
        URL(string: "http://127.0.0.1:\(port)")!
    }
}
