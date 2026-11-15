import React, { useState } from 'react';
import { X, Bell, BellRing, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { BusStop, LiveVehicle, ArrivalAlarm } from '../types';
import { requestNotificationPermission } from '../services/alarmService';

interface SetAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: BusStop;
  vehicle: LiveVehicle | null;
  activeAlarm: ArrivalAlarm | null;
  onSaveAlarm: (alarm: ArrivalAlarm) => void;
  onCancelAlarm: (alarmId: string) => void;
  lang: 'el' | 'en';
}

export const SetAlarmModal: React.FC<SetAlarmModalProps> = ({
  isOpen,
  onClose,
  stop,
  vehicle,
  activeAlarm,
  onSaveAlarm,
  onCancelAlarm,
  lang
}) => {
  const [targetMinutes, setTargetMinutes] = useState<number>(5);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  if (!isOpen || !vehicle) return null;

  const stopName = lang === 'el' ? stop.name_el : stop.name_en;

  const handleConfirmAlarm = async () => {
    setRequesting(true);
    setPermissionError(null);

    try {
      const granted = await requestNotificationPermission();
      if (!granted && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
        setPermissionError(
          lang === 'el'
            ? 'Οι ειδοποιήσεις έχουν μπλοκαριστεί στις ρυθμίσεις της συσκευής/προγράμματος περιήγησης. Θα ηχήσει μόνο εντός της εφαρμογής.'
            : 'Notifications are blocked in system settings. In-app sound alert will still play.'
        );
      }

      const newAlarm: ArrivalAlarm = {
        id: `alarm_${stop.code}_${vehicle.line}_${Date.now()}`,
        stopCode: stop.code,
        stopName,
        lineCode: vehicle.line,
        lineName: vehicle.routeName || vehicle.lineName || `Γραμμή ${vehicle.line}`,
        vehicleCode: vehicle.vehicleCode || undefined,
        targetMinutes,
        createdAt: Date.now(),
        triggered: false
      };

      onSaveAlarm(newAlarm);
      onClose();
    } catch (err: any) {
      setPermissionError(err.message || 'Notification error');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <BellRing size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {lang === 'el' ? 'Ειδοποίηση Άφιξης' : 'Arrival Alert'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'el' ? 'Ηχητική ειδοποίηση & Push notification' : 'Sound alert & push notification'}
            </p>
          </div>
        </div>

        {/* Target Bus Info Card */}
        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center font-bold text-white text-base">
              {vehicle.line}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white truncate">
                {vehicle.routeName || vehicle.lineName || `Γραμμή ${vehicle.line}`}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                Στάση: {stopName}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-bold text-emerald-400 block">
              {vehicle.minutesUntil <= 0
                ? (lang === 'el' ? 'Φτάνει τώρα' : 'Now')
                : (lang === 'el' ? `σε ${vehicle.minutesUntil}'` : `in ${vehicle.minutesUntil}'`)}
            </span>
            {vehicle.vehicleCode && (
              <span className="text-[10px] text-slate-500 font-mono">#{vehicle.vehicleCode}</span>
            )}
          </div>
        </div>

        {activeAlarm ? (
          /* Active Alarm Mode - Can Remove */
          <div className="space-y-4">
            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <p className="font-semibold">{lang === 'el' ? 'Η ειδοποίηση είναι ήδη ενεργή!' : 'Alert is currently active!'}</p>
                <p className="text-amber-300/80 mt-0.5">
                  {lang === 'el'
                    ? `Θα χτυπήσει όταν το λεωφορείο απέχει ${activeAlarm.targetMinutes} λεπτά.`
                    : `Will notify you when bus is ${activeAlarm.targetMinutes} minutes away.`}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onCancelAlarm(activeAlarm.id);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 active:scale-98 transition-all"
            >
              {lang === 'el' ? 'Ακύρωση Ειδοποίησης' : 'Cancel Alert'}
            </button>
          </div>
        ) : (
          /* Set New Alarm Form */
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                {lang === 'el' ? 'Ειδοποίησέ με όταν το λεωφορείο απέχει:' : 'Notify me when the bus is:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 5, 8].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTargetMinutes(mins)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      targetMinutes === mins
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div>{mins} {lang === 'el' ? 'λεπτά' : 'mins'}</div>
                    <div className="text-[10px] opacity-75 font-normal">
                      {mins === 5 ? (lang === 'el' ? 'Προτεινόμενο' : 'Default') : mins === 2 ? (lang === 'el' ? 'Άμεσα' : 'Soon') : (lang === 'el' ? 'Νωρίς' : 'Early')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {permissionError && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{permissionError}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'el'
                ? '🔔 Η εφαρμογή θα ηχήσει και θα εμφανίσει ειδοποίηση στο τηλέφωνό σας μόλις το λεωφορείο πλησιάσει.'
                : '🔔 The app will chime and send a push notification to your device when the bus is approaching.'}
            </p>

            <button
              onClick={handleConfirmAlarm}
              disabled={requesting}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Bell size={15} />
              <span>{lang === 'el' ? `Ενεργοποίηση Ειδοποίησης (${targetMinutes}')` : `Enable Alert (${targetMinutes}m)`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

