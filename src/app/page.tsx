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
    handleTabChange('history');
  };

  const hasActiveMatch = Boolean(currentMatch && matchPlayers.length >= 2);

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--label)] flex flex-col font-sans selection:bg-emerald-600 selection:text-white antialiased relative overflow-x-hidden">
      {/* Liquid Glass Navigation: Floating Top Header & Floating Bottom Tab Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        hasActiveMatch={hasActiveMatch}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Persistent Live Match Return Banner (Liquid Glass Callout when browsing other tabs) */}
      {hasActiveMatch && activeTab !== 'live' && (
        <aside 
          aria-label="Active match notice"
          className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 max-w-4xl mx-auto w-full px-3 sm:px-4 pt-2"
        >
          <div className="glass p-3 sm:p-3.5 flex items-center justify-between shadow-xl border border-emerald-500/30 rounded-2xl">
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-[var(--label)] truncate block tracking-tight">
                  Match Active: {matchPlayers.map(p => p.name).join(' vs ')}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">
                  Live frame in progress • Tap to resume scoring
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTabChange('live')}
              className="btn-filled px-4 py-2 text-xs font-semibold shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white" />
              <span>Resume</span>
            </button>
          </div>
        </aside>
      )}

      {/* Edge-to-edge Content Container scrolling smoothly behind floating bars */}
      <main className={`flex-1 flex flex-col w-full max-w-5xl mx-auto px-2 sm:px-4 pt-[calc(3.75rem+env(safe-area-inset-top,0px))] sm:pt-[calc(4.5rem+env(safe-area-inset-top,0px))] ${
        activeTab === 'live' 
          ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom,20px))] sm:pb-[calc(7rem+env(safe-area-inset-bottom,20px))] md:pb-12' 
          : 'pb-[calc(6.5rem+env(safe-area-inset-bottom,20px))] sm:pb-[calc(7rem+env(safe-area-inset-bottom,20px))] md:pb-12'
      }`}>
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

        {activeTab === 'history' && <MatchHistory onNavigateTab={handleTabChange} />}
      </main>

      {/* Snooker Rules & Engine Guide Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[var(--separator)] py-4 text-center text-xs text-[var(--label-3)] hidden md:block">
        <p>SnookerTrack • Liquid Glass Human Interface</p>
      </footer>
    </div>
  );
}
