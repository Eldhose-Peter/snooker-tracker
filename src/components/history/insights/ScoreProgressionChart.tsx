'use client';

import React, { useState, useMemo } from 'react';
import { ScoreTimelinePoint, getPlayerColor } from './analytics';
import { Player } from '@/types/snooker';
import { TrendingUp } from 'lucide-react';

interface ScoreProgressionChartProps {
  timeline: ScoreTimelinePoint[];
  players: Player[];
  leadChanges: number;
}

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
    timeline.forEach(pt => {
      pt.scores.forEach(s => {
        if (s > max) max = s;
      });
    });
    // Round up to nearest multiple of 10 or 20
    return Math.ceil(max / 10) * 10;
  }, [timeline]);

  const xStep = innerWidth / Math.max(1, timeline.length - 1);
  const yScale = (score: number) => padding.top + innerHeight - (score / maxScore) * innerHeight;

  // Generate paths for each player
  const playerPaths = useMemo(() => {
    return players.map((_, pIdx) => {
      const points = timeline.map((pt, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + innerHeight - ((pt.scores[pIdx] || 0) / maxScore) * innerHeight;
        return { x, y, score: pt.scores[pIdx] || 0 };
      });

      // Stepped path (snooker scores change discretely on events)
      let d = '';
      points.forEach((pt, i) => {
        if (i === 0) {
          d += `M ${pt.x} ${pt.y}`;
        } else {
          const prevPt = points[i - 1];
          // Step horizontal first, then vertical
          d += ` L ${pt.x} ${prevPt.y} L ${pt.x} ${pt.y}`;
        }
      });

      // Area under curve
      const areaD = points.length > 0
        ? `${d} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
        : '';

      return {
        playerIndex: pIdx,
        path: d,
        areaPath: areaD,
        color: getPlayerColor(pIdx),
        finalScore: points[points.length - 1]?.score || 0,
      };
    });
  }, [players, timeline, xStep, innerHeight, maxScore, padding]);

  // Y-axis grid ticks (e.g. 0, 20, 40, 60...)
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 4;
    const interval = Math.max(10, Math.ceil(maxScore / count / 5) * 5);
    for (let s = 0; s <= maxScore; s += interval) {
      ticks.push(s);
    }
    return ticks;
  }, [maxScore]);

  // If there are fewer than 2 points, display placeholder
  if (timeline.length < 2) {
    return (
      <div className="p-6 text-center text-xs text-gray-500 bg-[#09110d] rounded-xl border border-emerald-950/60">
        Not enough telemetry events to chart progression.
      </div>
    );
  }

  const activePoint = activePointIndex !== null ? timeline[activePointIndex] : timeline[timeline.length - 1];

  return (
    <div className="bg-[#0a140f] border border-emerald-950/80 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header with Title and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Score Progression & Lead Timeline
          </h3>
          {leadChanges > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/40 text-emerald-300 font-mono">
              {leadChanges} Lead {leadChanges === 1 ? 'Change' : 'Changes'}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {players.map((p, idx) => (
            <div key={p.id} className="flex items-center space-x-1.5 text-xs">
              <span 
                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: getPlayerColor(idx) }}
              />
              <span className="text-gray-300 font-semibold">{p.name}:</span>
              <span className="font-mono font-bold text-white">
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
                id={`grad-${pIdx}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={getPlayerColor(pIdx)} stopOpacity="0.25" />
                <stop offset="100%" stopColor={getPlayerColor(pIdx)} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {yTicks.map(tick => {
            const y = yScale(tick);
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="#1c2d24"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          {playerPaths.map(pp => (
            <path
              key={`area-${pp.playerIndex}`}
              d={pp.areaPath}
              fill={`url(#grad-${pp.playerIndex})`}
            />
          ))}

          {/* Stepped Lines */}
          {playerPaths.map(pp => (
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
                  fill="#f59e0b"
                  stroke="#0f172a"
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
                  fill="#ef4444"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
              );
            }
            return null;
          })}

          {/* Active Hover / Inspection Vertical Line */}
          {activePointIndex !== null && (
            <g>
              <line
                x1={padding.left + activePointIndex * xStep}
                y1={padding.top}
                x2={padding.left + activePointIndex * xStep}
                y2={padding.top + innerHeight}
                stroke="#34d399"
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
                    fill={getPlayerColor(pIdx)}
                    stroke="#0a140f"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}

          {/* Invisible Overlay Rectangles for Easy Pointer / Touch Inspection */}
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

      {/* Floating / Active Event Inspection Banner */}
      {activePoint && (
        <div className="bg-[#060d09] border border-emerald-900/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-gray-500 font-bold">
              Shot #{activePoint.index}
            </span>
            <span className="text-gray-600">•</span>
            <span className="font-semibold text-emerald-300">
              {activePoint.actorPlayerName}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-300 truncate max-w-[280px] sm:max-w-[400px]">
              {activePoint.detail}
            </span>
          </div>

          <div className="flex items-center space-x-2 justify-end font-mono">
            <span className="text-gray-400 font-semibold text-[11px]">Score at shot:</span>
            <div className="flex items-center space-x-1.5">
              {players.map((p, idx) => (
                <span
                  key={p.id}
                  className="font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: getPlayerColor(idx),
                    backgroundColor: `${getPlayerColor(idx)}18`,
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
