import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { Members } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { fmtUtc } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';

/** Users and roles for the organisation: who belongs, in which role, whether their authenticator is set up, and open invitations. */
export function Users() {
  const { t } = useLang();
  const { org } = useAuth();
  const { data, error, loading, reload } = useApi<Members>(org ? `/api/organisations/${org.id}/members` : null);
  const roleName = (key: string, fallback: string) => (hasMessage(`role.${key}`) ? t(`role.${key}` as never) : fallback);

  return (
    <>
      <PageHeader crumb={org?.name ?? ''} title={t('usr.title')} />
      <div className="flex flex-col gap-4">
        {error ? <ErrorLine error={error} onRetry={reload} /> : null}
        {loading ? <Loading /> : null}

        {data ? (
          <>
            <section className="card !p-0 overflow-hidden" aria-labelledby="people">
              <h2 id="people" className="title px-4 py-3">{t('usr.people')}</h2>
              <table className="zr-t">
                <thead>
                  <tr>
                    <th>{t('usr.col.user')}</th>
                    <th>{t('usr.col.roles')}</th>
                    <th>{t('usr.col.authenticator')}</th>
                    <th>{t('usr.col.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((m) => (
                    <tr key={m.userId}>
                      <td className="font-mono text-xs"><Num>{m.email}</Num></td>
                      <td>{m.roles.map((r) => roleName(r.key, r.name)).join(', ')}</td>
                      <td>{m.authenticatorEnrolled ? t('usr.authenticator.yes') : t('usr.authenticator.no')}</td>
                      <td>
                        {m.lockedUntil && new Date(m.lockedUntil) > new Date() ? <span className="pill flagged">{t('usr.status.locked')}</span>
                          : m.active ? <span className="pill confirmed">{t('usr.status.active')}</span>
                          : <span className="pill na">{t('usr.status.inactive')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Invite roles={data.roles} roleName={roleName} onInvited={reload} />
              <section className="card !p-0 overflow-hidden" aria-labelledby="pending">
                <h2 id="pending" className="title px-4 py-3">{t('usr.pending.title')}</h2>
                {data.invitations.length === 0 ? <p className="muted px-4 pb-3">{t('usr.pending.none')}</p> : (
                  <table className="zr-t">
                    <thead>
                      <tr>
                        <th>{t('usr.invite.email')}</th>
                        <th>{t('usr.col.roles')}</th>
                        <th>{t('usr.col.expires')}</th>
                        <th>{t('usr.col.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invitations.map((i) => (
                        <tr key={i.email}>
                          <td className="font-mono text-xs"><Num>{i.email}</Num></td>
                          <td>{i.roles.map((r) => roleName(r.key, r.name)).join(', ')}</td>
                          <td className="font-mono text-xs"><Num>{fmtUtc(i.expiresAt).slice(0, 10)}</Num></td>
                          <td>{t(`usr.invStatus.${i.status}`)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function Invite({ roles, roleName, onInvited }: { roles: Members['roles']; roleName: (key: string, fallback: string) => string; onInvited: () => void }) {
  const { t } = useLang();
  const { org } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(null);
    setLink(null);
    try {
      const r = await api<{ inviteToken: string }>(`/api/organisations/${org.id}/invitations`, { method: 'POST', body: { email: email.trim(), roleKeys: [role || roles[0]?.key] } });
      setLink(`${window.location.origin}/#/accept?token=${encodeURIComponent(r.inviteToken)}`);
      setEmail('');
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3" noValidate>
      <h2 className="title">{t('usr.invite.title')}</h2>
      <div className="zr-field">
        <label htmlFor="iemail">{t('usr.invite.email')}</label>
        <input id="iemail" type="email" dir="ltr" className="zr-in" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="zr-field">
        <label htmlFor="irole">{t('usr.invite.role')}</label>
        <select id="irole" className="zr-in" value={role || roles[0]?.key || ''} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => (<option key={r.key} value={r.key}>{roleName(r.key, r.name)}</option>))}
        </select>
      </div>
      {error ? <ErrorLine error={error} /> : null}
      <button type="submit" className="zr-btn primary self-start" disabled={busy || !email.trim()}>{t('usr.invite.send')}</button>
      {link ? (
        <div className="banner neutral" role="status">
          <div>
            <b>{t('usr.invite.link')}</b>
            <div className="mt-1 break-all font-mono text-xs" dir="ltr">{link}</div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
