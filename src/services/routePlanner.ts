import { ALL_STOPS, LINES_MAP } from '../data';
import { BusStop, CustomLocationPoint, RoutePlanOption, SavedPlace, LiveVehicle } from '../types';
import { fetchLiveArrivals } from './telematics';

const SAVED_PLACES_KEY = 'ioannina_saved_places_v1';

export const DEFAULT_PRESET_PLACES: SavedPlace[] = [
  {
    id: 'uoi-dourouti',
    name: '🎓 Πανεπιστήμιο (Δουρούτη)',
    lat: 39.6174,
    lng: 20.8407,
    icon: 'school',
    createdAt: 1700000000000
  },
  {
    id: 'pgni-hospital',
    name: '🏥 Πανεπιστημιακό Νοσοκομείο (ΠΓΝΙ)',
    lat: 39.6178,
    lng: 20.8510,
    icon: 'hospital',
    createdAt: 1700000000000
  },
  {
    id: 'chatzikosta-hospital',
    name: '🏥 Νοσοκομείο Χατζηκώστα',
    lat: 39.6705,
    lng: 20.8388,
    icon: 'hospital',
    createdAt: 1700000000000
  },
  {
    id: 'center-dikastiria',
    name: '🏛️ Κέντρο / Δικαστήρια',
    lat: 39.6645,
    lng: 20.8538,
    icon: 'pin',
    createdAt: 1700000000000
  },
  {
    id: 'ktel-ioannina',
    name: '🚌 Υπεραστικό ΚΤΕΛ',
    lat: 39.6672,
    lng: 20.8492,
    icon: 'pin',
    createdAt: 1700000000000
  },
  {
    id: 'lake-molos',
    name: '🌊 Μώλος / Λίμνη Παμβώτιδα',
    lat: 39.6701,
    lng: 20.8607,
    icon: 'pin',
    createdAt: 1700000000000
  }
];

/**
 * Calculate distance in meters using Haversine formula
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Estimate walking duration in minutes (avg 80m/min ~ 4.8 km/h)
 */
export function calculateWalkingMinutes(meters: number): number {
  if (meters <= 30) return 0;
  return Math.max(1, Math.round(meters / 80));
}

/**
 * Find candidate bus stops near a geographic coordinate
 */
export function findNearbyStops(lat: number, lng: number, maxRadiusMeters: number = 800): Array<{ stop: BusStop; distance: number }> {
  const list: Array<{ stop: BusStop; distance: number }> = [];

  for (const stop of ALL_STOPS) {
    if (!stop.lat || !stop.lng) continue;
    const dist = calculateDistanceMeters(lat, lng, stop.lat, stop.lng);
    if (dist <= maxRadiusMeters) {
      list.push({ stop, distance: dist });
    }
  }

  // Sort closest first
  list.sort((a, b) => a.distance - b.distance);
  // Return top 6 candidates
  return list.slice(0, 6);
}

/**
 * Find direct transit route options between Origin and Destination
 */
export async function planDirectRoutes(
  origin: CustomLocationPoint,
  destination: CustomLocationPoint,
  includeLiveDepartures: boolean = true
): Promise<RoutePlanOption[]> {
  // 1. Identify boarding candidate stops
  let boardingCandidates: Array<{ stop: BusStop; distance: number }> = [];
  if (origin.stopCode) {
    const s = ALL_STOPS.find(st => st.code === origin.stopCode);
    if (s) boardingCandidates = [{ stop: s, distance: 0 }];
  }
  if (boardingCandidates.length === 0) {
    boardingCandidates = findNearbyStops(origin.lat, origin.lng, 900);
  }

  // 2. Identify alighting candidate stops
  let alightingCandidates: Array<{ stop: BusStop; distance: number }> = [];
  if (destination.stopCode) {
    const s = ALL_STOPS.find(st => st.code === destination.stopCode);
    if (s) alightingCandidates = [{ stop: s, distance: 0 }];
  }
  if (alightingCandidates.length === 0) {
    alightingCandidates = findNearbyStops(destination.lat, destination.lng, 900);
  }

  if (boardingCandidates.length === 0 || alightingCandidates.length === 0) {
    return [];
  }

  // 3. Match lines between boarding and alighting stops
  const rawOptions: RoutePlanOption[] = [];
  const seenCombos = new Set<string>();

  for (const b of boardingCandidates) {
    for (const a of alightingCandidates) {
      if (b.stop.code === a.stop.code) continue;

      // Common lines that visit both stops
      const commonLines = b.stop.lines.filter(line => a.stop.lines.includes(line));
      if (commonLines.length === 0) continue;

      const betweenStopsMeters = calculateDistanceMeters(b.stop.lat, b.stop.lng, a.stop.lat, a.stop.lng);
      if (betweenStopsMeters < 120) continue; // Too close for bus

      const walkToMeters = b.distance;
      const walkToMins = calculateWalkingMinutes(walkToMeters);
      const walkFromMeters = a.distance;
      const walkFromMins = calculateWalkingMinutes(walkFromMeters);

      // Estimated ride time ~ 22 km/h (~360 meters per min)
      const estimatedRideMinutes = Math.max(3, Math.round(betweenStopsMeters / 360));

      for (const lineCode of commonLines) {
        const comboKey = `${lineCode}-${b.stop.code}-${a.stop.code}`;
        if (seenCombos.has(comboKey)) continue;
        seenCombos.add(comboKey);

        const lineMeta = LINES_MAP.get(lineCode);
        const lineColor = lineMeta?.color || '#2563eb';
        const lineTextColor = lineMeta?.textColor || '#ffffff';
        const lineName = lineMeta?.name_el || `Γραμμή ${lineCode}`;

        rawOptions.push({
          id: comboKey,
          lineCode,
          lineName,
          lineColor,
          lineTextColor,
          boardingStop: b.stop,
          alightingStop: a.stop,
          walkToBoardingMeters: walkToMeters,
          walkToBoardingMinutes: walkToMins,
          walkFromAlightingMeters: walkFromMeters,
          walkFromAlightingMinutes: walkFromMins,
          estimatedRideMinutes,
          totalMinutes: walkToMins + estimatedRideMinutes + walkFromMins + 5, // default 5m wait
          liveMinutesUntil: null,
          stopsCount: Math.max(2, Math.round(betweenStopsMeters / 350))
        });
      }
    }
  }

  // 4. Optionally query live telematics for candidate boarding stops to get real departure minutes
  if (includeLiveDepartures && rawOptions.length > 0) {
    const uniqueBoardingCodes = Array.from(new Set(rawOptions.map(o => o.boardingStop.code))).slice(0, 4);

    try {
      const departureResults = await Promise.all(
        uniqueBoardingCodes.map(async code => {
          try {
            const data = await fetchLiveArrivals(code);
            return { code, vehicles: data.vehicles };
          } catch {
            return { code, vehicles: [] as LiveVehicle[] };
          }
        })
      );

      const departureMap = new Map<string, LiveVehicle[]>();
      departureResults.forEach((r: { code: string; vehicles: LiveVehicle[] }) => departureMap.set(r.code, r.vehicles));

      for (const opt of rawOptions) {
        const vehicles = departureMap.get(opt.boardingStop.code) || [];
        // Match vehicle by line code
        const matchingVehicle = vehicles.find((v: LiveVehicle) => {
          const vCode = v.line.trim().padStart(2, '0');
          const optCode = opt.lineCode.trim().padStart(2, '0');
          return vCode === optCode || v.line === opt.lineCode;
        });

        if (matchingVehicle) {
          opt.liveMinutesUntil = matchingVehicle.minutesUntil;
          // Recalculate total time with real live minutes
          opt.totalMinutes = opt.walkToBoardingMinutes + matchingVehicle.minutesUntil + opt.estimatedRideMinutes + opt.walkFromAlightingMinutes;
        }
      }
    } catch {
      // Ignore telematics failures and use estimated wait time
    }
  }

  // Sort options: Live arrivals first, then by total journey time
  rawOptions.sort((a, b) => {
    if (a.liveMinutesUntil !== null && b.liveMinutesUntil === null) return -1;
    if (a.liveMinutesUntil === null && b.liveMinutesUntil !== null) return 1;
    return a.totalMinutes - b.totalMinutes;
  });

  return rawOptions.slice(0, 8);
}

/**
 * OpenStreetMap Nominatim search for Ioannina addresses and places
 */
export async function searchIoanninaNominatim(query: string): Promise<Array<{ name: string; lat: number; lng: number }>> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    cleanQuery + ', Ιωάννινα'
  )}&viewbox=20.70,39.75,20.95,39.55&bounded=1&limit=5&accept-language=el`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'IoanninaBusTransitApp/1.2 (https://github.com/MorfidisJ/ioannina-bus)'
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      name: item.display_name.split(',')[0] + (item.display_name.split(',')[1] ? ', ' + item.display_name.split(',')[1] : ''),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch {
    return [];
  }
}

/**
 * Saved custom places management in localStorage
 */
export function getSavedPlaces(): SavedPlace[] {
  try {
    const raw = localStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) {
      localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(DEFAULT_PRESET_PLACES));
      return DEFAULT_PRESET_PLACES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PRESET_PLACES;
  }
}

export function saveCustomPlace(place: Omit<SavedPlace, 'id' | 'createdAt'>): SavedPlace {
  const current = getSavedPlaces();
  const newPlace: SavedPlace = {
    ...place,
    id: 'place_' + Date.now(),
    createdAt: Date.now()
  };
  const updated = [newPlace, ...current];
  localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(updated));
  return newPlace;
}

export function deleteCustomPlace(id: string): void {
  const current = getSavedPlaces();
  const updated = current.filter(p => p.id !== id);
  localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(updated));
}
