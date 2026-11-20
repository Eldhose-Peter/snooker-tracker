import { MatchEvent, BallType, Player, BALL_CONFIGS } from '@/types/snooker';

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
  discipline: PlayerDiscipline[];
  visitStats: PlayerVisitStats[];
  totalEvents: number;
  leadChanges: number;
  durationSeconds: number;
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
  finalScores?: number[]
): FrameInsightsData {
  const playerCount = Math.max(2, players.length);
  const playerNames = players.map((p, idx) => p.name || `Player ${idx + 1}`);

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

  const breaks: BreakRun[] = [];
  interface ActiveRun {
    playerIndex: number;
    points: number;
    balls: BallType[];
    startTime: number;
    startIdx: number;
  }
  let currentRun: ActiveRun | null = null;

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

  const totalVisits: number[] = new Array(playerCount).fill(0);
  const scoringVisits: number[] = new Array(playerCount).fill(0);
  let hasScoredInCurrentTurn = false;

  // Process all events sequentially
  for (let idx = 0; idx < events.length; idx++) {
    const evt = events[idx];
    const actorIdx = evt.playerIndex >= 0 && evt.playerIndex < playerCount ? evt.playerIndex : 0;
    const actorName = playerNames[actorIdx] || evt.playerName || `Player ${actorIdx + 1}`;

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
      breakScore: evt.breakScore,
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

    // Process event specifics
    if (evt.type === 'pot' && evt.ball) {
      ballCountsByPlayer[actorIdx][evt.ball] += 1;
      const pts = evt.points ?? BALL_CONFIGS[evt.ball]?.points ?? 1;
      pointsFromPots[actorIdx] += pts;
      hasScoredInCurrentTurn = true;

      // Track break run
      if (!currentRun || currentRun.playerIndex !== actorIdx) {
        currentRun = {
          playerIndex: actorIdx,
          points: pts,
          balls: [evt.ball],
          startTime: evt.timestamp,
          startIdx: idx,
        };
      } else {
        currentRun.points += pts;
        currentRun.balls.push(evt.ball);
      }
    } else if (evt.type === 'miss') {
      totalVisits[actorIdx] += 1;
      if (hasScoredInCurrentTurn) {
        scoringVisits[actorIdx] += 1;
      }
      hasScoredInCurrentTurn = false;

      // Close out break run
      if (currentRun && currentRun.playerIndex === actorIdx) {
        if (currentRun.points >= 10 || currentRun.balls.length >= 2) {
          breaks.push({
            id: `break-${breaks.length}-${currentRun.startTime}`,
            playerIndex: currentRun.playerIndex,
            playerName: playerNames[currentRun.playerIndex] || `Player ${currentRun.playerIndex + 1}`,
            totalPoints: currentRun.points,
            balls: [...currentRun.balls],
            startTime: currentRun.startTime,
            endTime: evt.timestamp,
            eventIndexStart: currentRun.startIdx,
            eventIndexEnd: idx,
          });
        }
        currentRun = null;
      }
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

      totalVisits[actorIdx] += 1;
      if (hasScoredInCurrentTurn) {
        scoringVisits[actorIdx] += 1;
      }
      hasScoredInCurrentTurn = false;

      if (currentRun && currentRun.playerIndex === actorIdx) {
        if (currentRun.points >= 10 || currentRun.balls.length >= 2) {
          breaks.push({
            id: `break-${breaks.length}-${currentRun.startTime}`,
            playerIndex: currentRun.playerIndex,
            playerName: playerNames[currentRun.playerIndex] || `Player ${currentRun.playerIndex + 1}`,
            totalPoints: currentRun.points,
            balls: [...currentRun.balls],
            startTime: currentRun.startTime,
            endTime: evt.timestamp,
            eventIndexStart: currentRun.startIdx,
            eventIndexEnd: idx,
          });
        }
        currentRun = null;
      }
    } else if (evt.type === 'switch') {
      totalVisits[actorIdx] += 1;
      hasScoredInCurrentTurn = false;
      if (currentRun) {
        if (currentRun.points >= 10 || currentRun.balls.length >= 2) {
          breaks.push({
            id: `break-${breaks.length}-${currentRun.startTime}`,
            playerIndex: currentRun.playerIndex,
            playerName: playerNames[currentRun.playerIndex] || `Player ${currentRun.playerIndex + 1}`,
            totalPoints: currentRun.points,
            balls: [...currentRun.balls],
            startTime: currentRun.startTime,
            endTime: evt.timestamp,
            eventIndexStart: currentRun.startIdx,
            eventIndexEnd: idx,
          });
        }
        currentRun = null;
      }
    }
  }

  // Close lingering break at frame end
  if (currentRun) {
    breaks.push({
      id: `break-${breaks.length}-${currentRun.startTime}`,
      playerIndex: currentRun.playerIndex,
      playerName: playerNames[currentRun.playerIndex] || `Player ${currentRun.playerIndex + 1}`,
      totalPoints: currentRun.points,
      balls: [...currentRun.balls],
      startTime: currentRun.startTime,
      endTime: events[events.length - 1]?.timestamp,
      eventIndexStart: currentRun.startIdx,
      eventIndexEnd: events.length - 1,
    });
  }

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
    const visits = Math.max(1, totalVisits[idx] || 1);
    const playerBreaks = breaks.filter(b => b.playerIndex === idx);
    const highBreak = playerBreaks.length > 0 ? Math.max(...playerBreaks.map(b => b.totalPoints)) : 0;
    const avgBreak = playerBreaks.length > 0
      ? Math.round(playerBreaks.reduce((acc, b) => acc + b.totalPoints, 0) / playerBreaks.length)
      : 0;

    return {
      playerIndex: idx,
      playerName: p.name || `Player ${idx + 1}`,
      totalVisits: visits,
      scoringVisits: scoringVisits[idx] || 0,
      averagePointsPerVisit: Math.round(((pointsFromPots[idx] || 0) / visits) * 10) / 10,
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
    breaks: breaks.sort((a, b) => b.totalPoints - a.totalPoints),
    discipline,
    visitStats,
    totalEvents: events.length,
    leadChanges,
    durationSeconds,
  };
}
