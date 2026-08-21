from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from datetime import datetime
import json

ALLOWED_CONNECTION_TYPES = ["entstand aus", "ähnlich zu", "kontrastiert mit"]

MAX_TITLE_LEN = 200
MAX_SOURCE_LEN = 300
MAX_DESCRIPTION_LEN = 5000
MAX_LABEL_LEN = 200


def _parse_tags(tags_str: Optional[str]) -> List[str]:
    if not tags_str:
        return []
    try:
        data = json.loads(tags_str)
        if isinstance(data, list):
            return [str(t) for t in data]
        return []
    except Exception:
        # fallback: comma separated
        return [t.strip() for t in tags_str.split(",") if t.strip()]


def _encode_tags(tags: Optional[List[str]]) -> Optional[str]:
    if tags is None:
        return None
    # normalize: strip, remove empty
    cleaned = [t.strip() for t in tags if t and t.strip()]
    return json.dumps(cleaned, ensure_ascii=False)


class IdeaBase(BaseModel):
    title: str = Field(..., max_length=MAX_TITLE_LEN)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LEN)
    source: Optional[str] = Field(default=None, max_length=MAX_SOURCE_LEN)
    tags: List[str] = []


class IdeaCreate(IdeaBase):
    pass


class IdeaUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=MAX_TITLE_LEN)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LEN)
    source: Optional[str] = Field(default=None, max_length=MAX_SOURCE_LEN)
    tags: Optional[List[str]] = None


class IdeaOut(IdeaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        if isinstance(v, str):
            return _parse_tags(v)
        if v is None:
            return []
        return v


class ConnectionBase(BaseModel):
    source_id: int
    target_id: int
    type: str
    label: Optional[str] = Field(default=None, max_length=MAX_LABEL_LEN)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str):
        if v not in ALLOWED_CONNECTION_TYPES:
            raise ValueError(f"type muss einer von {ALLOWED_CONNECTION_TYPES} sein")
        return v


class ConnectionCreate(ConnectionBase):
    pass


class ConnectionOut(ConnectionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class GraphNode(BaseModel):
    id: int
    title: str
    tags: List[str] = []
    description: Optional[str] = None
    created_at: datetime


class GraphEdge(BaseModel):
    id: int
    source: int
    target: int
    type: str
    label: Optional[str] = None


class GraphOut(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class StatsOut(BaseModel):
    total_ideas: int
    total_connections: int
    top_tags: List[dict]  # {tag, count}
    ideas_per_day: List[dict]  # {date, count}
    recent_ideas: List[IdeaOut]
    heatmap: List[dict]  # {date, count}
