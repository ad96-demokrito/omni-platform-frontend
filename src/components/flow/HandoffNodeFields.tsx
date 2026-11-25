import React, { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { teamApi, teamsApi } from '../../api';
import { Input } from '../common/Input';
import type { HandoffAssignMode, HandoffNode, HandoffPriority, Team, TeamMember } from '../../types';

/** Form state for a hand-off node. Text fields stay strings; empty means "not set". */
export interface HandoffFormState {
  teamId: string;
  agentUserId: string;
  assignMode: HandoffAssignMode;
  customerMessage: string;
  reason: string;
  priority: HandoffPriority;
  timeoutMinutes: number;
  timeoutMessage: string;
}

export const EMPTY_HANDOFF_FORM: HandoffFormState = {
  teamId: '',
  agentUserId: '',
  assignMode: 'default',
  customerMessage: '',
  reason: '',
  priority: 'normal',
  timeoutMinutes: 0,
  timeoutMessage: '',
};

export const MAX_HANDOFF_TIMEOUT_MINUTES = 1440;
const MAX_CUSTOMER_MESSAGE_LENGTH = 1000;
const MAX_REASON_LENGTH = 200;

export function handoffFormFromNode(node: HandoffNode): HandoffFormState {
  return {
    teamId: node.teamId || '',
    agentUserId: node.agentUserId || '',
    assignMode: node.assignMode || 'default',
    customerMessage: node.customerMessage || '',
    reason: node.reason || '',
    priority: node.priority || 'normal',
    timeoutMinutes: node.timeoutMinutes || 0,
    timeoutMessage: node.timeoutMessage || '',
  };
}

/** Builds the saved node. Unset fields are omitted, so a node with no settings stays a plain hand-off. */
export function handoffNodeFromForm(id: string, form: HandoffFormState): HandoffNode {
  const minutes = Math.min(Math.max(Math.floor(form.timeoutMinutes) || 0, 0), MAX_HANDOFF_TIMEOUT_MINUTES);
  return {
    id,
    type: 'handoff',
    teamId: form.teamId || undefined,
    agentUserId: form.agentUserId || undefined,
    assignMode: form.assignMode !== 'default' ? form.assignMode : undefined,
    customerMessage: form.customerMessage.trim() || undefined,
    reason: form.reason.trim() || undefined,
    priority: form.priority !== 'normal' ? form.priority : undefined,
    timeoutMinutes: minutes > 0 ? minutes : undefined,
    timeoutMessage: minutes > 0 ? form.timeoutMessage.trim() || undefined : undefined,
  };
}

interface HandoffNodeFieldsProps {
  value: HandoffFormState;
  onChange: (next: HandoffFormState) => void;
}

const selectClass = 'w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'block text-xs font-semibold text-gray-700 uppercase tracking-wider';

/** Settings of the "Human Handoff" step: who gets the case, what the customer is told, and a timeout. */
export const HandoffNodeFields: React.FC<HandoffNodeFieldsProps> = ({ value, onChange }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<TeamMember[]>([]);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Support teams are a plan feature: a plan without them simply has no teams to pick from.
    Promise.all([teamsApi.list().catch((): Team[] => []), teamApi.list(), teamsApi.getSettings()])
      .then(([teamList, members, settings]) => {
        if (cancelled) return;
        setTeams(teamList);
        setAgents(members.filter((m) => m.status === 'active' && m.role !== 'viewer'));
        setAutoAssignEnabled(settings.autoAssignEnabled);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof HandoffFormState>(key: K, next: HandoffFormState[K]) =>
    onChange({ ...value, [key]: next });

  const hasSpecificAgent = value.agentUserId !== '';
  const workspaceModeLabel =
    autoAssignEnabled === null ? 'workspace setting' : autoAssignEnabled ? 'currently on' : 'currently off';

  return (
    <div className="space-y-4">
      <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 space-y-1">
        <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-rose-600" /> Human Handoff
        </span>
        <p className="text-xs text-rose-900">
          The bot stops and the conversation goes to your agents. Choose who should get it and what the customer sees.
        </p>
      </div>

      {loadFailed && (
        <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          Could not load teams and agents. You can still save the other settings.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="handoff-team" className={labelClass}>Route to team</label>
          <select
            id="handoff-team"
            value={value.teamId}
            onChange={(e) => set('teamId', e.target.value)}
            disabled={isLoading}
            className={selectClass}
          >
            <option value="">Any team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="handoff-agent" className={labelClass}>Assign to a specific agent</label>
          <select
            id="handoff-agent"
            value={value.agentUserId}
            onChange={(e) => set('agentUserId', e.target.value)}
            disabled={isLoading}
            className={selectClass}
          >
            <option value="">No one in particular</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="handoff-assign-mode" className={labelClass}>Automatic assignment</label>
        <select
          id="handoff-assign-mode"
          value={value.assignMode}
          onChange={(e) => set('assignMode', e.target.value as HandoffAssignMode)}
          disabled={hasSpecificAgent}
          className={selectClass}
        >
          <option value="default">Follow the workspace setting ({workspaceModeLabel})</option>
          <option value="auto">Always auto-assign to the least busy agent</option>
          <option value="none">Leave unassigned (agents pick it up)</option>
        </select>
        <p className="text-xs text-gray-500">
          {hasSpecificAgent
            ? 'A specific agent is chosen, so automatic assignment is not used.'
            : 'Auto-assign picks the agent with the fewest open chats, from the chosen team or all active agents.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="handoff-customer-message" className={labelClass}>Message to the customer</label>
        <textarea
          id="handoff-customer-message"
          rows={3}
          maxLength={MAX_CUSTOMER_MESSAGE_LENGTH}
          placeholder="Thanks {{contact.name}}! I'm connecting you to one of our agents."
          value={value.customerMessage}
          onChange={(e) => set('customerMessage', e.target.value)}
          className="w-full rounded-xl border border-gray-200 p-3 text-xs focus:outline-none focus:border-primary-500 font-sans leading-relaxed"
        />
        <p className="text-xs text-gray-500">
          Sent when the chat is handed off. Leave empty to send nothing. Supports {'{{variables}}'}.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Input
            label="Reason shown to agents"
            placeholder="e.g. Customer asked for a refund"
            maxLength={MAX_REASON_LENGTH}
            value={value.reason}
            onChange={(e) => set('reason', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="handoff-priority" className={labelClass}>Priority</label>
          <select
            id="handoff-priority"
            value={value.priority}
            onChange={(e) => set('priority', e.target.value as HandoffPriority)}
            className={selectClass}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-3">
        <span className="text-xs font-bold text-amber-950">If nobody takes the chat</span>
        <Input
          label="Hand back to the bot after (minutes)"
          type="number"
          min={0}
          max={MAX_HANDOFF_TIMEOUT_MINUTES}
          value={value.timeoutMinutes}
          onChange={(e) => set('timeoutMinutes', Number(e.target.value))}
          helperText="0 keeps the chat waiting for an agent. Applies only while it is unassigned and still pending."
        />
        {value.timeoutMinutes > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="handoff-timeout-message" className={labelClass}>Message when the bot resumes</label>
            <textarea
              id="handoff-timeout-message"
              rows={2}
              maxLength={MAX_CUSTOMER_MESSAGE_LENGTH}
              placeholder="Sorry for the wait. I'm back to help you in the meantime."
              value={value.timeoutMessage}
              onChange={(e) => set('timeoutMessage', e.target.value)}
              className="w-full rounded-xl border border-amber-200 p-3 text-xs focus:outline-none focus:border-amber-500 font-sans leading-relaxed bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
