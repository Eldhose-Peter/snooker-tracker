'use client';

import React, { useState, useEffect } from 'react';
import { Player, Match } from '@/types/snooker';
import { fetchPlayers, saveNewMatch, createPlayer, getLiveSession, abandonMatch, ActiveLiveSession } from '@/lib/storage';
import { 
  Play, 
  Users, 
  UserPlus, 
  X, 
  Shuffle, 
  ArrowUp, 
  ArrowDown, 
  Zap, 
  ArrowLeftRight, 
  Sparkles,
  Trophy
} from 'lucide-react';

interface MatchSetupProps {
  onStartMatch: (match: Match, players: Player[]) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ onStartMatch }) => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveLiveSession | null>(null);

  // Setup mode: '1v1' or 'multiplayer'
  const [gameMode, setGameMode] = useState<'1v1' | 'multiplayer'>('1v1');

  // 1v1 Mode state
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);

  // Multiplayer Mode state
  const [multiPlayers, setMultiPlayers] = useState<Player[]>([]);
  const [justShuffled, setJustShuffled] = useState(false);

  // Match configuration
  const [bestOf, setBestOf] = useState<number>(3);
  const [redsCount, setRedsCount] = useState<number>(15);
  const [starting, setStarting] = useState(false);

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
      if (data.length >= 2) {
        setPlayer1(data[0]);
        setPlayer2(data[1]);
        setMultiPlayers(data.slice(0, 3));
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Quick 1-tap matchup pairings (popular / friend matchups)
  const quickPairings = [
    { p1: 'Eldho', p2: 'Thoma', label: 'Eldho vs Thoma' },
    { p1: 'Raju', p2: 'Adi', label: 'Raju vs Adi' },
    { p1: 'BM', p2: 'Sam', label: 'BM vs Sam' },
  ];

  const handleApplyPairing = (p1Name: string, p2Name: string) => {
    const found1 = allPlayers.find(p => p.name.toLowerCase() === p1Name.toLowerCase());
    const found2 = allPlayers.find(p => p.name.toLowerCase() === p2Name.toLowerCase());
    if (found1 && found2) {
      setPlayer1(found1);
      setPlayer2(found2);
      setGameMode('1v1');
    }
  };

  // 1v1 Member toggle logic
  const handleSelect1v1Member = (player: Player) => {
    if (player1?.id === player.id) {
      // Already player 1, do nothing or swap
      return;
    }
    if (player2?.id === player.id) {
      // Tapped player 2 -> promote to player 1 (breaker)
      setPlayer1(player2);
      setPlayer2(player1);
      return;
    }
    // New player tapped -> replace player 2
    setPlayer2(player);
  };

  const handleSwapBreaker = () => {
    if (!player1 || !player2) return;
    const temp = player1;
    setPlayer1(player2);
    setPlayer2(temp);
  };

  // Multiplayer Toggle Logic
  const handleToggleMultiMember = (player: Player) => {
    if (multiPlayers.some(p => p.id === player.id)) {
      if (multiPlayers.length <= 2) {
        return; // maintain at least 2 players in multiplayer
      }
      setMultiPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      setMultiPlayers(prev => [...prev, player]);
    }
  };

  const handleMoveUpMulti = (index: number) => {
    if (index <= 0) return;
    setMultiPlayers(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDownMulti = (index: number) => {
    if (index >= multiPlayers.length - 1) return;
    setMultiPlayers(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleRandomiseMulti = () => {
    if (multiPlayers.length < 2) return;
    setMultiPlayers(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setJustShuffled(true);
    setTimeout(() => setJustShuffled(false), 1000);
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
    if (gameMode === '1v1') {
      setPlayer2(created);
    } else {
      setMultiPlayers(prev => [...prev, created]);
    }
  };

  // Start Match Handler
  const handleStartMatch = async () => {
    const finalPlayers: Player[] = gameMode === '1v1'
      ? (player1 && player2 ? [player1, player2] : [])
      : multiPlayers;

    if (finalPlayers.length < 2) return;

    setStarting(true);
    const playerIds = finalPlayers.map(p => p.id);
    const newMatch = await saveNewMatch(playerIds, bestOf, redsCount);
    setStarting(false);
    onStartMatch(newMatch, finalPlayers);
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
    { value: 1, label: '1 Frame', sub: 'Single frame' },
    { value: 3, label: 'Best of 3', sub: 'First to 2' },
    { value: 5, label: 'Best of 5', sub: 'First to 3' },
  ];

  const redsOptions = [
    { value: 15, label: '15 Reds', sub: 'Standard 147' },
    { value: 10, label: '10 Reds', sub: 'Fast 107' },
    { value: 6, label: '6 Reds', sub: 'Quick Shootout' },
  ];

  const effectivePlayers = gameMode === '1v1'
    ? (player1 && player2 ? [player1, player2] : [])
    : multiPlayers;

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-2 sm:py-4 space-y-4 animate-fade-in">
      
      {/* ------------------------------------------------------------- */}
      {/* ACTIVE LIVE MATCH IN PROGRESS BANNER (PREVENT DATA LOSS)      */}
      {/* ------------------------------------------------------------- */}
      {activeSession && (
        <div className="bg-gradient-to-r from-emerald-950 via-[#0e271a] to-[#081810] border-2 border-emerald-500/70 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              Live Match In Progress
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Frame {activeSession.currentFrameNum}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-sm sm:text-base font-black text-white truncate">
                {activeSession.players.map(p => p.name).join(' vs ')}
              </p>
              <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                {activeSession.playerFrames.map((f, i) => `${activeSession.players[i]?.name}: ${f}F`).join(' · ')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleAbandonSession}
                className="px-2.5 py-1.5 rounded-xl border border-red-800/40 text-red-400 hover:bg-red-950/60 text-xs font-semibold transition"
                title="Discard this match"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleResumeSession}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TITLE & ADD FRIEND BUTTON                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Start Snooker Match
          </h2>
          <p className="text-xs text-gray-400">
            Select players and break-off order to begin live tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="px-2.5 py-1.5 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1 transition cursor-pointer"
          title="Add a new friend to roster"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xs:inline">Add Friend</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-emerald-400 font-semibold animate-pulse">
          Loading player roster...
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* ----------------------------------------------------------- */}
          {/* MODE TOGGLE: 1v1 vs MULTIPLAYER RING                        */}
          {/* ----------------------------------------------------------- */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#0c1611] border border-emerald-950/80">
            <button
              type="button"
              onClick={() => setGameMode('1v1')}
              className={`py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                gameMode === '1v1'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>1 vs 1 Match</span>
            </button>

            <button
              type="button"
              onClick={() => setGameMode('multiplayer')}
              className={`py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                gameMode === 'multiplayer'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Multiplayer (3+ Players)</span>
            </button>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* 1v1 MATCH SETUP (FAST 2-TAP SELECTION)                      */}
          {/* ----------------------------------------------------------- */}
          {gameMode === '1v1' && (
            <div className="bg-[#0d1712] border border-emerald-900/40 rounded-3xl p-3.5 sm:p-5 shadow-xl space-y-4">
              
              {/* Quick Pairings (1-Tap Presets) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Quick Matchups:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPairings.map(pair => (
                    <button
                      key={pair.label}
                      type="button"
                      onClick={() => handleApplyPairing(pair.p1, pair.p2)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                        player1?.name === pair.p1 && player2?.name === pair.p2
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                          : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>{pair.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Players Matchup Cards */}
              <div className="grid grid-cols-2 gap-2 relative">
                
                {/* Player 1 (Breaker) */}
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#122e1e] to-[#0c1f15] border-2 border-emerald-500/70 shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-black text-black bg-emerald-400 px-1.5 py-0.2 rounded">
                      #1 BREAKER
                    </span>
                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black text-white truncate">
                    {player1?.name || 'Select Player 1'}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 truncate">
                    {player1?.nickname ? `"${player1.nickname}"` : 'Breaks off frame'}
                  </div>
                </div>

                {/* Player 2 */}
                <div className="p-3 rounded-2xl bg-[#112218] border border-emerald-900/60 shadow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-800 px-1.5 py-0.2 rounded">
                      #2 OPPONENT
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-white truncate">
                    {player2?.name || 'Select Player 2'}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {player2?.nickname ? `"${player2.nickname}"` : 'Shoots second'}
                  </div>
                </div>

                {/* Swap Breaker Button Floating Center */}
                <button
                  type="button"
                  onClick={handleSwapBreaker}
                  title="Swap who breaks off"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-[#0d1712] text-white flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer z-10"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Roster Member Grid (Tap to Select / Change) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Tap Member to Set Player / Opponent:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {allPlayers.map((p) => {
                    const isP1 = player1?.id === p.id;
                    const isP2 = player2?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect1v1Member(p)}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center relative cursor-pointer ${
                          isP1
                            ? 'bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500/40 text-white font-bold'
                            : isP2
                            ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200 font-bold'
                            : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                        }`}
                      >
                        {isP1 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-black flex items-center justify-center shadow">
                            1
                          </span>
                        )}
                        {isP2 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 text-white text-[9px] font-bold flex items-center justify-center shadow">
                            2
                          </span>
                        )}
                        <span className="text-xs sm:text-sm font-bold truncate w-full">
                          {p.name}
                        </span>
                        {p.nickname && (
                          <span className="text-[9px] text-gray-500 truncate w-full">
                            {p.nickname}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* MULTIPLAYER SETUP (3+ PLAYERS RING)                         */}
          {/* ----------------------------------------------------------- */}
          {gameMode === 'multiplayer' && (
            <div className="bg-[#0d1712] border border-emerald-900/40 rounded-3xl p-3.5 sm:p-5 shadow-xl space-y-4">
              
              <div className="flex items-center justify-between border-b border-emerald-950/80 pb-2.5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Turn Sequence ({multiPlayers.length} Players)
                  </span>
                  <p className="text-[10px] text-gray-400">
                    #1 breaks off. Players rotate turns in this order.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRandomiseMulti}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    justShuffled
                      ? 'bg-amber-500 text-black border-amber-400 scale-105'
                      : 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-700/50'
                  }`}
                >
                  <Shuffle className={`w-3.5 h-3.5 ${justShuffled ? 'animate-spin' : ''}`} />
                  <span>{justShuffled ? 'Shuffled!' : 'Shuffle'}</span>
                </button>
              </div>

              {/* Sequence List */}
              <div className="space-y-1.5">
                {multiPlayers.map((player, idx) => {
                  const isBreak = idx === 0;
                  return (
                    <div
                      key={player.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                        isBreak
                          ? 'bg-[#122e1e] border-emerald-500/60'
                          : 'bg-[#112218] border-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                          isBreak ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white truncate block">
                            {player.name}
                          </span>
                          {isBreak && (
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
                              Breaks Off
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUpMulti(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:opacity-30 border border-gray-800"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDownMulti(idx)}
                          disabled={idx === multiPlayers.length - 1}
                          className="p-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:opacity-30 border border-gray-800"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMultiMember(player)}
                          disabled={multiPlayers.length <= 2}
                          className="p-1 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 disabled:opacity-30 border border-red-800/30"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Roster chips to add/remove */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Tap to Add / Remove Roster Members:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allPlayers.map((p) => {
                    const isIncluded = multiPlayers.some(sp => sp.id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleMultiMember(p)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isIncluded
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        {isIncluded ? '✓ ' : '+ '}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* MATCH CONFIG: LENGTH & REDS                                 */}
          {/* ----------------------------------------------------------- */}
          <div className="bg-[#0d1712] border border-emerald-900/40 rounded-3xl p-3.5 sm:p-5 shadow-xl space-y-4">
            
            {/* Format (Best Of) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Match Format (Frames)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {formatOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBestOf(opt.value)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer ${
                      bestOf === opt.value
                        ? 'bg-emerald-600 border-emerald-400 text-white font-black shadow-md'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold block">{opt.label}</span>
                    <span className="text-[9px] text-gray-300/80 block mt-0.5">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Red Balls Count */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Reds on Table
              </label>
              <div className="grid grid-cols-3 gap-2">
                {redsOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRedsCount(opt.value)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer ${
                      redsCount === opt.value
                        ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 font-black shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-sm" />
                      <span className="text-xs sm:text-sm font-bold">{opt.label}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------- */}
          {/* PRIMARY START MATCH CTA (INSTANT LAUNCH)                     */}
          {/* ----------------------------------------------------------- */}
          <div className="pt-1">
            <button
              type="button"
              disabled={starting || effectivePlayers.length < 2}
              onClick={handleStartMatch}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 hover:from-emerald-400 hover:to-green-300 text-black font-black text-base shadow-xl shadow-emerald-950/80 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>
                {starting
                  ? 'Starting Match...'
                  : `Start Match: ${effectivePlayers.map(p => p.name).join(' vs ')}`}
              </span>
            </button>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* QUICK ADD FRIEND MODAL                                        */}
      {/* ------------------------------------------------------------- */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1913] border border-emerald-600/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Add Player to Roster
              </h3>
              <button 
                onClick={() => setIsQuickAddOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
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

              <div className="flex items-center space-x-2 pt-1">
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
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
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
