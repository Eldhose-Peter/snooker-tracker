import { Player, Match, Frame, LeaderboardEntry, HeadToHeadStats, FrameState } from '@/types/snooker';
import { supabase, isSupabaseConfigured } from './supabase';

const PLAYERS_KEY = 'snooker_tracker_players_v2';
const MATCHES_KEY = 'snooker_tracker_matches_v2';
const FRAMES_KEY = 'snooker_tracker_frames_v2';
export const LIVE_SESSION_KEY = 'snooker_active_live_session_v2';

export interface ActiveLiveSession {
  match: Match;
  players: Player[];
  currentFrameNum: number;
  playerFrames: number[];
  frameState: FrameState;
  undoStack: FrameState[];
  redoStack?: FrameState[];
  updatedAt: number;
}

// The friend group members requested
export const INITIAL_PLAYERS: Player[] = [
  {
    id: 'p1000000-0000-0000-0000-000000000001',
    name: 'Eldho',
    nickname: 'The Captain',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'p2000000-0000-0000-0000-000000000002',
    name: 'Thoma',
    nickname: 'The Tactician',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'p3000000-0000-0000-0000-000000000003',
    name: 'Raju',
    nickname: 'The Professor',
    avatar_url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'p4000000-0000-0000-0000-000000000004',
    name: 'Adi',
    nickname: 'The Whirlwind',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'p5000000-0000-0000-0000-000000000005',
    name: 'BM',
    nickname: 'The Sniper',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'p6000000-0000-0000-0000-000000000006',
    name: 'Sam',
    nickname: 'The Wizard',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const INITIAL_MATCHES: Match[] = [
  {
    id: 'm1000000-0000-0000-0000-000000000001',
    player_ids: ['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'],
    player1_id: 'p1000000-0000-0000-0000-000000000001',
    player2_id: 'p2000000-0000-0000-0000-000000000002',
    best_of: 3,
    status: 'completed',
    winner_id: 'p1000000-0000-0000-0000-000000000001',
    player_frames: [2, 1],
    player1_frames: 2,
    player2_frames: 1,
    reds_count: 15,
    started_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 3 * 86400000 + 45 * 60000).toISOString(),
  },
  {
    id: 'm2000000-0000-0000-0000-000000000002',
    player_ids: ['p3000000-0000-0000-0000-000000000003', 'p4000000-0000-0000-0000-000000000004'],
    player1_id: 'p3000000-0000-0000-0000-000000000003',
    player2_id: 'p4000000-0000-0000-0000-000000000004',
    best_of: 3,
    status: 'completed',
    winner_id: 'p3000000-0000-0000-0000-000000000003',
    player_frames: [2, 0],
    player1_frames: 2,
    player2_frames: 0,
    reds_count: 15,
    started_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 86400000 + 35 * 60000).toISOString(),
  },
  {
    id: 'm3000000-0000-0000-0000-000000000003',
    player_ids: ['p1000000-0000-0000-0000-000000000001', 'p5000000-0000-0000-0000-000000000005', 'p6000000-0000-0000-0000-000000000006'],
    player1_id: 'p1000000-0000-0000-0000-000000000001',
    player2_id: 'p5000000-0000-0000-0000-000000000005',
    best_of: 1,
    status: 'completed',
    winner_id: 'p5000000-0000-0000-0000-000000000005',
    player_frames: [0, 1, 0],
    player1_frames: 0,
    player2_frames: 1,
    reds_count: 10,
    started_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 11 * 3600000).toISOString(),
  },
];

const INITIAL_FRAMES: Frame[] = [
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    match_id: 'm1000000-0000-0000-0000-000000000001',
    frame_number: 1,
    scores: [68, 42],
    player1_score: 68,
    player2_score: 42,
    winner_id: 'p1000000-0000-0000-0000-000000000001',
    highest_break: 47,
    highest_break_player_id: 'p1000000-0000-0000-0000-000000000001',
    completed_at: new Date(Date.now() - 3 * 86400000 + 15 * 60000).toISOString(),
  },
  {
    id: 'f2000000-0000-0000-0000-000000000002',
    match_id: 'm1000000-0000-0000-0000-000000000001',
    frame_number: 2,
    scores: [35, 71],
    player1_score: 35,
    player2_score: 71,
    winner_id: 'p2000000-0000-0000-0000-000000000002',
    highest_break: 52,
    highest_break_player_id: 'p2000000-0000-0000-0000-000000000002',
    completed_at: new Date(Date.now() - 3 * 86400000 + 30 * 60000).toISOString(),
  },
  {
    id: 'f3000000-0000-0000-0000-000000000003',
    match_id: 'm1000000-0000-0000-0000-000000000001',
    frame_number: 3,
    scores: [75, 29],
    player1_score: 75,
    player2_score: 29,
    winner_id: 'p1000000-0000-0000-0000-000000000001',
    highest_break: 61,
    highest_break_player_id: 'p1000000-0000-0000-0000-000000000001',
    completed_at: new Date(Date.now() - 3 * 86400000 + 45 * 60000).toISOString(),
  },
  {
    id: 'f4000000-0000-0000-0000-000000000004',
    match_id: 'm2000000-0000-0000-0000-000000000002',
    frame_number: 1,
    scores: [54, 38],
    player1_score: 54,
    player2_score: 38,
    winner_id: 'p3000000-0000-0000-0000-000000000003',
    highest_break: 34,
    highest_break_player_id: 'p3000000-0000-0000-0000-000000000003',
    completed_at: new Date(Date.now() - 1 * 86400000 + 18 * 60000).toISOString(),
  },
  {
    id: 'f5000000-0000-0000-0000-000000000005',
    match_id: 'm2000000-0000-0000-0000-000000000002',
    frame_number: 2,
    scores: [62, 45],
    player1_score: 62,
    player2_score: 45,
    winner_id: 'p3000000-0000-0000-0000-000000000003',
    highest_break: 38,
    highest_break_player_id: 'p3000000-0000-0000-0000-000000000003',
    completed_at: new Date(Date.now() - 1 * 86400000 + 35 * 60000).toISOString(),
  },
  {
    id: 'f6000000-0000-0000-0000-000000000006',
    match_id: 'm3000000-0000-0000-0000-000000000003',
    frame_number: 1,
    scores: [42, 58, 36],
    player1_score: 42,
    player2_score: 58,
    winner_id: 'p5000000-0000-0000-0000-000000000005',
    highest_break: 41,
    highest_break_player_id: 'p5000000-0000-0000-0000-000000000005',
    completed_at: new Date(Date.now() - 11 * 3600000).toISOString(),
  },
];

// Helper to get from local storage safely
function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

// Clean old mock data / dummy players and ensure our actual members are loaded
function ensureLocalSeed(): void {
  if (typeof window === 'undefined') return;

  // Check if legacy storage had dummy players (e.g. Alex Mercer, Liam Chen)
  const legacyPlayers = getLocal<Player[]>('snooker_tracker_players', []);
  const hasLegacyDummy = legacyPlayers.some(p => 
    p.name.includes('Alex') || p.name.includes('Liam') || p.name.includes('Marcus') || p.name.includes('Davey')
  );

  if (hasLegacyDummy) {
    try {
      window.localStorage.removeItem('snooker_tracker_players');
      window.localStorage.removeItem('snooker_tracker_matches');
      window.localStorage.removeItem('snooker_tracker_frames');
    } catch {
      // ignore
    }
  }

  const existingPlayers = getLocal<Player[]>(PLAYERS_KEY, []);
  const needsReseed = existingPlayers.length === 0 || existingPlayers.some(p => 
    p.name.includes('Alex') || p.name.includes('Liam') || p.name.includes('Marcus') || p.name.includes('Davey')
  );

  if (needsReseed) {
    setLocal(PLAYERS_KEY, INITIAL_PLAYERS);
    setLocal(MATCHES_KEY, INITIAL_MATCHES);
    setLocal(FRAMES_KEY, INITIAL_FRAMES);
  }
}

// ==============================================================================
// PUBLIC STORAGE API
// ==============================================================================

export async function fetchPlayers(): Promise<Player[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('players').select('*').order('name');
      if (!error && data && data.length > 0) {
        return data as Player[];
      }
    } catch (err) {
      console.warn('Supabase fetchPlayers error, falling back to local storage', err);
    }
  }

  ensureLocalSeed();
  return getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
}

export async function createPlayer(name: string, nickname?: string, avatarUrl?: string): Promise<Player> {
  const newPlayer: Player = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`,
    name,
    nickname: nickname || null,
    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('players').insert({
        name: newPlayer.name,
        nickname: newPlayer.nickname,
        avatar_url: newPlayer.avatar_url,
      }).select().single();

      if (!error && data) {
        return data as Player;
      }
    } catch (err) {
      console.warn('Supabase createPlayer error, falling back to local storage', err);
    }
  }

  ensureLocalSeed();
  const current = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  const updated = [...current, newPlayer];
  setLocal(PLAYERS_KEY, updated);
  return newPlayer;
}

export async function fetchMatches(): Promise<Match[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          player1:players!player1_id(*),
          player2:players!player2_id(*),
          frames(*)
        `)
        .order('started_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Match[];
      }
    } catch (err) {
      console.warn('Supabase fetchMatches error, falling back to local storage', err);
    }
  }

  ensureLocalSeed();
  const players = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  const matches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES);
  const frames = getLocal<Frame[]>(FRAMES_KEY, INITIAL_FRAMES);

  return matches.map(m => {
    const playerIds = m.player_ids && m.player_ids.length > 0
      ? m.player_ids
      : [m.player1_id, m.player2_id];

    const hydratedPlayers = playerIds
      .map(id => players.find(p => p.id === id))
      .filter((p): p is Player => Boolean(p));

    return {
      ...m,
      player_ids: playerIds,
      players: hydratedPlayers,
      player1: hydratedPlayers[0] || players.find(p => p.id === m.player1_id),
      player2: hydratedPlayers[1] || players.find(p => p.id === m.player2_id),
      frames: frames.filter(f => f.match_id === m.id).sort((a, b) => a.frame_number - b.frame_number),
    };
  });
}

/**
 * Creates and saves a new match.
 * Supports multiplayer snooker (2 or more player IDs in rotation sequence).
 */
export async function saveNewMatch(
  playerIds: string[],
  bestOf?: number,
  redsCount?: number
): Promise<Match>;
export async function saveNewMatch(
  player1Id: string,
  player2Id: string,
  bestOf?: number,
  redsCount?: number
): Promise<Match>;
export async function saveNewMatch(
  playerIdsOrP1: string[] | string, 
  player2IdOrBestOf: string | number = 3, 
  bestOfParam: number = 3, 
  redsCountParam: number = 15
): Promise<Match> {
  let playerIds: string[];
  let bestOf: number;
  let redsCount: number;

  if (Array.isArray(playerIdsOrP1)) {
    playerIds = playerIdsOrP1;
    bestOf = typeof player2IdOrBestOf === 'number' ? player2IdOrBestOf : bestOfParam;
    redsCount = redsCountParam;
  } else {
    playerIds = [playerIdsOrP1, String(player2IdOrBestOf)];
    bestOf = bestOfParam;
    redsCount = redsCountParam;
  }

  const p1Id = playerIds[0];
  const p2Id = playerIds[1] || playerIds[0];
  const matchId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `m_${Date.now()}`;

  const initialPlayerFrames = new Array(playerIds.length).fill(0);

  const newMatch: Match = {
    id: matchId,
    player_ids: playerIds,
    player_frames: initialPlayerFrames,
    player1_id: p1Id,
    player2_id: p2Id,
    best_of: bestOf,
    status: 'in_progress',
    winner_id: null,
    player1_frames: 0,
    player2_frames: 0,
    reds_count: redsCount,
    started_at: new Date().toISOString(),
    frames: [],
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('matches').insert({
        id: newMatch.id,
        player1_id: p1Id,
        player2_id: p2Id,
        player_ids: playerIds,
        player_frames: initialPlayerFrames,
        best_of: bestOf,
        reds_count: redsCount,
        status: 'in_progress',
      }).select().single();

      if (!error && data) {
        return {
          ...newMatch,
          ...data,
          player_ids: playerIds,
          player_frames: initialPlayerFrames,
        };
      }
    } catch (err) {
      console.warn('Supabase saveNewMatch error, falling back to local storage', err);
    }
  }

  ensureLocalSeed();
  const matches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES);
  setLocal(MATCHES_KEY, [newMatch, ...matches]);
  return newMatch;
}

/**
 * Records a completed frame. Supports 2-player or multiplayer score arrays.
 */
export async function recordFrameCompleted(
  matchId: string,
  frameNumber: number,
  scores: number[],
  winnerId: string,
  highestBreak: number,
  highestBreakPlayerId: string | null
): Promise<Frame>;
export async function recordFrameCompleted(
  matchId: string,
  frameNumber: number,
  player1Score: number,
  player2Score: number,
  winnerId: string,
  highestBreak: number,
  highestBreakPlayerId: string | null
): Promise<Frame>;
export async function recordFrameCompleted(
  matchId: string,
  frameNumber: number,
  scoresOrP1: number[] | number,
  winnerIdOrP2: string | number,
  highestBreakOrWinnerId?: number | string,
  highBreakPlayerIdOrHighestBreak?: string | number | null,
  maybeHighBreakPlayerId?: string | null
): Promise<Frame> {
  let scores: number[];
  let winnerId: string;
  let highestBreak: number;
  let highestBreakPlayerId: string | null;

  if (Array.isArray(scoresOrP1)) {
    scores = scoresOrP1;
    winnerId = String(winnerIdOrP2);
    highestBreak = typeof highestBreakOrWinnerId === 'number' ? highestBreakOrWinnerId : 0;
    highestBreakPlayerId = (typeof highBreakPlayerIdOrHighestBreak === 'string' || highBreakPlayerIdOrHighestBreak === null)
      ? highBreakPlayerIdOrHighestBreak
      : null;
  } else {
    scores = [scoresOrP1, Number(winnerIdOrP2)];
    winnerId = String(highestBreakOrWinnerId || '');
    highestBreak = typeof highBreakPlayerIdOrHighestBreak === 'number' ? highBreakPlayerIdOrHighestBreak : 0;
    highestBreakPlayerId = maybeHighBreakPlayerId ?? null;
  }

  const frameId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `f_${Date.now()}`;
  const frame: Frame = {
    id: frameId,
    match_id: matchId,
    frame_number: frameNumber,
    scores,
    player1_score: scores[0] ?? 0,
    player2_score: scores[1] ?? 0,
    winner_id: winnerId,
    highest_break: highestBreak,
    highest_break_player_id: highestBreakPlayerId,
    completed_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('frames').insert({
        id: frame.id,
        match_id: matchId,
        frame_number: frameNumber,
        player1_score: frame.player1_score,
        player2_score: frame.player2_score,
        scores: frame.scores,
        winner_id: winnerId,
        highest_break: highestBreak,
        highest_break_player_id: highestBreakPlayerId,
        completed_at: frame.completed_at,
      });

      if (highestBreak >= 20 && highestBreakPlayerId) {
        await supabase.from('breaks').insert({
          frame_id: frame.id,
          match_id: matchId,
          player_id: highestBreakPlayerId,
          points: highestBreak,
        });
      }
    } catch (err) {
      console.warn('Supabase recordFrameCompleted error', err);
    }
  }

  ensureLocalSeed();
  const frames = getLocal<Frame[]>(FRAMES_KEY, INITIAL_FRAMES);
  setLocal(FRAMES_KEY, [...frames, frame]);
  return frame;
}

/**
 * Concludes a match with the winning player and updated frames won per participant.
 */
export async function finishMatch(
  matchId: string,
  winnerId: string,
  playerFrames: number[]
): Promise<void>;
export async function finishMatch(
  matchId: string,
  winnerId: string,
  p1Frames: number,
  p2Frames: number
): Promise<void>;
export async function finishMatch(
  matchId: string, 
  winnerId: string, 
  playerFramesOrP1: number[] | number, 
  p2FramesParam: number = 0
): Promise<void> {
  const completedAt = new Date().toISOString();
  let playerFrames: number[];

  if (Array.isArray(playerFramesOrP1)) {
    playerFrames = playerFramesOrP1;
  } else {
    playerFrames = [playerFramesOrP1, p2FramesParam];
  }

  const p1Frames = playerFrames[0] ?? 0;
  const p2Frames = playerFrames[1] ?? 0;

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('matches').update({
        status: 'completed',
        winner_id: winnerId,
        player1_frames: p1Frames,
        player2_frames: p2Frames,
        player_frames: playerFrames,
        completed_at: completedAt,
      }).eq('id', matchId);
    } catch (err) {
      console.warn('Supabase finishMatch error', err);
    }
  }

  ensureLocalSeed();
  const matches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES);
  const updatedMatches = matches.map(m => {
    if (m.id === matchId) {
      return {
        ...m,
        status: 'completed' as const,
        winner_id: winnerId,
        player_frames: playerFrames,
        player1_frames: p1Frames,
        player2_frames: p2Frames,
        completed_at: completedAt,
      };
    }
    return m;
  });
  setLocal(MATCHES_KEY, updatedMatches);
  clearLiveSession();
}

/**
 * Abandons an in-progress match without recording completed frame stats to leaderboard.
 */
export async function abandonMatch(matchId: string): Promise<void> {
  const completedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('matches').update({
        status: 'abandoned',
        completed_at: completedAt,
      }).eq('id', matchId);
      await supabase.from('frames').delete().eq('match_id', matchId);
    } catch (err) {
      console.warn('Supabase abandonMatch error', err);
    }
  }

  ensureLocalSeed();
  const matches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES);
  const updatedMatches = matches.map(m => {
    if (m.id === matchId) {
      return {
        ...m,
        status: 'abandoned' as const,
        completed_at: completedAt,
      };
    }
    return m;
  });
  setLocal(MATCHES_KEY, updatedMatches);

  // Clear any recorded frames for the abandoned match so stats are not corrupted
  const frames = getLocal<Frame[]>(FRAMES_KEY, INITIAL_FRAMES);
  const filteredFrames = frames.filter(f => f.match_id !== matchId);
  setLocal(FRAMES_KEY, filteredFrames);

  clearLiveSession();
}

// ==============================================================================
// ACTIVE LIVE TRACKING SESSION PERSISTENCE
// ==============================================================================

export function saveLiveSession(session: ActiveLiveSession): void {
  setLocal(LIVE_SESSION_KEY, session);
}

export function getLiveSession(): ActiveLiveSession | null {
  return getLocal<ActiveLiveSession | null>(LIVE_SESSION_KEY, null);
}

export function clearLiveSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LIVE_SESSION_KEY);
  } catch (err) {
    console.error('LocalStorage removeItem error:', err);
  }
}

/**
 * Calculates current leaderboard from matches and frame records.
 * Supports multiplayer matches with any number of participants.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('player_leaderboard').select('*');
      if (!error && data && data.length > 0) {
        return data as LeaderboardEntry[];
      }
    } catch (err) {
      console.warn('Supabase fetchLeaderboard error, calculating locally', err);
    }
  }

  ensureLocalSeed();
  const players = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  const matches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES).filter(m => m.status === 'completed');
  const completedMatchIds = new Set(matches.map(m => m.id));
  const frames = getLocal<Frame[]>(FRAMES_KEY, INITIAL_FRAMES).filter(f => completedMatchIds.has(f.match_id));

  const leaderboard: LeaderboardEntry[] = players.map(player => {
    const playerMatches = matches.filter(m => {
      if (m.player_ids && m.player_ids.length > 0) {
        return m.player_ids.includes(player.id);
      }
      return m.player1_id === player.id || m.player2_id === player.id;
    });

    const matchesWon = playerMatches.filter(m => m.winner_id === player.id).length;
    const matchesLost = playerMatches.filter(m => m.winner_id && m.winner_id !== player.id).length;
    const matchesPlayed = playerMatches.length;
    const winRate = matchesPlayed > 0 ? Number(((matchesWon / matchesPlayed) * 100).toFixed(1)) : 0;

    let framesWon = 0;
    let framesLost = 0;

    for (const m of playerMatches) {
      if (m.player_ids && m.player_frames && m.player_ids.length === m.player_frames.length) {
        const pIndex = m.player_ids.indexOf(player.id);
        if (pIndex !== -1) {
          const wonByP = m.player_frames[pIndex] || 0;
          framesWon += wonByP;
          const totalFrames = m.player_frames.reduce((sum, f) => sum + f, 0);
          framesLost += (totalFrames - wonByP);
        }
      } else {
        if (m.player1_id === player.id) {
          framesWon += m.player1_frames;
          framesLost += m.player2_frames;
        } else if (m.player2_id === player.id) {
          framesWon += m.player2_frames;
          framesLost += m.player1_frames;
        }
      }
    }

    const playerHighBreaks = frames
      .filter(f => f.highest_break_player_id === player.id)
      .map(f => f.highest_break);
    const highestBreak = playerHighBreaks.length > 0 ? Math.max(...playerHighBreaks) : 0;

    return {
      id: player.id,
      name: player.name,
      nickname: player.nickname,
      avatar_url: player.avatar_url,
      matches_played: matchesPlayed,
      matches_won: matchesWon,
      matches_lost: matchesLost,
      win_rate: winRate,
      frames_won: framesWon,
      frames_lost: framesLost,
      highest_break: highestBreak,
    };
  });

  return leaderboard.sort((a, b) => {
    if (b.matches_won !== a.matches_won) return b.matches_won - a.matches_won;
    if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
    return b.highest_break - a.highest_break;
  });
}

export async function fetchHeadToHead(player1Id: string, player2Id: string): Promise<HeadToHeadStats | null> {
  const players = await fetchPlayers();
  const p1 = players.find(p => p.id === player1Id);
  const p2 = players.find(p => p.id === player2Id);
  if (!p1 || !p2) return null;

  const allMatches = await fetchMatches();
  const directMatches = allMatches.filter(m => {
    if (m.status !== 'completed') return false;
    if (m.player_ids && m.player_ids.length > 0) {
      return m.player_ids.includes(player1Id) && m.player_ids.includes(player2Id);
    }
    return (m.player1_id === player1Id && m.player2_id === player2Id) ||
           (m.player1_id === player2Id && m.player2_id === player1Id);
  });

  let p1MatchWins = 0;
  let p2MatchWins = 0;
  let p1FrameWins = 0;
  let p2FrameWins = 0;
  let p1HighestBreak = 0;
  let p2HighestBreak = 0;

  for (const m of directMatches) {
    if (m.winner_id === player1Id) p1MatchWins++;
    if (m.winner_id === player2Id) p2MatchWins++;

    if (m.player_ids && m.player_frames) {
      const idx1 = m.player_ids.indexOf(player1Id);
      const idx2 = m.player_ids.indexOf(player2Id);
      if (idx1 !== -1) p1FrameWins += m.player_frames[idx1] || 0;
      if (idx2 !== -1) p2FrameWins += m.player_frames[idx2] || 0;
    } else {
      const isP1Player1 = m.player1_id === player1Id;
      p1FrameWins += isP1Player1 ? m.player1_frames : m.player2_frames;
      p2FrameWins += isP1Player1 ? m.player2_frames : m.player1_frames;
    }

    if (m.frames) {
      for (const f of m.frames) {
        if (f.highest_break_player_id === player1Id && f.highest_break > p1HighestBreak) {
          p1HighestBreak = f.highest_break;
        }
        if (f.highest_break_player_id === player2Id && f.highest_break > p2HighestBreak) {
          p2HighestBreak = f.highest_break;
        }
      }
    }
  }

  return {
    player1: p1,
    player2: p2,
    matchesPlayed: directMatches.length,
    p1MatchWins,
    p2MatchWins,
    p1FrameWins,
    p2FrameWins,
    p1HighestBreak,
    p2HighestBreak,
    matchHistory: directMatches,
  };
}
