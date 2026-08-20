# IdeaGraph

## Konzept
Eine Web-App zum Tracken von Ideen mit interaktiver Graph-Visualisierung. Zusammenhänge zwischen Ideen werden als Netzwerk dargestellt – ähnlich Obsidian, aber spezialisiert auf Ideen-Entwicklung und -Management.

## Kern-Features

### 1. Idee-Management
- Idee erstellen (Titel, Beschreibung, Quelle/Tags)
- Idee bearbeiten / löschen
- Ideenliste mit Suche und Filter
- Zeitstempel automatisch

### 2. Graph-Visualisierung
- Interaktiver Force-Directed Graph (D3.js oder vis.js)
- Nodes = Ideen, Edges = Verbindungen
- Zoom, Pan, Drag & Drop
- Farbcodierung nach Tags
- Klick auf Node zeigt Details

### 3. Verbindungen
- Ideen miteinander verbinden (UI: Drag von A nach B oder Auswahlmenü)
- Verbindungstypen: "entstand aus", "ähnlich zu", "kontrastiert mit"
- Verbesonderung anzeigen

### 4. Zeitleiste
- Ideen nach Datum sortiert sehen
- "Was kam in letzter Woche?"

### 5. Dashboard
- Stats: Anzahl Ideen, Verbindungen, Top-Tags
- Tag-Cloud
- Aktivitäts-Heatmap (Kalender)

## Tech-Stack
- **Backend**: FastAPI (Python) + SQLite
- **Frontend**: React + Tailwind CSS
- **Graph**: D3.js (force-directed layout)
- **API**: REST mit folgenden Endpoints:
  - `POST /ideas` - Idee erstellen
  - `GET /ideas` - Alle Ideen
  - `GET /ideas/:id` - Einzelne Idee
  - `PUT /ideas/:id` - Idee aktualisieren
  - `DELETE /ideas/:id` - Idee löschen
  - `POST /connections` - Verbindung erstellen
  - `DELETE /connections/:id` - Verbindung löschen
  - `GET /graph` - Kompletter Graph (Nodes + Edges)
  - `GET /stats` - Dashboard-Daten

## Design
- Modern, clean, dunkles Theme
- Minimalistisch, Fokus auf Inhalt
- Responsive (mobil nutbar)
- Sidebar für Navigation

## Setup
- `pip install -r requirements.txt`
- `uvicorn main:app --reload` (Backend)
- `npm install && npm run dev` (Frontend)
- README mit genauen Schritten

## Code-Qualität
- Sauber strukturiert, Modulare Architektur
- TypeScript für Frontend
- Type Hints für Backend
- Kommentare an kritischen Stellen
- Keine Over-Engineering, MVP-Fokus

## Ziel
Ein funktionierendes MVP, das ich persönlich nutzen kann, um meine eigenen Ideen zu tracken und Zusammenhänge zu entdecken.
