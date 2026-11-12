# Astiko KTEL Ioannina - Real-Time Telematics & Transit API

Comprehensive technical guide and endpoint reference for querying real-time bus locations, GPS arrivals, and official timetables from **Αστικό ΚΤΕΛ Ιωαννίνων** (CityBus Ioannina, Agency ID `106`).

---

## 1. Quick Overview

- **Official Web Portal**: [https://astiko-ioannina.gr/tilematiki/](https://astiko-ioannina.gr/tilematiki/)
- **Embedded Web Client**: [https://ioannina.citybus.gr/el/stops](https://ioannina.citybus.gr/el/stops)
- **REST API Base URL**: `https://rest.citybus.gr/api/v1`
- **Agency ID**: `106` (Ioannina Urban Bus Service / Αστικό ΚΤΕΛ Ιωαννίνων)
- **Authentication**: Dynamic `Bearer <JWT_TOKEN>` extracted directly from `https://ioannina.citybus.gr/el/stops`.
- **CORS Restriction**: The CityBus REST API requires `Origin: https://ioannina.citybus.gr` and `Referer: https://ioannina.citybus.gr/`. Direct requests from client browsers are blocked by CORS. All frontend web applications must route requests through a proxy server or serverless functions (e.g. `/api/live` and `/api/schedule`).

---

## 2. Key Transit & Campus Stops

| Stop ID | Greek Name | English Name | Notes |
|:---:|:---|:---|:---|
| **930** | **Φιλοσοφική προς Κέντρο** | **Philosophy (to Center)** | **Closest stop to University Refectory / Cafeteria (Φοιτητική Λέσχη)** |
| **400** | Δικαστικό Μέγαρο | Court House Hub | Main city center boarding stop towards Campus |
| **447** | Πύλη Πανεπιστημίου | Campus Main Gate | University entrance stop towards City Center |
| **451** | Πανεπιστημιακό Νοσοκομείο | University Hospital | Terminal hub for lines 16 & 17 |
| **201** | Πλάτανος | Platanos Hub | City center & central commercial market |
| **202** | Ρολόι | Clock Tower | Central city square stop |

---

## 3. Dynamic Authentication & Token Extraction

The active Bearer token is embedded in the HTML script tag of `https://ioannina.citybus.gr/el/stops`:

```html
<script>
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
</script>
```

### Token Extraction Regex & Lifecycle:
- **Pattern**: `const\s+token\s*=\s*['"]([^'"]+)['"]`
- **Cache Window**: 40 to 45 minutes in memory.
- **Auto-Refresh**: If any endpoint returns `401 Unauthorized`, invalidate cache, re-fetch HTML for a fresh token, and retry the request once.

---

## 4. REST Endpoints Reference

All requests must include the following headers:
```http
Authorization: Bearer <TOKEN>
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Origin: https://ioannina.citybus.gr
Referer: https://ioannina.citybus.gr/
```

### 4.1 Live Stop Arrivals (Real-Time GPS Tracking)
```http
GET https://rest.citybus.gr/api/v1/{lang}/106/stops/live/{stopCode}
```
- `{lang}`: `el` or `en`
- `{stopCode}`: Numeric stop ID (e.g. `930`, `400`)
- **Status Codes**:
  - `200 OK`: One or more vehicles are currently transmitting GPS data towards this stop.
  - `404 Not Found`: Normal response when no vehicles are within the 30-minute window (off-peak, night, or terminal wait). Treat gracefully as `vehicles: []`.

#### Response Payload:
```json
{
  "stopCode": "930",
  "vehicles": [
    {
      "lineCode": "16",
      "lineName": "16 - ΠΑΝΕΠΙΣΤΗΜΙΟ",
      "routeName": "ΠΑΝΕΠΙΣΤΗΜΙΟ - ΣΕΙΣΜΟΠΛΗΚΤΑ - ΠΕΡΑΜΑ",
      "departureMins": 4,
      "departureSeconds": 240,
      "vehicleCode": "32",
      "latitude": 39.6145,
      "longitude": 20.8412
    }
  ]
}
```

### 4.2 Scheduled Departures Timetable
```http
GET https://rest.citybus.gr/api/v1/{lang}/106/trips/stop/{stopCode}/day/{dayType}
```
- `{dayType}`:
  - `1`: Weekdays (Καθημερινές / Monday – Friday)
  - `2`: Saturdays (Σάββατο)
  - `3`: Sundays & Public Holidays (Κυριακές & Αργίες)

> **Important Schema Note**: The CityBus API returns the departure time in the **`tripTime`** field (`"06:55"`), alongside `tripTimeHour` and `tripTimeMinute`. For universal compatibility, our clients and serverless functions map `tripTime` to `departureTime`.

#### Response Payload:
```json
[
  {
    "id": 63840218,
    "day": 1,
    "routeCode": "1015",
    "routeName": "ΠΑΝΕΠΙΣΤΗΜΙΟ ΚΑΡΔΑΜΙΤΣΑ",
    "lineCode": "10",
    "lineName": "ΝΟΣΟΚΟΜΕΙΟ ΧΑΤΖΗΚΩΣΤΑ ΚΑΡΔΑΜΙΤΣΙΑ",
    "lineColor": "#787878",
    "lineTextColor": "#ffffff",
    "stopCode": "930",
    "stopName": "ΦΙΛΟΣΟΦΙΚΗ ΠΡΟΣ ΚΕΝΤΡΟ",
    "tripTime": "06:55",
    "tripTimeHour": 6,
    "tripTimeMinute": 55
  }
]
```

### 4.3 All Transit Lines
```http
GET https://rest.citybus.gr/api/v1/{lang}/106/lines
```
Returns all 16 official lines with line codes, Greek/English names, and official color codes.

### 4.4 All Bus Stops
```http
GET https://rest.citybus.gr/api/v1/{lang}/106/stops
```
Returns all 429 official bus stops with coordinates (`lat`, `lng`), names, and stop IDs.

---

## 5. Standalone Tools Included in Project

### Python Client (`ioannina_bus_telematics.py`)
Zero external dependencies (uses standard library `urllib`, `re`, `json`).

Run from terminal:
```bash
# Query stop 930 (University Refectory)
python ioannina_bus_telematics.py 930

# Query stop 400 (Court House)
python ioannina_bus_telematics.py 400
```

Use in Python projects:
```python
from ioannina_bus_telematics import IoanninaBusTelematics

client = IoanninaBusTelematics()
live = client.get_live_stop("930", lang="el")

if live["isLive"]:
    for bus in live["vehicles"]:
        print(f"Line {bus['line']} in {bus['minutesUntil']} mins (#{bus['vehicleCode']})")
else:
    print("No active vehicles on GPS right now.")
```

---

### Node.js Client (`ioannina_bus_telematics.js`)
Zero external dependencies (uses native `fetch` in Node 18+).

Run from terminal:
```bash
# Query stop 930 (University Refectory)
node ioannina_bus_telematics.js 930

# Query stop 400 (Court House)
node ioannina_bus_telematics.js 400
```

Use in Node.js / TypeScript projects:
```javascript
import { getLiveStop, getStopSchedule } from './ioannina_bus_telematics.js';

const live = await getLiveStop('930', 'el');
console.log(live);

const timetable = await getStopSchedule('930', 1, 'el');
console.log(`Found ${timetable.length} trips.`);
```

---

## 6. Web Application Architecture (`ioannina-bus`)

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS.
- **Local Dev Proxy**: `vite.config.ts` connects `/api/live` and `/api/schedule` to `api/live.js` and `api/schedule.js`.
- **Production Serverless**: `vercel.json` and `/api` folder deploy as zero-config edge/serverless functions.
- **Offline Data**: `data/stops.json` (429 stops) and `data/lines.json` (16 lines) are bundled locally for instant offline search and zero latency.
