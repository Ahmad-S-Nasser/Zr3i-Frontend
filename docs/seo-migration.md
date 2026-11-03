# SEO and AEO migration from www.zr3i.com (Lovable)

Audited 2026-11-03 from the live site. The old site performs well in Google; the goal is to lose nothing.

## What the old site does today (keep)
- Language-prefixed routes: `/en/...` and `/ar/...`.
- Per-page title and description, `og:*` and `twitter:*` tags.
- Sitemap index `sitemap-index.xml` covering `sitemap-en.xml`, `sitemap-ar.xml`, `sitemap-images.xml`. robots.txt declares only the index (listing children separately caused duplicate-URL issues).
- robots.txt allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others) and disallows `/api/`. Private routes (`/admin`, `/dashboard`, `/auth`, ...) stay crawlable with a `noindex` meta tag so the directive is seen.
- Semantic headings (one H1, H2 per section), skip link, collapsible FAQ, `.webp` hero.

## Gaps to fix in the new site
- No `hreflang` alternates between `/en` and `/ar`. Add them, plus `x-default`.
- No JSON-LD. Add `Organization`, `WebSite`, `FAQPage` (the FAQ), and `BreadcrumbList`. This is the main AEO gain.
- Page copy must stay factual and self-contained so answer engines can quote it.

## Public routes to preserve (URLs must not change, or get a 301)
`/en`, `/en/farm-mapping`, `/en/crop-monitoring`, `/en/farm-management`, `/en/contract-farming`, `/en/carbon-footprint`, `/en/crop-insurance`, `/en/finance-partners`, `/en/bank-portal`, `/en/pricing`, `/en/enquiry`, `/en/about`, `/en/blog`, `/en/faq`, `/en/data-status`, `/en/join`, `/en/legal/{privacy,terms,cookies,sla,data-protection}`, and the `/ar` equivalents. `/en/auth` and `/en/bank-portal/login` are app routes (noindex). Verify the full list against the three sitemaps before cutover.

## Rendering requirement
A client-only Vite SPA ships an empty HTML shell and will not match the old site's indexing. Public marketing routes must be prerendered to static HTML at build time (per route, per language), with title, description, canonical, hreflang and JSON-LD in the HTML. The authenticated app can stay client-rendered. The prerender tool is an open decision.

## Cutover checklist
1. Crawl old and new sites; diff URL lists, titles, descriptions, H1s, canonicals.
2. 301 every changed URL. Keep `robots.txt` and the sitemap index at the same paths.
3. Keep Google Analytics and Search Console properties; re-verify, submit the sitemap index.
4. Check Core Web Vitals on the prerendered pages (fonts: preload and subset, no render-blocking `@import`).
