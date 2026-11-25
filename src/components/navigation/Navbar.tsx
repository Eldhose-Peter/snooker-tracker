'use client';

import React from 'react';
import { 
  Trophy, 
  History, 
  PlayCircle, 
  PlusCircle, 
  Sparkles, 
  Database, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SnookerIcon } from './SnookerIcon';

interface NavbarProps {
  activeTab: 'live' | 'leaderboard' | 'history' | 'new-match';
  setActiveTab: (tab: 'live' | 'leaderboard' | 'history' | 'new-match') => void;
  hasActiveMatch: boolean;
  onOpenAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasActiveMatch,
  onOpenAssistant,
}) => {
  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* PINNED TOP NAVIGATION HEADER (LIQUID GLASS APP BAR)              */}
      {/* ----------------------------------------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-white/85 dark:bg-black/85 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] pt-[env(safe-area-inset-top,0px)] will-change-transform transform-gpu">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
          
          {/* Brand (SnookerTrack + Live Status) */}
          <div 
            onClick={() => setActiveTab(hasActiveMatch ? 'live' : 'new-match')}
            className="flex items-center space-x-2.5 cursor-pointer select-none group min-h-[44px] min-w-0 bg-transparent"
            role="button"
            tabIndex={0}
            aria-label="SnookerTrack Home"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-400/25 flex items-center justify-center shadow-sm dark:shadow-[0_0_12px_rgba(16,185,129,0.12)] flex-shrink-0 group-hover:scale-105 group-active:scale-95 transition-all duration-200">
              <SnookerIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-[var(--label)] flex items-center gap-1.5 leading-none">
                <span className="truncate">Snooker<span className="text-emerald-500 dark:text-emerald-400">Track</span></span>
                {hasActiveMatch && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-[9px] font-semibold flex items-center gap-1 tracking-wide flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" /> Live
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-[var(--label-3)] font-medium hidden sm:block mt-0.5 tracking-tight truncate">
                Tournament Scorer & Club Leaderboard
              </p>
            </div>
          </div>

            {/* Desktop Navigation Tabs (Styled as Apple segmented Liquid Glass pills) */}
            <nav aria-label="Desktop Navigation" className="hidden md:flex items-center space-x-1">
              {hasActiveMatch && (
                <button
                  type="button"
                  onClick={() => setActiveTab('live')}
                  aria-current={activeTab === 'live' ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer min-h-[36px] active:scale-[0.97] active:opacity-80 ${
                    activeTab === 'live'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-[var(--label-2)] hover:text-[var(--label)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <PlayCircle className="w-4 h-4" />
                  <span>Live Frame</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('new-match')}
                aria-current={activeTab === 'new-match' ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer min-h-[36px] active:scale-[0.97] active:opacity-80 ${
                  activeTab === 'new-match'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-[var(--label-2)] hover:text-[var(--label)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Start Match</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                aria-current={activeTab === 'leaderboard' ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer min-h-[36px] active:scale-[0.97] active:opacity-80 ${
                  activeTab === 'leaderboard'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-[var(--label-2)] hover:text-[var(--label)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Leaderboard</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                aria-current={activeTab === 'history' ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer min-h-[36px] active:scale-[0.97] active:opacity-80 ${
                  activeTab === 'history'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-[var(--label-2)] hover:text-[var(--label)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>
            </nav>

            {/* Right Tools: Supabase Cloud Connectivity & Rules Help */}
            <div className="flex items-center space-x-1.5">
              {/* Cloud Status */}
              <div 
                title={isSupabaseConfigured ? 'Connected to Supabase Cloud' : 'Running in Offline mode'}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--label-2)] border-black/[0.06] dark:border-white/[0.08]'
                }`}
              >
                <Database className="w-3 h-3" />
                <span className="hidden sm:inline">{isSupabaseConfigured ? 'Cloud' : 'Offline'}</span>
                {isSupabaseConfigured ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-[var(--label-3)]" />
                )}
              </div>

              {/* AI Referee Assistant Modal Trigger (44x44pt hit target) */}
              <button
                type="button"
                onClick={onOpenAssistant}
                className="relative w-11 h-11 flex items-center justify-center text-[var(--label-2)] hover:text-[var(--label)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-full transition-transform duration-200 active:scale-95 cursor-pointer flex-shrink-0"
                title="AI Referee Assistant"
                aria-label="AI Referee Assistant"
              >
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                {hasActiveMatch && (
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>

        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* FLOATING BOTTOM LIQUID GLASS TAB BAR (APPLE CAPSULE ISLAND)       */}
      {/* ----------------------------------------------------------------- */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed left-1/2 -translate-x-1/2 bottom-[max(12px,env(safe-area-inset-bottom,12px))] z-40 w-[calc(100%-20px)] max-w-sm grid grid-cols-4 gap-1 p-1 rounded-full glass border border-white/25 dark:border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.65)] select-none pointer-events-auto md:hidden"
      >
        {/* TAB 1: LIVE MATCH */}
        <button
          type="button"
          onClick={() => setActiveTab(hasActiveMatch ? 'live' : 'new-match')}
          aria-label={hasActiveMatch ? "Live Game" : "Live"}
          aria-current={activeTab === 'live' ? 'page' : undefined}
          className={`w-full min-h-[44px] h-[46px] px-1 flex flex-col items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-[0.96] active:opacity-80 ${
            activeTab === 'live'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
              : 'text-[var(--label-2)] hover:text-[var(--label)]'
          }`}
        >
          <div className="relative">
            <PlayCircle className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'live' ? 'scale-110 text-emerald-600 dark:text-emerald-400' : 'text-[var(--label-2)]'}`} />
            {hasActiveMatch && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight font-medium mt-0.5 truncate max-w-full px-0.5">
            {hasActiveMatch ? 'Live Game' : 'Live'}
          </span>
        </button>

        {/* TAB 2: START MATCH */}
        <button
          type="button"
          onClick={() => setActiveTab('new-match')}
          aria-label="Start Game"
          aria-current={activeTab === 'new-match' ? 'page' : undefined}
          className={`w-full min-h-[44px] h-[46px] px-1 flex flex-col items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-[0.96] active:opacity-80 ${
            activeTab === 'new-match'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
              : 'text-[var(--label-2)] hover:text-[var(--label)]'
          }`}
        >
          <PlusCircle className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'new-match' ? 'scale-110 text-emerald-600 dark:text-emerald-400' : 'text-[var(--label-2)]'}`} />
          <span className="text-[10px] tracking-tight font-medium mt-0.5 truncate max-w-full px-0.5">Start Game</span>
        </button>

        {/* TAB 3: LEADERBOARD */}
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          aria-label="Rankings"
          aria-current={activeTab === 'leaderboard' ? 'page' : undefined}
          className={`w-full min-h-[44px] h-[46px] px-1 flex flex-col items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-[0.96] active:opacity-80 ${
            activeTab === 'leaderboard'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
              : 'text-[var(--label-2)] hover:text-[var(--label)]'
          }`}
        >
          <Trophy className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'leaderboard' ? 'scale-110 text-amber-500 dark:text-amber-400' : 'text-[var(--label-2)]'}`} />
          <span className="text-[10px] tracking-tight font-medium mt-0.5 truncate max-w-full px-0.5">Rankings</span>
        </button>

        {/* TAB 4: HISTORY */}
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          aria-label="History"
          aria-current={activeTab === 'history' ? 'page' : undefined}
          className={`w-full min-h-[44px] h-[46px] px-1 flex flex-col items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-[0.96] active:opacity-80 ${
            activeTab === 'history'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
              : 'text-[var(--label-2)] hover:text-[var(--label)]'
          }`}
        >
          <History className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'history' ? 'scale-110 text-emerald-600 dark:text-emerald-400' : 'text-[var(--label-2)]'}`} />
          <span className="text-[10px] tracking-tight font-medium mt-0.5 truncate max-w-full px-0.5">History</span>
        </button>
      </nav>
    </>
  );
};
