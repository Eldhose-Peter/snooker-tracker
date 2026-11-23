'use client';

import React, { useEffect } from 'react';
import { BookOpen, ShieldAlert, Sparkles, Flame } from 'lucide-react';
import { BALL_CONFIGS } from '@/types/snooker';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  // Support Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-xl bg-white dark:bg-[#1c1c1e] rounded-t-[20px] sm:rounded-2xl max-h-[88vh] flex flex-col shadow-2xl border-t sm:border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple 36x5px Grabber Pill */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-[36px] h-[5px] rounded-full bg-black/20 dark:bg-white/20" />
        </div>

        {/* Apple Navigation Bar with Title & Trailing "Done" Button */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-lg sticky top-0 z-10">
          <div className="w-12" /> {/* Leading spacer to center title */}
          <h2 className="text-[17px] font-semibold text-zinc-900 dark:text-white text-center">
            Rules & Scoring
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-emerald-600 dark:text-emerald-400 font-semibold text-[17px] hover:opacity-80 active:opacity-60 transition cursor-pointer min-h-[44px] min-w-[48px] flex items-center justify-end select-none"
          >
            Done
          </button>
        </div>

        {/* Scrollable Body: Grouped Inset Cards */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Grouped Inset Card 1: Snooker Ball Values (Aramith Colored Badges) */}
          <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-2xl p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Snooker Ball Values</span>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {Object.values(BALL_CONFIGS).map((b) => (
                <div
                  key={b.type}
                  className="p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.06] text-center flex flex-col items-center justify-center shadow-xs"
                >
                  <div
                    className="w-6 h-6 rounded-full mb-1.5 shadow-md ring-1 ring-black/10 dark:ring-white/10"
                    style={{ 
                      backgroundColor: b.colorHex,
                      boxShadow: 'inset 0 1.5px 2px rgba(255, 255, 255, 0.45), inset 0 -2.5px 4px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0,0,0,0.25)' 
                    }}
                  />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white font-mono tabular-nums leading-none">
                    {b.points}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 capitalize">
                    {b.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Grouped Inset Card 2: Foul Penalties */}
          <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-2xl p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Foul Penalties & Awards</span>
            </div>
            <ul className="text-[13px] text-zinc-700 dark:text-zinc-300 space-y-1.5 leading-relaxed">
              <li>
                <strong className="text-zinc-900 dark:text-white">4 Points Minimum:</strong> Standard fouls (cue ball in-off, touching any ball, missing ball on, or fouling on red or yellow/green/brown) award 4 points to opponent(s).
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-white">Higher Value Balls:</strong> If Blue (5), Pink (6), or Black (7) was involved or nominated as the ball on, the penalty is equal to that ball&apos;s higher value.
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-white">Next Player Options:</strong> After any foul, the incoming player may accept the table as it lies or require the fouling player to play again from that position.
              </li>
            </ul>
          </div>

          {/* Grouped Inset Card 3: Snookers Math & Maximum Break */}
          <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-2xl p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Snookers Math & Points Remaining</span>
            </div>
            <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
              While reds remain, each red can yield up to 8 points (1 for red + 7 for nominated black), followed by the 27 points of all 6 colors in clearance sequence.
            </p>
            <div className="bg-white dark:bg-[#1c1c1e] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] font-mono text-[12px] space-y-1 text-zinc-800 dark:text-zinc-200">
              <div>• Table Remaining: <code>(Reds × 8) + 27</code> (Max 147 break)</div>
              <div>• On a nominated Color: <code>7 + (Reds × 8) + 27</code></div>
              <div>• Sequence: Yellow (27) → Green (25) → Brown (22) → Blue (18) → Pink (13) → Black (7)</div>
              <div>• Snookers Formula: <code>⌈(Deficit - Points Remaining) / 4⌉</code></div>
            </div>
          </div>

          {/* Grouped Inset Card 4: Free Ball & Red Ball Rules */}
          <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-2xl p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Ball & Red Ball Rules</span>
            </div>
            <ul className="text-[13px] text-zinc-700 dark:text-zinc-300 space-y-1.5 leading-relaxed">
              <li>
                <strong className="text-zinc-900 dark:text-white">Free Ball (WPBSA 3.12):</strong> Awarded when an opponent foul snookers the incoming striker on all balls on. Any nominated ball acts as the ball on and is respotted (enabling breaks up to 155).
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-white">Reds Pocketed on Fouls:</strong> Any red ball pocketed during a foul remains in the pocket and is <em>never</em> respotted in official snooker.
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-white">Multiple Reds in One Stroke:</strong> A striker may legally pot multiple reds in a single stroke (Rule 3.3a), scoring 1 point for each red pocketed.
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
