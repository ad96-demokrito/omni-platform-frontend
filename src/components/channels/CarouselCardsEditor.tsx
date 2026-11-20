import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { TemplateMediaUploader } from '../common/TemplateMediaUploader';
import { TemplateButtonFields } from './TemplateButtonFields';
import {
  CAROUSEL_CARD_BODY_MAX,
  CAROUSEL_MAX_CARDS,
  CAROUSEL_MIN_CARDS,
  CarouselButtonType,
  CarouselCardForm,
  CarouselFormState,
  CarouselMediaType,
  createCarouselCard,
  extractVariables,
  withButtonLayout,
} from '../../utils/carousel-template';
import type { ButtonFormState } from '../../utils/template-buttons';

interface CarouselCardsEditorProps {
  value: CarouselFormState;
  onChange: (next: CarouselFormState) => void;
}

const BUTTON_TYPE_LABEL: Record<CarouselButtonType, string> = {
  QUICK_REPLY: 'Quick reply',
  URL: 'Website link',
  PHONE_NUMBER: 'Call number',
};
const BUTTON_TYPES = Object.keys(BUTTON_TYPE_LABEL) as CarouselButtonType[];

const SELECT_CLASS =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500';

export const CarouselCardsEditor: React.FC<CarouselCardsEditorProps> = ({ value, onChange }) => {
  const { cards, mediaType, includeCardBody, buttonLayout } = value;

  const updateCard = (id: string, updates: Partial<CarouselCardForm>) => {
    onChange({ ...value, cards: cards.map((c) => (c.id === id ? { ...c, ...updates } : c)) });
  };

  const updateCardButton = (cardId: string, buttonId: string, updates: Partial<ButtonFormState>) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    updateCard(cardId, {
      buttons: card.buttons.map((b) => (b.id === buttonId ? { ...b, ...updates } : b)),
    });
  };

  const setMediaType = (next: CarouselMediaType) => {
    if (next === mediaType) return;
    // Samples of the old type are not valid for the new one.
    onChange({ ...value, mediaType: next, cards: cards.map((c) => ({ ...c, media: {} })) });
  };

  const setLayoutSlot = (slot: number, type: CarouselButtonType | '') => {
    const next = [...buttonLayout];
    if (type === '') next.splice(slot, 1);
    else next[slot] = type;
    onChange(withButtonLayout(value, next));
  };

  const addCard = () => {
    if (cards.length >= CAROUSEL_MAX_CARDS) return;
    onChange({ ...value, cards: [...cards, createCarouselCard(buttonLayout)] });
  };

  const removeCard = (id: string) => {
    if (cards.length <= CAROUSEL_MIN_CARDS) return;
    onChange({ ...value, cards: cards.filter((c) => c.id !== id) });
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...value, cards: next });
  };

  return (
    <div className="space-y-4">
      {/* Settings shared by every card (Meta requires identical card structure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Card media (same on all cards)
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-xs font-medium">
            {(['IMAGE', 'VIDEO'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMediaType(type)}
                className={`py-1.5 rounded-md ${
                  mediaType === type
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {type === 'IMAGE' ? 'Image' : 'Video'}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300 sm:pt-5">
          <input
            type="checkbox"
            checked={includeCardBody}
            onChange={(e) => onChange({ ...value, includeCardBody: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold">Card text</span> — up to {CAROUSEL_CARD_BODY_MAX} characters per
            card. If one card has text, all cards must.
          </span>
        </label>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Button 1 (same type on all cards)
          </label>
          <select
            value={buttonLayout[0]}
            onChange={(e) => setLayoutSlot(0, e.target.value as CarouselButtonType)}
            className={SELECT_CLASS}
          >
            {BUTTON_TYPES.map((t) => (
              <option key={t} value={t}>
                {BUTTON_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Button 2 (optional)
          </label>
          <select
            value={buttonLayout[1] ?? ''}
            onChange={(e) => setLayoutSlot(1, e.target.value as CarouselButtonType | '')}
            className={SELECT_CLASS}
          >
            <option value="">None</option>
            {BUTTON_TYPES.map((t) => (
              <option key={t} value={t}>
                {BUTTON_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards */}
      {cards.map((card, index) => {
        const variables = extractVariables(card.bodyText);
        return (
          <div
            key={card.id}
            className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Card {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveCard(index, -1)}
                  disabled={index === 0}
                  title="Move card up"
                  className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveCard(index, 1)}
                  disabled={index === cards.length - 1}
                  title="Move card down"
                  className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeCard(card.id)}
                  disabled={cards.length <= CAROUSEL_MIN_CARDS}
                  title={
                    cards.length <= CAROUSEL_MIN_CARDS
                      ? `A carousel needs at least ${CAROUSEL_MIN_CARDS} cards`
                      : 'Remove card'
                  }
                  className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <TemplateMediaUploader
              headerType={mediaType}
              value={card.media}
              onChange={(media) => updateCard(card.id, { media })}
              allowVariables={false}
              label={`Card ${index + 1} sample ${mediaType.toLowerCase()}`}
              description="Meta needs a sample file to review the template. You choose the real media each time you send."
            />

            {includeCardBody && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Card text
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {card.bodyText.length} / {CAROUSEL_CARD_BODY_MAX}
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={CAROUSEL_CARD_BODY_MAX}
                  value={card.bodyText}
                  onChange={(e) => updateCard(card.id, { bodyText: e.target.value })}
                  placeholder="e.g. Rare succulents from $12 — use {{1}} at checkout"
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
                />
                {variables.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {variables.map((v) => (
                      <div
                        key={v}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-mono font-bold text-[11px] rounded shrink-0">
                          {`{{${v}}}`}
                        </span>
                        <input
                          type="text"
                          value={card.bodySamples[v] || ''}
                          onChange={(e) =>
                            updateCard(card.id, {
                              bodySamples: { ...card.bodySamples, [v]: e.target.value },
                            })
                          }
                          placeholder="Sample value"
                          className="flex-1 min-w-0 px-2 py-1 text-xs bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary-500 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {card.buttons.map((btn, btnIndex) => (
                <div
                  key={btn.id}
                  className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Button {btnIndex + 1} · {BUTTON_TYPE_LABEL[buttonLayout[btnIndex]]}
                  </p>
                  <TemplateButtonFields
                    button={btn}
                    onChange={(updates) => updateCardButton(card.id, btn.id, updates)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addCard}
        disabled={cards.length >= CAROUSEL_MAX_CARDS}
        className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>
          Add card ({cards.length} / {CAROUSEL_MAX_CARDS})
        </span>
      </button>
    </div>
  );
};
