# IdeaGraph

A web app for tracking ideas with interactive graph visualization. Relationships between ideas are rendered as a network — similar to Obsidian, but specialized for **idea development and management**.

> MVP according to `PROJEKT.md` — backend + frontend + graph + dashboard, complete.

---

## ✨ Features

### 1. Idea Management
- Create ideas (title*, description, source/tags)
- Edit / delete
- List with **search** (title/description/tags) and **filter by tag**
- Timestamps (`created_at`, `updated_at`) added automatically

### 2. Graph Visualization (D3.js)
- Force-directed layout (nodes = ideas, edges = connections)
- Zoom, pan, drag & drop
- Color coding by **first tag** (hash → HSL)
- Type colors: `derived from` (purple), `similar to` (cyan), `contrasts with` (pink)
- Click a node → detail drawer with its connections

### 3. Connections
- `POST /connections` — pick source → target + type: `derived from` / `similar to` / `contrasts with`
- Optional `label` (e.g. "builds on")
- Validation: no self-connections, duplicate protection (409)
- Delete; cascading delete when an idea is removed
- UI: form in the Ideas tab + display of related connections

### 4. Timeline
- All ideas grouped by date (day → ideas)
- Filters: **All / Last week / Last month**
- Vertical time axis, time + source

### 5. Dashboard
- KPIs: number of ideas, connections, distinct tags
- **Tag cloud** (size ∝ frequency) + top-5 bar chart
- **Heatmap** of the last 30 days (GitHub-style, 4 levels)
- Mini bar: "ideas per day"
- 5 most recent ideas

### Design
- Dark theme (`#0f0f12`, `#18181b`, `#1f1f23`), purple accent
- Collapsible sidebar navigation (responsive drawer on mobile)
- Minimalist, content-focused

---

## 🧱 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLAlchemy + SQLite |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 3 + D3 v7 |
| Architecture | REST, modular routers, open CORS, proxy in Vite |
| macOS | Native SwiftUI app with a bundled Python backend sidecar |

### API Endpoints

```
POST   /ideas                – create
GET    /ideas?q=&tag=        – list (search + filter)
GET    /ideas/{id}           – single
PUT    /ideas/{id}           – update
DELETE /ideas/{id}           – delete
POST   /connections          – connect
GET    /connections          – list
DELETE /connections/{id}     – disconnect
GET    /graph                – {nodes, edges}
GET    /stats                – {total_ideas, total_connections, top_tags, ideas_per_day, heatmap, recent_ideas}
GET    /health, GET /        – health/docs
```

---

## 📦 Project Structure

```
IdeaGraph/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, router wiring
│   │   ├── database.py       # SQLAlchemy engine (SQLite)
│   │   ├── models.py         # Idea, Connection
│   │   ├── schemas.py        # Pydantic, tag JSON, type validation
│   │   └── routers/
│   │       ├── ideas.py
│   │       ├── connections.py
│   │       ├── graph.py
│   │       └── stats.py
│   ├── main.py               # Shim for `uvicorn main:app --reload`
│   ├── run_server.py         # Sidecar entrypoint (uvicorn 127.0.0.1:$PORT)
│   └── requirements.txt
├── frontend/                 # kept for a later Tauri/Win build
│   ├── src/
│   │   ├── api.ts            # fetch wrapper
│   │   ├── types.ts          # TS types + CONNECTION_TYPES
│   │   ├── App.tsx           # Sidebar + view switch
│   │   ├── index.css         # Tailwind
│   │   └── components/
│   │       ├── Sidebar.tsx
│   │       ├── Dashboard.tsx
│   │       ├── IdeaList.tsx + IdeaForm.tsx
│   │       ├── ConnectionForm.tsx
│   │       ├── GraphView.tsx   # D3 force layout
│   │       └── Timeline.tsx
│   ├── vite.config.ts        # proxy /ideas → :8000
│   ├── tailwind.config.js
│   └── package.json
├── macOS/                      # native SwiftUI app
│   ├── IdeaGraph.xcodeproj    # generated via XcodeGen (project.yml)
│   ├── Sources/IdeaGraph/
│   │   ├── IdeaGraphApp.swift      # @main, launches sidecar
│   │   ├── SidecarManager.swift    # Process, PORT, DATABASE_URL, AppSupport
│   │   ├── APIClient.swift         # URLSession, http://127.0.0.1:$PORT
│   │   ├── Models.swift            # Codable (Idea, Connection, Graph, Stats)
│   │   ├── IdeaGraph.entitlements
│   │   ├── Info.plist
│   │   └── Views/
│   │       ├── Sidebar.swift
│   │       ├── DashboardView.swift
│   │       ├── IdeaListView.swift + IdeaFormView.swift
│   │       ├── GraphView.swift     # Canvas + force simulation
│   │       └── TimelineView.swift
│   ├── Resources/
│   │   └── ideagraph-backend*      # copied from sidecar/ via post-build script
│   └── project.yml                 # XcodeGen spec
├── sidecar/                  # prebuilt backend binary (portable)
│   ├── ideagraph-backend               # current (arm64 macOS)
│   └── ideagraph-backend-aarch64-apple-darwin  # explicit Mac build
├── requirements.txt          # copy for `pip install -r requirements.txt` at root
├── PROJEKT.md
└── README.md
```

---

## 🚀 Setup

### Prerequisites
- **Python 3.12** (3.14 currently lacks pydantic-core wheels — 3.12 recommended). Homebrew: `brew install python@3.12`
- **Node.js 20+** and npm 10+
- `pip3.12` / `python3.12`

> Reasonable choices: Python 3.12 for modern wheels; the SQLite file lives at `backend/ideagraph.db`; tags are stored as JSON text (simple, portable, no Postgres array needed); D3 instead of vis.js (more control, no extra wrapper).

### 1. Start the backend

```bash
# from the project root
pip install -r requirements.txt
# or backend only:
pip install -r backend/requirements.txt

# explicitly via Python 3.12 (if system Python is 3.14):
python3.12 -m pip install --break-system-packages -r requirements.txt

# start
cd backend
uvicorn main:app --reload --port 8000
# or from anywhere with Python 3.12:
python3.12 -m uvicorn backend.main:app --reload --port 8000 --app-dir .
```

Backend runs at **http://localhost:8000**
Docs: **http://localhost:8000/docs** (Swagger)

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: **http://localhost:5173** (the proxy forwards `/ideas`, `/connections`, `/graph`, `/stats` to the backend — no CORS issues)

### 3. Build (production)

```bash
cd frontend
npm run build   # → frontend/dist
npm run preview # optional
```

---

## 🍎 Native macOS App (SwiftUI + sidecar) — double-click, no terminal

> Decision: **native SwiftUI** (no WebView). The backend is bundled as a **single binary** via PyInstaller (Python 3.12) as a sidecar inside the `.app`. Portable: later Windows/Linux builds via Tauri/React can reuse the same backend without a rewrite.

### Architecture
- `macOS/Sources/IdeaGraph/IdeaGraphApp.swift` — `@main`, starts `SidecarManager` on launch, stops it on terminate.
- `SidecarManager.swift` — locates `ideagraph-backend` in the bundle (`Bundle.main.url(forResource:)`), picks a free port starting at 8000, sets `DATABASE_URL=sqlite:////Users/.../Library/Caches/IdeaGraph/ideagraph.db` (Caches instead of `Application Support` due to a PyInstaller whitespace bug, see below), launches the `Process`, logs stdout/stderr, health-checks `http://127.0.0.1:$PORT/health`, and terminates it on app exit.
- `APIClient.swift` — `base = http://127.0.0.1:\(port)`, async/await for all endpoints (`listIdeas`, `createIdea`, … `getGraph`, `getStats`).
- SwiftUI views mirror the React ones 1:1: `Sidebar` (NavigationSplitView), `DashboardView`, `IdeaListView` + `IdeaFormView`, `GraphView` (Canvas + force simulation with a timer, drag & drop, zoom/pan, tag dot, type colors), `TimelineView`. Dark theme `#09090b`/`#18181b`/`#27272a`, indigo `#6366f1`.

### Data persistence
- On launch, `~/Library/Caches/IdeaGraph/` (and `~/Library/Application Support/IdeaGraph/` for compatibility) is created.
- The sidecar receives `DATABASE_URL` as an env var; the DB lives at `Caches/IdeaGraph/ideagraph.db` (not `Application Support`, which contains spaces — PyInstaller's `onefile` build chokes on spaces in the SQLite path; plain Python is fine, the binary is not — hence the space-free Caches path; the DB persists across restarts).
- `frontend/` is kept as a web fallback for a later Tauri build.

### Prerequisites (macOS)
- Xcode 15+ (tested 26.6, Swift 6.3, macOS 14 SDK), `xcodegen` (`brew install xcodegen`)
- Python 3.12 (`brew install python@3.12`), `pyinstaller` (`python3.12 -m pip install pyinstaller`)

### Build the backend sidecar
```bash
# 1. Sidecar entrypoint already exists: backend/run_server.py
cat backend/run_server.py  # uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT",8000)))

# 2. Build the binary (Python 3.12, NOT 3.14)
python3.12 -m pip install --break-system-packages -r backend/requirements.txt pyinstaller
python3.12 -m PyInstaller --name ideagraph-backend --onefile backend/run_server.py \
  --distpath sidecar --workpath /tmp/pyinstaller_build --specpath /tmp --clean --noconfirm \
  --hidden-import=uvicorn.logging --hidden-import=uvicorn.lifespan --collect-submodules app
cp sidecar/ideagraph-backend sidecar/ideagraph-backend-aarch64-apple-darwin
cp sidecar/ideagraph-backend macOS/Resources/
```

### Build the macOS app
```bash
# XcodeGen → generate the .xcodeproj
xcodegen generate --spec macOS/project.yml --project macOS

# Build (Debug, ad-hoc signed, no hardened runtime)
xcodebuild -project macOS/IdeaGraph.xcodeproj -scheme IdeaGraph -configuration Debug build

# The .app lands in DerivedData, e.g.:
find ~/Library/Developer/Xcode/DerivedData -name "IdeaGraph.app" -type d | head
# Copy it out for convenient double-click launching:
cp -R ~/Library/Developer/Xcode/DerivedData/IdeaGraph-*/Build/Products/Debug/IdeaGraph.app ./IdeaGraph.app
# or from macOS/:
xcodebuild -project macOS/IdeaGraph.xcodeproj -scheme IdeaGraph -configuration Release build  # optional
```

### Launch & test
```bash
# Double-click in Finder:
open IdeaGraph.app
# or run in Terminal to see logs:
./IdeaGraph.app/Contents/MacOS/IdeaGraph
# Sidecar runs on http://127.0.0.1:8000 (or 8001+ if taken)
curl http://127.0.0.1:8000/health  # → {"status":"ok"}
# In the app: create an idea → dashboard counts it; 2nd idea + connection → graph shows an edge;
# Timeline "Last week"; graph drag/zoom/click → sheet; DB grows at ~/Library/Caches/IdeaGraph/ideagraph.db
```
- **Unsigned:** on first launch, right-click → Open → Open (Gatekeeper).
- **Quit:** closing the window terminates the sidecar cleanly via `process.terminate()`.

### Why this approach?
- Learning Swift, macOS-only for personal use → native SwiftUI makes sense.
- Backend as a portable binary → a later Tauri (React) build for Win/Linux can reuse the same `sidecar/ideagraph-backend-*` with no rewrite.
- `frontend/` stays as a web fallback.

---

## 🧪 Tests (brief)

### Backend smoke test (no server)
```bash
python3.12 << 'PY'
import sys; sys.path.insert(0, "backend")
from fastapi.testclient import TestClient
from app.main import app
c = TestClient(app)
print(c.post("/ideas", json={"title":"Test","tags":["demo"]}).json())
print(c.get("/stats").json().keys())
PY
```

### Manual
1. Start backend + frontend (see above)
2. In the frontend: create an idea → appears in the list and dashboard count
3. Second idea → create a connection (graph shows an edge)
4. Graph: drag, zoom, click → details
5. Timeline: "Last week" shows fresh ideas
6. Dashboard: check tag cloud and heatmap

---

## ⚙️ Configuration

- `DATABASE_URL` env overrides the SQLite path (default `sqlite:///./ideagraph.db` → `backend/ideagraph.db`)
- CORS: `allow_origins=["*"]` for the MVP (restrict for production)
- Frontend proxy in `frontend/vite.config.ts`

---

## 📝 Notes / Decisions

- **Tags** are stored as a JSON string — no separate tag model → MVP-simple, filtering in Python (instead of SQLite JSON1)
- **Connection label** added optionally (PROJEKT: "show the nuance") — UI shows type + label
- **Graph filter** by tag: hides non-matching nodes/edges (instead of greying out) → clearer with many nodes
- **Heatmap** = last 30 days (instead of 365) → fits the MVP & `stats` response (`ideas_per_day` + `heatmap` are identical, 30 entries)
- **Python version**: README expects `pip`/`uvicorn` — the root `requirements.txt` + `backend/main.py` shim support both

---

## 🗺️ Possible Future Work

- Auth (per-user ideas)
- Full-text search (FTS5)
- Graph: vis.js or Canvas for >500 nodes
- Export (Markdown/JSON)

---

## License

MVP sample project — free to use.
