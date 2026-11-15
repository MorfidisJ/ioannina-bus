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
  id?: number;
  day?: number;
  tripCode?: string;
  lineCode?: string;
  lineName?: string;
  lineColor?: string;
  lineTextColor?: string;
  routeCode?: string;
  routeName?: string;
  departureTime?: string;
  tripTime?: string;
  hour?: number;
  minute?: number;
  totalMinutes?: number;
}

export interface FavoriteStop {
  code: string;
  customName?: string;
  addedAt: number;
  order: number;
}

export interface ArrivalAlarm {
  id: string;
  stopCode: string;
  stopName: string;
  lineCode: string;
  lineName: string;
  vehicleCode?: string;
  targetMinutes: number;
  createdAt: number;
  triggered: boolean;
}

export interface CustomLocationPoint {
  name: string;
  lat: number;
  lng: number;
  type: 'gps' | 'stop' | 'map_pin' | 'address' | 'saved_place';
  stopCode?: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon?: string;
  createdAt: number;
}

export interface RoutePlanOption {
  id: string;
  lineCode: string;
  lineName: string;
  lineColor: string;
  lineTextColor: string;
  boardingStop: BusStop;
  alightingStop: BusStop;
  walkToBoardingMeters: number;
  walkToBoardingMinutes: number;
  walkFromAlightingMeters: number;
  walkFromAlightingMinutes: number;
  estimatedRideMinutes: number;
  totalMinutes: number;
  liveMinutesUntil?: number | null;
  stopsCount: number;
}

export interface ActiveRoutePlan {
  origin: CustomLocationPoint;
  destination: CustomLocationPoint;
  selectedOption: RoutePlanOption;
}


