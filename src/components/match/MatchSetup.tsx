'use client';

import React, { useState, useEffect } from 'react';
import { Player, Match } from '@/types/snooker';
import { fetchPlayers, saveNewMatch, createPlayer } from '@/lib/storage';
import { 
  Play, 
  Users, 
  Settings2, 
  UserPlus, 
  X, 
  Shuffle, 
  ArrowUp, 
  ArrowDown, 
  Plus,
  Zap
} from 'lucide-react';

interface MatchSetupProps {
  onStartMatch: (match: Match, players: Player[]) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ onStartMatch }) => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [bestOf, setBestOf] = useState<number>(3);
  const [redsCount, setRedsCount] = useState<number>(15);
  const [starting, setStarting] = useState(false);
  const [justShuffled, setJustShuffled] = useState(false);

  // Quick Add Player modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickNickname, setQuickNickname] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetchPlayers().then(data => {
      if (!isMounted) return;
      setAllPlayers(data);
      // Default to 1v1 with the first two members, allowing quick expansion
      setSelectedPlayers(data.slice(0, Math.min(data.length, 2)));
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick preset selector (2, 3, 4, or all roster players)
  const handleApplyPreset = (count: number) => {
    if (allPlayers.length < 2) return;
    const targetCount = Math.min(count, allPlayers.length);
    setSelectedPlayers(allPlayers.slice(0, targetCount));
  };

  // Set specific player as break off (#1)
  const handleSetBreakOff = (index: number) => {
    if (index === 0) return;
    setSelectedPlayers(prev => {
      const copy = [...prev];
      const [player] = copy.splice(index, 1);
      return [player, ...copy];
    });
  };

  // Move player up in sequence
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setSelectedPlayers(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Move player down in sequence
  const handleMoveDown = (index: number) => {
    if (index >= selectedPlayers.length - 1) return;
    setSelectedPlayers(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Remove player from sequence
  const handleRemovePlayer = (id: string) => {
    if (selectedPlayers.length <= 2) {
      alert('Snooker match requires a minimum of 2 players.');
      return;
    }
    setSelectedPlayers(prev => prev.filter(p => p.id !== id));
  };

  // Add player to sequence
  const handleAddPlayerToSequence = (player: Player) => {
    if (selectedPlayers.some(p => p.id === player.id)) return;
    setSelectedPlayers(prev => [...prev, player]);
  };

  // Randomise / Shuffle sequence
  const handleRandomiseSequence = () => {
    if (selectedPlayers.length < 2) return;
    setSelectedPlayers(prev => {
      if (prev.length === 2) {
        return [prev[1], prev[0]];
      }
      let shuffled = [...prev];
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = [...shuffled];
        for (let i = candidate.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        }
        if (candidate.some((p, idx) => p.id !== prev[idx]?.id)) {
          shuffled = candidate;
          break;
        }
      }
      return shuffled;
    });

    setJustShuffled(true);
    setTimeout(() => setJustShuffled(false), 1200);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const created = await createPlayer(quickName.trim(), quickNickname.trim() || undefined);
    setQuickName('');
    setQuickNickname('');
    setIsQuickAddOpen(false);
    setAllPlayers(prev => [...prev, created]);
    setSelectedPlayers(prev => [...prev, created]);
  };

  const handleStartMatch = async () => {
    if (selectedPlayers.length < 2) {
      alert('Please select at least 2 players for the match.');
      return;
    }

    setStarting(true);
    const playerIds = selectedPlayers.map(p => p.id);
    const newMatch = await saveNewMatch(playerIds, bestOf, redsCount);
    setStarting(false);
    onStartMatch(newMatch, selectedPlayers);
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

  const unselectedPlayers = allPlayers.filter(
    p => !selectedPlayers.some(sp => sp.id === p.id)
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 mb-1">
          <Settings2 className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Setup Snooker Match
        </h2>
        <p className="text-xs sm:text-sm text-gray-400">
          Supports 1v1 and multiplayer snooker (2 or more players). Select player sequence and break rules.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-emerald-400 font-semibold animate-pulse">
          Loading player roster...
        </div>
      ) : (
        <div className="bg-[#0d1712] border border-emerald-900/40 rounded-3xl p-4 sm:p-7 shadow-2xl space-y-6">
          
          {/* Player Sequence Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-950/80 pb-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Player Sequence & Rotation ({selectedPlayers.length} Players)
                </label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Players will take turns in this exact sequence. Order 1 breaks off.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {/* RANDOMISE BUTTON */}
                <button
                  type="button"
                  onClick={handleRandomiseSequence}
                  title="Randomly shuffle the sequence of players"
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                    justShuffled
                      ? 'bg-amber-500 text-black border-amber-400 scale-105'
                      : 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-700/50 hover:border-emerald-500 shadow-sm'
                  }`}
                >
                  <Shuffle className={`w-3.5 h-3.5 ${justShuffled ? 'animate-spin' : ''}`} />
                  <span>{justShuffled ? 'Shuffled!' : 'Randomise Sequence'}</span>
                </button>

                {/* ADD NEW FRIEND */}
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1 transition"
                  title="Add a new friend to roster"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Add Friend</span>
                </button>
              </div>
            </div>

            {/* Quick Player Count Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <span className="text-[11px] font-semibold text-gray-400 mr-1">Quick Select:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(2)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                  selectedPlayers.length === 2
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-gray-900/70 text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                1v1 (2 Players)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(3)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                  selectedPlayers.length === 3
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-gray-900/70 text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                3-Player Ring
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(4)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                  selectedPlayers.length === 4
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-gray-900/70 text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                4 Players
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(allPlayers.length)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                  selectedPlayers.length === allPlayers.length
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-gray-900/70 text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                All Members ({allPlayers.length})
              </button>
            </div>

            {/* Sequence List */}
            <div className="space-y-2">
              {selectedPlayers.map((player, idx) => {
                const isBreakOff = idx === 0;
                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                      isBreakOff
                        ? 'bg-gradient-to-r from-[#122c1d] to-[#0e2116] border-emerald-500/60 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/30'
                        : 'bg-[#112218] border-emerald-900/40 hover:border-emerald-800/60'
                    }`}
                  >
                    {/* Order Badge + Player Info */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center flex-shrink-0 ${
                        isBreakOff
                          ? 'bg-emerald-500 text-black shadow'
                          : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                      }`}>
                        #{idx + 1}
                      </div>

                      {player.avatar_url && (
                        <img
                          src={player.avatar_url}
                          alt={player.name}
                          className="w-8 h-8 rounded-full border border-emerald-600/40 object-cover flex-shrink-0 hidden xs:block"
                        />
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm font-bold text-white truncate">
                            {player.name}
                          </span>
                          {isBreakOff ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 fill-emerald-400" /> Breaks Off
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetBreakOff(idx)}
                              title="Make this player break off (#1)"
                              className="px-1.5 py-0.2 rounded text-[10px] font-semibold text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-950/80 border border-emerald-800/30 transition hidden sm:inline-flex items-center gap-0.5"
                            >
                              Make #1
                            </button>
                          )}
                        </div>
                        {player.nickname && (
                          <p className="text-[11px] text-gray-400 truncate">
                            &ldquo;{player.nickname}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sequence Control Buttons */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        title="Move Earlier in Turn Sequence"
                        className="p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === selectedPlayers.length - 1}
                        title="Move Later in Turn Sequence"
                        className="p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(player.id)}
                        disabled={selectedPlayers.length <= 2}
                        title={selectedPlayers.length <= 2 ? 'Minimum 2 players required' : 'Exclude player from this match'}
                        className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-red-200 disabled:opacity-20 disabled:cursor-not-allowed border border-red-800/30 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Unselected Players from Roster */}
            {unselectedPlayers.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">
                  Available Members (Tap to add to match sequence):
                </span>
                <div className="flex flex-wrap gap-2">
                  {unselectedPlayers.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddPlayerToSequence(p)}
                      className="px-3 py-1.5 rounded-xl bg-gray-900/80 hover:bg-emerald-950/70 border border-gray-800 hover:border-emerald-600/50 text-xs font-medium text-gray-300 hover:text-emerald-300 transition flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              disabled={starting || selectedPlayers.length < 2}
              onClick={handleStartMatch}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>
                {starting 
                  ? 'Initializing Match...' 
                  : `Start Match (${selectedPlayers.length} Players • ${selectedPlayers[0]?.name || ''} Breaks)`}
              </span>
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
                  Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lightning"
                  value={quickNickname}
                  onChange={(e) => setQuickNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickName.trim()}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  Save & Include
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
