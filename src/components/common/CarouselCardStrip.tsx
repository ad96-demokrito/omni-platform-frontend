import React from 'react';
import { CornerDownLeft, ExternalLink, Image as ImageIcon, Phone, Video } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CarouselPreviewCard } from '../../utils/carousel-template';

interface CarouselCardStripProps {
  cards: CarouselPreviewCard[];
  className?: string;
  onQuickReplyClick?: (replyText: string) => void;
}

function ButtonIcon({ type }: { type: string }): React.ReactElement {
  if (type === 'URL') return <ExternalLink className="w-3.5 h-3.5 shrink-0" />;
  if (type === 'PHONE_NUMBER') return <Phone className="w-3.5 h-3.5 shrink-0" />;
  return <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />;
}

/** Horizontally scrolling WhatsApp-style carousel cards (display only). */
export const CarouselCardStrip: React.FC<CarouselCardStripProps> = ({
  cards,
  className,
  onQuickReplyClick,
}) => {
  if (cards.length === 0) return null;

  return (
    <div
      className={cn('flex gap-2 overflow-x-auto pb-1.5 snap-x snap-mandatory', className)}
      role="list"
      aria-label="Carousel cards"
    >
      {cards.map((card, index) => (
        <div
          key={index}
          role="listitem"
          className="w-[190px] shrink-0 snap-start rounded-xl overflow-hidden bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-slate-100 shadow-sm border border-black/5 dark:border-white/10"
        >
          <div className="aspect-[1.91/1] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            {card.mediaUrl && card.mediaType === 'IMAGE' ? (
              <img
                src={card.mediaUrl}
                alt={`Card ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : card.mediaUrl && card.mediaType === 'VIDEO' ? (
              <video
                src={card.mediaUrl}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover bg-black"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400 text-[10px] gap-0.5">
                {card.mediaType === 'VIDEO' ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
                <span>Card {index + 1}</span>
              </div>
            )}
          </div>

          {card.bodyText !== undefined && (
            <p className="px-2.5 py-2 text-[11px] leading-snug whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
              {card.bodyText || <span className="text-slate-400 italic">Card text…</span>}
            </p>
          )}

          {card.buttons.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700/60 divide-y divide-slate-200 dark:divide-slate-700/60">
              {card.buttons.map((btn, btnIndex) => (
                <button
                  key={btnIndex}
                  type="button"
                  disabled={!onQuickReplyClick || btn.type !== 'QUICK_REPLY'}
                  onClick={() => btn.text && onQuickReplyClick?.(btn.text)}
                  className="w-full px-2 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#008069] dark:text-[#00a884] enabled:hover:bg-black/5 dark:enabled:hover:bg-white/5 disabled:cursor-default"
                >
                  <ButtonIcon type={btn.type} />
                  <span className="truncate">{btn.text || 'Button'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
