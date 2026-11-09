import React, { useCallback, useEffect, useState } from 'react';
import { teamsApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Card } from '../common/Card';
import { Spinner } from '../common/Tabs';

interface AutoAssignSettingProps {
  /** Only owners and admins can change it; everyone else sees the current value. */
  canManage: boolean;
}

/** Workspace switch: when on, a flow hand-off goes straight to the least busy agent. */
export const AutoAssignSetting: React.FC<AutoAssignSettingProps> = ({ canManage }) => {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setEnabled((await teamsApi.getSettings()).autoAssignEnabled);
    } catch (err) {
      setLoadFailed(true);
      showToast(err instanceof Error ? err.message : 'Failed to load assignment settings', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async () => {
    if (enabled === null || isSaving) return;
    const next = !enabled;
    setIsSaving(true);
    try {
      const saved = await teamsApi.updateSettings({ autoAssignEnabled: next });
      setEnabled(saved.autoAssignEnabled);
      showToast(
        saved.autoAssignEnabled ? 'Hand-offs are now auto-assigned' : 'Auto-assign turned off',
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update the setting', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Auto-assign human hand-offs</h2>
          <p className="text-xs text-gray-500 max-w-xl">
            When a flow hands a chat to a human, assign it to the active agent with the fewest open chats
            (from the team chosen in the flow, otherwise all active agents). If it is off, or nobody is
            available, the chat waits in Pending and your agents are alerted. A flow can override this per
            hand-off step.
          </p>
        </div>

        {enabled === null && !loadFailed ? (
          <Spinner size="sm" />
        ) : loadFailed ? (
          <button type="button" className="text-xs underline text-gray-600" onClick={load}>
            Try again
          </button>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={enabled === true}
            aria-label="Auto-assign human hand-offs"
            disabled={!canManage || isSaving}
            onClick={toggle}
            title={canManage ? undefined : 'Only owners and admins can change this'}
            className={
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ' +
              (enabled ? 'bg-primary-600' : 'bg-gray-300')
            }
          >
            <span
              className={
                'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ' +
                (enabled ? 'translate-x-5' : 'translate-x-0.5')
              }
            />
          </button>
        )}
      </div>
    </Card>
  );
};
