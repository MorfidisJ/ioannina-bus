import { ALL_STOPS } from '../data';
import { LiveVehicle, VehicleTrafficInfo } from '../types';
import { calculateDistanceMeters } from './routePlanner';

interface VehiclePositionRecord {
  lat: number;
  lng: number;
  time: number;
  speedKmh: number;
}

// In-memory state tracking vehicle GPS over time
const vehicleHistory = new Map<string, VehiclePositionRecord[]>();

// Known traffic choke-point corridors in Ioannina
interface TrafficCorridor {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const IOANNINA_CONGESTION_CORRIDORS: TrafficCorridor[] = [
  {
    name: 'Λεωφ. Δωδώνης',
    minLat: 39.645,
    maxLat: 39.664,
    minLng: 20.846,
    maxLng: 20.858
  },
  {
    name: 'Οδός Αβέρωφ / Κέντρο',
    minLat: 39.664,
    maxLat: 39.673,
    minLng: 20.852,
    maxLng: 20.864
  },
  {
    name: 'Οδός 28ης Οκτωβρίου',
    minLat: 39.662,
    maxLat: 39.669,
    minLng: 20.846,
    maxLng: 20.854
  },
  {
    name: 'Κόμβος Άλσους',
    minLat: 39.671,
    maxLat: 39.678,
    minLng: 20.840,
    maxLng: 20.850
  }
];

/**
 * Determine if coordinates fall within a known congestion corridor
 */
function getMatchingCorridor(lat: number, lng: number): string | undefined {
  for (const c of IOANNINA_CONGESTION_CORRIDORS) {
    if (lat >= c.minLat && lat <= c.maxLat && lng >= c.minLng && lng <= c.maxLng) {
      return c.name;
    }
  }
  return undefined;
}

/**
 * Find distance to nearest official bus stop
 */
function getDistanceToClosestStop(lat: number, lng: number): number {
  let min = 99999;
  for (const s of ALL_STOPS) {
    if (!s.lat || !s.lng) continue;
    const d = calculateDistanceMeters(lat, lng, s.lat, s.lng);
    if (d < min) min = d;
    if (min <= 20) break; // Close enough
  }
  return min;
}

/**
 * Process a list of vehicles and enrich them with real-time velocity & traffic delay analysis
 */
export function enrichVehiclesWithTraffic(vehicles: LiveVehicle[]): LiveVehicle[] {
  const now = Date.now();

  return vehicles.map(v => {
    // If vehicle has no GPS or invalid coordinates, return as-is
    if (!v.latitude || !v.longitude || !v.vehicleCode) {
      return v;
    }

    const lat = v.latitude;
    const lng = v.longitude;
    const vCode = v.vehicleCode;

    // Check proximity to official stops (stop dwell filter)
    const distToStop = getDistanceToClosestStop(lat, lng);
    const isAtStop = distToStop <= 35; // Within 35m of a stop = boarding passengers

    let history = vehicleHistory.get(vCode);
    if (!history) {
      history = [];
      vehicleHistory.set(vCode, history);
    }

    const last = history.length > 0 ? history[history.length - 1] : null;

    let currentSpeedKmh = 22; // default urban speed
    if (last) {
      const deltaMeters = calculateDistanceMeters(last.lat, last.lng, lat, lng);
      const deltaSeconds = (now - last.time) / 1000;

      // Only calculate if reasonable time passed (between 5s and 90s)
      if (deltaSeconds >= 5 && deltaSeconds <= 90) {
        const rawSpeed = (deltaMeters / deltaSeconds) * 3.6; // convert m/s to km/h
        // Exponential moving average to smooth GPS jitter
        currentSpeedKmh = Math.round(0.65 * rawSpeed + 0.35 * last.speedKmh);
      } else {
        currentSpeedKmh = last.speedKmh;
      }
    }

    // Append to history (keep max 4 records)
    history.push({ lat, lng, time: now, speedKmh: currentSpeedKmh });
    if (history.length > 4) history.shift();

    const corridor = getMatchingCorridor(lat, lng);

    // Congestion logic:
    // Only flag congestion if NOT at a stop AND speed is very low (< 8 km/h)
    let isCongested = false;
    let congestionLevel: 'normal' | 'moderate' | 'heavy' = 'normal';
    let estimatedDelayMinutes = 0;

    if (!isAtStop && history.length >= 2) {
      // Average speed over recent records
      const avgSpeed = history.reduce((acc, h) => acc + h.speedKmh, 0) / history.length;

      if (avgSpeed < 4) {
        isCongested = true;
        congestionLevel = 'heavy';
        estimatedDelayMinutes = corridor ? 6 : 4;
      } else if (avgSpeed < 8) {
        isCongested = true;
        congestionLevel = 'moderate';
        estimatedDelayMinutes = corridor ? 4 : 3;
      }
    }

    const trafficInfo: VehicleTrafficInfo = {
      speedKmh: Math.max(0, currentSpeedKmh),
      isCongested,
      congestionLevel,
      corridorName: corridor,
      estimatedDelayMinutes,
      isAtStop,
      lastUpdated: now
    };

    let adjustedMinutesUntil = v.minutesUntil;
    let adjustedDepartureSeconds = v.departureSeconds;

    if (isCongested && estimatedDelayMinutes > 0) {
      adjustedMinutesUntil = v.minutesUntil + estimatedDelayMinutes;
      if (adjustedDepartureSeconds) {
        adjustedDepartureSeconds = adjustedDepartureSeconds + (estimatedDelayMinutes * 60);
      } else {
        adjustedDepartureSeconds = adjustedMinutesUntil * 60;
      }
    }

    return {
      ...v,
      minutesUntil: adjustedMinutesUntil,
      departureSeconds: adjustedDepartureSeconds,
      traffic: trafficInfo
    };
  });
}
