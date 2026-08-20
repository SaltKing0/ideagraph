from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/connections", tags=["connections"])


@router.post("", response_model=schemas.ConnectionOut, status_code=201)
def create_connection(payload: schemas.ConnectionCreate, db: Session = Depends(get_db)):
    if payload.source_id == payload.target_id:
        raise HTTPException(status_code=422, detail="Quelle und Ziel dürfen nicht gleich sein")
    # check ideas exist
    src = db.query(models.Idea).filter(models.Idea.id == payload.source_id).first()
    tgt = db.query(models.Idea).filter(models.Idea.id == payload.target_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=404, detail="Quelle oder Ziel-Idee nicht gefunden")
    # prevent duplicate (same source, target, type)
    existing = db.query(models.Connection).filter(
        models.Connection.source_id == payload.source_id,
        models.Connection.target_id == payload.target_id,
        models.Connection.type == payload.type,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Verbindung existiert bereits")
    conn = models.Connection(
        source_id=payload.source_id,
        target_id=payload.target_id,
        type=payload.type,
        label=payload.label,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.get("", response_model=list[schemas.ConnectionOut])
def list_connections(db: Session = Depends(get_db)):
    return db.query(models.Connection).order_by(models.Connection.created_at.desc()).all()


@router.delete("/{conn_id}", status_code=204)
def delete_connection(conn_id: int, db: Session = Depends(get_db)):
    conn = db.query(models.Connection).filter(models.Connection.id == conn_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Verbindung nicht gefunden")
    db.delete(conn)
    db.commit()
    return None
