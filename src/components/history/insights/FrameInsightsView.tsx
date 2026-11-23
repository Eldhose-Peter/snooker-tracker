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
      <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-600 dark:text-[#30d158]">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-[#f5f5f7]">
            Frame {frame.frame_number} Summary
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            Granular shot telemetry was not recorded for this historical frame. Active telemetry and trend curves are enabled for newly scored games.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 font-mono text-xs">
          {players.map((p, idx) => (
            <div key={p.id} className="bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-zinc-600 dark:text-zinc-400">{p.name}: </span>
              <span className="text-emerald-700 dark:text-[#30d158] font-bold">{scores[idx] ?? 0} pts</span>
            </div>
          ))}
          {frame.highest_break > 0 && (
            <div className="bg-amber-400/15 px-3 py-1.5 rounded-full border border-amber-400/30 text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
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
    <div className="space-y-4 font-sans">
      {/* Apple Health App Style Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[#0091ff]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
              Frame Duration
            </span>
            <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-[#f5f5f7]">
              {formatDuration(insights.durationSeconds)}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-[#30d158]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
              Total Shots
            </span>
            <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-[#f5f5f7]">
              {insights.totalEvents} actions
            </span>
          </div>
        </div>

        {insights.breaks.length > 0 ? (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center space-x-3 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-500">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                Top Break
              </span>
              <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {insights.breaks[0].totalPoints} pts <span className="text-xs font-normal text-zinc-400 font-sans">({insights.breaks[0].playerName})</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center space-x-3 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center text-zinc-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                Lead Changes
              </span>
              <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-[#f5f5f7]">
                {insights.leadChanges} changes
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Apple Segmented Control for Insights Tabs */}
      <div className="flex overflow-x-auto p-1 bg-black/[0.05] dark:bg-white/[0.08] rounded-full border border-black/[0.04] dark:border-white/[0.04] scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`min-h-[36px] flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition active:scale-[0.97] whitespace-nowrap cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Progression</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balls')}
          className={`min-h-[36px] flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition active:scale-[0.97] whitespace-nowrap cursor-pointer ${
            activeTab === 'balls'
              ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Ball Potting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('breaks')}
          className={`min-h-[36px] flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition active:scale-[0.97] whitespace-nowrap cursor-pointer ${
            activeTab === 'breaks'
              ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Breaks ({insights.breaks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discipline')}
          className={`min-h-[36px] flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition active:scale-[0.97] whitespace-nowrap cursor-pointer ${
            activeTab === 'discipline'
              ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Discipline</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`min-h-[36px] flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition active:scale-[0.97] whitespace-nowrap cursor-pointer ${
            activeTab === 'log'
              ? 'bg-white dark:bg-[#2c2c2e] text-zinc-900 dark:text-[#f5f5f7] shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Event Feed ({events.length})</span>
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
