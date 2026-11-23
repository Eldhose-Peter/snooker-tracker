'use client';

import React from 'react';
import { X, BookOpen, ShieldAlert, Sparkles, Flame } from 'lucide-react';
import { BALL_CONFIGS } from '@/types/snooker';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-white/10 rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-5 sm:p-7 shadow-2xl space-y-5 bg-[#0c140f]/95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 sticky top-0 bg-[#0c140f]/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Snooker Rules & Math Engine
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ball Values Grid */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400">
            Ball Point Values
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {Object.values(BALL_CONFIGS).map((b) => (
              <div
                key={b.type}
                className="p-2 rounded-xl glass-panel border border-white/[0.06] text-center flex flex-col items-center justify-center bg-black/20"
              >
                <div
                  className="w-5 h-5 rounded-full mb-1 shadow-md ring-1 ring-white/10"
                  style={{ backgroundColor: b.colorHex }}
                />
                <span className="text-sm font-black text-white font-mono tabular-nums">{b.points}</span>
                <span className="text-[10px] text-zinc-400">{b.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Points Remaining Math */}
        <div className="space-y-2 glass-panel p-3.5 rounded-2xl border border-white/[0.06] text-xs bg-black/20">
          <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-300 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            Points Remaining on Table (Max Break 147)
          </h4>
          <p className="text-zinc-300 leading-relaxed">
            While reds remain, each red can be followed by the Black ball (1 + 7 = 8 points), followed by the 6 colors (27 points).
          </p>
          <div className="bg-black/50 p-2.5 rounded-xl font-mono text-emerald-300 text-[11px] space-y-1 border border-white/[0.04]">
            <div>• With Reds on table: <code>(Reds × 8) + 27</code></div>
            <div>• On a nominated Color: <code>7 + (Reds × 8) + 27</code></div>
            <div>• Colors sequence: Yellow (27) → Green (25) → Brown (22) → Blue (18) → Pink (13) → Black (7)</div>
          </div>
        </div>

        {/* Snookers Required Formula */}
        <div className="space-y-2 glass-panel p-3.5 rounded-2xl border border-white/[0.06] text-xs bg-black/20">
          <h4 className="text-xs uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Snookers Required Calculation
          </h4>
          <p className="text-zinc-300 leading-relaxed">
            If the trailing player&apos;s score plus the remaining points on the table cannot overtake the leader:
          </p>
          <div className="bg-black/50 p-2.5 rounded-xl font-mono text-amber-300 text-[11px] border border-white/[0.04]">
            Points Deficit = Leader Score - (Trailer Score + Table Remaining)<br />
            Snookers Required = ⌈Points Deficit / 4⌉
          </div>
          <p className="text-zinc-500 text-[11px]">
            (4 points is the minimum penalty awarded for any opponent foul).
          </p>
        </div>

        {/* Red Ball Rules & Table Mechanics */}
        <div className="space-y-2 glass-panel p-3.5 rounded-2xl border border-white/[0.06] text-xs bg-black/20">
          <h4 className="text-xs uppercase font-bold tracking-wider text-red-400 flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 inline-block shadow-sm" />
            Red Ball Rules & Count Mechanics
          </h4>
          <ul className="list-disc pl-4 space-y-1.5 text-zinc-300">
            <li>
              <strong>Reds Pocketed on Fouls (Never Respotted):</strong> In official snooker, if any red ball is pocketed or knocked off the table during a foul, it remains in the pocket and is <em>never</em> respotted. The app allows recording reds pocketed during a foul, or tapping the red pill on the HUD to deduct it.
            </li>
            <li>
              <strong>Multiple Reds in One Stroke (WPBSA Rule 3.3a):</strong> Striker may legally pot two or more reds in the same shot. Each red scores 1 point and remains in the pocket. You can adjust the remaining red count directly via the scoreboard HUD.
            </li>
            <li>
              <strong>Free Ball with Reds:</strong> If a player nominates a colour as a Free Ball when reds are on, potting it scores 1 point and the colour is <em>respotted</em>. The remaining reds on the table do <em>not</em> decrease (enabling breaks up to 155). If an actual red is potted, it is not respotted and decrements the red count.
            </li>
          </ul>
        </div>

        {/* Fouls & Free Ball */}
        <div className="space-y-2 glass-panel p-3.5 rounded-2xl border border-white/[0.06] text-xs bg-black/20">
          <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Fouls & Free Ball Rules
          </h4>
          <ul className="list-disc pl-4 space-y-1 text-zinc-300">
            <li><strong>Foul Penalty:</strong> 4 points minimum, or 5 (Blue), 6 (Pink), 7 (Black) if higher value ball was involved. Points are awarded directly to opponent.</li>
            <li><strong>Free Ball:</strong> If an opponent fouls and leaves the incoming player snookered on all balls on, the referee awards a Free Ball. Any ball can be nominated and counts as the ball on.</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-sm shadow-md shadow-emerald-950/60 transition active:scale-[0.98]"
        >
          Got it
        </button>

      </div>
    </div>
  );
};
