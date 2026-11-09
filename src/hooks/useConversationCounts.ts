import { useCallback, useEffect, useRef, useState } from 'react';
import { conversationsApi } from '../api';
import { realtimeClient } from '../lib/socket';
import type { ConversationCounts } from '../types';

const REFRESH_DEBOUNCE_MS = 1500;
/** Safety net for a dropped socket; live events normally refresh the counts sooner. */
const FALLBACK_POLL_MS = 60_000;

const REFRESH_EVENTS = ['conversation:update', 'conversation:handoff', 'conversation:status', 'message:new'];

/**
 * Pending / unassigned / mine counts for the sidebar badge. Disabled counts stay null so nothing
 * is rendered for users who are not signed in yet or cannot work conversations.
 */
export function useConversationCounts(enabled: boolean): ConversationCounts | null {
  const [counts, setCounts] = useState<ConversationCounts | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCounts(await conversationsApi.getSummary());
    } catch {
      // A failed badge refresh is not worth a toast; the next event or poll retries.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    refresh();

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(refresh, REFRESH_DEBOUNCE_MS);
    };
    const unbind = REFRESH_EVENTS.map((event) => realtimeClient.on(event, scheduleRefresh));
    const poll = setInterval(refresh, FALLBACK_POLL_MS);

    return () => {
      unbind.forEach((off) => off());
      clearInterval(poll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, refresh]);

  return counts;
}
