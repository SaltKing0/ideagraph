export type Idea = {
  id: number;
  title: string;
  description?: string | null;
  source?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Connection = {
  id: number;
  source_id: number;
  target_id: number;
  type: string;
  label?: string | null;
  created_at: string;
};

export type GraphNode = {
  id: number;
  title: string;
  tags: string[];
  description?: string | null;
  created_at: string;
};

export type GraphEdge = {
  id: number;
  source: number;
  target: number;
  type: string;
  label?: string | null;
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type Stats = {
  total_ideas: number;
  total_connections: number;
  top_tags: { tag: string; count: number }[];
  ideas_per_day: { date: string; count: number }[];
  recent_ideas: Idea[];
  heatmap: { date: string; count: number }[];
};

export const CONNECTION_TYPES = ["entstand aus", "ähnlich zu", "kontrastiert mit"] as const;
