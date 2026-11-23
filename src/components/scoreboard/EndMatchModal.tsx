'use client';

import React, { useState } from 'react';
import { Player } from '@/types/snooker';
import { 
  Award, 
  Flag, 
  Trash2, 
  CheckCircle2, 
} from 'lucide-react';

interface EndMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  playerScores: number[];
  playerFrames: number[];
  currentFrameNum: number;
  onFinishWithCurrentLeader: () => Promise<void>;
  onConcedeMatch: (concedingPlayerIndex: number) => Promise<void>;
  onAbandonMatch: () => Promise<void>;
}

export const EndMatchModal: React.FC<EndMatchModalProps> = ({
  isOpen,
  onClose,
  players,
  playerScores,
  playerFrames,
  currentFrameNum,
  onFinishWithCurrentLeader,
  onConcedeMatch,
  onAbandonMatch,
}) => {
  const [selectedConceder, setSelectedConceder] = useState<number>(0);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Find leader by frames won, or by current frame score if frames are tied
  const maxFrames = Math.max(...playerFrames);
  const framesLeaders = playerFrames
    .map((f, i) => (f === maxFrames ? i : -1))
    .filter(i => i !== -1);

  let suggestedWinnerIdx = framesLeaders[0] ?? 0;
  if (framesLeaders.length > 1) {
    const maxScore = Math.max(...playerScores);
    const scoreLeader = playerScores.indexOf(maxScore);
    if (scoreLeader !== -1) {
      suggestedWinnerIdx = scoreLeader;
    }
  }

  const suggestedWinner = players[suggestedWinnerIdx] || players[0];

  const handleFinishLeader = async () => {
    setSubmitting(true);
    await onFinishWithCurrentLeader();
    setSubmitting(false);
  };

  const handleConcede = async () => {
    setSubmitting(true);
    await onConcedeMatch(selectedConceder);
    setSubmitting(false);
  };

  const handleAbandon = async () => {
    setSubmitting(true);
    await onAbandonMatch();
    setSubmitting(false);
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

        {/* Apple Navigation Header: Cancel leading, Title centered */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-[17px] text-[#007aff] dark:text-[#0a84ff] font-normal hover:opacity-70 transition cursor-pointer select-none"
          >
            Cancel
          </button>
          
          <div className="text-center">
            <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white leading-tight">
              End Match
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Frame {currentFrameNum} in progress
            </p>
          </div>

          <div className="w-12" />
        </div>

        {/* Standings Summary - Apple Inset Grouped Card */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-3 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium">Current Standings:</span>
          <div className="flex items-center space-x-3 font-mono font-bold">
            {players.map((p, idx) => (
              <div key={p.id} className="flex items-center space-x-1">
                <span className="text-zinc-700 dark:text-zinc-300">{p.name}:</span>
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{playerFrames[idx] || 0}F</span>
                <span className="text-zinc-400 dark:text-zinc-500 tabular-nums">({playerScores[idx] || 0}pts)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Apple Action Confirmation Options */}
        <div className="space-y-3">
          
          {/* Option 1 (Primary / Recommended): Crown Current Leader */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Crown Leader ({suggestedWinner?.name})
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Award match victory to <strong className="text-zinc-900 dark:text-white">{suggestedWinner?.name}</strong> based on current standing. Result will be saved to match history and leaderboard.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinishLeader}
              className="w-full py-3 px-5 rounded-full bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Concluding…' : `Crown ${suggestedWinner?.name} & Finish Match`}</span>
            </button>
          </div>

          {/* Option 2 (Destructive Option 1): Player Concedes Match */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
            <div className="flex items-center space-x-2 text-zinc-900 dark:text-white">
              <Flag className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-semibold">
                Player Concedes Match
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              A player forfeits, awarding the victory to their opponent(s).
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Conceding:</span>
              <select
                value={selectedConceder}
                onChange={(e) => setSelectedConceder(Number(e.target.value))}
                className="bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none flex-1 font-semibold"
              >
                {players.map((p, idx) => (
                  <option key={p.id} value={idx} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConcede}
              className="w-full py-3 px-5 rounded-full bg-[#ff9500] hover:bg-[#d97f00] text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Flag className="w-4 h-4" />
              <span>{submitting ? 'Saving…' : `End & Concede (${players[selectedConceder]?.name})`}</span>
            </button>
          </div>

          {/* Option 3 (Destructive Option 2): Abandon Match */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-4 border border-rose-500/20 dark:border-rose-500/30 space-y-2.5">
            <div className="flex items-center space-x-2 text-[#ff3b30] dark:text-[#ff453a]">
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-semibold">
                Abandon Match (Discard)
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Discard this match completely without recording frame wins, losses, or breaks to the leaderboard.
            </p>

            {confirmAbandon ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-[#ff3b30] dark:text-[#ff453a] font-semibold">
                  Are you absolutely sure? This cannot be undone.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAbandon(false)}
                    className="flex-1 py-2.5 px-4 rounded-full bg-black/[0.06] hover:bg-black/[0.1] dark:bg-white/[0.08] text-xs font-semibold text-zinc-800 dark:text-white cursor-pointer transition active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleAbandon}
                    className="flex-1 py-2.5 px-4 rounded-full bg-[#ff3b30] hover:bg-[#d7342a] text-white text-xs font-bold transition shadow-md shadow-rose-950/20 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                  >
                    {submitting ? 'Discarding…' : 'Yes, Discard Match'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAbandon(true)}
                className="w-full py-3 px-5 rounded-full bg-[#ff3b30]/15 hover:bg-[#ff3b30]/25 text-[#ff3b30] dark:text-[#ff453a] border border-[#ff3b30]/30 font-semibold text-xs sm:text-sm transition cursor-pointer active:scale-[0.98]"
              >
                Abandon Match
              </button>
            )}
          </div>

        </div>

        {/* Bottom Cancel Capsule Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full py-3 px-5 rounded-full bg-black/[0.06] hover:bg-black/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-zinc-800 dark:text-white font-semibold text-xs sm:text-sm transition active:scale-[0.98] cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};