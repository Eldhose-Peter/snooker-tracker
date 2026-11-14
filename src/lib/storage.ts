import { Player, Match, Frame, LeaderboardEntry, HeadToHeadStats } from '@/types/snooker';
import { supabase, isSupabaseConfigured } from './supabase';

const PLAYERS_KEY = 'snooker_tracker_players';
const MATCHES_KEY = 'snooker_tracker_matches';
const FRAMES_KEY = 'snooker_tracker_frames';

// Initial Mock Seed for Local Storage / Offline mode
const INITIAL_PLAYERS: Player[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Alex Mercer',
    nickname: 'The Rocket',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Liam Chen',
    nickname: 'The Magician',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    name: 'Marcus Vance',
    nickname: 'The Jester',
    avatar_url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    name: 'Davey Miller',
    nickname: 'The Grinder',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

const INITIAL_MATCHES: Match[] = [
  {
    id: 'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001',
    player1_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    player2_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    best_of: 3,
    status: 'completed',
    winner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    player1_frames: 2,
    player2_frames: 1,
    reds_count: 15,
    started_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 3 * 86400000 + 45 * 60000).toISOString(),
  },
  {
    id: 'm2eebc99-9c0b-4ef8-bb6d-6bb9bd380002',
    player1_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    player2_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    best_of: 3,
    status: 'completed',
    winner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    player1_frames: 2,
    player2_frames: 0,
    reds_count: 15,
    started_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 86400000 + 35 * 60000).toISOString(),
  },
];

const INITIAL_FRAMES: Frame[] = [
  {
    id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380001',
    match_id: 'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001',
    frame_number: 1,
    player1_score: 68,
    player2_score: 42,
    winner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    highest_break: 47,
    highest_break_player_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    completed_at: new Date(Date.now() - 3 * 86400000 + 15 * 60000).toISOString(),
  },
  {
    id: 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380002',
    match_id: 'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001',
    frame_number: 2,
    player1_score: 35,
    player2_score: 71,
    winner_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    highest_break: 52,
    highest_break_player_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    completed_at: new Date(Date.now() - 3 * 86400000 + 30 * 60000).toISOString(),
  },
  {
    id: 'f3eebc99-9c0b-4ef8-bb6d-6bb9bd380003',
    match_id: 'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001',
    frame_number: 3,
    player1_score: 75,
    player2_score: 29,
    winner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    highest_break: 61,
    highest_break_player_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    completed_at: new Date(Date.now() - 3 * 86400000 + 45 * 60000).toISOString(),
  },
  {
    id: 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380004',
    match_id: 'm2eebc99-9c0b-4ef8-bb6d-6bb9bd380002',
    frame_number: 1,
    player1_score: 54,
    player2_score: 38,
    winner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    highest_break: 34,
    highest_break_player_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    completed_at: new Date(Date.now() - 1 * 86400000 + 18 * 60000).toISOString(),
  },
  {
    id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380005',
    match_id: 'm2eebc99-9c0b-4ef8-bb6d-6bb9bd380002',
    frame_number: 2,
    player1_score: 62,
    player2_score: 45,
    winner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    highest_break: 38,
    highest_break_player_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    completed_at: new Date(Date.now() - 1 * 86400000 + 35 * 60000).toISOString(),
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

// Ensure mock data in local storage
function ensureLocalSeed() {
  if (typeof window === 'undefined') return;
  if (!window.localStorage.getItem(PLAYERS_KEY)) {
    setLocal(PLAYERS_KEY, INITIAL_PLAYERS);
  }
  if (!window.localStorage.getItem(MATCHES_KEY)) {
    setLocal(MATCHES_KEY, INITIAL_MATCHES);
  }
  if (!window.localStorage.getItem(FRAMES_KEY)) {
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
      if (!error && data) {
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
  const updated = [newPlayer, ...current];
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

      if (!error && data) {
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

  return matches.map(m => ({
    ...m,
    player1: players.find(p => p.id === m.player1_id),
    player2: players.find(p => p.id === m.player2_id),
    frames: frames.filter(f => f.match_id === m.id).sort((a, b) => a.frame_number - b.frame_number),
  }));
}

export async function saveNewMatch(
  player1Id: string, 
  player2Id: string, 
  bestOf: number = 3, 
  redsCount: number = 15
): Promise<Match> {
  const matchId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `m_${Date.now()}`;
  const newMatch: Match = {
    id: matchId,
    player1_id: player1Id,
    player2_id: player2Id,
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
        player1_id: player1Id,
        player2_id: player2Id,
        best_of: bestOf,
        reds_count: redsCount,
        status: 'in_progress',
      }).select().single();

      if (!error && data) {
        return data as Match;
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

export async function recordFrameCompleted(
  matchId: string,
  frameNumber: number,
  player1Score: number,
  player2Score: number,
  winnerId: string,
  highestBreak: number,
  highestBreakPlayerId: string | null
): Promise<Frame> {
  const frameId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `f_${Date.now()}`;
  const frame: Frame = {
    id: frameId,
    match_id: matchId,
    frame_number: frameNumber,
    player1_score: player1Score,
    player2_score: player2Score,
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
        player1_score: player1Score,
        player2_score: player2Score,
        winner_id: winnerId,
        highest_break: highestBreak,
        highest_break_player_id: highestBreakPlayerId,
        completed_at: frame.completed_at,
      });

      // Also record in breaks table if >= 20
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

export async function finishMatch(
  matchId: string, 
  winnerId: string, 
  p1Frames: number, 
  p2Frames: number
): Promise<void> {
  const completedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('matches').update({
        status: 'completed',
        winner_id: winnerId,
        player1_frames: p1Frames,
        player2_frames: p2Frames,
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
        player1_frames: p1Frames,
        player2_frames: p2Frames,
        completed_at: completedAt,
      };
    }
    return m;
  });
  setLocal(MATCHES_KEY, updatedMatches);
}

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

  // Calculate dynamically from local data
  ensureLocalSeed();
  const players = getLocal<Player[]>(PLAYERS_KEY, INITIAL_PLAYERS);
  const matches = getLocal<Match[]>(MATCHES_KEY, INITIAL_MATCHES).filter(m => m.status === 'completed');
  const frames = getLocal<Frame[]>(FRAMES_KEY, INITIAL_FRAMES);

  const leaderboard: LeaderboardEntry[] = players.map(player => {
    const playerMatches = matches.filter(m => m.player1_id === player.id || m.player2_id === player.id);
    const matchesWon = playerMatches.filter(m => m.winner_id === player.id).length;
    const matchesLost = playerMatches.filter(m => m.winner_id && m.winner_id !== player.id).length;
    const matchesPlayed = playerMatches.length;
    const winRate = matchesPlayed > 0 ? Number(((matchesWon / matchesPlayed) * 100).toFixed(1)) : 0;

    let framesWon = 0;
    let framesLost = 0;
    for (const m of playerMatches) {
      if (m.player1_id === player.id) {
        framesWon += m.player1_frames;
        framesLost += m.player2_frames;
      } else {
        framesWon += m.player2_frames;
        framesLost += m.player1_frames;
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
  const directMatches = allMatches.filter(
    m => m.status === 'completed' &&
    ((m.player1_id === player1Id && m.player2_id === player2Id) ||
     (m.player1_id === player2Id && m.player2_id === player1Id))
  );

  let p1MatchWins = 0;
  let p2MatchWins = 0;
  let p1FrameWins = 0;
  let p2FrameWins = 0;
  let p1HighestBreak = 0;
  let p2HighestBreak = 0;

  for (const m of directMatches) {
    if (m.winner_id === player1Id) p1MatchWins++;
    if (m.winner_id === player2Id) p2MatchWins++;

    const isP1Player1 = m.player1_id === player1Id;
    p1FrameWins += isP1Player1 ? m.player1_frames : m.player2_frames;
    p2FrameWins += isP1Player1 ? m.player2_frames : m.player1_frames;

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
