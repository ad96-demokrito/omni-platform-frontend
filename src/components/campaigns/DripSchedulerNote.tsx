import React from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import type { CampaignAnalytics } from '../../types';
import { cn } from '../../lib/utils';

type Scheduler = NonNullable<CampaignAnalytics['scheduler']>;

// A run later than this many poll intervals ago means the scheduler is probably not running.
const STALE_AFTER_INTERVALS = 3;

function formatAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}

/** One-line heartbeat of the background scheduler that sends drip steps. */
export const DripSchedulerNote: React.FC<{ scheduler: Scheduler }> = ({ scheduler }) => {
  const everySeconds = Math.round(scheduler.intervalMs / 1000);
  const lastRunAgeMs = scheduler.lastRunAt ? Date.now() - new Date(scheduler.lastRunAt).getTime() : null;
  const isStale = lastRunAgeMs !== null && lastRunAgeMs > scheduler.intervalMs * STALE_AFTER_INTERVALS;
  const hasProblem = Boolean(scheduler.lastError) || isStale;

  const text = scheduler.lastError
    ? `Scheduler error ${scheduler.lastRunAt ? formatAgo(scheduler.lastRunAt) : ''}: ${scheduler.lastError}`
    : scheduler.lastRunAt
    ? `Scheduler last ran ${formatAgo(scheduler.lastRunAt)} · checks every ${everySeconds}s${
        isStale ? ' — not running?' : ''
      }`
    : `Scheduler starting · checks every ${everySeconds}s`;

  const Icon = hasProblem ? AlertCircle : Activity;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] max-w-full',
        hasProblem ? 'text-amber-700' : 'text-gray-500'
      )}
      title={text}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
};
