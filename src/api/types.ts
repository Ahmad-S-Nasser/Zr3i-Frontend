// Shapes of the API responses the risk screens read. The API returns stable codes; wording lives in i18n/messages.ts.

export interface Organisation {
  id: string;
  name: string;
  accountType: string;
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
  parcelCount: number;
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
  parcelCount: number;
  areaFeddan: number;
  fri: { value: number; createdAt: string; maturity: string; label: string; method: { id: string; version: number } } | null;
}

export interface FarmList {
  season: string | null;
  nextCursor: string | null;
  items: FarmListItem[];
}
