import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { messages, type Lang, type MessageKey } from './messages';

export type Vars = Record<string, string | number>;

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Looks up a string and fills `{name}` placeholders from `vars`. */
  t: (key: MessageKey, vars?: Vars) => string;
}

const LangContext = createContext<LangContextValue | null>(null);
const LANG_KEY = 'zr3i.lang';

// Unicode left-to-right isolate and its terminator, built from code points so the source stays readable.
const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);

/** Printable-ASCII values (ids, numbers, seasons, Latin names) keep their own left-to-right order inside Arabic text. */
function isolate(value: string): string {
  return /^[ -~]+$/.test(value) ? `${LRI}${value}${PDI}` : value;
}

function storedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'en' || v === 'ar' ? v : null;
  } catch {
    return null;
  }
}

export function LangProvider({ initial = 'en', children }: { initial?: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => storedLang() ?? initial);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* the choice then lasts until reload */
    }
  }, []);

  // The user's language sets lang and dir on the root element; layouts use logical properties.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => {
      const text: string = messages[lang][key];
      return vars ? text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? isolate(String(vars[name])) : whole)) : text;
    },
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
