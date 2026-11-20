'use client';

import React, { useState, useMemo } from 'react';
import { MatchEvent, Player, BALL_CONFIGS } from '@/types/snooker';
import { getPlayerColor } from './analytics';
import { ListFilter } from 'lucide-react';

interface EventTimelineFeedProps {
  events: MatchEvent[];
  players: Player[];
}

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
      <div className="p-6 text-center text-xs text-gray-500 bg-[#09110d] rounded-xl border border-emerald-950/60">
        No event ledger archived for this frame.
      </div>
    );
  }

  const startTime = events[0]?.timestamp || 0;

  const formatRelativeTime = (timestamp: number) => {
    if (!startTime || timestamp < startTime) return '00:00';
    const diffSec = Math.floor((timestamp - startTime) / 1000);
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#0a140f] border border-emerald-950/80 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ListFilter className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Shot-by-Shot Event Feed
          </h3>
          <span className="text-[11px] text-gray-500 font-mono">
            ({filteredEvents.length} shown)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Type filters */}
          {(['all', 'pot', 'foul', 'break'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all capitalize ${
                filterType === type
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950'
                  : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {type === 'break' ? 'Breaks (10+)' : type}
            </button>
          ))}

          {/* Player filter dropdown */}
          {players.length > 1 && (
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-gray-900 border border-gray-800 text-gray-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500"
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
          const accentColor = getPlayerColor(evt.playerIndex);
          const ballConfig = evt.ball ? BALL_CONFIGS[evt.ball] : null;

          return (
            <div
              key={evt.id || `evt-${idx}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#060e0a] border border-emerald-950/60 text-xs font-mono gap-2 hover:border-emerald-800/60 transition-all"
            >
              {/* Left: Time & Player */}
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="text-[10px] text-gray-500 font-bold flex-shrink-0 w-12">
                  {formatRelativeTime(evt.timestamp)}
                </span>

                <div className="flex items-center space-x-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="font-bold text-gray-200 truncate max-w-[90px] sm:max-w-[130px]">
                    {evt.playerName}
                  </span>
                </div>

                {/* Event Badge / Ball icon */}
                {ballConfig && (
                  <span
                    className="w-4 h-4 rounded-full border shadow-sm flex items-center justify-center text-[9px] font-black flex-shrink-0"
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
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 flex-shrink-0">
                    FOUL +{evt.foulPoints || 4}
                  </span>
                )}

                {evt.type === 'miss' && (
                  <span className="text-[10px] font-semibold text-gray-500 flex-shrink-0">
                    MISS
                  </span>
                )}

                {/* Event detail */}
                <span className="text-gray-400 truncate hidden sm:inline-block max-w-[280px]">
                  {evt.detail}
                </span>
              </div>

              {/* Right: Score after shot */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {evt.breakScore && evt.breakScore > 1 ? (
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900/50">
                    Run {evt.breakScore}
                  </span>
                ) : null}

                <div className="text-[11px] font-bold text-gray-300 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 flex items-center gap-1">
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
