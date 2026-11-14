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
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const handleStartMatch = (match: Match, p1: Player, p2: Player) => {
    setCurrentMatch(match);
    setPlayer1(p1);
    setPlayer2(p2);
    setActiveTab('live');
  };

  const handleMatchComplete = () => {
    setCurrentMatch(null);
    setPlayer1(null);
    setPlayer2(null);
    setActiveTab('leaderboard');
  };

  return (
    <div className="min-h-screen bg-[#080c0a] text-gray-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveMatch={Boolean(currentMatch && player1 && player2)}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 py-4 sm:py-6">
        {activeTab === 'live' && currentMatch && player1 && player2 && (
          <LiveScoreboard
            match={currentMatch}
            player1={player1}
            player2={player2}
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
