#!/usr/bin/env node
/**
 * Astiko KTEL Ioannina - Real-time Bus Telematics Client (Node.js)
 * Zero external dependencies (uses native fetch in Node 18+).
 */

const BASE_WEB_URL = 'https://ioannina.citybus.gr/el/stops';
const BASE_API_URL = 'https://rest.citybus.gr/api/v1';
const AGENCY_ID = 106; // Ioannina

const STOPS = {
  '930': 'Φιλοσοφική προς Κέντρο / Philosophy School (Closest to Refectory -> City Center)',
  '400': 'Δικαστικό Μέγαρο / Court House (City Center -> Campus)',
  '447': 'Πύλη Πανεπιστημίου / Campus Main Gate (Campus -> City Center)',
  '451': 'Πανεπιστημιακό Νοσοκομείο / University Hospital',
  '201': 'Πλάτανος / Platanos (City Center)',
  '202': 'Ρολόι / Clock Tower (City Center)'
};

let cachedToken = null;
let cachedTokenExpiry = 0;

export async function getToken(forceRefresh = false) {
  const now = Date.now();
  if (cachedToken && !forceRefresh && now < cachedTokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(BASE_WEB_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching telematics page`);
  const html = await res.text();
  const match = html.match(/const\s+token\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('Bearer JWT token not found in HTML');

  cachedToken = match[1];
  cachedTokenExpiry = now + 40 * 60 * 1000; // 40 minutes
  return cachedToken;
}

async function apiGet(endpoint, lang = 'el') {
  let token = await getToken();
  const url = `${BASE_API_URL}/${lang}/${AGENCY_ID}/${endpoint.replace(/^\//, '')}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Origin': 'https://ioannina.citybus.gr',
    'Referer': 'https://ioannina.citybus.gr/'
  };

  let res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (res.status === 401) {
    token = await getToken(true);
    headers['Authorization'] = `Bearer ${token}`;
    res = await fetch(url, { headers });
  }

  if (!res.ok) throw new Error(`API Error ${res.status} on ${endpoint}`);
  return await res.json();
}

export async function getLiveStop(stopCode, lang = 'el') {
  const data = await apiGet(`stops/live/${stopCode}`, lang);
  const rawVehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];

  const vehicles = rawVehicles.map(v => {
    const mins = v.departureMins ?? 0;
    const secs = v.departureSeconds ?? 0;
    return {
      line: v.lineCode || '',
      lineName: v.lineName || '',
      routeName: v.routeName || '',
      minutesUntil: (mins === 0 && secs <= 30) ? 0 : mins + 1,
      departureSeconds: secs,
      vehicleCode: v.vehicleCode || '',
      latitude: v.latitude,
      longitude: v.longitude
    };
  });

  return {
    stopCode: String(stopCode),
    isLive: vehicles.length > 0,
    vehicles
  };
}

export async function getStopSchedule(stopCode, dayType = 1, lang = 'el') {
  const data = (await apiGet(`trips/stop/${stopCode}/day/${dayType}`, lang)) || [];
  if (!Array.isArray(data)) return [];

  return data.map(item => ({
    ...item,
    departureTime: item.tripTime || item.departureTime || '',
    tripTime: item.tripTime || item.departureTime || ''
  }));
}

export async function getAllLines(lang = 'el') {
  return (await apiGet('lines', lang)) || [];
}

export async function getAllStops(lang = 'el') {
  return (await apiGet('stops', lang)) || [];
}

// Run CLI directly if invoked from command line
if (process.argv[1]?.endsWith('ioannina_bus_telematics.js')) {
  const stop = process.argv[2] || '930';
  console.log('==================================================');
  console.log('  Astiko KTEL Ioannina - Node.js Telematics CLI   ');
  console.log('==================================================');
  console.log(`Target: ${STOPS[stop] || `Stop #${stop}`}`);

  getLiveStop(stop, 'el').then(res => {
    if (res.isLive) {
      console.log(`\n[LIVE] Found ${res.vehicles.length} approaching vehicles:`);
      res.vehicles.forEach(v => {
        const arrival = v.minutesUntil === 0 ? 'Arriving now!' : `in ${v.minutesUntil} mins`;
        console.log(`  * Line ${v.line} -> ${v.routeName} | ETA: ${arrival} (Bus #${v.vehicleCode})`);
      });
    } else {
      console.log('\n[STANDBY] No vehicles currently broadcasting (off-peak/night).');
    }
  }).catch(err => console.error('Error:', err.message));
}
