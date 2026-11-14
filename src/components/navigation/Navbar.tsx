'use client';

import React from 'react';
import { Trophy, History, PlayCircle, PlusCircle, HelpCircle, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  activeTab: 'live' | 'leaderboard' | 'history' | 'new-match';
  setActiveTab: (tab: 'live' | 'leaderboard' | 'history' | 'new-match') => void;
  hasActiveMatch: boolean;
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasActiveMatch,
  onOpenRules,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#080d0a]/90 backdrop-blur-md border-b border-emerald-900/40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div 
          onClick={() => setActiveTab(hasActiveMatch ? 'live' : 'leaderboard')}
          className="flex items-center space-x-2.5 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50 border border-emerald-400/30">
            <span className="text-xl">🎱</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Snooker<span className="text-emerald-400">Track</span>
            </h1>
            <p className="text-[10px] text-emerald-400/70 -mt-0.5 font-medium hidden sm:block">
              Group Rankings & Live Scorer
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {hasActiveMatch && (
            <button
              onClick={() => setActiveTab('live')}
              className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'live'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-gray-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-0.5" />
              <PlayCircle className="w-4 h-4" />
              <span>Live</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-gray-300 hover:text-white hover:bg-emerald-950/40'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">Leaderboard</span>
            <span className="xs:hidden">Rank</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-gray-300 hover:text-white hover:bg-emerald-950/40'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden xs:inline">History</span>
          </button>

          <button
            onClick={() => setActiveTab('new-match')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'new-match'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Match</span>
          </button>
        </nav>

        {/* Right Tools: Supabase Status & Rules Help */}
        <div className="flex items-center space-x-2">
          {/* Cloud Status */}
          <div 
            title={isSupabaseConfigured ? 'Connected to Supabase Cloud Database' : 'Running in Offline / LocalStorage mode (Supabase credentials not set)'}
            className={`hidden md:flex items-center space-x-1 px-2 py-1 rounded-full text-[11px] font-medium border ${
              isSupabaseConfigured
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>{isSupabaseConfigured ? 'Supabase' : 'Offline Mode'}</span>
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            )}
          </div>

          <button
            onClick={onOpenRules}
            className="p-2 text-gray-400 hover:text-white hover:bg-emerald-950/40 rounded-lg transition"
            title="Snooker Rules & Math Guide"
            aria-label="Snooker Rules"
          >
            <HelpCircle className="w-5 h-5 text-emerald-400" />
          </button>
        </div>

      </div>
    </header>
  );
};
