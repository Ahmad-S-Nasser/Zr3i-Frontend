import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { ApiError } from '../api/client';
import { LangToggle } from '../components/Shell';
import { ErrorLine } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { useLang } from '../i18n/LangProvider';
import { go, hrefs } from '../router';

const DIGITS = 6;

/** Two steps on one card: email and password, then a six-digit one-time code. Errors never say which part was wrong. */
export function SignIn() {
  const { t } = useLang();
  const { begin, verify } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  async function submitCredentials(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setChallenge(await begin(email.trim(), password));
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await verify(challenge, digits.join(''));
      go('#/');
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
      setDigits(Array(DIGITS).fill(''));
      boxes.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function setDigit(index: number, value: string) {
    const d = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => prev.map((x, i) => (i === index ? d : x)));
    if (d && index < DIGITS - 1) boxes.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) boxes.current[index - 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    e.preventDefault();
    setDigits(Array.from({ length: DIGITS }, (_, i) => pasted[i] ?? ''));
    boxes.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
  }

  const codeComplete = digits.every((d) => d !== '');

  return (
    <div className="-m-4 grid min-h-screen md:grid-cols-2">
      <section className="flex flex-col justify-between bg-zr-sage p-8 text-zr-navy">
        <div>
          <p className="eyebrow">{t('brand.eyebrow')}</p>
          <h1 dir="ltr" className="mb-3 font-display text-[clamp(56px,10vw,120px)] leading-none font-black text-white">
            {t('brand.wordmark')}
          </h1>
          <div className="rule" />
        </div>
        <p className="mt-8 text-xs">{t('brand.endorsement')}</p>
      </section>

      <section className="bg-surface p-8">
        <div className="mb-8 flex justify-end">
          <LangToggle />
        </div>
        <div className="mx-auto max-w-sm">
          {challenge === null ? (
            <form onSubmit={submitCredentials} noValidate className="flex flex-col gap-4">
              <h2 className="title">{t('signin.title')}</h2>
              <p className="muted m-0">{t('signin.intro')}</p>
              <div className="zr-field">
                <label htmlFor="email">{t('signin.email')}</label>
                <input id="email" type="email" dir="ltr" autoComplete="username" required className="zr-in" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="zr-field">
                <label htmlFor="password">{t('signin.passwordLabel')}</label>
                <input id="password" type="password" dir="ltr" autoComplete="current-password" required className="zr-in" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error ? <ErrorLine error={error} /> : null}
              <button type="submit" className="zr-btn primary" disabled={busy || !email || !password}>
                {busy ? t('signin.working') : t('signin.submit')}
              </button>
              <p className="zr-hint m-0">{t('signin.invitation')}</p>
              {import.meta.env.DEV ? (
                <a className="zr-btn text self-start" href={hrefs.devLogin()}>
                  Developer login
                </a>
              ) : null}
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
              <h2 className="title">{t('signin.codeTitle')}</h2>
              <p className="muted m-0">{t('signin.codeHint')}</p>
              <div role="group" aria-label={t('signin.codeLabel')} dir="ltr" className="flex gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxes.current[i] = el;
                    }}
                    className="zr-in !w-11 !px-0 text-center"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    aria-label={t('signin.digit', { n: i + 1 })}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onPaste={onPaste}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              {error ? <ErrorLine error={error} /> : null}
              <div className="flex gap-2">
                <button type="submit" className="zr-btn primary" disabled={busy || !codeComplete}>
                  {busy ? t('signin.working') : t('signin.verify')}
                </button>
                <button
                  type="button"
                  className="zr-btn"
                  onClick={() => {
                    setChallenge(null);
                    setError(null);
                    setDigits(Array(DIGITS).fill(''));
                  }}
                >
                  {t('signin.back')}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
