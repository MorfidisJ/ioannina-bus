import React from 'react';
import { RefreshCw, Clock, Bus, Radio, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import { BusStop, LiveVehicle } from '../types';

interface LiveArrivalsCardProps {
  stop: BusStop;
  vehicles: LiveVehicle[];
  isLive: boolean;
  loading: boolean;
  lastUpdated: string | null;
  error?: string | null;
  onRefresh: () => void;
  onOpenTimetable: () => void;
  lang: 'el' | 'en';
}

export const LiveArrivalsCard: React.FC<LiveArrivalsCardProps> = ({
  stop,
  vehicles,
  isLive,
  loading,
  lastUpdated,
  error,
  onRefresh,
  onOpenTimetable,
  lang
}) => {
  return (
    <div
      style={{
        backgroundColor: '#1a1f26',
        boxShadow: '6px 6px 16px #111419, -6px -6px 16px #232a33',
        border: isLive ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(51, 65, 85, 0.3)'
      }}
      className="p-5 sm:p-6 rounded-3xl transition-all mb-6"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className={`w-3.5 h-3.5 rounded-full block ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isLive && (
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 absolute inset-0 animate-ping opacity-75" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                {lang === 'el' ? 'Ζωντανές Αφίξεις Λεωφορείων' : 'Real-Time Bus Arrivals'}
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isLive
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/60'
              }`}>
                {isLive ? 'LIVE GPS' : (lang === 'el' ? 'ΣΕ ΑΝΑΜΟΝΗ' : 'STANDBY')}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{lang === 'el' ? stop.name_el : stop.name_en}</span>
              <span className="text-sky-400 font-mono font-bold">#{stop.code}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {lang === 'el' ? `Ενημέρωση: ${lastUpdated}` : `Updated: ${lastUpdated}`}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              backgroundColor: '#1a1f26',
              boxShadow: '3px 3px 7px #111419, -3px -3px 7px #232a33'
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 border border-slate-700/30"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{lang === 'el' ? 'Ανανέωση' : 'Refresh'}</span>
          </button>
          <button
            onClick={onOpenTimetable}
            style={{
              backgroundColor: '#1a1f26',
              boxShadow: '3px 3px 7px #111419, -3px -3px 7px #232a33'
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-400 hover:text-sky-300 active:scale-95 transition-all flex items-center gap-1.5 border border-slate-700/30"
          >
            <Calendar size={13} />
            <span>{lang === 'el' ? 'Πρόγραμμα Στάσης' : 'Timetable'}</span>
          </button>
        </div>
      </div>

      {/* Live Arrivals List */}
      <div className="mt-5">
        {isLive && vehicles.length > 0 ? (
          <div className="space-y-3">
            {vehicles.map((v, idx) => (
              <div
                key={`${v.vehicleCode}-${v.line}-${idx}`}
                style={{
                  backgroundColor: '#1a1f26',
                  boxShadow: 'inset 2px 2px 5px #111419, inset -2px -2px 5px #232a33'
                }}
                className="p-4 rounded-2xl flex items-center justify-between border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    style={{
                      backgroundColor: '#12161c',
                      boxShadow: '2px 2px 5px #111419, -2px -2px 5px #232a33'
                    }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base text-amber-300 border border-slate-700/50"
                  >
                    {v.line}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100">
                        {v.routeName || v.lineName || (lang === 'el' ? `Γραμμή ${v.line}` : `Line ${v.line}`)}
                      </h4>
                      {v.vehicleCode && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 font-mono font-semibold border border-slate-800">
                          #{v.vehicleCode}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-400/90 font-medium mt-0.5">
                      {lang === 'el' ? 'Εν κινήσει προς τη στάση' : 'Approaching this stop'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-emerald-400 flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {v.minutesUntil === 0
                        ? (lang === 'el' ? 'Φτάνει τώρα!' : 'Arriving now!')
                        : (lang === 'el' ? `σε ${v.minutesUntil} λεπτά` : `in ${v.minutesUntil} mins`)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">
                    {lang === 'el' ? 'Live δορυφορικό στίγμα' : 'Live GPS satellite fix'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#14181f',
              boxShadow: 'inset 2px 2px 6px #101318, inset -2px -2px 6px #202630'
            }}
            className="p-6 rounded-2xl text-center space-y-3 border border-slate-800"
          >
            <div className="p-3 w-12 h-12 rounded-2xl bg-slate-800/80 text-amber-400/80 mx-auto flex items-center justify-center">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                {lang === 'el'
                  ? 'Δεν εκπέμπει λεωφορείο αυτή τη στιγμή'
                  : 'No bus currently broadcasting GPS'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                {lang === 'el'
                  ? 'Δεν υπάρχει όχημα στο παράθυρο των επόμενων 30 λεπτών (σύνηθες εκτός ωρών αιχμής ή τη νύχτα). Μπορείτε να δείτε το επίσημο τακτικό πρόγραμμα της στάσης παρακάτω.'
                  : 'No active vehicles transmitting within the 30-minute window (normal off-peak/night). You can inspect the scheduled departures timetable below.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onOpenTimetable}
                style={{
                  backgroundColor: '#1a1f26',
                  boxShadow: '3px 3px 8px #101318, -3px -3px 8px #202630'
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-sky-400 hover:text-sky-300 active:scale-95 transition-all inline-flex items-center gap-2 border border-slate-700/40"
              >
                <Calendar size={14} />
                <span>{lang === 'el' ? 'Προβολή Προγράμματος Δρομολογίων' : 'View Scheduled Timetable'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

