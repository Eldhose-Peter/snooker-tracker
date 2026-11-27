'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ArrowUp,
  Square,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { getLiveSession } from '@/lib/storage';
import {
  buildRefereeMatchContext,
  getQuickRefereeSuggestions,
  type RefereeChatMessage,
  type RefereeMatchContext,
} from '@/lib/referee-context';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Render inline **bold** and `code` spans safely without dangerouslySetInnerHTML.
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-zinc-950 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.1] font-mono text-[12px] text-zinc-900 dark:text-zinc-100"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Lightweight, safe markdown block renderer for assistant replies.
 */
const FormattedAssistantText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: { ordered: boolean; text: string }[] = [];
  let keyCounter = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const Tag = isOrdered ? 'ol' : 'ul';
    elements.push(
      <Tag
        key={`list-${keyCounter++}`}
        className={`space-y-1 pl-4 ${
          isOrdered ? 'list-decimal' : 'list-disc'
        } marker:text-emerald-600 dark:marker:text-emerald-400`}
      >
        {listItems.map((item, idx) => (
          <li key={`li-${idx}`} className="leading-relaxed">
            {renderInlineFormatting(item.text)}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (listItems.length > 0 && listItems[0].ordered) flushList();
      listItems.push({ ordered: false, text: bulletMatch[1] });
    } else if (orderedMatch) {
      if (listItems.length > 0 && !listItems[0].ordered) flushList();
      listItems.push({ ordered: true, text: orderedMatch[1] });
    } else {
      flushList();
      const headingMatch = line.match(/^#{1,3}\s+(.*)$/);
      if (headingMatch) {
        elements.push(
          <p
            key={`h-${keyCounter++}`}
            className="font-semibold text-zinc-950 dark:text-white leading-snug pt-0.5"
          >
            {renderInlineFormatting(headingMatch[1])}
          </p>
        );
      } else {
        elements.push(
          <p key={`p-${keyCounter++}`} className="leading-relaxed">
            {renderInlineFormatting(line)}
          </p>
        );
      }
    }
  }

  flushList();

  return <div className="space-y-2 text-[14px] text-zinc-800 dark:text-zinc-200">{elements}</div>;
};

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<RefereeChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contextTick, setContextTick] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Read fresh live match state whenever modal opens or a message is sent
  const context: RefereeMatchContext = useMemo(() => {
    void contextTick;
    if (!isOpen || typeof window === 'undefined') {
      return { hasActiveMatch: false };
    }
    return buildRefereeMatchContext(getLiveSession());
  }, [isOpen, contextTick]);

  const quickSuggestions = useMemo(
    () => getQuickRefereeSuggestions(context),
    [context]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const handleClearChat = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setInput('');
    setErrorMessage(null);
    setContextTick((t) => t + 1);
  }, [stopStreaming]);

  const handleClose = useCallback(() => {
    handleClearChat();
    onClose();
  }, [handleClearChat, onClose]);

  // Support Escape key to close and cancel active stream on close/unmount
  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Keep chat scrolled to newest streamed tokens
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming, errorMessage]);

  const sendQuestion = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || isStreaming) return;

      const freshContext =
        typeof window !== 'undefined'
          ? buildRefereeMatchContext(getLiveSession())
          : { hasActiveMatch: false };
      setContextTick((t) => t + 1);

      const userMsg: RefereeChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question,
        createdAt: Date.now(),
      };
      const assistantId = `assistant-${Date.now() + 1}`;
      const assistantPlaceholder: RefereeChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      const nextHistory = [...messages, userMsg];
      setMessages([...nextHistory, assistantPlaceholder]);
      setInput('');
      setErrorMessage(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch('/api/referee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
            context: freshContext,
          }),
        });

        if (!res.ok) {
          let serverError = `Request failed (${res.status})`;
          try {
            const payload = (await res.json()) as { error?: string };
            if (payload.error) serverError = payload.error;
          } catch {
            // fallback to generic message
          }
          setMessages(nextHistory);
          setErrorMessage(serverError);
          setIsStreaming(false);
          return;
        }

        if (!res.body) {
          setMessages(nextHistory);
          setErrorMessage('Empty response stream from referee service.');
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
          );
        }

        accumulated += decoder.decode();
        if (!accumulated.trim()) {
          setMessages(nextHistory);
          setErrorMessage('No response received from Gemini 4 Hydrogen.');
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          );
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') {
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantId || m.content.trim().length > 0)
          );
        } else {
          setMessages(nextHistory);
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Unable to reach AI Referee. Check your connection and try again.'
          );
        }
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [isStreaming, messages]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion(input);
    }
  };

  if (!isOpen) return null;

  const foulsCount = context.foulEvents?.length || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-referee-title"
    >
      <div
        className="w-full sm:max-w-xl bg-white dark:bg-[#1c1c1e] rounded-t-[24px] sm:rounded-[28px] h-[88dvh] sm:h-[82vh] max-h-[88dvh] flex flex-col shadow-2xl border-t sm:border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-[#f5f5f7] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple 36x5px Grabber Pill */}
        <div className="pt-2.5 pb-1 flex justify-center flex-shrink-0">
          <div className="w-[36px] h-[5px] rounded-full bg-black/20 dark:bg-white/20" />
        </div>

        {/* Apple Navigation Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2 border-b border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-lg flex-shrink-0">
          <div className="min-w-[60px] flex items-center justify-start">
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={handleClearChat}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium text-[15px] min-h-[44px] px-1 flex items-center gap-1 transition cursor-pointer active:opacity-70 select-none"
                title="Clear conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            ) : (
              <div className="w-14" />
            )}
          </div>

          <div className="text-center min-w-0">
            <h2
              id="ai-referee-title"
              className="text-[17px] font-semibold text-zinc-900 dark:text-white leading-tight flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>AI Referee</span>
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight truncate">
              {context.hasActiveMatch
                ? `Live • Frame ${context.currentFrameNum ?? 1} Context`
                : 'Rules, Fouls & Match Doubts'}
            </p>
          </div>

          <div className="min-w-[60px] flex items-center justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="text-emerald-600 dark:text-emerald-400 font-semibold text-[17px] hover:opacity-80 active:opacity-60 transition cursor-pointer min-h-[44px] min-w-[48px] flex items-center justify-end select-none"
            >
              Done
            </button>
          </div>
        </div>

        {/* Live Match Context Strip */}
        <div className="px-4 sm:px-5 pt-3 pb-1 flex-shrink-0">
          {context.hasActiveMatch ? (
            <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-2xl px-3.5 py-2.5 border border-black/[0.04] dark:border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span className="font-semibold text-zinc-900 dark:text-white truncate">
                    {context.players?.map((p) => `${p.name} ${p.score}`).join(' · ')}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex-shrink-0 tabular-nums">
                  {context.redsRemaining ?? 0}R · {context.pointsRemaining ?? 0} pts left
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-[#1c1c1e] text-zinc-700 dark:text-zinc-200 border border-black/[0.06] dark:border-white/[0.08] font-medium truncate max-w-full">
                  Turn: <strong className="text-zinc-950 dark:text-white">{context.activePlayerName}</strong> • On: {context.ballOn}
                </span>

                {context.freeBallActive && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 font-semibold">
                    Free Ball
                  </span>
                )}

                {context.snookersNeeded && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Snookers Needed
                  </span>
                )}

                {foulsCount > 0 && (
                  <button
                    type="button"
                    disabled={isStreaming}
                    onClick={() => void sendQuestion('Explain the fouls committed in this frame so far')}
                    className="px-2 py-0.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/25 font-semibold flex items-center gap-1 cursor-pointer transition active:scale-95 disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>{foulsCount} {foulsCount === 1 ? 'Foul' : 'Fouls'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-2xl px-3.5 py-2 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
              <span>General Snooker Rules Mode</span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Start a match for live table context
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Chat Body */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-3"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-2 py-4 space-y-5">
              <div className="space-y-2.5 max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/12 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Ask the Referee
                </h3>
                <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {context.hasActiveMatch
                    ? 'I can see the live scores, ball on, remaining reds, and logged fouls. Ask any ruling doubt.'
                    : 'Ask anything about snooker fouls, Free Balls, snookers math, respotting, or multiplayer scoring.'}
                </p>
              </div>

              {/* Contextual Quick Questions */}
              <div className="w-full max-w-md space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                  Quick Doubts
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickSuggestions.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendQuestion(prompt)}
                      className="min-h-[38px] px-3.5 py-2 rounded-full bg-[#f2f2f7] hover:bg-black/[0.07] dark:bg-[#2c2c2e] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/[0.08] text-[13px] font-medium text-zinc-800 dark:text-zinc-200 transition active:scale-[0.97] cursor-pointer text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isLastAssistantStreaming =
                  !isUser && isStreaming && idx === messages.length - 1;

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 dark:bg-emerald-600 text-white px-4 py-2.5 text-[14px] leading-relaxed shadow-xs select-text">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-black/[0.05] dark:border-white/[0.06] px-4 py-3 shadow-xs select-text">
                      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="w-3 h-3" />
                        <span>Referee</span>
                      </div>

                      {msg.content ? (
                        <FormattedAssistantText content={msg.content} />
                      ) : isLastAssistantStreaming ? (
                        <div className="flex items-center gap-1.5 py-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Reviewing rules & table state…</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {errorMessage && (
                <div className="rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/25 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-300 space-y-1.5 select-text">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Unable to get ruling</span>
                  </div>
                  <p className="leading-relaxed opacity-90">{errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Composer Bar */}
        <form
          onSubmit={handleSubmit}
          className="px-3 sm:px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom,12px))] border-t border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-lg flex-shrink-0"
        >
          <div className="flex items-end gap-2 bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-3xl p-1.5 pl-4 border border-black/[0.06] dark:border-white/[0.08]">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a foul, Free Ball, or rule…"
              aria-label="Ask the AI Referee"
              className="flex-1 bg-transparent text-[16px] leading-snug text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none max-h-28 py-2 focus:outline-none select-text"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                aria-label="Stop generating"
                title="Stop generating"
                className="w-11 h-11 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center flex-shrink-0 transition active:scale-95 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send question"
                title="Send question"
                className="w-11 h-11 rounded-full bg-emerald-600 dark:bg-[#30d158] text-white flex items-center justify-center flex-shrink-0 transition active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
