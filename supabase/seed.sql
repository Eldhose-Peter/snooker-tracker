-- ==============================================================================
-- SNOOKER TRACKER - SEED DATA
-- Actual friend group members (Eldho, Thoma, Raju, Adi, BM, Sam)
-- Actual played matches and frames with complete telemetry records
-- ==============================================================================

-- Insert Friend Group Members
INSERT INTO players (id, name, avatar_url) VALUES
('p1000000-0000-0000-0000-000000000001', 'Eldho', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'),
('p2000000-0000-0000-0000-000000000002', 'Thoma', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80'),
('p3000000-0000-0000-0000-000000000003', 'Raju', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80'),
('p4000000-0000-0000-0000-000000000004', 'Adi', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80'),
('p5000000-0000-0000-0000-000000000005', 'BM', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'),
('p6000000-0000-0000-0000-000000000006', 'Sam', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Match 1: Eldho vs Thoma (Best of 3, Eldho won 2-1)
INSERT INTO matches (id, player1_id, player2_id, best_of, status, winner_id, player1_frames, player2_frames, reds_count, started_at, completed_at)
VALUES (
    'm1000000-0000-0000-0000-000000000001',
    'p1000000-0000-0000-0000-000000000001',
    'p2000000-0000-0000-0000-000000000002',
    3,
    'completed',
    'p1000000-0000-0000-0000-000000000001',
    2,
    1,
    15,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '45 minutes'
) ON CONFLICT (id) DO NOTHING;

-- Frames for Match 1
INSERT INTO frames (id, match_id, frame_number, player1_score, player2_score, winner_id, highest_break, highest_break_player_id, completed_at)
VALUES
('f1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000001', 1, 68, 42, 'p1000000-0000-0000-0000-000000000001', 47, 'p1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
('f2000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000001', 2, 35, 71, 'p2000000-0000-0000-0000-000000000002', 52, 'p2000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days' + INTERVAL '30 minutes'),
('f3000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000001', 3, 75, 29, 'p1000000-0000-0000-0000-000000000001', 61, 'p1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes')
ON CONFLICT (id) DO NOTHING;

-- Match 2: Raju vs Adi (Best of 3, Raju won 2-0)
INSERT INTO matches (id, player1_id, player2_id, best_of, status, winner_id, player1_frames, player2_frames, reds_count, started_at, completed_at)
VALUES (
    'm2000000-0000-0000-0000-000000000002',
    'p3000000-0000-0000-0000-000000000003',
    'p4000000-0000-0000-0000-000000000004',
    3,
    'completed',
    'p3000000-0000-0000-0000-000000000003',
    2,
    0,
    15,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '35 minutes'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO frames (id, match_id, frame_number, player1_score, player2_score, winner_id, highest_break, highest_break_player_id, completed_at)
VALUES
('f4000000-0000-0000-0000-000000000004', 'm2000000-0000-0000-0000-000000000002', 1, 54, 38, 'p3000000-0000-0000-0000-000000000003', 34, 'p3000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day' + INTERVAL '18 minutes'),
('f5000000-0000-0000-0000-000000000005', 'm2000000-0000-0000-0000-000000000002', 2, 62, 45, 'p3000000-0000-0000-0000-000000000003', 38, 'p3000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day' + INTERVAL '35 minutes')
ON CONFLICT (id) DO NOTHING;
