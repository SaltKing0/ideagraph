import os
import sys
import multiprocessing

# PyInstaller onefile needs freeze_support for spawn
multiprocessing.freeze_support()

import uvicorn
from app.main import app

def main():
    port = int(os.environ.get("PORT", "8000"))
    # Ensure DATABASE_URL defaults to AppSupport when provided via Sidecar
    # If not set, app.database will use backend/ideagraph.db (see database.py)
    print(f"[Sidecar] Starting IdeaGraph backend on 127.0.0.1:{port}", flush=True)
    print(f"[Sidecar] DATABASE_URL={os.environ.get('DATABASE_URL', '(default)')}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    # Also handle being run as frozen binary with multiprocessing spawn
    main()
