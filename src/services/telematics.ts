import { LiveVehicle, ScheduledTrip } from '../types';

/**
 * Fetch real-time live vehicle arrivals for any stop
 */
export async function fetchLiveArrivals(stopCode: string, lang: 'el' | 'en' = 'el'): Promise<{
  isLive: boolean;
  vehicles: LiveVehicle[];
  stopCode: string;
}> {
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
 */
export async function fetchStopSchedule(
  stopCode: string,
  dayType: 1 | 2 | 3 = 1,
  lang: 'el' | 'en' = 'el'
): Promise<ScheduledTrip[]> {
  const res = await fetch(`/api/schedule?stopCode=${encodeURIComponent(stopCode)}&dayType=${dayType}&lang=${lang}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.trips) ? data.trips : [];
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
  // Remove accents
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

  // Check greeklish normalized form
  const elNorm = normalizeSearchString(nameEl);
  const enNorm = normalizeSearchString(nameEn);
  if (elNorm.includes(qNorm) || enNorm.includes(qNorm)) return true;

  return false;
}
