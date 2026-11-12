import React, { useState } from 'react';
import { Star, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
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
    <div className="mb-3">
      {/* Header Label & Add Button */}
      <div className="flex items-center justify-between px-0.5 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Star size={13} className="text-amber-400 fill-amber-400" />
          <span>{lang === 'el' ? 'Αγαπημένες Στάσεις' : 'Favorite Stops'}</span>
          <span className="text-[11px] text-slate-500 font-mono">({favorites.length})</span>
        </div>
        <button
          onClick={onOpenSearch}
          className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors py-1 px-1.5"
        >
          <Plus size={13} />
          <span>{lang === 'el' ? 'Προσθήκη' : 'Add'}</span>
        </button>
      </div>

      {/* Horizontal Scrollable Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1">
        {favorites.map(fav => {
          const stop = stopsMap.get(fav.code);
          const isActive = fav.code === activeStopCode;
          const isEditing = editingCode === fav.code;
          const displayName = fav.customName || (stop ? (lang === 'el' ? stop.name_el : stop.name_en) : `Στάση ${fav.code}`);

          if (isEditing) {
            return (
              <div
                key={fav.code}
                className="flex items-center gap-1 bg-slate-900 border border-slate-700 p-1 rounded-xl flex-shrink-0"
              >
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  placeholder={lang === 'el' ? 'Όνομα...' : 'Name...'}
                  className="bg-slate-950 text-xs px-2.5 py-1 rounded-lg text-slate-100 outline-none w-28"
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
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all flex-shrink-0 select-none border text-xs ${
                isActive
                  ? 'bg-slate-800 border-slate-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Star
                  size={12}
                  className={`flex-shrink-0 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-slate-500 fill-slate-500/30'}`}
                />
                <span className="max-w-[140px] truncate">
                  {displayName}
                </span>
                <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  #{fav.code}
                </span>
              </div>

              {/* Hover / tap actions */}
              <div className="flex items-center gap-0.5 ml-1 opacity-70 group-hover:opacity-100">
                <button
                  onClick={e => handleStartEdit(fav, e)}
                  title={lang === 'el' ? 'Μετονομασία' : 'Rename'}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded"
                >
                  <Edit2 size={11} />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveFavorite(fav.code);
                  }}
                  title={lang === 'el' ? 'Αφαίρεση' : 'Remove'}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Quick Add Stop Pill */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-xs font-medium flex-shrink-0 active:scale-95 transition-all bg-slate-950/40"
        >
          <Plus size={13} />
          <span>{lang === 'el' ? 'Όλες οι Στάσεις' : 'All Stops'}</span>
        </button>
      </div>
    </div>
  );
};
