import React, { useMemo } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { TemplateMediaUploader, TemplateMediaValue } from './TemplateMediaUploader';
import type { CarouselSendCard, WhatsAppTemplate } from '../../types';
import { getCarouselCardSpecs } from '../../utils/carousel-template';

interface CarouselSendEditorProps {
  template: WhatsAppTemplate;
  /** Seed with `buildInitialSendCards(template)` when the template is selected. */
  value: CarouselSendCard[];
  onChange: (cards: CarouselSendCard[]) => void;
  /** Campaigns and flows accept {{variables}} (filled per contact); the inbox sends to one person. */
  allowVariables?: boolean;
  disabled?: boolean;
}

const INPUT_CLASS =
  'w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-primary-500 disabled:opacity-60';

/** Collects what a carousel template needs at send time: each card's media, body values and link values. */
export const CarouselSendEditor: React.FC<CarouselSendEditorProps> = ({
  template,
  value,
  onChange,
  allowVariables = false,
  disabled = false,
}) => {
  const specs = useMemo(() => getCarouselCardSpecs(template), [template]);

  if (specs.length === 0 || value.length !== specs.length) return null;

  const updateCard = (index: number, updates: Partial<CarouselSendCard>) => {
    onChange(value.map((card, i) => (i === index ? { ...card, ...updates } : card)));
  };

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
        Carousel cards ({specs.length})
      </span>

      {specs.map((spec, index) => {
        const card = value[index];
        const media: TemplateMediaValue = {
          headerValue: card.headerValue,
          mediaStorageKey: card.mediaStorageKey,
          filename: card.filename,
        };
        const urlButtons = (card.buttons ?? []).filter((b) => b.subType === 'url');
        const replyButtons = spec.buttons.filter((b) => b.type === 'QUICK_REPLY');

        return (
          <div
            key={index}
            className="space-y-2.5 p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl"
          >
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Card {index + 1}</p>

            <TemplateMediaUploader
              headerType={spec.mediaType}
              value={media}
              onChange={(next) =>
                updateCard(index, {
                  headerValue: next.headerValue,
                  mediaStorageKey: next.mediaStorageKey,
                  filename: next.filename,
                })
              }
              allowVariables={allowVariables}
              disabled={disabled}
              label={`Card ${index + 1} ${spec.mediaType.toLowerCase()}`}
              description={`Choose the ${spec.mediaType.toLowerCase()} shown on this card.`}
            />

            {spec.bodyText && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                  {spec.bodyText}
                </p>
                {Array.from({ length: spec.bodyVariableCount }, (_, v) => (
                  <div key={v}>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                      Variable {'{{' + (v + 1) + '}}'}
                    </label>
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder={allowVariables ? `Value or {{name}} for {{${v + 1}}}` : `Value for {{${v + 1}}}`}
                      value={card.bodyParams?.[v] ?? ''}
                      onChange={(e) => {
                        const bodyParams = [...(card.bodyParams ?? [])];
                        bodyParams[v] = e.target.value;
                        updateCard(index, { bodyParams });
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                ))}
              </div>
            )}

            {urlButtons.map((button) => {
              const label = spec.buttons.find((b) => b.index === button.index)?.text || 'Website button';
              return (
                <div key={button.index}>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                    Link value for “{label}”
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Text added to the end of the button link"
                    value={button.param ?? ''}
                    onChange={(e) =>
                      updateCard(index, {
                        buttons: (card.buttons ?? []).map((b) =>
                          b.index === button.index ? { ...b, param: e.target.value } : b
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              );
            })}

            {replyButtons.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <CornerDownLeft className="w-3 h-3" />
                Quick replies:
                {replyButtons.map((b) => (
                  <span key={b.index} className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {b.text}
                  </span>
                ))}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
