# Astiko KTEL Ioannina - Real-Time Telematics & Transit API

Comprehensive technical guide and endpoint reference for reverse-engineering and querying real-time bus locations, arrivals, and schedules from **Αστικό ΚΤΕΛ Ιωαννίνων** (CityBus Ioannina, Agency ID `106`).

---

## 1. Quick Overview

- **Web Portal**: [https://astiko-ioannina.gr/tilematiki/](https://astiko-ioannina.gr/tilematiki/)
- **Embedded Web Client**: [https://ioannina.citybus.gr/el/stops](https://ioannina.citybus.gr/el/stops)
- **REST API Base URL**: `https://rest.citybus.gr/api/v1`
- **Agency ID**: `106` (Ioannina Urban Bus Service)
- **Authentication**: Dynamic `Bearer <JWT_TOKEN>` extracted directly from `https://ioannina.citybus.gr/el/stops`.
- **CORS Restriction**: The REST API requires `Origin: https://ioannina.citybus.gr` and enforces CORS on client browsers. For frontend web applications (React, Vue, etc.), queries must be routed through a backend server or serverless proxy (such as `/api/bus-live`).

---

## 2. Authentication & Token Extraction

The token is embedded in the HTML of the official stops webpage:
```html
<script>
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
</script>
```

### Token Extraction Pattern
- **Regex**: `const\s+token\s*=\s*['"]([^'"]+)['"]`
- **Cache Recommendation**: Cache the extracted token in memory for **40 to 45 minutes**.
- **Retry Logic**: If any API endpoint returns HTTP `401 Unauthorized`, invalidate the cached token, re-fetch the web page to extract a fresh token, and retry the request once.

---

## 3. Core API Endpoints

All endpoints use `GET` and require the Bearer token in the request headers:
```http
GET https://rest.citybus.gr/api/v1/{lang}/106/{endpoint}
Authorization: Bearer <TOKEN>
Origin: https://ioannina.citybus.gr
Referer: https://ioannina.citybus.gr/
```
`{lang}` can be `el` (Greek) or `en` (English).

### 3.1 Live Stop Departures (Real-Time GPS Tracking)
```http
GET /api/v1/{lang}/106/stops/live/{stopCode}
```
- **Description**: Returns live vehicle arrivals within the next 30 minutes for a specified stop.
- **HTTP Status Codes**:
  - `200 OK`: One or more vehicles are currently transmitting GPS data towards this stop.
  - `404 Not Found`: Normal response when no vehicles are within the 30-minute window (e.g. late night, off-peak, or terminal dwell). Treat this gracefully as `vehicles: []`.
- **Response Structure**:
```json
{
  "stopCode": "400",
  "vehicles": [
    {
      "lineCode": "16",
      "lineName": "16 - ΠΑΝΕΠΙΣΤΗΜΙΟ",
      "routeName": "ΔΙΚΑΣΤΗΡΙΑ - ΠΑΝΕΠΙΣΤΗΜΙΟ - ΝΟΣΟΚΟΜΕΙΟ",
      "departureMins": 4,
      "departureSeconds": 240,
      "vehicleCode": "32",
      "latitude": 39.6645,
      "longitude": 20.8512
    }
  ]
}
```

### 3.2 Scheduled Stop Departures (Timetable)
```http
GET /api/v1/{lang}/106/trips/stop/{stopCode}/day/{dayType}
```
- **Description**: Returns full day scheduled departures for a stop.
- **`{dayType}` parameter**:
  - `1`: Weekdays (Καθημερινές / Monday - Friday)
  - `2`: Saturdays (Σάββατο)
  - `3`: Sundays & Holidays (Κυριακές & Αργίες)

### 3.3 All Transit Lines
```http
GET /api/v1/{lang}/106/lines
```
- **Description**: Lists all active bus lines (16, 17, 10, etc.) with line codes, Greek/English names, and color codes.

### 3.4 All Stops (Master Registry)
```http
GET /api/v1/{lang}/106/stops
```
- **Description**: Complete list of all stops in Ioannina with stop codes, stop names, latitude, and longitude.

### 3.5 Route Sequence & Coordinates
```http
GET /api/v1/{lang}/106/routes/{routeCode}/sequence
```
- **Description**: Ordered sequence of stops for a specific route with path coordinates.

---

## 4. Usage in Python

Run the standalone script:
```bash
python ioannina_bus_telematics.py 400
```

Import in your own code:
```python
from ioannina_bus_telematics import IoanninaBusTelematics

client = IoanninaBusTelematics()

# Get live departures for Court House (Stop 400)
live_data = client.get_live_stop("400", lang="el")
if live_data["isLive"]:
    for bus in live_data["vehicles"]:
        print(f"Line {bus['line']} arriving in {bus['minutesUntil']} min (Bus #{bus['vehicleCode']})")
else:
    print("No live buses transmitting right now.")
```

---

## 5. Usage in Node.js / TypeScript

Run the standalone script:
```bash
node ioannina_bus_telematics.js 400
```

Import in your own module:
```javascript
import { getLiveStop, getStopSchedule } from './ioannina_bus_telematics.js';

const live = await getLiveStop('400', 'el');
console.log(live);
```

