'use client';

import React from 'react';
import { PlayerDiscipline, getPlayerColor } from './analytics';
import { ShieldAlert } from 'lucide-react';

interface DisciplineCardProps {
  discipline: PlayerDiscipline[];
}

export const DisciplineCard: React.FC<DisciplineCardProps> = ({ discipline }) => {
  const totalFoulsInFrame = discipline.reduce((acc, d) => acc + d.foulsCommitted, 0);

  return (
    <div className="bg-[#0a140f] border border-emerald-950/80 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Discipline & Foul Concessions
          </h3>
        </div>
        <span className="text-[11px] text-gray-400 font-mono">
          Total fouls: <span className="text-red-400 font-bold">{totalFoulsInFrame}</span>
        </span>
      </div>

      {/* Grid per player */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {discipline.map((d) => {
          const accentColor = getPlayerColor(d.playerIndex);

          return (
            <div
              key={d.playerIndex}
              className="bg-[#060e0a] border border-emerald-900/40 rounded-xl p-3.5 space-y-2.5"
            >
              {/* Player Name & Conceded Total */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-xs font-bold text-white">
                    {d.playerName}
                  </span>
                </div>

                <span className="text-xs font-mono font-black text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/40">
                  -{d.penaltyPointsConceded} pts
                </span>
              </div>

              {/* Stats */}
              <div className="text-[11px] text-gray-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Fouls Committed:</span>
                  <span className="font-bold text-white">{d.foulsCommitted}</span>
                </div>
                {d.freeBallsConceded > 0 && (
                  <div className="flex justify-between text-purple-300">
                    <span>Free Balls Conceded:</span>
                    <span className="font-bold">{d.freeBallsConceded}</span>
                  </div>
                )}
              </div>

              {/* Penalty Value Chips */}
              {d.foulsCommitted > 0 && (
                <div className="pt-2 border-t border-emerald-950/60 flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-gray-500">Values:</span>
                  {[4, 5, 6, 7].map((val) => {
                    const count = d.foulsByValue[val] || 0;
                    if (count === 0) return null;
                    return (
                      <span
                        key={val}
                        className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-300 font-bold"
                      >
                        {val}p x{count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
