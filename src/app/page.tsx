'use client';

import React, { useState } from 'react';
import { Match, Player } from '@/types/snooker';
import { Navbar } from '@/components/navigation/Navbar';
import { LiveScoreboard } from '@/components/scoreboard/LiveScoreboard';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { MatchSetup } from '@/components/match/MatchSetup';
import { MatchHistory } from '@/components/history/MatchHistory';
import { RulesModal } from '@/components/modals/RulesModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'live' | 'leaderboard' | 'history' | 'new-match'>('leaderboard');
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [matchPlayers, setMatchPlayers] = useState<Player[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const handleStartMatch = (match: Match, players: Player[]) => {
    setCurrentMatch(match);
    setMatchPlayers(players);
    setActiveTab('live');
  };

  const handleMatchComplete = () => {
    setCurrentMatch(null);
    setMatchPlayers([]);
    setActiveTab('leaderboard');
  };

  return (
    <div className="min-h-screen bg-[#080c0a] text-gray-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveMatch={Boolean(currentMatch && matchPlayers.length >= 2)}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 py-4 sm:py-6">
        {activeTab === 'live' && currentMatch && matchPlayers.length >= 2 && (
          <LiveScoreboard
            key={currentMatch.id}
            match={currentMatch}
            players={matchPlayers}
            onMatchComplete={handleMatchComplete}
          />
        )}

        {activeTab === 'leaderboard' && <Leaderboard />}

        {activeTab === 'history' && <MatchHistory />}

        {activeTab === 'new-match' && (
          <MatchSetup onStartMatch={handleStartMatch} />
        )}
      </main>

      {/* Snooker Rules & Engine Guide Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-emerald-950/60 py-4 text-center text-xs text-gray-500">
        <p>Snooker Tracker & Leaderboard • Built with Next.js, Supabase & Vercel</p>
      </footer>
    </div>
  );
}
