import { Match, Frame, MatchEvent, BallType } from '@/types/snooker';

const P_ELDHO = 'p1000000-0000-0000-0000-000000000001'; // Eldho
const P_THOMA = 'p2000000-0000-0000-0000-000000000002'; // Thoma
const P_RAJU = 'p3000000-0000-0000-0000-000000000003';  // Raju
const P_ADI = 'p4000000-0000-0000-0000-000000000004';   // Adi
const P_BM = 'p5000000-0000-0000-0000-000000000005';    // BM
const P_SAM = 'p6000000-0000-0000-0000-000000000006';   // Sam

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
  const baseTime = Date.now() - 48 * 3600000;
  return {
    id: `evt-sample-${frameNumber}-${Math.random().toString(36).substring(2, 9)}`,
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
 * High break 47 by Eldho
 */
function createFrame1Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 25) => (t += sec * 1000);

  // Frame start
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

  // Eldho visit 3: 47 Break Run (Red, Black, Red, Black, Red, Pink, Red, Blue, Red, Black, Red, Yellow)
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
 * Creates events for Frame 2: Thoma 71 - 35 Eldho. High break 52 by Thoma!
 */
function createFrame2Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(2, 'frame_start', 1, P_THOMA, 'Thoma', 'Frame 2 started', [0, 0], { timestampOffsetMs: t }));

  // Eldho early points: Red (1), Blue (5), Red (1), Pink (6), Miss -> 13
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

  // Thoma big 52 break run!
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
  events.push(makeEvent(2, 'miss', 1, P_THOMA, 'Thoma', 'Thoma missed Blue • Break ends at 52', [13, 54], { timestampOffsetMs: t }));

  // Eldho fouls and additional points to reach 71-35
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
 * Creates events for Frame 3: Eldho 75 - 29 Thoma. High break 61 by Eldho! Decider!
 */
function createFrame3Events(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(3, 'frame_start', 0, P_ELDHO, 'Eldho', 'Frame 3 (Decider) started', [0, 0], { timestampOffsetMs: t }));

  // Thoma early 18 points
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

  // Eldho 61 Break run!
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

  // Thoma foul + 9 points
  advance();
  events.push(makeEvent(3, 'foul', 1, P_THOMA, 'Thoma', 'Thoma foul (+4 pts to Eldho)', [70, 17], { foulPoints: 4, awardedTo: [0], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Blue (+5 pts)', [70, 22], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 1, P_THOMA, 'Thoma', 'Thoma potted Black (+7 pts)', [70, 29], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts)', [75, 29], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(3, 'frame_end', 0, P_ELDHO, 'Eldho', 'Eldho won Frame 3 (75 - 29) and the match!', [75, 29], { timestampOffsetMs: t }));

  return events;
}

/**
 * Creates events for 3-Player Match: Eldho (42) vs BM (58) vs Sam (36)
 */
function createMultiplayerFrameEvents(): MatchEvent[] {
  const events: MatchEvent[] = [];
  let t = 0;
  const advance = (sec: number = 20) => (t += sec * 1000);

  events.push(makeEvent(1, 'frame_start', 0, P_ELDHO, 'Eldho', '3-Player Frame started', [0, 0, 0], { timestampOffsetMs: t }));

  // Eldho turn
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Red (+1 pt)', [1, 0, 0], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [8, 0, 0], { ball: 'black', points: 7, breakScore: 8, breakBalls: ['red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed • Turn to BM', [8, 0, 0], { timestampOffsetMs: t }));

  // BM turn: 32 break
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
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Pink (+6 pts)', [8, 23, 0], { ball: 'pink', points: 6, breakScore: 23, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Red (+1 pt)', [8, 24, 0], { ball: 'red', points: 1, breakScore: 24, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Black (+7 pts)', [8, 31, 0], { ball: 'black', points: 7, breakScore: 31, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Red (+1 pt)', [8, 32, 0], { ball: 'red', points: 1, breakScore: 32, breakBalls: ['red', 'black', 'red', 'black', 'red', 'pink', 'red', 'black', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 1, P_BM, 'BM', 'BM missed • Turn to Sam', [8, 32, 0], { timestampOffsetMs: t }));

  // Sam turn: 24 points
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Red (+1 pt)', [8, 32, 1], { ball: 'red', points: 1, breakScore: 1, breakBalls: ['red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Blue (+5 pts)', [8, 32, 6], { ball: 'blue', points: 5, breakScore: 6, breakBalls: ['red', 'blue'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Red (+1 pt)', [8, 32, 7], { ball: 'red', points: 1, breakScore: 7, breakBalls: ['red', 'blue', 'red'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Black (+7 pts)', [8, 32, 14], { ball: 'black', points: 7, breakScore: 14, breakBalls: ['red', 'blue', 'red', 'black'], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Yellow (+2 pts)', [8, 32, 16], { ball: 'yellow', points: 2, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Green (+3 pts)', [8, 32, 19], { ball: 'green', points: 3, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Brown (+4 pts)', [8, 32, 23], { ball: 'brown', points: 4, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 2, P_SAM, 'Sam', 'Sam missed Blue', [8, 32, 23], { timestampOffsetMs: t }));

  // Sam foul: in-off (+4 to Eldho and BM)
  advance();
  events.push(makeEvent(1, 'foul', 2, P_SAM, 'Sam', 'Sam fouled (+4 pts to all opponents)', [12, 36, 23], { foulPoints: 4, awardedTo: [0, 1], timestampOffsetMs: t }));

  // Eldho scores 30 more to reach 42
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Blue (+5 pts)', [17, 36, 23], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [23, 36, 23], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Black (+7 pts)', [30, 36, 23], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [36, 36, 23], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 0, P_ELDHO, 'Eldho', 'Eldho potted Pink (+6 pts)', [42, 36, 23], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 0, P_ELDHO, 'Eldho', 'Eldho missed', [42, 36, 23], { timestampOffsetMs: t }));

  // Sam scores to reach 36
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Black (+7 pts)', [42, 36, 30], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 2, P_SAM, 'Sam', 'Sam potted Pink (+6 pts)', [42, 36, 36], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'miss', 2, P_SAM, 'Sam', 'Sam missed', [42, 36, 36], { timestampOffsetMs: t }));

  // BM clears remaining to win 58 - 42 - 36
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Blue (+5 pts)', [42, 41, 36], { ball: 'blue', points: 5, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Pink (+6 pts)', [42, 47, 36], { ball: 'pink', points: 6, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'foul', 0, P_ELDHO, 'Eldho', 'Eldho foul (+4 to opponents)', [42, 51, 36], { foulPoints: 4, awardedTo: [1], timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'pot', 1, P_BM, 'BM', 'BM potted Black (+7 pts)', [42, 58, 36], { ball: 'black', points: 7, timestampOffsetMs: t }));
  advance();
  events.push(makeEvent(1, 'frame_end', 1, P_BM, 'BM', 'BM won 3-Player Frame (58 - 42 - 36)', [42, 58, 36], { timestampOffsetMs: t }));

  return events;
}

export function getSampleMatchesAndFrames(): { matches: Match[]; frames: Frame[] } {
  const f1Events = createFrame1Events();
  const f2Events = createFrame2Events();
  const f3Events = createFrame3Events();
  const fMultiEvents = createMultiplayerFrameEvents();

  const m1Id = 'm_sample_001_eldho_thoma';
  const m2Id = 'm_sample_002_raju_adi';
  const m3Id = 'm_sample_003_multiplayer';

  const matches: Match[] = [
    {
      id: m1Id,
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
      started_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      completed_at: new Date(Date.now() - 46 * 3600000).toISOString(),
    },
    {
      id: m2Id,
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
      started_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      completed_at: new Date(Date.now() - 23 * 3600000).toISOString(),
    },
    {
      id: m3Id,
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

  const frames: Frame[] = [
    {
      id: 'f_sample_001_1',
      match_id: m1Id,
      frame_number: 1,
      scores: [68, 42],
      player1_score: 68,
      player2_score: 42,
      winner_id: P_ELDHO,
      highest_break: 47,
      highest_break_player_id: P_ELDHO,
      completed_at: new Date(Date.now() - 47 * 3600000).toISOString(),
      events: f1Events,
    },
    {
      id: 'f_sample_001_2',
      match_id: m1Id,
      frame_number: 2,
      scores: [35, 71],
      player1_score: 35,
      player2_score: 71,
      winner_id: P_THOMA,
      highest_break: 52,
      highest_break_player_id: P_THOMA,
      completed_at: new Date(Date.now() - 46.5 * 3600000).toISOString(),
      events: f2Events,
    },
    {
      id: 'f_sample_001_3',
      match_id: m1Id,
      frame_number: 3,
      scores: [75, 29],
      player1_score: 75,
      player2_score: 29,
      winner_id: P_ELDHO,
      highest_break: 61,
      highest_break_player_id: P_ELDHO,
      completed_at: new Date(Date.now() - 46 * 3600000).toISOString(),
      events: f3Events,
    },
    {
      id: 'f_sample_002_1',
      match_id: m2Id,
      frame_number: 1,
      scores: [54, 38],
      player1_score: 54,
      player2_score: 38,
      winner_id: P_RAJU,
      highest_break: 34,
      highest_break_player_id: P_RAJU,
      completed_at: new Date(Date.now() - 23.5 * 3600000).toISOString(),
      events: [],
    },
    {
      id: 'f_sample_002_2',
      match_id: m2Id,
      frame_number: 2,
      scores: [62, 45],
      player1_score: 62,
      player2_score: 45,
      winner_id: P_RAJU,
      highest_break: 38,
      highest_break_player_id: P_RAJU,
      completed_at: new Date(Date.now() - 23 * 3600000).toISOString(),
      events: [],
    },
    {
      id: 'f_sample_003_1',
      match_id: m3Id,
      frame_number: 1,
      scores: [42, 58, 36],
      player1_score: 42,
      player2_score: 58,
      winner_id: P_BM,
      highest_break: 32,
      highest_break_player_id: P_BM,
      completed_at: new Date(Date.now() - 11 * 3600000).toISOString(),
      events: fMultiEvents,
    },
  ];

  return { matches, frames };
}
