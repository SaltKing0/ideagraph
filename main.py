"""Root shim for `uvicorn main:app --reload` (PROJEKT.md Setup)."""
import sys
from pathlib import Path

# ensure backend is importable
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.main import app  # noqa: F401, E402
