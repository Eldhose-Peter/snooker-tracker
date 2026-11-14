export type BallType = 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black';

export interface BallConfig {
  type: BallType;
  points: number;
  name: string;
  colorHex: string;
  borderHex: string;
  textColor: string;
}

export const BALL_CONFIGS: Record<BallType, BallConfig> = {
  red: {
    type: 'red',
    points: 1,
    name: 'Red',
    colorHex: '#dc2626',
    borderHex: '#991b1b',
    textColor: '#ffffff',
  },
  yellow: {
    type: 'yellow',
    points: 2,
    name: 'Yellow',
    colorHex: '#eab308',
    borderHex: '#a16207',
    textColor: '#000000',
  },
  green: {
    type: 'green',
    points: 3,
    name: 'Green',
    colorHex: '#16a34a',
    borderHex: '#166534',
    textColor: '#ffffff',
  },
  brown: {
    type: 'brown',
    points: 4,
    name: 'Brown',
    colorHex: '#854d0e',
    borderHex: '#543109',
    textColor: '#ffffff',
  },
  blue: {
    type: 'blue',
    points: 5,
    name: 'Blue',
    colorHex: '#2563eb',
    borderHex: '#1d4ed8',
    textColor: '#ffffff',
  },
  pink: {
    type: 'pink',
    points: 6,
    name: 'Pink',
    colorHex: '#ec4899',
    borderHex: '#be185d',
    textColor: '#ffffff',
  },
  black: {
    type: 'black',
    points: 7,
    name: 'Black',
    colorHex: '#0f172a',
    borderHex: '#334155',
    textColor: '#ffffff',
  },
};

export const COLOR_ORDER: BallType[] = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

export type TablePhase = 
  | 'RED'                  // Waiting for a red ball
  | 'COLOR_AFTER_RED'     // Red potted; now selecting any color (2-7 pts), which is respotted
  | 'COLORS_SEQUENCE'     // All reds cleared; potting Yellow -> Green -> Brown -> Blue -> Pink -> Black
  | 'FRAME_OVER';         // Final black potted or frame conceded

export interface ShotAction {
  id: string;
  timestamp: number;
  type: 'POT' | 'MISS' | 'FOUL' | 'FREE_BALL_POT' | 'CONCEDE';
  player: 1 | 2;
  ball?: BallType;
  points?: number;
  awardedTo?: 1 | 2;
  description: string;
}

export interface SnookersNeededInfo {
  needed: boolean;
  player: 1 | 2 | null;
  count: number;
  pointsDiff: number;
}

export interface FrameState {
  player1Score: number;
  player2Score: number;
  activePlayer: 1 | 2;
  currentBreak: number;
  currentBreakBalls: BallType[];
  highestBreakP1: number;
  highestBreakP2: number;
  redsRemaining: number;
  tablePhase: TablePhase;
  colorsSequenceIndex: number; // 0=yellow, 1=green, 2=brown, 3=blue, 4=pink, 5=black
  freeBallActive: boolean;
  pointsRemaining: number;
  snookersNeeded: SnookersNeededInfo;
  isFrameOver: boolean;
  winner: 1 | 2 | null;
  winReason?: string;
  lastActionDescription?: string;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

export interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  player1?: Player;
  player2?: Player;
  best_of: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  winner_id?: string | null;
  player1_frames: number;
  player2_frames: number;
  reds_count: number;
  started_at: string;
  completed_at?: string | null;
  frames?: Frame[];
}

export interface Frame {
  id: string;
  match_id: string;
  frame_number: number;
  player1_score: number;
  player2_score: number;
  winner_id?: string | null;
  highest_break: number;
  highest_break_player_id?: string | null;
  started_at?: string;
  completed_at?: string | null;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  nickname?: string | null;
  avatar_url?: string | null;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  frames_won: number;
  frames_lost: number;
  highest_break: number;
}

export interface HeadToHeadStats {
  player1: Player;
  player2: Player;
  matchesPlayed: number;
  p1MatchWins: number;
  p2MatchWins: number;
  p1FrameWins: number;
  p2FrameWins: number;
  p1HighestBreak: number;
  p2HighestBreak: number;
  matchHistory: Match[];
}
