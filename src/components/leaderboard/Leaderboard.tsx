'use client';

import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, Player, HeadToHeadStats } from '@/types/snooker';
import { fetchLeaderboard, fetchPlayers, createPlayer, fetchHeadToHead } from '@/lib/storage';
import { 
  Trophy, 
  Flame, 
  UserPlus, 
  Users, 
  Search, 
  ArrowUpDown, 
  Percent, 
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
    loadData();
  }, []);

  // Handle H2H query
  useEffect(() => {
    if (isH2HOpen && h2hPlayer1Id && h2hPlayer2Id && h2hPlayer1Id !== h2hPlayer2Id) {
      setLoadingH2H(true);
      fetchHeadToHead(h2hPlayer1Id, h2hPlayer2Id).then((res) => {
        setH2HStats(res);
        setLoadingH2H(false);
      });
    }
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
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              The Chart Board
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-400/80 mt-0.5">
            Group snooker rankings, win rates, and all-time highest breaks
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Head to Head Button */}
          <button
            onClick={() => setIsH2HOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-emerald-950/70 border border-emerald-600/40 hover:bg-emerald-900/60 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition"
          >
            <Swords className="w-4 h-4 text-emerald-400" />
            <span>Head-to-Head</span>
          </button>

          {/* Add Friend Button */}
          <button
            onClick={() => setIsAddPlayerOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-950 transition"
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
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search friend by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0d1712] border border-emerald-900/40 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Sort Pill Buttons */}
        <div className="flex items-center space-x-1.5 bg-[#0d1712] p-1 rounded-xl border border-emerald-900/40 self-end sm:self-auto">
          <button
            onClick={() => setSortBy('matches_won')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              sortBy === 'matches_won'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Wins
          </button>
          <button
            onClick={() => setSortBy('win_rate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              sortBy === 'win_rate'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Win %
          </button>
          <button
            onClick={() => setSortBy('highest_break')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              sortBy === 'highest_break'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            High Break
          </button>
        </div>

      </div>

      {/* Leaderboard Table / Cards */}
      {loading ? (
        <div className="text-center py-12 text-emerald-400 font-semibold animate-pulse">
          Loading group rankings...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-[#0c1611] rounded-2xl border border-emerald-900/30 text-gray-400">
          <p className="text-sm">No players found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEntries.map((player, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const medalColor = 
              rank === 1 ? 'text-yellow-400 fill-yellow-400' :
              rank === 2 ? 'text-slate-300 fill-slate-300' :
              rank === 3 ? 'text-amber-600 fill-amber-600' : 'text-gray-500';

            return (
              <div
                key={player.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  rank === 1
                    ? 'bg-gradient-to-r from-[#173822] to-[#0c1f14] border-yellow-500/40 shadow-lg shadow-yellow-950/20'
                    : 'bg-[#0d1712] border-emerald-900/30 hover:border-emerald-700/50'
                }`}
              >
                {/* Left: Rank & Player info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 flex-shrink-0 text-center font-mono font-black text-sm sm:text-base flex items-center justify-center">
                    {isTop3 ? (
                      <Medal className={`w-6 h-6 ${medalColor}`} />
                    ) : (
                      <span className="text-gray-400">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={player.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                    alt={player.name}
                    className="w-10 h-10 rounded-full border border-emerald-600/40 object-cover flex-shrink-0"
                  />

                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {player.name}
                    </h3>
                    {player.nickname && (
                      <p className="text-xs text-emerald-400 font-medium truncate">
                        "{player.nickname}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Stats Grid */}
                <div className="mt-3 sm:mt-0 grid grid-cols-4 sm:flex sm:items-center gap-2 sm:gap-6 text-center border-t sm:border-t-0 border-emerald-900/30 pt-2 sm:pt-0">
                  
                  {/* Matches W - L */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
                      Matches
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white font-mono">
                      {player.matches_won}W - {player.matches_lost}L
                    </span>
                  </div>

                  {/* Win % */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
                      Win %
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                      {player.win_rate}%
                    </span>
                  </div>

                  {/* Frames W - L */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
                      Frames
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-gray-300 font-mono">
                      {player.frames_won}-{player.frames_lost}
                    </span>
                  </div>

                  {/* High Break */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
                      High Break
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-400 font-mono flex items-center justify-center gap-0.5">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1913] border border-emerald-600/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Add New Friend
              </h3>
              <button 
                onClick={() => setIsAddPlayerOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlayer} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Rocket, Cue Master"
                  value={newPlayerNickname}
                  onChange={(e) => setNewPlayerNickname(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlayer || !newPlayerName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1610] border border-emerald-600/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <div className="flex items-center space-x-2">
                <Swords className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Head-to-Head Comparison
                </h3>
              </div>
              <button 
                onClick={() => setIsH2HOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Player Selection Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Player 1
                </label>
                <select
                  value={h2hPlayer1Id}
                  onChange={(e) => setH2HPlayer1Id(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs sm:text-sm"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === h2hPlayer2Id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Player 2
                </label>
                <select
                  value={h2hPlayer2Id}
                  onChange={(e) => setH2HPlayer2Id(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs sm:text-sm"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === h2hPlayer1Id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Stats */}
            {loadingH2H ? (
              <div className="py-8 text-center text-emerald-400 text-sm animate-pulse">
                Crunching head-to-head statistics...
              </div>
            ) : h2hStats ? (
              <div className="space-y-3 pt-2">
                
                {/* Match Wins Visual comparison */}
                <div className="p-4 rounded-xl bg-[#102419] border border-emerald-800/40 text-center space-y-2">
                  <div className="text-xs uppercase text-gray-400 font-bold tracking-wider">
                    Total Matches Played: {h2hStats.matchesPlayed}
                  </div>
                  <div className="flex items-center justify-around">
                    <div>
                      <div className="text-sm font-bold text-white truncate max-w-[120px]">
                        {h2hStats.player1.name}
                      </div>
                      <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                        {h2hStats.p1MatchWins}
                      </div>
                      <div className="text-[11px] text-gray-400">Wins</div>
                    </div>

                    <div className="text-xl font-bold text-gray-600">vs</div>

                    <div>
                      <div className="text-sm font-bold text-white truncate max-w-[120px]">
                        {h2hStats.player2.name}
                      </div>
                      <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                        {h2hStats.p2MatchWins}
                      </div>
                      <div className="text-[11px] text-gray-400">Wins</div>
                    </div>
                  </div>
                </div>

                {/* Granular Stats breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-gray-900/60 rounded-xl border border-gray-800 text-center">
                    <span className="text-gray-400 block mb-0.5">Total Frames Won</span>
                    <span className="font-bold text-white font-mono">
                      {h2hStats.p1FrameWins} - {h2hStats.p2FrameWins}
                    </span>
                  </div>

                  <div className="p-2.5 bg-gray-900/60 rounded-xl border border-gray-800 text-center">
                    <span className="text-gray-400 block mb-0.5">High Break in H2H</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {h2hStats.p1HighestBreak} vs {h2hStats.p2HighestBreak}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-6 text-center text-gray-400 text-xs">
                No head-to-head matches recorded between these two players yet.
              </div>
            )}

            <button
              onClick={() => setIsH2HOpen(false)}
              className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
