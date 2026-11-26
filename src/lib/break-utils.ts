import { BALL_CONFIGS, BallType, Frame, MatchEvent, Player } from '@/types/snooker';

export const NOTABLE_BREAK_MIN_POINTS = 10;
export const NOTABLE_BREAK_MIN_BALLS = 2;
export const DB_BREAK_MIN_POINTS = 20;

export interface ExtractedBreakRun {
  id: string;
  playerIndex: number;
  playerId?: string;
  playerName: string;
  totalPoints: number;
  balls: BallType[];
  startTime: number;
  endTime?: number;
  eventIndexStart: number;
  eventIndexEnd: number;
  isNotable: boolean;
}

export interface FrameTelemetrySummary {
  allRuns: ExtractedBreakRun[];
  notableBreaks: ExtractedBreakRun[];
  playerHighestBreaks: number[];
  playerHighBreaksById: Record<string, number>;
  totalVisits: number[];
  scoringVisits: number[];
  topBreak: {
    points: number;
    playerIndex: number | null;
    playerId: string | null;
    playerName: string;
  };
  notableBreakEventIndices: Set<number>;
  runningBreakByEventIndex: number[];
}

export function isNotableBreak(points: number, ballCount: number): boolean {
  return points >= NOTABLE_BREAK_MIN_POINTS || ballCount >= NOTABLE_BREAK_MIN_BALLS;
}

/**
 * Single source of truth for parsing continuous break runs, per-player high breaks,
 * and visit counts from a frame's shot-by-shot event telemetry (with optional fallback
 * to persisted frame metadata for legacy frames lacking events).
 */
export function extractFrameTelemetry(
  events: MatchEvent[] = [],
  players: Player[] = [],
  frame?: Pick<Frame, 'highest_break' | 'highest_break_player_id'> | null
): FrameTelemetrySummary {
  const maxEventPlayerIdx = events.reduce((max, evt) => {
    return typeof evt.playerIndex === 'number' && evt.playerIndex > max ? evt.playerIndex : max;
  }, -1);
  const playerCount = Math.max(2, players.length, maxEventPlayerIdx + 1);

  const allRuns: ExtractedBreakRun[] = [];
  const totalVisits = new Array<number>(playerCount).fill(0);
  const scoringVisits = new Array<number>(playerCount).fill(0);
  const runningBreakByEventIndex = new Array<number>(events.length).fill(0);
  const notableBreakEventIndices = new Set<number>();

  interface ActiveRun {
    playerIndex: number;
    playerId?: string;
    playerName: string;
    points: number;
    balls: BallType[];
    startTime: number;
    startIdx: number;
  }

  let currentRun: ActiveRun | null = null;

  const flushRun = (inclusiveEndIdx: number, endTime?: number) => {
    if (!currentRun) return;
    const notable = isNotableBreak(currentRun.points, currentRun.balls.length);
    const run: ExtractedBreakRun = {
      id: `break-${allRuns.length}-${currentRun.startTime}`,
      playerIndex: currentRun.playerIndex,
      playerId: currentRun.playerId,
      playerName: currentRun.playerName,
      totalPoints: currentRun.points,
      balls: [...currentRun.balls],
      startTime: currentRun.startTime,
      endTime,
      eventIndexStart: currentRun.startIdx,
      eventIndexEnd: Math.max(currentRun.startIdx, inclusiveEndIdx),
      isNotable: notable,
    };
    allRuns.push(run);

    if (notable) {
      for (let i = run.eventIndexStart; i <= run.eventIndexEnd; i++) {
        notableBreakEventIndices.add(i);
      }
    }

    totalVisits[currentRun.playerIndex] += 1;
    scoringVisits[currentRun.playerIndex] += 1;
    currentRun = null;
  };

  for (let idx = 0; idx < events.length; idx++) {
    const evt = events[idx];
    const actorIdx = evt.playerIndex >= 0 && evt.playerIndex < playerCount ? evt.playerIndex : 0;
    const actorPlayer = players[actorIdx];
    const actorId = actorPlayer?.id || evt.playerId;
    const actorName = actorPlayer?.name || evt.playerName || `Player ${actorIdx + 1}`;

    if (evt.type === 'pot') {
      const pts = evt.points ?? (evt.ball ? BALL_CONFIGS[evt.ball]?.points : undefined) ?? 0;

      // If another player potted without an intervening miss/foul/switch event, close previous run first.
      if (currentRun && currentRun.playerIndex !== actorIdx) {
        flushRun(idx - 1, events[idx - 1]?.timestamp);
      }

      if (!currentRun) {
        currentRun = {
          playerIndex: actorIdx,
          playerId: actorId,
          playerName: actorName,
          points: pts,
          balls: evt.ball ? [evt.ball] : [],
          startTime: evt.timestamp,
          startIdx: idx,
        };
      } else {
        currentRun.points += pts;
        if (evt.ball) {
          currentRun.balls.push(evt.ball);
        }
        if (!currentRun.playerId && actorId) {
          currentRun.playerId = actorId;
        }
      }

      runningBreakByEventIndex[idx] = currentRun.points;
    } else if (evt.type === 'miss' || evt.type === 'foul') {
      if (currentRun && currentRun.playerIndex === actorIdx) {
        runningBreakByEventIndex[idx] = currentRun.points;
        flushRun(idx, evt.timestamp);
      } else {
        if (currentRun) {
          flushRun(idx - 1, events[idx - 1]?.timestamp);
        }
        totalVisits[actorIdx] += 1;
      }
    } else if (evt.type === 'switch') {
      // `switch` events record `playerIndex` of the INCOMING player.
      // Only close out a visit if the outgoing player had an active scoring run;
      // idle card taps do not count as completed visits.
      if (currentRun) {
        runningBreakByEventIndex[idx] = currentRun.points;
        flushRun(idx, evt.timestamp);
      }
    } else if (evt.type === 'concede' || evt.type === 'frame_end') {
      if (currentRun) {
        runningBreakByEventIndex[idx] = currentRun.points;
        flushRun(idx, evt.timestamp);
      }
    }
  }

  // Flush any scoring run active when the frame ended on a winning pot.
  if (currentRun) {
    flushRun(events.length - 1, events[events.length - 1]?.timestamp);
  }

  const playerHighestBreaks = new Array<number>(playerCount).fill(0);
  const playerHighBreaksById: Record<string, number> = {};

  for (const run of allRuns) {
    if (run.totalPoints > playerHighestBreaks[run.playerIndex]) {
      playerHighestBreaks[run.playerIndex] = run.totalPoints;
    }
    if (run.playerId) {
      playerHighBreaksById[run.playerId] = Math.max(
        playerHighBreaksById[run.playerId] ?? 0,
        run.totalPoints
      );
    }
  }

  let bestRun: ExtractedBreakRun | null = null;
  for (const run of allRuns) {
    if (!bestRun || run.totalPoints > bestRun.totalPoints) {
      bestRun = run;
    }
  }

  const storedHighBreak = frame?.highest_break ?? 0;
  const storedPlayerId = frame?.highest_break_player_id ?? null;

  if (storedHighBreak > 0 && storedPlayerId) {
    const matchedIdx = players.findIndex((p) => p.id === storedPlayerId);
    if (matchedIdx !== -1 && (allRuns.length === 0 || storedHighBreak > playerHighestBreaks[matchedIdx])) {
      playerHighestBreaks[matchedIdx] = Math.max(playerHighestBreaks[matchedIdx], storedHighBreak);
    }
    if (allRuns.length === 0 || storedHighBreak > (playerHighBreaksById[storedPlayerId] ?? 0)) {
      playerHighBreaksById[storedPlayerId] = Math.max(
        playerHighBreaksById[storedPlayerId] ?? 0,
        storedHighBreak
      );
    }
  }

  let topBreak: FrameTelemetrySummary['topBreak'];
  if (bestRun && bestRun.totalPoints >= storedHighBreak) {
    topBreak = {
      points: bestRun.totalPoints,
      playerIndex: bestRun.playerIndex,
      playerId: bestRun.playerId ?? null,
      playerName: bestRun.playerName,
    };
  } else if (storedHighBreak > 0) {
    const matchedIdx = storedPlayerId ? players.findIndex((p) => p.id === storedPlayerId) : -1;
    topBreak = {
      points: storedHighBreak,
      playerIndex: matchedIdx !== -1 ? matchedIdx : null,
      playerId: storedPlayerId,
      playerName: matchedIdx !== -1 ? players[matchedIdx].name : '',
    };
  } else {
    topBreak = {
      points: 0,
      playerIndex: null,
      playerId: null,
      playerName: '',
    };
  }

  const notableBreaks = allRuns
    .filter((r) => r.isNotable)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return {
    allRuns,
    notableBreaks,
    playerHighestBreaks,
    playerHighBreaksById,
    totalVisits,
    scoringVisits,
    topBreak,
    notableBreakEventIndices,
    runningBreakByEventIndex,
  };
}

/**
 * Extracts per-player highest breaks recorded inside a frame (keyed by player ID).
 */
export function getFramePlayerHighBreaks(
  frame: Pick<Frame, 'events' | 'highest_break' | 'highest_break_player_id'>,
  playerIds: string[] = [],
  players: Player[] = []
): Record<string, number> {
  const resolvedPlayers: Player[] =
    players.length > 0
      ? players
      : playerIds.map((id, idx) => ({ id, name: `Player ${idx + 1}` }));

  return extractFrameTelemetry(frame.events || [], resolvedPlayers, frame).playerHighBreaksById;
}

/**
 * Returns the true top break in a frame across persisted frame metadata and event runs.
 */
export function getFrameTopBreak(
  frame: Pick<Frame, 'events' | 'highest_break' | 'highest_break_player_id'>,
  players: Player[] = []
): FrameTelemetrySummary['topBreak'] {
  return extractFrameTelemetry(frame.events || [], players, frame).topBreak;
}

/**
 * Extracts all 20+ point breaks from a completed frame to persist into the `breaks` table.
 */
export function extractDBBreaksForFrame(
  events: MatchEvent[] = [],
  fallbackHighBreak: number = 0,
  fallbackHighBreakPlayerId: string | null = null
): Array<{ playerId: string; points: number }> {
  const summary = extractFrameTelemetry(events);
  const rows = summary.allRuns
    .filter((run) => run.totalPoints >= DB_BREAK_MIN_POINTS && Boolean(run.playerId))
    .map((run) => ({
      playerId: run.playerId as string,
      points: run.totalPoints,
    }));

  if (rows.length > 0) {
    return rows;
  }

  if (fallbackHighBreak >= DB_BREAK_MIN_POINTS && fallbackHighBreakPlayerId) {
    return [{ playerId: fallbackHighBreakPlayerId, points: fallbackHighBreak }];
  }

  return [];
}
