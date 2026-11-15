import React, { useState, useEffect, useMemo } from 'react';
import { Bus, Search, Map, Compass } from 'lucide-react';
import { FavoriteStop, LiveVehicle, ArrivalAlarm, CustomLocationPoint, RoutePlanOption, ActiveRoutePlan } from './types';
import { ALL_STOPS, ALL_LINES, STOPS_MAP } from './data';
import { fetchLiveArrivals } from './services/telematics';
import { loadSavedAlarms, saveAlarms, sendArrivalNotification } from './services/alarmService';
import { FavoriteStopsBar } from './components/FavoriteStopsBar';
import { StopDetailsHeader } from './components/StopDetailsHeader';
import { LiveArrivalsCard } from './components/LiveArrivalsCard';
import { StopSearchModal } from './components/StopSearchModal';
import { TimetableModal } from './components/TimetableModal';
import { LiveTransitMap } from './components/LiveTransitMap';
import { SetAlarmModal } from './components/SetAlarmModal';
import { ActiveAlarmBanner } from './components/ActiveAlarmBanner';
import { RoutePlannerModal } from './components/RoutePlannerModal';
import { syncActiveStopToWidget } from './services/widgetBridge';

const FAVORITES_STORAGE_KEY = 'ioannina_bus_fav_stops_v1';
const ACTIVE_STOP_STORAGE_KEY = 'ioannina_bus_active_stop_v1';
const LANG_STORAGE_KEY = 'ioannina_bus_lang_v1';

// Initial pre-configured popular stops for Ioannina
const DEFAULT_FAVORITES: FavoriteStop[] = [
  { code: '930', customName: 'Φιλοσοφική (Λέσχη)', addedAt: 1, order: 0 },
  { code: '400', customName: 'Δικαστικό Μέγαρο', addedAt: 2, order: 1 },
  { code: '451', customName: 'Πανεπιστημιακό Νοσοκομείο', addedAt: 3, order: 2 },
  { code: '201', customName: 'Πλάτανος', addedAt: 4, order: 3 },
  { code: '447', customName: 'Πύλη Πανεπιστημίου', addedAt: 5, order: 4 }
];

export function App() {
  const [lang, setLang] = useState<'el' | 'en'>(() => {
    return (localStorage.getItem(LANG_STORAGE_KEY) as 'el' | 'en') || 'el';
  });

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteStop[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_FAVORITES;
  });

  // Active stop state (default to 930 - Φιλοσοφική / Εστιατόριο)
  const [activeStopCode, setActiveStopCode] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_STOP_STORAGE_KEY) || '930';
  });

  // Modals & Map state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Route Planner & Custom Pin state
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [activeRoutePlan, setActiveRoutePlan] = useState<ActiveRoutePlan | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickLocationTarget, setPickLocationTarget] = useState<'origin' | 'destination' | null>(null);
  const [pickedLocation, setPickedLocation] = useState<{ target: 'origin' | 'destination'; lat: number; lng: number } | null>(null);

  // Arrival Alarms state
  const [alarms, setAlarms] = useState<ArrivalAlarm[]>(() => loadSavedAlarms());
  const [selectedVehicleForAlarm, setSelectedVehicleForAlarm] = useState<LiveVehicle | null>(null);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);

  // Live telematics state
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active stop object
  const activeStop = useMemo(() => {
    return STOPS_MAP.get(activeStopCode) || ALL_STOPS[0];
  }, [activeStopCode]);

  // Favorite codes set for O(1) checks
  const favoriteCodes = useMemo(() => {
    return new Set(favorites.map(f => f.code));
  }, [favorites]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_STOP_STORAGE_KEY, activeStopCode);
    if (activeStop) {
      const name = lang === 'el' ? activeStop.name_el : activeStop.name_en;
      syncActiveStopToWidget(activeStop.code, `${name} (#${activeStop.code})`);
    }
  }, [activeStopCode, activeStop, lang]);

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    saveAlarms(alarms);
  }, [alarms]);

  // Fetch live arrivals
  const loadLiveArrivals = async (isManual: boolean = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await fetchLiveArrivals(activeStopCode, lang);
      setLiveVehicles(res.vehicles);
      setIsLive(res.isLive);
      setLastUpdated(new Date().toLocaleTimeString(lang === 'el' ? 'el-GR' : 'en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    } catch (err: any) {
      setError(err.message || 'Telematics error');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 20 seconds for the active stop
  useEffect(() => {
    loadLiveArrivals(true);
    const interval = setInterval(() => {
      loadLiveArrivals(false);
    }, 20000);
    return () => clearInterval(interval);
  }, [activeStopCode, lang]);

  // Alarm Watcher: Evaluate active alarms whenever live vehicles update
  useEffect(() => {
    if (liveVehicles.length === 0 || alarms.length === 0) return;

    let updated = false;
    const newAlarms = alarms.map(alarm => {
      if (alarm.triggered) return alarm;
      if (alarm.stopCode !== activeStopCode) return alarm;

      const matchedVehicle = liveVehicles.find(v => {
        if (alarm.vehicleCode && v.vehicleCode) {
          return v.vehicleCode === alarm.vehicleCode;
        }
        return v.line === alarm.lineCode;
      });

      if (matchedVehicle && matchedVehicle.minutesUntil <= alarm.targetMinutes) {
        sendArrivalNotification(alarm, matchedVehicle.minutesUntil, lang);
        updated = true;
        return { ...alarm, triggered: true };
      }
      return alarm;
    });

    if (updated) {
      setAlarms(newAlarms);
    }
  }, [liveVehicles, activeStopCode, alarms, lang]);

  // Favorite handlers
  const handleToggleFavorite = (code: string) => {
    if (favoriteCodes.has(code)) {
      setFavorites(prev => prev.filter(f => f.code !== code));
    } else {
      const stop = STOPS_MAP.get(code);
      setFavorites(prev => [
        ...prev,
        {
          code,
          customName: stop ? (lang === 'el' ? stop.name_el : stop.name_en) : undefined,
          addedAt: Date.now(),
          order: prev.length
        }
      ]);
    }
  };

  const handleUpdateNickname = (code: string, nickname: string) => {
    setFavorites(prev => prev.map(f => f.code === code ? { ...f, customName: nickname || undefined } : f));
  };

  const handleRemoveFavorite = (code: string) => {
    setFavorites(prev => prev.filter(f => f.code !== code));
  };

  // Alarm handlers
  const handleOpenAlarmForVehicle = (vehicle: LiveVehicle) => {
    setSelectedVehicleForAlarm(vehicle);
    setIsAlarmModalOpen(true);
  };

  const handleSaveAlarm = (newAlarm: ArrivalAlarm) => {
    setAlarms(prev => [
      ...prev.filter(a => !(a.stopCode === newAlarm.stopCode && a.lineCode === newAlarm.lineCode)),
      newAlarm
    ]);
  };

  const handleCancelAlarm = (alarmId: string) => {
    setAlarms(prev => prev.filter(a => a.id !== alarmId));
  };

  // Route Planner handlers
  const handleRequestPickOnMap = (target: 'origin' | 'destination') => {
    setPickLocationTarget(target);
    setIsPickingLocation(true);
    setIsMapOpen(true);
  };

  const handleLocationPicked = (lat: number, lng: number) => {
    if (pickLocationTarget) {
      setPickedLocation({ target: pickLocationTarget, lat, lng });
    }
    setIsPickingLocation(false);
    setPickLocationTarget(null);
    setIsRoutePlannerOpen(true);
  };

  const handleSelectRoutePlan = (origin: CustomLocationPoint, destination: CustomLocationPoint, option: RoutePlanOption) => {
    setActiveRoutePlan({ origin, destination, selectedOption: option });
    setActiveStopCode(option.boardingStop.code);
    setIsMapOpen(true);
  };

  const activeAlarmForSelectedVehicle = useMemo(() => {
    if (!selectedVehicleForAlarm) return null;
    return alarms.find(
      a => !a.triggered && a.stopCode === activeStopCode && a.lineCode === selectedVehicleForAlarm.line
    ) || null;
  }, [selectedVehicleForAlarm, alarms, activeStopCode]);

  return (
    <div className="bg-[#0b0f19] min-h-screen text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white pb-16">
      {/* App Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
              <Bus size={17} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-slate-100 leading-tight">
                  {lang === 'el' ? 'Αστικό ΚΤΕΛ Ιωαννίνων' : 'Ioannina City Bus'}
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Telematics active" />
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                {lang === 'el' ? 'Ζωντανή τηλεματική στάσεων' : 'Live bus telematics'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Route Planner Button */}
            <button
              onClick={() => setIsRoutePlannerOpen(true)}
              className="p-2 rounded-lg text-sky-400 hover:text-white bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
              title={lang === 'el' ? 'Σχεδιαστής Διαδρομής' : 'Trip Planner'}
            >
              <Compass size={14} />
              <span className="hidden sm:inline">{lang === 'el' ? 'Πώς πάω;' : 'Trip Plan'}</span>
            </button>

            {/* Map Toggle Button */}
            <button
              onClick={() => setIsMapOpen(m => !m)}
              className={`p-2 rounded-lg border active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium ${
                isMapOpen
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800'
              }`}
              title={lang === 'el' ? 'Χάρτης' : 'Live Map'}
            >
              <Map size={14} />
              <span className="hidden sm:inline">{lang === 'el' ? 'Χάρτης' : 'Map'}</span>
            </button>

            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium"
              title={lang === 'el' ? 'Αναζήτηση στάσης' : 'Search stop'}
            >
              <Search size={14} />
              <span className="hidden sm:inline">{lang === 'el' ? 'Στάσεις' : 'Stops'}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(l => l === 'el' ? 'en' : 'el')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 active:scale-95 transition-all"
            >
              {lang === 'el' ? 'EN' : 'ΕΛ'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Mobile Centered View */}
      <main className="max-w-lg mx-auto w-full px-3.5 py-3.5 flex-1">
        {/* Favorite Stops Bar */}
        <FavoriteStopsBar
          favorites={favorites}
          stopsMap={STOPS_MAP}
          activeStopCode={activeStopCode}
          onSelectStop={setActiveStopCode}
          onOpenSearch={() => setIsSearchOpen(true)}
          onUpdateNickname={handleUpdateNickname}
          onRemoveFavorite={handleRemoveFavorite}
          lang={lang}
        />

        {/* Active Stop Details Card */}
        {activeStop && (
          <StopDetailsHeader
            stop={activeStop}
            isFavorite={favoriteCodes.has(activeStop.code)}
            onToggleFavorite={() => handleToggleFavorite(activeStop.code)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onToggleMap={() => setIsMapOpen(m => !m)}
            isMapOpen={isMapOpen}
            lang={lang}
          />
        )}

        {/* Interactive Live Map (When toggled on) */}
        {isMapOpen && activeStop && (
          <LiveTransitMap
            activeStop={activeStop}
            allStops={ALL_STOPS}
            vehicles={liveVehicles}
            onSelectStop={setActiveStopCode}
            onSetAlarmForVehicle={handleOpenAlarmForVehicle}
            lang={lang}
            isPickingLocation={isPickingLocation}
            onLocationPicked={handleLocationPicked}
            onCancelPickLocation={() => {
              setIsPickingLocation(false);
              setPickLocationTarget(null);
              setIsRoutePlannerOpen(true);
            }}
            activeRoutePlan={activeRoutePlan}
            onClearRoutePlan={() => setActiveRoutePlan(null)}
          />
        )}

        {/* Live Arrivals Card */}
        {activeStop && (
          <LiveArrivalsCard
            stop={activeStop}
            vehicles={liveVehicles}
            isLive={isLive}
            loading={loading}
            lastUpdated={lastUpdated}
            error={error}
            onRefresh={() => loadLiveArrivals(true)}
            onOpenTimetable={() => setIsTimetableOpen(true)}
            onToggleMap={() => setIsMapOpen(m => !m)}
            isMapOpen={isMapOpen}
            onSetAlarm={handleOpenAlarmForVehicle}
            activeAlarms={alarms}
            lang={lang}
          />
        )}
      </main>

      {/* Active Alarm Bottom Pill Banner */}
      <ActiveAlarmBanner
        alarms={alarms}
        vehicles={liveVehicles}
        onCancelAlarm={handleCancelAlarm}
        onOpenAlarmDetails={alarm => {
          const matched = liveVehicles.find(v => v.line === alarm.lineCode);
          if (matched) {
            handleOpenAlarmForVehicle(matched);
          }
        }}
        lang={lang}
      />

      {/* Route Planner Modal */}
      <RoutePlannerModal
        isOpen={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        allStops={ALL_STOPS}
        activeStop={activeStop}
        onSelectRoutePlan={handleSelectRoutePlan}
        onRequestPickOnMap={handleRequestPickOnMap}
        pickedLocation={pickedLocation}
        lang={lang}
      />

      {/* Stop Search Modal */}
      <StopSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        allStops={ALL_STOPS}
        allLines={ALL_LINES}
        favoriteCodes={favoriteCodes}
        onToggleFavorite={handleToggleFavorite}
        onSelectStop={code => {
          setActiveStopCode(code);
          setIsSearchOpen(false);
        }}
        lang={lang}
      />

      {/* Timetable Modal */}
      {activeStop && (
        <TimetableModal
          isOpen={isTimetableOpen}
          onClose={() => setIsTimetableOpen(false)}
          stop={activeStop}
          lang={lang}
        />
      )}

      {/* Set Alarm Modal */}
      {activeStop && (
        <SetAlarmModal
          isOpen={isAlarmModalOpen}
          onClose={() => {
            setIsAlarmModalOpen(false);
            setSelectedVehicleForAlarm(null);
          }}
          stop={activeStop}
          vehicle={selectedVehicleForAlarm}
          activeAlarm={activeAlarmForSelectedVehicle}
          onSaveAlarm={handleSaveAlarm}
          onCancelAlarm={handleCancelAlarm}
          lang={lang}
        />
      )}
    </div>
  );
}

export default App;
