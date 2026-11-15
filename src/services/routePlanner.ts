import { ALL_STOPS, LINES_MAP } from '../data';
import { BusStop, CustomLocationPoint, RoutePlanOption, SavedPlace, LiveVehicle, RouteLeg } from '../types';
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

// Fast lookup map of stops by line code
const LINE_STOPS_MAP = new Map<string, BusStop[]>();
ALL_STOPS.forEach(s => {
  s.lines.forEach(l => {
    const list = LINE_STOPS_MAP.get(l);
    if (list) {
      list.push(s);
    } else {
      LINE_STOPS_MAP.set(l, [s]);
    }
  });
});

/**
 * Identify major transfer hubs in Ioannina transit network
 */
export function isIoanninaHubStop(stop: BusStop): boolean {
  if (stop.lines.length >= 6) return true;
  const upper = (stop.name_el || '').toUpperCase();
  return (
    upper.includes('ΣΤΑΘΜΑΡΧΕΙΟ') ||
    upper.includes('ΑΛΣΟΣ') ||
    upper.includes('ΔΙΚΑΣΤ') ||
    upper.includes('ΠΛΑΤΕΙΑ') ||
    upper.includes('ΚΤΕΛ') ||
    upper.includes('ΠΑΝΕΠΙΣΤ') ||
    upper.includes('ΧΑΤΖΗΚΩΣΤΑ') ||
    upper.includes('ΡΟΛΟΙ') ||
    upper.includes('ΔΩΔΩΝΗΣ')
  );
}

/**
 * Plan comprehensive transit routes between Origin and Destination
 * Supports both direct lines and 1-transfer graph routing via central hubs
 */
export async function planRoutes(
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

  const directOptions: RoutePlanOption[] = [];
  const seenDirectCombos = new Set<string>();

  // 3. Search Direct routes
  for (const b of boardingCandidates) {
    for (const a of alightingCandidates) {
      if (b.stop.code === a.stop.code) continue;

      const commonLines = b.stop.lines.filter(line => a.stop.lines.includes(line));
      if (commonLines.length === 0) continue;

      const betweenStopsMeters = calculateDistanceMeters(b.stop.lat, b.stop.lng, a.stop.lat, a.stop.lng);
      if (betweenStopsMeters < 120) continue; // Too close for bus

      const walkToMeters = b.distance;
      const walkToMins = calculateWalkingMinutes(walkToMeters);
      const walkFromMeters = a.distance;
      const walkFromMins = calculateWalkingMinutes(walkFromMeters);
      const estimatedRideMinutes = Math.max(3, Math.round(betweenStopsMeters / 360));

      for (const lineCode of commonLines) {
        const comboKey = `${lineCode}-${b.stop.code}-${a.stop.code}`;
        if (seenDirectCombos.has(comboKey)) continue;
        seenDirectCombos.add(comboKey);

        const lineMeta = LINES_MAP.get(lineCode);
        const lineColor = lineMeta?.color || '#2563eb';
        const lineTextColor = lineMeta?.textColor || '#ffffff';
        const lineName = lineMeta?.name_el || `Γραμμή ${lineCode}`;

        directOptions.push({
          id: `direct-${comboKey}`,
          type: 'direct',
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

  // 4. Search 1-Transfer routes via Ioannina Transfer Hubs
  const transferOptions: RoutePlanOption[] = [];
  const processedLinePairs = new Set<string>();

  for (const b of boardingCandidates.slice(0, 3)) {
    for (const l1 of b.stop.lines) {
      for (const a of alightingCandidates.slice(0, 3)) {
        for (const l2 of a.stop.lines) {
          if (l1 === l2) continue; // Direct connection

          const pairKey = `${l1}->${l2}`;
          if (processedLinePairs.has(pairKey)) continue;

          const s1List = LINE_STOPS_MAP.get(l1) || [];
          const s2List = LINE_STOPS_MAP.get(l2) || [];
          if (s1List.length === 0 || s2List.length === 0) continue;

          // Find candidate transfer points (shared stop or walk <= 160m)
          const directShared = s1List.filter(s => s.lines.includes(l2));
          const candidatesToCheck: Array<{ t1: BusStop; t2: BusStop; walkMeters: number }> = [];

          for (const t of directShared) {
            candidatesToCheck.push({ t1: t, t2: t, walkMeters: 0 });
          }

          // If no direct shared stop between these lines, check close stops
          if (candidatesToCheck.length === 0) {
            for (const t1 of s1List) {
              if (!isIoanninaHubStop(t1)) continue; // focus on hubs for distance checks
              for (const t2 of s2List) {
                if (t1.code === t2.code) continue;
                const walk = calculateDistanceMeters(t1.lat, t1.lng, t2.lat, t2.lng);
                if (walk <= 160) {
                  candidatesToCheck.push({ t1, t2, walkMeters: walk });
                }
              }
            }
          }

          const directDistBA = calculateDistanceMeters(b.stop.lat, b.stop.lng, a.stop.lat, a.stop.lng);

          let bestTransfer: {
            t1: BusStop;
            t2: BusStop;
            walkMeters: number;
            score: number;
            d1: number;
            d2: number;
          } | null = null;

          for (const c of candidatesToCheck) {
            const d1 = calculateDistanceMeters(b.stop.lat, b.stop.lng, c.t1.lat, c.t1.lng);
            const d2 = calculateDistanceMeters(c.t2.lat, c.t2.lng, a.stop.lat, a.stop.lng);

            if (d1 < 140 || d2 < 140) continue;
            if (c.t1.code === b.stop.code || c.t2.code === a.stop.code) continue;
            if (d1 + d2 > directDistBA * 2.3 + 1500) continue;

            const isHub = isIoanninaHubStop(c.t1) || isIoanninaHubStop(c.t2);
            let score = 5000 - (d1 + d2) - (c.walkMeters * 6);
            if (isHub) score += 1600;
            if (c.walkMeters === 0) score += 500;

            if (!bestTransfer || score > bestTransfer.score) {
              bestTransfer = {
                t1: c.t1,
                t2: c.t2,
                walkMeters: c.walkMeters,
                score,
                d1,
                d2
              };
            }
          }

          if (bestTransfer) {
            processedLinePairs.add(pairKey);

            const l1Meta = LINES_MAP.get(l1);
            const l2Meta = LINES_MAP.get(l2);

            const leg1Ride = Math.max(3, Math.round(bestTransfer.d1 / 360));
            const transferWalkMins = calculateWalkingMinutes(bestTransfer.walkMeters);
            const transferWaitMins = 4; // Transfer safety buffer
            const leg2Ride = Math.max(3, Math.round(bestTransfer.d2 / 360));

            const walkToBoardingMeters = b.distance;
            const walkToBoardingMinutes = calculateWalkingMinutes(walkToBoardingMeters);
            const walkFromAlightingMeters = a.distance;
            const walkFromAlightingMinutes = calculateWalkingMinutes(walkFromAlightingMeters);

            const leg1: RouteLeg = {
              lineCode: l1,
              lineName: l1Meta?.name_el || `Γραμμή ${l1}`,
              lineColor: l1Meta?.color || '#2563eb',
              lineTextColor: l1Meta?.textColor || '#ffffff',
              boardingStop: b.stop,
              alightingStop: bestTransfer.t1,
              walkToBoardingMeters,
              walkToBoardingMinutes,
              estimatedRideMinutes: leg1Ride,
              liveMinutesUntil: null,
              stopsCount: Math.max(2, Math.round(bestTransfer.d1 / 350))
            };

            const leg2: RouteLeg = {
              lineCode: l2,
              lineName: l2Meta?.name_el || `Γραμμή ${l2}`,
              lineColor: l2Meta?.color || '#059669',
              lineTextColor: l2Meta?.textColor || '#ffffff',
              boardingStop: bestTransfer.t2,
              alightingStop: a.stop,
              walkToBoardingMeters: bestTransfer.walkMeters,
              walkToBoardingMinutes: transferWalkMins,
              estimatedRideMinutes: leg2Ride,
              liveMinutesUntil: null,
              stopsCount: Math.max(2, Math.round(bestTransfer.d2 / 350))
            };

            const totalMinutes =
              walkToBoardingMinutes +
              5 + // default wait L1
              leg1Ride +
              transferWalkMins +
              transferWaitMins +
              leg2Ride +
              walkFromAlightingMinutes;

            transferOptions.push({
              id: `transfer-${l1}-${l2}-${bestTransfer.t1.code}-${bestTransfer.t2.code}`,
              type: 'transfer',
              lineCode: `${l1} ➔ ${l2}`,
              lineName: `${l1Meta?.name_el || l1} ➔ ${l2Meta?.name_el || l2}`,
              lineColor: l1Meta?.color || '#2563eb',
              lineTextColor: l1Meta?.textColor || '#ffffff',
              boardingStop: b.stop,
              alightingStop: a.stop,
              walkToBoardingMeters,
              walkToBoardingMinutes,
              walkFromAlightingMeters,
              walkFromAlightingMinutes,
              estimatedRideMinutes: leg1Ride + leg2Ride,
              totalMinutes,
              liveMinutesUntil: null,
              stopsCount: leg1.stopsCount + leg2.stopsCount,
              legs: [leg1, leg2],
              transferStop: bestTransfer.t1,
              transferWalkMeters: bestTransfer.walkMeters,
              transferWalkMinutes: transferWalkMins,
              transferWaitMinutes: transferWaitMins
            });
          }
        }
      }
    }
  }

  // 5. Query live telematics for candidate boarding stops to sync ETAs
  if (includeLiveDepartures && (directOptions.length > 0 || transferOptions.length > 0)) {
    const stopsToPoll = new Set<string>();

    directOptions.slice(0, 4).forEach(o => stopsToPoll.add(o.boardingStop.code));
    transferOptions.slice(0, 4).forEach(o => {
      stopsToPoll.add(o.boardingStop.code);
      if (o.legs && o.legs[1]) {
        stopsToPoll.add(o.legs[1].boardingStop.code);
      }
    });

    const pollCodes = Array.from(stopsToPoll).slice(0, 5);

    try {
      const departureResults = await Promise.all(
        pollCodes.map(async code => {
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

      // Enrich Direct Options
      for (const opt of directOptions) {
        const vehicles = departureMap.get(opt.boardingStop.code) || [];
        const matchingVehicle = vehicles.find((v: LiveVehicle) => {
          const vCode = v.line.trim().padStart(2, '0');
          const optCode = opt.lineCode.trim().padStart(2, '0');
          return vCode === optCode || v.line === opt.lineCode;
        });

        if (matchingVehicle) {
          opt.liveMinutesUntil = matchingVehicle.minutesUntil;
          opt.totalMinutes = opt.walkToBoardingMinutes + matchingVehicle.minutesUntil + opt.estimatedRideMinutes + opt.walkFromAlightingMinutes;
        }
      }

      // Enrich Transfer Options
      for (const opt of transferOptions) {
        if (!opt.legs || opt.legs.length < 2) continue;
        const leg1 = opt.legs[0];
        const leg2 = opt.legs[1];

        const leg1Vehicles = departureMap.get(leg1.boardingStop.code) || [];
        const matchL1 = leg1Vehicles.find((v: LiveVehicle) => {
          const vCode = v.line.trim().padStart(2, '0');
          const l1Code = leg1.lineCode.trim().padStart(2, '0');
          return vCode === l1Code || v.line === leg1.lineCode;
        });

        let waitL1 = 5;
        if (matchL1) {
          leg1.liveMinutesUntil = matchL1.minutesUntil;
          opt.liveMinutesUntil = matchL1.minutesUntil;
          waitL1 = matchL1.minutesUntil;
        }

        const leg2Vehicles = departureMap.get(leg2.boardingStop.code) || [];
        const matchL2 = leg2Vehicles.find((v: LiveVehicle) => {
          const vCode = v.line.trim().padStart(2, '0');
          const l2Code = leg2.lineCode.trim().padStart(2, '0');
          return vCode === l2Code || v.line === leg2.lineCode;
        });

        let waitL2 = opt.transferWaitMinutes || 4;
        if (matchL2) {
          leg2.liveMinutesUntil = matchL2.minutesUntil;
          // Synchronize: Check if L2 arrives after user arrives at transfer hub
          const userArrivalAtHub = waitL1 + leg1.estimatedRideMinutes + (opt.transferWalkMinutes || 0);
          if (matchL2.minutesUntil >= userArrivalAtHub) {
            waitL2 = matchL2.minutesUntil - userArrivalAtHub;
          }
        }

        opt.totalMinutes =
          opt.walkToBoardingMinutes +
          waitL1 +
          leg1.estimatedRideMinutes +
          (opt.transferWalkMinutes || 0) +
          waitL2 +
          leg2.estimatedRideMinutes +
          opt.walkFromAlightingMinutes;
      }
    } catch {
      // Ignore telematics failures and use estimated wait times
    }
  }

  // Sort direct options
  directOptions.sort((a, b) => {
    if (a.liveMinutesUntil !== null && b.liveMinutesUntil === null) return -1;
    if (a.liveMinutesUntil === null && b.liveMinutesUntil !== null) return 1;
    return a.totalMinutes - b.totalMinutes;
  });

  // Sort transfer options
  transferOptions.sort((a, b) => {
    if (a.liveMinutesUntil !== null && b.liveMinutesUntil === null) return -1;
    if (a.liveMinutesUntil === null && b.liveMinutesUntil !== null) return 1;
    return a.totalMinutes - b.totalMinutes;
  });

  // Combine results:
  // If we have direct options, present top direct options first (up to 4), plus top transfer options (up to 4)
  // If no direct options exist, return top transfer options (up to 8)
  if (directOptions.length > 0) {
    const combined = [...directOptions.slice(0, 4), ...transferOptions.slice(0, 3)];
    // Sort combined by total journey time, giving direct routes a modest 3-minute convenience preference
    return combined.sort((a, b) => {
      const aScore = a.totalMinutes - (a.type === 'direct' ? 3 : 0);
      const bScore = b.totalMinutes - (b.type === 'direct' ? 3 : 0);
      return aScore - bScore;
    });
  }

  return transferOptions.slice(0, 8);
}

// Backward-compatible alias
export const planDirectRoutes = planRoutes;

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
