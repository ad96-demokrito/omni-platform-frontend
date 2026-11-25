import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { billingApi } from '../../api';
import type { SubscriptionSummary } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useDialog } from '../../context/DialogContext';
import { Card, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Spinner } from '../common/Tabs';
import { formatMoney } from '../../utils/money';

interface SubscriptionCardProps {
  /** Changes when the workspace's plan changes, so the card reloads after a purchase. */
  reloadKey?: string | number;
  /** Called after the subscription changed (cancelled, simulated renewal) so the plan/usage can be reloaded. */
  onChanged?: () => void;
}

const formatDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString() : '—');

/** The workspace's auto-renewing subscription: what renews when, and the actions to stop it or fix the payment. */
export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ reloadKey, onChanged }) => {
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await billingApi.getSubscription();
      setSubscription(res.subscription);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your subscription');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const run = async (action: () => Promise<void>, failure: string) => {
    setIsBusy(true);
    try {
      await action();
      await load();
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : failure, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    const ok = await confirm({
      title: 'Cancel automatic renewal',
      message: `Your ${subscription.planName} plan will not renew. It stays active until ${formatDate(
        subscription.currentPeriodEnd
      )}, the end of the period you already paid for. You can start a new subscription any time.`,
      confirmText: 'Cancel renewal',
      variant: 'danger',
    });
    if (!ok) return;
    await run(async () => {
      await billingApi.cancelSubscription();
      showToast('Renewal cancelled. Your plan stays active until the end of the paid period.', 'success');
    }, 'Could not cancel the renewal');
  };

  const handleManageCard = () =>
    run(async () => {
      const { url } = await billingApi.openBillingPortal();
      window.open(url, '_blank', 'noopener,noreferrer');
    }, 'Could not open the card page');

  // No renewing subscription: nothing to show (a prepaid plan simply ends on its date).
  if (isLoading) {
    return (
      <Card className="p-5 flex justify-center">
        <Spinner size="sm" />
      </Card>
    );
  }
  if (loadError) {
    return (
      <Card className="p-5">
        <p className="text-xs text-rose-600">{loadError}</p>
      </Card>
    );
  }
  if (!subscription) return null;

  const isPastDue = subscription.status === 'past_due';
  const payWith = subscription.gateway === 'stripe' ? 'card' : 'UPI / bank mandate';

  return (
    <Card className="p-5 space-y-4">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-gray-700" />
            Your subscription
          </CardTitle>
          <CardDescription>
            {subscription.planName} · {formatMoney(subscription.amount, subscription.currency)} /{' '}
            {subscription.billingCycle === 'yearly' ? 'year' : 'month'}
            {subscription.taxAmount > 0 ? ` (incl. ${subscription.taxRate}% GST)` : ''}
          </CardDescription>
        </div>
        <Badge variant={isPastDue ? 'warning' : subscription.cancelAtPeriodEnd ? 'secondary' : 'success'}>
          {isPastDue ? 'Payment failed' : subscription.cancelAtPeriodEnd ? 'Ends soon' : 'Active'}
        </Badge>
      </CardHeader>

      {isPastDue && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            We couldn&apos;t charge your {payWith}. Your plan stays active until{' '}
            <strong>{formatDate(subscription.currentPeriodEnd)}</strong> while the payment is retried.
            {subscription.canManageCard ? ' Update your card to fix it.' : ' Make sure the balance or mandate is available.'}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-700">
        <CalendarClock className="w-4 h-4 text-gray-400" />
        {subscription.cancelAtPeriodEnd ? (
          <span>
            Renewal cancelled. Your plan stays active until <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
          </span>
        ) : (
          <span>
            Renews automatically on <strong>{formatDate(subscription.currentPeriodEnd)}</strong> via {payWith}.
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {subscription.canManageCard && (
          <Button variant="outline" size="sm" onClick={handleManageCard} disabled={isBusy} icon={<CreditCard className="w-3.5 h-3.5" />}>
            Manage card <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )}
        {!subscription.cancelAtPeriodEnd && (
          <Button variant="danger" size="sm" onClick={handleCancel} disabled={isBusy}>
            Cancel renewal
          </Button>
        )}
      </div>

      {subscription.gateway === 'sandbox' && (
        <div className="pt-3 border-t border-dashed border-gray-200 space-y-2">
          <p className="text-[11px] text-gray-500">Sandbox (development) subscription: simulate what the payment provider would do.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() =>
                run(async () => {
                  await billingApi.sandboxRenew();
                  showToast('Simulated renewal recorded', 'success');
                }, 'Could not simulate a renewal')
              }
            >
              Simulate renewal
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() =>
                run(async () => {
                  await billingApi.sandboxFailRenewal();
                  showToast('Simulated failed renewal', 'info');
                }, 'Could not simulate a failed renewal')
              }
            >
              Simulate failed renewal
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
