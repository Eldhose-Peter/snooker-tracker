'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BallType, 
  BALL_CONFIGS, 
  Player, 
  Match, 
  FrameState,
  ActivityItem,
  MatchEvent
} from '@/types/snooker';
import { 
  createInitialFrameState, 
  getAvailableBalls, 
  handlePot, 
  handleMiss, 
  handleFoul, 
  handleSwitchPlayer, 
  handleConcede,
  handleAdjustReds
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
  MoreVertical,
  X
} from 'lucide-react';

const getScoreIncreaseColor = (points: number): string => {
  switch (points) {
    case 1:
      return 'text-red-400 drop-shadow-[0_2px_8px_rgba(239,68,68,0.95)]';
    case 2:
      return 'text-yellow-300 drop-shadow-[0_2px_8px_rgba(253,224,71,0.95)]';
    case 3:
      return 'text-emerald-400 drop-shadow-[0_2px_8px_rgba(52,211,153,0.95)]';
    case 4:
      return 'text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.95)]';
    case 5:
      return 'text-blue-400 drop-shadow-[0_2px_8px_rgba(96,165,250,0.95)]';
    case 6:
      return 'text-pink-400 drop-shadow-[0_2px_8px_rgba(244,114,182,0.95)]';
    case 7:
      return 'text-slate-100 drop-shadow-[0_2px_8px_rgba(255,255,255,0.95)]';
    default:
      return 'text-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.95)]';
  }
};

interface LiveScoreboardProps {
  match: Match;
  players?: Player[];
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
      if (!savedSession.frameState.activities || savedSession.frameState.activities.length === 0) {
        const initBreakOff = (currentFrameNum - 1) % playerCount;
        const breakOffName = playerNames[initBreakOff] || `Player ${initBreakOff + 1}`;
        return {
          ...savedSession.frameState,
          activities: [
            {
              id: `act-init-${Date.now()}`,
              timestamp: Date.now(),
              type: 'frame_start',
              playerIndex: initBreakOff,
              playerName: breakOffName,
              badge: 'BREAK-OFF',
              detail: `Frame ${currentFrameNum} started • Break-off shot by ${breakOffName}`,
              bgClass: 'bg-emerald-950/80',
              textClass: 'text-emerald-300 font-bold',
              borderClass: 'border-emerald-600/50',
            }
          ]
        };
      }
      return savedSession.frameState;
    }
    const initBreakOff = (currentFrameNum - 1) % playerCount;
    const fresh = createInitialFrameState(playerCount, match.reds_count || 15, playerNames);
    const breakOffName = playerNames[initBreakOff] || `Player ${initBreakOff + 1}`;
    if (initBreakOff !== 0) {
      return {
        ...fresh,
        activePlayerIndex: initBreakOff,
        lastActionDescription: `Frame ${currentFrameNum} started. Break-off shot by ${breakOffName}.`,
        activities: [
          {
            id: `act-init-${Date.now()}`,
            timestamp: Date.now(),
            type: 'frame_start',
            playerIndex: initBreakOff,
            playerName: breakOffName,
            badge: 'BREAK-OFF',
            detail: `Frame ${currentFrameNum} started • Break-off shot by ${breakOffName}`,
            bgClass: 'bg-emerald-950/80',
            textClass: 'text-emerald-300 font-bold',
            borderClass: 'border-emerald-600/50',
          }
        ]
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
  const [isAdjustRedsOpen, setIsAdjustRedsOpen] = useState(false);
  const [pendingAdjustReds, setPendingAdjustReds] = useState<number>(state.redsRemaining);

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

  // Helper to append an activity (last 7 ticker) and full event history to state
  const appendActionAndEvent = useCallback((
    nextState: FrameState, 
    activity: ActivityItem, 
    event?: MatchEvent
  ): FrameState => {
    const prevActivities = state.activities || [];
    const updatedActivities = [...prevActivities.slice(-6), activity];
    const prevEvents = state.events || [];
    const updatedEvents = event ? [...prevEvents, event] : prevEvents;
    return {
      ...nextState,
      activities: updatedActivities,
      events: updatedEvents,
    };
  }, [state.activities, state.events]);

  // Score increase animations per player index
  const [scoreAnims, setScoreAnims] = useState<Record<number, { id: number; points: number }>>({});
  const animTimeoutRefs = useRef<Record<number, NodeJS.Timeout>>({});

  const triggerScoreIncreases = useCallback((prevScores: number[], newScores: number[]) => {
    const newAnims: Record<number, { id: number; points: number }> = {};
    let hasAny = false;
    const len = Math.max(prevScores.length, newScores.length);

    for (let i = 0; i < len; i++) {
      const diff = (newScores[i] || 0) - (prevScores[i] || 0);
      if (diff > 0) {
        const animId = Date.now() + Math.random() + i;
        newAnims[i] = { id: animId, points: diff };
        hasAny = true;

        if (animTimeoutRefs.current[i]) {
          clearTimeout(animTimeoutRefs.current[i]);
        }
        animTimeoutRefs.current[i] = setTimeout(() => {
          setScoreAnims(prev => {
            const next = { ...prev };
            delete next[i];
            return next;
          });
        }, 1000);
      }
    }

    if (hasAny) {
      setScoreAnims(prev => ({ ...prev, ...newAnims }));
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(animTimeoutRefs.current).forEach(clearTimeout);
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
    triggerScoreIncreases(state.playerScores, nextState.playerScores);
    setUndoStack((prev) => [...prev, state]);
    setRedoStack([]); // Clear redo stack on new action
    setState(nextState);

    // If frame just concluded, open celebration modal
    if (nextState.isFrameOver && nextState.winnerIndex !== null) {
      setIsWinModalOpen(true);
    }
  }, [state, triggerScoreIncreases]);

  // Actions
  const onPotBall = (ball: BallType) => {
    triggerHaptic(18);
    const nextState = handlePot(state, ball);

    const ballConfig = BALL_CONFIGS[ball];
    const activeIdx = state.activePlayerIndex;
    const activePlayer = resolvedPlayers[activeIdx];
    const activeName = activePlayer?.name || `Player ${activeIdx + 1}`;
    const ptsScored = (nextState.playerScores[activeIdx] ?? 0) - (state.playerScores[activeIdx] ?? 0);
    
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
    const isFreeBallPot = state.freeBallActive;
    const badgeText = isFreeBallPot 
      ? `+${ptsScored} ${ball.toUpperCase()} (FREE)` 
      : `+${ballConfig.points} ${ball.toUpperCase()}`;

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type: 'pot',
      playerIndex: activeIdx,
      playerName: activeName,
      badge: badgeText,
      detail: nextState.isFrameOver 
        ? `${activeName} won Frame ${currentFrameNum}!` 
        : `${activeName} • Break: ${nextState.currentBreak} pts`,
      bgClass: s.bg,
      textClass: s.text,
      borderClass: s.border,
      ballHex: ballConfig.colorHex,
      ballType: ball,
      points: ptsScored,
      icon: 'ball',
    };

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      frameNumber: currentFrameNum,
      type: 'pot',
      playerIndex: activeIdx,
      playerId: activePlayer?.id,
      playerName: activeName,
      ball,
      points: ptsScored,
      breakScore: nextState.currentBreak,
      breakBalls: nextState.currentBreakBalls,
      scoresAfter: [...nextState.playerScores],
      detail: nextState.isFrameOver 
        ? `${activeName} potted ${ballConfig.name} (+${ptsScored} pts) to win Frame ${currentFrameNum}!` 
        : `${activeName} potted ${ballConfig.name} (+${ptsScored} pts) • Break: ${nextState.currentBreak}`,
    };

    applyStateMutation(appendActionAndEvent(nextState, newActivity, newEvent));
  };

  const onMiss = () => {
    triggerHaptic(14);
    const nextState = handleMiss(state);

    const activeIdx = state.activePlayerIndex;
    const activePlayer = resolvedPlayers[activeIdx];
    const activeName = activePlayer?.name || `Player ${activeIdx + 1}`;
    const nextPlayerName = resolvedPlayers[nextState.activePlayerIndex]?.name || `Player ${nextState.activePlayerIndex + 1}`;
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type: 'miss',
      playerIndex: activeIdx,
      playerName: activeName,
      badge: 'MISS',
      detail: `${activeName} missed • Turn to ${nextPlayerName}`,
      bgClass: 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900',
      textClass: 'text-amber-300 font-black',
      borderClass: 'border-amber-400 ring-2 ring-amber-400/60 shadow-lg shadow-black',
      icon: 'miss',
    };

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      frameNumber: currentFrameNum,
      type: 'miss',
      playerIndex: activeIdx,
      playerId: activePlayer?.id,
      playerName: activeName,
      breakScore: state.currentBreak,
      isBreakEnd: state.currentBreak > 0,
      breakBalls: state.currentBreakBalls,
      scoresAfter: [...nextState.playerScores],
      detail: state.currentBreak > 0
        ? `${activeName} ended break of ${state.currentBreak} pts. Turn to ${nextPlayerName}`
        : `${activeName} missed shot. Turn to ${nextPlayerName}`,
    };

    applyStateMutation(appendActionAndEvent(nextState, newActivity, newEvent));
  };

  const onConfirmFoul = (
    points: number, 
    target: 'all_opponents' | 'next_player' | number, 
    awardFreeBall: boolean, 
    passBack: boolean,
    redsPocketed: number = 0
  ) => {
    triggerHaptic([20, 50, 20]);
    const nextState = handleFoul(state, points, target, awardFreeBall, passBack, redsPocketed);

    const activeIdx = state.activePlayerIndex;
    const activePlayer = resolvedPlayers[activeIdx];
    const activeName = activePlayer?.name || `Player ${activeIdx + 1}`;
    const nextPlayerName = resolvedPlayers[nextState.activePlayerIndex]?.name || `Player ${nextState.activePlayerIndex + 1}`;
    const redsPocketedDesc = redsPocketed > 0 ? ` • ${redsPocketed} red${redsPocketed > 1 ? 's' : ''} pocketed` : '';
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type: 'foul',
      playerIndex: activeIdx,
      playerName: activeName,
      badge: `FOUL (+${points} PTS)`,
      detail: passBack 
        ? `${activeName} fouled (+${points})${redsPocketedDesc} • Turn passed back` 
        : `${activeName} fouled (+${points})${redsPocketedDesc} • Turn to ${nextPlayerName}`,
      bgClass: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700',
      textClass: 'text-white font-black',
      borderClass: 'border-red-300 ring-2 ring-red-400/90 shadow-xl shadow-red-950',
      points,
      icon: 'foul',
    };

    let awardedIndices: number[] = [];
    if (target === 'all_opponents') {
      awardedIndices = resolvedPlayers.map((_, i) => i).filter(i => i !== activeIdx);
    } else if (target === 'next_player') {
      awardedIndices = [(activeIdx + 1) % playerCount];
    } else if (typeof target === 'number') {
      awardedIndices = [target];
    }

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      frameNumber: currentFrameNum,
      type: 'foul',
      playerIndex: activeIdx,
      playerId: activePlayer?.id,
      playerName: activeName,
      foulPoints: points,
      awardedTo: awardedIndices,
      freeBallAwarded: awardFreeBall,
      passBack,
      redsPocketedOnFoul: redsPocketed,
      redsRemainingAfter: nextState.redsRemaining,
      breakScore: state.currentBreak,
      isBreakEnd: state.currentBreak > 0,
      scoresAfter: [...nextState.playerScores],
      detail: passBack 
        ? `${activeName} fouled (+${points} pts)${redsPocketedDesc}. Turn passed back.` 
        : `${activeName} fouled (+${points} pts)${redsPocketedDesc}. Turn to ${nextPlayerName}.`,
    };

    applyStateMutation(appendActionAndEvent(nextState, newActivity, newEvent));
  };

  const onAdjustReds = (newCount: number) => {
    if (newCount === state.redsRemaining) {
      setIsAdjustRedsOpen(false);
      return;
    }
    triggerHaptic(14);
    const nextState = handleAdjustReds(state, newCount);
    const activeIdx = state.activePlayerIndex;
    const activePlayer = resolvedPlayers[activeIdx];
    const activeName = activePlayer?.name || `Player ${activeIdx + 1}`;

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type: 'adjust_reds',
      playerIndex: activeIdx,
      playerName: activeName,
      badge: `REDS: ${newCount}`,
      detail: `${activeName} • Reds adjusted from ${state.redsRemaining} to ${newCount}`,
      bgClass: 'bg-red-950/80',
      textClass: 'text-red-300 font-bold',
      borderClass: 'border-red-500/60 ring-2 ring-red-500/50',
      icon: 'adjust',
    };

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      frameNumber: currentFrameNum,
      type: 'adjust_reds',
      playerIndex: activeIdx,
      playerId: activePlayer?.id,
      playerName: activeName,
      redsRemainingAfter: newCount,
      scoresAfter: [...nextState.playerScores],
      detail: `Reds remaining adjusted from ${state.redsRemaining} to ${newCount}.`,
    };

    applyStateMutation(appendActionAndEvent(nextState, newActivity, newEvent));
    setIsAdjustRedsOpen(false);
  };

  // Instant 1-tap standard 4-point foul
  const onQuickFoul4 = () => {
    triggerHaptic([20, 50, 20]);
    const target = playerCount > 2 ? 'all_opponents' : ((state.activePlayerIndex + 1) % playerCount);
    const nextState = handleFoul(state, 4, target, false, false);

    const activeIdx = state.activePlayerIndex;
    const activePlayer = resolvedPlayers[activeIdx];
    const activeName = activePlayer?.name || `Player ${activeIdx + 1}`;
    const nextPlayerName = resolvedPlayers[nextState.activePlayerIndex]?.name || `Player ${nextState.activePlayerIndex + 1}`;
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type: 'foul',
      playerIndex: activeIdx,
      playerName: activeName,
      badge: 'FOUL (+4 PTS)',
      detail: playerCount > 2 
        ? `${activeName} fouled • +4 to all opponents • Turn to ${nextPlayerName}` 
        : `${activeName} fouled • +4 pts awarded • Turn to ${nextPlayerName}`,
      bgClass: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700',
      textClass: 'text-white font-black',
      borderClass: 'border-red-300 ring-2 ring-red-400/90 shadow-xl shadow-red-950',
      points: 4,
      icon: 'foul',
    };

    let awardedIndices: number[] = [];
    if (target === 'all_opponents') {
      awardedIndices = resolvedPlayers.map((_, i) => i).filter(i => i !== activeIdx);
    } else {
      awardedIndices = [Number(target)];
    }

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      frameNumber: currentFrameNum,
      type: 'foul',
      playerIndex: activeIdx,
      playerId: activePlayer?.id,
      playerName: activeName,
      foulPoints: 4,
      awardedTo: awardedIndices,
      freeBallAwarded: false,
      passBack: false,
      breakScore: state.currentBreak,
      isBreakEnd: state.currentBreak > 0,
      scoresAfter: [...nextState.playerScores],
      detail: `${activeName} committed standard foul (+4 pts). Turn to ${nextPlayerName}.`,
    };

    applyStateMutation(appendActionAndEvent(nextState, newActivity, newEvent));
  };

  const onConcede = () => {
    const playerAtTable = resolvedPlayers[state.activePlayerIndex] || { name: `Player ${state.activePlayerIndex + 1}` };
    if (window.confirm(`Are you sure ${playerAtTable.name} wants to concede this frame?`)) {
      const nextState = handleConcede(state, state.activePlayerIndex);
      const winnerName = nextState.winnerIndex !== null ? (resolvedPlayers[nextState.winnerIndex]?.name || `Player ${nextState.winnerIndex + 1}`) : 'Opponent';

      const newActivity: ActivityItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        type: 'concede',
        playerIndex: state.activePlayerIndex,
        playerName: playerAtTable.name,
        badge: 'CONCEDED',
        detail: `${playerAtTable.name} conceded • ${winnerName} wins frame`,
        bgClass: 'bg-gradient-to-r from-gray-900 via-red-950 to-gray-900',
        textClass: 'text-amber-300 font-black',
        borderClass: 'border-red-500 ring-2 ring-red-500/60 shadow-lg shadow-black',
      };

      const concedeEvent: MatchEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        frameNumber: currentFrameNum,
        type: 'concede',
        playerIndex: state.activePlayerIndex,
        playerId: playerAtTable?.id,
        playerName: playerAtTable.name,
        scoresAfter: [...nextState.playerScores],
        detail: `${playerAtTable.name} conceded Frame ${currentFrameNum}. ${winnerName} wins.`,
      };

      applyStateMutation(appendActionAndEvent(nextState, newActivity, concedeEvent));
    }
  };

  // Undo Handler
  const onUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    triggerHaptic(12);
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, state]);
    setIsWinModalOpen(false);
    Object.values(animTimeoutRefs.current).forEach(clearTimeout);
    animTimeoutRefs.current = {};
    setScoreAnims({});
    setState(previous);
  }, [undoStack, state]);

  // Redo Handler
  const onRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    triggerHaptic(12);
    const next = redoStack[redoStack.length - 1];
    triggerScoreIncreases(state.playerScores, next.playerScores);
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, state]);
    setState(next);
    if (next.isFrameOver && next.winnerIndex !== null) {
      setIsWinModalOpen(true);
    }
  }, [redoStack, state, triggerScoreIncreases]);

  // Keyboard Shortcuts
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
    const isNowActive = !state.freeBallActive;
    const activeName = resolvedPlayers[state.activePlayerIndex]?.name || `Player ${state.activePlayerIndex + 1}`;
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type: 'switch',
      playerIndex: state.activePlayerIndex,
      playerName: activeName,
      badge: isNowActive ? 'FREE BALL' : 'FREE BALL OFF',
      detail: isNowActive ? `${activeName} nominated Free Ball` : 'Free Ball cancelled',
      bgClass: 'bg-purple-950/80',
      textClass: 'text-purple-200 font-bold',
      borderClass: 'border-purple-500/60 ring-2 ring-purple-500/50',
    };

    const freeBallEvent: MatchEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      frameNumber: currentFrameNum,
      type: 'free_ball',
      playerIndex: state.activePlayerIndex,
      playerId: resolvedPlayers[state.activePlayerIndex]?.id,
      playerName: activeName,
      freeBallAwarded: isNowActive,
      scoresAfter: [...state.playerScores],
      detail: isNowActive ? `${activeName} nominated Free Ball` : 'Free Ball cancelled',
    };

    applyStateMutation(appendActionAndEvent({
      ...state,
      freeBallActive: isNowActive,
      lastActionDescription: isNowActive ? 'Free ball nominated' : 'Free ball cancelled',
    }, newActivity, freeBallEvent));
  };

  const onSwitchActivePlayer = useCallback((targetIndex: number) => {
    if (targetIndex === state.activePlayerIndex || state.isFrameOver) return;
    triggerHaptic(12);
    const nextState = handleSwitchPlayer(state, targetIndex);

    const targetName = resolvedPlayers[targetIndex]?.name || `Player ${targetIndex + 1}`;
    const now = Date.now();
    const newActivity: ActivityItem = {
      id: `act-${now}-${targetIndex}`,
      timestamp: now,
      type: 'switch',
      playerIndex: targetIndex,
      playerName: targetName,
      badge: 'SWITCH TURN',
      detail: `Now scoring for ${targetName}`,
      bgClass: 'bg-[#103822]',
      textClass: 'text-emerald-300 font-black',
      borderClass: 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-950',
      icon: 'switch',
    };

    const switchEvent: MatchEvent = {
      id: `evt-${now}-${targetIndex}`,
      timestamp: now,
      frameNumber: currentFrameNum,
      type: 'switch',
      playerIndex: targetIndex,
      playerId: resolvedPlayers[targetIndex]?.id,
      playerName: targetName,
      scoresAfter: [...nextState.playerScores],
      detail: `Active player switched to ${targetName}.`,
    };

    applyStateMutation(appendActionAndEvent(nextState, newActivity, switchEvent));
  }, [state, resolvedPlayers, currentFrameNum, applyStateMutation, appendActionAndEvent]);

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

      await recordFrameCompleted(
        match.id,
        currentFrameNum,
        state.playerScores,
        winnerPlayer.id,
        highestBreak,
        highBreakPlayerId,
        state.events || []
      );

      setPlayerFrames(updatedFrames);
    }

    setIsWinModalOpen(false);
    Object.values(animTimeoutRefs.current).forEach(clearTimeout);
    animTimeoutRefs.current = {};
    setScoreAnims({});
    const nextFrameNum = currentFrameNum + 1;
    setCurrentFrameNum(nextFrameNum);

    const nextBreakOffIndex = (nextFrameNum - 1) % playerCount;
    const freshState = createInitialFrameState(playerCount, match.reds_count || 15, playerNames);
    const breakOffName = playerNames[nextBreakOffIndex] || `Player ${nextBreakOffIndex + 1}`;
    setState({
      ...freshState,
      activePlayerIndex: nextBreakOffIndex,
      lastActionDescription: `Frame ${nextFrameNum} started. Break-off shot by ${breakOffName}.`,
      activities: [
        {
          id: `act-init-${Date.now()}`,
          timestamp: Date.now(),
          type: 'frame_start',
          playerIndex: nextBreakOffIndex,
          playerName: breakOffName,
          badge: 'BREAK-OFF',
          detail: `Frame ${nextFrameNum} started • Break-off shot by ${breakOffName}`,
          bgClass: 'bg-emerald-950/80',
          textClass: 'text-emerald-300 font-bold',
          borderClass: 'border-emerald-600/50',
        }
      ],
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
        highBreakPlayerId,
        state.events || []
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

  const currentActivities: ActivityItem[] = React.useMemo(() => {
    if (state.activities && state.activities.length > 0) {
      return state.activities;
    }
    const pName = resolvedPlayers[state.activePlayerIndex]?.name || `Player ${state.activePlayerIndex + 1}`;
    return [
      {
        id: 'act-init-fallback',
        timestamp: 0,
        type: 'frame_start',
        playerIndex: state.activePlayerIndex,
        playerName: pName,
        badge: 'READY',
        detail: state.lastActionDescription || 'Table live • Tap a ball to score',
        bgClass: 'bg-[#09120c]/80',
        textClass: 'text-emerald-400 font-bold',
        borderClass: 'border-emerald-950/80',
      }
    ];
  }, [state.activities, state.activePlayerIndex, state.lastActionDescription, resolvedPlayers]);

  // Display up to last 7 activities in reverse chronological order (newest on top as item 0)
  const reversedActivities = React.useMemo(() => {
    return [...currentActivities].reverse();
  }, [currentActivities]);

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-4 py-2 space-y-2.5 sm:space-y-3 flex-1 flex flex-col justify-between select-none">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP FLOATING LIQUID GLASS NAVIGATION BAR                     */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full flex-shrink-0 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm text-xs gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            Frame {currentFrameNum}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">•</span>
          <span className="text-zinc-700 dark:text-zinc-300 truncate font-medium">
            {match.best_of === 1 ? 'Single Frame' : `Best of ${match.best_of}`}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">•</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1 whitespace-nowrap">
            <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            {playerCount}P
          </span>
        </div>

        {/* Frames Tally (when best_of > 1 and 2 players) & Discreet 3-Dots Options Menu */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {match.best_of > 1 && playerCount === 2 && (
            <div className="flex items-center space-x-1 font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{playerFrames[0] || 0}</span>
              <span className="text-zinc-400 dark:text-zinc-500">-</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{playerFrames[1] || 0}</span>
            </div>
          )}

          {/* 3-Dots Match Options Button */}
          <button
            type="button"
            onClick={() => setIsOptionsMenuOpen(true)}
            className="p-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition flex items-center justify-center cursor-pointer active:scale-95 min-w-[32px] min-h-[32px]"
            title="Match Options"
            aria-label="Match Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* APPLE SEGMENTED CONTROL FOR MULTIPLAYER SWITCHING             */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full bg-black/[0.05] dark:bg-black/40 backdrop-blur-md p-1 rounded-2xl flex items-center gap-1 border border-black/[0.04] dark:border-white/[0.06] shadow-inner">
        {resolvedPlayers.map((player, idx) => {
          const isActive = state.activePlayerIndex === idx;
          const framesWon = playerFrames[idx] || 0;
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onSwitchActivePlayer(idx)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px] select-none ${
                isActive
                  ? 'bg-white dark:bg-[#3a3a3c] text-zinc-950 dark:text-white shadow-sm font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              )}
              <span className="truncate">{player.name}</span>
              {match.best_of > 1 && framesWon > 0 && (
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                  {framesWon}F
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FLOATING LIQUID GLASS HUD: PLAYER SCORES & METRICS            */}
      {/* Large Title (34pt+) Tabular Numerals, Specular Highlight       */}
      {/* ------------------------------------------------------------- */}
      {playerCount === 2 ? (
        /* 1v1 Layout: Side-by-side Large Title Cards with Specular Sheen */
        <div className="grid grid-cols-2 gap-2.5">
          {resolvedPlayers.map((player, idx) => {
            const isActive = state.activePlayerIndex === idx;
            const score = state.playerScores[idx] ?? 0;
            const highBreak = state.playerHighestBreaks[idx] ?? 0;
            const framesWon = playerFrames[idx] ?? 0;

            return (
              <div
                key={player.id}
                onClick={() => onSwitchActivePlayer(idx)}
                className={`relative p-3.5 rounded-3xl backdrop-blur-xl border transition-all cursor-pointer select-none overflow-hidden flex flex-col justify-between min-h-[108px] sm:min-h-[116px] ${
                  isActive
                    ? 'bg-white/85 dark:bg-[#1c1c1e]/85 border-emerald-500/50 dark:border-emerald-400/50 shadow-xl ring-1 ring-emerald-500/30'
                    : 'bg-white/50 dark:bg-[#1c1c1e]/40 border-black/[0.05] dark:border-white/[0.06] opacity-75 hover:opacity-100'
                }`}
              >
                {/* Subtle Specular Sheen Highlight on Active Liquid Glass */}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/30 dark:from-white/12 to-transparent pointer-events-none rounded-t-3xl" />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-zinc-400">#{idx + 1}</span>
                    )}
                    <h2 className="text-sm sm:text-base font-bold truncate text-zinc-900 dark:text-white">
                      {player.name}
                    </h2>
                  </div>

                  {match.best_of > 1 && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex-shrink-0">
                      {framesWon}F
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between mt-1">
                  <div className="flex flex-col">
                    {isActive ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-current" /> At Table
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">Tap to switch</span>
                    )}

                    {highBreak > 0 && (
                      <span className="text-[10px] font-mono text-amber-500 flex items-center gap-0.5 mt-0.5">
                        <Flame className="w-3 h-3 fill-current" /> {highBreak}
                      </span>
                    )}
                  </div>

                  {/* Large Title (34pt+ / 36px+) Tabular Numerals */}
                  <div className="relative text-right flex-shrink-0">
                    {scoreAnims[idx] && (
                      <div
                        key={`rise-${scoreAnims[idx].id}`}
                        className={`absolute -top-3.5 right-0 font-mono font-black text-lg pointer-events-none z-20 animate-score-rise select-none whitespace-nowrap ${getScoreIncreaseColor(scoreAnims[idx].points)}`}
                      >
                        +{scoreAnims[idx].points}
                      </div>
                    )}
                    <span
                      key={`score-val-${idx}-${score}`}
                      className={`inline-block font-mono font-black text-4xl sm:text-5xl tabular-nums tracking-tight origin-right ${
                        scoreAnims[idx] ? 'animate-score-pulse' : ''
                      } ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}
                    >
                      {score}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Multiplayer Layout (3-6 Players): Compact Liquid Glass Cards with Large Numerals */
        <div className={`grid gap-2 ${
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
                className={`relative p-2 sm:p-2.5 rounded-2xl backdrop-blur-xl border transition-all cursor-pointer select-none overflow-hidden flex flex-col justify-between min-h-[76px] sm:min-h-[84px] ${spanClass} ${
                  isActive
                    ? 'bg-white/85 dark:bg-[#1c1c1e]/85 border-emerald-500/50 dark:border-emerald-400/50 shadow-lg ring-1 ring-emerald-500/30'
                    : 'bg-white/50 dark:bg-[#1c1c1e]/40 border-black/[0.05] dark:border-white/[0.06] opacity-75 hover:opacity-100'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/30 dark:from-white/12 to-transparent pointer-events-none rounded-t-2xl" />
                )}

                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-1 min-w-0 pr-1">
                    {isActive ? (
                      <Zap className="w-3 h-3 text-emerald-500 fill-current flex-shrink-0 animate-pulse" />
                    ) : (
                      <span className="text-[9px] font-mono text-zinc-400">#{idx + 1}</span>
                    )}
                    <span className="text-xs font-bold truncate text-zinc-900 dark:text-white">
                      {player.name}
                    </span>
                  </div>

                  {match.best_of > 1 && framesWon > 0 && (
                    <span className="text-[8px] font-mono font-bold px-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {framesWon}F
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between mt-1">
                  {highBreak > 0 ? (
                    <span className="text-[9px] font-mono text-amber-500 flex items-center gap-0.5">
                      🔥{highBreak}
                    </span>
                  ) : <span />}

                  <div className="relative text-right flex-shrink-0">
                    {scoreAnims[idx] && (
                      <div
                        key={`rise-${scoreAnims[idx].id}`}
                        className={`absolute -top-3 right-0 font-mono font-black text-xs sm:text-sm pointer-events-none z-20 animate-score-rise select-none whitespace-nowrap ${getScoreIncreaseColor(scoreAnims[idx].points)}`}
                      >
                        +{scoreAnims[idx].points}
                      </div>
                    )}
                    <span
                      key={`score-val-${idx}-${score}`}
                      className={`inline-block font-mono font-black text-2xl sm:text-3xl tabular-nums tracking-tight origin-right ${
                        scoreAnims[idx] ? 'animate-score-pulse' : ''
                      } ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}
                    >
                      {score}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TABLE HUD STATUS STRIP: METRICS, BREAK & SNOOKERS PILL        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm text-xs">
        {/* Active Player Indicator */}
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
            {activePlayer.name}
          </span>
        </div>

        {/* Table Metrics: Remaining Points & Reds Pill */}
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <div className="bg-black/[0.04] dark:bg-white/[0.05] px-2 py-0.5 rounded-lg flex items-center space-x-1">
            <span className="text-zinc-400 text-[10px]">Points:</span>
            <span className="font-bold text-zinc-900 dark:text-white tabular-nums">{state.pointsRemaining}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setPendingAdjustReds(state.redsRemaining);
              setIsAdjustRedsOpen(true);
            }}
            title="Adjust remaining reds"
            className="bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] px-2 py-0.5 rounded-lg flex items-center space-x-1 transition cursor-pointer active:scale-95"
          >
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shadow-xs" />
            <span className="font-bold text-zinc-900 dark:text-white tabular-nums">{state.redsRemaining}</span>
          </button>
        </div>

        {/* Break Counter Badge (Flame/Zap) */}
        <div className="flex items-center space-x-1 bg-amber-500/15 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 px-2.5 py-0.5 rounded-full flex-shrink-0 font-mono font-bold text-xs">
          <Flame className="w-3 h-3 text-amber-500 fill-current" />
          <span>Break {state.currentBreak}</span>
        </div>
      </div>

      {/* Snookers Needed Floating Pill */}
      {state.snookersNeeded.needed && (
        <div className="rounded-2xl px-3 py-1.5 bg-rose-500/15 dark:bg-rose-400/15 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span className="font-semibold truncate">
            Snookers Needed: {state.snookersNeeded.trailers.map(t => `${resolvedPlayers[t.playerIndex]?.name || `P${t.playerIndex + 1}`} (${t.count})`).join(', ')}
          </span>
        </div>
      )}

      {/* Free Ball Active Banner */}
      {state.freeBallActive && (
        <div className="rounded-2xl px-3 py-1.5 bg-purple-500/15 dark:bg-purple-400/15 border border-purple-500/25 text-purple-800 dark:text-purple-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="font-bold truncate">FREE BALL: Any nominated color on</span>
          </div>
          <button
            type="button"
            onClick={onToggleFreeBall}
            className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold hover:bg-purple-600 transition cursor-pointer active:scale-95"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTENT LAYER: RICH BAIZE GREEN FELT CANVAS WITH RADIAL DEPTH */}
      {/* 48x48pt Aramith 3D Balls with Authentic Shine, 44pt+ Hits     */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-felt rounded-3xl p-3 sm:p-4 shadow-2xl relative overflow-hidden select-none">
        
        {/* Subtle table boundary hairline */}
        <div className="absolute inset-0 rounded-3xl border border-emerald-400/20 pointer-events-none" />

        {/* 4-col mobile grid, 7-col desktop grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          
          {/* RED BALL (1 pt) - 48x48pt+ */}
          <button
            type="button"
            disabled={!availableBalls.includes('red')}
            onClick={() => onPotBall('red')}
            className={`col-span-2 sm:col-span-1 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-red cursor-pointer transition select-none ${
              availableBalls.includes('red')
                ? 'opacity-100 shadow-lg shadow-red-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.red.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow leading-none">1</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/95 uppercase tracking-wider leading-none mt-0.5">Red</span>
          </button>

          {/* YELLOW (2 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('yellow')}
            onClick={() => onPotBall('yellow')}
            className={`col-span-1 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-yellow cursor-pointer transition select-none ${
              availableBalls.includes('yellow')
                ? 'opacity-100 shadow-lg shadow-yellow-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.yellow.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-black drop-shadow leading-none">2</span>
            <span className="text-[10px] sm:text-xs font-bold text-black/85 uppercase leading-none mt-0.5">Yel</span>
          </button>

          {/* GREEN (3 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('green')}
            onClick={() => onPotBall('green')}
            className={`col-span-1 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-green cursor-pointer transition select-none ${
              availableBalls.includes('green')
                ? 'opacity-100 shadow-lg shadow-green-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.green.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow leading-none">3</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Grn</span>
          </button>

          {/* BROWN (4 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('brown')}
            onClick={() => onPotBall('brown')}
            className={`col-span-1 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-brown cursor-pointer transition select-none ${
              availableBalls.includes('brown')
                ? 'opacity-100 shadow-lg shadow-amber-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.brown.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow leading-none">4</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Brn</span>
          </button>

          {/* BLUE (5 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('blue')}
            onClick={() => onPotBall('blue')}
            className={`col-span-1 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-blue cursor-pointer transition select-none ${
              availableBalls.includes('blue')
                ? 'opacity-100 shadow-lg shadow-blue-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.blue.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow leading-none">5</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Blu</span>
          </button>

          {/* PINK (6 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('pink')}
            onClick={() => onPotBall('pink')}
            className={`col-span-1 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-pink cursor-pointer transition select-none ${
              availableBalls.includes('pink')
                ? 'opacity-100 shadow-lg shadow-pink-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.pink.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow leading-none">6</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Pnk</span>
          </button>

          {/* BLACK (7 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('black')}
            onClick={() => onPotBall('black')}
            className={`col-span-1 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-black cursor-pointer transition select-none border border-white/20 ${
              availableBalls.includes('black')
                ? 'opacity-100 shadow-lg shadow-black/80 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
                : 'opacity-20 grayscale cursor-not-allowed pointer-events-none'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.black.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow leading-none">7</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/95 uppercase leading-none mt-0.5">Blk</span>
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STREAMLINED PRIMARY CONTROLS: FLOATING GLASS ACTION BAR       */}
      {/* Capsule Island with Undo, Redo, Foul, Concede, End, Switch    */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full rounded-full bg-white/80 dark:bg-[#1c1c1e]/85 backdrop-blur-xl border border-black/[0.08] dark:border-white/15 p-1.5 shadow-xl flex items-center justify-between gap-1 select-none">
        
        {/* Switch Player / Miss */}
        <button
          type="button"
          onClick={onMiss}
          className="h-10 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-zinc-900 dark:text-white font-semibold text-xs sm:text-sm transition flex items-center gap-1 cursor-pointer active:scale-95"
          title="Turn to next player"
        >
          <ChevronRight className="w-4 h-4 text-emerald-500" />
          <span>Switch</span>
        </button>

        {/* Quick Foul (+4) Alert Style Button */}
        <button
          type="button"
          onClick={onQuickFoul4}
          className="h-10 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold text-xs sm:text-sm transition flex items-center gap-1 cursor-pointer active:scale-95"
          title="Instant standard 4-point penalty"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Foul (+4)</span>
        </button>

        {/* More Foul Options */}
        <button
          type="button"
          onClick={() => setIsFoulModalOpen(true)}
          className="w-10 h-10 rounded-full bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center cursor-pointer transition active:scale-95"
          title="Custom foul options"
          aria-label="More Foul Options"
        >
          <span>···</span>
        </button>

        {/* Undo Button */}
        <button
          type="button"
          disabled={undoStack.length === 0}
          onClick={onUndo}
          className={`h-10 px-2.5 rounded-full font-semibold text-xs transition flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
            undoStack.length > 0
              ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10'
              : 'text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed'
          }`}
          title="Undo last shot"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Undo</span>
          {undoStack.length > 0 && <span className="text-[10px] font-mono">({undoStack.length})</span>}
        </button>

        {/* Redo Button */}
        <button
          type="button"
          disabled={redoStack.length === 0}
          onClick={onRedo}
          className={`h-10 px-2.5 rounded-full font-semibold text-xs transition flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
            redoStack.length > 0
              ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
              : 'text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed'
          }`}
          title="Redo shot"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Redo</span>
        </button>

        {/* Concede Button */}
        <button
          type="button"
          onClick={onConcede}
          className="h-10 px-2.5 rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition flex items-center gap-1 text-xs font-semibold cursor-pointer active:scale-95"
          title="Concede frame"
        >
          <Flag className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Concede</span>
        </button>

        {/* End Match Button */}
        <button
          type="button"
          onClick={() => setIsEndMatchModalOpen(true)}
          className="h-10 px-2.5 rounded-full text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-1 text-xs font-semibold cursor-pointer active:scale-95"
          title="End match early"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">End</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTION FEEDBACK BANNER & TOAST (AT BOTTOM) - LAST 7 ACTIVITIES */}
      {/* Apple Inset Grouped Card with Pop Feedback on Latest Shot     */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full rounded-2xl bg-white/75 dark:bg-[#1c1c1e]/75 backdrop-blur-xl p-3 shadow-lg space-y-2 border border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Recent Activity (Last 7)
          </span>
          <span className="text-zinc-400 dark:text-zinc-500 font-mono">
            {reversedActivities.length} of 7 logged
          </span>
        </div>

        <div className="space-y-1.5 pr-0.5">
          {reversedActivities.map((act, index) => {
            const isMostRecent = index === 0;

            if (isMostRecent) {
              return (
                <div
                  key={act.id}
                  className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 shadow-md animate-pop-feedback transition-all min-h-[44px] ${act.bgClass} ${act.borderClass}`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {act.ballHex && (
                      <span
                        className="w-4 h-4 rounded-full border border-white/80 shadow flex-shrink-0 inline-block"
                        style={{ backgroundColor: act.ballHex }}
                      />
                    )}
                    {act.icon === 'miss' && <ChevronRight className="w-4 h-4 text-amber-300 flex-shrink-0" />}
                    {act.icon === 'foul' && <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />}
                    {act.icon === 'switch' && <Users className="w-4 h-4 text-emerald-300 flex-shrink-0" />}

                    <span className={`text-xs sm:text-sm font-black uppercase tracking-wider ${act.textClass}`}>
                      {act.badge}
                    </span>

                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-black/60 text-white border border-white/20 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LATEST
                    </span>
                  </div>

                  <span className={`text-[11px] sm:text-xs font-bold truncate opacity-95 text-right ${act.textClass}`}>
                    {act.detail}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={act.id}
                className="w-full px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors min-h-[38px]"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {act.ballHex ? (
                    <span
                      className="w-3 h-3 rounded-full border border-zinc-300 dark:border-white/40 shadow-xs flex-shrink-0 inline-block opacity-90"
                      style={{ backgroundColor: act.ballHex }}
                    />
                  ) : act.icon === 'miss' ? (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400/80 flex-shrink-0" />
                  ) : act.icon === 'foul' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400/80 flex-shrink-0" />
                  ) : act.icon === 'switch' ? (
                    <Users className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400/80 flex-shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 flex-shrink-0" />
                  )}

                  <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide flex-shrink-0">
                    {act.badge}
                  </span>
                </div>

                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono text-right">
                  {act.detail}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* APPLE BOTTOM SHEETS & MODALS                                  */}
      {/* ------------------------------------------------------------- */}
      <FoulModal
        isOpen={isFoulModalOpen}
        onClose={() => setIsFoulModalOpen(false)}
        fouledPlayerIndex={state.activePlayerIndex}
        players={resolvedPlayers}
        redsRemaining={state.redsRemaining}
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

      {/* ADJUST REDS APPLE BOTTOM SHEET */}
      {isAdjustRedsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAdjustRedsOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#f2f2f7] dark:bg-[#1c1c1e] text-zinc-900 dark:text-[#f5f5f7] rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber Pill */}
            <div className="w-9 h-[5px] rounded-full bg-black/20 dark:bg-white/20 mx-auto flex-shrink-0" />

            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
              <button
                type="button"
                onClick={() => setIsAdjustRedsOpen(false)}
                className="text-[17px] text-[#007aff] dark:text-[#0a84ff] font-normal hover:opacity-70 transition cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">Adjust Reds</h3>
              <button
                type="button"
                onClick={() => onAdjustReds(pendingAdjustReds)}
                className="text-[17px] text-[#007aff] dark:text-[#0a84ff] font-semibold hover:opacity-70 transition cursor-pointer"
              >
                Done
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
              Use if the physical table count differs from the app (e.g. red pocketed on foul or unspotted).
            </p>

            <div className="flex items-center justify-center space-x-6 py-2">
              <button
                type="button"
                disabled={pendingAdjustReds <= 0}
                onClick={() => setPendingAdjustReds(prev => Math.max(0, prev - 1))}
                className="w-12 h-12 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-2xl font-bold flex items-center justify-center hover:bg-black/[0.1] dark:hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer active:scale-95"
              >
                −
              </button>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-black font-mono text-zinc-900 dark:text-white leading-none tabular-nums">
                  {pendingAdjustReds}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1 font-semibold">
                  Reds Left
                </span>
              </div>
              <button
                type="button"
                disabled={pendingAdjustReds >= 15}
                onClick={() => setPendingAdjustReds(prev => Math.min(15, prev + 1))}
                className="w-12 h-12 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-2xl font-bold flex items-center justify-center hover:bg-black/[0.1] dark:hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer active:scale-95"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => onAdjustReds(pendingAdjustReds)}
              className="w-full py-3.5 px-6 rounded-full bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
            >
              Set Reds ({pendingAdjustReds})
            </button>
          </div>
        </div>
      )}

      {/* MATCH OPTIONS APPLE ACTION SHEET */}
      {isOptionsMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOptionsMenuOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#f2f2f7] dark:bg-[#1c1c1e] text-zinc-900 dark:text-[#f5f5f7] rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-black/[0.08] dark:border-white/[0.1] p-4 sm:p-6 shadow-2xl space-y-3 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber */}
            <div className="w-9 h-[5px] rounded-full bg-black/20 dark:bg-white/20 mx-auto flex-shrink-0" />

            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
              <button
                type="button"
                onClick={() => setIsOptionsMenuOpen(false)}
                className="text-[17px] text-[#007aff] dark:text-[#0a84ff] font-normal hover:opacity-70 transition cursor-pointer"
              >
                Done
              </button>
              <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">Match Options</h3>
              <div className="w-12" />
            </div>

            {/* Apple Inset Grouped Options */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
              {/* Free Ball Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false);
                  onToggleFreeBall();
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white block">
                      {state.freeBallActive ? 'Cancel Free Ball' : 'Nominate Free Ball'}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Awarded after opponent foul</span>
                  </div>
                </div>
                {state.freeBallActive && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
                    Active
                  </span>
                )}
              </button>

              {/* Adjust Reds Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false);
                  setPendingAdjustReds(state.redsRemaining);
                  setIsAdjustRedsOpen(true);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-600">
                    <span className="w-3 h-3 rounded-full bg-rose-600 shadow-xs" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white block">
                      Adjust Reds on Table
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Correct remaining red balls</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full">
                  {state.redsRemaining} Left
                </span>
              </button>

              {/* Concede Frame Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false);
                  onConcede();
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white block">
                      Concede Frame
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Concede frame to opponent</span>
                  </div>
                </div>
              </button>

              {/* End Match Early Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false);
                  setIsEndMatchModalOpen(true);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition cursor-pointer text-[#ff3b30] dark:text-[#ff453a]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ff3b30]/15 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">
                      End Match Early…
                    </span>
                    <span className="text-[11px] opacity-80">Crown leader or abandon</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Cancel Action */}
            <button
              type="button"
              onClick={() => setIsOptionsMenuOpen(false)}
              className="w-full py-3 px-5 rounded-full bg-white dark:bg-[#2c2c2e] text-zinc-800 dark:text-white font-semibold text-sm transition active:scale-[0.98] cursor-pointer shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};