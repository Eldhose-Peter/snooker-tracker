import { BALL_CONFIGS, COLOR_ORDER } from '@/types/snooker';
import type { ActiveLiveSession } from '@/lib/storage';

export interface RefereeChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface RefereeEventSummary {
  frameNumber: number;
  type: string;
  playerName: string;
  ball?: string;
  points?: number;
  foulPoints?: number;
  awardedToNames?: string[];
  freeBallAwarded?: boolean;
  passBack?: boolean;
  redsPocketedOnFoul?: number;
  redsRemainingAfter?: number;
  breakScore?: number;
  scoresAfter: number[];
  detail: string;
  timestamp: number;
}

export interface RefereePlayerSummary {
  name: string;
  score: number;
  framesWon: number;
  highestBreak: number;
  isActive: boolean;
  snookersNeeded?: number;
  pointsBehindMaxPossible?: number;
}

export interface RefereeMatchContext {
  hasActiveMatch: boolean;
  matchId?: string;
  bestOf?: number;
  redsCount?: number;
  currentFrameNum?: number;
  players?: RefereePlayerSummary[];
  activePlayerName?: string;
  currentBreak?: number;
  currentBreakBalls?: string[];
  tablePhase?: string;
  ballOn?: string;
  redsRemaining?: number;
  pointsRemaining?: number;
  freeBallActive?: boolean;
  snookersNeeded?: boolean;
  isFrameOver?: boolean;
  winReason?: string;
  lastActionDescription?: string;
  recentEvents?: RefereeEventSummary[];
  foulEvents?: RefereeEventSummary[];
}

const MAX_RECENT_EVENTS = 15;
const MAX_FOUL_EVENTS = 15;

/**
 * Resolve a human-readable description of the current ball on.
 */
function describeBallOn(session: ActiveLiveSession): string {
  const { frameState } = session;
  if (frameState.isFrameOver || frameState.tablePhase === 'FRAME_OVER') {
    return 'None (Frame Over)';
  }

  const baseTarget = (() => {
    if (frameState.tablePhase === 'RED') {
      return 'Red (1 pt)';
    }
    if (frameState.tablePhase === 'COLOR_AFTER_RED') {
      return 'Any nominated color (Yellow 2, Green 3, Brown 4, Blue 5, Pink 6, Black 7)';
    }
    if (frameState.tablePhase === 'COLORS_SEQUENCE') {
      const ballType = COLOR_ORDER[frameState.colorsSequenceIndex];
      if (!ballType) return 'None';
      const cfg = BALL_CONFIGS[ballType];
      const maxScore = Math.max(...frameState.playerScores);
      const tiedCount = frameState.playerScores.filter((s) => s === maxScore).length;
      const isReSpottedBlack =
        ballType === 'black' && frameState.redsRemaining === 0 && tiedCount > 1;
      return isReSpottedBlack
        ? 'Re-spotted Black (7 pts — tie-breaker shootout)'
        : `${cfg.name} (${cfg.points} pts)`;
    }
    return 'Unknown';
  })();

  if (frameState.freeBallActive) {
    return `Free Ball active — any ball nominated as substitute for ${baseTarget}`;
  }

  return baseTarget;
}

/**
 * Map a raw MatchEvent into a compact, player-name-resolved summary for the AI referee.
 */
function summarizeEvent(
  evt: NonNullable<ActiveLiveSession['frameState']['events']>[number],
  playerNames: string[]
): RefereeEventSummary {
  const awardedToNames = evt.awardedTo?.map(
    (idx) => playerNames[idx] || `Player ${idx + 1}`
  );

  return {
    frameNumber: evt.frameNumber,
    type: evt.type,
    playerName: evt.playerName,
    ball: evt.ball,
    points: evt.points,
    foulPoints: evt.foulPoints,
    awardedToNames: awardedToNames && awardedToNames.length > 0 ? awardedToNames : undefined,
    freeBallAwarded: evt.freeBallAwarded,
    passBack: evt.passBack,
    redsPocketedOnFoul: evt.redsPocketedOnFoul,
    redsRemainingAfter: evt.redsRemainingAfter,
    breakScore: evt.breakScore,
    scoresAfter: evt.scoresAfter,
    detail: evt.detail,
    timestamp: evt.timestamp,
  };
}

/**
 * Convert an active live session into a compact, serializable context object for the AI Referee.
 */
export function buildRefereeMatchContext(
  session: ActiveLiveSession | null
): RefereeMatchContext {
  if (!session || !session.match || !session.frameState || !session.players?.length) {
    return { hasActiveMatch: false };
  }

  const { match, players, currentFrameNum, playerFrames, frameState } = session;
  const playerNames = players.map((p, idx) => p.name || `Player ${idx + 1}`);
  const trailerMap = new Map(
    (frameState.snookersNeeded?.trailers || []).map((t) => [t.playerIndex, t])
  );

  const playerSummaries: RefereePlayerSummary[] = players.map((p, idx) => {
    const trailer = trailerMap.get(idx);
    return {
      name: p.name || `Player ${idx + 1}`,
      score: frameState.playerScores[idx] ?? 0,
      framesWon: playerFrames[idx] ?? 0,
      highestBreak: frameState.playerHighestBreaks[idx] ?? 0,
      isActive: frameState.activePlayerIndex === idx,
      snookersNeeded: trailer?.count,
      pointsBehindMaxPossible: trailer?.pointsDiff,
    };
  });

  const allEvents = frameState.events || [];
  const recentEvents = allEvents
    .slice(-MAX_RECENT_EVENTS)
    .map((evt) => summarizeEvent(evt, playerNames));

  const foulEvents = allEvents
    .filter((evt) => evt.type === 'foul')
    .slice(-MAX_FOUL_EVENTS)
    .map((evt) => summarizeEvent(evt, playerNames));

  return {
    hasActiveMatch: true,
    matchId: match.id,
    bestOf: match.best_of,
    redsCount: match.reds_count,
    currentFrameNum,
    players: playerSummaries,
    activePlayerName:
      playerNames[frameState.activePlayerIndex] ||
      `Player ${frameState.activePlayerIndex + 1}`,
    currentBreak: frameState.currentBreak,
    currentBreakBalls: frameState.currentBreakBalls,
    tablePhase: frameState.tablePhase,
    ballOn: describeBallOn(session),
    redsRemaining: frameState.redsRemaining,
    pointsRemaining: frameState.pointsRemaining,
    freeBallActive: frameState.freeBallActive,
    snookersNeeded: Boolean(frameState.snookersNeeded?.needed),
    isFrameOver: frameState.isFrameOver,
    winReason: frameState.winReason,
    lastActionDescription: frameState.lastActionDescription,
    recentEvents,
    foulEvents,
  };
}

/**
 * Generate contextual quick-ask prompt suggestions based on the current table state.
 */
export function getQuickRefereeSuggestions(context: RefereeMatchContext): string[] {
  const suggestions: string[] = [];

  if (context.hasActiveMatch) {
    if (context.foulEvents && context.foulEvents.length > 0) {
      suggestions.push('Explain the last foul and points awarded');
    }
    if (context.freeBallActive) {
      suggestions.push('How does this Free Ball work right now?');
    }
    if (context.snookersNeeded) {
      suggestions.push('Why are snookers needed and how many?');
    }
    if (context.tablePhase === 'COLOR_AFTER_RED') {
      suggestions.push('Which ball is on now and does it respot?');
    } else if (context.tablePhase === 'COLORS_SEQUENCE') {
      suggestions.push('What happens if we tie on the final black?');
    }
  }

  const fallbacks = [
    'How are foul points (4–7) decided?',
    'When is a Free Ball awarded?',
    'What happens if a red is potted on a foul?',
    'When can a player pass the turn back?',
  ];

  for (const item of fallbacks) {
    if (suggestions.length >= 4) break;
    if (!suggestions.includes(item)) {
      suggestions.push(item);
    }
  }

  return suggestions.slice(0, 4);
}

/**
 * Format the system prompt for Gemini 4 Hydrogen, combining official WPBSA rules,
 * SnookerTrack app mechanics, and the live match snapshot.
 */
export function formatRefereeSystemPrompt(context?: RefereeMatchContext | null): string {
  const rulesSection = `You are the official AI Snooker Referee & Rules Assistant built into SnookerTrack.
Your job is to answer players' doubts clearly, accurately, and concisely during or between matches—especially about fouls committed, penalty points, Free Balls, snookers required, ball respotting, and SnookerTrack scoring controls.

CORE SNOOKER RULES & SNOOKERTRACK ENGINE REFERENCE:
1. Ball Values: Red (1), Yellow (2), Green (3), Brown (4), Blue (5), Pink (6), Black (7).
2. Foul Penalty Hierarchy (WPBSA Section 3.10):
   - Minimum penalty for any foul is 4 points (e.g., cue ball in-off, miss/failure to hit ball on, touching any ball, push shot, jump shot, ball forced off table, foul involving Red, Yellow, Green, or Brown).
   - If a higher-value ball (Blue = 5, Pink = 6, Black = 7) is the ball on, is struck first illegally, or is potted illegally, the penalty equals the highest value among all balls involved in the foul (5, 6, or 7).
   - If multiple fouls occur in one stroke, only ONE penalty—the highest applicable value—is awarded.
3. Reds Pocketed During a Foul:
   - Any red ball potted (or forced off the table) on a foul stays off the table and is NEVER respotted.
   - In SnookerTrack's Foul modal, set "Reds Pocketed" so remaining reds and Points Remaining update accurately.
4. Colors Pocketed / Respotting:
   - While reds remain, a potted color after a red is always respotted on its own spot.
   - During the Colors Sequence (Yellow → Green → Brown → Blue → Pink → Black), legally potted colors stay down, EXCEPT if potted illegally/on a foul (always respotted) or if a Free Ball substitute is potted (respotted).
5. Next Player Options After a Foul:
   - The non-offending (incoming) player may play from where the balls lie, OR require the fouling player to play again from that position ("Pass Turn Back" toggle in SnookerTrack's Foul modal).
   - SnookerTrack Multiplayer (3–6 players) Foul Awards: players choose whether penalty points go to All Opponents (+pts each), Next Player (+pts), or a specific nominated player.
6. Free Ball (WPBSA Rule 3.12):
   - Awarded when an opponent's foul leaves the incoming striker snookered on ALL balls on (cannot hit either extreme edge of any ball on in a straight line).
   - The striker may nominate any other ball as the ball on. It scores the value of the ball on (1 if Red is on, or the sequence color's value) and is respotted after being potted.
   - Note: If the striker pots an actual Red during a Free Ball while on Reds, that Red stays down (decrements remaining reds); if a nominated color is potted as a Free Ball substitute, it is respotted and reds remaining does not change.
   - A snooker cannot be claimed behind a nominated Free Ball (except when only Pink and Black remain).
7. Multiple Reds in One Stroke:
   - Legal in snooker (Rule 3.3a); striker scores 1 point per red potted, then plays a single nominated color.
8. Snookers Required Math:
   - Points Remaining = (redsRemaining * 8) + 27 (plus +7 if currently on a color after a red), or sum of remaining sequence colors (27, 25, 22, 18, 13, 7).
   - A player needs snookers when (playerScore + pointsRemaining) < leaderScore.
   - Minimum snookers needed = ceil((leaderScore - (playerScore + pointsRemaining)) / 4), assuming minimum 4-point fouls.
9. Tied Scores & Re-spotted Black:
   - If scores are tied after the final black is potted, the black is respotted for a tie-breaker shootout (7 points remaining). A pot or a foul decides the frame immediately.`;

  let liveSection = `\nLIVE MATCH CONTEXT:\nNo active match is currently in progress. Answer based on official WPBSA snooker rules and SnookerTrack mechanics.`;

  if (context && context.hasActiveMatch) {
    const playersLines = (context.players || [])
      .map((p) => {
        const parts = [
          `${p.name}: ${p.score} pts`,
          context.bestOf && context.bestOf > 1 ? `${p.framesWon} frames` : null,
          `high break ${p.highestBreak}`,
          p.isActive ? 'AT TABLE' : null,
          p.snookersNeeded
            ? `NEEDS ${p.snookersNeeded} SNOOKER(S) (deficit beyond table: ${p.pointsBehindMaxPossible} pts)`
            : null,
        ].filter(Boolean);
        return `  - ${parts.join(' | ')}`;
      })
      .join('\n');

    const formatEvent = (e: RefereeEventSummary) => {
      const extras = [
        e.foulPoints ? `penalty=${e.foulPoints}` : null,
        e.awardedToNames?.length ? `awardedTo=${e.awardedToNames.join(', ')}` : null,
        e.freeBallAwarded ? 'freeBallAwarded=true' : null,
        e.passBack ? 'passBack=true' : null,
        e.redsPocketedOnFoul ? `redsPocketedOnFoul=${e.redsPocketedOnFoul}` : null,
        e.scoresAfter?.length ? `scoresAfter=[${e.scoresAfter.join(', ')}]` : null,
      ]
        .filter(Boolean)
        .join('; ');
      return `  - [F${e.frameNumber} • ${e.type.toUpperCase()}] ${e.detail}${extras ? ` (${extras})` : ''}`;
    };

    const recentLines =
      context.recentEvents && context.recentEvents.length > 0
        ? context.recentEvents.map(formatEvent).join('\n')
        : '  - No events logged yet in this frame.';

    const foulLines =
      context.foulEvents && context.foulEvents.length > 0
        ? context.foulEvents.map(formatEvent).join('\n')
        : '  - No fouls committed yet in this frame.';

    liveSection = `\nLIVE MATCH CONTEXT (CURRENT FRAME STATE):
- Format: ${context.bestOf === 1 ? 'Single Frame' : `Best of ${context.bestOf}`} • Initial Reds: ${context.redsCount ?? 15} • Current Frame: ${context.currentFrameNum ?? 1}
- Active Striker: ${context.activePlayerName} (Current Break: ${context.currentBreak ?? 0}${context.currentBreakBalls?.length ? ` [${context.currentBreakBalls.join(', ')}]` : ''})
- Table Phase: ${context.tablePhase} | Ball On: ${context.ballOn}
- Reds Remaining: ${context.redsRemaining ?? 0} | Points Remaining on Table: ${context.pointsRemaining ?? 0}
- Free Ball Active: ${context.freeBallActive ? 'YES' : 'NO'} | Snookers Needed: ${context.snookersNeeded ? 'YES' : 'NO'}
- Frame Over: ${context.isFrameOver ? `YES (${context.winReason || 'Completed'})` : 'NO'}
- Last Action: ${context.lastActionDescription || 'N/A'}
- Players & Scores:
${playersLines}
- Fouls Committed This Frame:
${foulLines}
- Most Recent Frame Events (Chronological):
${recentLines}`;
  }

  const responseGuidelines = `\nRESPONSE GUIDELINES:
- Always ground your answer in the LIVE MATCH CONTEXT above when a match is active (refer to players by name, cite exact current scores, ball on, reds remaining, or logged fouls).
- Be concise, decisive, and easy to read on a phone at the snooker table (use short paragraphs and bullet points; bold key rulings like **6-point foul** or **Free Ball**).
- When explaining what to tap in SnookerTrack, reference the exact UI controls (e.g., **Foul (+4)**, **···** Foul Modal, **Award Free Ball**, **Pass Turn Back**, **Reds Pocketed**, **Adjust Reds**).
- If a scenario is ambiguous (e.g. whether the cue ball is snookered on all edges of all balls on), briefly clarify the condition that decides it.`;

  return `${rulesSection}\n${liveSection}\n${responseGuidelines}`;
}
