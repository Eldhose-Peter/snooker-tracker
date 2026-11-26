'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Match, Player } from '@/types/snooker';
import { fetchMatches, getLiveSession, ActiveLiveSession } from '@/lib/storage';
import { getFrameTopBreak } from '@/lib/break-utils';
import { 
  History, 
  Trophy, 
  Calendar, 
  ChevronRight, 
  Flame, 
  Play
} from 'lucide-react';

interface MatchHistoryProps {
  onNavigateTab?: (tab: 'live' | 'leaderboard' | 'history' | 'new-match') => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ onNavigateTab }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveSession, setLiveSession] = useState<ActiveLiveSession | null>(null);

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

  const getSectionHeader = (dateString?: string | null) => {
    if (!dateString) return 'RECENT MATCHES';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return 'RECENT MATCHES';
    }
  };

  // Group matches by month/year section
  const groupedMatches = useMemo(() => {
    const groups: { title: string; items: Match[] }[] = [];
    matches.forEach((m) => {
      const title = getSectionHeader(m.completed_at || m.started_at);
      let group = groups.find((g) => g.title === title);
      if (!group) {
        group = { title, items: [] };
        groups.push(group);
      }
      group.items.push(m);
    });
    return groups;
  }, [matches]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6 flex-1 flex flex-col font-sans">
      
      {/* Apple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5 text-emerald-600 dark:text-[#30d158]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-[#f5f5f7]">
              Match History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Archive of completed series, frame breakdowns, and shot-by-shot telemetry
          </p>
        </div>
      </div>

      {/* Live Match in Progress Banner (Liquid Glass Callout) */}
      {liveSession && (
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/90 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 dark:text-[#30d158]">
                Active Match In Progress
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#f5f5f7] flex flex-wrap items-center gap-1.5">
              {liveSession.players.map((p, idx) => (
                <React.Fragment key={p.id}>
                  <span>{p.name}</span>
                  {idx < liveSession.players.length - 1 && (
                    <span className="text-zinc-400 text-xs font-semibold">vs</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
              Frame {liveSession.currentFrameNum} • Series: {liveSession.playerFrames.join(' - ')} • Turn: {liveSession.players[liveSession.frameState?.activePlayerIndex]?.name || 'Player'}
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
            className="min-h-[44px] px-5 rounded-full bg-[#30d158] hover:bg-[#28b84c] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.97] active:opacity-80 flex-shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume Scoring</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-emerald-600 dark:text-[#30d158] font-semibold text-sm animate-pulse">
          Loading match records...
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1c1c1e] text-zinc-600 dark:text-zinc-400 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center mx-auto text-emerald-600 dark:text-[#30d158]">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-[#f5f5f7]">No Completed Matches Yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Start your first snooker series to log frames, breaks, and visual analytics.
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
              className="min-h-[44px] px-5 rounded-full bg-[#30d158] hover:bg-[#28b84c] text-white text-xs sm:text-sm font-bold transition active:scale-[0.97] active:opacity-80 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start New Match</span>
            </button>
          </div>
        </div>
      ) : (
        /* Grouped Card List */
        <div className="space-y-6">
          {groupedMatches.map((group) => (
            <div key={group.title} className="space-y-2.5">
              {/* Footnote Uppercase Section Header */}
              <div className="text-[11px] sm:text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider px-1">
                {group.title}
              </div>

              {/* Match Cards */}
              <div className="space-y-2.5">
                {group.items.map((m) => {
                  const rawPlayers = m.players && m.players.length > 0
                    ? m.players
                    : [m.player1, m.player2].filter((p): p is Player => Boolean(p));

                  const matchPlayers: Player[] = rawPlayers.length > 0
                    ? rawPlayers
                    : [
                        { id: m.player1_id || 'p1', name: 'Player 1', created_at: '' },
                        { id: m.player2_id || 'p2', name: 'Player 2', created_at: '' },
                      ];

                  const winner = matchPlayers.find((p) => p.id === m.winner_id);
                  const frames = m.frames || [];

                  // High break & total shots calculation
                  let matchHighBreak = 0;
                  let totalShots = 0;
                  for (const f of frames) {
                    const frameTop = getFrameTopBreak(f, matchPlayers).points;
                    if (frameTop > matchHighBreak) {
                      matchHighBreak = frameTop;
                    }
                    if (f.events) {
                      totalShots += f.events.length;
                    }
                  }

                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="group block rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm overflow-hidden transition-all hover:border-emerald-500/30 dark:hover:border-emerald-400/30 hover:bg-black/[0.015] dark:hover:bg-white/[0.025] active:scale-[0.99]"
                    >
                      {/* Main Match Summary Row */}
                      <div className="min-h-[56px] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Players & Match Meta */}
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 shadow-xs">
                            <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {matchPlayers.map((p, idx) => {
                                const isWinner = p.id === m.winner_id;
                                return (
                                  <React.Fragment key={p.id}>
                                    <span
                                      className={`text-sm sm:text-base font-bold ${
                                        isWinner
                                          ? 'text-emerald-700 dark:text-[#30d158]'
                                          : 'text-zinc-800 dark:text-[#f5f5f7]'
                                      }`}
                                    >
                                      {p.name}
                                    </span>
                                    {idx < matchPlayers.length - 1 && (
                                      <span className="text-xs text-zinc-400 font-semibold">vs</span>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-zinc-400" />
                                {formatDate(m.completed_at || m.started_at)}
                              </span>
                              <span>•</span>
                              <span>{m.best_of === 1 ? 'Single Frame' : `Best of ${m.best_of}`}</span>
                              {frames.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{frames.length} {frames.length === 1 ? 'frame' : 'frames'}</span>
                                </>
                              )}
                              {totalShots > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{totalShots} shots</span>
                                </>
                              )}
                              {winner && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 dark:text-[#30d158] font-semibold">
                                    Winner: {winner.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Score Pills & Navigation Chevron */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-black/[0.04] dark:border-white/[0.04] pt-2 sm:pt-0">
                          {/* Score Pills */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {m.player_frames && m.player_frames.length === matchPlayers.length ? (
                              matchPlayers.map((p, idx) => {
                                const isWinner = p.id === m.winner_id;
                                return (
                                  <span
                                    key={p.id}
                                    className={`px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-bold border ${
                                      isWinner
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-[#30d158]'
                                        : 'bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300'
                                    }`}
                                  >
                                    {p.name}: {m.player_frames?.[idx] ?? 0}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-bold bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200">
                                {m.player1_frames} - {m.player2_frames}
                              </span>
                            )}
                          </div>

                          {matchHighBreak > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-xs text-amber-600 dark:text-amber-400 font-mono font-semibold flex-shrink-0">
                              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{matchHighBreak}</span>
                            </div>
                          )}

                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-[#30d158] group-hover:translate-x-0.5 transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
