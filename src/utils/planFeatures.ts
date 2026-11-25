import type { PlanFeatureFlags } from '../types';

/** The gated features a plan can include, in display order (the keys match the server's `PLAN_FEATURES`). */
export const PLAN_FEATURE_LABELS: ReadonlyArray<{ key: keyof PlanFeatureFlags; label: string }> = [
  { key: 'ai_copilot', label: 'AI Copilot & knowledge bases' },
  { key: 'api_keys', label: 'Developer API keys' },
  { key: 'teams_roles', label: 'Support teams & member roles' },
  { key: 'audit_compliance', label: 'Audit trail & data-privacy tools' },
];
