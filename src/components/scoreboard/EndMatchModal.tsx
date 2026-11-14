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
  ArrowRight
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b140f] border border-emerald-700/50 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-white space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                End Match In Between
              </h2>
              <p className="text-[11px] text-gray-400">
                Frame {currentFrameNum} in progress • Choose how to conclude
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Standing Summary */}
        <div className="bg-[#080d0a] border border-emerald-900/40 rounded-2xl p-3 flex items-center justify-between text-xs">
          <span className="text-gray-400 font-medium">Current Standings:</span>
          <div className="flex items-center space-x-3 font-mono font-bold">
            {players.map((p, idx) => (
              <div key={p.id} className="flex items-center space-x-1">
                <span className="text-gray-300">{p.name}:</span>
                <span className="text-emerald-400">{playerFrames[idx] || 0}F</span>
                <span className="text-gray-500">({playerScores[idx] || 0}pts)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-3 pt-1">
          
          {/* OPTION 1: Finish & Save with Leader */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-[#0e2116] border border-emerald-600/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-bold text-white">
                  Finish & Crown Leader ({suggestedWinner?.name})
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              Concludes the match now and awards victory to <strong className="text-emerald-300">{suggestedWinner?.name}</strong> based on current frame and point lead. Result is saved to match history and leaderboard.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinishLeader}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Concluding...' : `Crown ${suggestedWinner?.name} & Finish Match`}</span>
            </button>
          </div>

          {/* OPTION 2: Concede Entire Match */}
          <div className="p-3.5 rounded-2xl bg-[#0e1712] border border-emerald-900/60 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Flag className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-bold text-white">
                Player Concedes Match
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-snug">
              If a player has to forfeit or leave, award the match win to their opponent(s).
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Conceding Player:</span>
              <select
                value={selectedConceder}
                onChange={(e) => setSelectedConceder(Number(e.target.value))}
                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 flex-1 font-semibold"
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
              className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs transition flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : `Confirm ${players[selectedConceder]?.name} Concedes Match`}</span>
            </button>
          </div>

          {/* OPTION 3: Abandon Match */}
          <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-2">
            <div className="flex items-center space-x-2 text-red-400">
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-bold">
                Abandon Match (Discard)
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-snug">
              Discard this match without recording frame wins, losses, or breaks to the leaderboard.
            </p>

            {confirmAbandon ? (
              <div className="pt-1 flex items-center space-x-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAbandon}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Discarding...' : 'Yes, Discard Match'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAbandon(false)}
                  className="py-2 px-3 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAbandon(true)}
                className="w-full py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/40 text-red-300 font-bold text-xs transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>Abandon This Match</span>
              </button>
            )}
          </div>

        </div>

        {/* Footer / Resume playing button */}
        <div className="pt-2 border-t border-emerald-950/60">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-bold transition flex items-center justify-center space-x-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Resume Playing Match</span>
          </button>
        </div>

      </div>
    </div>
  );
};
