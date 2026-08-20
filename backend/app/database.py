from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# SQLite file next to backend folder; allow override via env
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./ideagraph.db")
# For relative path handling when running from different cwd,
# resolve to backend directory if using default sqlite file
if DB_URL.startswith("sqlite:///./"):
    # Place DB file alongside backend/app -> backend/ideagraph.db
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_file = DB_URL.replace("sqlite:///./", "")
    DB_URL = f"sqlite:///{os.path.join(base_dir, db_file)}"

engine = create_engine(
    DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
