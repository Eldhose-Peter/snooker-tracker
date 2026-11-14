'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BallType, 
  BALL_CONFIGS, 
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

interface ActionFeedback {
  id: number;
  badge: string;
  detail: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon?: 'ball' | 'miss' | 'foul' | 'switch' | 'undo' | 'redo';
  ballHex?: string;
}

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

  // Feedback state for prominent instant shot and action flashes
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((fb: Omit<ActionFeedback, 'id'>) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    const newFb: ActionFeedback = {
      ...fb,
      id: Date.now() + Math.random(),
    };
    setFeedback(newFb);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const triggerHaptic = (ms: number | number[] = 10) => {
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
    triggerHaptic(18);
    const nextState = handlePot(state, ball);
    applyStateMutation(nextState);

    const ballConfig = BALL_CONFIGS[ball];
    const activeName = resolvedPlayers[state.activePlayerIndex]?.name || `Player ${state.activePlayerIndex + 1}`;
    
    const styleMap: Record<BallType, { bg: string; text: string; border: string }> = {
      red: { bg: 'bg-red-600', text: 'text-white font-black', border: 'border-red-400 ring-2 ring-red-400/80 shadow-lg shadow-red-950/80' },
      yellow: { bg: 'bg-yellow-400', text: 'text-black font-black', border: 'border-yellow-200 ring-2 ring-yellow-300 shadow-lg shadow-yellow-950/60' },
      green: { bg: 'bg-emerald-600', text: 'text-white font-black', border: 'border-emerald-300 ring-2 ring-emerald-400/80 shadow-lg shadow-emerald-950/80' },
      brown: { bg: 'bg-[#7e3f16]', text: 'text-white font-black', border: 'border-amber-400 ring-2 ring-amber-500/80 shadow-lg shadow-amber-950/80' },
      blue: { bg: 'bg-blue-600', text: 'text-white font-black', border: 'border-blue-300 ring-2 ring-blue-400/80 shadow-lg shadow-blue-950/80' },
      pink: { bg: 'bg-pink-500', text: 'text-white font-black', border: 'border-pink-200 ring-2 ring-pink-300/90 shadow-lg shadow-pink-950/80' },
      black: { bg: 'bg-gray-950', text: 'text-emerald-300 font-black', border: 'border-gray-500 ring-2 ring-gray-400/80 shadow-lg shadow-black' },
    };

    const s = styleMap[ball];
    showFeedback({
      badge: `+${ballConfig.points} ${ball.toUpperCase()}`,
      detail: nextState.isFrameOver 
        ? `${activeName} won Frame ${currentFrameNum}!` 
        : `${activeName} • Break: ${nextState.currentBreak} pts`,
      bgClass: s.bg,
      textClass: s.text,
      borderClass: s.border,
      ballHex: ballConfig.colorHex,
      icon: 'ball',
    });
  };

  const onMiss = () => {
    triggerHaptic(14);
    const nextState = handleMiss(state);
    applyStateMutation(nextState);

    const nextPlayerName = resolvedPlayers[nextState.activePlayerIndex]?.name || `Player ${nextState.activePlayerIndex + 1}`;
    showFeedback({
      badge: 'MISS',
      detail: `Turn passes to ${nextPlayerName}`,
      bgClass: 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900',
      textClass: 'text-amber-300 font-black',
      borderClass: 'border-amber-400 ring-2 ring-amber-400/60 shadow-lg shadow-black',
      icon: 'miss',
    });
  };

  const onConfirmFoul = (
    points: number, 
    target: 'all_opponents' | 'next_player' | number, 
    awardFreeBall: boolean, 
    passBack: boolean
  ) => {
    triggerHaptic([20, 50, 20]);
    const nextState = handleFoul(state, points, target, awardFreeBall, passBack);
    applyStateMutation(nextState);

    const nextPlayerName = resolvedPlayers[nextState.activePlayerIndex]?.name || `Player ${nextState.activePlayerIndex + 1}`;
    showFeedback({
      badge: `FOUL (+${points} PTS)`,
      detail: passBack ? `Turn passed back to striker` : `Turn to ${nextPlayerName}`,
      bgClass: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700',
      textClass: 'text-white font-black',
      borderClass: 'border-red-300 ring-2 ring-red-400/90 shadow-xl shadow-red-950',
      icon: 'foul',
    });
  };

  // Instant 1-tap standard 4-point foul (most common in casual snooker)
  const onQuickFoul4 = () => {
    triggerHaptic([20, 50, 20]);
    const target = playerCount > 2 ? 'all_opponents' : ((state.activePlayerIndex + 1) % playerCount);
    const nextState = handleFoul(state, 4, target, false, false);
    applyStateMutation(nextState);

    const nextPlayerName = resolvedPlayers[nextState.activePlayerIndex]?.name || `Player ${nextState.activePlayerIndex + 1}`;
    showFeedback({
      badge: 'FOUL (+4 PTS)',
      detail: playerCount > 2 ? `+4 to all opponents • Turn to ${nextPlayerName}` : `+4 pts awarded • Turn to ${nextPlayerName}`,
      bgClass: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700',
      textClass: 'text-white font-black',
      borderClass: 'border-red-300 ring-2 ring-red-400/90 shadow-xl shadow-red-950',
      icon: 'foul',
    });
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
    triggerHaptic(12);
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, state]);
    setIsWinModalOpen(false);
    setState(previous);

    const prevActiveName = resolvedPlayers[previous.activePlayerIndex]?.name || `Player ${previous.activePlayerIndex + 1}`;
    showFeedback({
      badge: 'UNDO',
      detail: `Reverted shot • At table: ${prevActiveName}`,
      bgClass: 'bg-blue-800',
      textClass: 'text-white font-bold',
      borderClass: 'border-blue-400 ring-2 ring-blue-400/60 shadow-lg shadow-blue-950',
      icon: 'undo',
    });
  }, [undoStack, state, resolvedPlayers, showFeedback]);

  // Redo Handler
  const onRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    triggerHaptic(12);
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, state]);
    setState(next);
    if (next.isFrameOver && next.winnerIndex !== null) {
      setIsWinModalOpen(true);
    }

    const nextActiveName = resolvedPlayers[next.activePlayerIndex]?.name || `Player ${next.activePlayerIndex + 1}`;
    showFeedback({
      badge: 'REDO',
      detail: `Restored action • At table: ${nextActiveName}`,
      bgClass: 'bg-purple-800',
      textClass: 'text-white font-bold',
      borderClass: 'border-purple-400 ring-2 ring-purple-400/60 shadow-lg shadow-purple-950',
      icon: 'redo',
    });
  }, [redoStack, state, resolvedPlayers, showFeedback]);

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
    triggerHaptic(12);
    const nextState = handleSwitchPlayer(state, targetIndex);
    applyStateMutation(nextState);

    const targetName = resolvedPlayers[targetIndex]?.name || `Player ${targetIndex + 1}`;
    showFeedback({
      badge: 'SWITCH TURN',
      detail: `Now scoring for ${targetName}`,
      bgClass: 'bg-[#103822]',
      textClass: 'text-emerald-300 font-black',
      borderClass: 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-950',
      icon: 'switch',
    });
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

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-1 sm:py-2.5 space-y-1.5 sm:space-y-2.5">
      
      {/* ------------------------------------------------------------- */}
      {/* MATCH HEADER & DISCREET TOP-RIGHT OPTIONS MENU (3-DOTS)       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#0d1611] border border-emerald-900/40 rounded-xl text-xs gap-2 shadow-sm">
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          <span className="font-black text-emerald-400 whitespace-nowrap">Frame {currentFrameNum}</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-300 truncate">
            {match.best_of === 1 ? 'Single Frame' : `Best of ${match.best_of}`}
          </span>
          <span className="text-gray-600">•</span>
          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 whitespace-nowrap">
            <Users className="w-3 h-3 text-emerald-400" />
            {playerCount}P
          </span>
        </div>

        {/* Frames Tally (when best_of > 1 and 2 players) & Discreet 3-Dots Options Menu */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {match.best_of > 1 && playerCount === 2 && (
            <div className="flex items-center space-x-1 font-mono text-xs font-bold text-gray-300">
              <span className="text-emerald-400 font-black">{playerFrames[0] || 0}</span>
              <span className="text-gray-500">-</span>
              <span className="text-emerald-400 font-black">{playerFrames[1] || 0}</span>
            </div>
          )}

          {/* 3-Dots Kebab Options Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
              className="p-1 sm:p-1.5 rounded-lg bg-gray-900/90 hover:bg-gray-800 border border-gray-700/80 text-gray-300 hover:text-white transition flex items-center justify-center cursor-pointer shadow-sm"
              title="Match Options (End Match, Concede, Free Ball)"
              aria-label="Match Options"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {isOptionsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 py-1 bg-[#0c1811] border border-emerald-600/60 rounded-xl shadow-2xl z-50 animate-fade-in text-xs space-y-0.5">
                {match.best_of > 1 && playerCount > 2 && (
                  <div className="px-3 py-1.5 border-b border-emerald-900/60 font-mono text-[11px] text-gray-300">
                    <div className="text-[9px] uppercase font-bold text-gray-500 mb-0.5">Frames Tally</div>
                    <div className="flex flex-wrap gap-2">
                      {resolvedPlayers.map((p, idx) => (
                        <span key={p.id}><strong className="text-white">{p.name}:</strong> <span className="text-emerald-400">{playerFrames[idx] || 0}</span></span>
                      ))}
                    </div>
                  </div>
                )}

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
      {/* COMPACT PLAYER SCORE DISPLAY                                  */}
      {/* 1v1: Side-by-side cards (~50-54px max height)                 */}
      {/* Multiplayer (3-6P): Dense horizontal pill chips (~38-42px)    */}
      {/* ------------------------------------------------------------- */}
      {playerCount === 2 ? (
        /* 1v1 (2 Players): Compact side-by-side cards */
        <div className="grid grid-cols-2 gap-2">
          {resolvedPlayers.map((player, idx) => {
            const isActive = state.activePlayerIndex === idx;
            const score = state.playerScores[idx] ?? 0;
            const highBreak = state.playerHighestBreaks[idx] ?? 0;
            const framesWon = playerFrames[idx] ?? 0;

            return (
              <div
                key={player.id}
                onClick={() => onSwitchActivePlayer(idx)}
                title={isActive ? `Scoring for ${player.name}` : `Tap to switch turn to ${player.name}`}
                className={`relative px-2.5 sm:px-3 py-1.5 h-[50px] sm:h-[54px] rounded-xl border-2 transition-all cursor-pointer select-none flex items-center justify-between ${
                  isActive
                    ? 'bg-gradient-to-r from-[#103822] via-[#14472b] to-[#0a2315] border-emerald-400 shadow-md shadow-emerald-950 ring-2 ring-emerald-400/40'
                    : 'bg-[#0d1712]/75 border-gray-800/80 opacity-70 hover:opacity-100 hover:border-emerald-800/60'
                }`}
              >
                <div className="min-w-0 pr-1.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-gray-500">#{idx + 1}</span>
                    )}
                    <h2 className={`text-sm sm:text-base font-bold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {player.name}
                    </h2>
                    {match.best_of > 1 && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono font-bold flex-shrink-0">
                        {framesWon}F
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isActive ? (
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 fill-emerald-400" /> At Table
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-500 hover:text-gray-300">Tap to switch</span>
                    )}
                    {highBreak > 0 && (
                      <span className="text-[9px] text-amber-400 font-mono flex items-center gap-0.5 ml-1">
                        <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        {highBreak}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-1">
                  <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${isActive ? 'text-emerald-300' : 'text-white'}`}>
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Multiplayer (3-6 Players): Clean, dense horizontal pill/chip cards (~38-42px height) */
        <div className={`grid gap-1.5 sm:gap-2 ${
          playerCount === 3
            ? 'grid-cols-3'
            : playerCount === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : playerCount === 5
            ? 'grid-cols-6 sm:grid-cols-5'
            : 'grid-cols-3 sm:grid-cols-6'
        }`}>
          {resolvedPlayers.map((player, idx) => {
            const isActive = state.activePlayerIndex === idx;
            const score = state.playerScores[idx] ?? 0;
            const highBreak = state.playerHighestBreaks[idx] ?? 0;
            const framesWon = playerFrames[idx] ?? 0;
            const spanClass = playerCount === 5 
              ? (idx < 3 ? 'col-span-2 sm:col-span-1' : 'col-span-3 sm:col-span-1')
              : '';

            return (
              <div
                key={player.id}
                onClick={() => onSwitchActivePlayer(idx)}
                title={isActive ? `Scoring for ${player.name}` : `Tap to switch to ${player.name}`}
                className={`relative px-2 sm:px-2.5 h-[38px] sm:h-10 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center justify-between ${spanClass} ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-950 via-[#103822] to-emerald-950 border-emerald-400 shadow-md shadow-emerald-950 ring-1 ring-emerald-400/50'
                    : 'bg-[#0d1712]/80 border-gray-800/80 hover:border-emerald-700/60 hover:bg-[#122218]/80'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0 pr-1">
                  {isActive ? (
                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 flex-shrink-0 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-gray-500 flex-shrink-0">
                      #{idx + 1}
                    </span>
                  )}
                  <span className={`text-[11px] sm:text-xs font-bold truncate ${isActive ? 'text-white font-black' : 'text-gray-300'}`}>
                    {player.name}
                  </span>
                  {match.best_of > 1 && framesWon > 0 && (
                    <span className="text-[8px] sm:text-[9px] px-1 rounded bg-emerald-900/60 text-emerald-300 font-mono font-bold flex-shrink-0">
                      {framesWon}F
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0 pl-1">
                  {highBreak > 0 && (
                    <span className="text-[9px] text-amber-400 font-mono hidden sm:inline" title={`High Break: ${highBreak}`}>
                      🔥{highBreak}
                    </span>
                  )}
                  <span className={`font-mono font-black text-sm sm:text-base ${isActive ? 'text-emerald-300 text-base sm:text-lg' : 'text-white'}`}>
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* UNIFIED SCORER CONSOLE & TABLE HUD STRIP (TARGET REMOVED)     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#0b140f] border border-emerald-900/60 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-sm">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Active Scorer */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm flex-shrink-0">
              <Zap className="w-2.5 h-2.5 fill-black text-black" />
              AT TABLE
            </span>
            <span className="text-xs sm:text-sm font-black text-white truncate underline decoration-emerald-400 decoration-2">
              {activePlayer.name}
            </span>
          </div>

          {/* Table Metrics: Remaining Points & Reds (Target section removed to maximize mobile space) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-[10px] sm:text-xs font-mono">
            <div className="bg-black/40 px-1.5 sm:px-2 py-0.5 rounded flex items-center space-x-1 border border-gray-800/60">
              <span className="text-gray-400 text-[9px] sm:text-[10px]">Left:</span>
              <span className="font-bold text-white">{state.pointsRemaining}</span>
            </div>
            <div className="bg-black/40 px-1.5 sm:px-2 py-0.5 rounded flex items-center space-x-1 border border-gray-800/60">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block shadow-sm" />
              <span className="font-bold text-white">{state.redsRemaining}</span>
            </div>
          </div>

          {/* Current Break */}
          <div className="flex items-center space-x-1 bg-[#102417] px-2 py-0.5 rounded-lg border border-emerald-800/50 flex-shrink-0">
            <span className="text-[9px] uppercase font-bold text-gray-400">Break</span>
            <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono leading-none">{state.currentBreak}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PROMINENT INSTANT ACTION FEEDBACK BANNER                      */}
      {/* ------------------------------------------------------------- */}
      <div className="relative min-h-[32px] sm:min-h-[36px] flex items-center justify-center">
        {feedback ? (
          <div
            key={feedback.id}
            className={`w-full px-2.5 sm:px-3 py-1 rounded-xl border flex items-center justify-between gap-2 animate-pop-feedback transition-all ${feedback.bgClass} ${feedback.borderClass}`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              {feedback.ballHex && (
                <span
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/60 shadow-sm flex-shrink-0 inline-block"
                  style={{ backgroundColor: feedback.ballHex }}
                />
              )}
              {feedback.icon === 'miss' && <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              {feedback.icon === 'foul' && <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />}
              {feedback.icon === 'switch' && <Users className="w-4 h-4 text-emerald-300 flex-shrink-0" />}
              {feedback.icon === 'undo' && <RotateCcw className="w-4 h-4 text-white flex-shrink-0" />}
              {feedback.icon === 'redo' && <RotateCw className="w-4 h-4 text-white flex-shrink-0" />}
              
              <span className={`text-xs sm:text-sm font-black uppercase tracking-wider ${feedback.textClass}`}>
                {feedback.badge}
              </span>
            </div>

            <span className={`text-[11px] sm:text-xs font-bold truncate opacity-95 ${feedback.textClass}`}>
              {feedback.detail}
            </span>
          </div>
        ) : (
          <div className="w-full px-3 py-1 rounded-xl bg-[#09120c]/70 border border-emerald-950/80 flex items-center justify-between text-gray-400 text-[10px] sm:text-[11px] font-mono">
            <span className="truncate">
              {state.lastActionDescription || 'Table live • Tap a ball to score'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0 ml-1">
              READY
            </span>
          </div>
        )}
      </div>

      {/* Floating Centered Instant Pop Toast (Ultra-High Prominence) */}
      {feedback && (
        <div
          key={`float-${feedback.id}`}
          className="fixed top-14 sm:top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-toast max-w-[92vw] w-max"
        >
          <div className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border-2 shadow-2xl flex items-center space-x-2 text-sm sm:text-base font-black uppercase tracking-wider backdrop-blur-md ${feedback.bgClass} ${feedback.borderClass} ${feedback.textClass}`}>
            {feedback.ballHex && (
              <span
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/80 shadow flex-shrink-0 inline-block"
                style={{ backgroundColor: feedback.ballHex }}
              />
            )}
            <span className="whitespace-nowrap">{feedback.badge}</span>
            <span className="text-xs sm:text-sm font-bold opacity-90 pl-1.5 border-l border-white/30 truncate max-w-[50vw] sm:max-w-none">
              {feedback.detail}
            </span>
          </div>
        </div>
      )}

      {/* Snookers Alert Banner (Appears only when snookers needed) */}
      {state.snookersNeeded.needed && (
        <div className="bg-amber-950/60 border border-amber-600/40 rounded-lg px-2 py-0.5 flex items-center space-x-1.5 text-amber-300 text-[10px] sm:text-[11px]">
          <ShieldAlert className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="font-bold truncate">
            Snookers: {state.snookersNeeded.trailers.map(t => `${resolvedPlayers[t.playerIndex]?.name || `P${t.playerIndex + 1}`} (${t.count})`).join(', ')}
          </span>
        </div>
      )}

      {/* Free Ball Active Banner (With 1-tap dismiss) */}
      {state.freeBallActive && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-2 py-0.5 flex items-center justify-between text-yellow-300 text-[10px] sm:text-[11px]">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Sparkles className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            <span className="font-bold truncate">FREE BALL: Nominated color is on</span>
          </div>
          <button
            type="button"
            onClick={onToggleFreeBall}
            className="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black hover:bg-yellow-400 transition cursor-pointer flex-shrink-0 ml-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOUCH-FRIENDLY SNOOKER BALLS GRID                             */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-felt rounded-xl p-1.5 sm:p-2.5 shadow-inner">
        {/* 4-col layout on mobile (2 rows), 7-col on sm+ screens */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-1.5">
          
          {/* RED BALL (1 pt) - Large 2-column primary button on mobile */}
          <button
            type="button"
            disabled={!availableBalls.includes('red')}
            onClick={() => onPotBall('red')}
            className={`col-span-2 sm:col-span-1 h-11 sm:h-16 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('red')
                ? 'opacity-100 ring-2 ring-red-400/90 shadow-md shadow-red-950/60 hover:scale-105 active:scale-90 active:brightness-135 active:ring-4 active:ring-white/90'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.red.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-lg sm:text-2xl font-black text-white drop-shadow leading-none">1</span>
            <span className="text-[9px] sm:text-xs font-bold text-white/95 uppercase tracking-wider leading-none mt-0.5">Red</span>
          </button>

          {/* YELLOW (2 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('yellow')}
            onClick={() => onPotBall('yellow')}
            className={`col-span-1 h-11 sm:h-16 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('yellow')
                ? 'opacity-100 ring-2 ring-yellow-400/90 shadow-md shadow-yellow-950/60 hover:scale-105 active:scale-90 active:brightness-135 active:ring-4 active:ring-white/90'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.yellow.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-lg sm:text-2xl font-black text-black drop-shadow leading-none">2</span>
            <span className="text-[9px] sm:text-xs font-bold text-black/85 uppercase leading-none mt-0.5">Yel</span>
          </button>

          {/* GREEN (3 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('green')}
            onClick={() => onPotBall('green')}
            className={`col-span-1 h-11 sm:h-16 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('green')
                ? 'opacity-100 ring-2 ring-green-400/90 shadow-md shadow-green-950/60 hover:scale-105 active:scale-90 active:brightness-135 active:ring-4 active:ring-white/90'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.green.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-lg sm:text-2xl font-black text-white drop-shadow leading-none">3</span>
            <span className="text-[9px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Grn</span>
          </button>

          {/* BROWN (4 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('brown')}
            onClick={() => onPotBall('brown')}
            className={`col-span-1 h-11 sm:h-16 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('brown')
                ? 'opacity-100 ring-2 ring-amber-500/90 shadow-md shadow-amber-950/60 hover:scale-105 active:scale-90 active:brightness-135 active:ring-4 active:ring-white/90'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.brown.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-lg sm:text-2xl font-black text-white drop-shadow leading-none">4</span>
            <span className="text-[9px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Brn</span>
          </button>

          {/* BLUE (5 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('blue')}
            onClick={() => onPotBall('blue')}
            className={`col-span-1 h-11 sm:h-16 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('blue')
                ? 'opacity-100 ring-2 ring-blue-400/90 shadow-md shadow-blue-950/60 hover:scale-105 active:scale-90 active:brightness-135 active:ring-4 active:ring-white/90'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.blue.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-lg sm:text-2xl font-black text-white drop-shadow leading-none">5</span>
            <span className="text-[9px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Blu</span>
          </button>

          {/* PINK (6 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('pink')}
            onClick={() => onPotBall('pink')}
            className={`col-span-1 h-11 sm:h-16 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('pink')
                ? 'opacity-100 ring-2 ring-pink-400/90 shadow-md shadow-pink-950/60 hover:scale-105 active:scale-90 active:brightness-135 active:ring-4 active:ring-white/90'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.pink.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-lg sm:text-2xl font-black text-white drop-shadow leading-none">6</span>
            <span className="text-[9px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Pnk</span>
          </button>

          {/* BLACK (7 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('black')}
            onClick={() => onPotBall('black')}
            className={`col-span-1 h-11 sm:h-16 rounded-xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none border border-gray-700 ${
              availableBalls.includes('black')
                ? 'opacity-100 ring-2 ring-gray-400/90 shadow-md shadow-black/80 hover:scale-105 active:scale-90 active:brightness-135 active:ring-4 active:ring-white/90'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.black.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-lg sm:text-2xl font-black text-white drop-shadow leading-none">7</span>
            <span className="text-[9px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Blk</span>
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STREAMLINED PRIMARY CONTROLS: MISS, FOUL, UNDO, REDO          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
        
        {/* MISS / END TURN */}
        <button
          type="button"
          onClick={onMiss}
          className="col-span-6 sm:col-span-4 h-9 sm:h-10 px-2 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-90 active:brightness-135 active:bg-amber-950 active:border-amber-400 active:ring-2 active:ring-amber-400/80 text-white font-bold text-xs sm:text-sm border border-gray-700 transition flex items-center justify-center space-x-1.5 shadow-md cursor-pointer select-none"
        >
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          <span>Miss / Switch</span>
        </button>

        {/* QUICK FOUL (+4) */}
        <button
          type="button"
          onClick={onQuickFoul4}
          className="col-span-4 sm:col-span-3 h-9 sm:h-10 px-2 rounded-xl bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 border border-red-500/60 active:scale-90 active:brightness-140 active:ring-4 active:ring-red-400 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1 shadow-md cursor-pointer select-none"
          title="Instant 4-point penalty to opponent"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Foul (+4)</span>
        </button>

        {/* FOUL OPTIONS MODAL */}
        <button
          type="button"
          onClick={() => setIsFoulModalOpen(true)}
          className="col-span-2 sm:col-span-1 h-9 sm:h-10 px-1 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 active:scale-90 text-gray-300 hover:text-white font-bold text-xs transition flex items-center justify-center cursor-pointer select-none"
          title="Custom foul points (5, 6, 7 pts)"
        >
          <span>···</span>
        </button>

        {/* UNDO BUTTON */}
        <button
          type="button"
          disabled={undoStack.length === 0}
          onClick={onUndo}
          className={`col-span-8 sm:col-span-3 h-9 sm:h-10 px-2 sm:px-3 rounded-xl border font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 cursor-pointer select-none ${
            undoStack.length > 0
              ? 'bg-blue-950/90 text-blue-200 border-blue-500/70 hover:bg-blue-900 active:scale-90 active:brightness-135 active:ring-2 active:ring-blue-400 shadow-md shadow-blue-950'
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
          className={`col-span-4 sm:col-span-1 h-9 sm:h-10 px-2 rounded-xl border font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1 cursor-pointer select-none ${
            redoStack.length > 0
              ? 'bg-purple-950/80 text-purple-200 border-purple-500/60 hover:bg-purple-900 active:scale-90 active:brightness-135 active:ring-2 active:ring-purple-400 shadow-md'
              : 'bg-gray-900/40 text-gray-600 border-gray-800/40 cursor-not-allowed'
          }`}
          title="Redo action (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>
      </div>


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
