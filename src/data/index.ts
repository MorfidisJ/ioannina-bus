// Re-export or import stops and lines
import STOPS_DATA from '../../data/stops.json';
import LINES_DATA from '../../data/lines.json';
import { BusStop, BusLine } from '../types';

export const ALL_STOPS: BusStop[] = STOPS_DATA as BusStop[];
export const ALL_LINES: BusLine[] = LINES_DATA as BusLine[];

// Fast lookup map by stop code
export const STOPS_MAP = new Map<string, BusStop>(
  ALL_STOPS.map(s => [s.code, s])
);

// Fast lookup map by line code
export const LINES_MAP = new Map<string, BusLine>(
  ALL_LINES.map(l => [l.code, l])
);
