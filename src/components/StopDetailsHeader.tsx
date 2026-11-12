import React from 'react';
import { Star, MapPin, Navigation, Bus, ExternalLink, Share2 } from 'lucide-react';
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
    <div
      style={{
        backgroundColor: '#1a1f26',
        boxShadow: '6px 6px 16px #111419, -6px -6px 16px #232a33',
        border: '1px solid rgba(51, 65, 85, 0.3)'
      }}
      className="p-5 sm:p-6 rounded-3xl mb-4"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Stop Info */}
        <div className="flex items-start gap-3.5">
          <div
            style={{
              backgroundColor: '#12161c',
              boxShadow: '2px 2px 6px #111419, -2px -2px 6px #232a33'
            }}
            className="p-3 rounded-2xl text-sky-400 border border-slate-700/50 flex-shrink-0"
          >
            <Bus size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                {lang === 'el' ? 'Ενεργή Στάση' : 'Active Stop'}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-slate-700/60">
                Stop ID: {stop.code}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-0.5">
              {lang === 'el' ? stop.name_el : stop.name_en}
            </h1>

            {/* Serving lines */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 mr-1">
                {lang === 'el' ? 'Διερχόμενες γραμμές:' : 'Serving lines:'}
              </span>
              {stop.lines.map(line => (
                <span
                  key={line}
                  className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/40"
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Favorite Toggle */}
          <button
            onClick={onToggleFavorite}
            style={{
              backgroundColor: isFavorite ? '#78350f' : '#1e232a',
              boxShadow: '3px 3px 8px #111419, -3px -3px 8px #232a33'
            }}
            className={`p-3 rounded-2xl transition-all active:scale-95 border ${
              isFavorite
                ? 'text-amber-400 border-amber-500/50'
                : 'text-slate-400 hover:text-amber-400 border-slate-700/40'
            }`}
            title={isFavorite ? (lang === 'el' ? 'Αφαίρεση από αγαπημένα' : 'Remove favorite') : (lang === 'el' ? 'Προσθήκη στα αγαπημένα' : 'Add to favorites')}
          >
            <Star size={18} className={isFavorite ? 'fill-amber-400' : ''} />
          </button>

          {/* Google Maps Directions */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#1e232a',
              boxShadow: '3px 3px 8px #111419, -3px -3px 8px #232a33'
            }}
            className="p-3 rounded-2xl text-sky-400 hover:text-sky-300 border border-slate-700/40 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title={lang === 'el' ? 'Οδηγίες μετάβασης στους Χάρτες Google' : 'Directions in Google Maps'}
          >
            <Navigation size={17} />
            <span className="hidden sm:inline">Maps</span>
          </a>

          {/* Change Stop Button */}
          <button
            onClick={onOpenSearch}
            style={{
              backgroundColor: '#1e232a',
              boxShadow: '3px 3px 8px #111419, -3px -3px 8px #232a33'
            }}
            className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-200 hover:text-white border border-slate-700/40 active:scale-95 transition-all flex items-center gap-2"
          >
            <MapPin size={15} className="text-amber-400" />
            <span>{lang === 'el' ? 'Αλλαγή Στάσης' : 'Change Stop'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
