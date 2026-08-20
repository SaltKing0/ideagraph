from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
import json

router = APIRouter(prefix="/ideas", tags=["ideas"])


def _to_out(idea: models.Idea) -> dict:
    # helper to convert DB model to dict for Pydantic
    return {
        "id": idea.id,
        "title": idea.title,
        "description": idea.description,
        "source": idea.source,
        "tags": idea.tags,  # will be parsed by validator
        "created_at": idea.created_at,
        "updated_at": idea.updated_at,
    }


@router.post("", response_model=schemas.IdeaOut, status_code=201)
def create_idea(payload: schemas.IdeaCreate, db: Session = Depends(get_db)):
    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
    idea = models.Idea(
        title=payload.title.strip(),
        description=payload.description,
        source=payload.source,
        tags=schemas._encode_tags(payload.tags),
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return _to_out(idea)


@router.get("", response_model=List[schemas.IdeaOut])
def list_ideas(
    q: Optional[str] = Query(None, description="Suche in Titel/Beschreibung/Tags"),
    tag: Optional[str] = Query(None, description="Filter nach Tag"),
    db: Session = Depends(get_db),
):
    ideas = db.query(models.Idea).order_by(models.Idea.created_at.desc()).all()
    # Python-side filtering for tags/search (SQLite JSON search simpler to do in memory for MVP)
    result = []
    for idea in ideas:
        tags = schemas._parse_tags(idea.tags)
        if tag and tag not in tags:
            continue
        if q:
            ql = q.lower()
            hay = f"{idea.title} {idea.description or ''} {' '.join(tags)}".lower()
            if ql not in hay:
                continue
        result.append(_to_out(idea))
    return result


@router.get("/{idea_id}", response_model=schemas.IdeaOut)
def get_idea(idea_id: int, db: Session = Depends(get_db)):
    idea = db.query(models.Idea).filter(models.Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idee nicht gefunden")
    return _to_out(idea)


@router.put("/{idea_id}", response_model=schemas.IdeaOut)
def update_idea(idea_id: int, payload: schemas.IdeaUpdate, db: Session = Depends(get_db)):
    idea = db.query(models.Idea).filter(models.Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idee nicht gefunden")
    if payload.title is not None:
        if not payload.title.strip():
            raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
        idea.title = payload.title.strip()
    if payload.description is not None:
        idea.description = payload.description
    if payload.source is not None:
        idea.source = payload.source
    if payload.tags is not None:
        idea.tags = schemas._encode_tags(payload.tags)
    db.commit()
    db.refresh(idea)
    return _to_out(idea)


@router.delete("/{idea_id}", status_code=204)
def delete_idea(idea_id: int, db: Session = Depends(get_db)):
    idea = db.query(models.Idea).filter(models.Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idee nicht gefunden")
    # delete related connections explicitly (cascade should also handle)
    db.query(models.Connection).filter(
        (models.Connection.source_id == idea_id) | (models.Connection.target_id == idea_id)
    ).delete()
    db.delete(idea)
    db.commit()
    return None
