import React, { useState, useEffect } from 'react';
import { X, Calendar, RefreshCw } from 'lucide-react';
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
  const [dayType, setDayType] = useState<1 | 2 | 3>(1); // 1 = Weekday, 2 = Saturday, 3 = Sunday
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [lineFilter, setLineFilter] = useState<string>('all');

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

  const filteredTrips = lineFilter === 'all'
    ? trips
    : trips.filter(t => t.lineCode === lineFilter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800/40 flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                {lang === 'el' ? 'Πρόγραμμα Δρομολογίων' : 'Scheduled Timetable'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'el' ? stop.name_el : stop.name_en} <span className="font-mono text-slate-400">#{stop.code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Day Type Selector Tabs */}
        <div className="p-2.5 border-b border-slate-800 bg-slate-950/40">
          <div className="p-1 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-1">
            {[
              { id: 1 as const, el: 'Καθημερινές', en: 'Weekdays' },
              { id: 2 as const, el: 'Σάββατο', en: 'Saturday' },
              { id: 3 as const, el: 'Κυριακές / Αργίες', en: 'Sundays' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDayType(tab.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  dayType === tab.id
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'el' ? tab.el : tab.en}
              </button>
            ))}
          </div>
        </div>

        {/* Line Filter */}
        {stop.lines.length > 1 && (
          <div className="px-3.5 py-1.5 border-b border-slate-800/60 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[11px] font-medium text-slate-500 mr-1">
              {lang === 'el' ? 'Γραμμή:' : 'Line:'}
            </span>
            <button
              onClick={() => setLineFilter('all')}
              className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                lineFilter === 'all' ? 'bg-slate-200 text-slate-900 font-semibold' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {lang === 'el' ? 'Όλες' : 'All'}
            </button>
            {stop.lines.map(l => (
              <button
                key={l}
                onClick={() => setLineFilter(l)}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  lineFilter === l ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Trips List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {loading ? (
            <div className="py-14 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2.5 text-sky-400" />
              <p className="text-xs">{lang === 'el' ? 'Φόρτωση δρομολογίων...' : 'Loading timetable...'}</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="py-14 text-center text-slate-500 text-xs">
              {lang === 'el' ? 'Δεν βρέθηκαν προγραμματισμένα δρομολόγια για την επιλεγμένη ημέρα.' : 'No scheduled departures found for this day.'}
            </div>
          ) : (
            filteredTrips.map((trip, i) => (
              <div
                key={`${trip.tripCode || trip.departureTime}-${i}`}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-xs text-slate-200 flex-shrink-0">
                    {trip.lineCode || '-'}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-slate-200 truncate">
                      {trip.routeName || trip.lineName || (lang === 'el' ? 'Δρομολόγιο' : 'Trip')}
                    </h5>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'el' ? 'Τακτικό δρομολόγιο' : 'Scheduled departure'}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-2">
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {trip.departureTime || '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
