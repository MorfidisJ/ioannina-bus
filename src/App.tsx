import React, { useState, useEffect, useMemo } from 'react';
import { Bus, Search } from 'lucide-react';
import { FavoriteStop, LiveVehicle } from './types';
import { ALL_STOPS, ALL_LINES, STOPS_MAP } from './data';
import { fetchLiveArrivals } from './services/telematics';
import { FavoriteStopsBar } from './components/FavoriteStopsBar';
import { StopDetailsHeader } from './components/StopDetailsHeader';
import { LiveArrivalsCard } from './components/LiveArrivalsCard';
import { StopSearchModal } from './components/StopSearchModal';
import { TimetableModal } from './components/TimetableModal';

const FAVORITES_STORAGE_KEY = 'ioannina_bus_fav_stops_v1';
const ACTIVE_STOP_STORAGE_KEY = 'ioannina_bus_active_stop_v1';
const LANG_STORAGE_KEY = 'ioannina_bus_lang_v1';

// Initial pre-configured popular stops for Ioannina
const DEFAULT_FAVORITES: FavoriteStop[] = [
  { code: '930', customName: 'Φιλοσοφική / Εστιατόριο (Λέσχη)', addedAt: 1, order: 0 },
  { code: '400', customName: 'Δικαστικό Μέγαρο (Κέντρο)', addedAt: 2, order: 1 },
  { code: '451', customName: 'Πανεπιστημιακό Νοσοκομείο', addedAt: 3, order: 2 },
  { code: '201', customName: 'Πλάτανος (Κεντρική Πλατεία)', addedAt: 4, order: 3 },
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

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);

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
  }, [activeStopCode]);

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

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

  return (
    <div style={{ backgroundColor: '#12161c', minHeight: '100vh', color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* App Header */}
      <header className="border-b border-slate-800/80 bg-[#141820]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: '#1a1f26',
                boxShadow: '3px 3px 8px #111419, -3px -3px 8px #232a33'
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-500/20"
            >
              <Bus size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-100">
                  {lang === 'el' ? 'Αστικό ΚΤΕΛ Ιωαννίνων' : 'Ioannina City Transit'}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'el' ? 'Τηλεματική όλων των στάσεων & αγαπημένα' : 'Real-time telematics for all stops'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                backgroundColor: '#1a1f26',
                boxShadow: '3px 3px 8px #111419, -3px -3px 8px #232a33'
              }}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white border border-slate-700/40 active:scale-95 transition-all flex items-center gap-2"
              title={lang === 'el' ? 'Αναζήτηση σε όλες τις στάσεις' : 'Search all stops'}
            >
              <Search size={16} />
              <span className="text-xs font-bold hidden sm:inline">{lang === 'el' ? 'Στάσεις' : 'Stops'}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(l => l === 'el' ? 'en' : 'el')}
              style={{
                backgroundColor: '#1a1f26',
                boxShadow: '3px 3px 8px #111419, -3px -3px 8px #232a33'
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-amber-300 border border-slate-700/40 active:scale-95 transition-all"
            >
              {lang === 'el' ? 'EN' : 'ΕΛ'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-5 pb-24">
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
            lang={lang}
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
            lang={lang}
          />
        )}
      </main>

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
    </div>
  );
}
export default App;
