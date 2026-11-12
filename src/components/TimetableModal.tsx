import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, RefreshCw, Clock, Filter } from 'lucide-react';
import { BusStop, ScheduledTrip } from '../types';
import { fetchStopSchedule } from '../services/telematics';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: BusStop;
  lang: 'el' | 'en';
}

export const TimetableModal: React.FC<TimetableModalProps> = ({
  isOpen,
  onClose,
  stop,
  lang
}) => {
  // Determine current day type: 1 = Weekday, 2 = Saturday, 3 = Sunday
  const todayDayType = useMemo<1 | 2 | 3>(() => {
    const day = new Date().getDay();
    if (day === 0) return 3; // Sunday
    if (day === 6) return 2; // Saturday
    return 1; // Weekdays
  }, []);

  const [dayType, setDayType] = useState<1 | 2 | 3>(todayDayType);
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);

  // Current time in minutes from midnight for "upcoming" logic
  const currentTotalMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && stop) {
      loadSchedule();
    }
  }, [isOpen, stop.code, dayType, lang]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await fetchStopSchedule(stop.code, dayType, lang);
      setTrips(data);
    } catch (e) {
      console.error('Error fetching timetable:', e);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // Unique line codes present in this stop's trips
  const availableLines = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => {
      if (t.lineCode) set.add(t.lineCode);
    });
    // Also add stop.lines
    stop.lines.forEach(l => set.add(l));
    return Array.from(set).sort();
  }, [trips, stop.lines]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      if (lineFilter !== 'all' && t.lineCode !== lineFilter) {
        return false;
      }
      if (onlyUpcoming && dayType === todayDayType && t.totalMinutes !== undefined) {
        return t.totalMinutes >= currentTotalMinutes;
      }
      return true;
    });
  }, [trips, lineFilter, onlyUpcoming, dayType, todayDayType, currentTotalMinutes]);

  // Count next upcoming
  const nextTrip = useMemo(() => {
    if (dayType !== todayDayType) return null;
    return trips.find(t => t.totalMinutes !== undefined && t.totalMinutes >= currentTotalMinutes);
  }, [trips, dayType, todayDayType, currentTotalMinutes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-xl h-[92vh] sm:h-auto sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-4.5 border-b border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 leading-snug">
                {lang === 'el' ? 'Πρόγραμμα Δρομολογίων' : 'Scheduled Timetable'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'el' ? stop.name_el : stop.name_en} <span className="font-mono text-slate-400 font-semibold">#{stop.code}</span>
              </p>
            </div>
          </div>

          {/* Large touch-friendly close button */}
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
            title={lang === 'el' ? 'Κλείσιμο' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Big Touch-Friendly Day Selector Tabs (48px tall) */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 1 as const, el: 'Καθημερινές', en: 'Weekdays', subEl: 'Δευ-Παρ', subEn: 'Mon-Fri' },
              { id: 2 as const, el: 'Σάββατο', en: 'Saturday', subEl: 'Σάββατο', subEn: 'Sat' },
              { id: 3 as const, el: 'Κυριακές', en: 'Sundays', subEl: '& Αργίες', subEn: '& Holidays' }
            ].map(tab => {
              const isSelected = dayType === tab.id;
              const isToday = todayDayType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDayType(tab.id)}
                  className={`h-13 py-2 px-2 rounded-xl text-center flex flex-col items-center justify-center transition-all active:scale-95 border ${
                    isSelected
                      ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {lang === 'el' ? tab.el : tab.en}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Σήμερα / Today" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium leading-tight">
                    {lang === 'el' ? tab.subEl : tab.subEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Line Filter & Upcoming Toggle Bar (Touch-friendly 40px+ buttons) */}
        <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Filter size={13} />
              <span>{lang === 'el' ? 'Γραμμή:' : 'Line:'}</span>
            </span>

            {/* "All" button */}
            <button
              onClick={() => setLineFilter('all')}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 border ${
                lineFilter === 'all'
                  ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                  : 'bg-slate-800/90 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'el' ? 'Όλες' : 'All'}
            </button>

            {/* Individual Lines buttons */}
            {availableLines.map(lineCode => (
              <button
                key={lineCode}
                onClick={() => setLineFilter(lineCode)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 border ${
                  lineFilter === lineCode
                    ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                    : 'bg-slate-800/90 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                {lineCode}
              </button>
            ))}
          </div>

          {/* Toggle "From now on" if viewing today */}
          {dayType === todayDayType && (
            <button
              onClick={() => setOnlyUpcoming(prev => !prev)}
              className={`h-9 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all border active:scale-95 ${
                onlyUpcoming
                  ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:text-white'
              }`}
            >
              <Clock size={13} />
              <span>{lang === 'el' ? 'Μόνο επόμενα' : 'Upcoming only'}</span>
            </button>
          )}
        </div>

        {/* Next Upcoming Departure Banner (if viewing today) */}
        {dayType === todayDayType && nextTrip && nextTrip.totalMinutes !== undefined && (
          <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-semibold">
                {lang === 'el' ? 'Επόμενο τακτικό δρομολόγιο:' : 'Next scheduled departure:'}
              </span>
              <span className="font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                {nextTrip.lineCode}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-300 text-sm mr-1">
                {nextTrip.departureTime || nextTrip.tripTime}
              </span>
              <span className="text-[11px] text-slate-400">
                ({nextTrip.totalMinutes - currentTotalMinutes > 0
                  ? (lang === 'el' ? `σε ${nextTrip.totalMinutes - currentTotalMinutes}′` : `in ${nextTrip.totalMinutes - currentTotalMinutes}m`)
                  : (lang === 'el' ? 'τώρα' : 'now')})
              </span>
            </div>
          </div>
        )}

        {/* Trips List Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-sky-400" />
              <p className="text-sm font-medium">{lang === 'el' ? 'Φόρτωση δρομολογίων από το Αστικό ΚΤΕΛ...' : 'Loading timetable from CityBus...'}</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Clock size={28} className="mx-auto text-slate-600 mb-1" />
              <h4 className="text-sm font-semibold text-slate-300">
                {lang === 'el' ? 'Δεν βρέθηκαν δρομολόγια' : 'No departures found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {onlyUpcoming
                  ? (lang === 'el' ? 'Δεν υπάρχουν άλλα δρομολόγια για σήμερα. Απενεργοποιήστε το φίλτρο «Μόνο επόμενα» για να δείτε όλη τη μέρα.' : 'No more departures today. Turn off "Upcoming only" to view full day.')
                  : (lang === 'el' ? 'Δεν υπάρχουν καταχωρημένα δρομολόγια για τα επιλεγμένα κριτήρια.' : 'No scheduled trips matching your criteria.')}
              </p>
              {onlyUpcoming && (
                <button
                  onClick={() => setOnlyUpcoming(false)}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-sky-400 hover:text-sky-300 border border-slate-700"
                >
                  {lang === 'el' ? 'Προβολή όλης της ημέρας' : 'Show full day'}
                </button>
              )}
            </div>
          ) : (
            filteredTrips.map((trip, idx) => {
              const timeDisplay = trip.departureTime || trip.tripTime || '-';
              const isPast = dayType === todayDayType && trip.totalMinutes !== undefined && trip.totalMinutes < currentTotalMinutes;
              const isUpcoming = dayType === todayDayType && trip.totalMinutes !== undefined && trip.totalMinutes >= currentTotalMinutes && trip.totalMinutes <= currentTotalMinutes + 60;

              return (
                <div
                  key={`${trip.id || trip.routeCode || ''}-${timeDisplay}-${idx}`}
                  className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                    isUpcoming
                      ? 'bg-slate-800/80 border-emerald-500/40 shadow-sm'
                      : isPast
                        ? 'bg-slate-950/30 border-slate-800/50 opacity-60'
                        : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  {/* Left: Line Badge & Route Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm">
                      {trip.lineCode || '-'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                        {trip.routeName || trip.lineName || (lang === 'el' ? `Γραμμή ${trip.lineCode}` : `Line ${trip.lineCode}`)}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 truncate">
                        <span>{trip.lineName || (lang === 'el' ? 'Τακτικό δρομολόγιο' : 'Scheduled')}</span>
                        {isUpcoming && trip.totalMinutes !== undefined && (
                          <span className="text-emerald-400 font-semibold">
                            • {trip.totalMinutes - currentTotalMinutes === 0
                              ? (lang === 'el' ? 'αναχωρεί τώρα' : 'departing now')
                              : (lang === 'el' ? `σε ${trip.totalMinutes - currentTotalMinutes}′` : `in ${trip.totalMinutes - currentTotalMinutes}m`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Big Crisp Departure Time */}
                  <div className="text-right flex-shrink-0 pl-2">
                    <div className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-tight">
                      {timeDisplay}
                    </div>
                    {isPast && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        {lang === 'el' ? 'προηγούμενο' : 'past'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
