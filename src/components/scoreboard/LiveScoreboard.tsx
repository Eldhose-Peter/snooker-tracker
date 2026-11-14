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
  handleConcede 
} from '@/lib/snooker-engine';
import { FoulModal } from './FoulModal';
import { WinModal } from './WinModal';
import { recordFrameCompleted, finishMatch } from '@/lib/storage';
import { 
  RotateCcw, 
  AlertTriangle, 
  Flag, 
  Sparkles, 
  CornerDownRight, 
  Zap, 
  Flame, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface LiveScoreboardProps {
  match: Match;
  player1: Player;
  player2: Player;
  onMatchComplete: () => void;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  match,
  player1,
  player2,
  onMatchComplete,
}) => {
  const [currentFrameNum, setCurrentFrameNum] = useState<number>(
    (match.player1_frames + match.player2_frames) + 1
  );
  const [p1MatchFrames, setP1MatchFrames] = useState<number>(match.player1_frames);
  const [p2MatchFrames, setP2MatchFrames] = useState<number>(match.player2_frames);

  // Snooker Frame State and History Stack for Undo
  const [state, setState] = useState<FrameState>(() => createInitialFrameState(match.reds_count || 15));
  const [historyStack, setHistoryStack] = useState<FrameState[]>([]);

  // Modals
  const [isFoulModalOpen, setIsFoulModalOpen] = useState(false);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);

  // Sync state if match changes
  useEffect(() => {
    setP1MatchFrames(match.player1_frames);
    setP2MatchFrames(match.player2_frames);
    setCurrentFrameNum((match.player1_frames + match.player2_frames) + 1);
    setState(createInitialFrameState(match.reds_count || 15));
    setHistoryStack([]);
  }, [match.id, match.player1_frames, match.player2_frames, match.reds_count]);

  // When frame finishes
  useEffect(() => {
    if (state.isFrameOver && state.winner && !isWinModalOpen) {
      // Determine winner id
      const winnerId = state.winner === 1 ? player1.id : player2.id;
      const highestBreak = Math.max(state.highestBreakP1, state.highestBreakP2);
      const highBreakPlayerId = state.highestBreakP1 > state.highestBreakP2
        ? player1.id
        : state.highestBreakP2 > state.highestBreakP1
        ? player2.id
        : null;

      // Update in-memory match frame tally
      const nextP1Frames = state.winner === 1 ? p1MatchFrames + 1 : p1MatchFrames;
      const nextP2Frames = state.winner === 2 ? p2MatchFrames + 1 : p2MatchFrames;
      setP1MatchFrames(nextP1Frames);
      setP2MatchFrames(nextP2Frames);

      // Persist frame to Supabase / LocalStorage
      recordFrameCompleted(
        match.id,
        currentFrameNum,
        state.player1Score,
        state.player2Score,
        winnerId,
        highestBreak,
        highBreakPlayerId
      );

      // Check if match is concluded
      const targetFrames = Math.ceil(match.best_of / 2);
      if (nextP1Frames >= targetFrames || nextP2Frames >= targetFrames) {
        const matchWinnerId = nextP1Frames >= targetFrames ? player1.id : player2.id;
        finishMatch(match.id, matchWinnerId, nextP1Frames, nextP2Frames);
      }

      setIsWinModalOpen(true);
    }
  }, [state.isFrameOver, state.winner]);

  // Push state to history stack before mutating
  const pushState = useCallback((nextState: FrameState) => {
    setHistoryStack((prev) => [...prev, state]);
    setState(nextState);
  }, [state]);

  // Actions
  const onPotBall = (ball: BallType) => {
    const nextState = handlePot(state, ball);
    pushState(nextState);
  };

  const onMiss = () => {
    const nextState = handleMiss(state);
    pushState(nextState);
  };

  const onConfirmFoul = (points: number, awardFreeBall: boolean, passBack: boolean) => {
    const nextState = handleFoul(state, points, awardFreeBall, passBack);
    pushState(nextState);
  };

  const onConcede = () => {
    const activeName = state.activePlayer === 1 ? player1.name : player2.name;
    if (window.confirm(`Are you sure ${activeName} wants to concede this frame?`)) {
      const nextState = handleConcede(state, state.activePlayer);
      pushState(nextState);
    }
  };

  const onUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setState(previous);
  };

  const onToggleFreeBall = () => {
    setState((prev) => ({
      ...prev,
      freeBallActive: !prev.freeBallActive,
      lastActionDescription: !prev.freeBallActive ? 'Free ball nominated' : 'Free ball cancelled',
    }));
  };

  // Next Frame handler
  const handleNextFrame = () => {
    setIsWinModalOpen(false);
    setCurrentFrameNum((prev) => prev + 1);
    setState(createInitialFrameState(match.reds_count || 15));
    setHistoryStack([]);
  };

  // Match Finish handler
  const handleFinishMatch = () => {
    setIsWinModalOpen(false);
    onMatchComplete();
  };

  const availableBalls = getAvailableBalls(state);
  const framesToWin = Math.ceil(match.best_of / 2);
  const isMatchWon = p1MatchFrames >= framesToWin || p2MatchFrames >= framesToWin;
  const matchWinner = p1MatchFrames >= framesToWin ? player1 : p2MatchFrames >= framesToWin ? player2 : null;
  const highestBreak = Math.max(state.highestBreakP1, state.highestBreakP2);
  const highBreakPlayer = state.highestBreakP1 >= state.highestBreakP2 ? player1 : player2;

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
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1611] border border-emerald-900/40 rounded-xl text-xs sm:text-sm">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-emerald-400">Frame {currentFrameNum}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Best of {match.best_of} ({framesToWin} to win)</span>
        </div>
        <div className="flex items-center space-x-2 font-mono font-bold">
          <span className="text-white">{p1MatchFrames}</span>
          <span className="text-emerald-500">-</span>
          <span className="text-white">{p2MatchFrames}</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PLAYER SCORE CARDS (ACTIVE PLAYER GLOW) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        
        {/* PLAYER 1 CARD */}
        <div
          onClick={() => {
            if (state.activePlayer !== 1 && !state.isFrameOver) {
              pushState({ ...state, activePlayer: 1, currentBreak: 0, currentBreakBalls: [] });
            }
          }}
          className={`relative p-3 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            state.activePlayer === 1
              ? 'bg-gradient-to-b from-[#103822] to-[#0a2315] border-emerald-400 shadow-lg shadow-emerald-950 ring-2 ring-emerald-500/30'
              : 'bg-[#0d1712]/80 border-gray-800 opacity-80 hover:opacity-100'
          }`}
        >
          {state.activePlayer === 1 && (
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow">
              <Zap className="w-3 h-3 fill-black" /> At Table
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                {player1.name}
              </h2>
              {player1.nickname && (
                <p className="text-[11px] text-emerald-400/80 truncate">
                  "{player1.nickname}"
                </p>
              )}
            </div>
            <div className="text-xs px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/40 text-emerald-300 font-mono font-bold">
              {p1MatchFrames} {p1MatchFrames === 1 ? 'frame' : 'frames'}
            </div>
          </div>

          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tight">
              {state.player1Score}
            </span>
            {state.highestBreakP1 > 0 && (
              <span className="text-[11px] text-amber-300 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                Hi: {state.highestBreakP1}
              </span>
            )}
          </div>
        </div>

        {/* PLAYER 2 CARD */}
        <div
          onClick={() => {
            if (state.activePlayer !== 2 && !state.isFrameOver) {
              pushState({ ...state, activePlayer: 2, currentBreak: 0, currentBreakBalls: [] });
            }
          }}
          className={`relative p-3 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            state.activePlayer === 2
              ? 'bg-gradient-to-b from-[#103822] to-[#0a2315] border-emerald-400 shadow-lg shadow-emerald-950 ring-2 ring-emerald-500/30'
              : 'bg-[#0d1712]/80 border-gray-800 opacity-80 hover:opacity-100'
          }`}
        >
          {state.activePlayer === 2 && (
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow">
              <Zap className="w-3 h-3 fill-black" /> At Table
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                {player2.name}
              </h2>
              {player2.nickname && (
                <p className="text-[11px] text-emerald-400/80 truncate">
                  "{player2.nickname}"
                </p>
              )}
            </div>
            <div className="text-xs px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/40 text-emerald-300 font-mono font-bold">
              {p2MatchFrames} {p2MatchFrames === 1 ? 'frame' : 'frames'}
            </div>
          </div>

          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tight">
              {state.player2Score}
            </span>
            {state.highestBreakP2 > 0 && (
              <span className="text-[11px] text-amber-300 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                Hi: {state.highestBreakP2}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* CURRENT BREAK ACCUMULATOR & BALL CHIPS */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-card rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/30 flex items-center space-x-2">
            <span className="text-xs text-gray-400 uppercase font-semibold">Break</span>
            <span className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
              {state.currentBreak}
            </span>
          </div>

          {/* Balls potted in current break */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-[220px] sm:max-w-xs scrollbar-none">
            {state.currentBreakBalls.length === 0 ? (
              <span className="text-xs text-gray-500 italic">No balls potted yet in break</span>
            ) : (
              state.currentBreakBalls.map((b, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
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
            <div className="flex items-center space-x-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold truncate">
                {state.snookersNeeded.player === 1 ? player1.name : player2.name} needs {state.snookersNeeded.count} {state.snookersNeeded.count === 1 ? 'snooker' : 'snookers'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-gray-400 font-medium">Point Lead:</span>
              <span className="text-sm font-bold text-gray-300 font-mono">
                {Math.abs(state.player1Score - state.player2Score)} pts
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LARGE TOUCH-FRIENDLY SNOOKER BALLS GRID */}
      {/* ------------------------------------------------------------- */}
      <div className="baize-felt rounded-3xl p-3 sm:p-5 shadow-inner">
        <div className="text-center mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
            Tap Ball to Pot
          </span>
        </div>

        {/* Reds Button (Prominent) & Colors Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          
          {/* RED BALL (1 pt) */}
          <button
            type="button"
            disabled={!availableBalls.includes('red')}
            onClick={() => onPotBall('red')}
            className={`col-span-2 sm:col-span-1 h-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition ${
              availableBalls.includes('red')
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.red.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">1</span>
            <span className="text-[10px] sm:text-xs font-semibold text-white/90 uppercase tracking-tight">Red</span>
          </button>

          {/* YELLOW (2 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('yellow')}
            onClick={() => onPotBall('yellow')}
            className={`col-span-1 h-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition ${
              availableBalls.includes('yellow')
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.yellow.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-black drop-shadow">2</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-black/80 uppercase">Yel</span>
          </button>

          {/* GREEN (3 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('green')}
            onClick={() => onPotBall('green')}
            className={`col-span-1 h-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition ${
              availableBalls.includes('green')
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.green.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">3</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/90 uppercase">Grn</span>
          </button>

          {/* BROWN (4 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('brown')}
            onClick={() => onPotBall('brown')}
            className={`col-span-1 h-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition ${
              availableBalls.includes('brown')
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.brown.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">4</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/90 uppercase">Brn</span>
          </button>

          {/* BLUE (5 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('blue')}
            onClick={() => onPotBall('blue')}
            className={`col-span-1 h-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition ${
              availableBalls.includes('blue')
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.blue.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">5</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/90 uppercase">Blu</span>
          </button>

          {/* PINK (6 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('pink')}
            onClick={() => onPotBall('pink')}
            className={`col-span-1 h-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition ${
              availableBalls.includes('pink')
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.pink.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">6</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/90 uppercase">Pnk</span>
          </button>

          {/* BLACK (7 pts) */}
          <button
            type="button"
            disabled={!availableBalls.includes('black')}
            onClick={() => onPotBall('black')}
            className={`col-span-1 h-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center snooker-ball cursor-pointer transition border border-gray-700 ${
              availableBalls.includes('black')
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-25 grayscale cursor-not-allowed'
            }`}
            style={{ backgroundColor: BALL_CONFIGS.black.colorHex }}
          >
            <div className="snooker-ball-highlight" />
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow">7</span>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/90 uppercase">Blk</span>
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRIMARY CONTROLS: MISS, FOUL, FREE BALL, UNDO, CONCEDE */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        
        {/* MISS / END TURN (Double width on mobile) */}
        <button
          type="button"
          onClick={onMiss}
          className="col-span-2 sm:col-span-2 py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-bold text-sm sm:text-base border border-gray-700 transition flex items-center justify-center space-x-2 shadow"
        >
          <ChevronRight className="w-5 h-5 text-emerald-400" />
          <span>Miss / Switch Turn</span>
        </button>

        {/* FOUL */}
        <button
          type="button"
          onClick={() => setIsFoulModalOpen(true)}
          className="col-span-1 py-3 px-2 sm:px-4 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-600/50 active:scale-95 text-red-200 font-bold text-xs sm:text-sm transition flex flex-col sm:flex-row items-center justify-center gap-1 shadow"
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Foul</span>
        </button>

        {/* FREE BALL TOGGLE */}
        <button
          type="button"
          onClick={onToggleFreeBall}
          className={`col-span-1 py-3 px-2 sm:px-4 rounded-xl border active:scale-95 font-bold text-xs sm:text-sm transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
            state.freeBallActive
              ? 'bg-yellow-500 text-black border-yellow-400 shadow-md shadow-yellow-950'
              : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:border-gray-700'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${state.freeBallActive ? 'text-black' : 'text-yellow-400'}`} />
          <span>Free Ball</span>
        </button>

        {/* UNDO BUTTON */}
        <button
          type="button"
          disabled={historyStack.length === 0}
          onClick={onUndo}
          className={`col-span-2 sm:col-span-1 py-3 px-2 sm:px-4 rounded-xl border active:scale-95 font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
            historyStack.length > 0
              ? 'bg-blue-950/80 text-blue-200 border-blue-600/50 hover:bg-blue-900'
              : 'bg-gray-900/40 text-gray-600 border-gray-800/40 cursor-not-allowed'
          }`}
          title="Revert the last pot, foul, or miss"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Undo ({historyStack.length})</span>
        </button>

        {/* CONCEDE FRAME (Only on larger screens or footer) */}
        <button
          type="button"
          onClick={onConcede}
          className="col-span-2 sm:col-span-5 py-2 px-3 rounded-lg text-gray-500 hover:text-red-400 text-xs font-semibold flex items-center justify-center space-x-1 transition"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Concede Frame</span>
        </button>
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
        fouledPlayerName={state.activePlayer === 1 ? player1.name : player2.name}
        opponentPlayerName={state.activePlayer === 1 ? player2.name : player1.name}
        onConfirmFoul={onConfirmFoul}
      />

      <WinModal
        isOpen={isWinModalOpen}
        frameWinner={state.winner}
        p1={player1}
        p2={player2}
        p1Score={state.player1Score}
        p2Score={state.player2Score}
        p1Frames={p1MatchFrames}
        p2Frames={p2MatchFrames}
        frameNumber={currentFrameNum}
        bestOf={match.best_of}
        highestBreak={highestBreak}
        highestBreakPlayer={highBreakPlayer}
        isMatchWon={isMatchWon}
        matchWinner={matchWinner}
        onNextFrame={handleNextFrame}
        onFinishMatch={handleFinishMatch}
      />

    </div>
  );
};
