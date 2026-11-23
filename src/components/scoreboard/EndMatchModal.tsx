'use client';

import React, { useState } from 'react';
import { Player } from '@/types/snooker';
import { 
  X, 
  Flag, 
  Award, 
  AlertOctagon, 
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
    // Frames are tied, look at current frame score
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-white space-y-4 max-h-[92vh] overflow-y-auto border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                End Match In Between
              </h2>
              <p className="text-[11px] text-zinc-400">
                Frame {currentFrameNum} in progress • Choose how to conclude
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Standing Summary */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium">Current Standings:</span>
          <div className="flex items-center space-x-3 font-mono font-bold">
            {players.map((p, idx) => (
              <div key={p.id} className="flex items-center space-x-1">
                <span className="text-zinc-300">{p.name}:</span>
                <span className="text-emerald-400 tabular-nums">{playerFrames[idx] || 0}F</span>
                <span className="text-zinc-500 tabular-nums">({playerScores[idx] || 0}pts)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-3 pt-1">
          
          {/* OPTION 1: Finish & Save with Leader */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-bold text-white">
                  Finish & Crown Leader ({suggestedWinner?.name})
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              Concludes the match now and awards victory to <strong className="text-emerald-300">{suggestedWinner?.name}</strong> based on current frame and point lead. Result is saved to match history and leaderboard.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinishLeader}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Concluding…' : `Crown ${suggestedWinner?.name} & Finish Match`}</span>
            </button>
          </div>

          {/* OPTION 2: Concede Entire Match */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center space-x-2">
              <Flag className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-bold text-white">
                Player Concedes Match
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              If a player has to forfeit or leave, award the match win to their opponent(s).
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-zinc-400 font-medium">Conceding Player:</span>
              <select
                value={selectedConceder}
                onChange={(e) => setSelectedConceder(Number(e.target.value))}
                className="bg-black/50 border border-white/10 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 flex-1 font-semibold"
              >
                {players.map((p, idx) => (
                  <option key={p.id} value={idx}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConcede}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving…' : `Confirm ${players[selectedConceder]?.name} Concedes Match`}</span>
            </button>
          </div>

          {/* OPTION 3: Abandon Match */}
          <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/30 space-y-2">
            <div className="flex items-center space-x-2 text-rose-400">
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-bold">
                Abandon Match (Discard)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Discard this match without recording frame wins, losses, or breaks to the leaderboard.
            </p>

            {confirmAbandon ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-rose-300 font-bold">
                  Are you absolutely sure? This will wipe the in-progress session.
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAbandon(false)}
                    className="flex-1 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleAbandon}
                    className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-950/60 disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {submitting ? 'Discarding…' : 'Yes, Discard Match'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAbandon(true)}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 font-bold text-xs transition cursor-pointer active:scale-95"
              >
                Discard & Abandon Match
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
