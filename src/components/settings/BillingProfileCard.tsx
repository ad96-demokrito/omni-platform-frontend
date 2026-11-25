import React, { useEffect, useState } from 'react';
import { Lock, Receipt } from 'lucide-react';
import { billingApi } from '../../api';
import type { BillingProfile } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Spinner } from '../common/Tabs';
import { countryOptions } from '../../utils/countries';
import { GST_STATES, stateCodeFromGstin } from '../../utils/gstStates';

const COUNTRY_OPTIONS = countryOptions();

interface BillingProfileCardProps {
  /** Called after a save so the plan prices (which follow the billing currency) can be reloaded. */
  onSaved?: () => void;
}

/** Billing country (decides the currency), tax ID and invoice name for the workspace. */
export const BillingProfileCard: React.FC<BillingProfileCardProps> = ({ onSaved }) => {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [country, setCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [name, setName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const apply = (next: BillingProfile) => {
    setProfile(next);
    setCountry(next.country ?? '');
    setTaxId(next.taxId ?? '');
    setName(next.name ?? '');
    setStateCode(next.stateCode ?? '');
    setLine1(next.address?.line1 ?? '');
    setCity(next.address?.city ?? '');
    setPostalCode(next.address?.postalCode ?? '');
  };

  useEffect(() => {
    let cancelled = false;
    billingApi
      .getProfile()
      .then((p) => {
        if (!cancelled) apply(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load billing details');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <Card className="p-5">
        <p className="text-xs text-rose-600">{loadError}</p>
      </Card>
    );
  }
  if (!profile) {
    return (
      <Card className="p-5 flex justify-center">
        <Spinner size="sm" />
      </Card>
    );
  }

  const isIndia = country === 'IN';
  const countryChanged = country !== (profile.country ?? '');
  // A GSTIN starts with the state code, so it settles the state by itself.
  const gstinState = isIndia && taxId.trim().length >= 2 ? stateCodeFromGstin(taxId) : null;
  const effectiveState = gstinState ?? stateCode;
  const stateName = GST_STATES.find((state) => state.code === effectiveState)?.name;

  const handleSave = async () => {
    if (!country) {
      showToast('Select your billing country', 'error');
      return;
    }
    if (isIndia && !effectiveState) {
      showToast('Choose your state: it decides how GST appears on your invoice', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await billingApi.updateProfile({
        ...(countryChanged ? { country } : {}),
        taxId: isIndia || profile.taxId ? taxId : undefined,
        name,
        address: { line1, city, postalCode, ...(isIndia && stateName ? { state: stateName } : {}) },
        // With a GSTIN the server takes the state from it; sending a state as well would only risk a mismatch.
        ...(isIndia && !taxId.trim() ? { stateCode: effectiveState } : {}),
      });
      apply(saved);
      showToast('Billing details saved', 'success');
      onSaved?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save billing details', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-700" />
            Billing details
          </CardTitle>
          <CardDescription>
            Your country decides the currency you are billed in ({profile.currency === 'INR' ? '₹ INR' : `$ ${profile.currency}`}
            ) and appears on invoices.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor="billing-country" className="block text-xs font-semibold text-gray-700">
            Country
          </label>
          <select
            id="billing-country"
            value={country}
            disabled={profile.currencyLocked || isSaving}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">Select country</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          {profile.currencyLocked && (
            <p className="flex items-center gap-1 text-[11px] text-gray-500">
              <Lock className="w-3 h-3" /> Locked after your first payment. Contact support to change it.
            </p>
          )}
        </div>

        <Input
          label="Billing name"
          placeholder="Company name on invoices"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSaving}
          maxLength={200}
        />

        {(isIndia || profile.taxId) && (
          <Input
            label="GSTIN (optional)"
            placeholder="22AAAAA0000A1Z5"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value.toUpperCase())}
            disabled={isSaving}
            maxLength={32}
            helperText="Shown on your GST invoice"
          />
        )}

        {isIndia && (
          <div className="space-y-1">
            <label htmlFor="billing-state" className="block text-xs font-semibold text-gray-700">
              State (place of supply)
            </label>
            <select
              id="billing-state"
              value={effectiveState}
              disabled={isSaving || gstinState !== null}
              onChange={(e) => setStateCode(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Select state</option>
              {GST_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500">
              {gstinState ? 'Taken from your GSTIN.' : 'Required to pay in INR: it decides CGST + SGST or IGST.'}
            </p>
          </div>
        )}

        <Input
          label="Address"
          placeholder="Street, building"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          disabled={isSaving}
          maxLength={200}
          helperText="Printed on your invoice"
        />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} disabled={isSaving} maxLength={200} />
        <Input
          label={isIndia ? 'PIN code' : 'Postal code'}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          disabled={isSaving}
          maxLength={200}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
          Save billing details
        </Button>
      </div>
    </Card>
  );
};
