// Shapes of the API responses the risk screens read. The API returns stable codes; wording lives in i18n/messages.ts.

export interface Organisation {
  id: string;
  name: string;
  accountType: string;
  accountTypeLabelEn: string | null;
  accountTypeLabelAr: string | null;
  /** The account type's preset: where this organisation lands, and what its sidebar lists. */
  homeView: string | null;
  navigation: string[];
  modules: string[];
  roles: { key: string; name: string }[];
  permissions: string[];
}

export interface Me {
  id: string;
  email: string;
  language: 'en' | 'ar';
  organisations: Organisation[];
}

export interface Band {
  band: 'A' | 'B' | 'C' | 'D' | 'E';
  percentile: number;
  cohortLevel: string;
  cohortKey: string;
  referenceVersion: number;
  referenceSize: number;
  referenceSha256: string;
}

export interface Component {
  key: string;
  weight: number;
  score: number | null;
  established: boolean;
  feature: string | null;
  featureValue: number | null;
  contribution: number | null;
}

export interface Adjustment {
  key: string;
  value: number | null;
}

export interface IndicatorResult {
  id: string;
  indicator: 'CRI' | 'FRI';
  value: number;
  current: boolean;
  maturity: string;
  label: string;
  method: { id: string; version: number };
  components: Component[];
  adjustments: Adjustment[];
  establishedWeight: number;
  weightedSum: number;
  closedSeasons: number | null;
  validFraction: number | null;
  insufficient: boolean;
  inputSha256: string;
  band: Band | null;
  bandReason: string | null;
  createdAt: string;
}

export interface ParcelSummary {
  maturity: string;
  label: string;
  method: { id: string; version: number };
  subject: { parcelSeasonId: string; parcelId: string; label: string; farmId: string; farmName: string | null; season: string; crop: string | null; areaFeddan: number | null };
  current: IndicatorResult | null;
  history: IndicatorResult[];
}

export type ParcelStatus = 'included' | 'insufficient' | 'no_cri' | 'no_boundary';

export interface FarmParcelRow {
  parcelSeasonId: string;
  parcelId: string;
  label: string;
  crop: string | null;
  areaFeddan: number | null;
  cri: number | null;
  areaTimesCri: number | null;
  status: ParcelStatus;
  closedSeasons: number | null;
  band: Band | null;
  bandReason: string | null;
}

export interface FarmSummary {
  maturity: string;
  label: string;
  method: { id: string; version: number };
  farm: { id: string; name: string; governorate: string | null };
  season: string;
  fri: IndicatorResult | null;
  friStale: boolean;
  awcri: number | null;
  adjustmentsSum: number;
  parcelCount: number | null;
  totalAreaFeddan: number;
  seasonsOnFile: number | null;
  parcels: FarmParcelRow[];
  exposure: { parcelSeasonId: string; label: string; crop: string | null; areaFeddan: number; cri: number; areaSharePercent: number; awcriWithout: number } | null;
}

export interface FarmListItem {
  id: string;
  name: string;
  governorate: string | null;
  markaz: string | null;
  parcelCount: number | null;
  areaFeddan: number;
  fri: { value: number; createdAt: string; maturity: string; label: string; method: { id: string; version: number } } | null;
}

export interface FarmList {
  season: string | null;
  nextCursor: string | null;
  items: FarmListItem[];
}

export interface ImportBatch {
  id: string;
  status: string;
  fileName: string;
  sizeBytes: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  fileErrors: string[];
  createdAt: string;
  progress: { done: number; total: number };
  jobStatus: string | null;
}

export interface ImportErrorRow {
  line: number;
  parcelExternalId: string;
  farmExternalId: string;
  errors: { field: string; code: string }[];
}

export interface ImportErrors {
  fileErrors: string[];
  rows: ImportErrorRow[];
  nextCursor: string | null;
}

export interface Farmer {
  id: string;
  name: string;
  phone: string | null;
  language: string;
  externalId: string | null;
  accountOrganisationId: string | null;
}

export interface Grant {
  grantId: string;
  role: 'owner' | 'grantee';
  status: 'active' | 'scheduled' | 'expired' | 'withdrawn';
  farmerId: string;
  granteeTenantId: string;
  ownerName: string | null;
  granteeName: string | null;
  purpose: string;
  validFrom: string;
  validUntil: string;
  grantedAt: string;
  withdrawnAt: string | null;
  channel: string;
}

export interface ParcelItem {
  id: string;
  label: string;
  farmId: string;
  farmName: string;
  crop: string | null;
  declaredAreaFeddan: number | null;
  measuredAreaFeddan: number | null;
  finding: { status: string; reason: string | null; gapPercent: number | null; noisePercent: number | null; direction: string | null } | null;
}

export interface ParcelList {
  season: string | null;
  nextCursor: string | null;
  items: ParcelItem[];
}

export interface ConsentOffer {
  requester: string;
  grantee: string;
  farmer: string;
  language: string;
  purpose: string;
  validFrom: string;
  validUntil: string;
  parcelCount: number | null;
  dataCategories: string[];
  status: string;
}

export interface SignupField {
  key: string;
  labelEn: string;
  labelAr: string;
  required: boolean;
}

export interface SelfSignupType {
  key: string;
  labelEn: string;
  labelAr: string;
  signupFields: SignupField[];
}

export interface Portfolio {
  farms: number;
  parcels: number;
  areaFeddan: number;
  governorate: string | null;
  regions: { name: string; farms: number }[];
  bands: null;
  bandsReason: string;
}

export interface MemberRow {
  userId: string;
  email: string;
  language: string;
  active: boolean;
  authenticatorEnrolled: boolean;
  lockedUntil: string | null;
  roles: { key: string; name: string }[];
}

export interface Members {
  members: MemberRow[];
  invitations: { email: string; status: 'pending' | 'expired'; expiresAt: string; roles: { key: string; name: string }[] }[];
  roles: { key: string; name: string }[];
}

export interface AuditEntry {
  id: string;
  at: string;
  actorEmail: string | null;
  action: string;
  objectType: string;
  objectId: string;
  outcome: string;
  purpose: string | null;
}

export interface AuditPage {
  nextCursor: string | null;
  items: AuditEntry[];
}

export interface Tenant {
  id: string;
  name: string;
  accountType: string;
  modules: string[];
  createdAt: string;
  members: number;
  farms: number;
  parcels: number;
}

export interface AccessRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  accountType: string;
  organisationName: string;
  contactName: string;
  email: string;
  purpose: string;
  language: string;
}
