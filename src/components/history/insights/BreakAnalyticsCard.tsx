'use client';

import React from 'react';
import { BreakRun, PlayerVisitStats } from './analytics';
import { BALL_CONFIGS } from '@/types/snooker';
import { Flame } from 'lucide-react';

interface BreakAnalyticsCardProps {
  breaks: BreakRun[];
  visitStats: PlayerVisitStats[];
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

export const BreakAnalyticsCard: React.FC<BreakAnalyticsCardProps> = ({
  breaks,
  visitStats,
}) => {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-500">
          <Flame className="w-4 h-4 fill-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
            Breaks & Visit Efficiency
          </h3>
          <span className="text-[10px] text-zinc-400 block -mt-0.5">
            Visit conversion rates, average runs, and continuous sequences
          </span>
        </div>
      </div>

      {/* High-Level Visit Metrics Grid (Apple Fitness Tile Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {visitStats.map((stat) => (
          <div
            key={stat.playerIndex}
            className="bg-black/[0.02] dark:bg-black/30 border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-3 space-y-1.5"
          >
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getApplePlayerColor(stat.playerIndex) }}
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                {stat.playerName}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 pt-0.5">
              <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {stat.highestBreak}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">High Break</span>
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.04] font-mono tabular-nums">
              <span>Avg/Visit:</span>
              <span className="text-emerald-700 dark:text-[#30d158] font-bold">{stat.averagePointsPerVisit} pts</span>
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center justify-between font-mono tabular-nums">
              <span>Visits:</span>
              <span>{stat.scoringVisits}/{stat.totalVisits} scoring</span>
            </div>
          </div>
        ))}
      </div>

      {/* Break Runs List */}
      <div className="space-y-2 pt-2">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between px-1">
          <span>Notable Break Sequences</span>
          <span className="text-[11px] text-zinc-400 font-normal">
            {breaks.length} {breaks.length === 1 ? 'break recorded' : 'breaks recorded'}
          </span>
        </div>

        {breaks.length === 0 ? (
          <div className="text-center py-6 bg-black/[0.02] dark:bg-black/30 rounded-xl border border-black/[0.04] dark:border-white/[0.04] text-xs text-zinc-500 italic">
            No continuous breaks of 10+ points in this frame.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {breaks.map((b) => {
              const isMajor = b.totalPoints >= 20;

              return (
                <div
                  key={b.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border transition-all gap-2 ${
                    isMajor
                      ? 'bg-amber-400/10 border-amber-400/30'
                      : 'bg-black/[0.02] dark:bg-black/30 border-black/[0.06] dark:border-white/[0.06]'
                  }`}
                >
                  {/* Left: Player & Break Value */}
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        isMajor
                          ? 'bg-amber-500 text-black shadow-xs'
                          : 'bg-black/[0.06] dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-black/[0.06] dark:border-white/[0.08]'
                      }`}
                    >
                      {b.totalPoints}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        {b.playerName}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                        {b.balls.length} balls potted
                      </span>
                    </div>
                  </div>

                  {/* Right: Ball Sequence Chips */}
                  <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-0.5">
                    {b.balls.map((ball, bIdx) => {
                      const cfg = BALL_CONFIGS[ball];
                      return (
                        <span
                          key={`${b.id}-${bIdx}`}
                          className="w-4 h-4 rounded-full border shadow-2xs flex items-center justify-center text-[8px] font-black flex-shrink-0"
                          style={{
                            backgroundColor: cfg.colorHex,
                            borderColor: cfg.borderHex,
                            color: cfg.textColor,
                          }}
                          title={`${cfg.name} (+${cfg.points})`}
                        >
                          {cfg.points}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
