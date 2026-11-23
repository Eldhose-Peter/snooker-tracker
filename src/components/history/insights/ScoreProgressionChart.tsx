'use client';

import React, { useState, useMemo } from 'react';
import { ScoreTimelinePoint } from './analytics';
import { Player } from '@/types/snooker';
import { TrendingUp } from 'lucide-react';

interface ScoreProgressionChartProps {
  timeline: ScoreTimelinePoint[];
  players: Player[];
  leadChanges: number;
}

// Apple System Tint Colors for players
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

export const ScoreProgressionChart: React.FC<ScoreProgressionChartProps> = ({
  timeline,
  players,
  leadChanges,
}) => {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Chart dimensions
  const width = 800;
  const height = 280;
  const padding = useMemo(() => ({ top: 25, right: 30, bottom: 40, left: 45 }), []);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Max score across all points
  const maxScore = useMemo(() => {
    let max = 10;
    timeline.forEach((pt) => {
      pt.scores.forEach((s) => {
        if (s > max) max = s;
      });
    });
    return Math.ceil(max / 10) * 10;
  }, [timeline]);

  const xStep = innerWidth / Math.max(1, timeline.length - 1);
  const yScale = (score: number) => padding.top + innerHeight - (score / maxScore) * innerHeight;

  // Generate smooth paths for each player
  const playerPaths = useMemo(() => {
    return players.map((_, pIdx) => {
      const points = timeline.map((pt, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + innerHeight - ((pt.scores[pIdx] || 0) / maxScore) * innerHeight;
        return { x, y, score: pt.scores[pIdx] || 0 };
      });

      if (points.length === 0) {
        return {
          playerIndex: pIdx,
          path: '',
          areaPath: '',
          color: getApplePlayerColor(pIdx),
          finalScore: 0,
        };
      }

      // Build smooth cubic bezier curve
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const midX = (curr.x + next.x) / 2;
        d += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
      }

      // Area fill beneath smooth curve
      const lastPt = points[points.length - 1];
      const firstPt = points[0];
      const areaD = `${d} L ${lastPt.x} ${padding.top + innerHeight} L ${firstPt.x} ${padding.top + innerHeight} Z`;

      return {
        playerIndex: pIdx,
        path: d,
        areaPath: areaD,
        color: getApplePlayerColor(pIdx),
        finalScore: points[points.length - 1]?.score || 0,
      };
    });
  }, [players, timeline, xStep, innerHeight, maxScore, padding]);

  // Y-axis grid ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 4;
    const interval = Math.max(10, Math.ceil(maxScore / count / 5) * 5);
    for (let s = 0; s <= maxScore; s += interval) {
      ticks.push(s);
    }
    return ticks;
  }, [maxScore]);

  if (timeline.length < 2) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]">
        Not enough telemetry points to generate progression curves.
      </div>
    );
  }

  const activePoint = activePointIndex !== null ? timeline[activePointIndex] : timeline[timeline.length - 1];

  return (
    <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm font-sans">
      {/* Header with Title and Player Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-[#30d158]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
              Score Progression
            </h3>
            <span className="text-[10px] text-zinc-400 block -mt-0.5">
              Smooth trend curves across all frame shots
            </span>
          </div>
          {leadChanges > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 font-mono ml-2">
              {leadChanges} Lead {leadChanges === 1 ? 'Change' : 'Changes'}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {players.map((p, idx) => (
            <div key={p.id} className="flex items-center space-x-1.5 text-xs">
              <span 
                className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10"
                style={{ backgroundColor: getApplePlayerColor(idx) }}
              />
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">{p.name}:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                {timeline[timeline.length - 1]?.scores[idx] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseLeave={() => setActivePointIndex(null)}
        >
          <defs>
            {players.map((_, pIdx) => (
              <linearGradient
                key={`grad-${pIdx}`}
                id={`apple-grad-${pIdx}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={getApplePlayerColor(pIdx)} stopOpacity="0.22" />
                <stop offset="100%" stopColor={getApplePlayerColor(pIdx)} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y = yScale(tick);
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-black/[0.06] dark:text-white/[0.06]"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-zinc-400 dark:fill-zinc-500"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Smooth Area Fills */}
          {playerPaths.map((pp) => (
            <path
              key={`area-${pp.playerIndex}`}
              d={pp.areaPath}
              fill={`url(#apple-grad-${pp.playerIndex})`}
            />
          ))}

          {/* Smooth Curve Lines */}
          {playerPaths.map((pp) => (
            <path
              key={`line-${pp.playerIndex}`}
              d={pp.path}
              fill="none"
              stroke={pp.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Key Event Markers on Timeline (Breaks >= 15 and Fouls) */}
          {timeline.map((pt, idx) => {
            if (idx === 0) return null;
            const x = padding.left + idx * xStep;
            const y = yScale(pt.scores[pt.actorPlayerIndex] || 0);

            if (pt.eventType === 'pot' && (pt.breakScore || 0) >= 15) {
              return (
                <circle
                  key={`marker-break-${pt.eventId}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#ff9230"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              );
            }
            if (pt.eventType === 'foul') {
              return (
                <circle
                  key={`marker-foul-${pt.eventId}`}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#ff4245"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              );
            }
            return null;
          })}

          {/* Active Hover / Touch Inspection Vertical Line */}
          {activePointIndex !== null && (
            <g>
              <line
                x1={padding.left + activePointIndex * xStep}
                y1={padding.top}
                x2={padding.left + activePointIndex * xStep}
                y2={padding.top + innerHeight}
                stroke="#0091ff"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {players.map((_, pIdx) => {
                const s = timeline[activePointIndex].scores[pIdx] || 0;
                return (
                  <circle
                    key={`inspect-dot-${pIdx}`}
                    cx={padding.left + activePointIndex * xStep}
                    cy={yScale(s)}
                    r="5"
                    fill={getApplePlayerColor(pIdx)}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}

          {/* Touch / Pointer Hit Regions */}
          {timeline.map((_, idx) => {
            const x = padding.left + (idx - 0.5) * xStep;
            return (
              <rect
                key={`touch-${idx}`}
                x={Math.max(padding.left, x)}
                y={padding.top}
                width={Math.max(12, xStep)}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setActivePointIndex(idx)}
                onTouchStart={() => setActivePointIndex(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Floating / Active Event Inspection Banner (Apple Health Pill) */}
      {activePoint && (
        <div className="bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-zinc-400 font-semibold">
              Shot #{activePoint.index}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {activePoint.actorPlayerName}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[280px] sm:max-w-[400px]">
              {activePoint.detail}
            </span>
          </div>

          <div className="flex items-center space-x-2 justify-end font-mono">
            <span className="text-zinc-400 font-semibold text-[11px]">Score:</span>
            <div className="flex items-center space-x-1.5">
              {players.map((p, idx) => (
                <span
                  key={p.id}
                  className="font-bold px-2 py-0.5 rounded-full text-xs"
                  style={{
                    color: getApplePlayerColor(idx),
                    backgroundColor: `${getApplePlayerColor(idx)}15`,
                  }}
                >
                  {p.name}: {activePoint.scores[idx] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
