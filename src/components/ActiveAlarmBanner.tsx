import React from 'react';
import { BellRing, X, Clock } from 'lucide-react';
import { ArrivalAlarm, LiveVehicle } from '../types';

interface ActiveAlarmBannerProps {
  alarms: ArrivalAlarm[];
  vehicles: LiveVehicle[];
  onCancelAlarm: (alarmId: string) => void;
  onOpenAlarmDetails: (alarm: ArrivalAlarm) => void;
  lang: 'el' | 'en';
}

export const ActiveAlarmBanner: React.FC<ActiveAlarmBannerProps> = ({
  alarms,
  vehicles,
  onCancelAlarm,
  onOpenAlarmDetails,
  lang
}) => {
  const activeAlarm = alarms.find(a => !a.triggered);
  if (!activeAlarm) return null;

  // Find matching incoming vehicle to show current distance
  const matchedVehicle = vehicles.find(v => v.line === activeAlarm.lineCode);
  const currentMins = matchedVehicle ? matchedVehicle.minutesUntil : null;

  return (
    <div className="fixed bottom-4 left-3 right-3 max-w-lg mx-auto z-40 animate-slideUp">
      <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white">
        <div
          onClick={() => onOpenAlarmDetails(activeAlarm)}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
            <BellRing size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 font-bold text-xs border border-slate-700">
                {activeAlarm.lineCode}
              </span>
              <span className="text-xs font-bold text-slate-100 truncate">
                {lang === 'el' ? `Ειδοποίηση στα ${activeAlarm.targetMinutes}'` : `Alert at ${activeAlarm.targetMinutes}'`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {currentMins !== null
                ? (lang === 'el' ? `Τρέχον: σε ${currentMins} λεπτά` : `Current: in ${currentMins} mins`)
                : activeAlarm.stopName}
            </p>
          </div>
        </div>

        <button
          onClick={() => onCancelAlarm(activeAlarm.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
          title={lang === 'el' ? 'Ακύρωση' : 'Cancel'}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

