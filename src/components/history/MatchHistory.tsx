'use client';

import React, { useState, useEffect } from 'react';
import { Match, Player } from '@/types/snooker';
import { fetchMatches } from '@/lib/storage';
import { FrameInsightsView } from './insights/FrameInsightsView';
import { History, Trophy, Calendar, ChevronDown, ChevronUp, Flame, BarChart3 } from 'lucide-react';

export const MatchHistory: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedFrameByMatch, setSelectedFrameByMatch] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMatches().then((data) => {
      // Show completed matches
      const completed = data.filter((m) => m.status === 'completed');
      setMatches(completed);
      setLoading(false);
    });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedMatchId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Recently';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Match History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-400/80 mt-0.5">
            Log of completed matches, series results, and multiplayer frame breakdowns
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-emerald-400 font-semibold animate-pulse">
          Loading match records...
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-[#0c1611] rounded-2xl border border-emerald-900/30 text-gray-400 space-y-2">
          <p className="text-sm font-semibold text-gray-300">No matches recorded yet</p>
          <p className="text-xs">Start a new match and crown your first champion!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const isExpanded = expandedMatchId === m.id;
            const matchPlayers = m.players && m.players.length > 0
              ? m.players
              : [m.player1, m.player2].filter((p): p is Player => Boolean(p));

            const winner = matchPlayers.find(p => p.id === m.winner_id);
            const frames = m.frames || [];

            // Calculate match highest break
            let matchHighBreak = 0;
            let matchHighBreakPlayer = '';
            for (const f of frames) {
              if (f.highest_break > matchHighBreak) {
                matchHighBreak = f.highest_break;
                const hp = matchPlayers.find(p => p.id === f.highest_break_player_id);
                matchHighBreakPlayer = hp?.name || '';
              }
            }

            return (
              <div
                key={m.id}
                className="bg-[#0d1712] border border-emerald-900/40 rounded-2xl overflow-hidden transition-all hover:border-emerald-700/50"
              >
                {/* Main Match Summary Row */}
                <div
                  onClick={() => toggleExpand(m.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Players & Winner */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {matchPlayers.map((p, idx) => {
                          const isWinner = p.id === m.winner_id;
                          return (
                            <React.Fragment key={p.id}>
                              <span className={`text-sm sm:text-base font-bold ${isWinner ? 'text-emerald-400' : 'text-gray-300'}`}>
                                {p.name}
                              </span>
                              {idx < matchPlayers.length - 1 && (
                                <span className="text-xs text-gray-500 font-bold">vs</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-500" />
                          {formatDate(m.completed_at || m.started_at)}
                        </span>
                        <span>•</span>
                        <span>{m.best_of === 1 ? 'Single Frame' : `Best of ${m.best_of}`}</span>
                        {matchPlayers.length > 2 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">{matchPlayers.length} Players</span>
                          </>
                        )}
                        {winner && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-300 font-semibold">
                              Winner: {winner.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Final Series Score & Expand icon */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-gray-800/60 pt-2 sm:pt-0 max-w-full sm:max-w-[50%]">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-white font-mono flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
                        {m.player_frames && m.player_frames.length === matchPlayers.length ? (
                          matchPlayers.map((p, idx) => (
                            <span key={p.id} className={p.id === m.winner_id ? 'text-emerald-400 font-black' : 'text-gray-300'}>
                              {p.name}: {m.player_frames?.[idx] ?? 0}{idx < matchPlayers.length - 1 ? ' · ' : ''}
                            </span>
                          ))
                        ) : (
                          <span>{m.player1_frames} - {m.player2_frames}</span>
                        )}
                      </div>
                      {matchHighBreak > 0 && (
                        <div className="text-[11px] text-amber-300 flex items-center justify-end gap-1 font-mono">
                          <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                          Hi: {matchHighBreak} {matchHighBreakPlayer ? `(${matchHighBreakPlayer})` : ''}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="p-1 rounded-lg text-gray-400 hover:text-white flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Frame-by-Frame Breakdown & Visual Telemetry */}
                {isExpanded && (
                  <div className="bg-[#09110d] px-4 py-4 border-t border-emerald-950/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Frame Breakdown & Visual Insights</span>
                      </div>

                      {frames.length > 1 && (
                        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                          {frames.map((f) => {
                            const isSelected = (selectedFrameByMatch[m.id] || frames[0]?.id) === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFrameByMatch(prev => ({ ...prev, [m.id]: f.id }));
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                                    : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-800'
                                }`}
                              >
                                Frame {f.frame_number}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {frames.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">
                        Individual frame shot details were not archived for this match.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary Pill Rows for All Frames */}
                        <div className="space-y-1.5">
                          {frames.map((f) => {
                            const scores = f.scores && f.scores.length === matchPlayers.length
                              ? f.scores
                              : [f.player1_score, f.player2_score];
                            const isSelected = (selectedFrameByMatch[m.id] || frames[0]?.id) === f.id;

                            return (
                              <div
                                key={f.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFrameByMatch(prev => ({ ...prev, [m.id]: f.id }));
                                }}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border text-xs font-mono gap-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-emerald-950/40 border-emerald-600/60 ring-1 ring-emerald-500/40'
                                    : 'bg-gray-900/50 border-gray-800/80 hover:border-gray-700'
                                }`}
                              >
                                <span className={`font-semibold ${isSelected ? 'text-emerald-300 font-bold' : 'text-gray-400'}`}>
                                  Frame {f.frame_number} {f.events && f.events.length > 0 ? `(${f.events.length} events)` : ''}
                                </span>

                                <div className="flex flex-wrap items-center gap-2">
                                  {matchPlayers.map((p, idx) => {
                                    const score = scores[idx] ?? 0;
                                    const isWinner = f.winner_id === p.id;
                                    return (
                                      <span 
                                        key={p.id} 
                                        className={isWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}
                                      >
                                        {p.name}: {score}
                                        {idx < matchPlayers.length - 1 && <span className="text-gray-600 ml-2">|</span>}
                                      </span>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center space-x-2">
                                  {f.highest_break > 0 ? (
                                    <span className="text-amber-300 flex items-center gap-1 text-[11px]">
                                      <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                                      Break {f.highest_break}
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                    isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                                  }`}>
                                    {isSelected ? 'Viewing' : 'Inspect'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Visual Insights Container for Selected Frame */}
                        {(() => {
                          const activeFrame = frames.find(f => f.id === (selectedFrameByMatch[m.id] || frames[0]?.id)) || frames[0];
                          if (!activeFrame) return null;
                          return (
                            <div className="pt-2">
                              <FrameInsightsView
                                frame={activeFrame}
                                players={matchPlayers}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
