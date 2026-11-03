// Every UI string lives here in English and Arabic (CLAUDE.md rule 7).
// Arabic is a first draft and needs native review before any customer sees it.
export type Lang = 'en' | 'ar';

export const messages = {
  en: {
    'brand.eyebrow': 'Agricultural risk intelligence',
    'brand.wordmark': 'ZR3I',
    'shell.status': 'Frontend scaffold. Screens follow the plan, week 5.',
    'lang.toggle.en': 'EN',
    'lang.toggle.ar': 'عربي',
    'lang.toggle.label': 'Language',
  },
  ar: {
    'brand.eyebrow': 'ذكاء المخاطر الزراعية',
    'brand.wordmark': 'ZR3I',
    'shell.status': 'هيكل الواجهة الأمامية. الشاشات تتبع الخطة، الأسبوع الخامس.',
    'lang.toggle.en': 'EN',
    'lang.toggle.ar': 'عربي',
    'lang.toggle.label': 'اللغة',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type MessageKey = keyof (typeof messages)['en'];
