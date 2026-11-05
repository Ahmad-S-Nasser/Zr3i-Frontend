import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { LangToggle } from '../components/Shell';
import { ErrorLine } from '../components/ui';
import { go } from '../router';
import { totpNow } from './totp';

// DEVELOPMENT ONLY. This page is reached only when import.meta.env.DEV is true (App.tsx), so it is compiled out of production builds.
// It signs in through the real two-step flow (password, then a one-time code computed here from the seeded dev secret); nothing in the
// API is bypassed. Its text is English only and sits outside i18n on purpose: it is a developer tool, never shown to customers.

interface Persona {
  id: string;
  accountType: string;
  accountTypeLabel: string;
  orgName: string;
  role: string;
  roleName: string;
  permissions: string[];
  modules: string[];
  home: string;
  navigation: string[];
  email: string;
  totpSecret: string;
}

interface PersonaFile {
  password: string;
  personas: Persona[];
}

const WHAT_ROLE_DOES: Record<string, string> = {
  'org-admin': 'Everything in the organisation, including managing users, roles and grants.',
  analyst: 'Reads and writes data; cannot manage users, roles or grants.',
  viewer: 'Reads only.',
  'field-user': 'Reads only; the phone-first role for people in the field.',
};

// The file is written by tools/Zr3i.DevSeed in the backend repo and is gitignored. glob() returns nothing when it does not exist.
const files = import.meta.glob<PersonaFile>('./devPersonas.json', { import: 'default' });

export default function DevLogin() {
  const { begin, verify, me, org, signOut } = useAuth();
  const [data, setData] = useState<PersonaFile | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const load = Object.values(files)[0];
    if (!load) {
      setMissing(true);
      return;
    }
    void load().then(setData);
  }, []);

  async function signInAs(p: Persona) {
    if (!data) return;
    setBusy(p.id);
    setError(null);
    try {
      const challenge = await begin(p.email, data.password);
      await verify(challenge, await totpNow(p.totpSecret));
      go('#/');
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setBusy(null);
    }
  }

  const types = data ? [...new Set(data.personas.map((p) => p.accountType))] : [];

  return (
    <div className="-m-4 min-h-screen bg-ground">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-zr-field px-6 py-3 text-zr-mist">
        <span dir="ltr" className="font-display text-2xl font-black text-zr-sage">ZR3I</span>
        <div className="flex items-center gap-3">
          {me ? <span className="text-sm">Signed in{org ? ` · ${org.name}` : ''}</span> : null}
          {me ? <button type="button" className="zr-btn" onClick={() => void signOut()}>Sign out</button> : null}
          <LangToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-(--size-content-max) flex-col gap-4 px-6 py-6">
        <div>
          <p className="eyebrow m-0">Development only</p>
          <h1 className="display">Developer login</h1>
        </div>

        <div className="banner synthetic" role="note">
          <span>
            <b>Not part of production builds.</b> Each button signs in through the real flow (password, then a one-time code computed here from the seeded dev
            secret). The accounts are the system&apos;s own presets: every built-in role of every account type. Data is synthetic and lives in the <code>zr3i_dev</code> database.
          </span>
        </div>

        {missing ? (
          <div className="card">
            <h2 className="title">No dev accounts yet</h2>
            <p>Seed them from the backend repo, then reload this page:</p>
            <pre className="sunken m-0 overflow-x-auto rounded-md bg-sunken p-3 text-sm" dir="ltr">
              {'dotnet run --project tools/Zr3i.DevSeed -- --out "<path to Zr3i-Frontend>/src/dev/devPersonas.json"'}
            </pre>
          </div>
        ) : null}

        {error ? <ErrorLine error={error} /> : null}

        {types.map((type) => {
          const group = data!.personas.filter((p) => p.accountType === type);
          const first = group[0];
          return (
            <section key={type} className="card !p-0 overflow-hidden" aria-labelledby={`t-${type}`}>
              <div className="px-4 py-3">
                <h2 id={`t-${type}`} className="title">
                  {first.accountTypeLabel} <span className="muted text-sm font-normal">· {first.orgName}</span>
                </h2>
                <p className="muted m-0 text-sm">
                  Modules: <b>{first.modules.join(', ')}</b> · Home view: <b>{first.home}</b> · Navigation: <b>{first.navigation.join(', ')}</b>
                </p>
              </div>
              <table className="zr-t">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>What it can do</th>
                    <th>Permissions</th>
                    <th>Email</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {group.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold">{p.roleName}</td>
                      <td>{WHAT_ROLE_DOES[p.role] ?? ''}</td>
                      <td className="font-mono text-xs"><bdi dir="ltr">{p.permissions.join('  ')}</bdi></td>
                      <td className="font-mono text-xs"><bdi dir="ltr">{p.email}</bdi></td>
                      <td>
                        <button type="button" className="zr-btn primary" disabled={busy !== null} onClick={() => void signInAs(p)}>
                          {busy === p.id ? 'Signing in…' : 'Sign in'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        {data ? (
          <p className="muted text-sm">
            Password for every dev account: <code dir="ltr">{data.password}</code>. The Company organisation has the Delta Agro Estate farms and risk results; the others start empty.
          </p>
        ) : null}
      </main>
    </div>
  );
}
