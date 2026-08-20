import Foundation

@MainActor
final class APIClient: ObservableObject {
    static let shared = APIClient()

    private var decoder: JSONDecoder { .ideaGraph }
    private var encoder: JSONEncoder { .ideaGraph }

    private var baseURL: URL {
        SidecarManager.shared.baseURL
    }

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: Data? = nil) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body = body {
            req.httpBody = body
        }
        print("[API] \(method) \(url) port=\(SidecarManager.shared.port) isRunning=\(SidecarManager.shared.isRunning)")
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: req)
        } catch {
            print("[API] network error for \(url): \(error) \(error.localizedDescription) \( (error as NSError).code )")
            throw error
        }
        print("[API] response \(url) status \((response as? HTTPURLResponse)?.statusCode ?? -1) bytes \(data.count)")
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        if !(200...299).contains(http.statusCode) {
            let msg = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
            // Try parse detail
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let detail = json["detail"] as? String {
                throw NSError(domain: "API", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: detail])
            }
            throw NSError(domain: "API", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }
        return try decoder.decode(T.self, from: data)
    }

    private func requestVoid(_ path: String, method: String = "DELETE", body: Data? = nil) async throws {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body = body { req.httpBody = body }
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "Error"
            throw NSError(domain: "API", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
        }
    }

    // MARK: Ideas
    func listIdeas(q: String? = nil, tag: String? = nil) async throws -> [Idea] {
        var comps = URLComponents(url: baseURL.appendingPathComponent("ideas"), resolvingAgainstBaseURL: false)!
        var items: [URLQueryItem] = []
        if let q = q, !q.isEmpty { items.append(URLQueryItem(name: "q", value: q)) }
        if let tag = tag, !tag.isEmpty { items.append(URLQueryItem(name: "tag", value: tag)) }
        comps.queryItems = items.isEmpty ? nil : items
        var req = URLRequest(url: comps.url!)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try decoder.decode([Idea].self, from: data)
    }

    func getIdea(id: Int) async throws -> Idea {
        try await request("ideas/\(id)")
    }

    func createIdea(_ data: IdeaCreate) async throws -> Idea {
        let body = try encoder.encode(data)
        return try await request("ideas", method: "POST", body: body)
    }

    func updateIdea(id: Int, _ data: IdeaUpdate) async throws -> Idea {
        let body = try encoder.encode(data)
        return try await request("ideas/\(id)", method: "PUT", body: body)
    }

    func deleteIdea(id: Int) async throws {
        try await requestVoid("ideas/\(id)", method: "DELETE")
    }

    // MARK: Connections
    func listConnections() async throws -> [Connection] {
        try await request("connections")
    }

    func createConnection(_ data: ConnectionCreate) async throws -> Connection {
        let body = try encoder.encode(data)
        return try await request("connections", method: "POST", body: body)
    }

    func deleteConnection(id: Int) async throws {
        try await requestVoid("connections/\(id)")
    }

    // MARK: Graph & Stats
    func getGraph() async throws -> Graph {
        try await request("graph")
    }

    func getStats() async throws -> Stats {
        try await request("stats")
    }

    func health() async throws -> Bool {
        let url = baseURL.appendingPathComponent("health")
        let (_, resp) = try await URLSession.shared.data(from: url)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return false }
        return true
    }
}

struct EmptyResponse: Codable {}
