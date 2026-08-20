from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=schemas.GraphOut)
def get_graph(db: Session = Depends(get_db)):
    ideas = db.query(models.Idea).all()
    connections = db.query(models.Connection).all()
    nodes = []
    for i in ideas:
        nodes.append(
            schemas.GraphNode(
                id=i.id,
                title=i.title,
                tags=schemas._parse_tags(i.tags),
                description=i.description,
                created_at=i.created_at,
            )
        )
    edges = [
        schemas.GraphEdge(
            id=c.id, source=c.source_id, target=c.target_id, type=c.type, label=c.label
        )
        for c in connections
    ]
    return schemas.GraphOut(nodes=nodes, edges=edges)
