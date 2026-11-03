# Zr3i frontend

React + Vite + TypeScript client for the Zr3i platform (API in the Zr3i-Backend repo). English and Arabic (RTL) everywhere. Public marketing pages must be SEO and AEO ready; see docs/seo-migration.md. AI services are built externally, not here.

## Hard rules
1. Style with Tailwind v4 utilities mapped to the design system. `src/styles/tokens.css` and `theme.css` are generated from `tokens.json` by `npm run tokens`; never hand-write colours, sizes or radii, and use only token-backed utilities (`bg-brand`, `text-ink`, `rounded-lg`). Use logical utilities (`ps-`, `pe-`, `ms-`, `text-start`), never `left`/`right`/`pl`/`pr`. Never invent colours or components without asking.
2. Every string is in `src/i18n/messages.ts` in English and Arabic. No hardcoded UI text. Arabic is a draft until a native speaker reviews it.
3. Logical CSS properties only (start/end, inline/block), never left/right. Ids, numbers, dates and hashes are `dir="ltr"`.
4. Words that never appear: approve, reject, recommend, score, rating, risk (in R0), safe, good, bad, passed, failed. No ranking or "top risk" view. Bands only in the risk module, always with letter, word, percentile and the maturity badge.
5. Every CRI/FRI shows "Specified Â· not calibrated" and the method version. Below resolution is never "no crop".
6. WCAG 2.2 AA, 44px targets, focus ring, status never by colour alone.
7. No secrets in the repo. Lock file committed.

## Work
Follow docs/Zr3i_MVP_Development_Plan_v2.pdf (week 5 UI tasks, W5-x), one task per branch, small commits. Run `npm run build` before saying a task is done. Ask before adding an npm package.

