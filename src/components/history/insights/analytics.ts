import { MatchEvent, BallType, Player, Frame, BALL_CONFIGS } from '@/types/snooker';
import { extractFrameTelemetry } from '@/lib/break-utils';

export interface ScoreTimelinePoint {
  index: number;
  eventId: string;
  timestamp: number;
  eventType: string;
  detail: string;
  scores: number[];
  actorPlayerIndex: number;
  actorPlayerName: string;
  pointsDelta?: number;
  breakScore?: number;
  ball?: BallType;
  foulPoints?: number;
}

export interface PlayerBallCount {
  ball: BallType;
  count: number;
  points: number;
}

export interface PlayerScoringSource {
  playerIndex: number;
  playerId?: string;
  playerName: string;
  totalPoints: number;
  pointsFromPots: number;
  pointsFromFouls: number;
  potPercentage: number;
  foulPercentage: number;
  totalBallsPotted: number;
  ballCounts: Record<BallType, number>;
}

export interface BreakRun {
  id: string;
  playerIndex: number;
  playerName: string;
  totalPoints: number;
  balls: BallType[];
  startTime: number;
  endTime?: number;
  eventIndexStart: number;
  eventIndexEnd: number;
  frameNumber?: number;
}

export interface PlayerDiscipline {
  playerIndex: number;
  playerName: string;
  foulsCommitted: number;
  penaltyPointsConceded: number;
  foulsByValue: Record<number, number>; // 4, 5, 6, 7
  freeBallsConceded: number;
}

export interface PlayerVisitStats {
  playerIndex: number;
  playerName: string;
  totalVisits: number;
  scoringVisits: number;
  averagePointsPerVisit: number;
  averageBreak: number;
  highestBreak: number;
}

export interface FrameInsightsData {
  timeline: ScoreTimelinePoint[];
  scoringSources: PlayerScoringSource[];
  breaks: BreakRun[];
  topBreak: {
    points: number;
    playerIndex: number | null;
    playerId: string | null;
    playerName: string;
  };
  discipline: PlayerDiscipline[];
  visitStats: PlayerVisitStats[];
  totalEvents: number;
  leadChanges: number;
  durationSeconds: number;
}

export interface MatchFrameSummary {
  frameId: string;
  frameNumber: number;
  scores: number[];
  winnerId?: string | null;
  highestBreak: number;
  highestBreakPlayerName: string;
  durationSeconds: number;
  totalEvents: number;
  hasEvents: boolean;
  leadChanges: number;
}

export interface MatchInsightsData {
  scoringSources: PlayerScoringSource[];
  breaks: BreakRun[];
  topBreak: {
    points: number;
    playerName: string;
    frameNumber?: number;
  };
  discipline: PlayerDiscipline[];
  visitStats: PlayerVisitStats[];
  frameSummaries: MatchFrameSummary[];
  totalEvents: number;
  totalLeadChanges: number;
  totalDurationSeconds: number;
  framesWithTelemetry: number;
}

export const APPLE_PLAYER_COLORS = [
  '#0091ff', // System Blue
  '#30d158', // System Green
  '#ff9230', // System Orange
  '#db34f2', // System Purple
  '#ff375f', // System Pink
  '#00d2e0', // System Teal
];

export function getApplePlayerColor(index: number): string {
  return APPLE_PLAYER_COLORS[index % APPLE_PLAYER_COLORS.length];
}

const PLAYER_COLORS = [
  '#10b981', // Emerald
  '#38bdf8', // Sky Blue
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#fb923c', // Orange
];

export function getPlayerColor(playerIndex: number): string {
  return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
}

/**
 * Parses a frame's events into comprehensive structured analytics
 */
export function computeFrameInsights(
  events: MatchEvent[] = [],
  players: Player[] = [],
  finalScores?: number[],
  frameMeta?: Pick<Frame, 'highest_break' | 'highest_break_player_id'> | null
): FrameInsightsData {
  const playerCount = Math.max(2, players.length);
  const playerNames = players.map((p, idx) => p.name || `Player ${idx + 1}`);
  const telemetry = extractFrameTelemetry(events, players, frameMeta);

  // Initialize per-player tracking structures
  const ballCountsByPlayer: Record<BallType, number>[] = Array.from({ length: playerCount }, () => ({
    red: 0,
    yellow: 0,
    green: 0,
    brown: 0,
    blue: 0,
    pink: 0,
    black: 0,
  }));

  const pointsFromPots: number[] = new Array(playerCount).fill(0);
  const pointsFromFouls: number[] = new Array(playerCount).fill(0);
  const foulsCommitted: number[] = new Array(playerCount).fill(0);
  const penaltyPointsConceded: number[] = new Array(playerCount).fill(0);
  const foulsByValue: Record<number, number>[] = Array.from({ length: playerCount }, () => ({
    4: 0,
    5: 0,
    6: 0,
    7: 0,
  }));
  const freeBallsConceded: number[] = new Array(playerCount).fill(0);

  const timeline: ScoreTimelinePoint[] = [];
  let prevLeader = -1;
  let leadChanges = 0;

  // Initial zero-state timeline point
  timeline.push({
    index: 0,
    eventId: 'init',
    timestamp: events[0]?.timestamp || Date.now(),
    eventType: 'start',
    detail: 'Frame started',
    scores: new Array(playerCount).fill(0),
    actorPlayerIndex: 0,
    actorPlayerName: playerNames[0] || 'Player 1',
  });

  // Process all events sequentially for scoring sources, timeline, and discipline
  for (let idx = 0; idx < events.length; idx++) {
    const evt = events[idx];
    const actorIdx = evt.playerIndex >= 0 && evt.playerIndex < playerCount ? evt.playerIndex : 0;
    const actorName = playerNames[actorIdx] || evt.playerName || `Player ${actorIdx + 1}`;
    const derivedBreak = evt.breakScore ?? (telemetry.runningBreakByEventIndex[idx] || undefined);

    // Timeline entry
    const scores = evt.scoresAfter && evt.scoresAfter.length === playerCount
      ? [...evt.scoresAfter]
      : (timeline[timeline.length - 1]?.scores ? [...timeline[timeline.length - 1].scores] : new Array(playerCount).fill(0));

    timeline.push({
      index: idx + 1,
      eventId: evt.id,
      timestamp: evt.timestamp,
      eventType: evt.type,
      detail: evt.detail,
      scores,
      actorPlayerIndex: actorIdx,
      actorPlayerName: actorName,
      pointsDelta: evt.points || evt.foulPoints,
      breakScore: derivedBreak,
      ball: evt.ball,
      foulPoints: evt.foulPoints,
    });

    // Check for lead changes
    const maxScore = Math.max(...scores);
    const leaders = scores.map((s, i) => (s === maxScore && s > 0 ? i : -1)).filter(i => i !== -1);
    if (leaders.length === 1 && leaders[0] !== prevLeader && prevLeader !== -1) {
      leadChanges += 1;
    }
    if (leaders.length === 1) {
      prevLeader = leaders[0];
    }

    // Process scoring & discipline specifics
    if (evt.type === 'pot' && evt.ball) {
      ballCountsByPlayer[actorIdx][evt.ball] += 1;
      const pts = evt.points ?? BALL_CONFIGS[evt.ball]?.points ?? 1;
      pointsFromPots[actorIdx] += pts;
    } else if (evt.type === 'foul') {
      foulsCommitted[actorIdx] += 1;
      const fPts = evt.foulPoints || 4;
      penaltyPointsConceded[actorIdx] += fPts;
      foulsByValue[actorIdx][fPts] = (foulsByValue[actorIdx][fPts] || 0) + 1;
      if (evt.freeBallAwarded) {
        freeBallsConceded[actorIdx] += 1;
      }

      // Attribute points to recipients
      if (evt.awardedTo && evt.awardedTo.length > 0) {
        evt.awardedTo.forEach(rIdx => {
          if (rIdx >= 0 && rIdx < playerCount) {
            pointsFromFouls[rIdx] += fPts;
          }
        });
      } else {
        // Fallback: award to all opponents
        for (let i = 0; i < playerCount; i++) {
          if (i !== actorIdx) {
            pointsFromFouls[i] += fPts;
          }
        }
      }
    }
  }

  const breaks: BreakRun[] = telemetry.notableBreaks.map((run) => ({
    id: run.id,
    playerIndex: run.playerIndex,
    playerName: run.playerName,
    totalPoints: run.totalPoints,
    balls: run.balls,
    startTime: run.startTime,
    endTime: run.endTime,
    eventIndexStart: run.eventIndexStart,
    eventIndexEnd: run.eventIndexEnd,
  }));

  // Construct Scoring Sources breakdown
  const scoringSources: PlayerScoringSource[] = players.map((p, idx) => {
    const potsPts = pointsFromPots[idx] || 0;
    const foulsPts = pointsFromFouls[idx] || 0;
    const tot = (finalScores && finalScores[idx] !== undefined)
      ? finalScores[idx]
      : (potsPts + foulsPts);
    const potPct = tot > 0 ? Math.round((potsPts / tot) * 100) : 0;
    const foulPct = tot > 0 ? Math.round((foulsPts / tot) * 100) : 0;
    const totalBalls = Object.values(ballCountsByPlayer[idx] || {}).reduce((a, b) => a + b, 0);

    return {
      playerIndex: idx,
      playerId: p.id,
      playerName: p.name || `Player ${idx + 1}`,
      totalPoints: tot,
      pointsFromPots: potsPts,
      pointsFromFouls: foulsPts,
      potPercentage: potPct,
      foulPercentage: foulPct,
      totalBallsPotted: totalBalls,
      ballCounts: ballCountsByPlayer[idx] || {
        red: 0,
        yellow: 0,
        green: 0,
        brown: 0,
        blue: 0,
        pink: 0,
        black: 0,
      },
    };
  });

  // Construct Discipline breakdown
  const discipline: PlayerDiscipline[] = players.map((p, idx) => ({
    playerIndex: idx,
    playerName: p.name || `Player ${idx + 1}`,
    foulsCommitted: foulsCommitted[idx] || 0,
    penaltyPointsConceded: penaltyPointsConceded[idx] || 0,
    foulsByValue: foulsByValue[idx] || { 4: 0, 5: 0, 6: 0, 7: 0 },
    freeBallsConceded: freeBallsConceded[idx] || 0,
  }));

  // Construct Visit & Efficiency Stats
  const visitStats: PlayerVisitStats[] = players.map((p, idx) => {
    const recordedVisits = telemetry.totalVisits[idx] || 0;
    const playerBreaks = breaks.filter(b => b.playerIndex === idx);
    const highBreak = telemetry.playerHighestBreaks[idx] || 0;
    const avgBreak = playerBreaks.length > 0
      ? Math.round(playerBreaks.reduce((acc, b) => acc + b.totalPoints, 0) / playerBreaks.length)
      : 0;

    return {
      playerIndex: idx,
      playerName: p.name || `Player ${idx + 1}`,
      totalVisits: recordedVisits,
      scoringVisits: telemetry.scoringVisits[idx] || 0,
      averagePointsPerVisit: recordedVisits > 0
        ? Math.round(((pointsFromPots[idx] || 0) / recordedVisits) * 10) / 10
        : 0,
      averageBreak: avgBreak,
      highestBreak: highBreak,
    };
  });

  // Duration
  let durationSeconds = 0;
  if (events.length >= 2) {
    const start = events[0].timestamp;
    const end = events[events.length - 1].timestamp;
    durationSeconds = Math.max(0, Math.round((end - start) / 1000));
  }

  return {
    timeline,
    scoringSources,
    breaks,
    topBreak: telemetry.topBreak,
    discipline,
    visitStats,
    totalEvents: events.length,
    leadChanges,
    durationSeconds,
  };
}

/**
 * Aggregates frame-by-frame telemetry into match-wide analytics
 */
export function computeMatchInsights(
  frames: Frame[] = [],
  players: Player[] = []
): MatchInsightsData {
  const playerCount = Math.max(2, players.length);
  const ballKeys: BallType[] = ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];

  const totalPointsByPlayer = new Array(playerCount).fill(0);
  const potsPointsByPlayer = new Array(playerCount).fill(0);
  const foulsPointsByPlayer = new Array(playerCount).fill(0);
  const ballCountsByPlayer: Record<BallType, number>[] = Array.from({ length: playerCount }, () => ({
    red: 0,
    yellow: 0,
    green: 0,
    brown: 0,
    blue: 0,
    pink: 0,
    black: 0,
  }));

  const foulsCommittedByPlayer = new Array(playerCount).fill(0);
  const penaltyPointsByPlayer = new Array(playerCount).fill(0);
  const freeBallsByPlayer = new Array(playerCount).fill(0);
  const foulsByValueByPlayer: Record<number, number>[] = Array.from({ length: playerCount }, () => ({
    4: 0,
    5: 0,
    6: 0,
    7: 0,
  }));

  const totalVisitsByPlayer = new Array(playerCount).fill(0);
  const scoringVisitsByPlayer = new Array(playerCount).fill(0);
  const highestBreakByPlayer = new Array(playerCount).fill(0);

  const allBreaks: BreakRun[] = [];
  const frameSummaries: MatchFrameSummary[] = [];

  let totalEvents = 0;
  let totalLeadChanges = 0;
  let totalDurationSeconds = 0;
  let framesWithTelemetry = 0;
  let matchTopBreak = { points: 0, playerName: '', frameNumber: undefined as number | undefined };

  for (const frame of frames) {
    const scores = frame.scores && frame.scores.length === players.length
      ? frame.scores
      : [frame.player1_score, frame.player2_score];
    const events = frame.events || [];
    const hasEvents = events.length > 0;
    const highBreakPlayer = players.find(p => p.id === frame.highest_break_player_id);

    if (hasEvents) {
      framesWithTelemetry += 1;
      const frameInsights = computeFrameInsights(events, players, scores, frame);
      totalEvents += frameInsights.totalEvents;
      totalLeadChanges += frameInsights.leadChanges;
      totalDurationSeconds += frameInsights.durationSeconds;

      frameInsights.scoringSources.forEach((src, idx) => {
        if (idx >= playerCount) return;
        totalPointsByPlayer[idx] += src.totalPoints;
        potsPointsByPlayer[idx] += src.pointsFromPots;
        foulsPointsByPlayer[idx] += src.pointsFromFouls;
        ballKeys.forEach((b) => {
          ballCountsByPlayer[idx][b] += src.ballCounts[b] || 0;
        });
      });

      frameInsights.discipline.forEach((disc, idx) => {
        if (idx >= playerCount) return;
        foulsCommittedByPlayer[idx] += disc.foulsCommitted;
        penaltyPointsByPlayer[idx] += disc.penaltyPointsConceded;
        freeBallsByPlayer[idx] += disc.freeBallsConceded;
        [4, 5, 6, 7].forEach((val) => {
          foulsByValueByPlayer[idx][val] += disc.foulsByValue[val] || 0;
        });
      });

      frameInsights.visitStats.forEach((vs, idx) => {
        if (idx >= playerCount) return;
        totalVisitsByPlayer[idx] += vs.totalVisits;
        scoringVisitsByPlayer[idx] += vs.scoringVisits;
        if (vs.highestBreak > highestBreakByPlayer[idx]) {
          highestBreakByPlayer[idx] = vs.highestBreak;
        }
      });

      frameInsights.breaks.forEach((b) => {
        allBreaks.push({
          ...b,
          id: `f${frame.frame_number}-${b.id}`,
          frameNumber: frame.frame_number,
        });
      });

      const frameTop = frameInsights.topBreak;
      if (frameTop.points > matchTopBreak.points) {
        matchTopBreak = {
          points: frameTop.points,
          playerName: frameTop.playerName || highBreakPlayer?.name || '',
          frameNumber: frame.frame_number,
        };
      }

      frameSummaries.push({
        frameId: frame.id,
        frameNumber: frame.frame_number,
        scores,
        winnerId: frame.winner_id,
        highestBreak: frameTop.points,
        highestBreakPlayerName: frameTop.playerName || highBreakPlayer?.name || '',
        durationSeconds: frameInsights.durationSeconds,
        totalEvents: frameInsights.totalEvents,
        hasEvents: true,
        leadChanges: frameInsights.leadChanges,
      });
    } else {
      scores.forEach((s, idx) => {
        if (idx < playerCount) {
          totalPointsByPlayer[idx] += s || 0;
        }
      });

      if (frame.highest_break > 0 && frame.highest_break_player_id) {
        const hpIdx = players.findIndex(p => p.id === frame.highest_break_player_id);
        if (hpIdx !== -1 && frame.highest_break > highestBreakByPlayer[hpIdx]) {
          highestBreakByPlayer[hpIdx] = frame.highest_break;
        }
      }
      if (frame.highest_break > matchTopBreak.points) {
        matchTopBreak = {
          points: frame.highest_break,
          playerName: highBreakPlayer?.name || '',
          frameNumber: frame.frame_number,
        };
      }

      frameSummaries.push({
        frameId: frame.id,
        frameNumber: frame.frame_number,
        scores,
        winnerId: frame.winner_id,
        highestBreak: frame.highest_break,
        highestBreakPlayerName: highBreakPlayer?.name || '',
        durationSeconds: 0,
        totalEvents: 0,
        hasEvents: false,
        leadChanges: 0,
      });
    }
  }

  const scoringSources: PlayerScoringSource[] = players.map((p, idx) => {
    const tot = totalPointsByPlayer[idx] || 0;
    const potsPts = potsPointsByPlayer[idx] || 0;
    const foulsPts = foulsPointsByPlayer[idx] || 0;
    const totalBalls = Object.values(ballCountsByPlayer[idx] || {}).reduce((a, b) => a + b, 0);

    return {
      playerIndex: idx,
      playerId: p.id,
      playerName: p.name || `Player ${idx + 1}`,
      totalPoints: tot,
      pointsFromPots: potsPts,
      pointsFromFouls: foulsPts,
      potPercentage: tot > 0 ? Math.round((potsPts / tot) * 100) : 0,
      foulPercentage: tot > 0 ? Math.round((foulsPts / tot) * 100) : 0,
      totalBallsPotted: totalBalls,
      ballCounts: ballCountsByPlayer[idx],
    };
  });

  const discipline: PlayerDiscipline[] = players.map((p, idx) => ({
    playerIndex: idx,
    playerName: p.name || `Player ${idx + 1}`,
    foulsCommitted: foulsCommittedByPlayer[idx] || 0,
    penaltyPointsConceded: penaltyPointsByPlayer[idx] || 0,
    foulsByValue: foulsByValueByPlayer[idx],
    freeBallsConceded: freeBallsByPlayer[idx] || 0,
  }));

  const sortedBreaks = allBreaks.sort((a, b) => b.totalPoints - a.totalPoints);

  const visitStats: PlayerVisitStats[] = players.map((p, idx) => {
    const visits = Math.max(1, totalVisitsByPlayer[idx] || 0);
    const hasRecordedVisits = totalVisitsByPlayer[idx] > 0;
    const playerBreaks = sortedBreaks.filter(b => b.playerIndex === idx);
    const frameHighBreaks = frames
      .filter(f => f.highest_break_player_id === p.id)
      .map(f => f.highest_break);
    const highBreak = Math.max(
      highestBreakByPlayer[idx] || 0,
      playerBreaks.length > 0 ? Math.max(...playerBreaks.map(b => b.totalPoints)) : 0,
      frameHighBreaks.length > 0 ? Math.max(...frameHighBreaks) : 0
    );
    const avgBreak = playerBreaks.length > 0
      ? Math.round(playerBreaks.reduce((acc, b) => acc + b.totalPoints, 0) / playerBreaks.length)
      : 0;

    return {
      playerIndex: idx,
      playerName: p.name || `Player ${idx + 1}`,
      totalVisits: totalVisitsByPlayer[idx] || 0,
      scoringVisits: scoringVisitsByPlayer[idx] || 0,
      averagePointsPerVisit: hasRecordedVisits
        ? Math.round(((potsPointsByPlayer[idx] || 0) / visits) * 10) / 10
        : 0,
      averageBreak: avgBreak,
      highestBreak: highBreak,
    };
  });

  return {
    scoringSources,
    breaks: sortedBreaks,
    topBreak: matchTopBreak,
    discipline,
    visitStats,
    frameSummaries,
    totalEvents,
    totalLeadChanges,
    totalDurationSeconds,
    framesWithTelemetry,
  };
}
