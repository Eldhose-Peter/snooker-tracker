'use client';

import React from 'react';
import { 
  Trophy, 
  History, 
  PlayCircle, 
  PlusCircle, 
  HelpCircle, 
  Database, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
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
    <>
      {/* ----------------------------------------------------------------- */}
      {/* TOP HEADER (Brand, Cloud Status, Rules Help, Desktop Nav)        */}
      {/* ----------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-[#080d0a]/95 backdrop-blur-md border-b border-emerald-900/40">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          
          {/* Brand */}
          <div 
            onClick={() => setActiveTab(hasActiveMatch ? 'live' : 'new-match')}
            className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50 border border-emerald-400/30 flex-shrink-0">
              <span className="text-lg sm:text-xl">🎱</span>
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Snooker<span className="text-emerald-400">Track</span>
                {hasActiveMatch && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" /> Live
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-emerald-400/70 -mt-0.5 font-medium hidden sm:block">
                Group Rankings & Live Scorer
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile, mobile uses bottom bar) */}
          <nav className="hidden md:flex items-center space-x-1.5">
            {hasActiveMatch && (
              <button
                onClick={() => setActiveTab('live')}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'live'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                    : 'text-gray-300 hover:text-white hover:bg-emerald-950/40'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-0.5" />
                <PlayCircle className="w-4 h-4" />
                <span>Live Frame</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('new-match')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'new-match'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Start Match</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-gray-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-gray-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>

          {/* Right Tools: Supabase Status & Rules Help */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Cloud Status */}
            <div 
              title={isSupabaseConfigured ? 'Connected to Supabase Cloud Database' : 'Running in Offline / LocalStorage mode'}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-medium border ${
                isSupabaseConfigured
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
              }`}
            >
              <Database className="w-3 h-3" />
              <span className="hidden sm:inline">{isSupabaseConfigured ? 'Supabase' : 'Offline Mode'}</span>
              {isSupabaseConfigured ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400" />
              )}
            </div>

            <button
              onClick={onOpenRules}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-emerald-950/40 rounded-xl transition cursor-pointer"
              title="Snooker Rules & Math Guide"
              aria-label="Snooker Rules"
            >
              <HelpCircle className="w-5 h-5 text-emerald-400" />
            </button>
          </div>

        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly iOS/Android app bar) */}
      {/* ----------------------------------------------------------------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080d0a]/95 backdrop-blur-xl border-t border-emerald-900/60 md:hidden pb-safe shadow-2xl">
        <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-2">
          
          {/* TAB 1: LIVE MATCH */}
          <button
            type="button"
            onClick={() => setActiveTab(hasActiveMatch ? 'live' : 'new-match')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer relative ${
              activeTab === 'live'
                ? 'text-emerald-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="relative">
              <PlayCircle className={`w-5 h-5 ${activeTab === 'live' ? 'text-emerald-400' : 'text-gray-400'}`} />
              {hasActiveMatch && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <span className="text-[10px] tracking-tight">
              {hasActiveMatch ? 'Live Game' : 'Live'}
            </span>
            {activeTab === 'live' && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          {/* TAB 2: START GAME / NEW MATCH */}
          <button
            type="button"
            onClick={() => setActiveTab('new-match')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer relative ${
              activeTab === 'new-match'
                ? 'text-emerald-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <PlusCircle className={`w-5 h-5 ${activeTab === 'new-match' ? 'text-emerald-400' : 'text-gray-400'}`} />
            <span className="text-[10px] tracking-tight">Start Game</span>
            {activeTab === 'new-match' && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          {/* TAB 3: LEADERBOARD */}
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer relative ${
              activeTab === 'leaderboard'
                ? 'text-emerald-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Trophy className={`w-5 h-5 ${activeTab === 'leaderboard' ? 'text-amber-400' : 'text-gray-400'}`} />
            <span className="text-[10px] tracking-tight">Rankings</span>
            {activeTab === 'leaderboard' && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          {/* TAB 4: HISTORY */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer relative ${
              activeTab === 'history'
                ? 'text-emerald-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <History className={`w-5 h-5 ${activeTab === 'history' ? 'text-emerald-400' : 'text-gray-400'}`} />
            <span className="text-[10px] tracking-tight">History</span>
            {activeTab === 'history' && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

        </div>
      </nav>
    </>
  );
};

