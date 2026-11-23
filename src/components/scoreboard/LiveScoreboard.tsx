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
  MoreVertical
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

    // If frame just concluded, open celebration modal (frame commit happens on Next Frame / Finish Match)
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

  // Instant 1-tap standard 4-point foul (most common in casual snooker)
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

  // Undo Handler - Always closes win modal and reverts state safely
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

      // Persist frame to Supabase / LocalStorage
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

    // In snooker rotation, break-off rotates to next player in sequence for subsequent frames
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
    <div className="w-full max-w-md mx-auto px-2.5 sm:px-4 py-1 space-y-2">
      
      {/* ------------------------------------------------------------- */}
      {/* MATCH HEADER & DISCREET TOP-RIGHT OPTIONS MENU (3-DOTS)       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-3 py-1.5 glass-panel rounded-2xl text-xs gap-2 shadow-sm">
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          <span className="font-extrabold text-emerald-400 whitespace-nowrap">Frame {currentFrameNum}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300 truncate font-medium">
            {match.best_of === 1 ? 'Single Frame' : `Best of ${match.best_of}`}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1 whitespace-nowrap">
            <Users className="w-3 h-3 text-emerald-400" />
            {playerCount}P
          </span>
        </div>

        {/* Frames Tally (when best_of > 1 and 2 players) & Discreet 3-Dots Options Menu */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {match.best_of > 1 && playerCount === 2 && (
            <div className="flex items-center space-x-1 font-mono text-xs font-bold text-zinc-300">
              <span className="text-emerald-400 font-bold">{playerFrames[0] || 0}</span>
              <span className="text-zinc-500">-</span>
              <span className="text-emerald-400 font-bold">{playerFrames[1] || 0}</span>
            </div>
          )}

          {/* 3-Dots Kebab Options Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
              className="p-1 sm:p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              title="Match Options (End Match, Concede, Free Ball)"
              aria-label="Match Options"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {isOptionsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 py-1 glass-panel rounded-2xl shadow-2xl z-50 animate-fade-in text-xs space-y-0.5 border border-white/10">
                {match.best_of > 1 && playerCount > 2 && (
                  <div className="px-3 py-1.5 border-b border-white/[0.08] font-mono text-[11px] text-zinc-300">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Frames Tally</div>
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
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.08] flex items-center gap-2 text-zinc-200 hover:text-white transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>{state.freeBallActive ? 'Cancel Free Ball' : 'Nominate Free Ball'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    setPendingAdjustReds(state.redsRemaining);
                    setIsAdjustRedsOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.08] flex items-center gap-2 text-zinc-200 hover:text-white transition cursor-pointer"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-600 inline-block flex-shrink-0" />
                  <span>Adjust Reds ({state.redsRemaining} left)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    onConcede();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.08] flex items-center gap-2 text-zinc-200 hover:text-white transition cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Concede Frame</span>
                </button>

                <div className="border-t border-white/[0.08] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsMenuOpen(false);
                    setIsEndMatchModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-rose-950/40 flex items-center gap-2 text-rose-400 hover:text-rose-300 transition cursor-pointer font-bold"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span>End Match…</span>
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
                className={`relative px-3 py-2 h-[54px] rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between active:scale-[0.98] ${
                  isActive
                    ? 'bg-gradient-to-br from-emerald-950/80 via-[#0e2c1c]/70 to-[#081b11]/80 border-emerald-400/60 shadow-xl shadow-emerald-950/60 ring-1 ring-emerald-400/30'
                    : 'bg-white/[0.03] border-white/[0.07] opacity-75 hover:opacity-100 hover:border-white/20'
                }`}
              >
                <div className="min-w-0 pr-1.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-zinc-500">#{idx + 1}</span>
                    )}
                    <h2 className={`text-sm sm:text-base font-extrabold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                      {player.name}
                    </h2>
                    {match.best_of > 1 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-500/25 flex-shrink-0">
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
                      <span className="text-[9px] text-zinc-500 hover:text-zinc-300">Tap to switch</span>
                    )}
                    {highBreak > 0 && (
                      <span className="text-[9px] text-amber-400 font-mono flex items-center gap-0.5 ml-1">
                        <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        {highBreak}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative text-right flex-shrink-0 pl-1">
                  {scoreAnims[idx] && (
                    <div
                      key={`rise-${scoreAnims[idx].id}`}
                      className={`absolute -top-3 right-0 font-mono font-black text-base sm:text-lg pointer-events-none z-20 animate-score-rise select-none whitespace-nowrap ${getScoreIncreaseColor(scoreAnims[idx].points)}`}
                    >
                      +{scoreAnims[idx].points}
                    </div>
                  )}
                  <span
                    key={`score-val-${idx}-${score}`}
                    className={`inline-block font-mono font-black text-2xl sm:text-3xl tracking-tight origin-right ${
                      scoreAnims[idx] ? 'animate-score-pulse' : ''
                    } ${isActive ? 'text-emerald-300' : 'text-white'}`}
                  >
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Multiplayer (3-6 Players): Clean, dense horizontal pill/chip cards (~38-42px height) */
        <div className={`grid gap-1.5 ${
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
                className={`relative px-2.5 h-[38px] sm:h-10 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between active:scale-[0.98] ${spanClass} ${
                  isActive
                    ? 'bg-emerald-950/80 border-emerald-400/60 shadow-md ring-1 ring-emerald-400/40'
                    : 'bg-white/[0.03] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0 pr-1">
                  {isActive ? (
                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 flex-shrink-0 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-zinc-500 flex-shrink-0">
                      #{idx + 1}
                    </span>
                  )}
                  <span className={`text-[11px] sm:text-xs font-bold truncate ${isActive ? 'text-white font-black' : 'text-zinc-300'}`}>
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
                  <div className="relative inline-flex items-center justify-end">
                    {scoreAnims[idx] && (
                      <div
                        key={`rise-${scoreAnims[idx].id}`}
                        className={`absolute -top-2.5 right-0 font-mono font-black text-xs sm:text-sm pointer-events-none z-20 animate-score-rise select-none whitespace-nowrap ${getScoreIncreaseColor(scoreAnims[idx].points)}`}
                      >
                        +{scoreAnims[idx].points}
                      </div>
                    )}
                    <span
                      key={`score-val-${idx}-${score}`}
                      className={`inline-block font-mono font-black tracking-tight origin-right ${
                        scoreAnims[idx] ? 'animate-score-pulse' : ''
                      } ${isActive ? 'text-emerald-300 text-base sm:text-lg' : 'text-white text-sm sm:text-base'}`}
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
      {/* UNIFIED SCORER CONSOLE & TABLE HUD STRIP (TARGET REMOVED)     */}
      {/* ------------------------------------------------------------- */}
      <div className="glass-panel rounded-2xl px-3 py-1.5 shadow-sm">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Active Scorer */}
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm flex-shrink-0">
              <Zap className="w-2.5 h-2.5 fill-black text-black" />
              AT TABLE
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white truncate">
              {activePlayer.name}
            </span>
          </div>

          {/* Table Metrics: Remaining Points & Reds */}
          <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs font-mono">
            <div className="bg-black/40 px-2 py-0.5 rounded-lg flex items-center space-x-1 border border-white/[0.08]">
              <span className="text-zinc-400 text-[9px] sm:text-[10px]">Left:</span>
              <span className="font-bold text-white tabular-nums">{state.pointsRemaining}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingAdjustReds(state.redsRemaining);
                setIsAdjustRedsOpen(true);
              }}
              title="Click to adjust remaining reds"
              className="bg-black/40 hover:bg-rose-950/40 px-2 py-0.5 rounded-lg flex items-center space-x-1 border border-white/[0.08] hover:border-rose-500/40 transition cursor-pointer active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shadow-sm" />
              <span className="font-bold text-white tabular-nums">{state.redsRemaining}</span>
            </button>
          </div>

          {/* Current Break */}
          <div className="flex items-center space-x-1 bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-500/30 flex-shrink-0">
            <span className="text-[9px] uppercase font-bold text-zinc-400">Break</span>
            <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono tabular-nums leading-none">{state.currentBreak}</span>
          </div>
        </div>
      </div>

      {/* Snookers Alert Banner (Appears only when snookers needed) */}
      {state.snookersNeeded.needed && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-2.5 py-1 flex items-center space-x-1.5 text-amber-300 text-[10px] sm:text-[11px]">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="font-semibold truncate">
            Snookers: {state.snookersNeeded.trailers.map(t => `${resolvedPlayers[t.playerIndex]?.name || `P${t.playerIndex + 1}`} (${t.count})`).join(', ')}
          </span>
        </div>
      )}

      {/* Free Ball Active Banner (With 1-tap dismiss) */}
      {state.freeBallActive && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl px-2.5 py-1 flex items-center justify-between text-amber-300 text-[10px] sm:text-[11px]">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-bold truncate">FREE BALL: Nominated color is on</span>
          </div>
          <button
            type="button"
            onClick={onToggleFreeBall}
            className="text-[9px] bg-amber-500 text-black px-2 py-0.5 rounded-md font-bold hover:bg-amber-400 transition cursor-pointer flex-shrink-0 ml-1 active:scale-95"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOUCH-FRIENDLY SNOOKER BALLS GRID                             */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-felt rounded-2xl p-2 sm:p-2.5 shadow-inner">
        {/* 4-col layout on mobile (2 rows), 7-col on sm+ screens */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
          
          {/* RED BALL (1 pt) - Large 2-column primary button on mobile */}
          <button
            type="button"
            disabled={!availableBalls.includes('red')}
            onClick={() => onPotBall('red')}
            className={`col-span-2 sm:col-span-1 h-12 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-red cursor-pointer transition select-none ${
              availableBalls.includes('red')
                ? 'opacity-100 shadow-lg shadow-red-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
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
            className={`col-span-1 h-12 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-yellow cursor-pointer transition select-none ${
              availableBalls.includes('yellow')
                ? 'opacity-100 shadow-lg shadow-yellow-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
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
            className={`col-span-1 h-12 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-green cursor-pointer transition select-none ${
              availableBalls.includes('green')
                ? 'opacity-100 shadow-lg shadow-green-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
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
            className={`col-span-1 h-12 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-brown cursor-pointer transition select-none ${
              availableBalls.includes('brown')
                ? 'opacity-100 shadow-lg shadow-amber-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
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
            className={`col-span-1 h-12 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-blue cursor-pointer transition select-none ${
              availableBalls.includes('blue')
                ? 'opacity-100 shadow-lg shadow-blue-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
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
            className={`col-span-1 h-12 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-pink cursor-pointer transition select-none ${
              availableBalls.includes('pink')
                ? 'opacity-100 shadow-lg shadow-pink-950/60 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
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
            className={`col-span-1 h-12 sm:h-16 rounded-2xl flex flex-col items-center justify-center snooker-ball ball-surface-black cursor-pointer transition select-none border border-white/20 ${
              availableBalls.includes('black')
                ? 'opacity-100 shadow-lg shadow-black/80 ring-1 ring-white/30 hover:scale-102 active:scale-90 active:brightness-135'
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
          className="col-span-6 sm:col-span-4 h-9 sm:h-10 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] active:scale-95 active:brightness-135 active:bg-amber-950/60 active:border-amber-400/60 text-white font-semibold text-xs sm:text-sm border border-white/[0.08] transition flex items-center justify-center space-x-1.5 shadow-md cursor-pointer select-none"
        >
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          <span>Miss / Switch</span>
        </button>

        {/* QUICK FOUL (+4) */}
        <button
          type="button"
          onClick={onQuickFoul4}
          className="col-span-4 sm:col-span-3 h-9 sm:h-10 px-2 rounded-xl bg-gradient-to-r from-rose-950/60 to-red-950/60 hover:from-rose-900/60 hover:to-red-900/60 border border-rose-500/40 active:scale-95 active:brightness-140 text-rose-100 font-semibold text-xs sm:text-sm transition flex items-center justify-center space-x-1 shadow-md cursor-pointer select-none"
          title="Instant 4-point penalty to opponent"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Foul (+4)</span>
        </button>

        {/* FOUL OPTIONS MODAL */}
        <button
          type="button"
          onClick={() => setIsFoulModalOpen(true)}
          className="col-span-2 sm:col-span-1 h-9 sm:h-10 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] active:scale-95 text-zinc-300 hover:text-white font-bold text-xs transition flex items-center justify-center cursor-pointer select-none"
          title="Custom foul points (5, 6, 7 pts)"
          aria-label="More Foul Options"
        >
          <span>···</span>
        </button>

        {/* UNDO BUTTON */}
        <button
          type="button"
          disabled={undoStack.length === 0}
          onClick={onUndo}
          className={`col-span-8 sm:col-span-3 h-9 sm:h-10 px-2 sm:px-3 rounded-xl border font-semibold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 cursor-pointer select-none ${
            undoStack.length > 0
              ? 'bg-sky-950/50 text-sky-200 border-sky-500/40 hover:bg-sky-900/50 active:scale-95 active:brightness-135 shadow-md shadow-sky-950/40'
              : 'bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed'
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
          className={`col-span-4 sm:col-span-1 h-9 sm:h-10 px-2 rounded-xl border font-semibold text-xs sm:text-sm transition flex items-center justify-center space-x-1 cursor-pointer select-none ${
            redoStack.length > 0
              ? 'bg-purple-950/50 text-purple-200 border-purple-500/40 hover:bg-purple-900/50 active:scale-95 active:brightness-135 shadow-md'
              : 'bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed'
          }`}
          title="Redo action (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTION FEEDBACK BANNER & TOAST (AT BOTTOM) - LAST 7 ACTIVITIES */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full rounded-2xl glass-panel p-2 sm:p-2.5 shadow-lg space-y-1.5">
        <div className="flex items-center justify-between px-1 text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Recent Activity (Last 7)
          </span>
          <span className="text-zinc-500 font-mono">
            {reversedActivities.length} of 7 logged
          </span>
        </div>

        <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-1 pr-0.5">
          {reversedActivities.map((act, index) => {
            const isMostRecent = index === 0;

            if (isMostRecent) {
              return (
                <div
                  key={act.id}
                  className={`w-full px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 shadow-lg animate-pop-feedback transition-all ${act.bgClass} ${act.borderClass}`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {act.ballHex && (
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/80 shadow flex-shrink-0 inline-block"
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
                className="w-full px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-2 text-zinc-300 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {act.ballHex ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-xs flex-shrink-0 inline-block opacity-85"
                      style={{ backgroundColor: act.ballHex }}
                    />
                  ) : act.icon === 'miss' ? (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                  ) : act.icon === 'foul' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400/80 flex-shrink-0" />
                  ) : act.icon === 'switch' ? (
                    <Users className="w-3.5 h-3.5 text-emerald-400/80 flex-shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 flex-shrink-0" />
                  )}

                  <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wide flex-shrink-0">
                    {act.badge}
                  </span>
                </div>

                <span className="text-[10px] text-zinc-400 truncate font-mono text-right">
                  {act.detail}
                </span>
              </div>
            );
          })}
        </div>
      </div>


      {/* ------------------------------------------------------------- */}
      {/* MODALS                                                        */}
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

      {/* ADJUST REDS MODAL */}
      {isAdjustRedsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 border-white/10">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-rose-600 inline-block shadow-md" />
                <h3 className="text-base sm:text-lg font-bold text-white">Adjust Remaining Reds</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsAdjustRedsOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Use this if the physical table differs from the app (e.g. red potted on a foul, 2 reds potted in one stroke, or an input mistake).
            </p>

            <div className="flex items-center justify-center space-x-4 py-2">
              <button
                type="button"
                disabled={pendingAdjustReds <= 0}
                onClick={() => setPendingAdjustReds(prev => Math.max(0, prev - 1))}
                className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white text-xl font-bold hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center cursor-pointer select-none active:scale-95"
              >
                −
              </button>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black font-mono text-white leading-none tabular-nums">{pendingAdjustReds}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1 font-semibold">Reds Left</span>
              </div>
              <button
                type="button"
                disabled={pendingAdjustReds >= 15}
                onClick={() => setPendingAdjustReds(prev => Math.min(15, prev + 1))}
                className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white text-xl font-bold hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center cursor-pointer select-none active:scale-95"
              >
                +
              </button>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdjustRedsOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-white/[0.1] text-zinc-300 hover:bg-white/[0.06] text-xs sm:text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onAdjustReds(pendingAdjustReds)}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/60 transition active:scale-95"
              >
                Set Reds ({pendingAdjustReds})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
