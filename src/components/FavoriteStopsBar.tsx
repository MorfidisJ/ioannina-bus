import React, { useState } from 'react';
import { Star, Plus, MoreVertical, Edit2, Trash2, X, Check } from 'lucide-react';
import { BusStop, FavoriteStop } from '../types';

interface FavoriteStopsBarProps {
  favorites: FavoriteStop[];
  stopsMap: Map<string, BusStop>;
  activeStopCode: string;
  onSelectStop: (code: string) => void;
  onOpenSearch: () => void;
  onUpdateNickname: (code: string, nickname: string) => void;
  onRemoveFavorite: (code: string) => void;
  lang: 'el' | 'en';
}

export const FavoriteStopsBar: React.FC<FavoriteStopsBarProps> = ({
  favorites,
  stopsMap,
  activeStopCode,
  onSelectStop,
  onOpenSearch,
  onUpdateNickname,
  onRemoveFavorite,
  lang
}) => {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState<string>('');

  const handleStartEdit = (fav: FavoriteStop, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCode(fav.code);
    setNicknameInput(fav.customName || '');
  };

  const handleSaveNickname = (code: string) => {
    onUpdateNickname(code, nicknameInput.trim());
    setEditingCode(null);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
          <Star size={14} className="fill-amber-400" />
          <span>{lang === 'el' ? 'Αγαπημένες Στάσεις' : 'Favorite Stops'}</span>
          <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.2 rounded-full bg-slate-800">
            {favorites.length}
          </span>
        </div>
        <button
          onClick={onOpenSearch}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          <span>{lang === 'el' ? 'Προσθήκη Στάσης' : 'Add Stop'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {favorites.map(fav => {
          const stop = stopsMap.get(fav.code);
          const isActive = fav.code === activeStopCode;
          const isEditing = editingCode === fav.code;
          const displayName = fav.customName || (stop ? (lang === 'el' ? stop.name_el : stop.name_en) : `Στάση ${fav.code}`);

          if (isEditing) {
            return (
              <div
                key={fav.code}
                className="flex items-center gap-1 bg-[#1e232a] border border-amber-400/60 p-1 rounded-2xl flex-shrink-0"
              >
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  placeholder={lang === 'el' ? 'Ψευδώνυμο...' : 'Nickname...'}
                  className="bg-slate-900 text-xs px-2.5 py-1 rounded-xl text-slate-100 outline-none w-32"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveNickname(fav.code);
                    if (e.key === 'Escape') setEditingCode(null);
                  }}
                />
                <button
                  onClick={() => handleSaveNickname(fav.code)}
                  className="p-1 text-emerald-400 hover:text-emerald-300"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingCode(null)}
                  className="p-1 text-slate-400 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              </div>
            );
          }

          return (
            <div
              key={fav.code}
              onClick={() => onSelectStop(fav.code)}
              style={isActive ? {
                backgroundColor: '#1e232a',
                boxShadow: 'inset 2px 2px 5px #15181d, inset -2px -2px 5px #272e37',
                border: '1.5px solid #f59e0b'
              } : {
                backgroundColor: '#1e232a',
                boxShadow: '3px 3px 8px #15181d, -3px -3px 8px #272e37',
                border: '1px solid rgba(51, 65, 85, 0.4)'
              }}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-2xl cursor-pointer transition-all flex-shrink-0 select-none ${
                isActive ? 'scale-[1.02]' : 'hover:-translate-y-0.5 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Star size={12} className={`fill-current ${isActive ? 'text-amber-400' : 'text-amber-400/70'}`} />
                <span className={`text-xs font-bold max-w-[150px] truncate ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>
                  {displayName}
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400">
                  #{fav.code}
                </span>
              </div>

              {/* Quick actions on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                <button
                  onClick={e => handleStartEdit(fav, e)}
                  title={lang === 'el' ? 'Μετονομασία' : 'Rename'}
                  className="p-1 text-slate-400 hover:text-amber-300 rounded-lg"
                >
                  <Edit2 size={11} />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveFavorite(fav.code);
                  }}
                  title={lang === 'el' ? 'Αφαίρεση από τα αγαπημένα' : 'Remove favorite'}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Stop Button Pill */}
        <button
          onClick={onOpenSearch}
          style={{
            backgroundColor: '#1e232a',
            boxShadow: '3px 3px 8px #15181d, -3px -3px 8px #272e37'
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-dashed border-slate-700 text-slate-400 hover:text-sky-300 hover:border-sky-500/50 text-xs font-semibold flex-shrink-0 active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>{lang === 'el' ? 'Όλες οι Στάσεις...' : 'All Stops...'}</span>
        </button>
      </div>
    </div>
  );
};

