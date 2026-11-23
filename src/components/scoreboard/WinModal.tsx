'use client';

import React, { useEffect } from 'react';
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
  onNextFrame: () => void;
  onFinishMatch: () => void;
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

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }, [isOpen, isMatchWon]);

  if (!isOpen || !frameWinner) return null;

  const framesToWin = Math.ceil(bestOf / 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-center space-y-4 border-white/10">
        
        {/* Crown / Trophy icon */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-1 shadow-2xl shadow-amber-500/20 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-[#070908] flex items-center justify-center">
            {isMatchWon ? (
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            ) : (
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            {isMatchWon ? 'Match Concluded!' : `Frame ${frameNumber} Concluded`}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isMatchWon 
              ? `${matchWinner?.name || frameWinner.name} Wins Match!`
              : `${frameWinner.name} Wins Frame!`
            }
          </h2>
          <p className="text-xs text-zinc-400">
            {isMatchWon
              ? `Reached target frames (Best of ${bestOf})`
              : `Best of ${bestOf} (${framesToWin} to win match)`
            }
          </p>
        </div>

        {/* Frame Score Breakdown */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 block">
            Frame Scores & Series Standing
          </span>

          <div className="space-y-2">
            {players.map((p, idx) => {
              const score = playerScores[idx] ?? 0;
              const framesWon = playerFrames[idx] ?? 0;
              const isWinner = p.id === frameWinner.id;

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isWinner
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-white font-bold'
                      : 'bg-black/30 border-white/[0.06] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                    <span className="text-sm font-bold">{p.name}</span>
                    {isWinner && (
                      <span className="text-[10px] bg-emerald-500 text-black font-black px-1.5 py-0.2 rounded">
                        WINNER
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 font-mono">
                    <span className="text-sm font-black text-emerald-300 tabular-nums">{score} pts</span>
                    <span className="text-xs text-zinc-400">({framesWon} {framesWon === 1 ? 'frame' : 'frames'})</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Highest Break */}
          {highestBreak > 0 && highestBreakPlayer && (
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-center space-x-1.5 text-xs text-amber-300">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Highest Break: <strong>{highestBreak}</strong> by {highestBreakPlayer.name}</span>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="pt-1 space-y-2">
          {isMatchWon ? (
            <button
              type="button"
              onClick={onFinishMatch}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Match & Record Result</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onFinishMatch}
                className="py-3 px-4 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] text-zinc-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                Conclude Early
              </button>
              <button
                type="button"
                onClick={onNextFrame}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 flex items-center justify-center space-x-1 transition active:scale-95 cursor-pointer"
              >
                <span>Next Frame {frameNumber + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="w-full py-2.5 px-4 rounded-xl border border-sky-500/30 bg-sky-950/40 hover:bg-sky-900/60 text-sky-200 text-xs font-bold transition flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
              title="Undo the last action and resume this frame"
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
