'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Match, Player } from '@/types/snooker';
import { fetchMatches, getLiveSession, ActiveLiveSession } from '@/lib/storage';
import { FrameInsightsView } from './insights/FrameInsightsView';
import { History, Trophy, Calendar, ChevronDown, ChevronUp, Flame, BarChart3, Play } from 'lucide-react';

interface MatchHistoryProps {
  onNavigateTab?: (tab: 'live' | 'leaderboard' | 'history' | 'new-match') => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ onNavigateTab }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveSession, setLiveSession] = useState<ActiveLiveSession | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedFrameByMatch, setSelectedFrameByMatch] = useState<Record<string, string>>({});

  const reloadMatches = useCallback(async () => {
    try {
      const data = await fetchMatches();
      const completed = data.filter((m) => m.status === 'completed');
      setMatches(completed);
      
      const session = getLiveSession();
      if (session && session.match && session.match.status === 'in_progress') {
        setLiveSession(session);
      } else {
        setLiveSession(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadMatches();
  }, [reloadMatches]);

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
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-4 space-y-4 sm:space-y-6 flex-1 flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              Match History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Log of completed matches, series results, and multiplayer frame breakdowns
          </p>
        </div>
      </div>

      {/* Live Match in Progress Banner */}
      {liveSession && (
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg border-emerald-500/40 bg-white/90 dark:bg-emerald-950/30 backdrop-blur-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                Live Match Currently In Progress
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex flex-wrap items-center gap-1.5">
              {liveSession.players.map((p, idx) => (
                <React.Fragment key={p.id}>
                  <span>{p.name}</span>
                  {idx < liveSession.players.length - 1 && (
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs font-bold">vs</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
              Frame {liveSession.currentFrameNum} • Series: {liveSession.playerFrames.join(' - ')} • Active: {liveSession.players[liveSession.frameState?.activePlayerIndex]?.name || 'Player'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('live');
              } else if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 flex-shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Resume Scoring</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
          Loading match records...
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 px-4 glass-panel rounded-2xl border border-black/[0.08] dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.02] text-zinc-600 dark:text-zinc-400 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-200">No completed matches recorded yet</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Your match records are currently empty. Start a new match to record scores and track visual insights!
            </p>
          </div>
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateTab) {
                  onNavigateTab('new-match');
                } else if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black rounded-xl text-xs font-bold transition active:scale-[0.98] flex items-center gap-2 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Start New Match</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const isExpanded = expandedMatchId === m.id;
            const rawPlayers = m.players && m.players.length > 0
              ? m.players
              : [m.player1, m.player2].filter((p): p is Player => Boolean(p));

            const matchPlayers: Player[] = rawPlayers.length > 0
              ? rawPlayers
              : [
                  { id: m.player1_id || 'p1', name: 'Player 1', created_at: '' },
                  { id: m.player2_id || 'p2', name: 'Player 2', created_at: '' },
                ];

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
                className="glass-panel border border-black/[0.08] dark:border-white/[0.06] hover:border-emerald-500/30 rounded-2xl overflow-hidden transition-all bg-white/85 dark:bg-[#0c140f]/75 shadow-xs dark:shadow-none"
              >
                {/* Main Match Summary Row */}
                <div
                  onClick={() => toggleExpand(m.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Players & Winner */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-600/40 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {matchPlayers.map((p, idx) => {
                          const isWinner = p.id === m.winner_id;
                          return (
                            <React.Fragment key={p.id}>
                              <span className={`text-sm sm:text-base font-bold ${isWinner ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-800 dark:text-gray-300'}`}>
                                {p.name}
                              </span>
                              {idx < matchPlayers.length - 1 && (
                                <span className="text-xs text-zinc-400 dark:text-gray-500 font-bold">vs</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                          {formatDate(m.completed_at || m.started_at)}
                        </span>
                        <span>•</span>
                        <span>{m.best_of === 1 ? 'Single Frame' : `Best of ${m.best_of}`}</span>
                        {matchPlayers.length > 2 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">{matchPlayers.length} Players</span>
                          </>
                        )}
                        {winner && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                              Winner: {winner.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Final Series Score & Expand icon */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-black/[0.06] dark:border-gray-800/60 pt-2 sm:pt-0 max-w-full sm:max-w-[50%]">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white font-mono flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
                        {m.player_frames && m.player_frames.length === matchPlayers.length ? (
                          matchPlayers.map((p, idx) => (
                            <span key={p.id} className={p.id === m.winner_id ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-zinc-700 dark:text-gray-300'}>
                              {p.name}: {m.player_frames?.[idx] ?? 0}{idx < matchPlayers.length - 1 ? ' · ' : ''}
                            </span>
                          ))
                        ) : (
                          <span>{m.player1_frames} - {m.player2_frames}</span>
                        )}
                      </div>
                      {matchHighBreak > 0 && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-end gap-1 font-mono">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
                          Hi: {matchHighBreak} {matchHighBreakPlayer ? `(${matchHighBreakPlayer})` : ''}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="p-1 rounded-lg text-zinc-400 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white flex-shrink-0 cursor-pointer"
                      aria-label={isExpanded ? 'Collapse match breakdown' : 'Expand match breakdown'}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Frame-by-Frame Breakdown & Visual Telemetry */}
                {isExpanded && (
                  <div className="bg-zinc-50/90 dark:bg-[#070d0a]/90 px-3.5 sm:px-5 py-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums font-bold transition-all active:scale-[0.98] cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-600/30 dark:border-emerald-500/30 shadow-xs'
                                    : 'bg-black/[0.04] dark:bg-black/30 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-black/[0.06] dark:border-white/[0.06]'
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
                      <p className="text-xs text-zinc-500 italic py-2">
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
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border text-xs font-mono tabular-nums gap-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'glass-panel bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-xs'
                                    : 'glass-panel bg-white dark:bg-black/20 border-black/[0.06] dark:border-white/[0.04] hover:border-black/20 dark:hover:border-white/[0.1]'
                                }`}
                              >
                                <span className={`font-semibold ${isSelected ? 'text-emerald-800 dark:text-emerald-300 font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                  Frame {f.frame_number} {f.events && f.events.length > 0 ? `(${f.events.length} events)` : ''}
                                </span>

                                <div className="flex flex-wrap items-center gap-2">
                                  {matchPlayers.map((p, idx) => {
                                    const score = scores[idx] ?? 0;
                                    const isWinner = f.winner_id === p.id;
                                    return (
                                      <span 
                                        key={p.id} 
                                        className={isWinner ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-zinc-700 dark:text-zinc-300'}
                                      >
                                        {p.name}: {score}
                                        {idx < matchPlayers.length - 1 && <span className="text-zinc-400 dark:text-zinc-600 ml-2">|</span>}
                                      </span>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center space-x-2">
                                  {f.highest_break > 0 ? (
                                    <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1 text-[11px]">
                                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
                                      Break {f.highest_break}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400 dark:text-zinc-600">-</span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase font-bold ${
                                    isSelected ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-600/30 dark:border-emerald-500/30' : 'bg-black/[0.04] dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.06]'
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
