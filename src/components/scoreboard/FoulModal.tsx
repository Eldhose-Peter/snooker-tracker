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
    { points: 4, label: 'Red / Yellow / Green / Brown / General', color: 'bg-emerald-700' },
    { points: 5, label: 'Blue Ball Involved', color: 'bg-blue-600' },
    { points: 6, label: 'Pink Ball Involved', color: 'bg-pink-600' },
    { points: 7, label: 'Black Ball Involved', color: 'bg-slate-900 border border-slate-700' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1712] border border-red-500/40 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Record Foul Penalty</h3>
              <p className="text-xs text-red-400 font-semibold">
                Foul committed by {fouledPlayer.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Penalty Points Selector */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider font-semibold text-gray-400">
            Penalty Points
          </label>
          <div className="grid grid-cols-2 gap-2">
            {foulOptions.map((opt) => (
              <button
                key={opt.points}
                type="button"
                onClick={() => setSelectedPoints(opt.points)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  selectedPoints === opt.points
                    ? 'border-red-500 bg-red-950/60 shadow-md shadow-red-950/50 text-white'
                    : 'border-gray-800 bg-gray-900/60 hover:bg-gray-800/80 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`w-3.5 h-3.5 rounded-full ${opt.color}`} />
                  <span className="text-xl font-black">{opt.points}</span>
                  <span className="text-xs text-gray-400">pts</span>
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Recipient (Multiplayer) */}
        {isMultiplayer && (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs uppercase tracking-wider font-semibold text-emerald-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Award Penalty Points To
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              <button
                type="button"
                onClick={() => setTargetRecipient('all_opponents')}
                className={`p-2 rounded-xl border text-xs text-left transition ${
                  targetRecipient === 'all_opponents'
                    ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300 font-bold'
                    : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700'
                }`}
              >
                <span className="block font-bold">All Other Players</span>
                <span className="text-[10px] text-gray-500 block">+{selectedPoints} pts to each</span>
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
                    className={`p-2 rounded-xl border text-xs text-left transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300 font-bold'
                        : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span className="block font-bold truncate">
                      {p.name} {isNext ? '(Next Turn)' : ''}
                    </span>
                    <span className="text-[10px] text-gray-500 block">+{selectedPoints} pts only</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Options */}
        <div className="space-y-2 pt-1 border-t border-gray-800/80">
          {/* Red pocketed during foul option */}
          {redsRemaining > 0 && (
            <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-white block">Reds Pocketed on Foul</span>
                  <span className="text-[11px] text-gray-400 leading-tight block">
                    In snooker, reds pocketed on fouls are not respotted.
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      disabled={cnt > redsRemaining}
                      onClick={() => setRedsPocketed(cnt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        redsPocketed === cnt
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
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
          <label className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
            <input
              type="checkbox"
              checked={isFreeBall}
              onChange={(e) => setIsFreeBall(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-gray-800"
            />
            <div className="flex-1">
              <span className="text-xs sm:text-sm font-semibold text-white block">Award Free Ball</span>
              <span className="text-[11px] text-gray-400 leading-tight block">
                Incoming player is snookered on all balls on. Any color can be nominated as ball on.
              </span>
            </div>
          </label>

          {/* Pass shot back option */}
          <label className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
            <input
              type="checkbox"
              checked={passBack}
              onChange={(e) => setPassBack(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-gray-800"
            />
            <div className="flex-1">
              <span className="text-xs sm:text-sm font-semibold text-white block">Pass Turn Back</span>
              <span className="text-[11px] text-gray-400 leading-tight block">
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
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/40 transition flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Foul (+{selectedPoints})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
