'use client';

import React, { useState, useMemo } from 'react';
import { MatchEvent, Player, BALL_CONFIGS } from '@/types/snooker';
import { 
  ListFilter, 
  Target, 
  AlertTriangle, 
  ArrowRightLeft, 
  Flame,
  CheckCircle2
} from 'lucide-react';

interface EventTimelineFeedProps {
  events: MatchEvent[];
  players: Player[];
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

export const EventTimelineFeed: React.FC<EventTimelineFeedProps> = ({
  events,
  players,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'pot' | 'foul' | 'break'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<number | 'all'>('all');

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Player filter
      if (selectedPlayer !== 'all' && evt.playerIndex !== selectedPlayer) {
        return false;
      }

      // Type filter
      if (filterType === 'all') return true;
      if (filterType === 'pot') return evt.type === 'pot';
      if (filterType === 'foul') return evt.type === 'foul';
      if (filterType === 'break') {
        return (evt.type === 'pot' && (evt.breakScore || 0) >= 10) || (evt.isBreakEnd && (evt.breakScore || 0) >= 10);
      }
      return true;
    });
  }, [events, filterType, selectedPlayer]);

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
        No event ledger archived for this frame.
      </div>
    );
  }

  const startTime = events[0]?.timestamp || 0;

  const formatRelativeTime = (timestamp: number) => {
    if (!startTime || timestamp < startTime) return '+00:00';
    const diffSec = Math.floor((timestamp - startTime) / 1000);
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm font-sans">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-[#30d158]">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
              Shot-by-Shot Event Feed
            </h3>
            <span className="text-[10px] text-zinc-400 block -mt-0.5">
              Chronological log with system icons and timestamps ({filteredEvents.length} shown)
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Apple Segmented Control for event types */}
          <div className="inline-flex p-1 bg-black/[0.05] dark:bg-white/[0.08] rounded-full border border-black/[0.04] dark:border-white/[0.04]">
            {(['all', 'pot', 'foul', 'break'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`min-h-[28px] px-2.5 py-0.5 rounded-full font-semibold transition active:scale-[0.97] capitalize cursor-pointer text-xs ${
                  filterType === type
                    ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {type === 'break' ? 'Breaks' : type}
              </button>
            ))}
          </div>

          {/* Player filter dropdown */}
          {players.length > 1 && (
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200 rounded-full px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0091ff]"
            >
              <option value="all">All Players</option>
              {players.map((p, idx) => (
                <option key={p.id} value={idx}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {filteredEvents.map((evt, idx) => {
          const accentColor = getApplePlayerColor(evt.playerIndex);
          const ballConfig = evt.ball ? BALL_CONFIGS[evt.ball] : null;

          return (
            <div
              key={evt.id || `evt-${idx}`}
              className="min-h-[44px] flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-black/30 border border-black/[0.04] dark:border-white/[0.04] text-xs font-mono gap-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition"
            >
              {/* Left: Timestamp, System Icon, Player */}
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold flex-shrink-0 w-12 tabular-nums">
                  {formatRelativeTime(evt.timestamp)}
                </span>

                {/* System Icon */}
                {evt.type === 'pot' && (
                  <Target className="w-4 h-4 text-emerald-600 dark:text-[#30d158] flex-shrink-0" />
                )}
                {evt.type === 'foul' && (
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-[#ff4245] flex-shrink-0" />
                )}
                {(evt.type === 'miss' || evt.type === 'switch') && (
                  <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                )}
                {evt.type === 'frame_start' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                )}

                <div className="flex items-center space-x-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[80px] sm:max-w-[120px] font-sans">
                    {evt.playerName}
                  </span>
                </div>

                {/* Ball Badge */}
                {ballConfig && (
                  <span
                    className="w-4 h-4 rounded-full border shadow-2xs flex items-center justify-center text-[9px] font-black flex-shrink-0"
                    style={{
                      backgroundColor: ballConfig.colorHex,
                      borderColor: ballConfig.borderHex,
                      color: ballConfig.textColor,
                    }}
                    title={`${ballConfig.name} (+${ballConfig.points})`}
                  >
                    {ballConfig.points}
                  </span>
                )}

                {evt.type === 'foul' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-[#ff4245] border border-red-500/20 flex-shrink-0">
                    FOUL +{evt.foulPoints || 4}
                  </span>
                )}

                {evt.type === 'miss' && (
                  <span className="text-[10px] font-medium text-zinc-400 flex-shrink-0">
                    MISS
                  </span>
                )}

                {/* Event detail */}
                <span className="text-zinc-500 dark:text-zinc-400 truncate hidden sm:inline-block max-w-[260px] font-sans">
                  {evt.detail}
                </span>
              </div>

              {/* Right: Score after shot */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {evt.breakScore && evt.breakScore > 1 ? (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Run {evt.breakScore}
                  </span>
                ) : null}

                <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1 tabular-nums">
                  {evt.scoresAfter && evt.scoresAfter.length > 0 ? (
                    evt.scoresAfter.join(' - ')
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
