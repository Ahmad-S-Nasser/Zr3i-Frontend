import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { messages, type Lang, type MessageKey } from './messages';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ initial = 'en', children }: { initial?: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial);

  // The user's language sets lang and dir on the root element; layouts use logical properties.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback((key: MessageKey) => messages[lang][key], [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
