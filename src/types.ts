export interface BusStop {
  id: number;
  code: string;
  name_el: string;
  name_en: string;
  lat: number;
  lng: number;
  lines: string[];
  distanceMeters?: number;
}

export interface BusLine {
  id: number;
  code: string;
  name_el: string;
  name_en: string;
  color: string;
  textColor: string;
  routes: Array<{
    id: number;
    code: string;
    name: string;
    direction: number;
  }>;
}

export interface LiveVehicle {
  line: string;
  lineName: string;
  routeName: string;
  minutesUntil: number;
  departureSeconds: number;
  vehicleCode: string;
  latitude?: number;
  longitude?: number;
}

export interface LiveStopData {
  stopCode: string;
  isLive: boolean;
  vehicles: LiveVehicle[];
  lastUpdated: string | null;
  loading: boolean;
  error?: string | null;
}

export interface ScheduledTrip {
  tripCode?: string;
  lineCode?: string;
  lineName?: string;
  routeName?: string;
  departureTime?: string;
}

export interface FavoriteStop {
  code: string;
  customName?: string;
  addedAt: number;
  order: number;
}

