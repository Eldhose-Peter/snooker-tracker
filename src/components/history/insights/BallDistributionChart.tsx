'use client';

import React from 'react';
import { PlayerScoringSource, getPlayerColor } from './analytics';
import { BallType, BALL_CONFIGS } from '@/types/snooker';
import { PieChart, ShieldCheck, Target } from 'lucide-react';

interface BallDistributionChartProps {
  scoringSources: PlayerScoringSource[];
}

const BALL_ORDER: BallType[] = ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];

export const BallDistributionChart: React.FC<BallDistributionChartProps> = ({
  scoringSources,
}) => {
  return (
    <div className="bg-[#0a140f] border border-emerald-950/80 rounded-2xl p-4 sm:p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <PieChart className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-white tracking-wide">
          Ball Potting & Points Source Breakdown
        </h3>
      </div>

      {/* Grid of Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scoringSources.map((source) => {
          const accentColor = getPlayerColor(source.playerIndex);

          return (
            <div
              key={source.playerIndex}
              className="bg-[#060e0a] border border-emerald-900/40 rounded-xl p-4 space-y-3.5"
            >
              {/* Player Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <h4 className="text-sm font-bold text-white">
                    {source.playerName}
                  </h4>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-gray-400">Total:</span>
                  <span className="font-black text-white text-sm">
                    {source.totalPoints} pts
                  </span>
                </div>
              </div>

              {/* Sourced Points Comparison (Pots vs Opponent Fouls) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Pots: {source.pointsFromPots} pts ({source.potPercentage}%)
                  </span>
                  <span className="text-red-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Fouls Gained: {source.pointsFromFouls} pts ({source.foulPercentage}%)
                  </span>
                </div>

                {/* Segmented Bar */}
                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.max(source.potPercentage > 0 ? 4 : 0, source.potPercentage)}%` }}
                    title={`Points from Pots: ${source.pointsFromPots}`}
                  />
                  <div
                    className="h-full bg-red-500/80 transition-all duration-500"
                    style={{ width: `${Math.max(source.foulPercentage > 0 ? 4 : 0, source.foulPercentage)}%` }}
                    title={`Points from Fouls: ${source.pointsFromFouls}`}
                  />
                </div>
              </div>

              {/* Potted Balls Matrix */}
              <div className="pt-1 border-t border-emerald-950/60">
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                  <span>Potted Balls</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    {source.totalBallsPotted} balls sunk
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {BALL_ORDER.map((ball) => {
                    const cfg = BALL_CONFIGS[ball];
                    const count = source.ballCounts[ball] || 0;

                    return (
                      <div
                        key={ball}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                          count > 0
                            ? 'bg-[#091510] border-emerald-800/40 text-white'
                            : 'bg-gray-950/40 border-gray-900/60 text-gray-600 opacity-60'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border shadow-sm flex items-center justify-center text-[9px] font-black"
                          style={{
                            backgroundColor: cfg.colorHex,
                            borderColor: cfg.borderHex,
                            color: cfg.textColor,
                          }}
                        >
                          {cfg.points}
                        </div>
                        <span className="text-xs font-mono font-bold mt-1">
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
