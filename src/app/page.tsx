'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Match, Player } from '@/types/snooker';
import { Navbar } from '@/components/navigation/Navbar';
import { LiveScoreboard } from '@/components/scoreboard/LiveScoreboard';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { MatchSetup } from '@/components/match/MatchSetup';
import { MatchHistory } from '@/components/history/MatchHistory';
import { RulesModal } from '@/components/modals/RulesModal';
import { getLiveSession, clearLiveSession } from '@/lib/storage';
import { Play } from 'lucide-react';

export default function Home() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [matchPlayers, setMatchPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'leaderboard' | 'history' | 'new-match'>('new-match');
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Restore active live tracking session from localStorage on client mount (safe from SSR hydration mismatches)
  useEffect(() => {
    const timer = setTimeout(() => {
      const session = getLiveSession();
      if (session && session.match && session.players && session.players.length >= 2) {
        setCurrentMatch(session.match);
        setMatchPlayers(session.players);
        setActiveTab('live');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ tab: 'live' }, '');
        }
      } else {
        if (typeof window !== 'undefined' && window.history.state?.tab === undefined) {
          window.history.replaceState({ tab: 'new-match' }, '');
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = useCallback((tab: 'live' | 'leaderboard' | 'history' | 'new-match') => {
    // If user clicks live but there is no match in state, check localStorage first
    if (tab === 'live') {
      const session = getLiveSession();
      if (session && session.match && session.players && session.players.length >= 2) {
        setCurrentMatch(session.match);
        setMatchPlayers(session.players);
        setActiveTab('live');
      } else {
        // No match in progress -> route to new match
        setActiveTab('new-match');
        tab = 'new-match';
      }
    } else {
      setActiveTab(tab);
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({ tab }, '', window.location.pathname);
    }
  }, []);

  // Handle browser back / forward navigation smoothly without losing match tracking
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const targetTab = event.state?.tab;
      const session = getLiveSession();

      if (targetTab === 'live') {
        if (session && session.match && session.players && session.players.length >= 2) {
          setCurrentMatch(session.match);
          setMatchPlayers(session.players);
          setActiveTab('live');
        } else {
          setActiveTab('new-match');
        }
      } else if (targetTab) {
        setActiveTab(targetTab);
      } else {
        // Fallback if state is missing
        if (session && session.match && session.players && session.players.length >= 2) {
          setCurrentMatch(session.match);
          setMatchPlayers(session.players);
          setActiveTab('live');
        } else {
          setActiveTab('new-match');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Protect against accidental browser tab/window closure during an active match
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentMatch && matchPlayers.length >= 2) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentMatch, matchPlayers]);

  const handleStartMatch = (match: Match, players: Player[]) => {
    setCurrentMatch(match);
    setMatchPlayers(players);
    setActiveTab('live');
    if (typeof window !== 'undefined') {
      window.history.pushState({ tab: 'live' }, '', window.location.pathname);
    }
  };

  const handleMatchComplete = () => {
    clearLiveSession();
    setCurrentMatch(null);
    setMatchPlayers([]);
    handleTabChange('new-match');
  };

  const hasActiveMatch = Boolean(currentMatch && matchPlayers.length >= 2);

  return (
    <div className="min-h-screen bg-[#080c0a] text-gray-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Navigation (Sticky Header on desktop + Fixed Bottom Bar on mobile) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        hasActiveMatch={hasActiveMatch}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Persistent Live Match Return Banner (Visible when browsing other tabs while game is in progress) */}
      {hasActiveMatch && activeTab !== 'live' && (
        <aside 
          aria-label="Active match notice"
          className="sticky top-14 sm:top-16 z-30 max-w-5xl mx-auto w-full px-3 sm:px-4 pt-2.5"
        >
          <div className="bg-gradient-to-r from-emerald-950/95 via-[#0d2a1c]/95 to-[#081810]/95 backdrop-blur-md border border-emerald-500/70 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-white truncate block">
                  Match Active: {matchPlayers.map(p => p.name).join(' vs ')}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold block">
                  Live frame in progress • Tap to resume scoring
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTabChange('live')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-md transition flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Resume Match</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area (Optimized mobile padding to fit viewport comfortably without scrolling) */}
      <main className={`flex-1 ${activeTab === 'live' ? 'py-0.5 sm:py-2 pb-16 sm:pb-20 md:pb-6' : 'py-1 sm:py-3.5 pb-20 md:pb-6'}`}>
        {activeTab === 'live' && hasActiveMatch && currentMatch && (
          <LiveScoreboard
            key={currentMatch.id}
            match={currentMatch}
            players={matchPlayers}
            onMatchComplete={handleMatchComplete}
          />
        )}

        {/* Fallback if on live tab but no match exists */}
        {activeTab === 'live' && !hasActiveMatch && (
          <MatchSetup onStartMatch={handleStartMatch} />
        )}

        {activeTab === 'new-match' && (
          <MatchSetup onStartMatch={handleStartMatch} />
        )}

        {activeTab === 'leaderboard' && <Leaderboard />}

        {activeTab === 'history' && <MatchHistory />}
      </main>

      {/* Snooker Rules & Engine Guide Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-emerald-950/60 py-4 text-center text-xs text-gray-500 hidden md:block">
        <p>Snooker Tracker & Leaderboard • Built with Next.js, Supabase & Vercel</p>
      </footer>
    </div>
  );
}
