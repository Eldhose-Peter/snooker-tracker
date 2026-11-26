import { Match, Frame, MatchEvent, BallType } from '@/types/snooker';

export const P_ELDHO = 'p1000000-0000-0000-0000-000000000001'; // Eldho
export const P_THOMA = 'p2000000-0000-0000-0000-000000000002'; // Thoma
export const P_RAJU = 'p3000000-0000-0000-0000-000000000003';  // Raju
export const P_ADI = 'p4000000-0000-0000-0000-000000000004';   // Adi
export const P_BM = 'p5000000-0000-0000-0000-000000000005';    // BM
export const P_SAM = 'p6000000-0000-0000-0000-000000000006';   // Sam

export const M1_ID = 'm1000000-0000-0000-0000-000000000001';
export const M2_ID = 'm2000000-0000-0000-0000-000000000002';
export const M3_ID = 'm3000000-0000-0000-0000-000000000003';

export const F1_ID = 'f1000000-0000-0000-0000-000000000001';
export const F2_ID = 'f2000000-0000-0000-0000-000000000002';
export const F3_ID = 'f3000000-0000-0000-0000-000000000003';
export const F4_ID = 'f4000000-0000-0000-0000-000000000004';
export const F5_ID = 'f5000000-0000-0000-0000-000000000005';
export const F6_ID = 'f6000000-0000-0000-0000-000000000006';

// Helper to build a clean event object
function makeEvent(
  frameNumber: number,
  type: MatchEvent['type'],
  playerIndex: number,
  playerId: string,
  playerName: string,
  detail: string,
  scoresAfter: number[],
  opts: {
    ball?: BallType;
    points?: number;
    breakScore?: number;
    breakBalls?: BallType[];
    foulPoints?: number;
    awardedTo?: number[];
    freeBallAwarded?: boolean;
    timestampOffsetMs?: number;
  } = {}
): MatchEvent {
  const baseTime = Date.now() - 72 * 3600000;
  return {
    id: `evt-actual-${frameNumber}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: baseTime + (opts.timestampOffsetMs || 0),
    frameNumber,
    type,
    playerIndex,
    playerId,
    playerName,
    detail,
    scoresAfter: [...scoresAfter],
    ball: opts.ball,
    points: opts.points,
    breakScore: opts.breakScore,
    breakBalls: opts.breakBalls,
    foulPoints: opts.foulPoints,
    awardedTo: opts.awardedTo,
    freeBallAwarded: opts.freeBallAwarded,
  };
}

/**
 * Creates realistic event sequences for Frame 1 of Match 1: Eldho (68) vs Thoma (42)
 * High break 40 by Eldho
 */
function createFrame1Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 25) => (t += sec * 1000);

  events.push(makeEvent(1, 'frame_start', 0, P_ELDHO, 'Eldho', 'Frame 1 started', [0, 0], { timestampOffsetMs: t }));

  // Eldho visit 1: Pot Red (1), Black (7), Red (1), Pink (6), Red (1), Miss color -> Break 16
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 1', [1, 0], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts) • Break: 8', [8, 0], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 9', [9, 0], { ball: 'red', points: 1, breakScore: 9, breakBalls: ['red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts) • Break: 15', [15, 0], { ball: 'pink', points: 6, breakScore: 15, breakBalls: ['red', 'black', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 16', [16, 0], { ball: 'red', points: 1, breakScore: 16, breakBalls: ['red', 'black', 'red', 'pink', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed • Turn to Thoma', [16, 0], { timestampOffsetMs: t }));

  // Thoma visit 1: Pot Red (1), Blue (5), Red (1), Black (7), Miss red -> Break 14
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt) • Break: 1', [16, 1], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Blue (+5 pts) • Break: 6', [16, 6], { ball: 'blue', points: 5, breakScore: 6, breakBalls: ['red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt) • Break: 7', [16, 7], { ball: 'red', points: 1, breakScore: 7, breakBalls: ['red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts) • Break: 14', [16, 14], { ball: 'black', points: 7, breakScore: 14, breakBalls: ['red', 'blue', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 1, P_THOMA, 'Thoma', 'Thoma missed • Turn to Eldho', [16, 14], { timestampOffsetMs: t }));

  // Eldho visit 2: Pot Red (1), Black (7), Miss -> Break 8
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 1', [17, 14], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts) • Break: 8', [24, 14], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed • Turn to Thoma', [24, 14], { timestampOffsetMs: t }));

  // Thoma foul: in-off scratch (+4 pts to Eldho)
  advance();
  events.push(makeEvent(1, 'foul', 1, P_THOMA, 'Thoma', 'Thoma fouled: In-off cue ball (+4 pts to Eldho)', [28, 14], {
    foulPoints: 4,
    awardedTo: [0],
    timestampOffsetMs: t,
  }));

  // Eldho visit 3: 40 Break Run (Red, Black, Red, Black, Red, Pink, Red, Blue, Red, Black, Red, Yellow)
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 1', [29, 14], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts) • Break: 8', [36, 14], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 9', [37, 14], { ball: 'red', points: 1, breakScore: 9, breakBalls: ['red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts) • Break: 16', [44, 14], { ball: 'black', points: 7, breakScore: 16, breakBalls: ['red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 17', [45, 14], { ball: 'red', points: 1, breakScore: 17, breakBalls: ['red', 'black', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts) • Break: 23', [51, 14], { ball: 'pink', points: 6, breakScore: 23, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 24', [52, 14], { ball: 'red', points: 1, breakScore: 24, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts) • Break: 29', [57, 14], { ball: 'blue', points: 5, breakScore: 29, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 30', [58, 14], { ball: 'red', points: 1, breakScore: 30, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts) • Break: 37', [65, 14], { ball: 'black', points: 7, breakScore: 37, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'blue', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt) • Break: 38', [66, 14], { ball: 'red', points: 1, breakScore: 38, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'blue', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Yellow (+2 pts) • Break: 40', [68, 14], { ball: 'yellow', points: 2, breakScore: 40, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'blue', 'red', 'black', 'red', 'yellow'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed • Turn to Thoma', [68, 14], { timestampOffsetMs: t }));

  // Thoma clearance attempt: 28 pts break (Red, Black, Yellow, Green, Brown, Blue, Pink)
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt) • Break: 1', [68, 15], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts) • Break: 8', [68, 22], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Yellow (+2 pts) • Break: 10', [68, 24], { ball: 'yellow', points: 2, breakScore: 10, breakBalls: ['red', 'black', 'yellow'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Green (+3 pts) • Break: 13', [68, 27], { ball: 'green', points: 3, breakScore: 13, breakBalls: ['red', 'black', 'yellow', 'green'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Brown (+4 pts) • Break: 17', [68, 31], { ball: 'brown', points: 4, breakScore: 17, breakBalls: ['red', 'black', 'yellow', 'green', 'brown'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Blue (+5 pts) • Break: 22', [68, 36], { ball: 'blue', points: 5, breakScore: 22, breakBalls: ['red', 'black', 'yellow', 'green', 'brown', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Pink (+6 pts) • Break: 28', [68, 42], { ball: 'pink', points: 6, breakScore: 28, breakBalls: ['red', 'black', 'yellow', 'green', 'brown', 'blue', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 1, P_THOMA, 'Thoma', 'Thoma missed Black ball', [68, 42], { timestampOffsetMs: t }));

  // Frame End
  advance();
  events.push(makeEvent(1, 'concede', 1, P_THOMA, 'Thoma', 'Thoma conceded Frame 1 • Eldho wins 68 - 42', [68, 42], { timestampOffsetMs: t }));

  return events;
}

/**
 * Creates events for Frame 2: Thoma 71 - 35 Eldho. High break 54 by Thoma!
 */
function createFrame2Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(2, 'frame_start', 1, P_THOMA, 'Thoma', 'Frame 2 started', [0, 0], { timestampOffsetMs: t }));

  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [1, 0], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts)', [6, 0], { ball: 'blue', points: 5, breakScore: 6, breakBalls: ['red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [7, 0], { ball: 'red', points: 1, breakScore: 7, breakBalls: ['red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [13, 0], { ball: 'pink', points: 6, breakScore: 13, breakBalls: ['red', 'blue', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed', [13, 0], { timestampOffsetMs: t }));

  // Thoma big 54 break run!
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [13, 1], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [13, 8], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [13, 9], { ball: 'red', points: 1, breakScore: 9, breakBalls: ['red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [13, 16], { ball: 'black', points: 7, breakScore: 16, breakBalls: ['red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [13, 17], { ball: 'red', points: 1, breakScore: 17, breakBalls: ['red', 'black', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Pink (+6 pts)', [13, 23], { ball: 'pink', points: 6, breakScore: 23, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [13, 24], { ball: 'red', points: 1, breakScore: 24, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [13, 31], { ball: 'black', points: 7, breakScore: 31, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [13, 32], { ball: 'red', points: 1, breakScore: 32, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Blue (+5 pts)', [13, 37], { ball: 'blue', points: 5, breakScore: 37, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [13, 38], { ball: 'red', points: 1, breakScore: 38, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [13, 45], { ball: 'black', points: 7, breakScore: 45, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red', 'blue', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Yellow (+2 pts)', [13, 47], { ball: 'yellow', points: 2, breakScore: 47, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red', 'blue', 'red', 'black', 'yellow'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Green (+3 pts)', [13, 50], { ball: 'green', points: 3, breakScore: 50, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red', 'blue', 'red', 'black', 'yellow', 'green'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Brown (+4 pts)', [13, 54], { ball: 'brown', points: 4, breakScore: 54, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red', 'blue', 'red', 'black', 'yellow', 'green', 'brown'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'miss', 1, P_THOMA, 'Thoma', 'Thoma missed Blue • Break ends at 54', [13, 54], { timestampOffsetMs: t }));

  advance();
  events.push(makeEvent(2, 'foul', 0, P_ELDHO, 'Eldho', 'Eldho foul (+4 pts to Thoma)', [13, 58], { foulPoints: 4, awardedTo: [1], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [14, 58], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [21, 58], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Yellow (+2 pts)', [23, 58], { ball: 'yellow', points: 2, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Green (+3 pts)', [26, 58], { ball: 'green', points: 3, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Brown (+4 pts)', [30, 58], { ball: 'brown', points: 4, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts)', [35, 58], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed Pink', [35, 58], { timestampOffsetMs: t }));

  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Pink (+6 pts)', [35, 64], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [35, 71], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'frame_end', 1, P_THOMA, 'Thoma', 'Thoma won Frame 2 (71 - 35)', [35, 71], { timestampOffsetMs: t }));

  return events;
}

/**
 * Creates events for Frame 3: Eldho 75 - 29 Thoma. High break 66 by Eldho! Decider!
 */
function createFrame3Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(3, 'frame_start', 0, P_ELDHO, 'Eldho', 'Frame 3 (Decider) started', [0, 0], { timestampOffsetMs: t }));

  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [0, 1], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [0, 8], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [0, 9], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [0, 16], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Red (+1 pt)', [0, 17], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'miss', 1, P_THOMA, 'Thoma', 'Thoma missed Pink', [0, 17], { timestampOffsetMs: t }));

  // Eldho 66 Break run!
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [1, 17], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [8, 17], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [9, 17], { ball: 'red', points: 1, breakScore: 9, breakBalls: ['red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [16, 17], { ball: 'black', points: 7, breakScore: 16, breakBalls: ['red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [17, 17], { ball: 'red', points: 1, breakScore: 17, breakBalls: ['red', 'black', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [23, 17], { ball: 'pink', points: 6, breakScore: 23, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [24, 17], { ball: 'red', points: 1, breakScore: 24, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [31, 17], { ball: 'black', points: 7, breakScore: 31, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [32, 17], { ball: 'red', points: 1, breakScore: 32, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [39, 17], { ball: 'black', points: 7, breakScore: 39, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Yellow (+2 pts)', [41, 17], { ball: 'yellow', points: 2, breakScore: 41, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Green (+3 pts)', [44, 17], { ball: 'green', points: 3, breakScore: 44, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Brown (+4 pts)', [48, 17], { ball: 'brown', points: 4, breakScore: 48, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts)', [53, 17], { ball: 'blue', points: 5, breakScore: 53, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [59, 17], { ball: 'pink', points: 6, breakScore: 59, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [66, 17], { ball: 'black', points: 7, breakScore: 66, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed', [66, 17], { timestampOffsetMs: t }));

  advance();
  events.push(makeEvent(3, 'foul', 1, P_THOMA, 'Thoma', 'Thoma foul (+4 pts to Eldho)', [70, 17], { foulPoints: 4, awardedTo: [0], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Blue (+5 pts)', [70, 22], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [70, 29], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'miss', 1, P_THOMA, 'Thoma', 'Thoma missed • Turn to Eldho', [70, 29], { timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts)', [75, 29], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'frame_end', 0, P_ELDHO, 'Eldho', 'Eldho won Frame 3 (75 - 29) and the match!', [75, 29], { timestampOffsetMs: t }));

  return events;
}

/**
 * Creates events for Raju (54) vs Adi (38) - Frame 1
 * High break 34 by Raju
 */
function createRajuAdiFrame1Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(1, 'frame_start', 0, P_RAJU, 'Raju', 'Frame 1 started', [0, 0], { timestampOffsetMs: t }));

  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Red (+1 pt)', [0, 1], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Black (+7 pts)', [0, 8], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Red (+1 pt)', [0, 9], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Blue (+5 pts)', [0, 14], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 1, P_ADI, 'Adi', 'Adi missed', [0, 14], { timestampOffsetMs: t }));

  // Raju 34 break run!
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [1, 14], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [8, 14], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [9, 14], { ball: 'red', points: 1, breakScore: 9, breakBalls: ['red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Pink (+6 pts)', [15, 14], { ball: 'pink', points: 6, breakScore: 15, breakBalls: ['red', 'black', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [16, 14], { ball: 'red', points: 1, breakScore: 16, breakBalls: ['red', 'black', 'red', 'pink', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Blue (+5 pts)', [21, 14], { ball: 'blue', points: 5, breakScore: 21, breakBalls: ['red', 'black', 'red', 'pink', 'red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [22, 14], { ball: 'red', points: 1, breakScore: 22, breakBalls: ['red', 'black', 'red', 'pink', 'red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [29, 14], { ball: 'black', points: 7, breakScore: 29, breakBalls: ['red', 'black', 'red', 'pink', 'red', 'blue', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Yellow (+2 pts)', [31, 14], { ball: 'yellow', points: 2, breakScore: 31, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Green (+3 pts)', [34, 14], { ball: 'green', points: 3, breakScore: 34, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_RAJU, 'Raju', 'Raju missed Brown • Break 34', [34, 14], { timestampOffsetMs: t }));

  // Adi fight back: 24 points to reach 38
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Brown (+4 pts)', [34, 18], { ball: 'brown', points: 4, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Blue (+5 pts)', [34, 23], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Pink (+6 pts)', [34, 29], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Black (+7 pts)', [34, 36], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_ADI, 'Adi', 'Adi potted Yellow (+2 pts)', [34, 38], { ball: 'yellow', points: 2, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'foul', 1, P_ADI, 'Adi', 'Adi foul (+4 pts to Raju)', [38, 38], { foulPoints: 4, awardedTo: [0], timestampOffsetMs: t }));

  // Raju finishes 54 - 38
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Blue (+5 pts)', [43, 38], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Pink (+6 pts)', [49, 38], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Blue (+5 pts)', [54, 38], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'frame_end', 0, P_RAJU, 'Raju', 'Raju won Frame 1 (54 - 38)', [54, 38], { timestampOffsetMs: t }));

  return events;
}

/**
 * Creates events for Raju (62) vs Adi (45) - Frame 2
 * High break 38 by Raju
 */
function createRajuAdiFrame2Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(2, 'frame_start', 1, P_ADI, 'Adi', 'Frame 2 started', [0, 0], { timestampOffsetMs: t }));

  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Red (+1 pt)', [0, 1], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Black (+7 pts)', [0, 8], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Red (+1 pt)', [0, 9], { ball: 'red', points: 1, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Pink (+6 pts)', [0, 15], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'miss', 1, P_ADI, 'Adi', 'Adi missed', [0, 15], { timestampOffsetMs: t }));

  // Raju 38 break
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [1, 15], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [8, 15], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [9, 15], { ball: 'red', points: 1, breakScore: 9, breakBalls: ['red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [16, 15], { ball: 'black', points: 7, breakScore: 16, breakBalls: ['red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [17, 15], { ball: 'red', points: 1, breakScore: 17, breakBalls: ['red', 'black', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Blue (+5 pts)', [22, 15], { ball: 'blue', points: 5, breakScore: 22, breakBalls: ['red', 'black', 'red', 'black', 'red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [23, 15], { ball: 'red', points: 1, breakScore: 23, breakBalls: ['red', 'black', 'red', 'black', 'red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [30, 15], { ball: 'black', points: 7, breakScore: 30, breakBalls: ['red', 'black', 'red', 'black', 'red', 'blue', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Red (+1 pt)', [31, 15], { ball: 'red', points: 1, breakScore: 31, breakBalls: ['red', 'black', 'red', 'black', 'red', 'blue', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [38, 15], { ball: 'black', points: 7, breakScore: 38, breakBalls: ['red', 'black', 'red', 'black', 'red', 'blue', 'red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'miss', 0, P_RAJU, 'Raju', 'Raju missed Yellow • Break 38', [38, 15], { timestampOffsetMs: t }));

  // Adi scores 30 points to reach 45
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Yellow (+2 pts)', [38, 17], { ball: 'yellow', points: 2, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Green (+3 pts)', [38, 20], { ball: 'green', points: 3, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Brown (+4 pts)', [38, 24], { ball: 'brown', points: 4, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Blue (+5 pts)', [38, 29], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Pink (+6 pts)', [38, 35], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Black (+7 pts)', [38, 42], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 1, P_ADI, 'Adi', 'Adi potted Green (+3 pts)', [38, 45], { ball: 'green', points: 3, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'miss', 1, P_ADI, 'Adi', 'Adi missed', [38, 45], { timestampOffsetMs: t }));

  // Raju finishes to 62
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Blue (+5 pts)', [43, 45], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [50, 45], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Blue (+5 pts)', [55, 45], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'pot', 0, P_RAJU, 'Raju', 'Raju potted Black (+7 pts)', [62, 45], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(2, 'frame_end', 0, P_RAJU, 'Raju', 'Raju won Frame 2 (62 - 45) and series 2-0!', [62, 45], { timestampOffsetMs: t }));

  return events;
}

/**
 * Creates events for 3-Player Match: Eldho (42) vs BM (58) vs Sam (36)
 * High break 41 by BM!
 */
function createMultiplayerFrameEvents(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(1, 'frame_start', 0, P_ELDHO, 'Eldho', '3-Player Frame started', [0, 0, 0], { timestampOffsetMs: t }));

  // Eldho turn: 8 pts
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [1, 0, 0], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [8, 0, 0], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed • Turn to BM', [8, 0, 0], { timestampOffsetMs: t }));

  // BM turn: 41 break! (Red, Black, Red, Black, Red, Black, Red, Pink, Red, Black, Yellow) = 1+7+1+7+1+7+1+6+1+7+2 = 41
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Red (+1 pt)', [8, 1, 0], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Black (+7 pts)', [8, 8, 0], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Red (+1 pt)', [8, 9, 0], { ball: 'red', points: 1, breakScore: 9, breakBalls: ['red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Black (+7 pts)', [8, 16, 0], { ball: 'black', points: 7, breakScore: 16, breakBalls: ['red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Red (+1 pt)', [8, 17, 0], { ball: 'red', points: 1, breakScore: 17, breakBalls: ['red', 'black', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Black (+7 pts)', [8, 24, 0], { ball: 'black', points: 7, breakScore: 24, breakBalls: ['red', 'black', 'red', 'black', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Red (+1 pt)', [8, 25, 0], { ball: 'red', points: 1, breakScore: 25, breakBalls: ['red', 'black', 'red', 'black', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Pink (+6 pts)', [8, 31, 0], { ball: 'pink', points: 6, breakScore: 31, breakBalls: ['red', 'black', 'red', 'black', 'red', 'black', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Red (+1 pt)', [8, 32, 0], { ball: 'red', points: 1, breakScore: 32, breakBalls: ['red', 'black', 'red', 'black', 'red', 'black', 'red', 'pink', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Black (+7 pts)', [8, 39, 0], { ball: 'black', points: 7, breakScore: 39, breakBalls: ['red', 'black', 'red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Yellow (+2 pts)', [8, 41, 0], { ball: 'yellow', points: 2, breakScore: 41, breakBalls: ['red', 'black', 'red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'yellow'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 1, P_BM, 'BM', 'BM missed • Turn to Sam • Break: 41', [8, 41, 0], { timestampOffsetMs: t }));

  // Sam turn: 23 points
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Red (+1 pt)', [8, 41, 1], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Blue (+5 pts)', [8, 41, 6], { ball: 'blue', points: 5, breakScore: 6, breakBalls: ['red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Red (+1 pt)', [8, 41, 7], { ball: 'red', points: 1, breakScore: 7, breakBalls: ['red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Black (+7 pts)', [8, 41, 14], { ball: 'black', points: 7, breakScore: 14, breakBalls: ['red', 'blue', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Yellow (+2 pts)', [8, 41, 16], { ball: 'yellow', points: 2, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Green (+3 pts)', [8, 41, 19], { ball: 'green', points: 3, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Brown (+4 pts)', [8, 41, 23], { ball: 'brown', points: 4, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 2, P_SAM, 'Sam', 'Sam missed Blue', [8, 41, 23], { timestampOffsetMs: t }));

  // Sam foul: in-off (+4 to Eldho and BM)
  advance();
  events.push(makeEvent(1, 'foul', 2, P_SAM, 'Sam', 'Sam fouled (+4 pts to all opponents)', [12, 45, 23], { foulPoints: 4, awardedTo: [0, 1], timestampOffsetMs: t }));

  // Eldho scores 30 more to reach 42
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts)', [17, 45, 23], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [23, 45, 23], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [30, 45, 23], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [36, 45, 23], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [42, 45, 23], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed', [42, 45, 23], { timestampOffsetMs: t }));

  // Sam scores to reach 36
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Black (+7 pts)', [42, 45, 30], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Pink (+6 pts)', [42, 45, 36], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 2, P_SAM, 'Sam', 'Sam missed', [42, 45, 36], { timestampOffsetMs: t }));

  // BM clears remaining to win 58 - 42 - 36
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Blue (+5 pts)', [42, 50, 36], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Pink (+6 pts)', [42, 56, 36], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'foul', 0, P_ELDHO, 'Eldho', 'Eldho foul (+2 to opponents)', [42, 58, 36], { foulPoints: 2, awardedTo: [1], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'frame_end', 1, P_BM, 'BM', 'BM won 3-Player Frame (58 - 42 - 36)', [42, 58, 36], { timestampOffsetMs: t }));

  return events;
}

export const ACTUAL_MATCHES: Match[] = [
  {
    id: M1_ID,
    player_ids: [P_ELDHO, P_THOMA],
    player1_id: P_ELDHO,
    player2_id: P_THOMA,
    best_of: 3,
    status: 'completed',
    winner_id: P_ELDHO,
    player_frames: [2, 1],
    player1_frames: 2,
    player2_frames: 1,
    reds_count: 15,
    started_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 3 * 86400000 + 45 * 60000).toISOString(),
  },
  {
    id: M2_ID,
    player_ids: [P_RAJU, P_ADI],
    player1_id: P_RAJU,
    player2_id: P_ADI,
    best_of: 3,
    status: 'completed',
    winner_id: P_RAJU,
    player_frames: [2, 0],
    player1_frames: 2,
    player2_frames: 0,
    reds_count: 15,
    started_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 86400000 + 35 * 60000).toISOString(),
  },
  {
    id: M3_ID,
    player_ids: [P_ELDHO, P_BM, P_SAM],
    player1_id: P_ELDHO,
    player2_id: P_BM,
    best_of: 1,
    status: 'completed',
    winner_id: P_BM,
    player_frames: [0, 1, 0],
    player1_frames: 0,
    player2_frames: 1,
    reds_count: 10,
    started_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 11 * 3600000).toISOString(),
  },
];

export const ACTUAL_FRAMES: Frame[] = [
  {
    id: F1_ID,
    match_id: M1_ID,
    frame_number: 1,
    scores: [68, 42],
    player1_score: 68,
    player2_score: 42,
    winner_id: P_ELDHO,
    highest_break: 40,
    highest_break_player_id: P_ELDHO,
    completed_at: new Date(Date.now() - 3 * 86400000 + 15 * 60000).toISOString(),
    events: createFrame1Events(),
  },
  {
    id: F2_ID,
    match_id: M1_ID,
    frame_number: 2,
    scores: [35, 71],
    player1_score: 35,
    player2_score: 71,
    winner_id: P_THOMA,
    highest_break: 54,
    highest_break_player_id: P_THOMA,
    completed_at: new Date(Date.now() - 3 * 86400000 + 30 * 60000).toISOString(),
    events: createFrame2Events(),
  },
  {
    id: F3_ID,
    match_id: M1_ID,
    frame_number: 3,
    scores: [75, 29],
    player1_score: 75,
    player2_score: 29,
    winner_id: P_ELDHO,
    highest_break: 66,
    highest_break_player_id: P_ELDHO,
    completed_at: new Date(Date.now() - 3 * 86400000 + 45 * 60000).toISOString(),
    events: createFrame3Events(),
  },
  {
    id: F4_ID,
    match_id: M2_ID,
    frame_number: 1,
    scores: [54, 38],
    player1_score: 54,
    player2_score: 38,
    winner_id: P_RAJU,
    highest_break: 34,
    highest_break_player_id: P_RAJU,
    completed_at: new Date(Date.now() - 1 * 86400000 + 18 * 60000).toISOString(),
    events: createRajuAdiFrame1Events(),
  },
  {
    id: F5_ID,
    match_id: M2_ID,
    frame_number: 2,
    scores: [62, 45],
    player1_score: 62,
    player2_score: 45,
    winner_id: P_RAJU,
    highest_break: 38,
    highest_break_player_id: P_RAJU,
    completed_at: new Date(Date.now() - 1 * 86400000 + 35 * 60000).toISOString(),
    events: createRajuAdiFrame2Events(),
  },
  {
    id: F6_ID,
    match_id: M3_ID,
    frame_number: 1,
    scores: [42, 58, 36],
    player1_score: 42,
    player2_score: 58,
    winner_id: P_BM,
    highest_break: 41,
    highest_break_player_id: P_BM,
    completed_at: new Date(Date.now() - 11 * 3600000).toISOString(),
    events: createMultiplayerFrameEvents(),
  },
];

export function getSampleMatchesAndFrames(): { matches: Match[]; frames: Frame[] } {
  return {
    matches: ACTUAL_MATCHES,
    frames: ACTUAL_FRAMES,
  };
}
