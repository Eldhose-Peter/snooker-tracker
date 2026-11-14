'use client';

import React, { useState, useEffect } from 'react';
import { Player, Match } from '@/types/snooker';
import { fetchPlayers, saveNewMatch, createPlayer } from '@/lib/storage';
import { Play, Users, Settings2, UserPlus, X, Sparkles } from 'lucide-react';

interface MatchSetupProps {
  onStartMatch: (match: Match, p1: Player, p2: Player) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ onStartMatch }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [p1Id, setP1Id] = useState<string>('');
  const [p2Id, setP2Id] = useState<string>('');
  const [bestOf, setBestOf] = useState<number>(3);
  const [redsCount, setRedsCount] = useState<number>(15);
  const [starting, setStarting] = useState(false);

  // Quick Add Player modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickNickname, setQuickNickname] = useState('');

  const loadPlayers = async () => {
    setLoading(true);
    const data = await fetchPlayers();
    setPlayers(data);
    if (data.length >= 2) {
      setP1Id(data[0].id);
      setP2Id(data[1].id);
    } else if (data.length === 1) {
      setP1Id(data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const created = await createPlayer(quickName.trim(), quickNickname.trim() || undefined);
    setQuickName('');
    setQuickNickname('');
    setIsQuickAddOpen(false);
    await loadPlayers();
    if (!p1Id) setP1Id(created.id);
    else if (!p2Id) setP2Id(created.id);
  };

  const handleStartMatch = async () => {
    if (!p1Id || !p2Id || p1Id === p2Id) {
      alert('Please select two distinct players for the match.');
      return;
    }

    const p1 = players.find(p => p.id === p1Id);
    const p2 = players.find(p => p.id === p2Id);

    if (!p1 || !p2) return;

    setStarting(true);
    const newMatch = await saveNewMatch(p1Id, p2Id, bestOf, redsCount);
    setStarting(false);
    onStartMatch(newMatch, p1, p2);
  };

  const formatOptions = [
    { value: 1, label: 'Single Frame (1 Frame)' },
    { value: 3, label: 'Best of 3 (First to 2)' },
    { value: 5, label: 'Best of 5 (First to 3)' },
    { value: 7, label: 'Best of 7 (First to 4)' },
  ];

  const redsOptions = [
    { value: 15, label: '15 Reds (Standard Snooker, 147 Max)' },
    { value: 10, label: '10 Reds (Faster Game)' },
    { value: 6, label: '6 Reds (Quick Shootout)' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 mb-1">
          <Settings2 className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Setup New Snooker Match
        </h2>
        <p className="text-xs sm:text-sm text-gray-400">
          Select opponents, match length, and table rules before breaking off
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-emerald-400 font-semibold animate-pulse">
          Loading player roster...
        </div>
      ) : (
        <div className="bg-[#0d1712] border border-emerald-900/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          
          {/* Players Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Select Combatants
              </label>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Friend</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              
              {/* Player 1 Selection */}
              <div className="p-3.5 rounded-2xl bg-[#112218] border border-emerald-800/40 space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase block">
                  Player 1 (Breaks Off)
                </span>
                <select
                  value={p1Id}
                  onChange={(e) => setP1Id(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>Choose Player 1</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === p2Id}>
                      {p.name} {p.nickname ? `("${p.nickname}")` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Player 2 Selection */}
              <div className="p-3.5 rounded-2xl bg-[#112218] border border-emerald-800/40 space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase block">
                  Player 2
                </span>
                <select
                  value={p2Id}
                  onChange={(e) => setP2Id(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>Choose Player 2</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === p1Id}>
                      {p.name} {p.nickname ? `("${p.nickname}")` : ''}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Match Length / Best Of */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
              Match Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBestOf(opt.value)}
                  className={`p-3 rounded-xl border text-center transition ${
                    bestOf === opt.value
                      ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-md shadow-emerald-950'
                      : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <span className="text-sm font-bold block">{opt.value === 1 ? 'Single Frame' : `Best of ${opt.value}`}</span>
                  <span className="text-[10px] text-gray-300/80 block mt-0.5">
                    {opt.value === 1 ? '1 to win' : `${Math.ceil(opt.value / 2)} to win`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Red Balls Count */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
              Red Balls on Table
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {redsOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRedsCount(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2.5 ${
                    redsCount === opt.value
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-sm'
                      : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-red-600 flex-shrink-0 shadow-sm" />
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Start Match CTA */}
          <div className="pt-2">
            <button
              type="button"
              disabled={starting || !p1Id || !p2Id || p1Id === p2Id}
              onClick={handleStartMatch}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>{starting ? 'Initializing Match...' : 'Break Off & Start Match'}</span>
            </button>
          </div>

        </div>
      )}

      {/* Quick Add Friend Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1913] border border-emerald-600/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Add Player to Roster
              </h3>
              <button 
                onClick={() => setIsQuickAddOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Smith"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Whirlwind"
                  value={quickNickname}
                  onChange={(e) => setQuickNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickName.trim()}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
