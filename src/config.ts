/** Base URL of the Zr3i API. Set VITE_API_BASE for another host; the default is the local API. */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:5121';

/** The season the farm list and farm pages open on until the user chooses another. */
export const DEFAULT_SEASON = '2026-27';
