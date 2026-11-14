import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Bus, MapPin, Navigation, Crosshair, Maximize2, Minimize2, Bell, Sun, Moon } from 'lucide-react';
import { BusStop, LiveVehicle } from '../types';
import { calculateDistanceMeters } from '../services/telematics';

interface LiveTransitMapProps {
  activeStop: BusStop;
  allStops: BusStop[];
  vehicles: LiveVehicle[];
  onSelectStop: (code: string) => void;
  onSetAlarmForVehicle?: (vehicle: LiveVehicle) => void;
  lang: 'el' | 'en';
}

export const LiveTransitMap: React.FC<LiveTransitMapProps> = ({
  activeStop,
  allStops,
  vehicles,
  onSelectStop,
  onSetAlarmForVehicle,
  lang
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapDarkMode, setIsMapDarkMode] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Guard against multiple initializations
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [activeStop.lat, activeStop.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // 100% Free OpenStreetMap tile layer - No API key, No watermark
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" style="color: #64748b">OpenStreetMap</a>'
      }).addTo(map);

      // Attribution control in bottom right
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://openstreetmap.org" target="_blank" style="color: #64748b">OSM</a>')
        .addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      markersLayerRef.current = markersGroup;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Center map on active stop change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([activeStop.lat, activeStop.lng], 16, { animate: true });
  }, [activeStop.code]);

  // Request user GPS location for map pin
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Render / Update Markers whenever activeStop, vehicles, or userLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 1. Render User Location (if available)
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative flex items-center justify-center w-6 h-6">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500 border-2 border-white shadow-md"></span>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindPopup(`
          <div class="text-xs font-sans text-slate-100 py-1">
            <p class="font-bold text-sky-400">${lang === 'el' ? 'Η τοποθεσία σας' : 'Your location'}</p>
          </div>
        `)
        .addTo(layer);
    }

    // 2. Render Nearby Stops (within 800m of active stop)
    const nearbyStops = allStops.filter(s => {
      if (s.code === activeStop.code) return false;
      return calculateDistanceMeters(activeStop.lat, activeStop.lng, s.lat, s.lng) <= 800;
    });

    nearbyStops.forEach(s => {
      const stopIcon = L.divIcon({
        className: 'nearby-stop-marker',
        html: `
          <div class="w-6 h-6 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center text-slate-300 hover:scale-125 transition-transform shadow-sm cursor-pointer">
            <span class="text-[9px] font-bold">#</span>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const stopName = lang === 'el' ? s.name_el : s.name_en;
      const marker = L.marker([s.lat, s.lng], { icon: stopIcon }).addTo(layer);

      const popupContent = document.createElement('div');
      popupContent.className = 'text-xs font-sans text-slate-100 py-1 space-y-1.5';
      popupContent.innerHTML = `
        <div class="font-bold text-slate-200">${stopName}</div>
        <div class="text-[11px] text-slate-400">Κωδικός: #${s.code}</div>
        <div class="flex flex-wrap gap-1 mt-1">
          ${s.lines.slice(0, 4).map(l => `<span class="px-1.5 py-0.5 bg-slate-800 text-sky-300 rounded font-semibold text-[10px] border border-slate-700">${l}</span>`).join('')}
        </div>
        <button id="btn-select-stop-${s.code}" class="mt-2 w-full py-1 px-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-[11px] font-medium transition-colors text-center">
          ${lang === 'el' ? 'Επιλογή στάσης' : 'Select this stop'}
        </button>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-stop-${s.code}`);
        if (btn) {
          btn.onclick = () => {
            onSelectStop(s.code);
            marker.closePopup();
          };
        }
      });
    });

    // 3. Render Active Stop Marker (Prominent Glowing Pin)
    const activeIcon = L.divIcon({
      className: 'active-stop-marker',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-40"></span>
          <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const activeName = lang === 'el' ? activeStop.name_el : activeStop.name_en;
    L.marker([activeStop.lat, activeStop.lng], { icon: activeIcon, zIndexOffset: 1000 })
      .bindPopup(`
        <div class="text-xs font-sans text-slate-100 py-1">
          <span class="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">${lang === 'el' ? 'Επιλεγμένη Στάση' : 'Active Stop'}</span>
          <p class="font-bold text-sm text-white mt-0.5">${activeName}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Κωδικός: #${activeStop.code}</p>
        </div>
      `)
      .addTo(layer);

    // 4. Render Live Arriving Buses (only if they have valid GPS coordinates in Ioannina)
    const validVehicles = vehicles.filter(v => {
      const lat = typeof v.latitude === 'string' ? parseFloat(v.latitude) : v.latitude;
      const lng = typeof v.longitude === 'string' ? parseFloat(v.longitude) : v.longitude;
      return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng) &&
        lat > 39.0 && lat < 40.5 && lng > 20.0 && lng < 21.5;
    });

    validVehicles.forEach((v, idx) => {
      const isUrgent = v.minutesUntil <= 2;
      const busIcon = L.divIcon({
        className: 'live-bus-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            ${isUrgent ? '<span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-amber-400 opacity-60"></span>' : ''}
            <div class="h-8 px-2 rounded-xl bg-slate-900 border-2 border-sky-400 shadow-xl flex items-center gap-1 text-white font-bold text-xs hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
              <span class="text-white">${v.line}</span>
            </div>
          </div>
        `,
        iconSize: [48, 32],
        iconAnchor: [24, 16]
      });

      const busMarker = L.marker([v.latitude!, v.longitude!], { icon: busIcon, zIndexOffset: 2000 + idx }).addTo(layer);

      const busPopup = document.createElement('div');
      busPopup.className = 'text-xs font-sans text-slate-100 py-1 space-y-1.5';
      busPopup.innerHTML = `
        <div class="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1">
          <span class="font-bold text-sm text-sky-400">Γραμμή ${v.line}</span>
          ${v.vehicleCode ? `<span class="text-[10px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">#${v.vehicleCode}</span>` : ''}
        </div>
        <div class="text-[11px] text-slate-300 font-medium">${v.routeName || v.lineName}</div>
        <div class="flex items-center gap-1.5 text-xs font-bold ${isUrgent ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}">
          <span>${v.minutesUntil <= 0 ? (lang === 'el' ? 'Φτάνει τώρα!' : 'Arriving now!') : (lang === 'el' ? `σε ${v.minutesUntil} λεπτά` : `in ${v.minutesUntil} mins`)}</span>
        </div>
        ${onSetAlarmForVehicle ? `
          <button id="btn-alarm-bus-${v.line}-${idx}" class="mt-2 w-full py-1 px-2.5 bg-amber-600/80 hover:bg-amber-500 text-white rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            ${lang === 'el' ? 'Ειδοποίηση άφιξης' : 'Set arrival alert'}
          </button>
        ` : ''}
      `;

      busMarker.bindPopup(busPopup);
      busMarker.on('popupopen', () => {
        const alarmBtn = document.getElementById(`btn-alarm-bus-${v.line}-${idx}`);
        if (alarmBtn && onSetAlarmForVehicle) {
          alarmBtn.onclick = () => {
            onSetAlarmForVehicle(v);
            busMarker.closePopup();
          };
        }
      });
    });
  }, [activeStop, allStops, vehicles, userLocation, lang, onSelectStop, onSetAlarmForVehicle]);

  // Recenter actions
  const handleRecenterStop = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([activeStop.lat, activeStop.lng], 16, { animate: true });
  };

  const isValidVehicleGps = (v: LiveVehicle) => {
    const lat = typeof v.latitude === 'string' ? parseFloat(v.latitude) : v.latitude;
    const lng = typeof v.longitude === 'string' ? parseFloat(v.longitude) : v.longitude;
    return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng) &&
      lat > 39.0 && lat < 40.5 && lng > 20.0 && lng < 21.5;
  };

  const handleFitBuses = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const validVehicles = vehicles.filter(isValidVehicleGps);
    if (validVehicles.length === 0) {
      handleRecenterStop();
      return;
    }

    const bounds = L.latLngBounds([
      [activeStop.lat, activeStop.lng],
      ...validVehicles.map(v => [v.latitude!, v.longitude!] as [number, number])
    ]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
  };

  const handleRecenterUser = () => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
  };

  // Trigger Leaflet resize calculation when container expands
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  };

  return (
    <div className={`relative transition-all duration-300 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md ${
      isFullscreen ? 'fixed inset-3 z-50 rounded-2xl' : 'w-full h-72 sm:h-80 mb-4'
    }`}>
      {/* Map Container with GPU-accelerated Dark Mode filter */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${isMapDarkMode ? 'dark-map-theme' : ''}`}
      />

      {/* Map Top Floating Header */}
      <div className="absolute top-2.5 left-2.5 z-[1000] flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/80 shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-bold text-slate-100 truncate max-w-[160px] sm:max-w-xs">
          {lang === 'el' ? activeStop.name_el : activeStop.name_en}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-medium">
          #{activeStop.code}
        </span>
      </div>

      {/* Map Control Buttons (Floating on Right) */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-md flex items-center justify-center active:scale-95 transition-all"
          title={isFullscreen ? (lang === 'el' ? 'Σμίκρυνση' : 'Minimize') : (lang === 'el' ? 'Μεγιστοποίηση' : 'Fullscreen')}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        <button
          onClick={() => setIsMapDarkMode(d => !d)}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-md flex items-center justify-center active:scale-95 transition-all"
          title={isMapDarkMode ? (lang === 'el' ? 'Φωτεινός Χάρτης' : 'Light Map') : (lang === 'el' ? 'Σκοτεινός Χάρτης' : 'Dark Map')}
        >
          {isMapDarkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={handleRecenterStop}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-md flex items-center justify-center active:scale-95 transition-all"
          title={lang === 'el' ? 'Εστίαση στη στάση' : 'Center on stop'}
        >
          <Crosshair size={15} />
        </button>

        {vehicles.some(isValidVehicleGps) && (
          <button
            onClick={handleFitBuses}
            className="w-8 h-8 rounded-lg bg-sky-950/90 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-700/80 shadow-md flex items-center justify-center active:scale-95 transition-all animate-bounce"
            title={lang === 'el' ? 'Εστίαση στα λεωφορεία' : 'Fit buses & stop'}
          >
            <Bus size={15} />
          </button>
        )}

        {userLocation && (
          <button
            onClick={handleRecenterUser}
            className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-700/80 shadow-md flex items-center justify-center active:scale-95 transition-all"
            title={lang === 'el' ? 'Η τοποθεσία μου' : 'My location'}
          >
            <Navigation size={15} />
          </button>
        )}
      </div>

      {/* Map Bottom Status Bar */}
      <div className="absolute bottom-2 left-2.5 z-[1000] flex items-center gap-2">
        <span className="text-[11px] bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 text-slate-300 font-medium shadow-sm flex items-center gap-1.5">
          <Bus size={12} className="text-sky-400" />
          {vehicles.filter(isValidVehicleGps).length > 0
            ? (lang === 'el'
                ? `${vehicles.filter(isValidVehicleGps).length} ενεργά λεωφορεία στον χάρτη`
                : `${vehicles.filter(isValidVehicleGps).length} live buses on map`)
            : (lang === 'el' ? 'Αναμονή GPS οχημάτων' : 'Awaiting vehicle GPS')}
        </span>
      </div>
    </div>
  );
};

