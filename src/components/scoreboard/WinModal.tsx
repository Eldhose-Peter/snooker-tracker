'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Player } from '@/types/snooker';

interface WinModalProps {
  isOpen: boolean;
  frameWinner: 1 | 2 | null;
  p1: Player;
  p2: Player;
  p1Score: number;
  p2Score: number;
  p1Frames: number;
  p2Frames: number;
  frameNumber: number;
  bestOf: number;
  highestBreak: number;
  highestBreakPlayer: Player | null;
  isMatchWon: boolean;
  matchWinner: Player | null;
  onNextFrame: () => void;
  onFinishMatch: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  isOpen,
  frameWinner,
  p1,
  p2,
  p1Score,
  p2Score,
  p1Frames,
  p2Frames,
  frameNumber,
  bestOf,
  highestBreak,
  highestBreakPlayer,
  isMatchWon,
  matchWinner,
  onNextFrame,
  onFinishMatch,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Fire celebration confetti
      const count = isMatchWon ? 200 : 80;
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

  const winnerPlayer = frameWinner === 1 ? p1 : p2;
  const framesToWin = Math.ceil(bestOf / 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b140f] border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-6">
        
        {/* Crown / Trophy icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-1 shadow-xl shadow-amber-500/20 flex items-center justify-center animate-bounce">
          <div className="w-full h-full rounded-full bg-[#0d1c14] flex items-center justify-center">
            {isMatchWon ? (
              <Trophy className="w-10 h-10 text-yellow-400" />
            ) : (
              <Award className="w-10 h-10 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
            {isMatchWon ? 'Match Concluded!' : `Frame ${frameNumber} Decided`}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {isMatchWon ? `${matchWinner?.name} Wins the Match!` : `${winnerPlayer.name} Wins Frame ${frameNumber}!`}
          </h2>
          {winnerPlayer.nickname && (
            <p className="text-sm text-yellow-400 font-semibold italic">
              "{winnerPlayer.nickname}"
            </p>
          )}
        </div>

        {/* Frame Score Summary */}
        <div className="bg-[#122319] border border-emerald-800/40 rounded-2xl p-4 space-y-3">
          <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Frame Score
          </div>
          <div className="flex items-center justify-around">
            <div className={`text-center ${frameWinner === 1 ? 'font-bold text-emerald-400' : 'text-gray-400'}`}>
              <div className="text-sm font-semibold truncate max-w-[120px]">{p1.name}</div>
              <div className="text-3xl sm:text-4xl font-black mt-1">{p1Score}</div>
            </div>

            <div className="text-xl font-bold text-gray-500">-</div>

            <div className={`text-center ${frameWinner === 2 ? 'font-bold text-emerald-400' : 'text-gray-400'}`}>
              <div className="text-sm font-semibold truncate max-w-[120px]">{p2.name}</div>
              <div className="text-3xl sm:text-4xl font-black mt-1">{p2Score}</div>
            </div>
          </div>

          {/* Highest Break Badge */}
          {highestBreak > 0 && highestBreakPlayer && (
            <div className="pt-2 border-t border-emerald-900/50 flex items-center justify-center space-x-1.5 text-xs text-amber-300">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Highest Break: <strong>{highestBreak}</strong> by {highestBreakPlayer.name}</span>
            </div>
          )}
        </div>

        {/* Match Progress Score */}
        <div className="flex items-center justify-between px-4 py-2 bg-emerald-950/40 rounded-xl border border-emerald-900/30 text-xs">
          <span className="text-gray-400">Match Series (Best of {bestOf}):</span>
          <span className="font-bold text-emerald-300">
            {p1.name} {p1Frames} - {p2Frames} {p2.name}
          </span>
          <span className="text-gray-400">({framesToWin} to win)</span>
        </div>

        {/* CTA Buttons */}
        <div className="pt-2 space-y-2.5">
          {isMatchWon ? (
            <button
              onClick={onFinishMatch}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-base shadow-lg shadow-emerald-900/50 flex items-center justify-center space-x-2 transition"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Save & Update Leaderboard</span>
            </button>
          ) : (
            <button
              onClick={onNextFrame}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-900/50 flex items-center justify-center space-x-2 transition"
            >
              <span>Rack & Start Frame {frameNumber + 1}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
