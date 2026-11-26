'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Flame, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { Player } from '@/types/snooker';

interface WinModalProps {
  isOpen: boolean;
  players: Player[];
  playerScores: number[];
  playerFrames: number[];
  frameWinner: Player | null;
  frameNumber: number;
  bestOf: number;
  highestBreak: number;
  highestBreakPlayer: Player | null;
  isMatchWon: boolean;
  matchWinner: Player | null;
  onNextFrame: () => void | Promise<void>;
  onFinishMatch: () => void | Promise<void>;
  onUndo?: () => void;

  // Backwards compatibility props:
  p1?: Player;
  p2?: Player;
  p1Score?: number;
  p2Score?: number;
  p1Frames?: number;
  p2Frames?: number;
}

export const WinModal: React.FC<WinModalProps> = ({
  isOpen,
  players,
  playerScores,
  playerFrames,
  frameWinner,
  frameNumber,
  bestOf,
  highestBreak,
  highestBreakPlayer,
  isMatchWon,
  matchWinner,
  onNextFrame,
  onFinishMatch,
  onUndo,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (action: () => void | Promise<void>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await action();
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Fire celebration confetti
      const count = isMatchWon ? 180 : 80;
      const defaults = { origin: { y: 0.6 } };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }
  }, [isOpen, isMatchWon]);

  if (!isOpen || !frameWinner) return null;

  const framesToWin = Math.ceil(bestOf / 2);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div 
        className="w-full max-w-lg bg-[#f2f2f7] dark:bg-[#1c1c1e] text-zinc-900 dark:text-[#f5f5f7] rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto pb-safe animate-slide-up text-center"
      >
        
        {/* Apple 36x5px Grabber Pill */}
        <div className="w-9 h-[5px] rounded-full bg-black/20 dark:bg-white/20 mx-auto flex-shrink-0" />

        {/* Apple Navigation Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleAction(isMatchWon ? onFinishMatch : onNextFrame)}
            className="text-[17px] text-[#007aff] dark:text-[#0a84ff] font-normal hover:opacity-70 disabled:opacity-40 transition cursor-pointer select-none"
          >
            Close
          </button>
          
          <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white truncate">
            {isMatchWon ? 'Match Concluded' : `Frame ${frameNumber} Concluded`}
          </h3>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleAction(isMatchWon ? onFinishMatch : onNextFrame)}
            className="text-[17px] text-[#007aff] dark:text-[#0a84ff] font-semibold hover:opacity-70 disabled:opacity-40 transition cursor-pointer select-none"
          >
            {isMatchWon ? 'Done' : 'Next'}
          </button>
        </div>

        {/* Celebration Trophy Presentation with Liquid Glass Shine */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-[2px] shadow-xl shadow-amber-500/20 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-white dark:bg-[#2c2c2e] flex items-center justify-center">
            {isMatchWon ? (
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
            ) : (
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            {isMatchWon 
              ? `${matchWinner?.name || frameWinner.name} Wins Match!`
              : `${frameWinner.name} Wins Frame!`
            }
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {isMatchWon
              ? `Target achieved in Best of ${bestOf}`
              : `Best of ${bestOf} (${framesToWin} to win match)`
            }
          </p>
        </div>

        {/* Stats Recap - Apple Inset Grouped Card */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.06] dark:divide-white/[0.08] text-left">
          
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Frame Scores & Series Standing
          </div>

          {players.map((p, idx) => {
            const score = playerScores[idx] ?? 0;
            const framesWon = playerFrames[idx] ?? 0;
            const isWinner = p.id === frameWinner.id;

            return (
              <div
                key={p.id}
                className="px-3.5 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xs font-mono font-bold text-zinc-400">#{idx + 1}</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {p.name}
                  </span>
                  {isWinner && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                      WINNER
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 font-mono text-xs flex-shrink-0">
                  <span className="font-extrabold text-sm text-zinc-900 dark:text-white tabular-nums">
                    {score} pts
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    ({framesWon} {framesWon === 1 ? 'frame' : 'frames'})
                  </span>
                </div>
              </div>
            );
          })}

          {/* Highest Break Recap Row */}
          {highestBreak > 0 && highestBreakPlayer && (
            <div className="px-3.5 py-2.5 flex items-center justify-center space-x-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
              <span>Highest Break: <strong className="font-mono">{highestBreak}</strong> by {highestBreakPlayer.name}</span>
            </div>
          )}
        </div>

        {/* Prominent Capsule Buttons: "Start Next Frame" / "View Match Summary" */}
        <div className="pt-2 space-y-2">
          {isMatchWon ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleAction(onFinishMatch)}
              className="w-full py-3.5 px-6 rounded-full bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold text-sm sm:text-base shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Saving Match…' : 'View Match Summary'}</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleAction(onFinishMatch)}
                className="flex-1 py-3 px-5 rounded-full bg-black/[0.06] hover:bg-black/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-zinc-800 dark:text-white font-semibold text-xs sm:text-sm transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                View Match Summary
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleAction(onNextFrame)}
                className="flex-1 py-3 px-5 rounded-full bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <span>{submitting ? 'Saving Frame…' : 'Start Next Frame'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Optional Undo Action */}
          {onUndo && (
            <button
              type="button"
              disabled={submitting}
              onClick={onUndo}
              className="w-full py-2 px-4 rounded-full text-xs text-[#007aff] dark:text-[#0a84ff] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition flex items-center justify-center space-x-1.5 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Last Shot / Resume Frame</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};