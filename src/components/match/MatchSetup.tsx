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
  ChevronRight,
  Check
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
    setTimeout(() => setIsShuffling(false), 350);
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
    const created = await createPlayer(quickName.trim());
    setQuickName('');
    setIsQuickAddOpen(false);
    setAllPlayers(prev => [...prev.filter(p => p.id !== created.id), created]);
    if (selectedPlayers.length < 6) {
      setSelectedPlayers(prev => [...prev.filter(p => p.id !== created.id), created]);
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

  // Apple Segmented Control options
  const formatOptions = [
    { value: 1, label: 'Single Frame' },
    { value: 3, label: 'Best of 3' },
    { value: 5, label: 'Best of 5' },
    { value: 7, label: 'Best of 7' },
  ];

  const redsOptions = [
    { value: 15, label: '15 Reds' },
    { value: 10, label: '10 Reds' },
    { value: 6, label: '6 Reds' },
  ];

  const isValidMatch = selectedPlayers.length >= 2;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-3 flex-1 flex flex-col justify-between gap-4 animate-fade-in">
      
      {/* ------------------------------------------------------------- */}
      {/* ACTIVE LIVE MATCH BANNER (APPLE CALLOUT CARD)                */}
      {/* ------------------------------------------------------------- */}
      {activeSession && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-3.5 border border-emerald-500/30 dark:border-emerald-500/40 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="text-[14px] font-semibold text-zinc-900 dark:text-white truncate block">
                Resume: {activeSession.players.map(p => p.name).join(' vs ')}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                Frame {activeSession.currentFrameNum} in progress
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAbandonSession}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer min-h-[36px]"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleResumeSession}
              className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-[0.97] cursor-pointer min-h-[36px]"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Resume</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* UNIFIED PLAYER SELECTION (APPLE GROUPED LIST STYLING)         */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Players
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-medium">
              {selectedPlayers.length} of {allPlayers.length} selected
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:opacity-80 flex items-center gap-1 transition cursor-pointer min-h-[44px] px-2 active:scale-[0.97]"
            title="Add a new player"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Player</span>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-zinc-400 text-sm font-medium animate-pulse">
            Loading roster…
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.06] shadow-xs">
            {allPlayers.map((player) => {
              const selectedIndex = selectedPlayers.findIndex(sp => sp.id === player.id);
              const isSelected = selectedIndex !== -1;
              const isBreaker = selectedIndex === 0;

              return (
                <div
                  key={player.id}
                  onClick={() => handleTogglePlayer(player)}
                  className="flex items-center justify-between px-3.5 py-2.5 min-h-[48px] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:bg-black/[0.05] dark:active:bg-white/[0.05] transition cursor-pointer select-none"
                >
                  {/* Leading: Checkmark indicator, avatar, & name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      isSelected 
                        ? 'bg-emerald-600 text-white' 
                        : 'border-2 border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>

                    <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-[#2c2c2e] text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>

                    <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {player.name}
                    </span>
                  </div>

                  {/* Trailing: Order badge & sequence shifts */}
                  {isSelected && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isBreaker 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-zinc-100 dark:bg-[#2c2c2e] text-zinc-600 dark:text-zinc-300'
                      }`}>
                        {isBreaker ? '#1 BREAK' : `#${selectedIndex + 1}`}
                      </span>

                      {selectedPlayers.length > 2 && (
                        <div className="flex items-center">
                          <button
                            type="button"
                            disabled={selectedIndex === 0}
                            onClick={(e) => handleShiftPlayer(selectedIndex, 'left', e)}
                            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 disabled:opacity-20 cursor-pointer rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                            title="Shift earlier in sequence"
                            aria-label={`Shift ${player.name} earlier`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={selectedIndex === selectedPlayers.length - 1}
                            onClick={(e) => handleShiftPlayer(selectedIndex, 'right', e)}
                            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 disabled:opacity-20 cursor-pointer rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                            title="Shift later in sequence"
                            aria-label={`Shift ${player.name} later`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
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

      {/* ------------------------------------------------------------- */}
      {/* PLAYING SEQUENCE REORDER CONTROLS (SHUFFLE & BREAKER SWAP)    */}
      {/* ------------------------------------------------------------- */}
      {selectedPlayers.length >= 2 && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-3 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate">
              Turn Order: {selectedPlayers.map(p => p.name).join(' → ')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedPlayers.length === 2 && (
              <button
                type="button"
                onClick={handleSwapBreaker}
                className="px-2.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition active:scale-[0.97] min-h-[36px] cursor-pointer"
                title="Swap Breaker"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Swap</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRandomise}
              className="px-2.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition active:scale-[0.97] min-h-[36px] cursor-pointer"
              title="Shuffle Order"
            >
              <Shuffle className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MATCH SETTINGS: FORMAT & REDS (APPLE SEGMENTED CONTROLS)     */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        {/* Match Format Segmented Control */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1 block">
            Match Format
          </label>
          <div className="p-1 rounded-xl bg-black/[0.06] dark:bg-[#2c2c2e] border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-4 gap-1">
            {formatOptions.map(opt => {
              const isActive = bestOf === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBestOf(opt.value)}
                  className={`py-2 px-1 rounded-[9px] text-[11px] sm:text-xs font-medium text-center transition-all cursor-pointer min-h-[44px] flex items-center justify-center select-none active:scale-[0.97] ${
                    isActive
                      ? 'bg-white dark:bg-[#48484a] text-zinc-900 dark:text-white shadow-xs font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white active:opacity-60'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Red Balls Count Segmented Control */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1 block">
            Red Balls Count
          </label>
          <div className="p-1 rounded-xl bg-black/[0.06] dark:bg-[#2c2c2e] border border-black/[0.04] dark:border-white/[0.06] grid grid-cols-3 gap-1">
            {redsOptions.map(opt => {
              const isActive = redsCount === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRedsCount(opt.value)}
                  className={`py-2 px-1 rounded-[9px] text-xs font-medium text-center transition-all cursor-pointer min-h-[44px] flex items-center justify-center select-none active:scale-[0.97] ${
                    isActive
                      ? 'bg-white dark:bg-[#48484a] text-zinc-900 dark:text-white shadow-xs font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white active:opacity-60'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PROMINENT CTA: APPLE CAPSULE FILLED BUTTON (.btn-filled)      */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-2 pb-4 space-y-2">
        <button
          type="button"
          disabled={starting || !isValidMatch}
          onClick={handleStartMatch}
          className={`btn-filled w-full min-h-[50px] py-3.5 px-6 rounded-full flex items-center justify-center gap-2 text-[17px] font-semibold transition-all duration-200 cursor-pointer select-none active:scale-[0.97] ${
            isValidMatch
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/25 active:opacity-90'
              : 'bg-zinc-200 dark:bg-[#2c2c2e] text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-black/5 dark:border-white/5 opacity-60'
          }`}
          title={isValidMatch ? 'Start Snooker Match' : 'Select at least 2 players'}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{starting ? 'Starting Match…' : 'Start Match'}</span>
        </button>

        <div className="text-center">
          {isValidMatch ? (
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {selectedPlayers.length === 2
                  ? `${selectedPlayers[0].name} vs ${selectedPlayers[1].name}`
                  : selectedPlayers.map(p => p.name).join(' → ')}
              </span>
              {' • '}
              <span>{bestOf === 1 ? 'Single Frame' : `Best of ${bestOf}`} ({redsCount} Reds)</span>
            </p>
          ) : (
            <p className="text-[13px] text-amber-600 dark:text-amber-400 font-medium">
              Select at least 2 players to start a match
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* QUICK ADD PLAYER MODAL                                        */}
      {/* ------------------------------------------------------------- */}
      {isQuickAddOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setIsQuickAddOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#1c1c1e] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-black/[0.08] dark:border-white/[0.1] space-y-4 text-zinc-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3">
              <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Add New Player</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Stephen"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-[#2c2c2e] border-0 text-zinc-900 dark:text-white text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.1] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-[15px] font-medium transition cursor-pointer active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickName.trim()}
                  className="flex-1 min-h-[44px] py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[15px] font-semibold disabled:opacity-40 transition cursor-pointer active:scale-[0.97] shadow-sm"
                >
                  Add & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
