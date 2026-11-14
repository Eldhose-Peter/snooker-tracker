'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  LogOut
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

  // Modals
  const [isFoulModalOpen, setIsFoulModalOpen] = useState(false);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);

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

  // Leader calculation (with tie support)
  const maxScore = Math.max(...state.playerScores);
  const leadingIndices = state.playerScores
    .map((s, idx) => (s === maxScore ? idx : -1))
    .filter(idx => idx !== -1);
  const isLeaderTied = leadingIndices.length > 1;
  const leaderNames = leadingIndices.map(idx => resolvedPlayers[idx]?.name || `P${idx + 1}`).join(' & ');

  // Determine current ball on description
  const getBallOnLabel = (): string => {
    if (state.freeBallActive) return 'FREE BALL (Nominate Any Ball)';
    if (state.tablePhase === 'RED') return 'RED BALL (1 pt)';
    if (state.tablePhase === 'COLOR_AFTER_RED') return 'ANY COLOR (2 to 7 pts)';
    if (state.tablePhase === 'COLORS_SEQUENCE') {
      const ball = COLOR_ORDER[state.colorsSequenceIndex];
      return ball ? `${ball.toUpperCase()} (${BALL_CONFIGS[ball].points} pts)` : 'None';
    }
    return 'Frame Over';
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4 space-y-3 sm:space-y-4">
      
      {/* ------------------------------------------------------------- */}
      {/* MATCH HEADER & SERIES TRACKER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1611] border border-emerald-900/40 rounded-2xl text-xs gap-2 shadow-sm">
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

        {/* Frames Tally & End Match Button */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex items-center space-x-2 font-mono text-xs font-bold">
            {resolvedPlayers.map((p, idx) => (
              <div key={p.id} className="flex items-center space-x-1">
                <span className="text-gray-400 truncate max-w-[50px] sm:max-w-[70px]">{p.name}:</span>
                <span className="text-emerald-300 font-black">{playerFrames[idx] || 0}</span>
                {idx < resolvedPlayers.length - 1 && <span className="text-gray-600">·</span>}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsEndMatchModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-red-950/70 hover:bg-red-900/90 border border-red-700/50 text-red-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
            title="End or Concede Match Early"
          >
            <LogOut className="w-3 h-3" />
            <span>End Match</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MULTIPLAYER SCORE CARDS (ACTIVE PLAYER GLOW) */}
      {/* ------------------------------------------------------------- */}
      <div className={`grid gap-2 sm:gap-3 ${
        playerCount === 2 
          ? 'grid-cols-2' 
          : playerCount === 3 
          ? 'grid-cols-1 sm:grid-cols-3' 
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
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
              title="Click to set active player at table"
              className={`relative p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-[#103822] to-[#0a2315] border-emerald-400 shadow-lg shadow-emerald-950 ring-2 ring-emerald-500/30'
                  : 'bg-[#0d1712]/85 border-gray-800 opacity-80 hover:opacity-100 hover:border-emerald-900/60'
              }`}
            >
              {/* Turn Sequence & At Table Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-gray-800 text-gray-400'
                }`}>
                  #{idx + 1}
                </span>

                {isActive && (
                  <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow">
                    <Zap className="w-2.5 h-2.5 fill-black" /> At Table
                  </div>
                )}

                <div className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/40 text-emerald-300 font-mono font-bold">
                  {framesWon} {framesWon === 1 ? 'frame' : 'frames'}
                </div>
              </div>

              {/* Player Name */}
              <div className="min-w-0 pr-1">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {player.name}
                </h2>
                {player.nickname && (
                  <p className="text-[10px] text-emerald-400/80 truncate">
                    &ldquo;{player.nickname}&rdquo;
                  </p>
                )}
              </div>

              {/* Score Display */}
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight">
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
      {/* CURRENT BREAK ACCUMULATOR & BALL CHIPS */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-card rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-600/40 flex items-center space-x-2">
            <div className="text-left">
              <span className="text-[9px] text-gray-400 uppercase font-semibold block leading-none">
                {activePlayer.name}&apos;s
              </span>
              <span className="text-xs text-emerald-400 uppercase font-bold">
                Break
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
              {state.currentBreak}
            </span>
          </div>

          {/* Balls potted in current break */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-[200px] sm:max-w-xs scrollbar-none">
            {state.currentBreakBalls.length === 0 ? (
              <span className="text-xs text-gray-500 italic">No balls potted yet in break</span>
            ) : (
              state.currentBreakBalls.map((b, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm border border-black/20"
                  style={{ backgroundColor: BALL_CONFIGS[b].colorHex }}
                  title={`${BALL_CONFIGS[b].name} (+${BALL_CONFIGS[b].points})`}
                />
              ))
            )}
          </div>
        </div>

        {/* Ball On HUD Indicator */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Target</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-300">
              {getBallOnLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SNOOKER TABLE MATH HUD: REMAINING & SNOOKERS NEEDED */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {/* Table Remaining Points */}
        <div className="bg-[#0b140f] border border-emerald-900/40 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Table Left:</span>
          <span className="text-sm sm:text-base font-black text-white font-mono">
            {state.pointsRemaining} pts
          </span>
        </div>

        {/* Reds Remaining */}
        <div className="bg-[#0b140f] border border-emerald-900/40 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Reds Left:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block shadow-sm" />
            <span className="text-sm sm:text-base font-black text-white font-mono">
              {state.redsRemaining}
            </span>
          </div>
        </div>

        {/* Snookers Alert or Difference */}
        <div className="col-span-2 sm:col-span-1 bg-[#0b140f] border border-emerald-900/40 rounded-xl p-2.5 flex items-center justify-between">
          {state.snookersNeeded.needed ? (
            <div className="flex items-center space-x-1.5 text-amber-400 w-full min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="text-xs font-bold truncate">
                {state.snookersNeeded.trailers.map((t, i) => {
                  const p = resolvedPlayers[t.playerIndex];
                  return (
                    <span key={t.playerIndex}>
                      {p?.name || `P${t.playerIndex + 1}`} ({t.count} snk){i < state.snookersNeeded.trailers.length - 1 ? ', ' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-gray-400 font-medium">
                {isLeaderTied ? 'Tied for Lead:' : 'Leading:'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-200 truncate font-mono">
                {isLeaderTied ? leaderNames : (resolvedPlayers[leadingIndices[0]]?.name || 'Player 1')} ({maxScore} pts)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TOUCH-FRIENDLY SNOOKER BALLS GRID */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-felt rounded-3xl p-2.5 sm:p-5 shadow-inner">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
            Tap Ball to Pot
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
            {getBallOnLabel()}
          </span>
        </div>

        {/* Ergonomic 4-col layout on mobile (2 rows), 7-col on sm+ screens */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
          
          {/* RED BALL (1 pt) - Large 2-column primary button on mobile */}
          <button
            type="button"
            disabled={!availableBalls.includes('red')}
            onClick={() => onPotBall('red')}
            className={`col-span-2 sm:col-span-1 h-16 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('red')
                ? 'opacity-100 ring-2 ring-red-400/90 shadow-lg shadow-red-950/60 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
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
            className={`col-span-1 h-16 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('yellow')
                ? 'opacity-100 ring-2 ring-yellow-400/90 shadow-lg shadow-yellow-950/60 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
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
            className={`col-span-1 h-16 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('green')
                ? 'opacity-100 ring-2 ring-green-400/90 shadow-lg shadow-green-950/60 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
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
            className={`col-span-1 h-16 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('brown')
                ? 'opacity-100 ring-2 ring-amber-500/90 shadow-lg shadow-amber-950/60 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
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
            className={`col-span-1 h-16 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('blue')
                ? 'opacity-100 ring-2 ring-blue-400/90 shadow-lg shadow-blue-950/60 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
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
            className={`col-span-1 h-16 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none ${
              availableBalls.includes('pink')
                ? 'opacity-100 ring-2 ring-pink-400/90 shadow-lg shadow-pink-950/60 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
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
            className={`col-span-1 h-16 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition select-none border border-gray-700 ${
              availableBalls.includes('black')
                ? 'opacity-100 ring-2 ring-gray-400/90 shadow-lg shadow-black/80 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
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
      {/* PRIMARY CONTROLS: MISS, QUICK FOUL, UNDO, REDO, FOUL MODAL    */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-6 gap-2">
        
        {/* MISS / END TURN (Fast 1-tap shot miss) */}
        <button
          type="button"
          onClick={onMiss}
          className="col-span-3 sm:col-span-2 py-3 px-3 rounded-2xl bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-black text-xs sm:text-sm border border-gray-700 transition flex items-center justify-center space-x-1.5 shadow-md cursor-pointer select-none"
        >
          <ChevronRight className="w-4 h-4 text-emerald-400" />
          <span>Miss / Next Turn</span>
        </button>

        {/* QUICK FOUL (+4) (Fast 1-tap standard snooker penalty) */}
        <button
          type="button"
          onClick={onQuickFoul4}
          className="col-span-3 sm:col-span-2 py-3 px-3 rounded-2xl bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 border border-red-500/60 active:scale-95 text-white font-black text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 shadow-md cursor-pointer select-none"
          title="Instant 4-point penalty to opponent"
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Foul (+4 Pts)</span>
        </button>

        {/* FOUL OPTIONS MODAL (For 5, 6, 7 pts, or multiplayer targeting) */}
        <button
          type="button"
          onClick={() => setIsFoulModalOpen(true)}
          className="col-span-2 sm:col-span-2 py-2.5 sm:py-3 px-2 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1 cursor-pointer select-none"
        >
          <span>Foul Options...</span>
        </button>

        {/* UNDO BUTTON (High prominence for quick corrections) */}
        <button
          type="button"
          disabled={undoStack.length === 0}
          onClick={onUndo}
          className={`col-span-2 sm:col-span-3 py-2.5 sm:py-3 px-2 rounded-2xl border active:scale-95 font-black text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 cursor-pointer select-none ${
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
          className={`col-span-2 sm:col-span-3 py-2.5 sm:py-3 px-2 rounded-2xl border active:scale-95 font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 cursor-pointer select-none ${
            redoStack.length > 0
              ? 'bg-purple-950/80 text-purple-200 border-purple-500/60 hover:bg-purple-900 shadow-md'
              : 'bg-gray-900/40 text-gray-600 border-gray-800/40 cursor-not-allowed'
          }`}
          title="Redo action (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Redo{redoStack.length > 0 ? ` (${redoStack.length})` : ''}</span>
        </button>

        {/* FOOTER ACTIONS: FREE BALL, CONCEDE FRAME & END MATCH */}
        <div className="col-span-6 flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-emerald-950/80">
          <button
            type="button"
            onClick={onToggleFreeBall}
            className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer select-none ${
              state.freeBallActive
                ? 'bg-yellow-500 text-black border-yellow-400 shadow-md shadow-yellow-950'
                : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${state.freeBallActive ? 'text-black' : 'text-yellow-400'}`} />
            <span>{state.freeBallActive ? 'Free Ball Active' : 'Nominate Free Ball'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onConcede}
              className="py-1.5 px-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-gray-900 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Concede Frame</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEndMatchModalOpen(true)}
              className="py-1.5 px-2.5 rounded-xl text-red-400/90 hover:text-red-300 hover:bg-red-950/40 border border-transparent hover:border-red-900/50 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>End Match Early</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAST ACTION FEEDBACK */}
      {/* ------------------------------------------------------------- */}
      {state.lastActionDescription && (
        <div className="text-center py-1">
          <p className="text-xs text-gray-400 font-mono tracking-tight">
            {state.lastActionDescription}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
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
