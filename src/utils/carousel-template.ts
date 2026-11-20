import type {
  CarouselSendButton,
  CarouselSendCard,
  TemplateButton,
  TemplateComponent,
  WhatsAppTemplate,
} from '../types';
import type { TemplateMediaValue } from '../components/common/TemplateMediaUploader';
import { ButtonFormState, createButtonState } from './template-buttons';

/**
 * Form state, validation and Meta payload mapping for media-card carousel templates.
 * Limits mirror Meta's rules and the backend validator
 * (backend/src/modules/whatsapp-onboarding/carousel-template.ts) — keep both in step.
 */

export const CAROUSEL_MIN_CARDS = 2;
export const CAROUSEL_MAX_CARDS = 10;
export const CAROUSEL_CARD_BODY_MAX = 160;
export const CAROUSEL_BUTTON_TEXT_MAX = 25;
export const CAROUSEL_MAX_CARD_BUTTONS = 2;

export type CarouselMediaType = 'IMAGE' | 'VIDEO';
export type CarouselButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

export interface CarouselCardForm {
  id: string;
  media: TemplateMediaValue;
  bodyText: string;
  bodySamples: Record<string, string>;
  buttons: ButtonFormState[];
}

export interface CarouselFormState {
  /** Meta requires every card to use the same header type. */
  mediaType: CarouselMediaType;
  /** If one card has body text, all must. */
  includeCardBody: boolean;
  /** Button types, shared by every card (1-2 slots). */
  buttonLayout: CarouselButtonType[];
  cards: CarouselCardForm[];
}

/** Display-only card, used by the live preview, chat bubble and template list. */
export interface CarouselPreviewCard {
  mediaType: CarouselMediaType;
  mediaUrl?: string;
  bodyText?: string;
  buttons: Array<{ type: string; text?: string }>;
}

const VARIABLE_PATTERN = /\{\{(\d+)\}\}/g;

export function extractVariables(text: string): string[] {
  const found = Array.from(text.matchAll(VARIABLE_PATTERN), (m) => m[1]);
  return Array.from(new Set(found)).sort((a, b) => Number(a) - Number(b));
}

export function createCarouselCard(layout: CarouselButtonType[]): CarouselCardForm {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    media: {},
    bodyText: '',
    bodySamples: {},
    buttons: layout.map((type) => createButtonState(type)),
  };
}

export function createInitialCarouselState(): CarouselFormState {
  const buttonLayout: CarouselButtonType[] = ['QUICK_REPLY'];
  return {
    mediaType: 'IMAGE',
    includeCardBody: true,
    buttonLayout,
    cards: Array.from({ length: CAROUSEL_MIN_CARDS }, () => createCarouselCard(buttonLayout)),
  };
}

/** Applies a new shared button layout, keeping each card's existing button where the type is unchanged. */
export function withButtonLayout(
  state: CarouselFormState,
  buttonLayout: CarouselButtonType[]
): CarouselFormState {
  return {
    ...state,
    buttonLayout,
    cards: state.cards.map((card) => ({
      ...card,
      buttons: buttonLayout.map((type, i) =>
        card.buttons[i]?.type === type ? card.buttons[i] : createButtonState(type)
      ),
    })),
  };
}

function substituteSamples(text: string, samples: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, num: string) => samples[num]?.trim() || match);
}

function validateCardButton(btn: ButtonFormState, cardNo: number): string | null {
  const label = `Card ${cardNo}`;
  const text = btn.text.trim();
  if (!text) return `${label}: every button needs a label.`;
  if (text.length > CAROUSEL_BUTTON_TEXT_MAX) {
    return `${label}: button labels can be at most ${CAROUSEL_BUTTON_TEXT_MAX} characters.`;
  }
  if (btn.type === 'PHONE_NUMBER' && !btn.phoneNumber?.trim()) {
    return `${label}: enter a phone number for the call button.`;
  }
  if (btn.type === 'URL') {
    const url = (btn.url || '').trim();
    if (!/^https?:\/\//i.test(url)) return `${label}: website buttons must start with http:// or https://.`;
    const variables = url.match(VARIABLE_PATTERN) ?? [];
    if (variables.length > 1 || (variables.length === 1 && !url.endsWith('{{1}}'))) {
      return `${label}: a website button supports one variable, {{1}}, at the end of the URL.`;
    }
    if (variables.length === 1 && !btn.urlSample?.trim()) {
      return `${label}: provide a sample URL for the dynamic website button.`;
    }
  }
  return null;
}

/** Returns a user-facing error, or null when the carousel can be submitted. */
export function validateCarouselForm(state: CarouselFormState): string | null {
  if (state.cards.length < CAROUSEL_MIN_CARDS || state.cards.length > CAROUSEL_MAX_CARDS) {
    return `A carousel needs between ${CAROUSEL_MIN_CARDS} and ${CAROUSEL_MAX_CARDS} cards.`;
  }
  if (state.buttonLayout.length < 1 || state.buttonLayout.length > CAROUSEL_MAX_CARD_BUTTONS) {
    return `Every card needs 1 or ${CAROUSEL_MAX_CARD_BUTTONS} buttons.`;
  }

  for (let i = 0; i < state.cards.length; i += 1) {
    const card = state.cards[i];
    const cardNo = i + 1;
    if (!card.media.headerValue && !card.media.mediaStorageKey) {
      return `Card ${cardNo}: upload a sample ${state.mediaType.toLowerCase()}.`;
    }

    if (state.includeCardBody) {
      const text = card.bodyText.trim();
      if (!text) return `Card ${cardNo}: enter the card body text (or turn card body off).`;
      if (text.length > CAROUSEL_CARD_BODY_MAX) {
        return `Card ${cardNo}: body text can be at most ${CAROUSEL_CARD_BODY_MAX} characters.`;
      }
      const variables = extractVariables(text);
      for (let v = 0; v < variables.length; v += 1) {
        if (Number(variables[v]) !== v + 1) {
          return `Card ${cardNo}: body variables must be numbered {{1}}, {{2}}… with no gaps.`;
        }
        if (!card.bodySamples[variables[v]]?.trim()) {
          return `Card ${cardNo}: provide a sample for variable {{${variables[v]}}}.`;
        }
      }
    }

    for (const btn of card.buttons) {
      const buttonError = validateCardButton(btn, cardNo);
      if (buttonError) return buttonError;
    }
  }
  return null;
}

function toMetaCardButton(btn: ButtonFormState): TemplateButton {
  if (btn.type === 'PHONE_NUMBER') {
    return { type: 'PHONE_NUMBER', text: btn.text.trim(), phone_number: btn.phoneNumber?.trim() };
  }
  if (btn.type === 'URL') {
    const url = (btn.url || '').trim();
    const meta: TemplateButton = { type: 'URL', text: btn.text.trim(), url };
    if (url.endsWith('{{1}}') && btn.urlSample?.trim()) meta.example = [btn.urlSample.trim()];
    return meta;
  }
  return { type: 'QUICK_REPLY', text: btn.text.trim() };
}

/** Builds the CAROUSEL component sent to the backend (which uploads each card header to Meta). */
export function buildCarouselComponent(state: CarouselFormState): TemplateComponent {
  return {
    type: 'CAROUSEL',
    cards: state.cards.map((card) => {
      const header: TemplateComponent = {
        type: 'HEADER',
        format: state.mediaType,
        example: { header_handle: [card.media.headerValue || ''] },
      };
      if (card.media.mediaStorageKey) header.mediaStorageKey = card.media.mediaStorageKey;

      const components: TemplateComponent[] = [header];
      if (state.includeCardBody) {
        const text = card.bodyText.trim();
        const body: TemplateComponent = { type: 'BODY', text };
        const variables = extractVariables(text);
        if (variables.length > 0) {
          body.example = { body_text: [variables.map((v) => card.bodySamples[v]?.trim() || `Sample ${v}`)] };
        }
        components.push(body);
      }
      components.push({ type: 'BUTTONS', buttons: card.buttons.map(toMetaCardButton) });
      return { components };
    }),
  };
}

export function toPreviewCards(state: CarouselFormState): CarouselPreviewCard[] {
  return state.cards.map((card) => ({
    mediaType: state.mediaType,
    mediaUrl: card.media.headerValue,
    bodyText: state.includeCardBody ? substituteSamples(card.bodyText, card.bodySamples) : undefined,
    buttons: card.buttons.map((b) => ({ type: b.type, text: b.text })),
  }));
}

function upper(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

/** True for a CAROUSEL component as returned by Meta (type casing is not guaranteed). */
export function isCarouselComponent(comp: { type?: unknown }): boolean {
  return upper(comp.type) === 'CAROUSEL';
}

/** Fills a card body's {{1}}, {{2}}… with the values chosen at send time. */
function fillBodyParams(text: string, params?: string[]): string {
  if (!params || params.length === 0) return text;
  return text.replace(VARIABLE_PATTERN, (match, num: string) => params[Number(num) - 1]?.trim() || match);
}

/** Display card for per-send data when the template definition is not known to the client. */
export function previewCardFromSent(sent: CarouselSendCard): CarouselPreviewCard {
  return {
    mediaType: sent.headerType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    mediaUrl: sent.mediaUrl || sent.headerValue,
    buttons: (sent.buttons ?? []).map((b) => ({ type: b.subType.toUpperCase(), text: b.text })),
  };
}

/**
 * Maps a template's CAROUSEL component (as returned by Meta) to display-only cards. `sent` is the
 * per-send data (media, body values) of a message or an in-progress send and takes precedence over
 * the template's own sample media.
 */
export function cardsFromTemplateComponent(
  comp: TemplateComponent,
  sent?: CarouselSendCard[]
): CarouselPreviewCard[] {
  if (!Array.isArray(comp.cards)) return [];
  return comp.cards.map((card, index) => {
    const parts = Array.isArray(card.components) ? card.components : [];
    const header = parts.find((c) => upper(c.type) === 'HEADER');
    const body = parts.find((c) => upper(c.type) === 'BODY');
    const buttons = parts.find((c) => upper(c.type) === 'BUTTONS');
    const sample = header?.example?.header_handle?.[0];
    const sentCard = sent?.[index];
    const sentMedia = sentCard?.mediaUrl || sentCard?.headerValue;
    return {
      mediaType: upper(header?.format) === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      mediaUrl:
        sentMedia ||
        (typeof sample === 'string' && /^https?:\/\//i.test(sample) ? sample : undefined),
      bodyText: body?.text === undefined ? undefined : fillBodyParams(body.text, sentCard?.bodyParams),
      buttons: (buttons?.buttons ?? []).map((b) => ({ type: upper(b.type), text: b.text })),
    };
  });
}

/** The CAROUSEL component of a template, if it has one. */
export function getCarouselComponent(template: WhatsAppTemplate | null | undefined): TemplateComponent | undefined {
  return template?.components?.find((c) => isCarouselComponent(c));
}

/** The shape of one template card: what the sender must fill in. */
export interface CarouselCardSpec {
  mediaType: CarouselMediaType;
  /** Card body text with its {{n}} placeholders, if the card has a body. */
  bodyText?: string;
  /** Number of body variables ({{1}}..{{n}}). */
  bodyVariableCount: number;
  buttons: Array<{ index: number; type: string; text: string; needsUrlParam: boolean }>;
}

export function getCarouselCardSpecs(template: WhatsAppTemplate | null | undefined): CarouselCardSpec[] {
  const comp = getCarouselComponent(template);
  if (!comp || !Array.isArray(comp.cards)) return [];
  return comp.cards.map((card) => {
    const parts = Array.isArray(card.components) ? card.components : [];
    const header = parts.find((c) => upper(c.type) === 'HEADER');
    const body = parts.find((c) => upper(c.type) === 'BODY');
    const buttons = parts.find((c) => upper(c.type) === 'BUTTONS');
    return {
      mediaType: upper(header?.format) === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      bodyText: body?.text,
      bodyVariableCount: body?.text ? extractVariables(body.text).length : 0,
      buttons: (buttons?.buttons ?? []).map((b, index) => ({
        index,
        type: upper(b.type),
        text: b.text ?? '',
        needsUrlParam: upper(b.type) === 'URL' && (b.url ?? '').includes('{{'),
      })),
    };
  });
}

/** Empty per-send cards for a carousel template, ready to be filled in. */
export function buildInitialSendCards(template: WhatsAppTemplate | null | undefined): CarouselSendCard[] {
  return getCarouselCardSpecs(template).map((spec) => {
    const buttons: CarouselSendButton[] = [];
    for (const b of spec.buttons) {
      if (b.type === 'QUICK_REPLY') buttons.push({ index: b.index, subType: 'quick_reply', text: b.text });
      else if (b.needsUrlParam) buttons.push({ index: b.index, subType: 'url', param: '' });
    }
    return {
      headerType: spec.mediaType,
      bodyParams: Array.from({ length: spec.bodyVariableCount }, () => ''),
      buttons,
    };
  });
}

/** Returns a user-facing error, or null when every card has its media and values. */
export function validateSendCards(
  template: WhatsAppTemplate | null | undefined,
  cards: CarouselSendCard[]
): string | null {
  const specs = getCarouselCardSpecs(template);
  if (cards.length !== specs.length) {
    return `This template has ${specs.length} cards; reload the template and try again.`;
  }
  for (let i = 0; i < specs.length; i += 1) {
    const card = cards[i];
    const cardNo = i + 1;
    if (!card.mediaStorageKey && !card.headerValue?.trim()) {
      return `Card ${cardNo}: add ${specs[i].mediaType === 'IMAGE' ? 'an image' : 'a video'}.`;
    }
    for (let v = 0; v < specs[i].bodyVariableCount; v += 1) {
      if (!card.bodyParams?.[v]?.trim()) return `Card ${cardNo}: fill in variable {{${v + 1}}}.`;
    }
    for (const b of card.buttons ?? []) {
      if (b.subType === 'url' && !b.param?.trim()) {
        return `Card ${cardNo}: fill in the link value for the website button.`;
      }
    }
  }
  return null;
}
