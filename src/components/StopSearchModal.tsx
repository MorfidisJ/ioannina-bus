import React, { useState, useMemo } from 'react';
import { Search, X, Star, Navigation, Bus, Filter, Crosshair } from 'lucide-react';
import { BusStop, BusLine } from '../types';
import { matchesStopQuery, calculateDistanceMeters } from '../services/telematics';

interface StopSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStops: BusStop[];
  allLines: BusLine[];
  favoriteCodes: Set<string>;
  onToggleFavorite: (code: string) => void;
  onSelectStop: (code: string) => void;
  lang: 'el' | 'en';
}

export const StopSearchModal: React.FC<StopSearchModalProps> = ({
  isOpen,
  onClose,
  allStops,
  allLines,
  favoriteCodes,
  onToggleFavorite,
  onSelectStop,
  lang
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Request user GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === 'el' ? 'Η γεωθεσία δεν υποστηρίζεται από τον περιηγητή σας.' : 'Geolocation not supported.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        alert(lang === 'el' ? 'Δεν ήταν δυνατή η λήψη της τοποθεσίας σας.' : 'Unable to retrieve location.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Filter and sort stops
  const filteredStops = useMemo(() => {
    let list = allStops;

    if (selectedLineFilter !== 'all') {
      list = list.filter(s => s.lines.includes(selectedLineFilter));
    }

    if (searchQuery.trim()) {
      list = list.filter(s => matchesStopQuery(s.code, s.name_el, s.name_en, searchQuery));
    }

    // Attach distance if GPS available
    if (userLocation) {
      list = list.map(s => {
        if (s.lat && s.lng) {
          return {
            ...s,
            distanceMeters: calculateDistanceMeters(userLocation.lat, userLocation.lng, s.lat, s.lng)
          };
        }
        return s;
      });

      // Sort by closest distance first
      list.sort((a, b) => (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999));
    }

    return list;
  }, [allStops, searchQuery, selectedLineFilter, userLocation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800/40 flex items-center justify-center">
              <Bus size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                {lang === 'el' ? 'Αναζήτηση Στάσεων' : 'Search Stops'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {allStops.length} {lang === 'el' ? 'καταγεγραμμένες στάσεις' : 'registered stops'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input & Action Tools */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/50 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus-within:border-sky-500 transition-colors">
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'el' ? 'Όνομα ή ID (π.χ. 930, Δικαστικό, filosofiki)...' : 'Name or stop ID (e.g. 930, filosofiki)...'}
                className="bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none w-full"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-200">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Geolocation Button */}
            <button
              onClick={handleGetLocation}
              disabled={locating}
              title={lang === 'el' ? 'Κοντινότερες στάσεις (GPS)' : 'Nearby stops (GPS)'}
              className={`h-11 w-11 rounded-xl border transition-all flex items-center justify-center flex-shrink-0 text-xs font-medium active:scale-95 ${
                userLocation
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Crosshair size={18} className={locating ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Line Filter Chips - Touch-friendly height */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 flex-shrink-0 mr-1">
              <Filter size={12} />
              <span>{lang === 'el' ? 'Γραμμή:' : 'Line:'}</span>
            </span>
            <button
              onClick={() => setSelectedLineFilter('all')}
              className={`h-8 px-3 rounded-lg font-bold text-xs transition-all whitespace-nowrap active:scale-95 ${
                selectedLineFilter === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'el' ? 'Όλες' : 'All'}
            </button>
            {allLines.map(line => (
              <button
                key={line.code}
                onClick={() => setSelectedLineFilter(line.code)}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  selectedLineFilter === line.code
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {line.code}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5 scrollbar-thin">
          {filteredStops.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              {lang === 'el' ? 'Δεν βρέθηκαν στάσεις που να ταιριάζουν.' : 'No stops found matching your search.'}
            </div>
          ) : (
            filteredStops.slice(0, 80).map(stop => {
              const isFav = favoriteCodes.has(stop.code);
              return (
                <div
                  key={stop.code}
                  onClick={() => {
                    onSelectStop(stop.code);
                    onClose();
                  }}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/70 flex items-center justify-between gap-2.5 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleFavorite(stop.code);
                      }}
                      title={isFav ? (lang === 'el' ? 'Αφαίρεση' : 'Remove') : (lang === 'el' ? 'Αποθήκευση' : 'Save')}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 flex-shrink-0"
                    >
                      <Star size={15} className={isFav ? 'fill-amber-400 text-amber-400' : ''} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                          {lang === 'el' ? stop.name_el : stop.name_en}
                        </span>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                          #{stop.code}
                        </span>
                        {stop.distanceMeters !== undefined && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 flex items-center gap-0.5">
                            <Navigation size={8} />
                            <span>{stop.distanceMeters}m</span>
                          </span>
                        )}
                      </div>

                      {/* Serving Lines */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {stop.lines.map(lineCode => (
                          <span
                            key={lineCode}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300"
                          >
                            {lineCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-500 group-hover:text-slate-300 text-xs font-medium flex-shrink-0 px-1">
                    →
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Bottom Close Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex-shrink-0 sm:hidden">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-sm flex items-center justify-center transition-all shadow-sm"
          >
            <span>{lang === 'el' ? 'Κλείσιμο' : 'Close'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
