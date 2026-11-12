# Ioannina Bus (Αστικό ΚΤΕΛ Ιωαννίνων) - Live Telematics & Favorite Stops

A high-performance, real-time transit tracker for **all 429 bus stops** and **all bus lines** in Ioannina, Greece.

---

## ✨ Features

- 🌟 **Favorite Stops System**:
  - Save your most frequented stops (e.g. *Φιλοσοφική / Εστιατόριο #930*, *Δικαστικό Μέγαρο #400*, *Νοσοκομείο #451*, *Πλάτανος #201*).
  - Assign custom nicknames (e.g. "Σπίτι", "Σχολή", "Λέσχη", "Κέντρο").
  - Instant one-tap horizontal pill selector with full persistence in `localStorage`.
- 📡 **Real-Time Telematics (All Bus Lines)**:
  - Live satellite GPS vehicle tracking for **every** bus line serving the selected stop (Lines 1, 2, 3, 10, 16, 17, etc.).
  - Live countdown timers (*"σε 3 λεπτά"*, *"Φτάνει τώρα!"*).
  - Authentic line color badges, route names, and vehicle IDs (`#32`).
  - Automatic 20-second background polling with manual instant refresh.
- 🔍 **Instant Smart Search**:
  - Fast client-side fuzzy search across all **429 official bus stops** in Ioannina.
  - Search by **Stop Code** (e.g. `930`, `400`).
  - Search by **Greek Name** (e.g. `Φιλοσοφική`, `Δικαστήρια`, `Πλάτανος`).
  - Search by **Greeklish / Latin Name** (e.g. `filosofiki`, `dikastiko`, `platanos`).
  - Filter stops by specific bus line.
- 🧭 **Geolocation ("Κοντινότερες Στάσεις")**:
  - One-click GPS discovery that calculates live walking distance to all stops and ranks the closest ones first.
- 📅 **Scheduled Departure Timetable**:
  - View full day timetables for any stop (Weekdays, Saturdays, Sundays/Holidays) when buses are off-peak or not transmitting.
- 🗺️ **Google Maps Directions**:
  - One-tap link to get directions directly to the stop in Google Maps.
- 🌐 **Bilingual**:
  - Seamless English / Greek language toggle.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed

### Start with PowerShell
Simply run the included starter script:
```powershell
.\start.ps1
```
Or via standard commands:
```bash
npm install
npm run dev
```
Open **[http://localhost:5174](http://localhost:5174)** in your browser.

---

## 🛠️ Project Structure

```
g:\ioannina-bus\
├── api\                     # Serverless telematics proxy & caching
│   ├── _telematics.js       # Dynamic JWT Bearer token scraper & memory cache
│   ├── live.js              # Real-time vehicle arrivals endpoint (/api/live)
│   └── schedule.js          # Scheduled timetable endpoint (/api/schedule)
├── data\                    # Master transit datasets from CityBus Ioannina
│   ├── stops.json           # All 429 stops with GPS coordinates and line codes
│   └── lines.json           # All lines with authentic colors and routes
├── scripts\
│   └── import_stops.js      # Utility script to re-sync stops directly from CityBus API
├── src\
│   ├── components\
│   │   ├── FavoriteStopsBar.tsx   # Top favorites horizontal pill bar
│   │   ├── LiveArrivalsCard.tsx   # Real-time GPS arrivals display
│   │   ├── StopDetailsHeader.tsx  # Active stop hero header & maps button
│   │   ├── StopSearchModal.tsx    # Modal for fuzzy search & GPS nearest stops
│   │   └── TimetableModal.tsx     # Full day scheduled timetable viewer
│   ├── services\
│   │   └── telematics.ts          # Telematics API client, Haversine formula, search
│   ├── types.ts                   # TypeScript interfaces
│   ├── App.tsx                    # Main orchestrator
│   └── main.tsx                   # React root entry
├── vite.config.ts           # Local Vite dev server with proxy middleware
└── vercel.json              # Zero-config deployment for Vercel
```

