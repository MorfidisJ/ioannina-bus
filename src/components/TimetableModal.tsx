import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, RefreshCw, Filter } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        style={{
          backgroundColor: '#161a22',
          boxShadow: '10px 10px 30px #0b0d11, -10px -10px 30px #212733'
        }}
        className="w-full max-w-xl max-h-[85vh] rounded-3xl flex flex-col border border-slate-700/40 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/40">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {lang === 'el' ? 'Πρόγραμμα Δρομολογίων Στάσης' : 'Scheduled Stop Timetable'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'el' ? stop.name_el : stop.name_en} <span className="text-sky-400 font-mono font-bold">#{stop.code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 active:scale-95 rounded-xl hover:bg-slate-800 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Day Type Selector Tabs */}
        <div className="p-3 border-b border-slate-800 bg-[#12151b] flex items-center justify-between gap-2">
          <div
            style={{
              backgroundColor: '#1a1f26',
              boxShadow: 'inset 2px 2px 5px #111419, inset -2px -2px 5px #232a33'
            }}
            className="p-1 rounded-2xl flex items-center w-full"
          >
            {[
              { id: 1 as const, el: 'Καθημερινές', en: 'Weekdays' },
              { id: 2 as const, el: 'Σάββατο', en: 'Saturday' },
              { id: 3 as const, el: 'Κυριακές / Αργίες', en: 'Sundays / Holidays' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDayType(tab.id)}
                style={dayType === tab.id ? {
                  backgroundColor: '#1a1f26',
                  boxShadow: '2px 2px 6px #111419, -2px -2px 6px #232a33'
                } : {}}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                  dayType === tab.id ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {lang === 'el' ? tab.el : tab.en}
              </button>
            ))}
          </div>
        </div>

        {/* Line Filter */}
        {stop.lines.length > 1 && (
          <div className="px-4 py-2 border-b border-slate-800/60 bg-[#14181f] flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              {lang === 'el' ? 'Φίλτρο γραμμής:' : 'Filter line:'}
            </span>
            <button
              onClick={() => setLineFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                lineFilter === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {lang === 'el' ? 'Όλες' : 'All'}
            </button>
            {stop.lines.map(l => (
              <button
                key={l}
                onClick={() => setLineFilter(l)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  lineFilter === l ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Trips List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-7 h-7 mx-auto animate-spin mb-3 text-sky-400" />
              <p className="text-xs">{lang === 'el' ? 'Φόρτωση δρομολογίων από την τηλεματική...' : 'Loading timetable...'}</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              {lang === 'el' ? 'Δεν βρέθηκαν προγραμματισμένα δρομολόγια για την επιλεγμένη ημέρα.' : 'No scheduled departures found for this day.'}
            </div>
          ) : (
            filteredTrips.map((trip, i) => (
              <div
                key={`${trip.tripCode || trip.departureTime}-${i}`}
                style={{
                  backgroundColor: '#1a1f26',
                  boxShadow: '2px 2px 5px #111419, -2px -2px 5px #232a33'
                }}
                className="p-3 rounded-2xl flex items-center justify-between border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs text-amber-300">
                    {trip.lineCode || '-'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">
                      {trip.routeName || trip.lineName || (lang === 'el' ? 'Δρομολόγιο' : 'Trip')}
                    </h5>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {lang === 'el' ? 'Τακτικό δρομολόγιο' : 'Scheduled service'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-100 font-mono">
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
