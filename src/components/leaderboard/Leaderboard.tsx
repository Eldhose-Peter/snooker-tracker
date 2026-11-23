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
  const [newPlayerNickname, setNewPlayerNickname] = useState('');
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Head-to-Head Modal State
  const [isH2HOpen, setIsH2HOpen] = useState(false);
  const [h2hPlayer1Id, setH2HPlayer1Id] = useState('');
  const [h2hPlayer2Id, setH2HPlayer2Id] = useState('');
  const [h2hStats, setH2HStats] = useState<HeadToHeadStats | null>(null);
  const [loadingH2H, setLoadingH2H] = useState(false);

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
    let isMounted = true;
    if (isH2HOpen && h2hPlayer1Id && h2hPlayer2Id && h2hPlayer1Id !== h2hPlayer2Id) {
      setLoadingH2H(true);
      fetchHeadToHead(h2hPlayer1Id, h2hPlayer2Id).then((res) => {
        if (!isMounted) return;
        setH2HStats(res);
        setLoadingH2H(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isH2HOpen, h2hPlayer1Id, h2hPlayer2Id]);

  // Handle Add Player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setSavingPlayer(true);
    await createPlayer(newPlayerName.trim(), newPlayerNickname.trim() || undefined);
    setNewPlayerName('');
    setNewPlayerNickname('');
    setIsAddPlayerOpen(false);
    setSavingPlayer(false);
    await loadData();
  };

  // Filter and sort entries
  const filteredEntries = entries
    .filter((e) => {
      const q = searchQuery.toLowerCase();
      return e.name.toLowerCase().includes(q) || (e.nickname && e.nickname.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === 'win_rate') return b.win_rate - a.win_rate || b.matches_won - a.matches_won;
      if (sortBy === 'highest_break') return b.highest_break - a.highest_break || b.matches_won - a.matches_won;
      return b.matches_won - a.matches_won || b.win_rate - a.win_rate;
    });

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-4 space-y-4 sm:space-y-6 flex-1 flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              The Chart Board
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Group snooker rankings, win rates, and all-time highest breaks
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Head to Head Button */}
          <button
            onClick={() => setIsH2HOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition active:scale-[0.98] border border-black/[0.08] dark:border-white/[0.08] shadow-xs cursor-pointer"
          >
            <Swords className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Head-to-Head</span>
          </button>

          {/* Add Friend Button */}
          <button
            onClick={() => setIsAddPlayerOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 transition active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search friend by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0c130f]/80 border border-black/[0.08] dark:border-white/[0.06] text-zinc-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-xs dark:shadow-none"
          />
        </div>

        {/* Sort Pill Buttons */}
        <div className="flex items-center space-x-1 bg-black/[0.04] dark:bg-black/40 p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.06] self-end sm:self-auto">
          <button
            onClick={() => setSortBy('matches_won')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer ${
              sortBy === 'matches_won'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-600/30 dark:border-emerald-500/30 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Wins
          </button>
          <button
            onClick={() => setSortBy('win_rate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer ${
              sortBy === 'win_rate'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-600/30 dark:border-emerald-500/30 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Win %
          </button>
          <button
            onClick={() => setSortBy('highest_break')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer ${
              sortBy === 'highest_break'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-600/30 dark:border-emerald-500/30 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            High Break
          </button>
        </div>

      </div>

      {/* Leaderboard Table / Cards */}
      {loading ? (
        <div className="text-center py-12 text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
          Loading group rankings...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 glass-panel rounded-2xl text-zinc-500 dark:text-zinc-400 border border-black/[0.08] dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
          <p className="text-sm">No players found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEntries.map((player, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const medalColor = 
              rank === 1 ? 'text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400' :
              rank === 2 ? 'text-slate-400 fill-slate-400 dark:text-slate-300 dark:fill-slate-300' :
              rank === 3 ? 'text-amber-700 fill-amber-700 dark:text-amber-600 dark:fill-amber-600' : 'text-zinc-400 dark:text-zinc-500';

            return (
              <div
                key={player.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  rank === 1
                    ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-emerald-500/[0.04] dark:from-amber-500/[0.08] dark:via-[#0c1f14]/80 dark:to-[#070e0a]/90 border-amber-500/40 dark:border-amber-500/30 shadow-md'
                    : 'glass-panel hover:border-black/20 dark:hover:border-white/[0.12] bg-white/85 dark:bg-[#0c130f]/70 border-black/[0.08] dark:border-white/[0.08] shadow-xs dark:shadow-none'
                }`}
              >
                {/* Left: Rank & Player info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 flex-shrink-0 text-center font-mono font-black text-sm sm:text-base flex items-center justify-center">
                    {isTop3 ? (
                      <Medal className={`w-6 h-6 ${medalColor}`} />
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={player.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                    alt={player.name}
                    className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${
                      rank === 1 ? 'border-2 border-amber-400/80 ring-2 ring-amber-400/20' : 'border border-black/10 dark:border-white/10'
                    }`}
                  />

                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                      {player.name}
                    </h3>
                    {player.nickname && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400/90 font-medium truncate">
                        &ldquo;{player.nickname}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Stats Grid */}
                <div className="mt-3 sm:mt-0 grid grid-cols-4 sm:flex sm:items-center gap-2 sm:gap-6 text-center border-t sm:border-t-0 border-black/[0.06] dark:border-white/[0.06] pt-2 sm:pt-0">
                  
                  {/* Matches W - L */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold block">
                      Matches
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono tabular-nums">
                      {player.matches_won}W - {player.matches_lost}L
                    </span>
                  </div>

                  {/* Win % */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold block">
                      Win %
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                      {player.win_rate}%
                    </span>
                  </div>

                  {/* Frames W - L */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold block">
                      Frames
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono tabular-nums">
                      {player.frames_won}-{player.frames_lost}
                    </span>
                  </div>

                  {/* High Break */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold block">
                      High Break
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums flex items-center justify-center gap-0.5">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                      {player.highest_break}
                    </span>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD PLAYER MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAddPlayerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 bg-white dark:bg-[#0c140f] border border-black/[0.08] dark:border-white/10 text-zinc-900 dark:text-white rounded-3xl">
            <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Add New Friend
              </h3>
              <button 
                onClick={() => setIsAddPlayerOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg transition hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlayer} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-300 dark:border-white/[0.08] text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Rocket, Cue Master"
                  value={newPlayerNickname}
                  onChange={(e) => setNewPlayerNickname(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-300 dark:border-white/[0.08] text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-sm font-semibold transition active:scale-[0.98] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlayer || !newPlayerName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-sm font-bold shadow-md shadow-emerald-950/40 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {savingPlayer ? 'Saving...' : 'Save Friend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HEAD TO HEAD MODAL */}
      {/* ------------------------------------------------------------- */}
      {isH2HOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 bg-white dark:bg-[#0c140f] border border-black/[0.08] dark:border-white/10 text-zinc-900 dark:text-white rounded-3xl">
            
            <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3">
              <div className="flex items-center space-x-2">
                <Swords className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  Head-to-Head Comparison
                </h3>
              </div>
              <button 
                onClick={() => setIsH2HOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg transition hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Player Selection Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Player 1
                </label>
                <select
                  value={h2hPlayer1Id}
                  onChange={(e) => setH2HPlayer1Id(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-300 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500/60"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === h2hPlayer2Id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Player 2
                </label>
                <select
                  value={h2hPlayer2Id}
                  onChange={(e) => setH2HPlayer2Id(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-300 dark:border-white/[0.08] text-zinc-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500/60"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === h2hPlayer1Id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Stats */}
            {loadingH2H ? (
              <div className="py-8 text-center text-emerald-600 dark:text-emerald-400 text-sm animate-pulse">
                Crunching head-to-head statistics...
              </div>
            ) : h2hStats ? (
              <div className="space-y-3 pt-2">
                
                {/* Match Wins Visual comparison */}
                <div className="p-4 rounded-2xl glass-panel border border-black/[0.08] dark:border-white/[0.06] text-center space-y-2 bg-zinc-50/80 dark:bg-[#09110d]/80">
                  <div className="text-xs uppercase text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
                    Total Matches Played: {h2hStats.matchesPlayed}
                  </div>
                  <div className="flex items-center justify-around">
                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">
                        {h2hStats.player1.name}
                      </div>
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
                        {h2hStats.p1MatchWins}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Wins</div>
                    </div>

                    <div className="text-xl font-bold text-zinc-400 dark:text-zinc-600">vs</div>

                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">
                        {h2hStats.player2.name}
                      </div>
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
                        {h2hStats.p2MatchWins}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Wins</div>
                    </div>
                  </div>
                </div>

                {/* Granular Stats breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 glass-panel rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-center bg-white dark:bg-black/30 shadow-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">Total Frames Won</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono tabular-nums">
                      {h2hStats.p1FrameWins} - {h2hStats.p2FrameWins}
                    </span>
                  </div>

                  <div className="p-2.5 glass-panel rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-center bg-white dark:bg-black/30 shadow-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">High Break in H2H</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
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

            <button
              onClick={() => setIsH2HOpen(false)}
              className="w-full py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
