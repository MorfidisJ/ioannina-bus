# Ioannina Bus (Αστικό ΚΤΕΛ Ιωαννίνων) - Live Telematics & Favorite Stops

A high-performance, real-time transit tracker for **all 429 bus stops** and **all bus lines** in Ioannina, Greece. Available as both a modern web app and a standalone native Android application (APK).

---

## 📱 Download Android APK

The native Android app is ready to install! Download the latest APK release directly:

[![Download APK](https://img.shields.io/badge/Download_APK-v1.3.0-emerald?style=for-the-badge&logo=android)](https://github.com/MorfidisJ/ioannina-bus/releases/latest)

👉 **[Download ioannina-bus.apk from GitHub Releases (v1.3.0)](https://github.com/MorfidisJ/ioannina-bus/releases/download/v1.3.0/ioannina-bus.apk)**

*Self-contained: Connects directly to the CityBus telematics service via native CapacitorHttp without requiring any local backend.*

---

## ✨ Features

- 🔄 **Multi-Leg Transfer Graph Routing (Μηχανή Δρομολόγησης με Μετεπιβίβαση)**:
  - Solves the connectivity gap for non-central suburbs (e.g. Ανατολή, Καρδαμίτσια, Σεισμόπληκτα, Εξοχή) that have no direct line to the University (Δουρούτη) or Hospitals (ΠΓΝΙ, Χατζηκώστα).
  - Graph-based connection routing across all 16 lines and 429 stops via Ioannina transit hubs (*Σταθμαρχείο*, *Άλσος*, *Δικαστικά Μέγαρα*, *Πλατεία Πύρρου*, *Υπεραστικό ΚΤΕΛ*).
  - Step-by-step breakdown: `[Γραμμή 1] ➔ 🔄 Αλλαγή στον Κόμβο (Περπάτημα / Αναμονή) ➔ [Γραμμή 2]`.
  - Synchronizes live telematics for both legs with safety connection buffers.
  - Multi-segment interactive map visualization showing walking paths, transfer hub pins, and distinct route color lines.
- 🚦 **Real-Time Traffic Jam & Delay Anomaly Detector (Ανιχνευτής Κίνησης & Καθυστερήσεων)**:
  - Differential GPS velocity tracking: computes speed differentials $v_{bus} = \frac{\Delta d}{\Delta t}$ across consecutive telematics updates.
  - Intelligent Stop Dwell Filter: reliably distinguishes normal passenger boarding ($\le 35\text{m}$ from stops) from real gridlock ($> 40\text{m}$ with speed $< 8\text{ km/h}$).
  - Geofences Ioannina traffic choke points (Λεωφ. Δωδώνης, Οδός Αβέρωφ/Κέντρο, Οδός 28ης Οκτωβρίου, Κόμβος Άλσους).
  - Dynamically adjusts arrival ETAs and displays alert badges (`⚠️ Κίνηση στη Δωδώνης (+4') • 5 km/h`) on live arrivals cards and pulsating bus markers on the map.
- 🧭 **Universal Transit Route Planner («Πώς θα πάω εκεί;»)**:
  - Multi-modal Point A ➔ Point B trip planner across all 16 bus lines in Ioannina.
  - **Custom Locations Support**: Pick any custom point by tapping on the interactive map, typing any street address (OpenStreetMap Nominatim geocoding), using live GPS, or choosing a bus stop.
  - **Saved Places ("Τα Σημεία μου")**: Save personalized locations (*"Σπίτι μου"*, *"Γυμναστήριο"*, *"Δουλειά"*) in local storage.
  - Instant direct line matching with walking distance/time calculations and live telematics departures.
  - Interactive map route visualization: Walking path (dashed blue), boarding stop, colored bus transit route line, alighting stop, and final walking path (dashed green).
- 📱 **Native Android Home Screen Widget**:
  - Live arrival countdowns directly on the Android home screen without opening the app!
  - Displays favorite stop name, top arriving bus lines, live minutes remaining, and update timestamp.
  - 1-tap refresh button (🔄) and 1-tap launch into the full app.
  - In-app "📱 Widget" button on any stop to immediately sync it as your home widget.
- 🗺️ **Interactive Live Map (Leaflet / Dark & Light Mode)**:
  - Real-time vehicle positions with authentic line badges on OpenStreetMap.
  - Active stop marker with pulsating beacon and nearby stops within 800m.
  - One-click auto-fit bounds for stop + incoming buses, and user GPS tracking.
  - Map theme toggle (Dark / Light) with custom Leaflet tilePane filter.
- 🔔 **Arrival Push Alarm & In-App Chime**:
  - One-tap alarm setup (2, 5, or 8 minutes before arrival) on any approaching bus.
  - Native Android Push Notifications via `@capacitor/local-notifications` + Web Notifications.
  - Melodic transit chime generated via Web Audio API & device vibration patterns.
  - Persistent floating status banner with quick-dismiss.
- ⏱️ **Smooth Real-Time Seconds Ticker**:
  - Accurate second-by-second countdown between 20-second API polling cycles.
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

