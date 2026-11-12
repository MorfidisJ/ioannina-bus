/**
 * Fetch and export all stops and lines from CityBus Ioannina (Agency 106)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_WEB_URL = 'https://ioannina.citybus.gr/el/stops';
const BASE_API_URL = 'https://rest.citybus.gr/api/v1';
const AGENCY_ID = 106;

async function getJwtToken() {
  console.log('[1/3] Fetching token from ioannina.citybus.gr/el/stops...');
  const res = await fetch(BASE_WEB_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const html = await res.text();
  const match = html.match(/const\s+token\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('JWT token not found in HTML');
  return match[1];
}

async function apiGet(endpoint, token, lang = 'el') {
  const url = `${BASE_API_URL}/${lang}/${AGENCY_ID}/${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://ioannina.citybus.gr',
      'Referer': 'https://ioannina.citybus.gr/'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.json();
}

async function main() {
  try {
    const token = await getJwtToken();
    console.log('[2/3] Fetching all lines and stops from rest.citybus.gr...');

    const [linesEl, linesEn, stopsEl, stopsEn] = await Promise.all([
      apiGet('lines', token, 'el'),
      apiGet('lines', token, 'en'),
      apiGet('stops', token, 'el'),
      apiGet('stops', token, 'en')
    ]);

    console.log(`Found ${stopsEl.length} stops and ${linesEl.length} lines.`);

    // Build English stops map
    const enStopsMap = new Map();
    if (Array.isArray(stopsEn)) {
      stopsEn.forEach(s => enStopsMap.set(String(s.code || s.id), s));
    }

    // Build merged stops dictionary
    const mergedStops = stopsEl.map(s => {
      const code = String(s.code);
      const enMatch = enStopsMap.get(code);
      return {
        id: s.id,
        code,
        name_el: s.name || '',
        name_en: enMatch?.name || s.name || '',
        lat: parseFloat(s.latitude || 0),
        lng: parseFloat(s.longitude || 0),
        lines: Array.isArray(s.lineCodes) ? s.lineCodes : []
      };
    });

    // Build English lines map
    const enLinesMap = new Map();
    if (Array.isArray(linesEn)) {
      linesEn.forEach(l => enLinesMap.set(String(l.code || l.id), l));
    }

    const mergedLines = linesEl.map(l => {
      const code = String(l.code);
      const enMatch = enLinesMap.get(code);
      return {
        id: l.id,
        code,
        name_el: l.name || '',
        name_en: enMatch?.name || l.name || '',
        color: l.color || '#38bdf8',
        textColor: l.textColor || '#ffffff',
        routes: Array.isArray(l.routes) ? l.routes : []
      };
    });

    const dataDir = path.resolve(__dirname, '..', 'data');
    fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(path.join(dataDir, 'stops.json'), JSON.stringify(mergedStops, null, 2), 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'lines.json'), JSON.stringify(mergedLines, null, 2), 'utf-8');

    console.log('[3/3] Successfully saved:');
    console.log(`  - ${path.join(dataDir, 'stops.json')} (${mergedStops.length} stops with lat, lng, lines)`);
    console.log(`  - ${path.join(dataDir, 'lines.json')} (${mergedLines.length} lines)`);
  } catch (err) {
    console.error('Error importing stops:', err);
    process.exit(1);
  }
}

main();
