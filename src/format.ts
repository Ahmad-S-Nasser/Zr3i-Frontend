/** Western digits in both languages (a product decision, see the design system README). */
export function fmt(n: number | null | undefined, decimals = 1): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** 2026-09-30 14:02 UTC */
export function fmtUtc(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

/** sha256:7f3a91c2…c91e, with the whole hash available as a tooltip. */
export function shortHash(hex: string): string {
  const h = hex.toLowerCase();
  return `sha256:${h.slice(0, 8)}…${h.slice(-4)}`;
}
