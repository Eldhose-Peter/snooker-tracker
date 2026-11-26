'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Match, Player } from '@/types/snooker';
import { fetchMatchById } from '@/lib/storage';
import {
  computeFrameInsights,
  computeMatchInsights,
  getApplePlayerColor,
} from './analytics';
import { ScoreProgressionChart } from './ScoreProgressionChart';
import { BallDistributionChart } from './BallDistributionChart';
import { BreakAnalyticsCard } from './BreakAnalyticsCard';
import { DisciplineCard } from './DisciplineCard';
import { EventTimelineFeed } from './EventTimelineFeed';
import { AIAssistantModal } from '@/components/modals/AIAssistantModal';
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Calendar,
  Flame,
  Clock,
  BarChart3,
  TrendingUp,
  Layers,
  Sparkles,
  CircleDot,
} from 'lucide-react';

interface MatchInsightsPageProps {
  matchId: string;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatMatchDate(dateString?: string | null): string {
  if (!dateString) return 'Recently';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export const MatchInsightsPage: React.FC<MatchInsightsPageProps> = ({ matchId }) => {
  const [loadedData, setLoadedData] = useState<{ id: string; match: Match | null } | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string>('overview');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const loading = loadedData === null || loadedData.id !== matchId;
  const match = loadedData?.id === matchId ? loadedData.match : null;

  useEffect(() => {
    let active = true;
    fetchMatchById(matchId)
      .then((found) => {
        if (!active) return;
        setLoadedData({ id: matchId, match: found });
        if (found) {
          const frames = found.frames || [];
          const urlFrameParam =
            typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get('frame')
              : null;

          if (urlFrameParam) {
            const matchedFrame = frames.find(
              (f) => String(f.frame_number) === urlFrameParam || f.id === urlFrameParam
            );
            if (matchedFrame) {
              setSelectedFrameId(matchedFrame.id);
              return;
            }
          }

          if (frames.length === 1) {
            setSelectedFrameId(frames[0].id);
          } else {
            setSelectedFrameId('overview');
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setLoadedData({ id: matchId, match: null });
      });

    return () => {
      active = false;
    };
  }, [matchId]);

  const matchPlayers = useMemo<Player[]>(() => {
    if (!match) return [];
    const rawPlayers =
      match.players && match.players.length > 0
        ? match.players
        : [match.player1, match.player2].filter((p): p is Player => Boolean(p));

    return rawPlayers.length > 0
      ? rawPlayers
      : [
          { id: match.player1_id || 'p1', name: 'Player 1', created_at: '' },
          { id: match.player2_id || 'p2', name: 'Player 2', created_at: '' },
        ];
  }, [match]);

  const frames = useMemo(() => match?.frames || [], [match]);

  const matchInsights = useMemo(() => {
    if (!match || frames.length === 0) return null;
    return computeMatchInsights(frames, matchPlayers);
  }, [match, frames, matchPlayers]);

  const activeFrame = useMemo(() => {
    if (selectedFrameId === 'overview') return null;
    return frames.find((f) => f.id === selectedFrameId) || frames[0] || null;
  }, [frames, selectedFrameId]);

  const activeFrameScores = useMemo(() => {
    if (!activeFrame) return [];
    return activeFrame.scores && activeFrame.scores.length === matchPlayers.length
      ? activeFrame.scores
      : [activeFrame.player1_score, activeFrame.player2_score];
  }, [activeFrame, matchPlayers]);

  const frameInsights = useMemo(() => {
    if (!activeFrame || !activeFrame.events || activeFrame.events.length === 0) {
      return null;
    }
    return computeFrameInsights(activeFrame.events, matchPlayers, activeFrameScores);
  }, [activeFrame, matchPlayers, activeFrameScores]);

  const winner = match ? matchPlayers.find((p) => p.id === match.winner_id) : undefined;

  const seriesScores = useMemo(() => {
    if (!match) return [];
    if (match.player_frames && match.player_frames.length === matchPlayers.length) {
      return match.player_frames;
    }
    return [match.player1_frames ?? 0, match.player2_frames ?? 0];
  }, [match, matchPlayers]);

  // Determine match-level top break
  const matchTopBreak = useMemo(() => {
    let points = 0;
    let playerName = '';
    let frameNumber: number | undefined;
    for (const f of frames) {
      if (f.highest_break > points) {
        points = f.highest_break;
        playerName = matchPlayers.find((p) => p.id === f.highest_break_player_id)?.name || '';
        frameNumber = f.frame_number;
      }
    }
    if (matchInsights && matchInsights.breaks.length > 0 && matchInsights.breaks[0].totalPoints > points) {
      points = matchInsights.breaks[0].totalPoints;
      playerName = matchInsights.breaks[0].playerName;
      frameNumber = matchInsights.breaks[0].frameNumber;
    }
    return { points, playerName, frameNumber };
  }, [frames, matchPlayers, matchInsights]);

  const isOverview = frames.length > 1 && selectedFrameId === 'overview';

  // KPI metrics for current scope (Overview vs Selected Frame)
  const kpiDuration = isOverview
    ? matchInsights?.totalDurationSeconds ?? 0
    : frameInsights?.durationSeconds ?? 0;
  const kpiTotalShots = isOverview
    ? matchInsights?.totalEvents ?? 0
    : frameInsights?.totalEvents ?? 0;
  const kpiLeadChanges = isOverview
    ? matchInsights?.totalLeadChanges ?? 0
    : frameInsights?.leadChanges ?? 0;

  const kpiTopBreak = useMemo(() => {
    if (isOverview) return matchTopBreak;
    if (frameInsights && frameInsights.breaks.length > 0) {
      return {
        points: frameInsights.breaks[0].totalPoints,
        playerName: frameInsights.breaks[0].playerName,
        frameNumber: activeFrame?.frame_number,
      };
    }
    if (activeFrame && activeFrame.highest_break > 0) {
      const hp = matchPlayers.find((p) => p.id === activeFrame.highest_break_player_id);
      return {
        points: activeFrame.highest_break,
        playerName: hp?.name || '',
        frameNumber: activeFrame.frame_number,
      };
    }
    return { points: 0, playerName: '', frameNumber: activeFrame?.frame_number };
  }, [isOverview, matchTopBreak, frameInsights, activeFrame, matchPlayers]);

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--label)] flex flex-col font-sans selection:bg-emerald-600 selection:text-white antialiased relative overflow-x-hidden">
      {/* Liquid Glass Detail Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-white/85 dark:bg-black/85 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] pt-[env(safe-area-inset-top,0px)] transform-gpu">
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2">
          {/* Leading: Back to Match History */}
          <Link
            href="/?tab=history"
            className="min-h-[44px] inline-flex items-center gap-1 pr-3 -ml-1.5 pl-1.5 rounded-full text-sm font-semibold text-emerald-600 dark:text-[#30d158] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition active:scale-[0.97] active:opacity-80 flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>History</span>
          </Link>

          {/* Center: Title */}
          <div className="min-w-0 text-center flex-1 px-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-[var(--label)] truncate">
              Match Insights
            </h1>
            {match && (
              <p className="text-[10px] sm:text-[11px] text-[var(--label-2)] truncate hidden sm:block">
                {matchPlayers.map((p) => p.name).join(' vs ')} •{' '}
                {match.best_of === 1 ? 'Single Frame' : `Best of ${match.best_of}`}
              </p>
            )}
          </div>

          {/* Trailing: AI Referee Assistant */}
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            className="w-11 h-11 flex items-center justify-center text-[var(--label-2)] hover:text-[var(--label)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-full transition active:scale-95 cursor-pointer flex-shrink-0"
            title="AI Referee Assistant"
            aria-label="AI Referee Assistant"
          >
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-[calc(4rem+env(safe-area-inset-top,0px))] sm:pt-[calc(4.75rem+env(safe-area-inset-top,0px))] pb-14 space-y-6">
        {loading ? (
          <div className="space-y-4 py-6">
            <div className="h-40 rounded-3xl bg-black/[0.04] dark:bg-white/[0.05] animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] animate-pulse"
                />
              ))}
            </div>
            <div className="h-72 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] animate-pulse" />
          </div>
        ) : !match ? (
          <div className="my-12 max-w-md mx-auto text-center p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mx-auto text-zinc-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-[#f5f5f7]">
                Match Not Found
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                This match record could not be loaded or may have been removed from local storage.
              </p>
            </div>
            <Link
              href="/?tab=history"
              className="min-h-[44px] px-6 rounded-full bg-[#30d158] hover:bg-[#28b84c] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.97]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Match History</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Match Hero Summary Card */}
            <section className="rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm p-5 sm:p-6 space-y-5">
              {/* Top Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {formatMatchDate(match.completed_at || match.started_at)}
                  </span>
                  <span>•</span>
                  <span>{match.best_of === 1 ? 'Single Frame' : `Best of ${match.best_of}`}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <CircleDot className="w-3 h-3 text-red-500" />
                    {match.reds_count || 15} Reds
                  </span>
                </div>

                {winner && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-emerald-700 dark:text-[#30d158] text-xs font-bold">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Winner: {winner.name}
                  </span>
                )}
              </div>

              {/* Players & Series Scoreboard */}
              {matchPlayers.length === 2 ? (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4 pt-1">
                  {/* Player 1 */}
                  <div className="flex items-center sm:justify-end gap-3 min-w-0">
                    <div className="sm:text-right min-w-0 order-2 sm:order-1">
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span
                          className={`text-lg sm:text-xl font-bold truncate ${
                            matchPlayers[0].id === match.winner_id
                              ? 'text-emerald-700 dark:text-[#30d158]'
                              : 'text-zinc-900 dark:text-[#f5f5f7]'
                          }`}
                        >
                          {matchPlayers[0].name}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium block">
                        {matchPlayers[0].id === match.winner_id ? 'Series Winner' : 'Challenger'}
                      </span>
                    </div>
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 order-1 sm:order-2 ring-2 ring-black/[0.06] dark:ring-white/[0.1] overflow-hidden"
                      style={{ backgroundColor: getApplePlayerColor(0) }}
                    >
                      {matchPlayers[0].avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={matchPlayers[0].avatar_url}
                          alt={matchPlayers[0].name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        matchPlayers[0].name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                  </div>

                  {/* Center Series Score Pill */}
                  <div className="flex items-center justify-center gap-3 px-5 py-2.5 rounded-2xl bg-black/[0.03] dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.08]">
                    <span
                      className={`text-3xl sm:text-4xl font-black font-mono tabular-nums ${
                        matchPlayers[0].id === match.winner_id
                          ? 'text-emerald-600 dark:text-[#30d158]'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {seriesScores[0] ?? 0}
                    </span>
                    <span className="text-sm font-bold text-zinc-400">-</span>
                    <span
                      className={`text-3xl sm:text-4xl font-black font-mono tabular-nums ${
                        matchPlayers[1].id === match.winner_id
                          ? 'text-emerald-600 dark:text-[#30d158]'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {seriesScores[1] ?? 0}
                    </span>
                  </div>

                  {/* Player 2 */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ring-2 ring-black/[0.06] dark:ring-white/[0.1] overflow-hidden"
                      style={{ backgroundColor: getApplePlayerColor(1) }}
                    >
                      {matchPlayers[1].avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={matchPlayers[1].avatar_url}
                          alt={matchPlayers[1].name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        matchPlayers[1].name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`text-lg sm:text-xl font-bold truncate block ${
                          matchPlayers[1].id === match.winner_id
                            ? 'text-emerald-700 dark:text-[#30d158]'
                            : 'text-zinc-900 dark:text-[#f5f5f7]'
                        }`}
                      >
                        {matchPlayers[1].name}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-medium block">
                        {matchPlayers[1].id === match.winner_id ? 'Series Winner' : 'Challenger'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Multiplayer Summary Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {matchPlayers.map((p, idx) => {
                    const isWinner = p.id === match.winner_id;
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                          isWinner
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-black/[0.02] dark:bg-black/30 border-black/[0.06] dark:border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getApplePlayerColor(idx) }}
                          />
                          <span className="text-sm font-bold truncate text-zinc-900 dark:text-[#f5f5f7]">
                            {p.name}
                          </span>
                        </div>
                        <span
                          className={`text-xl font-black font-mono tabular-nums ${
                            isWinner
                              ? 'text-emerald-600 dark:text-[#30d158]'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {seriesScores[idx] ?? 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Frame Scope Switcher (only shown when > 1 frame, or label for single frame) */}
            {frames.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-center text-sm text-zinc-500 dark:text-zinc-400">
                No frame telemetry archived for this match.
              </div>
            ) : (
              <>
                {frames.length > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
                      <Layers className="w-4 h-4 text-emerald-600 dark:text-[#30d158]" />
                      <span>Scope ({frames.length} Frames)</span>
                    </div>

                    <div className="flex overflow-x-auto p-1 bg-black/[0.05] dark:bg-white/[0.08] rounded-full border border-black/[0.04] dark:border-white/[0.04] scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedFrameId('overview')}
                        className={`min-h-[36px] px-4 py-1 rounded-full text-xs font-semibold transition active:scale-[0.97] whitespace-nowrap cursor-pointer ${
                          selectedFrameId === 'overview'
                            ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        Match Overview
                      </button>

                      {frames.map((f) => {
                        const isSelected = selectedFrameId === f.id;
                        const scores =
                          f.scores && f.scores.length === matchPlayers.length
                            ? f.scores
                            : [f.player1_score, f.player2_score];
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSelectedFrameId(f.id)}
                            className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-semibold transition active:scale-[0.97] whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <span>Frame {f.frame_number}</span>
                            <span className="text-[10px] font-mono opacity-70 tabular-nums">
                              {scores.join('–')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* KPI Metric Cards */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[#0091ff] flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                        {isOverview ? 'Match Duration' : 'Frame Duration'}
                      </span>
                      <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-[#f5f5f7]">
                        {formatDuration(kpiDuration)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-[#30d158] flex-shrink-0">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                        Total Shots
                      </span>
                      <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-[#f5f5f7]">
                        {kpiTotalShots > 0 ? `${kpiTotalShots} actions` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-500 flex-shrink-0">
                      <Flame className="w-5 h-5 fill-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                        Top Break
                      </span>
                      {kpiTopBreak.points > 0 ? (
                        <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 block truncate">
                          {kpiTopBreak.points} pts{' '}
                          {kpiTopBreak.playerName && (
                            <span className="text-xs font-normal text-zinc-400 font-sans">
                              ({kpiTopBreak.playerName}
                              {isOverview && kpiTopBreak.frameNumber ? ` · F${kpiTopBreak.frameNumber}` : ''})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-base sm:text-lg font-bold font-mono text-zinc-400">—</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-500 flex-shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                        Lead Changes
                      </span>
                      <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-[#f5f5f7]">
                        {kpiTotalShots > 0 ? `${kpiLeadChanges} changes` : '—'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* OVERVIEW MODE (Multi-Frame Match) */}
                {isOverview && matchInsights && (
                  <div className="space-y-5">
                    {/* Frame-by-Frame Breakdown Card */}
                    <section className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
                            Frame-by-Frame Breakdown
                          </h2>
                          <p className="text-[11px] text-zinc-400">
                            Select any frame to inspect its score progression curve and shot-by-shot event log
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] rounded-xl overflow-hidden">
                        {matchInsights.frameSummaries.map((fs) => {
                          const maxFrameScore = Math.max(1, ...fs.scores);

                          return (
                            <button
                              key={fs.frameId}
                              type="button"
                              onClick={() => setSelectedFrameId(fs.frameId)}
                              className="w-full text-left p-3.5 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#1c1c1e] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition cursor-pointer group"
                            >
                              {/* Left: Frame Label & Meta */}
                              <div className="flex items-center gap-3 min-w-[160px]">
                                <span className="px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.07] text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">
                                  Frame {fs.frameNumber}
                                </span>
                                <div className="text-[11px] text-zinc-400 font-mono space-x-2">
                                  {fs.hasEvents && <span>{fs.totalEvents} shots</span>}
                                  {fs.durationSeconds > 0 && <span>• {formatDuration(fs.durationSeconds)}</span>}
                                </div>
                              </div>

                              {/* Center: Visual Score Comparison */}
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl">
                                {matchPlayers.map((p, idx) => {
                                  const score = fs.scores[idx] ?? 0;
                                  const isFrameWinner = fs.winnerId === p.id;
                                  const pct = Math.round((score / maxFrameScore) * 100);
                                  return (
                                    <div key={p.id} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span
                                          className={`truncate font-medium ${
                                            isFrameWinner
                                              ? 'text-emerald-700 dark:text-[#30d158] font-bold'
                                              : 'text-zinc-600 dark:text-zinc-400'
                                          }`}
                                        >
                                          {p.name}
                                        </span>
                                        <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-[#f5f5f7]">
                                          {score}
                                        </span>
                                      </div>
                                      <div className="h-1.5 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.07] overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all"
                                          style={{
                                            width: `${Math.max(score > 0 ? 6 : 0, pct)}%`,
                                            backgroundColor: getApplePlayerColor(idx),
                                            opacity: isFrameWinner ? 1 : 0.55,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Right: High Break & Inspect Cue */}
                              <div className="flex items-center justify-between md:justify-end gap-3">
                                {fs.highestBreak > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-400 text-xs font-mono font-semibold">
                                    <Flame className="w-3 h-3 fill-amber-500" />
                                    {fs.highestBreak}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-[#30d158] group-hover:translate-x-0.5 transition-transform">
                                  <span>Inspect</span>
                                  <ChevronRight className="w-4 h-4" />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {matchInsights.framesWithTelemetry > 0 ? (
                      <>
                        {/* 2-Column Insights Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                          <BallDistributionChart scoringSources={matchInsights.scoringSources} />
                          <BreakAnalyticsCard
                            breaks={matchInsights.breaks}
                            visitStats={matchInsights.visitStats}
                            maxListHeightClass="max-h-96"
                          />
                        </div>

                        {/* Match-Wide Discipline */}
                        <DisciplineCard discipline={matchInsights.discipline} />
                      </>
                    ) : (
                      <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-6 text-center space-y-2 shadow-sm">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
                          Shot Telemetry Unavailable
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                          Granular shot-by-shot telemetry was not recorded for these historical frames. Active telemetry and trend curves are captured for newly scored matches.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* SINGLE FRAME MODE */}
                {!isOverview && activeFrame && (
                  <div className="space-y-5">
                    {!frameInsights ? (
                      <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-8 text-center space-y-3 shadow-sm">
                        <div className="w-11 h-11 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-600 dark:text-[#30d158]">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-zinc-900 dark:text-[#f5f5f7]">
                            Frame {activeFrame.frame_number} Summary
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                            Granular shot telemetry was not recorded for this historical frame. Active telemetry and trend curves are enabled for newly scored games.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 font-mono text-xs">
                          {matchPlayers.map((p, idx) => (
                            <div
                              key={p.id}
                              className="bg-black/[0.04] dark:bg-white/[0.06] px-3.5 py-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.08]"
                            >
                              <span className="text-zinc-600 dark:text-zinc-400">{p.name}: </span>
                              <span className="text-emerald-700 dark:text-[#30d158] font-bold">
                                {activeFrameScores[idx] ?? 0} pts
                              </span>
                            </div>
                          ))}
                          {activeFrame.highest_break > 0 && (
                            <div className="bg-amber-400/15 px-3.5 py-1.5 rounded-full border border-amber-400/30 text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5 fill-amber-500" />
                              <span>High Break: {activeFrame.highest_break}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Hero Score Progression Chart */}
                        <ScoreProgressionChart
                          timeline={frameInsights.timeline}
                          players={matchPlayers}
                          leadChanges={frameInsights.leadChanges}
                        />

                        {/* 2-Column Insights Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                          <BallDistributionChart scoringSources={frameInsights.scoringSources} />
                          <BreakAnalyticsCard
                            breaks={frameInsights.breaks}
                            visitStats={frameInsights.visitStats}
                            maxListHeightClass="max-h-96"
                          />
                        </div>

                        {/* Discipline & Foul Concessions */}
                        <DisciplineCard discipline={frameInsights.discipline} />

                        {/* Full Shot-by-Shot Event Feed */}
                        <EventTimelineFeed
                          events={activeFrame.events || []}
                          players={matchPlayers}
                          maxHeightClassName="max-h-[480px]"
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <AIAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
};
