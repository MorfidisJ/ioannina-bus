import React from 'react';
import { RefreshCw, Clock, Calendar } from 'lucide-react';
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
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-4 shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                {lang === 'el' ? 'Ζωντανές Αφίξεις' : 'Live Arrivals'}
              </h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                isLive
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {isLive ? 'LIVE' : (lang === 'el' ? 'Αναμονή' : 'Standby')}
              </span>
            </div>
            {lastUpdated && (
              <span className="text-[11px] text-slate-500 block">
                {lang === 'el' ? `Ενημέρωση: ${lastUpdated}` : `Updated: ${lastUpdated}`}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title={lang === 'el' ? 'Ανανέωση' : 'Refresh'}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-sky-400' : ''} />
            <span className="hidden sm:inline">{lang === 'el' ? 'Ανανέωση' : 'Refresh'}</span>
          </button>
          <button
            onClick={onOpenTimetable}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 active:scale-95 transition-all flex items-center gap-1.5"
            title={lang === 'el' ? 'Πρόγραμμα Στάσης' : 'Timetable'}
          >
            <Calendar size={13} className="text-sky-400" />
            <span className="hidden sm:inline">{lang === 'el' ? 'Πρόγραμμα' : 'Timetable'}</span>
          </button>
        </div>
      </div>

      {/* Live Arrivals List */}
      <div className="mt-3.5">
        {isLive && vehicles.length > 0 ? (
          <div className="space-y-2.5">
            {vehicles.map((v, idx) => (
              <div
                key={`${v.vehicleCode}-${v.line}-${idx}`}
                className="p-3 sm:p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3 hover:bg-slate-800/60 transition-colors"
              >
                {/* Line number and details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center font-bold text-base text-white">
                    {v.line}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                        {v.routeName || v.lineName || (lang === 'el' ? `Γραμμή ${v.line}` : `Line ${v.line}`)}
                      </h4>
                      {v.vehicleCode && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono font-medium flex-shrink-0 border border-slate-700/50">
                          #{v.vehicleCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {lang === 'el' ? 'Προς τη στάση' : 'Approaching stop'}
                    </div>
                  </div>
                </div>

                {/* Big countdown timer for mobile readability */}
                <div className="text-right flex-shrink-0">
                  {v.minutesUntil === 0 ? (
                    <div className="text-sm sm:text-base font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                      {lang === 'el' ? 'Τώρα' : 'Now'}
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400 leading-none">
                        {v.minutesUntil}<span className="text-xs font-semibold text-slate-400 ml-0.5">{lang === 'el' ? 'λεπ.' : 'min'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        GPS Live
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 sm:py-8 px-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                {lang === 'el'
                  ? 'Δεν εντοπίζονται ενεργά λεωφορεία αυτή τη στιγμή'
                  : 'No active buses transmitting GPS at this moment'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {lang === 'el'
                  ? 'Δεν υπάρχουν οχήματα εντός των επόμενων 30 λεπτών (σύνηθες εκτός ωρών αιχμής ή νυχτερινές ώρες).'
                  : 'No buses approaching within 30 minutes (normal off-peak or late night).'}
              </p>
            </div>
            <div className="pt-1">
              <button
                onClick={onOpenTimetable}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-sky-400 hover:text-sky-300 bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-95 transition-all inline-flex items-center gap-1.5"
              >
                <Calendar size={13} />
                <span>{lang === 'el' ? 'Πρόγραμμα Δρομολογίων' : 'View Timetable'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
