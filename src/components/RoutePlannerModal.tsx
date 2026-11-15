import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Navigation,
  MapPin,
  ArrowUpDown,
  Search,
  Clock,
  Bus,
  Footprints,
  Star,
  Plus,
  Trash2,
  Compass,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { BusStop, CustomLocationPoint, RoutePlanOption, SavedPlace } from '../types';
import {
  planDirectRoutes,
  searchIoanninaNominatim,
  getSavedPlaces,
  saveCustomPlace,
  deleteCustomPlace,
  calculateDistanceMeters,
  calculateWalkingMinutes
} from '../services/routePlanner';

interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStops: BusStop[];
  activeStop: BusStop;
  onSelectRoutePlan: (origin: CustomLocationPoint, destination: CustomLocationPoint, option: RoutePlanOption) => void;
  onRequestPickOnMap: (target: 'origin' | 'destination') => void;
  pickedLocation?: { target: 'origin' | 'destination'; lat: number; lng: number } | null;
  lang: 'el' | 'en';
}

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({
  isOpen,
  onClose,
  allStops,
  activeStop,
  onSelectRoutePlan,
  onRequestPickOnMap,
  pickedLocation,
  lang
}) => {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [origin, setOrigin] = useState<CustomLocationPoint>({
    name: '📍 Η τοποθεσία μου',
    lat: activeStop.lat,
    lng: activeStop.lng,
    type: 'gps'
  });

  const [destination, setDestination] = useState<CustomLocationPoint | null>(null);

  // Search input state
  const [searchTarget, setSearchTarget] = useState<'origin' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addressResults, setAddressResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);

  // Saving custom place modal
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceIcon, setNewPlaceIcon] = useState('pin');

  // Route Planning states
  const [routeOptions, setRouteOptions] = useState<RoutePlanOption[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  // Load saved places on mount
  useEffect(() => {
    setSavedPlaces(getSavedPlaces());
  }, [isOpen]);

  // Handle picked location from map
  useEffect(() => {
    if (pickedLocation) {
      const loc: CustomLocationPoint = {
        name: `📍 Επιλεγμένο σημείο (${pickedLocation.lat.toFixed(4)}, ${pickedLocation.lng.toFixed(4)})`,
        lat: pickedLocation.lat,
        lng: pickedLocation.lng,
        type: 'map_pin'
      };

      if (pickedLocation.target === 'origin') {
        setOrigin(loc);
      } else {
        setDestination(loc);
      }
    }
  }, [pickedLocation]);

  // Request user GPS on open if origin is GPS
  useEffect(() => {
    if (isOpen && origin.type === 'gps' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setOrigin({
            name: lang === 'el' ? '📍 Η τοποθεσία μου (GPS)' : '📍 My Location (GPS)',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            type: 'gps'
          });
        },
        () => {
          // Fallback to active stop
          setOrigin({
            name: `${lang === 'el' ? activeStop.name_el : activeStop.name_en} (#${activeStop.code})`,
            lat: activeStop.lat,
            lng: activeStop.lng,
            type: 'stop',
            stopCode: activeStop.code
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  // Address geocoding search (debounced)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setAddressResults([]);
      setIsSearchingAddresses(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddresses(true);
      const results = await searchIoanninaNominatim(searchQuery);
      setAddressResults(results);
      setIsSearchingAddresses(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate routes when origin and destination change
  useEffect(() => {
    if (!origin || !destination) {
      setRouteOptions([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingRoutes(true);

    planDirectRoutes(origin, destination, true)
      .then(options => {
        if (!isCancelled) {
          setRouteOptions(options);
          setIsLoadingRoutes(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setRouteOptions([]);
          setIsLoadingRoutes(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [origin, destination]);

  // Matching stops for search
  const filteredStops = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 1) return [];
    const q = searchQuery.toLowerCase().trim();
    return allStops
      .filter(s =>
        s.code.toLowerCase().includes(q) ||
        s.name_el.toLowerCase().includes(q) ||
        s.name_en.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [searchQuery, allStops]);

  // Swap Origin and Destination
  const handleSwap = () => {
    if (!destination) return;
    const prevOrigin = origin;
    setOrigin(destination);
    setDestination(prevOrigin);
  };

  const handleSelectStop = (stop: BusStop, target: 'origin' | 'destination') => {
    const loc: CustomLocationPoint = {
      name: `${lang === 'el' ? stop.name_el : stop.name_en} (#${stop.code})`,
      lat: stop.lat,
      lng: stop.lng,
      type: 'stop',
      stopCode: stop.code
    };
    if (target === 'origin') setOrigin(loc);
    else setDestination(loc);
    setSearchTarget(null);
    setSearchQuery('');
  };

  const handleSelectAddress = (item: { name: string; lat: number; lng: number }, target: 'origin' | 'destination') => {
    const loc: CustomLocationPoint = {
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      type: 'address'
    };
    if (target === 'origin') setOrigin(loc);
    else setDestination(loc);
    setSearchTarget(null);
    setSearchQuery('');
  };

  const handleSelectSavedPlace = (place: SavedPlace, target: 'origin' | 'destination') => {
    const loc: CustomLocationPoint = {
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      type: 'saved_place'
    };
    if (target === 'origin') setOrigin(loc);
    else setDestination(loc);
    setSearchTarget(null);
    setSearchQuery('');
  };

  const handleSaveCurrentDestination = () => {
    if (!destination || !newPlaceName.trim()) return;
    const saved = saveCustomPlace({
      name: newPlaceName.trim(),
      lat: destination.lat,
      lng: destination.lng,
      icon: newPlaceIcon
    });
    setSavedPlaces(getSavedPlaces());
    setIsSavingPlace(false);
    setNewPlaceName('');
  };

  const handleDeleteSavedPlace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomPlace(id);
    setSavedPlaces(getSavedPlaces());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                {lang === 'el' ? 'Σχεδιαστής Διαδρομής' : 'Trip Planner'}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
                  Ioannina
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'el' ? 'Βρείτε το πιο γρήγορο λεωφορείο' : 'Find the fastest bus route'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Origin & Destination Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-3 relative">
            {/* Origin row */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30 font-bold text-xs">
                A
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {lang === 'el' ? 'Από (Αφετηρία)' : 'From (Origin)'}
                </span>
                <div
                  onClick={() => {
                    setSearchTarget('origin');
                    setSearchQuery('');
                  }}
                  className="text-xs font-semibold text-slate-100 truncate cursor-pointer hover:text-sky-400 transition-colors py-0.5 flex items-center justify-between"
                >
                  <span className="truncate">{origin.name}</span>
                  <span className="text-[10px] text-sky-400 hover:underline shrink-0 ml-1">
                    {lang === 'el' ? 'Αλλαγή' : 'Change'}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider with Swap Button */}
            <div className="relative flex items-center justify-center my-1">
              <div className="w-full border-t border-slate-800" />
              <button
                onClick={handleSwap}
                disabled={!destination}
                className="absolute w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center disabled:opacity-40 transition-all active:scale-95 shadow-sm"
                title={lang === 'el' ? 'Αντιστροφή διαδρομής' : 'Swap origin & destination'}
              >
                <ArrowUpDown size={13} />
              </button>
            </div>

            {/* Destination row */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 font-bold text-xs">
                B
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {lang === 'el' ? 'Προς (Προορισμός)' : 'To (Destination)'}
                </span>
                {destination ? (
                  <div
                    onClick={() => {
                      setSearchTarget('destination');
                      setSearchQuery('');
                    }}
                    className="text-xs font-semibold text-slate-100 truncate cursor-pointer hover:text-rose-400 transition-colors py-0.5 flex items-center justify-between"
                  >
                    <span className="truncate">{destination.name}</span>
                    <span className="text-[10px] text-rose-400 hover:underline shrink-0 ml-1">
                      {lang === 'el' ? 'Αλλαγή' : 'Change'}
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setSearchTarget('destination');
                      setSearchQuery('');
                    }}
                    className="text-xs text-slate-400 italic cursor-pointer hover:text-slate-200 py-0.5"
                  >
                    {lang === 'el' ? 'Πατήστε για επιλογή προορισμού...' : 'Tap to select destination...'}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons for Pick on Map */}
            <div className="pt-1.5 flex items-center gap-2 border-t border-slate-800/80">
              <button
                onClick={() => {
                  onRequestPickOnMap(destination ? 'origin' : 'destination');
                  onClose();
                }}
                className="flex-1 py-1.5 px-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[11px] font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin size={13} className="text-sky-400" />
                {lang === 'el' ? 'Επιλογή στον χάρτη' : 'Pick on map'}
              </button>

              {destination && (
                <button
                  onClick={() => setIsSavingPlace(true)}
                  className="py-1.5 px-2.5 bg-slate-800/80 hover:bg-slate-800 text-amber-300 rounded-xl text-[11px] font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
                  title={lang === 'el' ? 'Αποθήκευση προορισμού' : 'Save place'}
                >
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {lang === 'el' ? 'Αποθήκευση' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {/* Save Place Dialog (Inline) */}
          {isSavingPlace && destination && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Star size={13} className="fill-amber-400" />
                  {lang === 'el' ? 'Αποθήκευση Τοποθεσίας' : 'Save Custom Place'}
                </span>
                <button onClick={() => setIsSavingPlace(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder={lang === 'el' ? 'π.χ. Το Σπίτι μου, Γυμναστήριο' : 'e.g. My Home, Gym'}
                value={newPlaceName}
                onChange={e => setNewPlaceName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsSavingPlace(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  {lang === 'el' ? 'Ακύρωση' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveCurrentDestination}
                  disabled={!newPlaceName.trim()}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs"
                >
                  {lang === 'el' ? 'Αποθήκευση' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Preset Places Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 px-1">
              {lang === 'el' ? 'Δημοφιλή Σημεία & Αποθηκευμένα:' : 'Saved & Popular Places:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {savedPlaces.map(place => (
                <div
                  key={place.id}
                  onClick={() => handleSelectSavedPlace(place, destination ? 'origin' : 'destination')}
                  className="group px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700 rounded-full text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>{place.name}</span>
                  {/* Delete button only for user-added places */}
                  {place.id.startsWith('place_') && (
                    <button
                      onClick={e => handleDeleteSavedPlace(e, place.id)}
                      className="text-slate-500 hover:text-rose-400 ml-0.5"
                      title="Διαγραφή"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Search Dropdown / Picker View */}
          {searchTarget && (
            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-3 space-y-2.5 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Search size={13} />
                  {searchTarget === 'origin'
                    ? (lang === 'el' ? 'Επιλογή Αφετηρίας' : 'Select Origin')
                    : (lang === 'el' ? 'Επιλογή Προορισμού' : 'Select Destination')}
                </span>
                <button
                  onClick={() => setSearchTarget(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  {lang === 'el' ? 'Κλείσιμο' : 'Close'}
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder={lang === 'el' ? 'Αναζήτηση στάσης ή οδού στα Γιάννενα...' : 'Search stop or street in Ioannina...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Search Suggestions List */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {/* 1. Stored Stops matches */}
                {filteredStops.map(s => (
                  <div
                    key={s.code}
                    onClick={() => handleSelectStop(s, searchTarget)}
                    className="p-2 bg-slate-900/60 hover:bg-slate-800 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">
                        {lang === 'el' ? s.name_el : s.name_en}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>#{s.code}</span>
                        <span>•</span>
                        <span>{s.lines.slice(0, 3).join(', ')}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700 font-semibold">
                      {lang === 'el' ? 'Στάση' : 'Stop'}
                    </span>
                  </div>
                ))}

                {/* 2. OpenStreetMap Address matches */}
                {isSearchingAddresses && (
                  <div className="p-2 text-center text-xs text-slate-400 italic">
                    {lang === 'el' ? 'Αναζήτηση οδού...' : 'Searching street...'}
                  </div>
                )}

                {addressResults.map((addr, idx) => (
                  <div
                    key={`addr-${idx}`}
                    onClick={() => handleSelectAddress(addr, searchTarget)}
                    className="p-2 bg-slate-900/60 hover:bg-slate-800 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {addr.name}
                      </div>
                      <div className="text-[10px] text-slate-500">Ιωάννινα</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded border border-slate-700 font-semibold shrink-0">
                      {lang === 'el' ? 'Διεύθυνση' : 'Address'}
                    </span>
                  </div>
                ))}

                {!isSearchingAddresses && filteredStops.length === 0 && addressResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="p-3 text-center text-xs text-slate-500">
                    {lang === 'el' ? 'Δεν βρέθηκαν αποτελέσματα' : 'No results found'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Bus size={14} className="text-sky-400" />
                {lang === 'el' ? 'Προτεινόμενες Διαδρομές:' : 'Suggested Routes:'}
              </span>
              {routeOptions.length > 0 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {routeOptions.length} {lang === 'el' ? 'επιλογές' : 'options'}
                </span>
              )}
            </div>

            {/* Loading Indicator */}
            {isLoadingRoutes && (
              <div className="p-6 text-center space-y-2 bg-slate-950/40 border border-slate-800 rounded-2xl">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">
                  {lang === 'el' ? 'Υπολογισμός διαδρομών & έλεγχος live τηλεματικής...' : 'Calculating routes & checking live departures...'}
                </p>
              </div>
            )}

            {/* Empty state: No destination chosen yet */}
            {!isLoadingRoutes && !destination && (
              <div className="p-6 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl space-y-1.5">
                <Compass size={24} className="mx-auto text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">
                  {lang === 'el' ? 'Επιλέξτε προορισμό' : 'Choose a destination'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'el'
                    ? 'Επιλέξτε από τα δημοφιλή σημεία ή πατήστε στον χάρτη'
                    : 'Select a landmark or pick a spot on the map'}
                </p>
              </div>
            )}

            {/* Empty state: No direct routes found */}
            {!isLoadingRoutes && destination && routeOptions.length === 0 && (
              <div className="p-5 text-center bg-slate-950/40 border border-slate-800 rounded-2xl space-y-1.5">
                <p className="text-xs font-bold text-amber-400">
                  {lang === 'el' ? 'Δεν βρέθηκε απευθείας γραμμή' : 'No direct line found'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'el'
                    ? 'Δοκιμάστε να επιλέξετε μια κοντινότερη στάση ή σημείο προς το κέντρο.'
                    : 'Try selecting a stop closer to the city center.'}
                </p>
              </div>
            )}

            {/* Route Options Cards */}
            {!isLoadingRoutes && routeOptions.map((opt, idx) => (
              <div
                key={opt.id}
                className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md group"
              >
                {/* Line Header & Total Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-lg font-bold text-xs shadow-sm"
                      style={{ backgroundColor: opt.lineColor, color: opt.lineTextColor }}
                    >
                      {opt.lineCode}
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[170px] sm:max-w-xs">
                      {opt.lineName}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">
                      ~{opt.totalMinutes} {lang === 'el' ? 'λεπτά' : 'mins'}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {lang === 'el' ? 'συνολικά' : 'total'}
                    </span>
                  </div>
                </div>

                {/* Step-by-Step Breakdown */}
                <div className="space-y-1.5 pt-1 text-[11px] border-t border-slate-800/80">
                  {/* Step 1: Walk to Boarding Stop */}
                  <div className="flex items-center gap-2 text-slate-300">
                    <Footprints size={13} className="text-sky-400 shrink-0" />
                    <span className="truncate">
                      {opt.walkToBoardingMinutes > 0
                        ? (lang === 'el'
                            ? `Περπάτημα ${opt.walkToBoardingMinutes}' (${opt.walkToBoardingMeters}m) στη Στάση`
                            : `Walk ${opt.walkToBoardingMinutes}' (${opt.walkToBoardingMeters}m) to`)
                        : (lang === 'el' ? 'Επιβίβαση στη Στάση' : 'Board at')}
                      {' '}
                      <strong className="text-white">{lang === 'el' ? opt.boardingStop.name_el : opt.boardingStop.name_en}</strong>
                    </span>
                  </div>

                  {/* Step 2: Bus Arrival / Ride */}
                  <div className="flex items-center justify-between gap-2 text-slate-300 pl-5">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Bus size={12} className="text-slate-500" />
                      {opt.liveMinutesUntil !== null && opt.liveMinutesUntil !== undefined ? (
                        <span className="text-amber-400 font-bold animate-pulse">
                          ⚡ {lang === 'el' ? `Έρχεται σε ${opt.liveMinutesUntil}' (Live)` : `Arriving in ${opt.liveMinutesUntil}' (Live)`}
                        </span>
                      ) : (
                        <span>{lang === 'el' ? 'Αναμονή ~5-10 λεπτά' : 'Wait ~5-10 mins'}</span>
                      )}
                    </span>
                    <span className="text-slate-400">
                      ~{opt.estimatedRideMinutes}' {lang === 'el' ? 'διαδρομή' : 'ride'} ({opt.stopsCount} {lang === 'el' ? 'στάσεις' : 'stops'})
                    </span>
                  </div>

                  {/* Step 3: Alighting & Walk to Destination */}
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin size={13} className="text-rose-400 shrink-0" />
                    <span className="truncate">
                      {lang === 'el' ? 'Αποβίβαση στη Στάση' : 'Alight at'}
                      {' '}
                      <strong className="text-white">{lang === 'el' ? opt.alightingStop.name_el : opt.alightingStop.name_en}</strong>
                      {opt.walkFromAlightingMinutes > 0 && (
                        <span className="text-slate-400 ml-1">
                          (+{opt.walkFromAlightingMinutes}' {lang === 'el' ? 'περπάτημα' : 'walk'})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* View on Map Button */}
                <button
                  onClick={() => {
                    onSelectRoutePlan(origin, destination!, opt);
                    onClose();
                  }}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md mt-1"
                >
                  <Compass size={14} />
                  {lang === 'el' ? 'Προβολή στον Χάρτη' : 'View on Map'}
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

