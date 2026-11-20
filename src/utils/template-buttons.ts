/** Form state for one template button, shared by the template create modal and carousel cards. */
export type TemplateButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';

export interface ButtonFormState {
  id: string;
  type: TemplateButtonType;
  text: string;
  url?: string;
  urlType?: 'STATIC' | 'DYNAMIC';
  urlSample?: string;
  phoneNumber?: string;
  code?: string;
}

const DEFAULT_BUTTON_TEXT: Record<TemplateButtonType, string> = {
  QUICK_REPLY: 'Quick Reply',
  URL: 'Visit Website',
  PHONE_NUMBER: 'Call Support',
  COPY_CODE: 'Copy Code',
};

export function createButtonState(type: TemplateButtonType): ButtonFormState {
  return {
    id: `btn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    text: DEFAULT_BUTTON_TEXT[type],
    url: type === 'URL' ? 'https://example.com' : undefined,
    urlType: 'STATIC',
    urlSample: undefined,
    phoneNumber: type === 'PHONE_NUMBER' ? '+1' : undefined,
    code: type === 'COPY_CODE' ? 'OFFER20' : undefined,
  };
}
