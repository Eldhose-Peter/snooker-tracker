'use client';

import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, Player, HeadToHeadStats } from '@/types/snooker';
import { fetchLeaderboard, fetchPlayers, createPlayer, fetchHeadToHead } from '@/lib/storage';
import { 
  Trophy, 
  Flame, 
  UserPlus, 
  Search, 
  Swords, 
  X,
  Medal
} from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'matches_won' | 'win_rate' | 'highest_break'>('matches_won');

  // Add Player Modal State
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Head-to-Head Modal State
  const [isH2HOpen, setIsH2HOpen] = useState(false);
  const [h2hPlayer1Id, setH2HPlayer1Id] = useState('');
  const [h2hPlayer2Id, setH2HPlayer2Id] = useState('');
  const [h2hResult, setH2HResult] = useState<{ key: string; stats: HeadToHeadStats | null } | null>(null);
  const h2hPairKey = isH2HOpen && h2hPlayer1Id && h2hPlayer2Id && h2hPlayer1Id !== h2hPlayer2Id
    ? `${h2hPlayer1Id}:${h2hPlayer2Id}`
    : null;
  const h2hStats = h2hPairKey && h2hResult?.key === h2hPairKey ? h2hResult.stats : null;
  const loadingH2H = Boolean(h2hPairKey && h2hResult?.key !== h2hPairKey);

  // Load data
  const loadData = async () => {
    setLoading(true);
    const [lb, pl] = await Promise.all([fetchLeaderboard(), fetchPlayers()]);
    setEntries(lb);
    setPlayers(pl);
    if (pl.length >= 2) {
      setH2HPlayer1Id(pl[0].id);
      setH2HPlayer2Id(pl[1].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchLeaderboard(), fetchPlayers()]).then(([lb, pl]) => {
      if (!isMounted) return;
      setEntries(lb);
      setPlayers(pl);
      if (pl.length >= 2) {
        setH2HPlayer1Id(pl[0].id);
        setH2HPlayer2Id(pl[1].id);
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle H2H query
  useEffect(() => {
    if (!h2hPairKey) return;
    let isMounted = true;
    fetchHeadToHead(h2hPlayer1Id, h2hPlayer2Id).then((res) => {
      if (!isMounted) return;
      setH2HResult({ key: h2hPairKey, stats: res });
    });
    return () => {
      isMounted = false;
    };
  }, [h2hPairKey, h2hPlayer1Id, h2hPlayer2Id]);

  // Handle Add Player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setSavingPlayer(true);
    await createPlayer(newPlayerName.trim());
    setNewPlayerName('');
    setIsAddPlayerOpen(false);
    setSavingPlayer(false);
    await loadData();
  };

  // Filter and sort entries
  const filteredEntries = entries
    .filter((e) => {
      const q = searchQuery.toLowerCase();
      return e.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'win_rate') return b.win_rate - a.win_rate || b.matches_won - a.matches_won;
      if (sortBy === 'highest_break') return b.highest_break - a.highest_break || b.matches_won - a.matches_won;
      return b.matches_won - a.matches_won || b.win_rate - a.win_rate;
    });

  // Top 3 for Podium
  const top1 = filteredEntries[0];
  const top2 = filteredEntries[1];
  const top3 = filteredEntries[2];

  const getMetricDisplay = (player: LeaderboardEntry) => {
    if (sortBy === 'win_rate') {
      return { value: `${player.win_rate}%`, label: 'Win Rate' };
    }
    if (sortBy === 'highest_break') {
      return { value: `${player.highest_break}`, label: 'High Break' };
    }
    return { value: `${player.matches_won}W`, label: `${player.matches_won}/${player.matches_played} Won` };
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6 flex-1 flex flex-col font-sans">
      
      {/* Apple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shadow-xs">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-[#f5f5f7]">
              Leaderboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Official group rankings, win percentages, and high break telemetry
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Head to Head Button */}
          <button
            onClick={() => setIsH2HOpen(true)}
            className="min-h-[44px] px-4 rounded-full bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-zinc-900 dark:text-[#f5f5f7] text-xs sm:text-sm font-semibold flex items-center space-x-2 transition active:scale-[0.97] active:opacity-80 border border-black/[0.06] dark:border-white/[0.08] cursor-pointer"
          >
            <Swords className="w-4 h-4 text-emerald-600 dark:text-[#30d158]" />
            <span>Head-to-Head</span>
          </button>

          {/* Add Friend Button */}
          <button
            onClick={() => setIsAddPlayerOpen(true)}
            className="min-h-[44px] px-4 rounded-full bg-[#30d158] hover:bg-[#28b84c] text-white text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs transition active:scale-[0.97] active:opacity-80 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* Filter / Sort Segmented Slider & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Apple Segmented Control for Sorting */}
        <div className="inline-flex p-1 bg-black/[0.06] dark:bg-white/[0.08] rounded-full self-start sm:self-auto border border-black/[0.04] dark:border-white/[0.04]">
          <button
            onClick={() => setSortBy('matches_won')}
            className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition active:scale-[0.97] cursor-pointer ${
              sortBy === 'matches_won'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Total Wins
          </button>
          <button
            onClick={() => setSortBy('win_rate')}
            className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition active:scale-[0.97] cursor-pointer ${
              sortBy === 'win_rate'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Win Rate
          </button>
          <button
            onClick={() => setSortBy('highest_break')}
            className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition active:scale-[0.97] cursor-pointer ${
              sortBy === 'highest_break'
                ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            High Break
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[40px] pl-10 pr-9 py-2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] text-zinc-900 dark:text-[#f5f5f7] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0091ff]/40 transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-emerald-600 dark:text-[#30d158] font-semibold text-sm animate-pulse">
          Loading rankings...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1c1c1e] text-zinc-500 dark:text-zinc-400">
          <p className="text-sm font-medium">No players found matching your criteria.</p>
        </div>
      ) : (
        <>
          {/* Apple Fitness / Health Style Podium for Top 3 */}
          {top1 && !searchQuery && (
            <div className="space-y-2">
              <div className="text-[11px] sm:text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider px-1">
                Top Performers
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end pt-2 pb-1">
                
                {/* 2nd Place Podium Card */}
                {top2 ? (
                  <div className="rounded-2xl p-3.5 sm:p-4 bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col items-center text-center transition hover:border-black/20 dark:hover:border-white/20">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-400/15 border border-slate-400/30 flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-xs mb-2">
                      <Medal className="w-4 h-4" />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={top2.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top2.name}`}
                      alt={top2.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-slate-300 dark:border-slate-600 shadow-xs mb-2"
                    />
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-[#f5f5f7] truncate max-w-full">
                      {top2.name}
                    </h3>
                    <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-1">
                      {getMetricDisplay(top2).value}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">
                      {getMetricDisplay(top2).label}
                    </span>
                    <div className="mt-2 text-[10px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                      Hi: {top2.highest_break} • {top2.matches_won}W
                    </div>
                  </div>
                ) : <div />}

                {/* 1st Place Podium Hero Card (Taller, Prominent) */}
                <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-amber-400/10 via-white to-white dark:from-amber-400/10 dark:via-[#1c1c1e] dark:to-[#1c1c1e] border-2 border-amber-400/40 dark:border-amber-400/30 shadow-md flex flex-col items-center text-center relative -translate-y-1 sm:-translate-y-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-xs mb-2">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400" />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={top1.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top1.name}`}
                    alt={top1.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-amber-400 shadow-sm ring-4 ring-amber-400/20 mb-2"
                  />
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider mb-1">
                    Rank 1
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#f5f5f7] truncate max-w-full">
                    {top1.name}
                  </h3>
                  <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                    {getMetricDisplay(top1).value}
                  </div>
                  <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-tight font-medium">
                    {getMetricDisplay(top1).label}
                  </span>
                  <div className="mt-2 text-[10px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                    Hi: {top1.highest_break} • {top1.matches_won}W - {top1.matches_lost}L
                  </div>
                </div>

                {/* 3rd Place Podium Card */}
                {top3 ? (
                  <div className="rounded-2xl p-3.5 sm:p-4 bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col items-center text-center transition hover:border-black/20 dark:hover:border-white/20">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-700/15 border border-amber-700/30 flex items-center justify-center text-amber-700 dark:text-amber-500 shadow-xs mb-2">
                      <Medal className="w-4 h-4" />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={top3.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top3.name}`}
                      alt={top3.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-amber-700/40 dark:border-amber-700/60 shadow-xs mb-2"
                    />
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-[#f5f5f7] truncate max-w-full">
                      {top3.name}
                    </h3>
                    <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-1">
                      {getMetricDisplay(top3).value}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">
                      {getMetricDisplay(top3).label}
                    </span>
                    <div className="mt-2 text-[10px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                      Hi: {top3.highest_break} • {top3.matches_won}W
                    </div>
                  </div>
                ) : <div />}

              </div>
            </div>
          )}

          {/* Inset Grouped Table (Settings-Style) for all members */}
          <div className="space-y-2">
            <div className="text-[11px] sm:text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider px-1">
              All Members ({filteredEntries.length})
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm overflow-hidden">
              {/* Header labels for table */}
              <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-4 pl-2">Player</div>
                <div className="col-span-2 text-right">Matches</div>
                <div className="col-span-2 text-right">Win Rate</div>
                <div className="col-span-1 text-right">Frames</div>
                <div className="col-span-2 text-right pr-2">High Break</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {filteredEntries.map((player, index) => {
                  const rank = index + 1;
                  const isGold = rank === 1;
                  const isSilver = rank === 2;
                  const isBronze = rank === 3;

                  return (
                    <div
                      key={player.id}
                      className="min-h-[52px] px-3.5 sm:px-4 py-3 flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-2 sm:gap-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition active:scale-[0.99] cursor-default"
                    >
                      {/* Rank (Col 1) */}
                      <div className="col-span-1 flex items-center justify-start sm:justify-center">
                        {isGold ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-400/30">
                            1
                          </span>
                        ) : isSilver ? (
                          <span className="w-6 h-6 rounded-full bg-slate-400/20 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-400/30">
                            2
                          </span>
                        ) : isBronze ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-500 font-bold text-xs flex items-center justify-center border border-amber-700/30">
                            3
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 font-mono font-semibold text-xs sm:text-sm pl-1">
                            #{rank}
                          </span>
                        )}
                      </div>

                      {/* Player Info (Col 4) */}
                      <div className="col-span-4 flex items-center space-x-3 min-w-0 pl-1 sm:pl-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={player.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                          alt={player.name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-black/10 dark:border-white/10"
                        />
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-[#f5f5f7] truncate block">
                            {player.name}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 sm:hidden">
                            {player.matches_won}W - {player.matches_lost}L • {player.win_rate}%
                          </span>
                        </div>
                      </div>

                      {/* Matches (Col 2) */}
                      <div className="col-span-2 hidden sm:block text-right font-mono tabular-nums text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                        {player.matches_won}W - {player.matches_lost}L
                      </div>

                      {/* Win Rate (Col 2) */}
                      <div className="col-span-2 hidden sm:block text-right font-mono tabular-nums text-xs sm:text-sm font-bold text-emerald-600 dark:text-[#30d158]">
                        {player.win_rate}%
                      </div>

                      {/* Frames (Col 1) */}
                      <div className="col-span-1 hidden sm:block text-right font-mono tabular-nums text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                        {player.frames_won}-{player.frames_lost}
                      </div>

                      {/* High Break (Col 2) */}
                      <div className="col-span-2 flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pr-0 sm:pr-2 text-right">
                        <span className="text-zinc-400 text-xs sm:hidden">High Break:</span>
                        <div className="flex items-center space-x-1 font-mono tabular-nums text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 dark:fill-amber-400" />
                          <span>{player.highest_break}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* APPLE BOTTOM SHEET: ADD PLAYER MODAL                          */}
      {/* ------------------------------------------------------------- */}
      {isAddPlayerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#1c1c1e] rounded-t-[26px] sm:rounded-[26px] p-5 shadow-2xl border border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-white space-y-4">
            {/* Grabber Pill */}
            <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto" />

            {/* Navigation Bar */}
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <button
                type="button"
                onClick={() => setIsAddPlayerOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-sm font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="text-base font-bold text-zinc-900 dark:text-[#f5f5f7]">
                New Player
              </h3>
              <button
                type="submit"
                form="add-player-form"
                disabled={savingPlayer || !newPlayerName.trim()}
                className="text-emerald-600 dark:text-[#30d158] font-bold text-sm hover:opacity-80 disabled:opacity-40 transition cursor-pointer"
              >
                {savingPlayer ? 'Saving...' : 'Done'}
              </button>
            </div>

            <form id="add-player-form" onSubmit={handleAddPlayer} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. John Doe"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0091ff]/40 transition placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                The new player will be immediately added to the roster and ranked on the chart board.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* APPLE BOTTOM SHEET: HEAD TO HEAD MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {isH2HOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-t-[26px] sm:rounded-[26px] p-5 shadow-2xl border border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-white space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Grabber Pill */}
            <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto" />

            {/* Navigation Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <span className="w-12" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-[#f5f5f7] flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-emerald-600 dark:text-[#30d158]" />
                <span>Head-to-Head</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsH2HOpen(false)}
                className="text-[#0091ff] font-bold text-sm hover:opacity-80 transition cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Player Selection Dropdowns */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Player 1
                </label>
                <select
                  value={h2hPlayer1Id}
                  onChange={(e) => setH2HPlayer1Id(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0091ff]/40"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === h2hPlayer2Id} className="bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Player 2
                </label>
                <select
                  value={h2hPlayer2Id}
                  onChange={(e) => setH2HPlayer2Id(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0091ff]/40"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === h2hPlayer1Id} className="bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Stats */}
            {loadingH2H ? (
              <div className="py-8 text-center text-emerald-600 dark:text-[#30d158] text-xs font-semibold animate-pulse">
                Crunching head-to-head statistics...
              </div>
            ) : h2hStats ? (
              <div className="space-y-3 pt-1">
                {/* Visual Wins Comparison Card */}
                <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-center space-y-2">
                  <div className="text-[10px] uppercase text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider">
                    Total Matches Played: {h2hStats.matchesPlayed}
                  </div>
                  <div className="flex items-center justify-around py-1">
                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">
                        {h2hStats.player1.name}
                      </div>
                      <div className="text-3xl font-black text-emerald-600 dark:text-[#30d158] font-mono tabular-nums mt-0.5">
                        {h2hStats.p1MatchWins}
                      </div>
                      <div className="text-[11px] text-zinc-500">Wins</div>
                    </div>

                    <div className="text-lg font-bold text-zinc-400 dark:text-zinc-600">vs</div>

                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">
                        {h2hStats.player2.name}
                      </div>
                      <div className="text-3xl font-black text-emerald-600 dark:text-[#30d158] font-mono tabular-nums mt-0.5">
                        {h2hStats.p2MatchWins}
                      </div>
                      <div className="text-[11px] text-zinc-500">Wins</div>
                    </div>
                  </div>
                </div>

                {/* Granular Stats breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-center">
                    <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5 text-[11px]">Total Frames Won</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono tabular-nums text-sm">
                      {h2hStats.p1FrameWins} - {h2hStats.p2FrameWins}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-center">
                    <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5 text-[11px]">High Break in H2H</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums text-sm">
                      {h2hStats.p1HighestBreak} vs {h2hStats.p2HighestBreak}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-zinc-500 dark:text-zinc-400 text-xs">
                No head-to-head matches recorded between these two players yet.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
