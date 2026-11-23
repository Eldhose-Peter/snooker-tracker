'use client';

import React, { useState, useMemo } from 'react';
import { Frame, Player } from '@/types/snooker';
import { computeFrameInsights } from './analytics';
import { ScoreProgressionChart } from './ScoreProgressionChart';
import { BallDistributionChart } from './BallDistributionChart';
import { BreakAnalyticsCard } from './BreakAnalyticsCard';
import { DisciplineCard } from './DisciplineCard';
import { EventTimelineFeed } from './EventTimelineFeed';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Flame, 
  ShieldAlert, 
  ListFilter, 
  Clock
} from 'lucide-react';

interface FrameInsightsViewProps {
  frame: Frame;
  players: Player[];
}

export const FrameInsightsView: React.FC<FrameInsightsViewProps> = ({
  frame,
  players,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'balls' | 'breaks' | 'discipline' | 'log'>('timeline');

  const events = useMemo(() => frame.events || [], [frame.events]);
  const hasEvents = events.length > 0;

  const scores = useMemo(() => {
    return frame.scores && frame.scores.length === players.length
      ? frame.scores
      : [frame.player1_score, frame.player2_score];
  }, [frame, players]);

  const insights = useMemo(() => {
    if (!hasEvents) return null;
    return computeFrameInsights(events, players, scores);
  }, [events, players, scores, hasEvents]);

  if (!hasEvents || !insights) {
    return (
      <div className="bg-white dark:bg-[#07100b] border border-black/[0.08] dark:border-emerald-950/80 rounded-2xl p-5 text-center space-y-3 shadow-xs">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/40 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
            Frame {frame.frame_number} Summary
          </h4>
          <p className="text-xs text-zinc-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            Detailed shot telemetry was not recorded for this historical frame. Granular event tracking and progression charts are active for all newly scored games!
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono text-xs">
          {players.map((p, idx) => (
            <div key={p.id} className="bg-zinc-100 dark:bg-gray-900/80 px-3 py-1.5 rounded-xl border border-black/[0.06] dark:border-gray-800">
              <span className="text-zinc-600 dark:text-gray-400">{p.name}: </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-black">{scores[idx] ?? 0} pts</span>
            </div>
          ))}
          {frame.highest_break > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
              <span>High Break: {frame.highest_break}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return 'Just now';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-4">
      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-[#07110c] border border-black/[0.08] dark:border-emerald-950 rounded-xl text-xs shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-zinc-900 dark:text-white">
            Frame {frame.frame_number} Insights
          </span>
          <span className="text-zinc-400 dark:text-gray-600">•</span>
          <span className="text-zinc-600 dark:text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
            {formatDuration(insights.durationSeconds)}
          </span>
          <span className="text-zinc-400 dark:text-gray-600">•</span>
          <span className="text-zinc-600 dark:text-gray-400">
            {insights.totalEvents} shots & events
          </span>
        </div>

        {insights.breaks.length > 0 && (
          <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-300 font-mono font-semibold">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
            <span>High Run: {insights.breaks[0].totalPoints} ({insights.breaks[0].playerName})</span>
          </div>
        )}
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-black/[0.08] dark:border-emerald-950/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-gray-900/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Score Progression</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balls')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'balls'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-gray-900/60'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Ball Potting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('breaks')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'breaks'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-gray-900/60'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Breaks ({insights.breaks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discipline')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'discipline'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-gray-900/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Discipline & Fouls</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'log'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-gray-900/60'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Shot Log ({events.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'timeline' && (
        <ScoreProgressionChart
          timeline={insights.timeline}
          players={players}
          leadChanges={insights.leadChanges}
        />
      )}

      {activeTab === 'balls' && (
        <BallDistributionChart
          scoringSources={insights.scoringSources}
        />
      )}

      {activeTab === 'breaks' && (
        <BreakAnalyticsCard
          breaks={insights.breaks}
          visitStats={insights.visitStats}
        />
      )}

      {activeTab === 'discipline' && (
        <DisciplineCard
          discipline={insights.discipline}
        />
      )}

      {activeTab === 'log' && (
        <EventTimelineFeed
          events={events}
          players={players}
        />
      )}
    </div>
  );
};
