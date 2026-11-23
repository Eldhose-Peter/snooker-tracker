import { Player, Match, Frame, LeaderboardEntry, HeadToHeadStats, FrameState, MatchEvent } from '@/types/snooker';
import { supabase, isSupabaseConfigured } from './supabase';
import { getSampleMatchesAndFrames, ACTUAL_MATCHES, ACTUAL_FRAMES } from './sample-data';

const PLAYERS_KEY = 'snooker_tracker_players_v3';
const MATCHES_KEY = 'snooker_tracker_matches_v3';
const FRAMES_KEY = 'snooker_tracker_frames_v3';
export const LIVE_SESSION_KEY = 'snooker_active_live_session_v3';

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
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'p2000000-0000-0000-0000-000000000002',
    name: 'Thoma',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'p3000000-0000-0000-0000-000000000003',
    name: 'Raju',
    avatar_url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'p4000000-0000-0000-0000-000000000004',
    name: 'Adi',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'p5000000-0000-0000-0000-000000000005',
    name: 'BM',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'p6000000-0000-0000-0000-000000000006',
    name: 'Sam',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

export const INITIAL_MATCHES: Match[] = ACTUAL_MATCHES;

export const INITIAL_FRAMES: Frame[] = ACTUAL_FRAMES;

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

// Ensure roster is initialized and actual played matches are restored and preserved
function ensureLocalSeed(): void {
  if (typeof window === 'undefined') return;

  // Clear any legacy cleared flags that may prevent actual match restoration
  try {
    window.localStorage.removeItem('snooker_history_cleared_v3');
    window.localStorage.removeItem('snooker_history_cleared');
  } catch {
    // ignore
  }

  // 1. Decoupled Player Seeding (never touches matches or frames)
  const existingPlayers = getLocal<Player[]>(PLAYERS_KEY, []);
  if (existingPlayers.length === 0) {
    setLocal(PLAYERS_KEY, INITIAL_PLAYERS);
  }

  // When Supabase is configured, Supabase is the primary store for matches (do not seed mock matches into localStorage)
  if (isSupabaseConfigured) return;

  // 2. Ensure Actual Played Matches and Frames are Restored and Preserved
  try {
    let matches = getLocal<Match[]>(MATCHES_KEY, []);
    let frames = getLocal<Frame[]>(FRAMES_KEY, []);

    // Check if user had matches in legacy storage versions (v2 or v1)
    const v2Matches = getLocal<Match[]>('snooker_tracker_matches_v2', []);
    const v1Matches = getLocal<Match[]>('snooker_tracker_matches', []);
    const legacyMatches = [...v2Matches, ...v1Matches];

    if (legacyMatches.length > 0) {
      const matchIds = new Set(matches.map(m => m.id));
      const missingLegacy = legacyMatches.filter(m => !matchIds.has(m.id));
      if (missingLegacy.length > 0) {
        matches = [...matches, ...missingLegacy];
      }

      const v2Frames = getLocal<Frame[]>('snooker_tracker_frames_v2', []);
      const v1Frames = getLocal<Frame[]>('snooker_tracker_frames', []);
      const legacyFrames = [...v2Frames, ...v1Frames];
      const frameIds = new Set(frames.map(f => f.id));
      const missingLegacyFrames = legacyFrames.filter(f => !frameIds.has(f.id));
      if (missingLegacyFrames.length > 0) {
        frames = [...frames, ...missingLegacyFrames];
      }
    }

    // Always ensure the actual played matches are present
    const currentMatchIds = new Set(matches.map(m => m.id));
    const missingActualMatches = ACTUAL_MATCHES.filter(m => !currentMatchIds.has(m.id));
    if (missingActualMatches.length > 0) {
      matches = [...matches, ...missingActualMatches];
    }

    const currentFrameIds = new Set(frames.map(f => f.id));
    const missingActualFrames = ACTUAL_FRAMES.filter(f => !currentFrameIds.has(f.id));
    if (missingActualFrames.length > 0) {
      frames = [...frames, ...missingActualFrames];
    }

    setLocal(MATCHES_KEY, matches.length > 0 ? matches : ACTUAL_MATCHES);
    setLocal(FRAMES_KEY, frames.length > 0 ? frames : ACTUAL_FRAMES);

    // Clean up older legacy storage keys to avoid clutter, keeping v3 intact
    window.localStorage.removeItem('snooker_tracker_players');
    window.localStorage.removeItem('snooker_tracker_matches');
    window.localStorage.removeItem('snooker_tracker_frames');
    window.localStorage.removeItem('snooker_active_live_session');
    window.localStorage.removeItem('snooker_tracker_players_v2');
    window.localStorage.removeItem('snooker_tracker_matches_v2');
    window.localStorage.removeItem('snooker_tracker_frames_v2');
    window.localStorage.removeItem('snooker_active_live_session_v2');
  } catch (err) {
    console.error('ensureLocalSeed error:', err);
  }
}

/**
 * Restores actual match histories complete with shot-by-shot event telemetry and charts.
 * Does not overwrite existing user matches unless force is true.
 */
export async function restoreActualMatches(force: boolean = false): Promise<Match[]> {
  const { matches: sampleMatches, frames: sampleFrames } = getSampleMatchesAndFrames();

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('snooker_history_cleared_v3');
    window.localStorage.removeItem('snooker_history_cleared');
    const currentMatches = getLocal<Match[]>(MATCHES_KEY, []);
    const currentFrames = getLocal<Frame[]>(FRAMES_KEY, []);

    if (force || currentMatches.length === 0) {
      setLocal(MATCHES_KEY, sampleMatches);
      setLocal(FRAMES_KEY, sampleFrames);
      return sampleMatches;
    } else {
      const existingIds = new Set(currentMatches.map(m => m.id));
      const newMatches = sampleMatches.filter(m => !existingIds.has(m.id));
      const updatedMatches = [...newMatches, ...currentMatches];
      setLocal(MATCHES_KEY, updatedMatches);

      const existingFrameIds = new Set(currentFrames.map(f => f.id));
      const newFrames = sampleFrames.filter(f => !existingFrameIds.has(f.id));
      setLocal(FRAMES_KEY, [...currentFrames, ...newFrames]);
      return updatedMatches;
    }
  }

  return sampleMatches;
}

// Alias for backwards compatibility
export const seedSampleMatches = restoreActualMatches;

/**
 * Resets match history to the actual played matches (leaves player roster intact).
 */
export async function clearAllMatches(): Promise<void> {
  if (typeof window !== 'undefined') {
    setLocal(MATCHES_KEY, ACTUAL_MATCHES);
    setLocal(FRAMES_KEY, ACTUAL_FRAMES);
  }
}

// ==============================================================================
// PUBLIC STORAGE API
// ==============================================================================

export async function fetchPlayers(): Promise<Player[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('players').select('*').order('name');
      if (!error && data) {
        if (data.length > 0) {
          // Sync to local cache so offline access works
          setLocal(PLAYERS_KEY, data as Player[]);
          return data as Player[];
        }
        // If table exists but is empty, try seeding the friend group roster to Supabase once
        try {
          const { data: seeded, error: seedErr } = await supabase
            .from('players')
            .insert(INITIAL_PLAYERS.map(p => ({
              id: p.id,
              name: p.name,
              avatar_url: p.avatar_url,
            })))
            .select();
          if (!seedErr && seeded && seeded.length > 0) {
            setLocal(PLAYERS_KEY, seeded as Player[]);
            return seeded as Player[];
          }
        } catch (seedErr) {
          console.warn('Auto-seed initial players to Supabase error:', seedErr);
        }
      }
      if (error) {
        console.warn('Supabase fetchPlayers error (falling back to local roster):', error);
      }
    } catch (err) {
      console.warn('Supabase fetchPlayers exception (falling back to local roster):', err);
    }
  }

  ensureLocalSeed();
  const local = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  return local.length > 0 ? local : INITIAL_PLAYERS;
}

export async function createPlayer(name: string, avatarUrl?: string): Promise<Player> {
  const newPlayer: Player = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`,
    name,
    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    created_at: new Date().toISOString(),
  };

  let savedPlayer: Player = newPlayer;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('players').insert({
        id: newPlayer.id,
        name: newPlayer.name,
        avatar_url: newPlayer.avatar_url,
      }).select().single();

      if (error) {
        console.warn('Supabase createPlayer error (saving to local storage):', error);
      } else if (data) {
        savedPlayer = data as Player;
      }
    } catch (err) {
      console.warn('Supabase createPlayer exception (saving to local storage):', err);
    }
  }

  // ALWAYS save to local storage so the member is immediately remembered
  ensureLocalSeed();
  const current = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  const exists = current.some(p => p.id === savedPlayer.id || p.name.toLowerCase() === savedPlayer.name.toLowerCase());
  const updated = exists
    ? current.map(p => (p.id === savedPlayer.id || p.name.toLowerCase() === savedPlayer.name.toLowerCase()) ? savedPlayer : p)
    : [...current, savedPlayer];
  setLocal(PLAYERS_KEY, updated);

  return savedPlayer;
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

      if (error) {
        console.error('Supabase fetchMatches error:', error);
        return [];
      }

      const rawMatches = (data || []) as any[];
      if (rawMatches.length === 0) {
        return [];
      }

      const players = await fetchPlayers();
      const playerMap = new Map(players.map(p => [p.id, p]));

      return rawMatches.map(m => {
        const playerIds: string[] = m.player_ids && m.player_ids.length > 0
          ? m.player_ids
          : [m.player1_id, m.player2_id].filter(Boolean);

        const hydratedPlayers = playerIds
          .map(id => playerMap.get(id))
          .filter((p): p is Player => Boolean(p));

        const finalPlayers = hydratedPlayers.length > 0
          ? hydratedPlayers
          : playerIds.map((id, idx) => ({
              id,
              name: id === m.player1_id ? (m.player1?.name || 'Player 1') : (m.player2?.name || `Player ${idx + 1}`),
              created_at: new Date().toISOString(),
            }));

        const frames = (m.frames || []).sort((a: Frame, b: Frame) => a.frame_number - b.frame_number);

        return {
          ...m,
          player_ids: playerIds,
          players: finalPlayers,
          player1: finalPlayers[0] || m.player1 || { id: m.player1_id, name: 'Player 1', created_at: '' },
          player2: finalPlayers[1] || m.player2 || { id: m.player2_id, name: 'Player 2', created_at: '' },
          frames,
        };
      });
    } catch (err) {
      console.error('Supabase fetchMatches exception:', err);
      return [];
    }
  }

  ensureLocalSeed();
  const players = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  let matches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES);
  let frames = getLocal<Frame[]>(FRAMES_KEY, INITIAL_FRAMES);

  if (!matches || matches.length === 0) {
    matches = ACTUAL_MATCHES;
    setLocal(MATCHES_KEY, ACTUAL_MATCHES);
  }
  if (!frames || frames.length === 0) {
    frames = ACTUAL_FRAMES;
    setLocal(FRAMES_KEY, ACTUAL_FRAMES);
  }

  return matches.map(m => {
    const playerIds = m.player_ids && m.player_ids.length > 0
      ? m.player_ids
      : [m.player1_id, m.player2_id];

    const hydratedPlayers = playerIds
      .map(id => players.find(p => p.id === id))
      .filter((p): p is Player => Boolean(p));

    const finalPlayers = hydratedPlayers.length > 0
      ? hydratedPlayers
      : playerIds.map((id, idx) => ({
          id,
          name: idx === 0 ? 'Player 1' : `Player ${idx + 1}`,
          created_at: new Date().toISOString(),
        }));

    return {
      ...m,
      player_ids: playerIds,
      players: finalPlayers,
      player1: finalPlayers[0] || players.find(p => p.id === m.player1_id) || { id: m.player1_id, name: 'Player 1', created_at: '' },
      player2: finalPlayers[1] || players.find(p => p.id === m.player2_id) || { id: m.player2_id, name: 'Player 2', created_at: '' },
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
  player2IdOrBestOf: string | number = 1, 
  bestOfParam: number = 1, 
  redsCountParam: number = 15
): Promise<Match> {
  let playerIds: string[];
  let bestOf: number;
  let redsCount: number;

  if (Array.isArray(playerIdsOrP1)) {
    playerIds = playerIdsOrP1;
    bestOf = typeof player2IdOrBestOf === 'number' ? player2IdOrBestOf : 1;
    redsCount = typeof bestOfParam === 'number' ? bestOfParam : 15;
  } else {
    playerIds = [playerIdsOrP1, String(player2IdOrBestOf)];
    bestOf = typeof bestOfParam === 'number' ? bestOfParam : 1;
    redsCount = typeof redsCountParam === 'number' ? redsCountParam : 15;
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
  highestBreakPlayerId: string | null,
  events?: MatchEvent[]
): Promise<Frame>;
export async function recordFrameCompleted(
  matchId: string,
  frameNumber: number,
  player1Score: number,
  player2Score: number,
  winnerId: string,
  highestBreak: number,
  highestBreakPlayerId: string | null,
  events?: MatchEvent[]
): Promise<Frame>;
export async function recordFrameCompleted(
  matchId: string,
  frameNumber: number,
  scoresOrP1: number[] | number,
  winnerIdOrP2: string | number,
  highestBreakOrWinnerId?: number | string,
  highBreakPlayerIdOrHighestBreak?: string | number | null,
  maybeHighBreakPlayerIdOrEvents?: string | null | MatchEvent[],
  maybeEventsParam?: MatchEvent[]
): Promise<Frame> {
  let scores: number[];
  let winnerId: string;
  let highestBreak: number;
  let highestBreakPlayerId: string | null;
  let frameEvents: MatchEvent[] = [];

  if (Array.isArray(scoresOrP1)) {
    scores = scoresOrP1;
    winnerId = String(winnerIdOrP2);
    highestBreak = typeof highestBreakOrWinnerId === 'number' ? highestBreakOrWinnerId : 0;
    highestBreakPlayerId = (typeof highBreakPlayerIdOrHighestBreak === 'string' || highBreakPlayerIdOrHighestBreak === null)
      ? highBreakPlayerIdOrHighestBreak
      : null;
    if (Array.isArray(maybeHighBreakPlayerIdOrEvents)) {
      frameEvents = maybeHighBreakPlayerIdOrEvents;
    }
  } else {
    scores = [scoresOrP1, Number(winnerIdOrP2)];
    winnerId = String(highestBreakOrWinnerId || '');
    highestBreak = typeof highBreakPlayerIdOrHighestBreak === 'number' ? highBreakPlayerIdOrHighestBreak : 0;
    highestBreakPlayerId = typeof maybeHighBreakPlayerIdOrEvents === 'string' ? maybeHighBreakPlayerIdOrEvents : null;
    if (Array.isArray(maybeEventsParam)) {
      frameEvents = maybeEventsParam;
    }
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
    events: frameEvents,
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
        events: frame.events,
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
  const current = getLocal<ActiveLiveSession | null>(LIVE_SESSION_KEY, null);
  if (current) return current;
  const v2 = getLocal<ActiveLiveSession | null>('snooker_active_live_session_v2', null);
  if (v2) return v2;
  return getLocal<ActiveLiveSession | null>('snooker_active_live_session', null);
}

export function clearLiveSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LIVE_SESSION_KEY);
    window.localStorage.removeItem('snooker_active_live_session_v2');
    window.localStorage.removeItem('snooker_active_live_session');
  } catch (err) {
    console.error('LocalStorage removeItem error:', err);
  }
}

function computeLeaderboard(players: Player[], matches: Match[], frames: Frame[]): LeaderboardEntry[] {
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
      console.warn('Supabase fetchLeaderboard error, computing from Supabase records', err);
    }

    // Dynamic calculation from Supabase players, completed matches, and frames
    const [players, matches] = await Promise.all([
      fetchPlayers(),
      fetchMatches(),
    ]);
    const completedMatches = matches.filter(m => m.status === 'completed');
    const allFrames = completedMatches.flatMap(m => m.frames || []);

    return computeLeaderboard(players, completedMatches, allFrames);
  }

  ensureLocalSeed();
  const players = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  let rawMatches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES);
  if (!rawMatches || rawMatches.length === 0) {
    rawMatches = ACTUAL_MATCHES;
    setLocal(MATCHES_KEY, ACTUAL_MATCHES);
  }
  const matches = rawMatches.filter(m => m.status === 'completed');
  const completedMatchIds = new Set(matches.map(m => m.id));
  let frames = getLocal<Frame[]>(FRAMES_KEY, INITIAL_FRAMES).filter(f => completedMatchIds.has(f.match_id));
  if (frames.length === 0) {
    frames = ACTUAL_FRAMES.filter(f => completedMatchIds.has(f.match_id));
  }

  return computeLeaderboard(players, matches, frames);
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
