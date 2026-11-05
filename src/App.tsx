import { useEffect } from 'react';
import { useAuth } from './auth/AuthProvider';
import { Shell } from './components/Shell';
import { Loading } from './components/ui';
import { FarmRisk } from './pages/FarmRisk';
import { Farms } from './pages/Farms';
import { ParcelRisk } from './pages/ParcelRisk';
import { SignIn } from './pages/SignIn';
import { go, hrefs, useRoute } from './router';

export function App() {
  const route = useRoute();
  const { loading, me } = useAuth();
  const signedIn = me !== null;

  // Signed-out visitors go to sign-in; a signed-in user who lands on it goes to the farms.
  useEffect(() => {
    if (loading) return;
    if (!signedIn && route.name !== 'sign-in') go(hrefs.signIn());
    if (signedIn && route.name === 'sign-in') go(hrefs.farms());
  }, [loading, signedIn, route.name]);

  if (loading) return <Loading />;
  if (!signedIn) return route.name === 'sign-in' ? <SignIn /> : <Loading />;

  return (
    <Shell route={route}>
      {route.name === 'farms' && <Farms season={route.season} />}
      {route.name === 'farm' && <FarmRisk key={`${route.farmId}/${route.season}`} farmId={route.farmId} season={route.season} />}
      {route.name === 'parcel' && <ParcelRisk key={route.parcelSeasonId} parcelSeasonId={route.parcelSeasonId} />}
      {route.name === 'not-found' && <Farms season={null} />}
    </Shell>
  );
}
