import { 
  BallType, 
  BALL_CONFIGS, 
  COLOR_ORDER, 
  FrameState, 
  TablePhase, 
  SnookersNeededInfo 
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
 * Determine if a player needs snookers and how many (assuming min foul = 4 pts).
 */
export function checkSnookersNeeded(
  p1Score: number, 
  p2Score: number, 
  pointsRemaining: number
): SnookersNeededInfo {
  if (p1Score === p2Score) {
    return { needed: false, player: null, count: 0, pointsDiff: 0 };
  }

  const leader: 1 | 2 = p1Score > p2Score ? 1 : 2;
  const trailer: 1 | 2 = leader === 1 ? 2 : 1;
  const leadScore = Math.max(p1Score, p2Score);
  const trailScore = Math.min(p1Score, p2Score);

  const maxTrailerTableScore = trailScore + pointsRemaining;

  if (maxTrailerTableScore < leadScore) {
    const pointsDiff = leadScore - maxTrailerTableScore;
    const snookersCount = Math.ceil(pointsDiff / 4);
    return {
      needed: true,
      player: trailer,
      count: snookersCount,
      pointsDiff,
    };
  }

  return { needed: false, player: null, count: 0, pointsDiff: 0 };
}

/**
 * Creates the initial fresh frame state.
 */
export function createInitialFrameState(initialReds: number = 15): FrameState {
  const pointsRemaining = calculatePointsRemaining(initialReds, 'RED', 0);
  return {
    player1Score: 0,
    player2Score: 0,
    activePlayer: 1,
    currentBreak: 0,
    currentBreakBalls: [],
    highestBreakP1: 0,
    highestBreakP2: 0,
    redsRemaining: initialReds,
    tablePhase: 'RED',
    colorsSequenceIndex: 0,
    freeBallActive: false,
    pointsRemaining,
    snookersNeeded: { needed: false, player: null, count: 0, pointsDiff: 0 },
    isFrameOver: false,
    winner: null,
    lastActionDescription: 'Frame started. Break-off shot.',
  };
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
  const active = prevState.activePlayer;

  let pointsToAdd = ballConfig.points;
  let newReds = prevState.redsRemaining;
  let newPhase: TablePhase = prevState.tablePhase;
  let newSeqIndex = prevState.colorsSequenceIndex;
  let newFreeBall = false;

  // Handle Free Ball scenario
  if (prevState.freeBallActive) {
    if (prevState.tablePhase === 'RED') {
      // Free ball potted in place of a red: counts as 1 point
      pointsToAdd = 1;
      newPhase = 'COLOR_AFTER_RED';
      // Reds remaining does NOT decrease because a free ball was potted
    } else if (prevState.tablePhase === 'COLORS_SEQUENCE') {
      // Free ball potted in colors: counts as value of ball on
      const ballOn = COLOR_ORDER[prevState.colorsSequenceIndex];
      pointsToAdd = BALL_CONFIGS[ballOn].points;
      // Ball on remains on table to be potted next
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

  const p1Score = active === 1 ? prevState.player1Score + pointsToAdd : prevState.player1Score;
  const p2Score = active === 2 ? prevState.player2Score + pointsToAdd : prevState.player2Score;
  const newBreak = prevState.currentBreak + pointsToAdd;
  const newBreakBalls = [...prevState.currentBreakBalls, ball];

  const highestBreakP1 = active === 1 ? Math.max(prevState.highestBreakP1, newBreak) : prevState.highestBreakP1;
  const highestBreakP2 = active === 2 ? Math.max(prevState.highestBreakP2, newBreak) : prevState.highestBreakP2;

  const pointsRemaining = calculatePointsRemaining(newReds, newPhase, newSeqIndex);
  const snookersNeeded = checkSnookersNeeded(p1Score, p2Score, pointsRemaining);

  const isOver = newPhase === 'FRAME_OVER';
  let winner: 1 | 2 | null = null;
  let winReason: string | undefined = undefined;

  if (isOver) {
    if (p1Score > p2Score) {
      winner = 1;
      winReason = `Player 1 won on final black (${p1Score} - ${p2Score})`;
    } else if (p2Score > p1Score) {
      winner = 2;
      winReason = `Player 2 won on final black (${p2Score} - ${p1Score})`;
    } else {
      // Tie score on black
      winReason = 'Scores tied! Re-spotted black required.';
    }
  }

  const actionDesc = `Player ${active} potted ${ballConfig.name} (+${pointsToAdd} pts). Break: ${newBreak}.`;

  return {
    ...prevState,
    player1Score: p1Score,
    player2Score: p2Score,
    currentBreak: newBreak,
    currentBreakBalls: newBreakBalls,
    highestBreakP1,
    highestBreakP2,
    redsRemaining: newReds,
    tablePhase: newPhase,
    colorsSequenceIndex: newSeqIndex,
    freeBallActive: newFreeBall,
    pointsRemaining,
    snookersNeeded,
    isFrameOver: isOver,
    winner,
    winReason,
    lastActionDescription: actionDesc,
  };
}

/**
 * Handle a Miss / End Turn action (switch turn, preserve table state).
 */
export function handleMiss(prevState: FrameState): FrameState {
  if (prevState.isFrameOver) return prevState;

  const nextPlayer: 1 | 2 = prevState.activePlayer === 1 ? 2 : 1;
  let newPhase = prevState.tablePhase;

  // If previous player was on a color after red, turn ends and table resets to red or next color
  if (newPhase === 'COLOR_AFTER_RED') {
    newPhase = prevState.redsRemaining > 0 ? 'RED' : 'COLORS_SEQUENCE';
  }

  const pointsRemaining = calculatePointsRemaining(prevState.redsRemaining, newPhase, prevState.colorsSequenceIndex);
  const snookersNeeded = checkSnookersNeeded(prevState.player1Score, prevState.player2Score, pointsRemaining);

  const prevBreakDesc = prevState.currentBreak > 0 ? ` ended break of ${prevState.currentBreak}.` : ' missed shot.';

  return {
    ...prevState,
    activePlayer: nextPlayer,
    currentBreak: 0,
    currentBreakBalls: [],
    tablePhase: newPhase,
    freeBallActive: false,
    pointsRemaining,
    snookersNeeded,
    lastActionDescription: `Player ${prevState.activePlayer}${prevBreakDesc} Player ${nextPlayer} to table.`,
  };
}

/**
 * Handle a Foul action:
 * - Awards penalty points (4-7) to the opponent.
 * - Resets break.
 * - Resets table phase to RED or next sequence color.
 * - Switches turn (or gives option to pass back).
 * - Allows activating Free Ball if snookered.
 */
export function handleFoul(
  prevState: FrameState, 
  foulPoints: number, 
  awardFreeBall: boolean = false,
  passBackToSamePlayer: boolean = false
): FrameState {
  if (prevState.isFrameOver) return prevState;

  const fouledPlayer = prevState.activePlayer;
  const awardedPlayer: 1 | 2 = fouledPlayer === 1 ? 2 : 1;
  const nextPlayer: 1 | 2 = passBackToSamePlayer ? fouledPlayer : awardedPlayer;

  const p1Score = awardedPlayer === 1 ? prevState.player1Score + foulPoints : prevState.player1Score;
  const p2Score = awardedPlayer === 2 ? prevState.player2Score + foulPoints : prevState.player2Score;

  let newPhase = prevState.tablePhase;
  if (newPhase === 'COLOR_AFTER_RED') {
    newPhase = prevState.redsRemaining > 0 ? 'RED' : 'COLORS_SEQUENCE';
  }

  const pointsRemaining = calculatePointsRemaining(prevState.redsRemaining, newPhase, prevState.colorsSequenceIndex);
  const snookersNeeded = checkSnookersNeeded(p1Score, p2Score, pointsRemaining);

  const actionDesc = `Foul by Player ${fouledPlayer}! +${foulPoints} pts awarded to Player ${awardedPlayer}.${awardFreeBall ? ' Free ball awarded!' : ''}`;

  return {
    ...prevState,
    player1Score: p1Score,
    player2Score: p2Score,
    activePlayer: nextPlayer,
    currentBreak: 0,
    currentBreakBalls: [],
    tablePhase: newPhase,
    freeBallActive: awardFreeBall,
    pointsRemaining,
    snookersNeeded,
    lastActionDescription: actionDesc,
  };
}

/**
 * Handle Frame Concession.
 */
export function handleConcede(prevState: FrameState, concedingPlayer: 1 | 2): FrameState {
  const winner: 1 | 2 = concedingPlayer === 1 ? 2 : 1;
  return {
    ...prevState,
    isFrameOver: true,
    winner,
    winReason: `Player ${concedingPlayer} conceded the frame.`,
    lastActionDescription: `Player ${concedingPlayer} conceded. Player ${winner} wins frame!`,
  };
}
