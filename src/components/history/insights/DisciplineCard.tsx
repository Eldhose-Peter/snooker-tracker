'use client';

import React from 'react';
import { PlayerDiscipline } from './analytics';
import { ShieldAlert } from 'lucide-react';

interface DisciplineCardProps {
  discipline: PlayerDiscipline[];
}

const APPLE_PLAYER_COLORS = [
  '#0091ff', // System Blue
  '#30d158', // System Green
  '#ff9230', // System Orange
  '#db34f2', // System Purple
  '#ff375f', // System Pink
  '#00d2e0', // System Teal
];

const getApplePlayerColor = (index: number) => {
  return APPLE_PLAYER_COLORS[index % APPLE_PLAYER_COLORS.length];
};

export const DisciplineCard: React.FC<DisciplineCardProps> = ({ discipline }) => {
  const totalFoulsInFrame = discipline.reduce((acc, d) => acc + d.foulsCommitted, 0);

  return (
    <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 dark:bg-red-500/15 border border-red-500/25 flex items-center justify-center text-[#ff4245]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
              Discipline & Foul Concessions
            </h3>
            <span className="text-[10px] text-zinc-400 block -mt-0.5">
              Tracking fouls, penalties gifted to opponents, and free balls
            </span>
          </div>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          Total fouls: <span className="text-[#ff4245] font-bold tabular-nums">{totalFoulsInFrame}</span>
        </span>
      </div>

      {/* Grid per player */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {discipline.map((d) => {
          const accentColor = getApplePlayerColor(d.playerIndex);

          return (
            <div
              key={d.playerIndex}
              className="bg-black/[0.02] dark:bg-black/30 border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-3.5 space-y-2.5"
            >
              {/* Player Name & Conceded Total */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {d.playerName}
                  </span>
                </div>

                <span className="text-xs font-mono font-bold text-[#ff4245] bg-red-500/10 dark:bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/20 tabular-nums">
                  -{d.penaltyPointsConceded} pts
                </span>
              </div>

              {/* Stats */}
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1 font-mono tabular-nums">
                <div className="flex justify-between">
                  <span>Fouls Committed:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{d.foulsCommitted}</span>
                </div>
                {d.freeBallsConceded > 0 && (
                  <div className="flex justify-between text-purple-600 dark:text-[#db34f2]">
                    <span>Free Balls Given:</span>
                    <span className="font-bold">{d.freeBallsConceded}</span>
                  </div>
                )}
              </div>

              {/* Penalty Value Chips */}
              {d.foulsCommitted > 0 && (
                <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-zinc-400">Values:</span>
                  {[4, 5, 6, 7].map((val) => {
                    const count = d.foulsByValue[val] || 0;
                    if (count === 0) return null;
                    return (
                      <span
                        key={val}
                        className="px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 font-semibold"
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
