import React, { useState, useMemo } from 'react';
import { Search, X, Star, MapPin, Navigation, Bus, Filter, Crosshair } from 'lucide-react';
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
      err => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        style={{
          backgroundColor: '#161a22',
          boxShadow: '10px 10px 30px #0b0d11, -10px -10px 30px #212733'
        }}
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl flex flex-col border border-slate-700/40 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-950/80 text-sky-400 border border-sky-800/40">
              <Bus size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                {lang === 'el' ? 'Αναζήτηση Στάσεων Ιωαννίνων' : 'Search Ioannina Bus Stops'}
              </h2>
              <p className="text-xs text-slate-400">
                {allStops.length} {lang === 'el' ? 'καταγεγραμμένες στάσεις Αστικού ΚΤΕΛ' : 'registered KTEL stops'}
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

        {/* Search Input & Action Tools */}
        <div className="p-4 border-b border-slate-800 bg-[#12151b] space-y-3">
          <div className="flex items-center gap-2">
            <div
              style={{
                backgroundColor: '#1a1f26',
                boxShadow: 'inset 2px 2px 5px #111419, inset -2px -2px 5px #232a33'
              }}
              className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-slate-700/40"
            >
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'el' ? 'Αναζήτηση με όνομα ή κωδικό στάσης (π.χ. 930, Δικαστικό, filosofiki)...' : 'Search by name or stop code (e.g. 930, filosofiki)...'}
                className="bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none w-full"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Geolocation Button */}
            <button
              onClick={handleGetLocation}
              disabled={locating}
              title={lang === 'el' ? 'Εύρεση στάσεων κοντά μου' : 'Find stops near me'}
              style={{
                backgroundColor: userLocation ? '#0369a1' : '#1e232a',
                boxShadow: '3px 3px 7px #111419, -3px -3px 7px #232a33'
              }}
              className={`p-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0 ${
                userLocation ? 'text-white' : 'text-sky-400 hover:text-sky-300'
              }`}
            >
              <Crosshair size={18} className={locating ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Line Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 flex-shrink-0 mr-1">
              <Filter size={12} />
              <span>{lang === 'el' ? 'Γραμμή:' : 'Line:'}</span>
            </span>
            <button
              onClick={() => setSelectedLineFilter('all')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedLineFilter === 'all'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'el' ? 'Όλες' : 'All'}
            </button>
            {allLines.map(line => (
              <button
                key={line.code}
                onClick={() => setSelectedLineFilter(line.code)}
                style={selectedLineFilter === line.code ? {
                  backgroundColor: line.color,
                  color: line.textColor || '#ffffff'
                } : {}}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap ${
                  selectedLineFilter === line.code
                    ? 'shadow-md scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {line.code}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
          {filteredStops.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              {lang === 'el' ? 'Δεν βρέθηκαν στάσεις που να ταιριάζουν στην αναζήτηση.' : 'No stops found matching your search.'}
            </div>
          ) : (
            filteredStops.slice(0, 100).map(stop => {
              const isFav = favoriteCodes.has(stop.code);
              return (
                <div
                  key={stop.code}
                  onClick={() => {
                    onSelectStop(stop.code);
                    onClose();
                  }}
                  style={{
                    backgroundColor: '#1a1f26',
                    boxShadow: '2px 2px 6px #111419, -2px -2px 6px #232a33'
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-between border border-slate-800 hover:border-slate-700 cursor-pointer active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleFavorite(stop.code);
                      }}
                      title={isFav ? (lang === 'el' ? 'Αφαίρεση από αγαπημένα' : 'Remove from favorites') : (lang === 'el' ? 'Προσθήκη στα αγαπημένα' : 'Add to favorites')}
                      className={`p-2 rounded-xl transition-all ${
                        isFav
                          ? 'text-amber-400 hover:text-amber-300 bg-amber-950/30'
                          : 'text-slate-600 hover:text-amber-400 hover:bg-slate-800'
                      }`}
                    >
                      <Star size={16} className={isFav ? 'fill-amber-400' : ''} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                          {lang === 'el' ? stop.name_el : stop.name_en}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-sky-400 border border-slate-700/50">
                          #{stop.code}
                        </span>
                        {stop.distanceMeters !== undefined && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-0.5">
                            <Navigation size={9} />
                            <span>{stop.distanceMeters}m</span>
                          </span>
                        )}
                      </div>

                      {/* Lines Serving this Stop */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {stop.lines.map(lineCode => (
                          <span
                            key={lineCode}
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/40"
                          >
                            {lineCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2 text-slate-500 group-hover:text-slate-300">
                    <span className="text-xs font-semibold hidden sm:inline">
                      {lang === 'el' ? 'Επιλογή' : 'Select'}
                    </span>
                    <span className="text-sm">→</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

