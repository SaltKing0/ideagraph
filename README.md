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
│   └── requirements.txt
├── frontend/
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
│   │       ├── GraphView.tsx   # D3 Force
│   │       └── Timeline.tsx
│   ├── vite.config.ts        # Proxy /ideas → :8000
│   ├── tailwind.config.js
│   └── package.json
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
