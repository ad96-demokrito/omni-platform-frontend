import React from 'react';
import type { ButtonFormState } from '../../utils/template-buttons';

interface TemplateButtonFieldsProps {
  button: ButtonFormState;
  onChange: (updates: Partial<ButtonFormState>) => void;
}

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white';

/** The editable fields of one template button (label + type-specific value). */
export const TemplateButtonFields: React.FC<TemplateButtonFieldsProps> = ({ button, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
        Button Label (Max 25 chars)
      </label>
      <input
        type="text"
        maxLength={25}
        value={button.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="e.g. Track Package"
        className={INPUT_CLASS}
        required
      />
    </div>

    {button.type === 'PHONE_NUMBER' && (
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
          Phone Number (E.164)
        </label>
        <input
          type="text"
          value={button.phoneNumber || ''}
          onChange={(e) => onChange({ phoneNumber: e.target.value })}
          placeholder="+18005550199"
          className={INPUT_CLASS}
          required
        />
      </div>
    )}

    {button.type === 'COPY_CODE' && (
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
          Coupon / Offer Code
        </label>
        <input
          type="text"
          value={button.code || ''}
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder="e.g. SUMMER2026"
          className={`${INPUT_CLASS} font-mono`}
          required
        />
      </div>
    )}

    {button.type === 'URL' && (
      <>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
            Website URL (supports {'{{1}}'} for dynamic links)
          </label>
          <input
            type="text"
            value={button.url || ''}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://example.com/orders/{{1}}"
            className={INPUT_CLASS}
            required
          />
        </div>

        {button.url?.includes('{{1}}') && (
          <div className="space-y-1 sm:col-span-2 bg-primary-50/50 dark:bg-primary-950/20 p-2 rounded-md border border-primary-200/50 dark:border-primary-800/40">
            <label className="block text-[10.5px] font-semibold text-primary-900 dark:text-primary-200">
              Sample URL for Meta Review <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={button.urlSample || ''}
              onChange={(e) => onChange({ urlSample: e.target.value })}
              placeholder="https://example.com/orders/12345"
              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-700 rounded-md focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
              required
            />
          </div>
        )}
      </>
    )}
  </div>
);
