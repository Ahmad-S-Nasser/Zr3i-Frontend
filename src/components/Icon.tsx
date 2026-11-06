/** Small line icons drawn inline (no icon package). Each is a 24 by 24 outline in the current text colour; decorative, so hidden from screen readers. */
const PATHS = {
  portfolio: 'M4 8h16v11H4z M9 8V5h6v3',
  farms: 'M12 21v-8 M12 13c0-4 3-6 7-6 0 4-3 6-7 6z M12 15c0-3-2-5-6-5 0 3 2 5 6 5z',
  parcels: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  farmers: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 20c0-4 4-6 8-6s8 2 8 6',
  risk: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  analysis: 'M5 20V10 M12 20V4 M19 20v-7',
  accuracy: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 8a4 4 0 100 8 4 4 0 000-8z',
  imports: 'M12 16V4 M7 9l5-5 5 5 M4 20h16',
  methodology: 'M5 4h10a4 4 0 014 4v12H9a4 4 0 01-4-4z M5 16a4 4 0 014-4h10',
  reports: 'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5 M17 4.5a3.5 3.5 0 010 6.5 M18 14.5c2.5.5 4 2.3 4 5',
  audit: 'M8 4h8v3H8z M6 5v16h12V5h-2 M9 12h6 M9 16h6',
  tenants: 'M4 21V4h10v17 M14 9h6v12 M8 8h2 M8 12h2 M8 16h2',
  'account-types': 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  methods: 'M9 3h6 M10 3v6L4 19a1.5 1.5 0 001.3 2h13.4A1.5 1.5 0 0020 19l-6-10V3',
  tranches: 'M4 6h4 M4 12h4 M4 18h4 M11 6h9 M11 12h9 M11 18h9',
  'event-evidence': 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  'my-farms': 'M4 11l8-7 8 7 M6 10v10h12V10',
  consent: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5',
  'access-requests': 'M4 13l3-8h10l3 8v6H4z M4 13h5l1 2h4l1-2h5',
  satellite: 'M7 4l5 5-3 3-5-5z M15 12l5 5-3 3-5-5z M9.5 11.5l3 3 M3 21c5.5 0 9-3.5 9-9',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14z M21 21l-5-5',
  bell: 'M6 16v-5a6 6 0 1112 0v5l2 2H4z M10 21h4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  chevron: 'M6 9l6 6 6-6',
  logout: 'M10 4H5v16h5 M15 8l4 4-4 4 M19 12H9',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {PATHS[name].split(' M').map((d, i) => <path key={i} d={i === 0 ? d : 'M' + d} />)}
    </svg>
  );
}
