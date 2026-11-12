import React from 'react';
import { Star, MapPin, Navigation, Bus } from 'lucide-react';
import { BusStop } from '../types';

interface StopDetailsHeaderProps {
  stop: BusStop;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenSearch: () => void;
  lang: 'el' | 'en';
}

export const StopDetailsHeader: React.FC<StopDetailsHeaderProps> = ({
  stop,
  isFavorite,
  onToggleFavorite,
  onOpenSearch,
  lang
}) => {
  const googleMapsUrl = stop.lat && stop.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name_el + ' Ιωάννινα')}`;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-3 shadow-sm">
      {/* Top row: Status & ID */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Bus size={14} className="text-sky-400" />
          <span>{lang === 'el' ? 'Επιλεγμένη Στάση' : 'Selected Stop'}</span>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
          ID: {stop.code}
        </span>
      </div>

      {/* Stop Name */}
      <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight leading-snug">
        {lang === 'el' ? stop.name_el : stop.name_en}
      </h1>

      {/* Serving lines */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className="text-[11px] text-slate-400 mr-0.5">
          {lang === 'el' ? 'Γραμμές:' : 'Lines:'}
        </span>
        {stop.lines.map(line => (
          <span
            key={line}
            className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700/50"
          >
            {line}
          </span>
        ))}
      </div>

      {/* Mobile Action Buttons Bar */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80">
        {/* Toggle Favorite */}
        <button
          onClick={onToggleFavorite}
          className={`py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
            isFavorite
              ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
              : 'bg-slate-800/70 text-slate-300 border-slate-700/60 hover:text-white'
          }`}
        >
          <Star size={14} className={isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
          <span className="truncate">{isFavorite ? (lang === 'el' ? 'Αγαπημένη' : 'Saved') : (lang === 'el' ? 'Αγαπημένο' : 'Favorite')}</span>
        </button>

        {/* Google Maps Directions */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-2.5 rounded-xl text-xs font-medium bg-slate-800/70 text-slate-300 border border-slate-700/60 hover:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <Navigation size={13} className="text-sky-400" />
          <span>{lang === 'el' ? 'Χάρτης' : 'Map'}</span>
        </a>

        {/* Change Stop Button */}
        <button
          onClick={onOpenSearch}
          className="py-2 px-2.5 rounded-xl text-xs font-medium bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <MapPin size={13} />
          <span>{lang === 'el' ? 'Αλλαγή' : 'Change'}</span>
        </button>
      </div>
    </div>
  );
};
