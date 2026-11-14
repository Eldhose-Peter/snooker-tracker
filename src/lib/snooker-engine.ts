import { 
  BallType, 
  BALL_CONFIGS, 
  COLOR_ORDER, 
  FrameState, 
  TablePhase, 
  SnookersNeededInfo,
  TrailerSnookerInfo
} from '@/types/snooker';

/**
 * Calculate the maximum points available on the table.
 */
export function calculatePointsRemaining(
  redsRemaining: number, 
  phase: TablePhase, 
  colorSequenceIndex: number
): number {
  if (phase === 'FRAME_OVER') return 0;

  if (redsRemaining > 0) {
    if (phase === 'COLOR_AFTER_RED') {
      // 1 red was just potted. Active player can pot a black (7) + remaining reds (8 each) + 27 colors
      return 7 + (redsRemaining * 8) + 27;
    }
    // Waiting for red: each red + black (8 each) + 27 colors
    return (redsRemaining * 8) + 27;
  }

  // No reds remaining:
  if (phase === 'COLOR_AFTER_RED') {
    // Just potted the last red, can still pot nominated black (7) + all 6 sequence colors (27)
    return 7 + 27;
  }

  // Strictly in colors sequence: Yellow (2) -> Green (3) -> Brown (4) -> Blue (5) -> Pink (6) -> Black (7)
  const remainingColorPoints = [27, 25, 22, 18, 13, 7];
  if (colorSequenceIndex >= 0 && colorSequenceIndex < remainingColorPoints.length) {
    return remainingColorPoints[colorSequenceIndex];
  }

  return 0;
}

/**
 * Determine if any players need snookers and how many (assuming min foul = 4 pts).
 * Supports any number of players (2 to 6+), with backwards compatibility for 2-player calls.
 */
export function checkSnookersNeeded(
  scoresOrP1: number[] | number, 
  pointsOrP2: number, 
  pointsRemainingParam?: number
): SnookersNeededInfo {
  let scores: number[];
  let pointsRemaining: number;

  if (Array.isArray(scoresOrP1)) {
    scores = scoresOrP1;
    pointsRemaining = pointsOrP2;
  } else {
    scores = [scoresOrP1, pointsOrP2];
    pointsRemaining = pointsRemainingParam ?? 0;
  }

  if (scores.length === 0) {
    return {
      needed: false,
      leaderIndex: 0,
      trailers: [],
      player: null,
      count: 0,
      pointsDiff: 0,
    };
  }

  const maxScore = Math.max(...scores);
  const leaderIndex = scores.indexOf(maxScore);

  const trailers: TrailerSnookerInfo[] = [];

  scores.forEach((score, index) => {
    if (index === leaderIndex) return;
    const maxPossible = score + pointsRemaining;
    if (maxPossible < maxScore) {
      const pointsDiff = maxScore - maxPossible;
      const snookersCount = Math.ceil(pointsDiff / 4);
      trailers.push({
        playerIndex: index,
        count: snookersCount,
        pointsDiff,
      });
    }
  });

  const isNeeded = trailers.length > 0;
  const legacyTrailer = trailers[0];
  const legacyPlayer = legacyTrailer ? ((legacyTrailer.playerIndex === 0 ? 1 : 2) as 1 | 2) : null;

  return {
    needed: isNeeded,
    leaderIndex,
    trailers,
    player: legacyPlayer,
    count: legacyTrailer ? legacyTrailer.count : 0,
    pointsDiff: legacyTrailer ? legacyTrailer.pointsDiff : 0,
  };
}

/**
 * Helper to populate legacy FrameState fields (player1Score, player2Score, activePlayer, etc.)
 */
function syncFrameStateProps(
  state: Omit<FrameState, 'player1Score' | 'player2Score' | 'activePlayer' | 'highestBreakP1' | 'highestBreakP2' | 'winner'>
): FrameState {
  const p1Score = state.playerScores[0] ?? 0;
  const p2Score = state.playerScores[1] ?? 0;
  const activePlayer: 1 | 2 = (state.activePlayerIndex === 1 ? 2 : 1);
  const highestBreakP1 = state.playerHighestBreaks[0] ?? 0;
  const highestBreakP2 = state.playerHighestBreaks[1] ?? 0;
  const winner: 1 | 2 | null = state.winnerIndex !== null 
    ? ((state.winnerIndex === 1 ? 2 : 1) as 1 | 2) 
    : null;

  return {
    ...state,
    player1Score: p1Score,
    player2Score: p2Score,
    activePlayer,
    highestBreakP1,
    highestBreakP2,
    winner,
  };
}

/**
 * Helper to get player display name
 */
function getPlayerName(state: { playerNames?: string[] }, index: number): string {
  if (state.playerNames && state.playerNames[index]) {
    return state.playerNames[index];
  }
  return `Player ${index + 1}`;
}

/**
 * Creates the initial fresh frame state for N players.
 */
export function createInitialFrameState(
  playerCount: number = 2, 
  initialReds: number = 15,
  playerNames?: string[]
): FrameState {
  const count = Math.max(2, playerCount);
  const playerScores = new Array(count).fill(0);
  const playerHighestBreaks = new Array(count).fill(0);
  const pointsRemaining = calculatePointsRemaining(initialReds, 'RED', 0);
  const snookersNeeded = checkSnookersNeeded(playerScores, pointsRemaining);
  const p1Name = playerNames?.[0] || 'Player 1';

  return syncFrameStateProps({
    playerScores,
    playerNames,
    activePlayerIndex: 0,
    currentBreak: 0,
    currentBreakBalls: [],
    playerHighestBreaks,
    redsRemaining: initialReds,
    tablePhase: 'RED',
    colorsSequenceIndex: 0,
    freeBallActive: false,
    pointsRemaining,
    snookersNeeded,
    isFrameOver: false,
    winnerIndex: null,
    lastActionDescription: `Frame started. Break-off shot by ${p1Name}.`,
  });
}

/**
 * Determine which ball buttons should be enabled given the current frame state.
 */
export function getAvailableBalls(state: FrameState): BallType[] {
  if (state.isFrameOver) return [];

  if (state.freeBallActive) {
    // Under free ball, any ball can be nominated as a substitute for the ball on
    return ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];
  }

  if (state.tablePhase === 'RED') {
    return state.redsRemaining > 0 ? ['red'] : [];
  }

  if (state.tablePhase === 'COLOR_AFTER_RED') {
    return ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
  }

  if (state.tablePhase === 'COLORS_SEQUENCE') {
    const ballOn = COLOR_ORDER[state.colorsSequenceIndex];
    return ballOn ? [ballOn] : [];
  }

  return [];
}

/**
 * Handle a successful Pot action.
 */
export function handlePot(prevState: FrameState, ball: BallType): FrameState {
  if (prevState.isFrameOver) return prevState;

  const ballConfig = BALL_CONFIGS[ball];
  const activeIdx = prevState.activePlayerIndex;
  const activeName = getPlayerName(prevState, activeIdx);

  let pointsToAdd = ballConfig.points;
  let newReds = prevState.redsRemaining;
  let newPhase: TablePhase = prevState.tablePhase;
  let newSeqIndex = prevState.colorsSequenceIndex;
  const newFreeBall = false;

  // Handle Free Ball scenario
  if (prevState.freeBallActive) {
    if (prevState.tablePhase === 'RED') {
      pointsToAdd = 1;
      newPhase = 'COLOR_AFTER_RED';
    } else if (prevState.tablePhase === 'COLORS_SEQUENCE') {
      const ballOn = COLOR_ORDER[prevState.colorsSequenceIndex];
      pointsToAdd = BALL_CONFIGS[ballOn].points;
    }
  } else {
    // Normal Pot
    if (ball === 'red') {
      newReds = Math.max(0, prevState.redsRemaining - 1);
      newPhase = 'COLOR_AFTER_RED';
    } else {
      // Potted a color
      if (prevState.tablePhase === 'COLOR_AFTER_RED') {
        if (newReds > 0) {
          newPhase = 'RED';
        } else {
          // Cleared all reds and their trailing color! Transition to colors sequence
          newPhase = 'COLORS_SEQUENCE';
          newSeqIndex = 0;
        }
      } else if (prevState.tablePhase === 'COLORS_SEQUENCE') {
        newSeqIndex += 1;
        if (newSeqIndex >= COLOR_ORDER.length) {
          newPhase = 'FRAME_OVER';
        }
      }
    }
  }

  const nextScores = [...prevState.playerScores];
  nextScores[activeIdx] = (nextScores[activeIdx] ?? 0) + pointsToAdd;

  const newBreak = prevState.currentBreak + pointsToAdd;
  const newBreakBalls = [...prevState.currentBreakBalls, ball];

  const nextHighestBreaks = [...prevState.playerHighestBreaks];
  nextHighestBreaks[activeIdx] = Math.max(nextHighestBreaks[activeIdx] ?? 0, newBreak);

  let isOver = newPhase === 'FRAME_OVER';
  let winnerIndex: number | null = null;
  let winReason: string | undefined = undefined;

  if (isOver) {
    const maxScore = Math.max(...nextScores);
    const winningIndices = nextScores
      .map((s, idx) => (s === maxScore ? idx : -1))
      .filter(idx => idx !== -1);

    if (winningIndices.length === 1) {
      winnerIndex = winningIndices[0];
      const winName = getPlayerName(prevState, winnerIndex);
      winReason = `${winName} won on final black (${nextScores.join(' - ')})`;
    } else {
      // Official Snooker Rule: Tied scores on final black require a Re-spotted Black!
      // Frame stays active with 7 points remaining (only Black playable)
      newPhase = 'COLORS_SEQUENCE';
      newSeqIndex = 5; // Black ball
      isOver = false;
      winnerIndex = null;
      winReason = 'Scores tied on final black! Re-spotted black for the win.';
    }
  }

  const pointsRemaining = calculatePointsRemaining(newReds, newPhase, newSeqIndex);
  const snookersNeeded = checkSnookersNeeded(nextScores, pointsRemaining);

  let actionDesc: string;
  if (isOver && winnerIndex !== null) {
    const winName = getPlayerName(prevState, winnerIndex);
    actionDesc = `${activeName} potted ${ballConfig.name} (+${pointsToAdd} pts). ${winName} wins frame!`;
  } else if (!isOver && newSeqIndex === 5 && newPhase === 'COLORS_SEQUENCE' && newReds === 0 && winReason?.includes('Re-spotted')) {
    actionDesc = `${activeName} potted ${ballConfig.name} (+${pointsToAdd} pts). Scores TIED (${nextScores.join(' - ')})! Re-spotted black for the win!`;
  } else {
    actionDesc = `${activeName} potted ${ballConfig.name} (+${pointsToAdd} pts). Break: ${newBreak}.`;
  }

  return syncFrameStateProps({
    ...prevState,
    playerScores: nextScores,
    currentBreak: newBreak,
    currentBreakBalls: newBreakBalls,
    playerHighestBreaks: nextHighestBreaks,
    redsRemaining: newReds,
    tablePhase: newPhase,
    colorsSequenceIndex: newSeqIndex,
    freeBallActive: newFreeBall,
    pointsRemaining,
    snookersNeeded,
    isFrameOver: isOver,
    winnerIndex,
    winReason,
    lastActionDescription: actionDesc,
  });
}

/**
 * Handle a Miss / End Turn action (switch turn to next player in sequence).
 */
export function handleMiss(prevState: FrameState): FrameState {
  if (prevState.isFrameOver) return prevState;

  const playerCount = prevState.playerScores.length;
  const nextPlayerIndex = (prevState.activePlayerIndex + 1) % playerCount;
  let newPhase = prevState.tablePhase;

  // If previous player was on a color after red, turn ends and table resets to red or next color
  if (newPhase === 'COLOR_AFTER_RED') {
    newPhase = prevState.redsRemaining > 0 ? 'RED' : 'COLORS_SEQUENCE';
  }

  const pointsRemaining = calculatePointsRemaining(prevState.redsRemaining, newPhase, prevState.colorsSequenceIndex);
  const snookersNeeded = checkSnookersNeeded(prevState.playerScores, pointsRemaining);

  const activeName = getPlayerName(prevState, prevState.activePlayerIndex);
  const nextName = getPlayerName(prevState, nextPlayerIndex);
  const prevBreakDesc = prevState.currentBreak > 0 
    ? ` ended break of ${prevState.currentBreak}.` 
    : ' missed shot.';

  return syncFrameStateProps({
    ...prevState,
    activePlayerIndex: nextPlayerIndex,
    currentBreak: 0,
    currentBreakBalls: [],
    tablePhase: newPhase,
    freeBallActive: false,
    pointsRemaining,
    snookersNeeded,
    lastActionDescription: `${activeName}${prevBreakDesc} ${nextName} to table.`,
  });
}

/**
 * Handle a Foul action:
 * - Awards penalty points (4-7) to recipient(s).
 * - Target can be 'all_opponents' (default for cutthroat/ring games), 'next_player', or specific player index/indices.
 * - Resets break.
 * - Resets table phase to RED or next sequence color.
 * - Switches turn to next player (or passes back to fouled player).
 * - Allows activating Free Ball if snookered.
 */
export function handleFoul(
  prevState: FrameState, 
  foulPoints: number, 
  target: 'all_opponents' | 'next_player' | number | number[] = 'all_opponents',
  awardFreeBall: boolean = false,
  passBackToSamePlayer: boolean = false
): FrameState {
  if (prevState.isFrameOver) return prevState;

  const fouledIdx = prevState.activePlayerIndex;
  const playerCount = prevState.playerScores.length;
  const nextScores = [...prevState.playerScores];
  const fouledName = getPlayerName(prevState, fouledIdx);

  let recipientDesc = 'all opponents';

  // Award foul points based on target
  if (target === 'all_opponents') {
    recipientDesc = 'all other players';
    for (let i = 0; i < playerCount; i++) {
      if (i !== fouledIdx) {
        nextScores[i] = (nextScores[i] ?? 0) + foulPoints;
      }
    }
  } else if (target === 'next_player') {
    const nextIdx = (fouledIdx + 1) % playerCount;
    recipientDesc = getPlayerName(prevState, nextIdx);
    nextScores[nextIdx] = (nextScores[nextIdx] ?? 0) + foulPoints;
  } else if (typeof target === 'number') {
    if (target >= 0 && target < playerCount) {
      recipientDesc = getPlayerName(prevState, target);
      nextScores[target] = (nextScores[target] ?? 0) + foulPoints;
    }
  } else if (Array.isArray(target)) {
    recipientDesc = target.map(idx => getPlayerName(prevState, idx)).join(', ');
    target.forEach(idx => {
      if (idx >= 0 && idx < playerCount) {
        nextScores[idx] = (nextScores[idx] ?? 0) + foulPoints;
      }
    });
  }

  const nextActiveIndex = passBackToSamePlayer ? fouledIdx : ((fouledIdx + 1) % playerCount);

  let newPhase = prevState.tablePhase;
  if (newPhase === 'COLOR_AFTER_RED') {
    newPhase = prevState.redsRemaining > 0 ? 'RED' : 'COLORS_SEQUENCE';
  }

  let isOver: boolean = prevState.isFrameOver;
  let winnerIndex = prevState.winnerIndex;
  let winReason = prevState.winReason;

  // If foul occurred during a re-spotted black shootout, the penalty points break the tie and decide the frame
  const isReSpottedBlack = prevState.tablePhase === 'COLORS_SEQUENCE' && 
    prevState.colorsSequenceIndex === 5 && 
    prevState.redsRemaining === 0;

  if (isReSpottedBlack && !isOver) {
    const maxScore = Math.max(...nextScores);
    const leaders = nextScores
      .map((s, idx) => (s === maxScore ? idx : -1))
      .filter(i => i !== -1);

    if (leaders.length === 1) {
      isOver = true;
      winnerIndex = leaders[0];
      const winName = getPlayerName(prevState, winnerIndex);
      winReason = `Foul on re-spotted black! ${winName} wins frame.`;
      newPhase = 'FRAME_OVER';
    }
  }

  const pointsRemaining = isOver ? 0 : calculatePointsRemaining(prevState.redsRemaining, newPhase, prevState.colorsSequenceIndex);
  const snookersNeeded = checkSnookersNeeded(nextScores, pointsRemaining);

  const actionDesc = `Foul by ${fouledName}! +${foulPoints} pts awarded to ${recipientDesc}.${awardFreeBall ? ' Free ball awarded!' : ''}`;

  return syncFrameStateProps({
    ...prevState,
    playerScores: nextScores,
    activePlayerIndex: nextActiveIndex,
    currentBreak: 0,
    currentBreakBalls: [],
    tablePhase: newPhase,
    freeBallActive: awardFreeBall,
    pointsRemaining,
    snookersNeeded,
    isFrameOver: isOver,
    winnerIndex,
    winReason,
    lastActionDescription: actionDesc,
  });
}

/**
 * Handle manually switching the active player at table (e.g. clicking a player card).
 */
export function handleSwitchPlayer(prevState: FrameState, targetPlayerIndex: number): FrameState {
  if (prevState.isFrameOver) return prevState;
  if (targetPlayerIndex < 0 || targetPlayerIndex >= prevState.playerScores.length) return prevState;
  if (targetPlayerIndex === prevState.activePlayerIndex) return prevState;

  let newPhase = prevState.tablePhase;
  if (newPhase === 'COLOR_AFTER_RED') {
    newPhase = prevState.redsRemaining > 0 ? 'RED' : 'COLORS_SEQUENCE';
  }

  const targetName = getPlayerName(prevState, targetPlayerIndex);

  return syncFrameStateProps({
    ...prevState,
    activePlayerIndex: targetPlayerIndex,
    currentBreak: 0,
    currentBreakBalls: [],
    tablePhase: newPhase,
    freeBallActive: false,
    lastActionDescription: `Switched active player to ${targetName}.`,
  });
}

/**
 * Handle Frame Concession.
 */
export function handleConcede(prevState: FrameState, concedingPlayerIndex: number): FrameState {
  const playerCount = prevState.playerScores.length;
  let winnerIndex: number | null = null;

  if (playerCount === 2) {
    winnerIndex = concedingPlayerIndex === 0 ? 1 : 0;
  } else {
    // In multiplayer, the non-conceding player with the highest score wins
    let highest = -1;
    for (let i = 0; i < playerCount; i++) {
      if (i !== concedingPlayerIndex && (prevState.playerScores[i] ?? 0) > highest) {
        highest = prevState.playerScores[i] ?? 0;
        winnerIndex = i;
      }
    }
    if (winnerIndex === null) {
      winnerIndex = (concedingPlayerIndex + 1) % playerCount;
    }
  }

  const concedingName = getPlayerName(prevState, concedingPlayerIndex);
  const winnerName = getPlayerName(prevState, winnerIndex ?? 0);

  return syncFrameStateProps({
    ...prevState,
    isFrameOver: true,
    winnerIndex,
    winReason: `${concedingName} conceded the frame.`,
    lastActionDescription: `${concedingName} conceded. ${winnerName} wins frame!`,
  });
}
