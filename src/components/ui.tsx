import type { ReactNode } from 'react';
import type { ApiError } from '../api/client';
import { messages, type MessageKey } from '../i18n/messages';
import { useLang } from '../i18n/LangProvider';

/** A number, id or hash: always left-to-right and isolated, inside Arabic text too. */
export function Num({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}

const BAND_WORD = { A: 'band.A', B: 'band.B', C: 'band.C', D: 'band.D', E: 'band.E' } as const;

/** The risk band chip: letter, word and colour (never colour alone). The caller always shows the percentile, the badge and the method nearby. */
export function RiskBand({ band }: { band: 'A' | 'B' | 'C' | 'D' | 'E' }) {
  const { t } = useLang();
  const word = t(BAND_WORD[band]);
  return (
    <span className={`band ${band.toLowerCase()}`} role="img" aria-label={`${band}, ${word}`}>
      {band}
      <small>{word}</small>
    </span>
  );
}

export function MaturityBadge() {
  const { t } = useLang();
  return <span className="maturity">{t('maturity.specifiedNotCalibrated')}</span>;
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true" className="mt-0.5 flex-none">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </svg>
  );
}

/** The statement that opens every risk screen. Not dismissible. */
export function MethodBanner({ method }: { method: string }) {
  const { t } = useLang();
  return (
    <div className="banner info" role="note">
      <InfoIcon />
      <div>
        <b>{t('risk.banner.lead')}</b> {t('risk.banner.rest', { method })}
      </div>
    </div>
  );
}

/** A headline figure on a deep-green block (ContentBlock). */
export function Kpi({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="block">
      <h3>{label}</h3>
      <div className="display text-white">{value}</div>
    </div>
  );
}

/** Not assessable (grey dashed circle) with the reason, as a word as well as an icon. */
export function NotAssessable({ children }: { children: ReactNode }) {
  return (
    <span className="pill na">
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
      {children}
    </span>
  );
}

export function Loading() {
  const { t } = useLang();
  return (
    <p role="status" className="muted">
      {t('common.loading')}
    </p>
  );
}

export function errorKey(e: ApiError): MessageKey {
  if (e.status === 429) return 'error.rate_limited';
  if (e.status === 403) return 'error.forbidden';
  const key = `error.${e.code}`;
  return key in messages.en ? (key as MessageKey) : 'error.unknown';
}

/** An error line that starts with a triangle and says what happened in a plain sentence; colour is never the only cue. */
export function ErrorLine({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const { t } = useLang();
  return (
    <div role="alert" className="zr-err">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="mt-0.5 flex-none">
        <path d="M12 3 2.5 20h19L12 3zM12 10v5M12 17.5v.01" />
      </svg>
      <span>
        {t(errorKey(error))}
        {onRetry ? (
          <>
            {' '}
            <button type="button" className="zr-btn text !min-h-0 !px-1" onClick={onRetry}>
              {t('common.retry')}
            </button>
          </>
        ) : null}
      </span>
    </div>
  );
}

export function PageHeader({ crumb, title, actions }: { crumb: string; title: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="muted m-0 text-sm">{crumb}</p>
        <h1 className="display">{title}</h1>
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

/** Crop codes are lower-case slugs; show the localised name when the platform knows it, otherwise the code. */
export function useCropName(): (crop: string | null | undefined) => string {
  const { t } = useLang();
  return (crop) => {
    if (!crop) return t('common.none');
    const key = `crop.${crop}`;
    return key in messages.en ? t(key as MessageKey) : crop;
  };
}
