import Foundation

// MARK: - Idea
struct Idea: Codable, Identifiable, Hashable, Equatable {
    var id: Int
    var title: String
    var description: String?
    var source: String?
    var tags: [String]
    var createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, description, source, tags
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct IdeaCreate: Codable {
    var title: String
    var description: String?
    var source: String?
    var tags: [String]
}

struct IdeaUpdate: Codable {
    var title: String?
    var description: String?
    var source: String?
    var tags: [String]?
}

// MARK: - Connection
struct Connection: Codable, Identifiable, Hashable {
    var id: Int
    var sourceId: Int
    var targetId: Int
    var type: String
    var label: String?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case sourceId = "source_id"
        case targetId = "target_id"
        case type, label
        case createdAt = "created_at"
    }
}

struct ConnectionCreate: Codable {
    var sourceId: Int
    var targetId: Int
    var type: String
    var label: String?

    enum CodingKeys: String, CodingKey {
        case sourceId = "source_id"
        case targetId = "target_id"
        case type, label
    }
}

// MARK: - Graph
struct GraphNode: Codable, Identifiable, Hashable {
    var id: Int
    var title: String
    var tags: [String]
    var description: String?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, tags, description
        case createdAt = "created_at"
    }
}

struct GraphEdge: Codable, Identifiable, Hashable {
    var id: Int
    var source: Int
    var target: Int
    var type: String
    var label: String?
}

struct Graph: Codable, Equatable, Hashable {
    var nodes: [GraphNode]
    var edges: [GraphEdge]
}

// MARK: - Stats
struct Stats: Codable {
    var totalIdeas: Int
    var totalConnections: Int
    var topTags: [TopTag]
    var ideasPerDay: [DateCount]
    var recentIdeas: [Idea]
    var heatmap: [DateCount]

    enum CodingKeys: String, CodingKey {
        case totalIdeas = "total_ideas"
        case totalConnections = "total_connections"
        case topTags = "top_tags"
        case ideasPerDay = "ideas_per_day"
        case recentIdeas = "recent_ideas"
        case heatmap
    }
}

struct TopTag: Codable, Identifiable, Hashable {
    var tag: String
    var count: Int
    var id: String { tag }
}

struct DateCount: Codable, Hashable, Identifiable {
    var date: String
    var count: Int
    var id: String { date }
}

// MARK: - Constants
enum ConnectionType: String, CaseIterable, Identifiable {
    case entstanden = "entstand aus"
    case aehnlich = "ähnlich zu"
    case kontrastiert = "kontrastiert mit"
    var id: String { rawValue }
}

// MARK: - Helpers
extension Date {
    static let ideaGraphFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f
    }()
    static let isoWithFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    static let isoWithoutFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}

func decodeIdeaGraphDate(_ str: String) -> Date? {
    // Try with fractional seconds first
    if let d = Date.isoWithFraction.date(from: str) { return d }
    if let d = Date.isoWithoutFraction.date(from: str) { return d }
    // Try custom formatter
    if let d = Date.ideaGraphFormatter.date(from: str) { return d }
    // Try adding Z
    if let d = Date.isoWithFraction.date(from: str + "Z") { return d }
    // Fallback: try truncating microseconds to milliseconds
    let truncated = String(str.prefix(23)) // yyyy-MM-ddTHH:mm:ss.SSS
    let withZ = truncated + "Z"
    if let d = Date.isoWithFraction.date(from: withZ) { return d }
    return nil
}

// JSONDecoder for IdeaGraph
extension JSONDecoder {
    static var ideaGraph: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let str = try container.decode(String.self)
            if let date = decodeIdeaGraphDate(str) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date: \(str)")
        }
        return d
    }
}

extension JSONEncoder {
    static var ideaGraph: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = .sortedKeys
        return e
    }
}

// Tag helpers
func colorForTag(_ tag: String) -> String {
    // hash -> hue, keep for dot; but UI mostly indigo, dot shows tag
    return tag
}
