'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, X, Users } from 'lucide-react';
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
    { points: 4, label: 'Red / Colors 2-4 / General', color: 'bg-emerald-500' },
    { points: 5, label: 'Blue Ball Involved', color: 'bg-blue-500' },
    { points: 6, label: 'Pink Ball Involved', color: 'bg-pink-500' },
    { points: 7, label: 'Black Ball Involved', color: 'bg-zinc-800 border border-white/20' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 bg-white dark:bg-[#0c140f] border border-black/[0.08] dark:border-white/10 text-zinc-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">Record Foul Penalty</h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Foul committed by {fouledPlayer.name}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Penalty Points Selector */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-400">
            Penalty Points
          </label>
          <div className="grid grid-cols-2 gap-2">
            {foulOptions.map((opt) => (
              <button
                key={opt.points}
                type="button"
                onClick={() => setSelectedPoints(opt.points)}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                  selectedPoints === opt.points
                    ? 'border-rose-500/60 bg-rose-50 dark:bg-rose-950/50 shadow-md text-zinc-900 dark:text-white ring-1 ring-rose-500/30'
                    : 'border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`w-3.5 h-3.5 rounded-full ${opt.color} shadow-sm`} />
                  <span className="text-xl font-black font-mono">{opt.points}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">pts</span>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center leading-tight">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Recipient (Multiplayer) */}
        {isMultiplayer && (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Award Penalty Points To
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              <button
                type="button"
                onClick={() => setTargetRecipient('all_opponents')}
                className={`p-2.5 rounded-2xl border text-xs text-left transition cursor-pointer ${
                  targetRecipient === 'all_opponents'
                    ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                    : 'border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-400 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <span className="block font-bold">All Other Players</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-500 block">+{selectedPoints} pts to each</span>
              </button>

              {players.map((p, idx) => {
                if (idx === fouledPlayerIndex) return null;
                const isSelected = targetRecipient === idx;
                const isNext = idx === nextPlayerIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTargetRecipient(idx)}
                    className={`p-2.5 rounded-2xl border text-xs text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                        : 'border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-400 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    <span className="block font-bold truncate">
                      {p.name} {isNext ? '(Next Turn)' : ''}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 block">+{selectedPoints} pts only</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Options */}
        <div className="space-y-2 pt-1 border-t border-black/[0.08] dark:border-white/[0.08]">
          {/* Red pocketed during foul option */}
          {redsRemaining > 0 && (
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white block">Reds Pocketed on Foul</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block">
                    Reds pocketed on fouls are not respotted.
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      disabled={cnt > redsRemaining}
                      onClick={() => setRedsPocketed(cnt)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                        redsPocketed === cnt
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-zinc-200 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      {cnt === 0 ? '0' : `${cnt} Red${cnt > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Free Ball Option */}
          <label className="flex items-start space-x-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition">
            <input
              type="checkbox"
              checked={isFreeBall}
              onChange={(e) => setIsFreeBall(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-white/20 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-black/40"
            />
            <div className="flex-1">
              <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white block">Award Free Ball</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block">
                Incoming player is snookered on all balls on. Any color can be nominated as ball on.
              </span>
            </div>
          </label>

          {/* Pass shot back option */}
          <label className="flex items-start space-x-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition">
            <input
              type="checkbox"
              checked={passBack}
              onChange={(e) => setPassBack(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-white/20 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-black/40"
            />
            <div className="flex-1">
              <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white block">Pass Turn Back</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block">
                Incoming player elects to make {fouledPlayer.name} shoot again from current position.
              </span>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-2xl border border-black/[0.1] dark:border-white/[0.1] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/40 transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Apply Foul (+{selectedPoints})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
