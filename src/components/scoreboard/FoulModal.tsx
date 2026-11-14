'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface FoulModalProps {
  isOpen: boolean;
  onClose: () => void;
  fouledPlayerName: string;
  opponentPlayerName: string;
  onConfirmFoul: (points: number, awardFreeBall: boolean, passBack: boolean) => void;
}

export const FoulModal: React.FC<FoulModalProps> = ({
  isOpen,
  onClose,
  fouledPlayerName,
  opponentPlayerName,
  onConfirmFoul,
}) => {
  const [selectedPoints, setSelectedPoints] = useState<number>(4);
  const [isFreeBall, setIsFreeBall] = useState<boolean>(false);
  const [passBack, setPassBack] = useState<boolean>(false);

  if (!isOpen) return null;

  const foulOptions = [
    { points: 4, label: 'Standard / Red / Yellow / Green / Brown', color: 'bg-emerald-700' },
    { points: 5, label: 'Blue Ball Involved', color: 'bg-blue-600' },
    { points: 6, label: 'Pink Ball Involved', color: 'bg-pink-600' },
    { points: 7, label: 'Black Ball Involved', color: 'bg-slate-900 border border-slate-700' },
  ];

  const handleApply = () => {
    onConfirmFoul(selectedPoints, isFreeBall, passBack);
    // Reset state
    setSelectedPoints(4);
    setIsFreeBall(false);
    setPassBack(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1712] border border-red-500/30 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Record Foul & Penalty</h3>
              <p className="text-xs text-red-400/90 font-medium">
                Foul committed by {fouledPlayerName}
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
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-semibold text-gray-400">
            Penalty Points Awarded to {opponentPlayerName}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {foulOptions.map((opt) => (
              <button
                key={opt.points}
                type="button"
                onClick={() => setSelectedPoints(opt.points)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  selectedPoints === opt.points
                    ? 'border-red-500 bg-red-950/50 shadow-md shadow-red-950/50 text-white'
                    : 'border-gray-800 bg-gray-900/60 hover:bg-gray-800/80 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-3.5 h-3.5 rounded-full ${opt.color}`} />
                  <span className="text-2xl font-black">{opt.points}</span>
                  <span className="text-xs text-gray-400">pts</span>
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Options */}
        <div className="space-y-2.5 pt-2 border-t border-gray-800">
          {/* Free Ball Option */}
          <label className="flex items-start space-x-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
            <input
              type="checkbox"
              checked={isFreeBall}
              onChange={(e) => setIsFreeBall(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-gray-800"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-white block">Award Free Ball</span>
              <span className="text-xs text-gray-400 leading-tight block">
                {opponentPlayerName} is snookered on all balls on. Any color can be nominated as the ball on.
              </span>
            </div>
          </label>

          {/* Pass shot back option */}
          <label className="flex items-start space-x-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
            <input
              type="checkbox"
              checked={passBack}
              onChange={(e) => setPassBack(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-gray-800"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-white block">Pass Turn Back</span>
              <span className="text-xs text-gray-400 leading-tight block">
                {opponentPlayerName} elects to make {fouledPlayerName} shoot again from current position.
              </span>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
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
