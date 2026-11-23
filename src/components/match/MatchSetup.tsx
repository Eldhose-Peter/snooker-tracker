'use client';

import React, { useState, useEffect } from 'react';
import { Player, Match } from '@/types/snooker';
import { fetchPlayers, saveNewMatch, createPlayer, getLiveSession, abandonMatch, ActiveLiveSession } from '@/lib/storage';
import { 
  Play, 
  UserPlus, 
  X, 
  Shuffle, 
  ArrowLeftRight, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MatchSetupProps {
  onStartMatch: (match: Match, players: Player[]) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ onStartMatch }) => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveLiveSession | null>(null);

  // Match configuration: Default match format to 'Single Frame' (1 frame)
  const [bestOf, setBestOf] = useState<number>(1);
  const [redsCount, setRedsCount] = useState<number>(15);
  const [starting, setStarting] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Quick Add Player Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickNickname, setQuickNickname] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetchPlayers().then(data => {
      if (!isMounted) return;
      const session = getLiveSession();
      if (session && session.match && session.players && session.players.length >= 2) {
        setActiveSession(session);
      }
      setAllPlayers(data);
      // Default to the first two players (Eldho and Thoma)
      if (data.length >= 2) {
        setSelectedPlayers([data[0], data[1]]);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Tap member: Add or remove from match
  const handleTogglePlayer = (player: Player) => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    if (isSelected) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      if (selectedPlayers.length >= 6) return;
      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  // Reordering: Randomise order
  const handleRandomise = () => {
    if (selectedPlayers.length < 2) return;
    setIsShuffling(true);
    setSelectedPlayers(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setTimeout(() => setIsShuffling(false), 450);
  };

  // Reordering: Swap breaker (#1 & #2)
  const handleSwapBreaker = () => {
    if (selectedPlayers.length < 2) return;
    setSelectedPlayers(prev => {
      const copy = [...prev];
      const temp = copy[0];
      copy[0] = copy[1];
      copy[1] = temp;
      return copy;
    });
  };

  // Reordering: Shift player left/right in sequence
  const handleShiftPlayer = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedPlayers.length) return;
    setSelectedPlayers(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Quick Add Friend
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const created = await createPlayer(quickName.trim(), quickNickname.trim() || undefined);
    setQuickName('');
    setQuickNickname('');
    setIsQuickAddOpen(false);
    setAllPlayers(prev => [...prev, created]);
    if (selectedPlayers.length < 6) {
      setSelectedPlayers(prev => [...prev, created]);
    }
  };

  // Start Match
  const handleStartMatch = async () => {
    if (selectedPlayers.length < 2) return;
    setStarting(true);
    const playerIds = selectedPlayers.map(p => p.id);
    const newMatch = await saveNewMatch(playerIds, bestOf, redsCount);
    setStarting(false);
    onStartMatch(newMatch, selectedPlayers);
  };

  // Resume In-Progress Match
  const handleResumeSession = () => {
    if (!activeSession) return;
    onStartMatch(activeSession.match, activeSession.players);
  };

  // Abandon In-Progress Match
  const handleAbandonSession = async () => {
    if (!activeSession) return;
    if (window.confirm('Are you sure you want to discard the active match?')) {
      await abandonMatch(activeSession.match.id);
      setActiveSession(null);
    }
  };

  const formatOptions = [
    { value: 1, label: 'Single Frame' },
    { value: 3, label: 'Best of 3' },
    { value: 5, label: 'Best of 5' },
  ];

  const redsOptions = [
    { value: 15, label: '15 Reds' },
    { value: 10, label: '10 Reds' },
    { value: 6, label: '6 Reds' },
  ];

  const isValidMatch = selectedPlayers.length >= 2;

  return (
    <div className="w-full max-w-md mx-auto px-3.5 sm:px-4 py-2 space-y-3 animate-fade-in">
      
      {/* ------------------------------------------------------------- */}
      {/* ACTIVE LIVE MATCH BANNER (COMPACT RESUME PROMPT)              */}
      {/* ------------------------------------------------------------- */}
      {activeSession && (
        <div className="glass-panel rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2.5 border-emerald-500/30 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <div className="min-w-0 text-xs">
              <span className="font-bold text-white truncate block">
                Resume: {activeSession.players.map(p => p.name).join(' vs ')}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">
                Frame {activeSession.currentFrameNum} in progress
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleAbandonSession}
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-rose-950/40 border border-white/[0.08] text-zinc-400 hover:text-rose-300 text-[11px] font-medium transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleResumeSession}
              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] shadow-md shadow-emerald-950/60 transition flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Play className="w-3 h-3 fill-black" />
              <span>Resume</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HEADER & ROSTER MEMBER SELECTION (1 TAP TO PICK PLAYERS)      */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Select Players</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/25 font-semibold">
                {selectedPlayers.length} of {allPlayers.length} selected
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Tap members to add or remove (2 to 6 players)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="Add a new friend to roster"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add</span>
          </button>
        </div>

        {loading ? (
          <div className="py-6 text-center text-emerald-400 text-xs font-medium animate-pulse">
            Loading roster…
          </div>
        ) : (
          /* Unified interactive member grid */
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {allPlayers.map((p) => {
              const selectedIndex = selectedPlayers.findIndex(sp => sp.id === p.id);
              const isSelected = selectedIndex !== -1;
              const isBreaker = selectedIndex === 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePlayer(p)}
                  className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center relative cursor-pointer select-none active:scale-[0.96] ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#133020] to-[#0a1e13] border-emerald-400/60 ring-1 ring-emerald-400/40 text-white shadow-lg shadow-emerald-950/50'
                      : 'bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Order indicator badge */}
                  {isSelected ? (
                    <span className={`absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-tight shadow ${
                      isBreaker 
                        ? 'bg-emerald-400 text-black ring-1 ring-emerald-300' 
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {isBreaker ? '#1 BREAK' : `#${selectedIndex + 1}`}
                    </span>
                  ) : (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-500 text-[9px] flex items-center justify-center">
                      +
                    </span>
                  )}

                  <span className="text-xs sm:text-sm font-bold truncate w-full">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-zinc-400/90 truncate w-full mt-0.5">
                    {p.nickname || 'Member'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PLAYING SEQUENCE & REORDER / RANDOMISE CONTROLS               */}
      {/* ------------------------------------------------------------- */}
      <div className="glass-panel rounded-2xl p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Turn Order (#1 Breaks Off)
          </span>

          <div className="flex items-center gap-1.5">
            {selectedPlayers.length === 2 && (
              <button
                type="button"
                onClick={handleSwapBreaker}
                className="px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-semibold text-zinc-300 hover:text-white flex items-center gap-1 transition cursor-pointer active:scale-95"
                title="Swap who breaks off"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                <span>Swap</span>
              </button>
            )}

            {selectedPlayers.length >= 2 && (
              <button
                type="button"
                onClick={handleRandomise}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                  isShuffling
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/30 text-emerald-300'
                }`}
                title="Randomise turn sequence"
              >
                <Shuffle className={`w-3 h-3 ${isShuffling ? 'animate-spin' : ''}`} />
                <span>Shuffle</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected sequence pills with quick reorder arrows */}
        {selectedPlayers.length === 0 ? (
          <p className="text-center py-2 text-xs text-zinc-500">
            Tap members above to select players
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedPlayers.map((player, idx) => {
              const isBreaker = idx === 0;
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    isBreaker
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-300'
                  }`}
                >
                  <span className={`text-[10px] font-mono font-bold ${
                    isBreaker ? 'text-emerald-400' : 'text-zinc-500'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-bold">{player.name}</span>
                  {isBreaker && (
                    <span className="text-[8px] bg-emerald-400 text-black font-black px-1 rounded uppercase">
                      Break
                    </span>
                  )}

                  {/* Move Left / Right Arrows when multiple players */}
                  {selectedPlayers.length > 2 && (
                    <div className="flex items-center ml-0.5">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleShiftPlayer(idx, 'left', e)}
                          className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-white/[0.08] cursor-pointer"
                          title="Move earlier"
                          aria-label={`Move ${player.name} earlier`}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {idx < selectedPlayers.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleShiftPlayer(idx, 'right', e)}
                          className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-white/[0.08] cursor-pointer"
                          title="Move later"
                          aria-label={`Move ${player.name} later`}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTogglePlayer(player)}
                    className="p-0.5 text-zinc-500 hover:text-rose-400 rounded transition ml-0.5 cursor-pointer"
                    title="Remove"
                    aria-label={`Remove ${player.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MATCH SETTINGS: FORMAT & REDS (APPLE-STYLE SEGMENTED PILLS)  */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2">
        {/* Frame Length */}
        <div className="glass-panel rounded-2xl p-2 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block px-1">
            Format
          </label>
          <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.05]">
            {formatOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBestOf(opt.value)}
                className={`py-1.5 px-1 rounded-lg text-center transition cursor-pointer text-xs font-semibold leading-tight active:scale-95 ${
                  bestOf === opt.value
                    ? 'bg-emerald-600 text-white shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reds Count */}
        <div className="glass-panel rounded-2xl p-2 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block px-1">
            Reds
          </label>
          <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.05]">
            {redsOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRedsCount(opt.value)}
                className={`py-1.5 px-1 rounded-lg text-center transition cursor-pointer text-xs font-semibold leading-tight active:scale-95 ${
                  redsCount === opt.value
                    ? 'bg-emerald-600 text-white shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* THE BIG START MATCH BUTTON RADIATING IN CIRCLES               */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
        
        {/* Animated concentric ripple rings radiating outward */}
        {isValidMatch && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-4">
            <div className="w-28 h-28 sm:w-32 sm:h-32 radiating-circle border-2 border-emerald-400/60 radiating-ring-1" />
            <div className="w-28 h-28 sm:w-32 sm:h-32 radiating-circle border-2 border-emerald-500/40 radiating-ring-2" />
            <div className="w-28 h-28 sm:w-32 sm:h-32 radiating-circle border border-emerald-300/30 radiating-ring-3" />
          </div>
        )}

        {/* The BIG Button */}
        <button
          type="button"
          disabled={starting || !isValidMatch}
          onClick={handleStartMatch}
          className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer select-none ${
            isValidMatch
              ? 'bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-600 hover:from-emerald-200 hover:to-emerald-400 text-black start-btn-radiate ring-2 ring-white/30'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/[0.06] opacity-50'
          }`}
          title={isValidMatch ? 'Start Snooker Match' : 'Select at least 2 players'}
        >
          <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-black ml-0.5 mb-0.5 drop-shadow-sm" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none text-black">
            {starting ? 'Starting…' : 'Start'}
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-none text-emerald-950 mt-0.5">
            Match
          </span>
        </button>

        {/* Matchup Summary Badge directly below radiating button */}
        <div className="mt-2.5 text-center">
          {isValidMatch ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-300 font-semibold shadow-md">
              <span className="font-bold text-white">
                {selectedPlayers.length === 2
                  ? `${selectedPlayers[0].name} vs ${selectedPlayers[1].name}`
                  : selectedPlayers.map(p => p.name).join(' → ')}
              </span>
              <span className="text-emerald-500/80">•</span>
              <span className="text-zinc-300 font-normal">
                {bestOf === 1 ? '1 Frame' : `Best of ${bestOf}`} ({redsCount} Reds)
              </span>
            </div>
          ) : (
            <p className="text-xs text-amber-400/90 font-medium">
              Tap {2 - selectedPlayers.length} more player{2 - selectedPlayers.length > 1 ? 's' : ''} to start
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* QUICK ADD FRIEND MODAL                                        */}
      {/* ------------------------------------------------------------- */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 border-white/10">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Add Player to Roster
              </h3>
              <button 
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.12] text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lightning"
                  value={quickNickname}
                  onChange={(e) => setQuickNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.12] text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-white/[0.1] text-zinc-300 hover:bg-white/[0.06] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickName.trim()}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 transition cursor-pointer active:scale-95 shadow-lg shadow-emerald-950/60"
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
