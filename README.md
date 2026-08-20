# IdeaGraph

Eine Web-App zum Tracken von Ideen mit interaktiver Graph-Visualisierung. Zusammenhänge zwischen Ideen werden als Netzwerk dargestellt – ähnlich Obsidian, aber spezialisiert auf **Ideen-Entwicklung und -Management**.

> MVP nach `PROJEKT.md` – Backend + Frontend + Graph + Dashboard komplett.

---

## ✨ Features

### 1. Idee-Management
- Idee erstellen (Titel*, Beschreibung, Quelle/Tags)
- Bearbeiten / Löschen
- Liste mit **Suche** (Titel/Beschreibung/Tags) und **Filter nach Tag**
- Zeitstempel (`created_at`, `updated_at`) automatisch

### 2. Graph-Visualisierung (D3.js)
- Force-directed Layout (Nodes = Ideen, Edges = Verbindungen)
- Zoom, Pan, Drag & Drop
- Farbcodierung nach **erstem Tag** (hash → HSL)
- Typ-Farben: `entstand aus` (violett), `ähnlich zu` (cyan), `kontrastiert mit` (pink)
- Klick auf Node → Detail-Drawer mit Verbindungen

### 3. Verbindungen
- `POST /connections` – Quelle → Ziel wählen + Typ: `entstand aus` / `ähnlich zu` / `kontrastiert mit`
- Optional `label` (z. B. „baut darauf auf“)
- Validierung: keine Selbst-Verbindung, Duplikats-Schutz (409)
- Löschen; Kaskaden-Löschung bei Ideen-Delete
- UI: Form im Ideen-Tab + Anzeige verwandter Verbindungen

### 4. Zeitleiste
- Alle Ideen nach Datum gruppiert (Tag → Ideen)
- Filter: **Alle / Letzte Woche / Letzter Monat**
- Vertikale Zeitachse, Uhrzeit + Quelle

### 5. Dashboard
- KPIs: Anzahl Ideen, Verbindungen, verschiedene Tags
- **Tag-Cloud** (Größe ∝ Häufigkeit) + Top-5 Balken
- **Heatmap** letzte 30 Tage (GitHub-Stil, 4 Stufen)
- Mini-Bar: „Ideen pro Tag“
- Neueste 5 Ideen

### Design
- Dunkles Theme (`#0f0f12`, `#18181b`, `#1f1f23`), violetter Akzent
- Sidebar-Navigation (kollabierbar, responsive Drawer mobil)
- Minimalistisch, Fokus auf Inhalt

---

## 🧱 Tech-Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLAlchemy + SQLite |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 3 + D3 v7 |
| Architektur | REST, modulare Router, CORS offen, Proxy in Vite |

### API-Endpunkte

```
POST   /ideas                – erstellen
GET    /ideas?q=&tag=        – liste (Suche+Filter)
GET    /ideas/{id}           – einzeln
PUT    /ideas/{id}           – aktualisieren
DELETE /ideas/{id}           – löschen
POST   /connections          – verbinden
GET    /connections          – liste
DELETE /connections/{id}     – trennen
GET    /graph                – {nodes, edges}
GET    /stats                – {total_ideas, total_connections, top_tags, ideas_per_day, heatmap, recent_ideas}
GET    /health, GET /        – health/docs
```

---

## 📦 Projektstruktur

```
IdeaGraph/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI App, CORS, Router
│   │   ├── database.py       # SQLAlchemy engine (SQLite)
│   │   ├── models.py         # Idea, Connection
│   │   ├── schemas.py        # Pydantic, Tag-JSON, Typ-Validierung
│   │   └── routers/
│   │       ├── ideas.py
│   │       ├── connections.py
│   │       ├── graph.py
│   │       └── stats.py
│   ├── main.py               # Shim für `uvicorn main:app --reload`
│   ├── run_server.py         # NEU: Sidecar-Entrypoint (uvicorn 127.0.0.1:$PORT)
│   └── requirements.txt
├── frontend/                 # bleibt für späteren Tauri/Win-Build erhalten
│   ├── src/
│   │   ├── api.ts            # fetch-Wrapper
│   │   ├── types.ts          # TS-Typen + CONNECTION_TYPES
│   │   ├── App.tsx           # Sidebar + View-Switch
│   │   ├── index.css         # Tailwind
│   │   └── components/
│   │       ├── Sidebar.tsx
│   │       ├── Dashboard.tsx
│   │       ├── IdeaList.tsx + IdeaForm.tsx
│   │       ├── ConnectionForm.tsx
│   │       ├── GraphView.swift   # D3 Force (Web) → SwiftUI Canvas (Mac)
│   │       └── Timeline.tsx
│   ├── vite.config.ts        # Proxy /ideas → :8000
│   ├── tailwind.config.js
│   └── package.json
├── macOS/                    # NEU: native SwiftUI-App
│   ├── IdeaGraph.xcodeproj   # via XcodeGen (project.yml)
│   ├── Sources/IdeaGraph/
│   │   ├── IdeaGraphApp.swift      # @main, startet Sidecar
│   │   ├── SidecarManager.swift    # Process, PORT, DATABASE_URL, AppSupport
│   │   ├── APIClient.swift         # URLSession, http://127.0.0.1:$PORT
│   │   ├── Models.swift            # Codable (Idea, Connection, Graph, Stats)
│   │   ├── Views/
│   │   │   ├── Sidebar.swift
│   │   │   ├── DashboardView.swift
│   │   │   ├── IdeaListView.swift + IdeaFormView.swift
│   │   │   ├── ConnectionFormView.swift
│   │   │   ├── GraphView.swift     # Canvas + Force-Simulation
│   │   │   └── TimelineView.swift
│   │   └── Assets.xcassets/AppIcon.appiconset
│   ├── Resources/
│   │   └── ideagraph-backend*      # kopiert aus sidecar/ via postBuildScript
│   └── project.yml           # XcodeGen-Spec
├── sidecar/                  # NEU: kompiliertes Backend-Binary (portabel)
│   ├── ideagraph-backend               # current (arm64 macOS)
│   └── ideagraph-backend-aarch64-apple-darwin  # explizit für Mac
├── IdeaGraph.app             # NEU: gebaute .app (Doppelklick, nach Build)
├── requirements.txt          # Kopie für `pip install -r requirements.txt` im Root
├── PROJEKT.md
└── README.md
```

---

## 🚀 Setup

### Voraussetzungen
- **Python 3.12** (3.14 hat aktuell keine pydantic-core wheels – 3.12 empfohlen). Homebrew: `brew install python@3.12`
- **Node.js 20+** und npm 10+
- `pip3.12` / `python3.12`

> Reasonable choices: Python 3.12 wegen moderner Wheels; SQLite-Datei liegt in `backend/ideagraph.db`; Tags als JSON-Text (einfach, portabel, kein Postgres-Array nötig); D3 statt vis.js (mehr Kontrolle, kein extra Wrapper).

### 1. Backend starten

```bash
# im Projekt-Root
pip install -r requirements.txt
# oder nur backend:
pip install -r backend/requirements.txt

# via python 3.12 explizit (falls System-Python 3.14):
python3.12 -m pip install --break-system-packages -r requirements.txt

# Start
cd backend
uvicorn main:app --reload --port 8000
# oder von überall mit Python 3.12:
python3.12 -m uvicorn backend.main:app --reload --port 8000 --app-dir .
```

Backend läuft auf **http://localhost:8000**
Docs: **http://localhost:8000/docs** (Swagger)

### 2. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Frontend: **http://localhost:5173** (Proxy leitet `/ideas`, `/connections`, `/graph`, `/stats` an Backend weiter – kein CORS-Problem)

### 3. Build (Produktion)

```bash
cd frontend
npm run build   # → frontend/dist
npm run preview # optional
```

---

## 🍎 Native macOS App (SwiftUI + Sidecar) — Doppelklick ohne Terminal

> Entscheidung: **SwiftUI nativ** (kein WebView). Backend als **einzelnes Binary** via PyInstaller (Python 3.12) als Sidecar in die `.app` eingebettet. Portabel: später Windows/Linux via Tauri/React ohne Backend-Rewrite.

### Architektur
- `macOS/Sources/IdeaGraph/IdeaGraphApp.swift` — `@main`, startet `SidecarManager` beim `task`, stoppt beim `terminate`.
- `SidecarManager.swift` — findet `ideagraph-backend` im Bundle (`Bundle.main.url(forResource:)`), wählt freien Port ab 8000, setzt `DATABASE_URL=sqlite:////Users/.../Library/Caches/IdeaGraph/ideagraph.db` (Caches statt `Application Support` wegen PyInstaller-Leerzeichen-Bug, siehe unten), startet `Process`, loggt stdout/stderr, health-check `http://127.0.0.1:$PORT/health`, beendet beim App-Exit.
- `APIClient.swift` — `base = http://127.0.0.1:\(port)`, async/await für alle Endpunkte (`listIdeas`, `createIdea`, … `getGraph`, `getStats`).
- SwiftUI Views 1:1 zu React: `Sidebar` (NavigationSplitView), `DashboardView`, `IdeaListView` + `IdeaFormView`, `ConnectionFormView`, `GraphView` (Canvas + Force-Simulation mit Timer, Drag & Drop, Zoom/Pan, Tag-Punkt, Typ-Farben), `TimelineView`. Dunkles Theme `#09090b`/`#18181b`/`#27272a`, Indigo `#6366f1`.

### Datenpersistenz
- Beim Start wird `~/Library/Caches/IdeaGraph/` (und `~/Library/Application Support/IdeaGraph/` für Kompatibilität) angelegt.
- Sidecar bekommt `DATABASE_URL` als env; DB liegt in `Caches/IdeaGraph/ideagraph.db` (statt `Application Support` mit Leerzeichen, da PyInstaller-`onefile` mit Leerzeichen im SQLite-Pfad hängt — Python direkt funktioniert, Binary nicht; daher Caches ohne Leerzeichen; DB persistiert zwischen Neustarts).
- `frontend/` bleibt erhalten für späteren Tauri-Build.

### Voraussetzungen (macOS)
- Xcode 15+ (getestet 26.6, Swift 6.3, macOS 14 SDK), `xcodegen` (`brew install xcodegen`)
- Python 3.12 (`brew install python@3.12`), `pyinstaller` (`python3.12 -m pip install pyinstaller`)

### Backend als Sidecar bauen
```bash
# 1. Sidecar-Entrypoint bereits vorhanden: backend/run_server.py
cat backend/run_server.py  # uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT",8000)))

# 2. Binary bauen (Python 3.12, NICHT 3.14)
python3.12 -m pip install --break-system-packages -r backend/requirements.txt pyinstaller
python3.12 -m PyInstaller --name ideagraph-backend --onefile backend/run_server.py \
  --distpath sidecar --workpath /tmp/pyinstaller_build --specpath /tmp --clean --noconfirm \
  --hidden-import=uvicorn.logging --hidden-import=uvicorn.lifespan --collect-submodules app
cp sidecar/ideagraph-backend sidecar/ideagraph-backend-aarch64-apple-darwin
cp sidecar/ideagraph-backend macOS/Resources/
```

### macOS App bauen
```bash
# XcodeGen → .xcodeproj erzeugen
xcodegen generate --spec macOS/project.yml --project macOS

# Build (Debug, ad-hoc signiert, kein Hardened Runtime)
xcodebuild -project macOS/IdeaGraph.xcodeproj -scheme IdeaGraph -configuration Debug build

# .app liegt dann in DerivedData, z. B.:
find ~/Library/Developer/Xcode/DerivedData -name "IdeaGraph.app" -type d | head
# Für Doppelklick bequem kopieren:
cp -R ~/Library/Developer/Xcode/DerivedData/IdeaGraph-*/Build/Products/Debug/IdeaGraph.app ./IdeaGraph.app
# oder aus macOS/ heraus:
xcodebuild -project macOS/IdeaGraph.xcodeproj -scheme IdeaGraph -configuration Release build  # optional
```

### Starten & Testen
```bash
# Doppelklick im Finder:
open IdeaGraph.app
# oder im Terminal zum Log-Sehen:
./IdeaGraph.app/Contents/MacOS/IdeaGraph
# Sidecar läuft auf http://127.0.0.1:8000 (falls belegt, nimmt SidecarManager 8001+)
curl http://127.0.0.1:8000/health  # → {"status":"ok"}
# In der App: Idee anlegen → Dashboard zählt, 2. Idee + Verbindung → Graph zeigt Edge, Timeline „Letzte Woche“, Graph Drag/Zoom/Click→Sheet, DB wächst in ~/Library/Caches/IdeaGraph/ideagraph.db
```
- **Ohne Signing:** Beim ersten Start Rechtsklick → Öffnen → Öffnen (Gatekeeper).
- **Beenden:** Fenster schließen → Sidecar wird via `process.terminate()` sauber beendet.

### Warum so?
- Swift lernen, nur macOS privat nutzen → SwiftUI nativ sinnvoll.
- Backend als Binary portabel → später Tauri (React) für Win/Linux kann dasselbe `sidecar/ideagraph-backend-*` nutzen, kein Rewrite.
- `frontend/` bleibt als Web-Fallback.

---

## 🧪 Test (kurz)

### Backend-Smoke (ohne Server)

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

### Manuell
1. Backend + Frontend starten (s. oben)
2. Im Frontend: Idee erstellen → in Liste + Dashboard zählen
3. Zweite Idee → Verbindung erstellen (Graph zeigt Edge)
4. Graph: Drag, Zoom, Click → Details
5. Timeline: „Letzte Woche“ zeigt frische Ideen
6. Dashboard: Tag-Cloud, Heatmap prüfen

---

## ⚙️ Konfiguration

- `DATABASE_URL` env überschreibt SQLite-Pfad (Default `sqlite:///./ideagraph.db` → `backend/ideagraph.db`)
- CORS: `allow_origins=["*"]` für MVP (für Prod einschränken)
- Frontend-Proxy in `frontend/vite.config.ts`

---

## 📝 Notizen / Entscheidungen

- **Tags** werden als JSON-String gespeichert – kein separates Tag-Modell → MVP-einfach, Filter in Python (statt SQLite JSON1)
- **Connection-Label** optional ergänzt (PROJEKT: „Verbesonderung anzeigen“) – UI zeigt Typ + Label
- **Graph-Filter** nach Tag: blendet nur passende Nodes/Edges ein (statt Ausgrauen) → klarer bei vielen Nodes
- **Heatmap** = letzte 30 Tage (statt 365) → passt zu MVP & `stats`-Response (`ideas_per_day` + `heatmap` identisch, 30 Einträge)
- **Python-Version**: README verlangt `pip`/`uvicorn` – Root-`requirements.txt` + `backend/main.py` Shim stützen beides

---

## 🗺️ Weiter denkbar

- Auth (pro User eigene Ideen)
- Volltext-Suche (FTS5)
- Graph: vis.js oder Canvas für >500 Nodes
- Export (Markdown/JSON)

---

## Lizenz

MVP-Beispielprojekt – frei nutzbar.
