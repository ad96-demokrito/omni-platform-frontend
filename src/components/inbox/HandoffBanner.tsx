import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { conversationsApi } from '../../api';
import { cn } from '../../lib/utils';
import type { Conversation } from '../../types';

interface HandoffBannerProps {
  conversation: Conversation;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-rose-600 text-white',
  high: 'bg-amber-500 text-white',
};

/**
 * Tells the agent why a case reached them: which flow handed it off, the reason and priority the flow
 * author set, and (on demand) the answers the customer gave before the hand-off.
 */
export const HandoffBanner: React.FC<HandoffBannerProps> = ({ conversation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | number | boolean> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // A new case or a new hand-off starts collapsed with nothing cached.
  useEffect(() => {
    setIsExpanded(false);
    setAnswers(null);
    setLoadFailed(false);
  }, [conversation.id, conversation.handoffAt]);

  const toggle = async () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (!next || answers !== null || isLoading) return;

    // The answers are only on the detail response; list rows leave them out to stay small.
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const detail = await conversationsApi.get(conversation.id);
      setAnswers(detail.handoffContext ?? {});
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!conversation.handoffAt || conversation.status === 'closed') return null;

  const priority = conversation.handoffPriority ?? 'normal';
  const entries = answers ? Object.entries(answers) : [];

  return (
    <div className="px-3.5 sm:px-6 py-2.5 bg-rose-50/70 border-b border-rose-200/80 shrink-0 text-xs text-rose-950">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <UserCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
        <span className="font-semibold">
          Handed off by {conversation.handoffFlowName ? `"${conversation.handoffFlowName}"` : 'a flow'}
        </span>
        {PRIORITY_STYLES[priority] && (
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', PRIORITY_STYLES[priority])}>
            {priority}
          </span>
        )}
        <span className="text-rose-700/80">{new Date(conversation.handoffAt).toLocaleString()}</span>
      </div>

      {conversation.handoffReason && (
        <p className="mt-1 text-rose-900">
          <span className="font-semibold">Reason:</span> {conversation.handoffReason}
        </p>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        className="mt-1 inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 focus:outline-none focus-visible:underline"
      >
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Answers collected by the bot
      </button>

      {isExpanded && (
        <div className="mt-1.5 rounded-lg bg-white/80 border border-rose-200/80 px-3 py-2">
          {isLoading ? (
            <p className="text-gray-500">Loading…</p>
          ) : loadFailed ? (
            <p className="text-rose-700">Could not load the collected answers.</p>
          ) : entries.length === 0 ? (
            <p className="text-gray-500">The bot did not collect any answers before the hand-off.</p>
          ) : (
            <dl className="grid grid-cols-[max-content,1fr] gap-x-3 gap-y-1">
              {entries.map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="font-mono text-[11px] text-gray-500">{key}</dt>
                  <dd className="text-gray-900 break-words">{String(value)}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
};
