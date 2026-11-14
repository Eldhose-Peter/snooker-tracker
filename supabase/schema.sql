-- ==============================================================================
-- SNOOKER TRACKER & LEADERBOARD - DATABASE SCHEMA
-- Compatible with Supabase / PostgreSQL
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PLAYERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast player searches
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

-- ------------------------------------------------------------------------------
-- 2. MATCHES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player_ids UUID[] DEFAULT ARRAY[]::UUID[],
    player_frames INT[] DEFAULT ARRAY[]::INT[],
    best_of INT NOT NULL DEFAULT 1 CHECK (best_of > 0 AND best_of % 2 = 1),
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
    player1_frames INT NOT NULL DEFAULT 0,
    player2_frames INT NOT NULL DEFAULT 0,
    reds_count INT NOT NULL DEFAULT 15 CHECK (reds_count IN (6, 10, 15)),
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT different_players CHECK (player1_id <> player2_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ------------------------------------------------------------------------------
-- 3. FRAMES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    frame_number INT NOT NULL,
    player1_score INT NOT NULL DEFAULT 0,
    player2_score INT NOT NULL DEFAULT 0,
    scores INT[] DEFAULT ARRAY[]::INT[],
    winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
    highest_break INT NOT NULL DEFAULT 0,
    highest_break_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_frame_per_match UNIQUE (match_id, frame_number)
);

CREATE INDEX IF NOT EXISTS idx_frames_match_id ON frames(match_id);
CREATE INDEX IF NOT EXISTS idx_frames_winner ON frames(winner_id);

-- ------------------------------------------------------------------------------
-- 4. BREAKS / HIGH RUNS LOG (Optional granular tracking for breaks >= 20)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frame_id UUID REFERENCES frames(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    points INT NOT NULL CHECK (points > 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_breaks_player_id ON breaks(player_id);
CREATE INDEX IF NOT EXISTS idx_breaks_points ON breaks(points DESC);

-- ------------------------------------------------------------------------------
-- 5. LEADERBOARD VIEW ("THE CHART BOARD")
-- Calculates wins, losses, win rates, frame records, and highest breaks
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW player_leaderboard AS
WITH match_stats AS (
    SELECT 
        p.id AS player_id,
        COUNT(m.id) FILTER (WHERE m.status = 'completed') AS matches_played,
        COUNT(m.id) FILTER (WHERE m.status = 'completed' AND m.winner_id = p.id) AS matches_won,
        COUNT(m.id) FILTER (WHERE m.status = 'completed' AND m.winner_id IS NOT NULL AND m.winner_id <> p.id) AS matches_lost
    FROM players p
    LEFT JOIN matches m ON p.id = m.player1_id OR p.id = m.player2_id OR p.id = ANY(m.player_ids)
    GROUP BY p.id
),
frame_stats AS (
    SELECT 
        p.id AS player_id,
        COALESCE(SUM(
            CASE 
                WHEN m.player1_id = p.id THEN m.player1_frames
                WHEN m.player2_id = p.id THEN m.player2_frames
                ELSE 0
            END
        ), 0) AS frames_won,
        COALESCE(SUM(
            CASE 
                WHEN m.player1_id = p.id THEN m.player2_frames
                WHEN m.player2_id = p.id THEN m.player1_frames
                ELSE 0
            END
        ), 0) AS frames_lost
    FROM players p
    LEFT JOIN matches m ON (p.id = m.player1_id OR p.id = m.player2_id OR p.id = ANY(m.player_ids)) AND m.status = 'completed'
    GROUP BY p.id
),
break_stats AS (
    SELECT 
        p.id AS player_id,
        COALESCE(MAX(f.highest_break), 0) AS highest_break
    FROM players p
    LEFT JOIN frames f ON f.highest_break_player_id = p.id
    GROUP BY p.id
)
SELECT 
    p.id,
    p.name,
    p.nickname,
    p.avatar_url,
    p.created_at,
    COALESCE(ms.matches_played, 0) AS matches_played,
    COALESCE(ms.matches_won, 0) AS matches_won,
    COALESCE(ms.matches_lost, 0) AS matches_lost,
    CASE 
        WHEN COALESCE(ms.matches_played, 0) > 0 
        THEN ROUND((COALESCE(ms.matches_won, 0)::NUMERIC / ms.matches_played::NUMERIC) * 100, 1)
        ELSE 0.0 
    END AS win_rate,
    COALESCE(fs.frames_won, 0) AS frames_won,
    COALESCE(fs.frames_lost, 0) AS frames_lost,
    COALESCE(bs.highest_break, 0) AS highest_break
FROM players p
LEFT JOIN match_stats ms ON p.id = ms.player_id
LEFT JOIN frame_stats fs ON p.id = fs.player_id
LEFT JOIN break_stats bs ON p.id = bs.player_id
ORDER BY matches_won DESC, win_rate DESC, highest_break DESC;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Simple open access for a friend group, ready for custom Supabase Auth
-- ------------------------------------------------------------------------------
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

-- Allow public read and write for friend group setup
CREATE POLICY "Public read access for players" ON players FOR SELECT USING (true);
CREATE POLICY "Public insert access for players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for players" ON players FOR UPDATE USING (true);
CREATE POLICY "Public delete access for players" ON players FOR DELETE USING (true);

CREATE POLICY "Public read access for matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public insert access for matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for matches" ON matches FOR UPDATE USING (true);
CREATE POLICY "Public delete access for matches" ON matches FOR DELETE USING (true);

CREATE POLICY "Public read access for frames" ON frames FOR SELECT USING (true);
CREATE POLICY "Public insert access for frames" ON frames FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for frames" ON frames FOR UPDATE USING (true);
CREATE POLICY "Public delete access for frames" ON frames FOR DELETE USING (true);

CREATE POLICY "Public read access for breaks" ON breaks FOR SELECT USING (true);
CREATE POLICY "Public insert access for breaks" ON breaks FOR INSERT WITH CHECK (true);
