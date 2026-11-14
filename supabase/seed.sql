-- ==============================================================================
-- SNOOKER TRACKER - SEED DATA
-- Sample players (Eldho, Thoma, Raju, Adi, BM, Sam)
-- Matches and frames start completely clean (0 matches played, clean leaderboard)
-- ==============================================================================

-- Insert Friend Group Members
INSERT INTO players (id, name, nickname, avatar_url) VALUES
('p1000000-0000-0000-0000-000000000001', 'Eldho', 'The Captain', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'),
('p2000000-0000-0000-0000-000000000002', 'Thoma', 'The Tactician', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80'),
('p3000000-0000-0000-0000-000000000003', 'Raju', 'The Professor', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80'),
('p4000000-0000-0000-0000-000000000004', 'Adi', 'The Whirlwind', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80'),
('p5000000-0000-0000-0000-000000000005', 'BM', 'The Sniper', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'),
('p6000000-0000-0000-0000-000000000006', 'Sam', 'The Wizard', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;
