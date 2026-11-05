import { AccountTypes } from './AccountTypes';
import { BeingBuilt } from './BeingBuilt';
import { Farms } from './Farms';
import { Methodology } from './Methodology';
import { Methods } from './Methods';

/** Opens the screen for a sidebar item. An item with no screen yet shows the "being built" page. */
export function Section({ id, season }: { id: string; season: string | null }) {
  switch (id) {
    case 'risk':
      return <Farms mode="risk" season={season} />;
    case 'methodology':
      return <Methodology />;
    case 'account-types':
      return <AccountTypes />;
    case 'methods':
      return <Methods />;
    default:
      return <BeingBuilt id={id} />;
  }
}
