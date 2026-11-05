import { AccessRequests } from './AccessRequests';
import { AccountTypes } from './AccountTypes';
import { AuditLog } from './AuditLog';
import { BeingBuilt } from './BeingBuilt';
import { Consent } from './Consent';
import { Farmers } from './Farmers';
import { Imports } from './Imports';
import { MyFarms } from './MyFarms';
import { Portfolio } from './Portfolio';
import { Tenants } from './Tenants';
import { Users } from './Users';
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
    case 'imports':
      return <Imports />;
    case 'farmers':
      return <Farmers />;
    case 'my-farms':
      return <MyFarms />;
    case 'consent':
      return <Consent />;
    case 'portfolio':
      return <Portfolio />;
    case 'users':
      return <Users />;
    case 'audit':
      return <AuditLog />;
    case 'tenants':
      return <Tenants />;
    case 'access-requests':
      return <AccessRequests />;
    default:
      return <BeingBuilt id={id} />;
  }
}
