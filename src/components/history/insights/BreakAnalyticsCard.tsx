'use client';

import React from 'react';
import { BreakRun, PlayerVisitStats, getPlayerColor } from './analytics';
import { BALL_CONFIGS } from '@/types/snooker';
import { Flame } from 'lucide-react';

interface BreakAnalyticsCardProps {
  breaks: BreakRun[];
  visitStats: PlayerVisitStats[];
}

export const BreakAnalyticsCard: React.FC<BreakAnalyticsCardProps> = ({
  breaks,
  visitStats,
}) => {
  return (
    <div className="bg-[#0a140f] border border-emerald-950/80 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
        <h3 className="text-sm font-bold text-white tracking-wide">
          Breaks & Visit Efficiency
        </h3>
      </div>

      {/* High-Level Visit Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {visitStats.map((stat) => (
          <div
            key={stat.playerIndex}
            className="bg-[#060e0a] border border-emerald-900/40 rounded-xl p-3 space-y-1"
          >
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getPlayerColor(stat.playerIndex) }}
              />
              <span className="text-xs font-bold text-gray-300 truncate">
                {stat.playerName}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 pt-1">
              <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                {stat.highestBreak}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">High Break</span>
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1 border-t border-emerald-950/60 font-mono">
              <span>Avg/Visit:</span>
              <span className="text-emerald-400 font-bold">{stat.averagePointsPerVisit} pts</span>
            </div>
            <div className="text-[10px] text-gray-500 flex items-center justify-between font-mono">
              <span>Visits:</span>
              <span>{stat.scoringVisits}/{stat.totalVisits} scoring</span>
            </div>
          </div>
        ))}
      </div>

      {/* Break Runs List */}
      <div className="space-y-2 pt-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
          <span>Notable Break Sequences</span>
          <span className="text-[10px] text-gray-500 font-normal">
            {breaks.length} {breaks.length === 1 ? 'break recorded' : 'breaks recorded'}
          </span>
        </div>

        {breaks.length === 0 ? (
          <div className="text-center py-6 bg-[#060d09] rounded-xl border border-emerald-950/40 text-xs text-gray-500 italic">
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
                      ? 'bg-gradient-to-r from-amber-950/40 via-[#0d1c14] to-[#09150f] border-amber-600/40'
                      : 'bg-[#060e0a] border-emerald-950/60'
                  }`}
                >
                  {/* Left: Player & Break Value */}
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                        isMajor
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-950'
                          : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/50'
                      }`}
                    >
                      {b.totalPoints}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-white block">
                        {b.playerName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
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
                          className="w-4 h-4 rounded-full border shadow-sm flex items-center justify-center text-[8px] font-black flex-shrink-0"
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
