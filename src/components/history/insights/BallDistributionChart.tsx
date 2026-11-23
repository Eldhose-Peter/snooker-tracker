'use client';

import React from 'react';
import { PlayerScoringSource } from './analytics';
import { BallType, BALL_CONFIGS } from '@/types/snooker';
import { PieChart, ShieldCheck, Target } from 'lucide-react';

interface BallDistributionChartProps {
  scoringSources: PlayerScoringSource[];
}

const BALL_ORDER: BallType[] = ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];

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

export const BallDistributionChart: React.FC<BallDistributionChartProps> = ({
  scoringSources,
}) => {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-5 shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-[#30d158]">
          <PieChart className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
            Ball Potting & Points Distribution
          </h3>
          <span className="text-[10px] text-zinc-400 block -mt-0.5">
            Breakdown of pots, opponent foul points, and balls pocketed
          </span>
        </div>
      </div>

      {/* Grid of Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scoringSources.map((source) => {
          const accentColor = getApplePlayerColor(source.playerIndex);

          return (
            <div
              key={source.playerIndex}
              className="bg-black/[0.02] dark:bg-black/30 border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-4 space-y-3.5"
            >
              {/* Player Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {source.playerName}
                  </h4>
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  <span className="text-zinc-400">Total:</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-sm tabular-nums">
                    {source.totalPoints} pts
                  </span>
                </div>
              </div>

              {/* Sourced Points Comparison (Pots vs Opponent Fouls) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-emerald-700 dark:text-[#30d158] font-semibold flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Pots: {source.pointsFromPots} pts ({source.potPercentage}%)
                  </span>
                  <span className="text-red-600 dark:text-[#ff4245] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Fouls Gained: {source.pointsFromFouls} pts ({source.foulPercentage}%)
                  </span>
                </div>

                {/* Apple Health Style Breakdown Bar with Rounded Ends */}
                <div className="w-full h-3 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden p-0.5 flex gap-0.5">
                  <div
                    className="h-full bg-[#30d158] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(source.potPercentage > 0 ? 5 : 0, source.potPercentage)}%` }}
                    title={`Points from Pots: ${source.pointsFromPots}`}
                  />
                  <div
                    className="h-full bg-[#ff4245] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(source.foulPercentage > 0 ? 5 : 0, source.foulPercentage)}%` }}
                    title={`Points from Fouls: ${source.pointsFromFouls}`}
                  />
                </div>
              </div>

              {/* Potted Balls Matrix */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                  <span>Potted Balls</span>
                  <span className="font-mono text-emerald-700 dark:text-[#30d158] font-bold tabular-nums">
                    {source.totalBallsPotted} balls sunk
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {BALL_ORDER.map((ball) => {
                    const cfg = BALL_CONFIGS[ball];
                    const count = source.ballCounts[ball] || 0;

                    return (
                      <div
                        key={ball}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all ${
                          count > 0
                            ? 'bg-white dark:bg-[#1c1c1e] border-black/[0.08] dark:border-white/[0.1] shadow-2xs'
                            : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] opacity-40'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border shadow-xs flex items-center justify-center text-[9px] font-black"
                          style={{
                            backgroundColor: cfg.colorHex,
                            borderColor: cfg.borderHex,
                            color: cfg.textColor,
                          }}
                        >
                          {cfg.points}
                        </div>
                        <span className="text-xs font-mono font-bold mt-1 text-zinc-800 dark:text-zinc-200 tabular-nums">
                          x{count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
