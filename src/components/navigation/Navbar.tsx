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
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#070908]/85 backdrop-blur-2xl border-b border-zinc-200/80 dark:border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
          
          {/* Brand */}
          <div 
            onClick={() => setActiveTab(hasActiveMatch ? 'live' : 'new-match')}
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-700 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-white/20 flex-shrink-0 group-active:scale-95 transition-transform">
              <span className="text-base leading-none">🎱</span>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
                Snooker<span className="text-emerald-600 dark:text-emerald-400">Track</span>
                {hasActiveMatch && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[9px] font-bold flex items-center gap-1 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" /> Live
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400/80 font-medium hidden sm:block mt-0.5">
                Tournament Scorer & Club Leaderboard
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile, mobile uses bottom bar) */}
          <nav className="hidden md:flex items-center space-x-1">
            {hasActiveMatch && (
              <button
                onClick={() => setActiveTab('live')}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'live'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.05]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <PlayCircle className="w-4 h-4" />
                <span>Live Frame</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('new-match')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'new-match'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.05]'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start Match</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.05]'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.05]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>

          {/* Right Tools: Supabase Status & Rules Help */}
          <div className="flex items-center space-x-1.5">
            {/* Cloud Status */}
            <div 
              title={isSupabaseConfigured ? 'Connected to Supabase Cloud' : 'Running in Offline mode'}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.06]'
              }`}
            >
              <Database className="w-3 h-3" />
              <span className="hidden sm:inline">{isSupabaseConfigured ? 'Cloud' : 'Offline'}</span>
              {isSupabaseConfigured ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              )}
            </div>

            <button
              onClick={onOpenRules}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer active:scale-95"
              title="Snooker Rules & Guide"
              aria-label="Snooker Rules & Guide"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400/90" />
            </button>
          </div>

        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-optimized iOS app bar)        */}
      {/* ----------------------------------------------------------------- */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#070908]/90 backdrop-blur-2xl border-t border-zinc-200/80 dark:border-white/[0.07] md:hidden pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="grid grid-cols-4 h-14 max-w-md mx-auto px-2">
          
          {/* TAB 1: LIVE MATCH */}
          <button
            type="button"
            onClick={() => setActiveTab(hasActiveMatch ? 'live' : 'new-match')}
            className={`flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer relative active:scale-95 ${
              activeTab === 'live'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <PlayCircle className={`w-5 h-5 transition-transform duration-150 ${activeTab === 'live' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-zinc-500 dark:text-zinc-400'}`} />
              {hasActiveMatch && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] tracking-tight font-medium">
              {hasActiveMatch ? 'Live Game' : 'Live'}
            </span>
            {activeTab === 'live' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
            )}
          </button>

          {/* TAB 2: START GAME / NEW MATCH */}
          <button
            type="button"
            onClick={() => setActiveTab('new-match')}
            className={`flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer relative active:scale-95 ${
              activeTab === 'new-match'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <PlusCircle className={`w-5 h-5 transition-transform duration-150 ${activeTab === 'new-match' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-zinc-500 dark:text-zinc-400'}`} />
            <span className="text-[10px] tracking-tight font-medium">Start Game</span>
            {activeTab === 'new-match' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
            )}
          </button>

          {/* TAB 3: LEADERBOARD */}
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer relative active:scale-95 ${
              activeTab === 'leaderboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Trophy className={`w-5 h-5 transition-transform duration-150 ${activeTab === 'leaderboard' ? 'text-amber-500 dark:text-amber-400 scale-105' : 'text-zinc-500 dark:text-zinc-400'}`} />
            <span className="text-[10px] tracking-tight font-medium">Rankings</span>
            {activeTab === 'leaderboard' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
            )}
          </button>

          {/* TAB 4: HISTORY */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer relative active:scale-95 ${
              activeTab === 'history'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <History className={`w-5 h-5 transition-transform duration-150 ${activeTab === 'history' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-zinc-500 dark:text-zinc-400'}`} />
            <span className="text-[10px] tracking-tight font-medium">History</span>
            {activeTab === 'history' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
            )}
          </button>

        </div>
      </nav>
    </>
  );
};
