import { Capacitor } from '@capacitor/core';
import { LiveVehicle, ScheduledTrip } from '../types';

const CITYBUS_BASE_WEB = 'https://ioannina.citybus.gr/el/stops';
const CITYBUS_BASE_API = 'https://rest.citybus.gr/api/v1';
const CITYBUS_AGENCY_ID = 106;

let nativeCachedToken: string | null = null;
let nativeTokenExpiry = 0;

async function getNativeToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (nativeCachedToken && !forceRefresh && now < nativeTokenExpiry) {
    return nativeCachedToken;
  }
  const res = await fetch(CITYBUS_BASE_WEB, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching token`);
  const html = await res.text();
  const match = html.match(/const\s+token\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('JWT token not found in CityBus webpage');
  nativeCachedToken = match[1];
  nativeTokenExpiry = now + 40 * 60 * 1000;
  return nativeCachedToken;
}

async function nativeCityBusGet(endpoint: string, lang = 'el') {
  let token = await getNativeToken();
  const url = `${CITYBUS_BASE_API}/${lang}/${CITYBUS_AGENCY_ID}/${endpoint.replace(/^\//, '')}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Origin': 'https://ioannina.citybus.gr',
    'Referer': 'https://ioannina.citybus.gr/'
  };

  let res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (res.status === 401) {
    token = await getNativeToken(true);
    headers['Authorization'] = `Bearer ${token}`;
    res = await fetch(url, { headers });
  }
  if (!res.ok) throw new Error(`CityBus API ${res.status}`);
  return await res.json();
}

/**
 * Fetch real-time live vehicle arrivals for any stop
 * Works both on Web (via /api/live) and Native Android (direct CityBus API)
 */
export async function fetchLiveArrivals(stopCode: string, lang: 'el' | 'en' = 'el'): Promise<{
  isLive: boolean;
  vehicles: LiveVehicle[];
  stopCode: string;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      const data = await nativeCityBusGet(`stops/live/${stopCode}`, lang);
      const rawVehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];
      const vehicles: LiveVehicle[] = rawVehicles.map((v: any) => {
        const mins = v.departureMins ?? 0;
        const secs = v.departureSeconds ?? 0;
        return {
          line: String(v.lineCode || ''),
          lineName: v.lineName || '',
          routeName: v.routeName || '',
          minutesUntil: (mins === 0 && secs <= 30) ? 0 : mins + 1,
          departureSeconds: secs,
          vehicleCode: String(v.vehicleCode || ''),
          latitude: v.latitude,
          longitude: v.longitude
        };
      });
      return {
        isLive: vehicles.length > 0,
        vehicles,
        stopCode
      };
    } catch (e: any) {
      console.warn('Native direct telematics failed, fallback to /api/live:', e);
    }
  }

  // Web mode (or fallback)
  const res = await fetch(`/api/live?stopCode=${encodeURIComponent(stopCode)}&lang=${lang}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return {
    isLive: Boolean(data.isLive && Array.isArray(data.vehicles) && data.vehicles.length > 0),
    vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
    stopCode: data.stopCode || stopCode
  };
}

/**
 * Fetch scheduled departures timetable for any stop
 * Works both on Web (via /api/schedule) and Native Android (direct CityBus API)
 */
export async function fetchStopSchedule(
  stopCode: string,
  dayType: 1 | 2 | 3 = 1,
  lang: 'el' | 'en' = 'el'
): Promise<ScheduledTrip[]> {
  let rawList: any[] = [];

  if (Capacitor.isNativePlatform()) {
    try {
      const data = await nativeCityBusGet(`trips/stop/${stopCode}/day/${dayType}`, lang);
      rawList = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Native direct schedule failed, fallback to /api/schedule:', e);
    }
  }

  if (rawList.length === 0 && !Capacitor.isNativePlatform()) {
    try {
      const res = await fetch(`/api/schedule?stopCode=${encodeURIComponent(stopCode)}&dayType=${dayType}&lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        rawList = Array.isArray(data.trips) ? data.trips : [];
      }
    } catch (err) {
      console.error('fetchStopSchedule error:', err);
    }
  }

  return rawList.map((t: any) => {
    const timeStr = String(t.departureTime || t.tripTime || '').trim();
    const parts = timeStr.split(':');
    const hour = t.hour !== undefined ? t.hour : (parts[0] ? parseInt(parts[0], 10) : 0);
    const minute = t.minute !== undefined ? t.minute : (parts[1] ? parseInt(parts[1], 10) : 0);
    return {
      ...t,
      departureTime: timeStr,
      tripTime: timeStr,
      hour,
      minute,
      totalMinutes: hour * 60 + minute
    };
  }).sort((a: ScheduledTrip, b: ScheduledTrip) => (a.totalMinutes ?? 0) - (b.totalMinutes ?? 0));
}

/**
 * Haversine distance formula between two GPS coordinates in meters
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Greek to Greeklish converter for fuzzy searching
 */
const GREEK_TO_LATIN: Record<string, string> = {
  'α': 'a', 'ά': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'έ': 'e',
  'ζ': 'z', 'η': 'i', 'ή': 'i', 'θ': 'th', 'ι': 'i', 'ί': 'i', 'ϊ': 'i', 'ΐ': 'i',
  'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'ό': 'o',
  'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'ύ': 'y', 'ϋ': 'y', 'ΰ': 'y',
  'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o', 'ώ': 'o'
};

export function normalizeSearchString(text: string): string {
  if (!text) return '';
  const lower = text.toLowerCase().trim();
  let latin = '';
  for (const char of lower) {
    latin += GREEK_TO_LATIN[char] || char;
  }
  return latin.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Check if search query matches stop by code, Greek name, or Greeklish
 */
export function matchesStopQuery(stopCode: string, nameEl: string, nameEn: string, query: string): boolean {
  if (!query) return true;
  const qClean = query.toLowerCase().trim();
  const qNorm = normalizeSearchString(query);

  if (stopCode.includes(qClean)) return true;
  if (nameEl.toLowerCase().includes(qClean)) return true;
  if (nameEn.toLowerCase().includes(qClean)) return true;

  const elNorm = normalizeSearchString(nameEl);
  const enNorm = normalizeSearchString(nameEn);
  if (elNorm.includes(qNorm) || enNorm.includes(qNorm)) return true;

  return false;
}
