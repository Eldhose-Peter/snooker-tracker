'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, Users } from 'lucide-react';
import { Player } from '@/types/snooker';

interface FoulModalProps {
  isOpen: boolean;
  onClose: () => void;
  fouledPlayerIndex: number;
  players: Player[];
  redsRemaining?: number;
  onConfirmFoul: (
    points: number, 
    target: 'all_opponents' | 'next_player' | number, 
    awardFreeBall: boolean, 
    passBack: boolean,
    redsPocketed?: number
  ) => void;
}

export const FoulModal: React.FC<FoulModalProps> = ({
  isOpen,
  onClose,
  fouledPlayerIndex,
  players,
  redsRemaining = 0,
  onConfirmFoul,
}) => {
  const [selectedPoints, setSelectedPoints] = useState<number>(4);
  const [targetRecipient, setTargetRecipient] = useState<'all_opponents' | 'next_player' | number>('all_opponents');
  const [isFreeBall, setIsFreeBall] = useState<boolean>(false);
  const [passBack, setPassBack] = useState<boolean>(false);
  const [redsPocketed, setRedsPocketed] = useState<number>(0);

  if (!isOpen) return null;

  const fouledPlayer = players[fouledPlayerIndex] || { name: `Player ${fouledPlayerIndex + 1}` };
  const nextPlayerIndex = (fouledPlayerIndex + 1) % players.length;
  const isMultiplayer = players.length > 2;

  const foulOptions = [
    { points: 4, label: 'General / 4 pts', shortLabel: 'General', color: 'bg-emerald-500' },
    { points: 5, label: 'Blue Ball / 5 pts', shortLabel: 'Blue', color: 'bg-blue-500' },
    { points: 6, label: 'Pink Ball / 6 pts', shortLabel: 'Pink', color: 'bg-pink-500' },
    { points: 7, label: 'Black Ball / 7 pts', shortLabel: 'Black', color: 'bg-zinc-900 border border-white/30' },
  ];

  const handleApply = () => {
    onConfirmFoul(selectedPoints, targetRecipient, isFreeBall, passBack, redsPocketed);
    setSelectedPoints(4);
    setTargetRecipient('all_opponents');
    setIsFreeBall(false);
    setPassBack(false);
    setRedsPocketed(0);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#f2f2f7] dark:bg-[#1c1c1e] text-zinc-900 dark:text-[#f5f5f7] rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto pb-safe animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Apple 36x5px Grabber Pill */}
        <div className="w-9 h-[5px] rounded-full bg-black/20 dark:bg-white/20 mx-auto flex-shrink-0" />

        {/* Apple Navigation Header: Cancel leading, Title centered, Apply trailing */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="text-[17px] text-[#007aff] dark:text-[#0a84ff] font-normal hover:opacity-70 transition cursor-pointer select-none"
          >
            Cancel
          </button>
          
          <div className="text-center">
            <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white leading-tight">
              Foul Penalty
            </h3>
            <p className="text-[11px] text-[#ff3b30] dark:text-[#ff453a] font-medium">
              Committed by {fouledPlayer.name}
            </p>
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="text-[17px] text-[#ff3b30] dark:text-[#ff453a] font-semibold hover:opacity-70 transition cursor-pointer select-none"
          >
            Apply
          </button>
        </div>

        {/* Apple Segmented Picker: Penalty Points (4-7) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            Penalty Points
          </label>
          <div className="bg-black/[0.06] dark:bg-white/[0.08] p-1 rounded-2xl grid grid-cols-4 gap-1">
            {foulOptions.map((opt) => {
              const isSelected = selectedPoints === opt.points;
              return (
                <button
                  key={opt.points}
                  type="button"
                  onClick={() => setSelectedPoints(opt.points)}
                  className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 select-none ${
                    isSelected
                      ? 'bg-white dark:bg-[#636366] text-zinc-950 dark:text-white shadow-sm font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.color} shadow-xs flex-shrink-0`} />
                    <span className="font-mono text-base font-extrabold">{opt.points}</span>
                  </div>
                  <span className="text-[10px] opacity-80 leading-tight truncate">
                    {opt.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipient Selection (Multiplayer) - Apple Segmented Picker & Inset Group */}
        {isMultiplayer && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Award Penalty Points To
            </label>

            {/* Quick Segmented Choice */}
            <div className="bg-black/[0.06] dark:bg-white/[0.08] p-1 rounded-2xl grid grid-cols-2 gap-1 mb-2">
              <button
                type="button"
                onClick={() => setTargetRecipient('all_opponents')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center select-none ${
                  targetRecipient === 'all_opponents'
                    ? 'bg-white dark:bg-[#636366] text-zinc-950 dark:text-white shadow-sm font-bold'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                All Opponents (+{selectedPoints} each)
              </button>
              <button
                type="button"
                onClick={() => setTargetRecipient('next_player')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center select-none ${
                  targetRecipient === 'next_player'
                    ? 'bg-white dark:bg-[#636366] text-zinc-950 dark:text-white shadow-sm font-bold'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Next Player (+{selectedPoints})
              </button>
            </div>

            {/* Inset List for Specific Player Nomination */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.06] dark:divide-white/[0.08] max-h-36 overflow-y-auto">
              {players.map((p, idx) => {
                if (idx === fouledPlayerIndex) return null;
                const isSelected = targetRecipient === idx;
                const isNext = idx === nextPlayerIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTargetRecipient(idx)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer"
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white block">
                        {p.name} {isNext && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">(Next Turn)</span>}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Award +{selectedPoints} pts only to {p.name}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#007aff] dark:text-[#0a84ff] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Options - Apple Inset Grouped Card */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            Tactical Adjustments
          </label>

          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            
            {/* Reds Pocketed on Foul (Segmented Control inside row) */}
            {redsRemaining > 0 && (
              <div className="p-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white block">
                    Reds Pocketed
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                    Foul reds are permanently removed
                  </span>
                </div>
                <div className="bg-black/[0.06] dark:bg-white/[0.08] p-0.5 rounded-xl flex items-center gap-0.5">
                  {[0, 1, 2].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      disabled={cnt > redsRemaining}
                      onClick={() => setRedsPocketed(cnt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        redsPocketed === cnt
                          ? 'bg-white dark:bg-[#636366] text-zinc-950 dark:text-white shadow-xs font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Award Free Ball Toggle */}
            <label className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
              <div>
                <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white block">
                  Award Free Ball
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                  Incoming player snookered on all balls on
                </span>
              </div>
              <input
                type="checkbox"
                checked={isFreeBall}
                onChange={(e) => setIsFreeBall(e.target.checked)}
                className="w-5 h-5 rounded-md accent-[#007aff] cursor-pointer"
              />
            </label>

            {/* Pass Turn Back Toggle */}
            <label className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
              <div>
                <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white block">
                  Pass Turn Back
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                  Make {fouledPlayer.name} play again from current position
                </span>
              </div>
              <input
                type="checkbox"
                checked={passBack}
                onChange={(e) => setPassBack(e.target.checked)}
                className="w-5 h-5 rounded-md accent-[#007aff] cursor-pointer"
              />
            </label>

          </div>
        </div>

        {/* Primary Action Button - Apple Prominent Capsule */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-3.5 px-6 rounded-full bg-[#ff3b30] hover:bg-[#d7342a] dark:bg-[#ff453a] dark:hover:bg-[#ff3b30] text-white font-semibold text-sm sm:text-base shadow-lg shadow-rose-950/20 flex items-center justify-center space-x-2 transition active:scale-[0.98] cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Apply Foul (+{selectedPoints} pts)</span>
          </button>
        </div>

      </div>
    </div>
  );
};