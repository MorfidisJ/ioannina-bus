import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, Calendar, Bell, BellRing, Map, MapPin } from 'lucide-react';
import { BusStop, LiveVehicle, ArrivalAlarm } from '../types';

interface LiveArrivalsCardProps {
  stop: BusStop;
  vehicles: LiveVehicle[];
  isLive: boolean;
  loading: boolean;
  lastUpdated: string | null;
  error?: string | null;
  onRefresh: () => void;
  onOpenTimetable: () => void;
  onToggleMap?: () => void;
  isMapOpen?: boolean;
  onSetAlarm?: (vehicle: LiveVehicle) => void;
  activeAlarms?: ArrivalAlarm[];
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
  onToggleMap,
  isMapOpen,
  onSetAlarm,
  activeAlarms = [],
  lang
}) => {
  // Local second ticker to count down smoothly between 20s API polls
  const [secondsRemaining, setSecondsRemaining] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize countdown seconds from vehicles payload
    const initialMap: Record<string, number> = {};
    vehicles.forEach((v, idx) => {
      const key = `${v.line}-${v.vehicleCode || idx}`;
      const totalSecs = v.departureSeconds > 0 ? v.departureSeconds : v.minutesUntil * 60;
      initialMap[key] = Math.max(0, totalSecs);
    });
    setSecondsRemaining(initialMap);

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        const next: Record<string, number> = {};
        for (const [k, val] of Object.entries(prev)) {
          next[k] = Math.max(0, val - 1);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [vehicles]);

  const activeAlarmLineSet = new Set(
    activeAlarms.filter(a => !a.triggered).map(a => a.lineCode)
  );

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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onToggleMap && (
            <button
              onClick={onToggleMap}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border active:scale-95 transition-all flex items-center justify-center ${
                isMapOpen
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700/80'
              }`}
              title={lang === 'el' ? 'Χάρτης' : 'Live Map'}
              aria-label={lang === 'el' ? 'Χάρτης' : 'Live Map'}
            >
              <Map size={16} />
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            title={lang === 'el' ? 'Ανανέωση' : 'Refresh'}
            aria-label={lang === 'el' ? 'Ανανέωση' : 'Refresh'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-sky-400' : ''} />
          </button>

          <button
            onClick={onOpenTimetable}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-sky-300 hover:text-white bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/60 active:scale-95 transition-all flex items-center justify-center"
            title={lang === 'el' ? 'Πρόγραμμα Στάσης' : 'Timetable'}
            aria-label={lang === 'el' ? 'Πρόγραμμα Στάσης' : 'Timetable'}
          >
            <Calendar size={16} />
          </button>
        </div>
      </div>

      {/* Live Arrivals List */}
      <div className="mt-3.5">
        {isLive && vehicles.length > 0 ? (
          <div className="space-y-2.5">
            {vehicles.map((v, idx) => {
              const key = `${v.line}-${v.vehicleCode || idx}`;
              const remainingSecs = secondsRemaining[key] ?? (v.departureSeconds || v.minutesUntil * 60);
              const displayMins = Math.floor(remainingSecs / 60);
              const displaySecs = remainingSecs % 60;
              const hasActiveAlarm = activeAlarmLineSet.has(v.line);

              return (
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

                  {/* Right side controls: Alarm Button + Countdown Timer */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onSetAlarm && (
                      <button
                        onClick={() => onSetAlarm(v)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                          hasActiveAlarm
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 border-slate-700/70'
                        }`}
                        title={hasActiveAlarm
                          ? (lang === 'el' ? 'Ενεργή ειδοποίηση' : 'Alert active')
                          : (lang === 'el' ? 'Ορισμός ειδοποίησης άφιξης' : 'Set arrival alert')}
                      >
                        {hasActiveAlarm ? <BellRing size={16} /> : <Bell size={16} />}
                      </button>
                    )}

                    <div className="text-right">
                      {remainingSecs <= 30 ? (
                        <div className="text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg animate-pulse">
                          {lang === 'el' ? 'Τώρα' : 'Now'}
                        </div>
                      ) : (
                        <div>
                          <div className="text-lg sm:text-xl font-black text-emerald-400 leading-none">
                            {displayMins}<span className="text-xs font-semibold text-slate-400 ml-0.5">{lang === 'el' ? 'λ' : 'm'}</span>
                            <span className="text-xs font-mono text-emerald-300 ml-1">
                              {String(displaySecs).padStart(2, '0')}s
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                            GPS Live
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
            <div className="pt-2">
              <button
                onClick={onOpenTimetable}
                className="h-11 px-5 rounded-xl text-xs sm:text-sm font-bold text-sky-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all inline-flex items-center gap-2 shadow-sm"
              >
                <Calendar size={15} />
                <span>{lang === 'el' ? 'Προβολή Προγράμματος Δρομολογίων' : 'View Scheduled Timetable'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
