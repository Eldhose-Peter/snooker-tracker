'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BallType, 
  BALL_CONFIGS, 
  COLOR_ORDER, 
  Player, 
  Match, 
  FrameState 
} from '@/types/snooker';
import { 
  createInitialFrameState, 
  getAvailableBalls, 
  handlePot, 
  handleMiss, 
  handleFoul, 
  handleSwitchPlayer, 
  handleConcede 
} from '@/lib/snooker-engine';
import { FoulModal } from './FoulModal';
import { WinModal } from './WinModal';
import { EndMatchModal } from './EndMatchModal';
import { recordFrameCompleted, finishMatch, abandonMatch, getLiveSession, saveLiveSession, clearLiveSession } from '@/lib/storage';
import { 
  RotateCcw, 
  RotateCw, 
  AlertTriangle, 
  Flag, 
  Sparkles, 
  Zap, 
  Flame, 
  ChevronRight, 
  ShieldAlert, 
  Users,
  LogOut,
  MoreVertical
} from 'lucide-react';

interface LiveScoreboardProps {
  match: Match;
  players?: Player[]; // sequence of players
  // Legacy backward compatibility:
  player1?: Player;
  player2?: Player;
  onMatchComplete: () => void;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  match,
  players: propPlayers,
  player1: propP1,
  player2: propP2,
  onMatchComplete,
}) => {
  // Resolve participating players in sequence order
  const resolvedPlayers: Player[] = React.useMemo(() => {
    if (propPlayers && propPlayers.length > 0) return propPlayers;
    if (match.players && match.players.length > 0) return match.players;
    const fallback: Player[] = [];
    if (propP1) fallback.push(propP1);
    if (propP2) fallback.push(propP2);
    if (fallback.length >= 2) return fallback;
    return [
      { id: match.player1_id, name: 'Player 1' },
      { id: match.player2_id, name: 'Player 2' },
    ];
  }, [propPlayers, match.players, propP1, propP2, match.player1_id, match.player2_id]);

  const playerCount = resolvedPlayers.length;
  const playerNames = React.useMemo(() => resolvedPlayers.map(p => p.name), [resolvedPlayers]);

  // Check if an existing live session matches this match
  const savedSession = React.useMemo(() => {
    const s = getLiveSession();
    return s && s.match.id === match.id ? s : null;
  }, [match.id]);

  const [currentFrameNum, setCurrentFrameNum] = useState<number>(() => {
    if (savedSession?.currentFrameNum) return savedSession.currentFrameNum;
    const totalFrames = (match.player_frames?.reduce((a, b) => a + b, 0)) ?? 
      (match.player1_frames + match.player2_frames);
    return totalFrames + 1;
  });

  const [playerFrames, setPlayerFrames] = useState<number[]>(() => {
    if (savedSession?.playerFrames && savedSession.playerFrames.length === playerCount) {
      return savedSession.playerFrames;
    }
    if (match.player_frames && match.player_frames.length === playerCount) {
      return match.player_frames;
    }
    const arr = new Array(playerCount).fill(0);
    arr[0] = match.player1_frames || 0;
    arr[1] = match.player2_frames || 0;
    return arr;
  });

  // Snooker Frame State and Undo / Redo Stacks
  const [state, setState] = useState<FrameState>(() => {
    if (savedSession?.frameState) {
      return savedSession.frameState;
    }
    const initBreakOff = (currentFrameNum - 1) % playerCount;
    const fresh = createInitialFrameState(playerCount, match.reds_count || 15, playerNames);
    if (initBreakOff !== 0) {
      return {
        ...fresh,
        activePlayerIndex: initBreakOff,
        lastActionDescription: `Frame ${currentFrameNum} started. Break-off shot by ${playerNames[initBreakOff] || `Player ${initBreakOff + 1}`}.`,
      };
    }
    return fresh;
  });

  const [undoStack, setUndoStack] = useState<FrameState[]>(() => {
    return savedSession?.undoStack || [];
  });
  const [redoStack, setRedoStack] = useState<FrameState[]>(() => {
    return savedSession?.redoStack || [];
  });

  // Modals & Menu State
  const [isFoulModalOpen, setIsFoulModalOpen] = useState(false);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close options menu on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOptionsMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOptionsMenuOpen(false);
      }
    };

    if (isOptionsMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOptionsMenuOpen]);

  // Sync to local storage continuously to prevent data loss on browser close / reload / back
  useEffect(() => {
    saveLiveSession({
      match,
      players: resolvedPlayers,
      currentFrameNum,
      playerFrames,
      frameState: state,
      undoStack,
      redoStack,
      updatedAt: Date.now(),
    });
  }, [match, resolvedPlayers, currentFrameNum, playerFrames, state, undoStack, redoStack]);

  const triggerHaptic = (ms: number = 10) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  // Push state to undo stack before mutating and clear redo stack
  const applyStateMutation = useCallback((nextState: FrameState) => {
    setUndoStack((prev) => [...prev, state]);
    setRedoStack([]); // Clear redo stack on new action
    setState(nextState);

    // If frame just concluded, open celebration modal (frame commit happens on Next Frame / Finish Match)
    if (nextState.isFrameOver && nextState.winnerIndex !== null) {
      setIsWinModalOpen(true);
    }
  }, [state]);

  // Actions
  const onPotBall = (ball: BallType) => {
    triggerHaptic(12);
    const nextState = handlePot(state, ball);
    applyStateMutation(nextState);
  };

  const onMiss = () => {
    triggerHaptic(10);
    const nextState = handleMiss(state);
    applyStateMutation(nextState);
  };

  const onConfirmFoul = (
    points: number, 
    target: 'all_opponents' | 'next_player' | number, 
    awardFreeBall: boolean, 
    passBack: boolean
  ) => {
    const nextState = handleFoul(state, points, target, awardFreeBall, passBack);
    applyStateMutation(nextState);
  };

  // Instant 1-tap standard 4-point foul (most common in casual snooker)
  const onQuickFoul4 = () => {
    triggerHaptic(15);
    const target = playerCount > 2 ? 'all_opponents' : ((state.activePlayerIndex + 1) % playerCount);
    const nextState = handleFoul(state, 4, target, false, false);
    applyStateMutation(nextState);
  };

  const onConcede = () => {
    const playerAtTable = resolvedPlayers[state.activePlayerIndex] || { name: `Player ${state.activePlayerIndex + 1}` };
    if (window.confirm(`Are you sure ${playerAtTable.name} wants to concede this frame?`)) {
      const nextState = handleConcede(state, state.activePlayerIndex);
      applyStateMutation(nextState);
    }
  };

  // Undo Handler - Always closes win modal and reverts state safely
  const onUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, state]);
    setIsWinModalOpen(false);
    setState(previous);
  }, [undoStack, state]);

  // Redo Handler
  const onRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, state]);
    setState(next);
    if (next.isFrameOver && next.winnerIndex !== null) {
      setIsWinModalOpen(true);
    }
  }, [redoStack, state]);

  // Keyboard Shortcuts (Ctrl+Z for Undo, Ctrl+Y or Ctrl+Shift+Z for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo]);

  const onToggleFreeBall = () => {
    applyStateMutation({
      ...state,
      freeBallActive: !state.freeBallActive,
      lastActionDescription: !state.freeBallActive ? 'Free ball nominated' : 'Free ball cancelled',
    });
  };

  const onSwitchActivePlayer = (targetIndex: number) => {
    if (targetIndex === state.activePlayerIndex || state.isFrameOver) return;
    const nextState = handleSwitchPlayer(state, targetIndex);
    applyStateMutation(nextState);
  };

  // Projected frames including current pending frame if concluded
  const projectedFrames = React.useMemo(() => {
    if (state.isFrameOver && state.winnerIndex !== null) {
      const copy = [...playerFrames];
      copy[state.winnerIndex] = (copy[state.winnerIndex] || 0) + 1;
      return copy;
    }
    return playerFrames;
  }, [state.isFrameOver, state.winnerIndex, playerFrames]);

  const framesToWin = Math.ceil(match.best_of / 2);
  const isMatchWon = match.best_of === 1 
    ? state.isFrameOver 
    : projectedFrames.some(f => f >= framesToWin);

  const matchWinnerIdx = isMatchWon
    ? (match.best_of === 1 ? state.winnerIndex : projectedFrames.findIndex(f => f >= framesToWin))
    : -1;
  const matchWinner = matchWinnerIdx !== null && matchWinnerIdx !== -1 ? resolvedPlayers[matchWinnerIdx] : null;

  // Next Frame handler: commits previous frame and sets up new frame
  const handleNextFrame = async () => {
    if (state.winnerIndex !== null) {
      const winnerIdx = state.winnerIndex;
      const winnerPlayer = resolvedPlayers[winnerIdx] || resolvedPlayers[0];
      const highestBreak = Math.max(...state.playerHighestBreaks);
      const highBreakPlayerIdx = state.playerHighestBreaks.indexOf(highestBreak);
      const highBreakPlayerId = highestBreak > 0 ? (resolvedPlayers[highBreakPlayerIdx]?.id || null) : null;

      const updatedFrames = [...playerFrames];
      updatedFrames[winnerIdx] = (updatedFrames[winnerIdx] || 0) + 1;

      // Persist frame to Supabase / LocalStorage
      await recordFrameCompleted(
        match.id,
        currentFrameNum,
        state.playerScores,
        winnerPlayer.id,
        highestBreak,
        highBreakPlayerId
      );

      setPlayerFrames(updatedFrames);
    }

    setIsWinModalOpen(false);
    const nextFrameNum = currentFrameNum + 1;
    setCurrentFrameNum(nextFrameNum);

    // In snooker rotation, break-off rotates to next player in sequence for subsequent frames
    const nextBreakOffIndex = (nextFrameNum - 1) % playerCount;
    const freshState = createInitialFrameState(playerCount, match.reds_count || 15, playerNames);
    setState({
      ...freshState,
      activePlayerIndex: nextBreakOffIndex,
      lastActionDescription: `Frame ${nextFrameNum} started. Break-off shot by ${playerNames[nextBreakOffIndex] || `Player ${nextBreakOffIndex + 1}`}.`,
    });
    setUndoStack([]);
    setRedoStack([]);
  };

  // Match Finish handler: commits final frame and completes match
  const handleFinishMatch = async () => {
    if (state.isFrameOver && state.winnerIndex !== null) {
      const winnerIdx = state.winnerIndex;
      const winnerPlayer = resolvedPlayers[winnerIdx] || resolvedPlayers[0];
      const highestBreak = Math.max(...state.playerHighestBreaks);
      const highBreakPlayerIdx = state.playerHighestBreaks.indexOf(highestBreak);
      const highBreakPlayerId = highestBreak > 0 ? (resolvedPlayers[highBreakPlayerIdx]?.id || null) : null;

      const finalFrames = [...playerFrames];
      finalFrames[winnerIdx] = (finalFrames[winnerIdx] || 0) + 1;

      await recordFrameCompleted(
        match.id,
        currentFrameNum,
        state.playerScores,
        winnerPlayer.id,
        highestBreak,
        highBreakPlayerId
      );

      const overallWinner = matchWinner || winnerPlayer;
      await finishMatch(match.id, overallWinner.id, finalFrames);
    }

    clearLiveSession();
    setIsWinModalOpen(false);
    onMatchComplete();
  };

  // End match in between handlers
  const handleEndMatchWithLeader = async () => {
    const finalFrames = [...playerFrames];
    const hasPointsInFrame = state.playerScores.some(s => s > 0);

    if (hasPointsInFrame) {
      const maxScore = Math.max(...state.playerScores);
      const scoreLeaders = state.playerScores
        .map((s, idx) => (s === maxScore ? idx : -1))
        .filter(idx => idx !== -1);

      // Only award frame if there is an undisputed frame leader
      if (scoreLeaders.length === 1) {
        const frameLeaderIdx = scoreLeaders[0];
        const frameLeader = resolvedPlayers[frameLeaderIdx] || resolvedPlayers[0];
        const highestBreak = Math.max(...state.playerHighestBreaks);
        const highBreakPlayerIdx = state.playerHighestBreaks.indexOf(highestBreak);
        const highBreakPlayerId = highestBreak > 0 ? (resolvedPlayers[highBreakPlayerIdx]?.id || null) : null;

        finalFrames[frameLeaderIdx] = (finalFrames[frameLeaderIdx] || 0) + 1;
        await recordFrameCompleted(
          match.id,
          currentFrameNum,
          state.playerScores,
          frameLeader.id,
          highestBreak,
          highBreakPlayerId
        );
      }
    }

    const maxWonFrames = Math.max(...finalFrames);
    let matchWinnerIdx = finalFrames.indexOf(maxWonFrames);
    if (matchWinnerIdx === -1) matchWinnerIdx = 0;
    const overallWinner = resolvedPlayers[matchWinnerIdx] || resolvedPlayers[0];

    await finishMatch(match.id, overallWinner.id, finalFrames);
    clearLiveSession();
    setIsEndMatchModalOpen(false);
    onMatchComplete();
  };

  const handleEndMatchConcede = async (concedingPlayerIndex: number) => {
    const finalFrames = [...playerFrames];
    let winningPlayerIndex = 0;
    if (playerCount === 2) {
      winningPlayerIndex = concedingPlayerIndex === 0 ? 1 : 0;
    } else {
      let maxScore = -1;
      for (let i = 0; i < playerCount; i++) {
        if (i !== concedingPlayerIndex) {
          const score = finalFrames[i] || 0;
          if (score > maxScore) {
            maxScore = score;
            winningPlayerIndex = i;
          }
        }
      }
    }
    finalFrames[winningPlayerIndex] = (finalFrames[winningPlayerIndex] || 0) + 1;
    const overallWinner = resolvedPlayers[winningPlayerIndex] || resolvedPlayers[0];

    // Record conceded frame so frame history remains consistent
    const highestBreak = Math.max(...state.playerHighestBreaks);
    const highBreakPlayerIdx = state.playerHighestBreaks.indexOf(highestBreak);
    const highBreakPlayerId = highestBreak > 0 ? (resolvedPlayers[highBreakPlayerIdx]?.id || null) : null;

    await recordFrameCompleted(
      match.id,
      currentFrameNum,
      state.playerScores,
      overallWinner.id,
      highestBreak,
      highBreakPlayerId
    );

    await finishMatch(match.id, overallWinner.id, finalFrames);
    clearLiveSession();
    setIsEndMatchModalOpen(false);
    onMatchComplete();
  };

  const handleEndMatchAbandon = async () => {
    await abandonMatch(match.id);
    clearLiveSession();
    setIsEndMatchModalOpen(false);
    onMatchComplete();
  };

  const availableBalls = getAvailableBalls(state);

  const frameWinner = state.winnerIndex !== null ? resolvedPlayers[state.winnerIndex] : null;
  const highestBreak = Math.max(...state.playerHighestBreaks);
  const highBreakPlayerIdx = state.playerHighestBreaks.indexOf(highestBreak);
  const highBreakPlayer = highestBreak > 0 ? resolvedPlayers[highBreakPlayerIdx] : null;

  const activePlayer = resolvedPlayers[state.activePlayerIndex] || { name: `Player ${state.activePlayerIndex + 1}` };

  // Determine current ball on description
  const getBallOnLabel = (): string => {
    if (state.freeBallActive) return 'FREE BALL (Any Ball)';
    if (state.tablePhase === 'RED') return 'RED (1 pt)';
    if (state.tablePhase === 'COLOR_AFTER_RED') return 'ANY COLOR (2-7 pts)';
    if (state.tablePhase === 'COLORS_SEQUENCE') {
      const ball = COLOR_ORDER[state.colorsSequenceIndex];
      return ball ? `${ball.toUpperCase()} (${BALL_CONFIGS[ball].points} pts)` : 'None';
    }
    return 'Frame Over';
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-1.5 sm:py-3 space-y-2 sm:space-y-3">
      
      {/* ------------------------------------------------------------- */}
      {/* MATCH HEADER & DISCREET TOP-RIGHT OPTIONS MENU (3-DOTS)       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d1611] border border-emerald-900/40 rounded-xl text-xs gap-2 shadow-sm">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-black text-emerald-400">Frame {currentFrameNum}</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 truncate">
            {match.best_of === 1 ? '1 Frame' : `Best of ${match.best_of}`}
          </span>
          <span className="text-gray-600 hidden xs:inline">|</span>
          <span className="text-xs text-gray-400 font-medium hidden xs:flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            {playerCount}P
          </span>
        </div>

        {/* Frames Tally & Discreet 3-Dots Options Menu */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 font-mono text-xs font-bold">
            {resolvedPlayers.map((p, idx) => (
              <div key={p.id} className="flex items-center space-x-1">
                <span className="text-gray-400 truncate max-w-[50px] sm:max-w-[75px]">{p.name}:</span>
                <span className="text-emerald-300 font-black">{playerFrames[idx] || 0}</span>
                {idx < resolvedPlayers.length - 1 && <span className="text-gray-600">·</span>}
              </div>
            ))}
          </div>

          {/* 3-Dots Kebab Options Menu (Hides 'End Match' & secondary actions) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg bg-gray-900/90 hover:bg-gray-800 border border-gray-700/80 text-gray-300 hover:text-white transition flex items-center justify-center cursor-pointer shadow-sm"
              title="Match Options (End Match, Concede, Free Ball)"
              aria-label="Match Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isOptionsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 py-1 bg-[#0c1811] border border-emerald-600/60 rounded-xl shadow-2xl z-50 animate-fade-in text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    onToggleFreeBall();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-950/80 flex items-center gap-2 text-gray-200 hover:text-white transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <span>{state.freeBallActive ? 'Cancel Free Ball' : 'Nominate Free Ball'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    onConcede();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-950/80 flex items-center gap-2 text-gray-200 hover:text-white transition cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Concede Frame</span>
                </button>

                <div className="border-t border-emerald-900/60 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    setIsEndMatchModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-red-950/60 flex items-center gap-2 text-red-400 hover:text-red-300 transition cursor-pointer font-bold"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span>End Match...</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ULTRA-CLEAR ACTIVE SCORER BANNER (HIGH CONTRAST)              */}
      {/* Eliminates marking errors: Prominent, unmistakable cue        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 text-black px-3.5 py-2 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/25 border-2 border-emerald-200">
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
          <span className="flex-shrink-0 text-[10px] sm:text-xs uppercase tracking-widest font-black bg-black text-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow">
            <Zap className="w-3 h-3 fill-emerald-300 text-emerald-300" />
            AT TABLE
          </span>
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-black/80 flex-shrink-0 hidden xs:inline">
            SCORING FOR:
          </span>
          <span className="text-sm sm:text-base font-black tracking-wide text-black truncate underline decoration-black/40 decoration-2">
            {activePlayer.name}
          </span>
        </div>

        {/* Current Break Counter embedded directly in banner */}
        <div className="flex items-center space-x-2 flex-shrink-0 pl-2">
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-black/75 block leading-none">Break</span>
            <span className="text-base sm:text-lg font-black text-black font-mono leading-tight">{state.currentBreak}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MULTIPLAYER SCORE CARDS (ACTIVE PLAYER GLOW, NO NICKNAMES)    */}
      {/* ------------------------------------------------------------- */}
      <div className={`grid gap-2 ${
        playerCount === 2 
          ? 'grid-cols-2' 
          : playerCount === 3 
          ? 'grid-cols-3' 
          : 'grid-cols-2 sm:grid-cols-4'
      }`}>
        {resolvedPlayers.map((player, idx) => {
          const isActive = state.activePlayerIndex === idx;
          const score = state.playerScores[idx] ?? 0;
          const highBreak = state.playerHighestBreaks[idx] ?? 0;
          const framesWon = playerFrames[idx] ?? 0;

          return (
            <div
              key={player.id}
              onClick={() => onSwitchActivePlayer(idx)}
              title={isActive ? `Scoring for ${player.name}` : `Click to switch turn to ${player.name}`}
              className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-[#103822] to-[#0a2315] border-2 border-emerald-400 shadow-lg shadow-emerald-950 ring-2 ring-emerald-400/40'
                  : 'bg-[#0d1712]/75 border-gray-800 opacity-65 hover:opacity-100 hover:border-emerald-800/60'
              }`}
            >
              {/* Turn Sequence & Frames Won */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-gray-800 text-gray-400'
                }`}>
                  #{idx + 1}
                </span>

                {isActive ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow">
                    <Zap className="w-2.5 h-2.5 fill-black" /> ACTIVE
                  </span>
                ) : (
                  <span className="text-[9px] text-gray-500 hover:text-gray-300">
                    Tap to switch
                  </span>
                )}

                <div className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/40 text-emerald-300 font-mono font-bold">
                  {framesWon}F
                </div>
              </div>

              {/* Player Name ONLY (No Nicknames) */}
              <div className="min-w-0 pr-1">
                <h2 className={`text-sm sm:text-base font-bold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {player.name}
                </h2>
              </div>

              {/* Score Display */}
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {score}
                </span>
                {highBreak > 0 && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-0.5 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/30 font-mono">
                    <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    Hi: {highBreak}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SNOOKER TABLE MATH & TARGET HUD (COMPACT SINGLE ROW)          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* Table Remaining Points */}
        <div className="bg-[#0b140f] border border-emerald-900/40 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-medium">Table Left:</span>
          <span className="text-xs sm:text-sm font-black text-white font-mono">
            {state.pointsRemaining} pts
          </span>
        </div>

        {/* Reds Remaining */}
        <div className="bg-[#0b140f] border border-emerald-900/40 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-medium">Reds Left:</span>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-sm" />
            <span className="text-xs sm:text-sm font-black text-white font-mono">
              {state.redsRemaining}
            </span>
          </div>
        </div>

        {/* Target Ball On */}
        <div className="bg-[#0b140f] border border-emerald-900/40 rounded-xl px-2.5 py-1.5 flex items-center justify-between min-w-0">
          <span className="text-[11px] text-gray-400 font-medium mr-1 flex-shrink-0">Target:</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-300 truncate font-mono">
            {getBallOnLabel()}
          </span>
        </div>
      </div>

      {/* Snookers Alert Banner (Appears only when snookers needed) */}
      {state.snookersNeeded.needed && (
        <div className="bg-amber-950/60 border border-amber-600/40 rounded-xl px-3 py-1.5 flex items-center space-x-2 text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="font-bold truncate">
            Snookers Required: {state.snookersNeeded.trailers.map(t => `${resolvedPlayers[t.playerIndex]?.name || `P${t.playerIndex + 1}`} (${t.count})`).join(', ')}
          </span>
        </div>
      )}

      {/* Free Ball Active Banner (With 1-tap dismiss) */}
      {state.freeBallActive && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl px-3 py-1.5 flex items-center justify-between text-yellow-300 text-xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-bold">FREE BALL ACTIVE: Any nominated color acts as ball on</span>
          </div>
          <button
            type="button"
            onClick={onToggleFreeBall}
            className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded font-black hover:bg-yellow-400 transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOUCH-FRIENDLY SNOOKER BALLS GRID                             */}
      {/* Large, well-spaced buttons; unplayable balls are disabled     */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-felt rounded-2xl p-2 sm:p-3.5 shadow-inner">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
            Tap Ball to Pot for <strong className="text-white underline">{activePlayer.name}</strong>
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
            {getBallOnLabel()}
          </span>
        </div>

        {/* 4-col layout on mobile (2 compact rows), 7-col on sm+ screens */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
          
          {/* RED BALL (1 pt) - Large 2-column primary button on mobile */}
          <button
            type="button"
            disabled={!availableBalls.includes('red')}
            onClick={() => onPotBall('red')}
            className={`col-span-2 sm:col-span-1 h-14 sm:h-20 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('red')
                ? 'opacity-100 ring-2 ring-red-400/90 shadow-md shadow-red-950/60 hover:scale-105 active:scale-95'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.red.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">1</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/95 uppercase tracking-wider">Red</span>
          </button>

          {/* YELLOW (2 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('yellow')}
            onClick={() => onPotBall('yellow')}
            className={`col-span-1 h-14 sm:h-20 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('yellow')
                ? 'opacity-100 ring-2 ring-yellow-400/90 shadow-md shadow-yellow-950/60 hover:scale-105 active:scale-95'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.yellow.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-black drop-shadow">2</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-black/85 uppercase">Yel</span>
          </button>

          {/* GREEN (3 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('green')}
            onClick={() => onPotBall('green')}
            className={`col-span-1 h-14 sm:h-20 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('green')
                ? 'opacity-100 ring-2 ring-green-400/90 shadow-md shadow-green-950/60 hover:scale-105 active:scale-95'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.green.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">3</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/95 uppercase">Grn</span>
          </button>

          {/* BROWN (4 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('brown')}
            onClick={() => onPotBall('brown')}
            className={`col-span-1 h-14 sm:h-20 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('brown')
                ? 'opacity-100 ring-2 ring-amber-500/90 shadow-md shadow-amber-950/60 hover:scale-105 active:scale-95'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.brown.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">4</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/95 uppercase">Brn</span>
          </button>

          {/* BLUE (5 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('blue')}
            onClick={() => onPotBall('blue')}
            className={`col-span-1 h-14 sm:h-20 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('blue')
                ? 'opacity-100 ring-2 ring-blue-400/90 shadow-md shadow-blue-950/60 hover:scale-105 active:scale-95'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.blue.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">5</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/95 uppercase">Blu</span>
          </button>

          {/* PINK (6 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('pink')}
            onClick={() => onPotBall('pink')}
            className={`col-span-1 h-14 sm:h-20 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('pink')
                ? 'opacity-100 ring-2 ring-pink-400/90 shadow-md shadow-pink-950/60 hover:scale-105 active:scale-95'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.pink.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">6</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/95 uppercase">Pnk</span>
          </button>

          {/* BLACK (7 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('black')}
            onClick={() => onPotBall('black')}
            className={`col-span-1 h-14 sm:h-20 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none border border-gray-700 ${
              availableBalls.includes('black')
                ? 'opacity-100 ring-2 ring-gray-400/90 shadow-md shadow-black/80 hover:scale-105 active:scale-95'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.black.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">7</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/95 uppercase">Blk</span>
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STREAMLINED PRIMARY CONTROLS: MISS, FOUL, UNDO, REDO          */}
      {/* Drastically reduced clutter: 1 row desktop, 2 tidy rows mobile */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
        
        {/* MISS / END TURN (Fast 1-tap shot miss) */}
        <button
          type="button"
          onClick={onMiss}
          className="col-span-6 sm:col-span-4 py-2.5 px-2 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-bold text-xs sm:text-sm border border-gray-700 transition flex items-center justify-center space-x-1.5 shadow-md cursor-pointer select-none"
        >
          <ChevronRight className="w-4 h-4 text-emerald-400" />
          <span>Miss / Switch</span>
        </button>

        {/* QUICK FOUL (+4) (Fast 1-tap standard snooker penalty) */}
        <button
          type="button"
          onClick={onQuickFoul4}
          className="col-span-4 sm:col-span-3 py-2.5 px-2 rounded-xl bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 border border-red-500/60 active:scale-95 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1 shadow-md cursor-pointer select-none"
          title="Instant 4-point penalty to opponent"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Foul (+4)</span>
        </button>

        {/* FOUL OPTIONS MODAL (For 5, 6, 7 pts or multiplayer target) */}
        <button
          type="button"
          onClick={() => setIsFoulModalOpen(true)}
          className="col-span-2 sm:col-span-1 py-2.5 px-1 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs transition flex items-center justify-center cursor-pointer select-none"
          title="Custom foul points (5, 6, 7 pts)"
        >
          <span>···</span>
        </button>

        {/* UNDO BUTTON (High prominence for quick corrections) */}
        <button
          type="button"
          disabled={undoStack.length === 0}
          onClick={onUndo}
          className={`col-span-8 sm:col-span-3 py-2.5 px-3 rounded-xl border active:scale-95 font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 cursor-pointer select-none ${
            undoStack.length > 0
              ? 'bg-blue-950/90 text-blue-200 border-blue-500/70 hover:bg-blue-900 shadow-md shadow-blue-950'
              : 'bg-gray-900/40 text-gray-600 border-gray-800/40 cursor-not-allowed'
          }`}
          title="Undo last action (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo{undoStack.length > 0 ? ` (${undoStack.length})` : ''}</span>
        </button>

        {/* REDO BUTTON */}
        <button
          type="button"
          disabled={redoStack.length === 0}
          onClick={onRedo}
          className={`col-span-4 sm:col-span-1 py-2.5 px-2 rounded-xl border active:scale-95 font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1 cursor-pointer select-none ${
            redoStack.length > 0
              ? 'bg-purple-950/80 text-purple-200 border-purple-500/60 hover:bg-purple-900 shadow-md'
              : 'bg-gray-900/40 text-gray-600 border-gray-800/40 cursor-not-allowed'
          }`}
          title="Redo action (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAST ACTION FEEDBACK                                          */}
      {/* ------------------------------------------------------------- */}
      {state.lastActionDescription && (
        <p className="text-[11px] text-gray-500 text-center font-mono truncate px-2">
          {state.lastActionDescription}
        </p>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS                                                        */}
      {/* ------------------------------------------------------------- */}
      <FoulModal
        isOpen={isFoulModalOpen}
        onClose={() => setIsFoulModalOpen(false)}
        fouledPlayerIndex={state.activePlayerIndex}
        players={resolvedPlayers}
        onConfirmFoul={onConfirmFoul}
      />

      <WinModal
        isOpen={isWinModalOpen}
        players={resolvedPlayers}
        playerScores={state.playerScores}
        playerFrames={projectedFrames}
        frameWinner={frameWinner}
        frameNumber={currentFrameNum}
        bestOf={match.best_of}
        highestBreak={highestBreak}
        highestBreakPlayer={highBreakPlayer}
        isMatchWon={isMatchWon}
        matchWinner={matchWinner}
        onNextFrame={handleNextFrame}
        onFinishMatch={handleFinishMatch}
        onUndo={undoStack.length > 0 ? onUndo : undefined}
      />

      <EndMatchModal
        isOpen={isEndMatchModalOpen}
        onClose={() => setIsEndMatchModalOpen(false)}
        players={resolvedPlayers}
        playerScores={state.playerScores}
        playerFrames={projectedFrames}
        currentFrameNum={currentFrameNum}
        onFinishWithCurrentLeader={handleEndMatchWithLeader}
        onConcedeMatch={handleEndMatchConcede}
        onAbandonMatch={handleEndMatchAbandon}
      />

    </div>
  );
};
