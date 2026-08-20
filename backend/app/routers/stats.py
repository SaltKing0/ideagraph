from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import Counter, defaultdict
from datetime import datetime, timedelta, date
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=schemas.StatsOut)
def get_stats(db: Session = Depends(get_db)):
    total_ideas = db.query(func.count(models.Idea.id)).scalar() or 0
    total_connections = db.query(func.count(models.Connection.id)).scalar() or 0

    ideas = db.query(models.Idea).order_by(models.Idea.created_at.desc()).all()

    # top tags
    counter = Counter()
    for i in ideas:
        tags = schemas._parse_tags(i.tags)
        counter.update(tags)
    top_tags = [{"tag": t, "count": c} for t, c in counter.most_common(10)]

    # ideas per day (last 30 days)
    today = date.today()
    per_day = defaultdict(int)
    for i in ideas:
        d = i.created_at.date().isoformat() if i.created_at else today.isoformat()
        per_day[d] += 1
    # fill last 30 days for heatmap continuity
    heatmap = []
    ideas_per_day = []
    for offset in range(29, -1, -1):
        d = today - timedelta(days=offset)
        iso = d.isoformat()
        cnt = per_day.get(iso, 0)
        heatmap.append({"date": iso, "count": cnt})
        ideas_per_day.append({"date": iso, "count": cnt})

    # recent ideas (5)
    recent = []
    for i in ideas[:5]:
        recent.append(
            {
                "id": i.id,
                "title": i.title,
                "description": i.description,
                "source": i.source,
                "tags": schemas._parse_tags(i.tags),
                "created_at": i.created_at,
                "updated_at": i.updated_at,
            }
        )

    return {
        "total_ideas": total_ideas,
        "total_connections": total_connections,
        "top_tags": top_tags,
        "ideas_per_day": ideas_per_day,
        "recent_ideas": recent,
        "heatmap": heatmap,
    }
