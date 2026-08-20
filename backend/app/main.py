from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import ideas, connections, graph, stats
from . import models  # ensure models imported

# create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IdeaGraph API",
    version="0.1.0",
    description="API für IdeaGraph - Ideen tracken & vernetzen",
)

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ideas.router)
app.include_router(connections.router)
app.include_router(graph.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"message": "IdeaGraph API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
