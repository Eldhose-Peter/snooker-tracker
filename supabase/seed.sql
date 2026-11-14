-- ==============================================================================
-- SNOOKER TRACKER - SEED DATA
-- Sample players and completed match history for your friend group
-- ==============================================================================

-- Clear existing data if re-seeding
-- TRUNCATE TABLE breaks, frames, matches, players CASCADE;

-- Insert Friend Group Players
INSERT INTO players (id, name, nickname, avatar_url) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Alex Mercer', 'The Rocket', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Liam Chen', 'The Magician', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Marcus Vance', 'The Jester', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Davey Miller', 'The Grinder', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Match 1: Alex Mercer vs Liam Chen (Best of 3, Alex won 2-1)
INSERT INTO matches (id, player1_id, player2_id, best_of, status, winner_id, player1_frames, player2_frames, reds_count, started_at, completed_at)
VALUES (
    'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    3,
    'completed',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    2,
    1,
    15,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '45 minutes'
) ON CONFLICT (id) DO NOTHING;

-- Frames for Match 1
INSERT INTO frames (id, match_id, frame_number, player1_score, player2_score, winner_id, highest_break, highest_break_player_id, completed_at)
VALUES
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 1, 68, 42, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 47, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380002', 'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 2, 35, 71, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 52, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW() - INTERVAL '3 days' + INTERVAL '30 minutes'),
('f3eebc99-9c0b-4ef8-bb6d-6bb9bd380003', 'm1eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 3, 75, 29, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 61, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes')
ON CONFLICT (id) DO NOTHING;

-- Match 2: Marcus Vance vs Davey Miller (Best of 3, Marcus won 2-0)
INSERT INTO matches (id, player1_id, player2_id, best_of, status, winner_id, player1_frames, player2_frames, reds_count, started_at, completed_at)
VALUES (
    'm2eebc99-9c0b-4ef8-bb6d-6bb9bd380002',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    3,
    'completed',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    2,
    0,
    15,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '35 minutes'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO frames (id, match_id, frame_number, player1_score, player2_score, winner_id, highest_break, highest_break_player_id, completed_at)
VALUES
('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380004', 'm2eebc99-9c0b-4ef8-bb6d-6bb9bd380002', 1, 54, 38, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 34, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', NOW() - INTERVAL '1 day' + INTERVAL '18 minutes'),
('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380005', 'm2eebc99-9c0b-4ef8-bb6d-6bb9bd380002', 2, 62, 45, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 38, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', NOW() - INTERVAL '1 day' + INTERVAL '35 minutes')
ON CONFLICT (id) DO NOTHING;
