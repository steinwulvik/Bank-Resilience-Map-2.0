---
name: "bank-resilience-map"
description: "Use for all planning, design, build, review and documentation work on Bank Resilience Map (fictional Morild Bank), following SPEC.md as the source of truth."
---

# Bank Resilience Map

## Communication

- Talk to the user in Norwegian (bokmål). Code, file names and technical terms that have no common Norwegian form can stay as they are.

## Versions

- The version number is part of the app name: "Bank Resilience Map 1.0" and "Bank Resilience Map 2.0". Never abbreviate the name in the app, files or documentation.
- Each version has its own repo (steinwulvik/Bank-Resilience-Map-1.0 and steinwulvik/Bank-Resilience-Map-2.0) and its own Cloudflare Pages project: 1.0 at https://bank-resilience-map.pages.dev and 2.0 at https://bank-resilience-map-2.pages.dev. A change to one version must not change the other.
- Version 2.0 "fra hendelse til forebygging" keeps everything in 1.0 and adds three lookup pages: Leverandører (supplier register with subcontractor chains and chain level, exit plans with last test date, substitutability, CSV export), Endringer (assess a planned change against the map before go-live, checklist, approve/reject with reason) and Øvelser og funn (run a scenario as an exercise, record which roles and suppliers took part, record findings and follow them until closed). It also adds the Veiledning page (`#/veiledning`): an animated walkthrough of four scenarios that shows how the app is used and what the bank gets from it.
- Chain level ("ledd", DORA "rank": 1 = direct contract, 2 = subcontractor, and so on) is calculated from subcontractor dependencies in `src/engine/suppliers.ts`, not stored in the dataset. A supplier can sit at more than one level.
- All new parts reuse the same dataset, dependency map and impact engine. New data goes into the dataset generator with English translations.

## Source of truth

- Read `SPEC.md` before making product or implementation decisions.
- `SPEC.md` describes the product as it is: requirements, rules, data model, technical solution and acceptance criteria. When scope, behaviour or a product decision changes, update `SPEC.md` in the same task so code and spec never drift apart.
- Keep end-product requirements (P-xx) and demonstrator requirements (D-xx) apart. Do not treat a demonstrator shortcut as the final product requirement without saying so.
- When a requirement conflicts with an implementation convenience, keep the specified user outcome and explain the trade-off.

## Product decisions

- Primary audience: operational risk staff at Morild Bank.
- Main scenario: failure at a supplier ("Svikt hos leverandør"). Alternative scenario: failure after a system change.
- Users explore a fixed synthetic dataset and cannot edit the map.
- Stack: static web app built with React, Vite and TypeScript. Hash routing. Impact is calculated in the browser from JSON data.
- Graph library: React Flow (`@xyflow/react`) with a custom band layout (one band per object type: providers → systems → services → channels). Boxes are placed to keep lines from crossing other boxes. The map lives in the Impact (Påvirkning) step.
- Hosting: Cloudflare Pages, built from the app's folder (build command `npm run build`, output `dist`, `NODE_VERSION=22`).
- Start page: the app opens on the intro page and starts in English. A refresh in the same tab keeps the current page and language.
- Language: the interface has a Norwegian/English language switch. All user-facing strings live in `src/i18n/no.ts` and `src/i18n/en.ts` (en is type-checked against no; no hard-coded UI text in components). Dataset texts are stored per language (`{ no, en }`); English dataset texts come from `scripts/translations-en.json`, and `npm run dataset` fails if a translation is missing. Every new text must be added in both languages.

## Product outcome

The app is a public web app with a stable URL. A first-time visitor must be able to understand the problem and complete the core flow (scenario → impact → incident room → report) alone, without an account and without entering personal information. It needs:

- a short explanatory introduction
- an obvious synthetic example bank (Morild Bank)
- a guided but skippable path
- a reset action
- clear concept and independence labelling

It must work on direct URL entry, on refresh, with the keyboard and on mobile. Small screens get a list/detail alternative to the map.

## Brand

Morild Bank is fictional and is the white-label customer. Use the logo `morild-bank-wordmark-color.png`: teal waves with an amber light point, "MORILD" in teal and "BANK" in amber.

## UI conventions

- Dates and times are shown as `dd.mm.åååå tt:mm` in both languages. Scenario start time defaults to today.
- Every system, provider, service and channel that appears in one place in the demo must also be visible in every other relevant place (one dataset, shown consistently). Use the same terms on all pages: Bortfall, Redusert, Mulig bortfall, Over gjenopprettingsmål.
- Buttons you press (`.btn`, `.icon-btn`) have a slanted shadow: a sharp teal copy offset down and to the right (`4px 4px 0`) plus a soft shadow, with the button lifted `translate(-2px,-2px)`. On click it slides down into the shadow. Primary buttons use the darker teal. Keyboard focus must stay visible on top of the shadow. Cards, chips, toggles and segmented choices do not get this shadow.
- "Mulig bortfall" (uncertain impact) is shown with red stripes everywhere. Purple is used only for uncertainty in the data basis (assumed, stale or missing data). A missing control or action (for example an exit plan that was never tested) is not data uncertainty: show it as plain text or with the amber/red status badges, never purple.
- Long Norwegian compound words in narrow boxes (KPI labels, badges) get a soft hyphen in the language file, so they never break in the middle without a hyphen on small screens.
- Lookup pages with a table (Tjenesteoversikt, Leverandører) use the same pattern: KPI row, one card with `.table responsive-table` inside `.table-scroll`, names as `.svc-name-btn` that open `NodeDetail` in the shared `DetailDialog`. Child rows (for example subcontractors) are indented under their parent with a ↳ arrow.
- Free-text inputs have limits and a character filter (`src/lib/text.ts`): map search max 60 characters, decisions 3–500 characters, findings max 120 characters. New text inputs must follow the same pattern.

## Visual design

New pages are built from the existing building blocks in `src/styles.css` and `src/components/ui.tsx`. Do not invent new colours, shadows, spacing or component styles. Every page must look like it belongs to the same app.

Colours and tokens
- Use only the CSS variables in `:root`: teal (`--teal-*`) for brand, links and primary actions; amber (`--amber-*`) for the active menu item and small accents; `--outage` red for Bortfall, `--degraded` amber/brown for Redusert, red stripes for Mulig bortfall, `--uncertain` purple only for uncertain data, `--ok` green for normal/confirmed. Background `--bg`, cards `--surface`, lines `--line`/`--line-2`, text `--ink`, `--ink-2`, `--ink-3`.
- Coloured boxes (KPI cards, callouts, notices) use the matching light background (`*-bg`, `--teal-50`, `--amber-100`) with dark text in the same hue. Colour is used only where it carries meaning; neutral information stays white/grey.

Layout and alignment
- Page structure: `PageHeader` (h1 + short lead, actions to the right) → content in `.card`/`.stack`/`.two-col` → no footer (footer only on Om demoen). Widths: `.page` 1180px, `.page-narrow` 760px for text pages, `.page-wide` only for the map.
- Boxes on the same row share top edge, height and inner padding (`.card` 1.1rem 1.2rem, 0.9rem on mobile). Gaps between boxes are 0.75–1rem, the same throughout a page. KPI rows use `.kpis` (four equal columns) with `.kpi`, `.kpi-value`, `.kpi-label` and, where colour means something, `.kpi-accent` with a left border.
- Labels and values line up in columns (`.facts`, `.table`). Table headers are small uppercase `--ink-3`. Badges (`.badge` + crit/status/impact classes) sit to the right of the name on the same line and do not wrap.
- Related controls sit on one line where there is room. On ≤760px they stack in one column without horizontal scrolling; wide tables get `.table-scroll`.
- A box that is secondary to the main content (help, explanations) goes below it, not beside it.

Text
- Keep pages lean: one short lead under the title, no repeated explanations, no counters or numbers that add nothing, no extra headings for single items, no synthetic-data notices beyond the global banner and the report. For each text and box, ask "does the user need this to act?" and drop it if not.
- Use the same words throughout (Bortfall, Redusert, Mulig bortfall, Over gjenopprettingsmål, Konsekvenser, «Uavhengig konseptdemo»). No mixed Norwegian/English on a page.

Components and interaction
- Buttons `.btn` / `.btn-primary` / `.btn-ghost` / `.icon-btn` always have the slanted shadow described above; nothing else gets it. Choices use `.chip`, `.segmented`, `.radio-cards`; text inputs use `.field` with the limits in `src/lib/text.ts`.
- Step numbers (`.flow-num`) keep their teal colour. Selected/active states use a teal border or amber underline.
- Every page must work at 360, 768, 994, 1280 and 1600px, be printable, pass axe without findings and keep visible keyboard focus.

## Domain and safety boundaries

- Present the app as an independent concept: not a commercial product, and not made on behalf of any bank or provider.
- Never name real companies (banks, IT suppliers or competitors) anywhere: UI text, language files, dataset, README, SPEC.md, page metadata or any other file. Only the fictional names in the dataset are allowed. Express independence in general terms.
- All institutions, services, systems, providers and incidents are synthetic, and every record is marked `synthetic: true`. Never connect to real bank systems or use real personal, customer, transaction, security or confidential data.
- Research before claiming. Before stating anything about regulation, supervisors or the market, check primary sources (the regulator's own publication, EU lists and legal texts), read them rather than relying on search snippets, and keep the wording within what the sources actually say. The verified regulatory basis is in SPEC.md §3.1. Re-check dates before reusing them, since deadlines move.
- Explain impact through visible dependency paths. Label assumptions, missing data and stale data. Never imply that the map proves safety, resilience or DORA compliance.
- No visitor analytics, tracking or personal data collection. Adding any of these requires a spec update and a privacy review.
- No secrets, credentials or privileged services in client-side code.

## Published files

The repo is public. Every file in it (SPEC.md, SKILL.md, README, code, comments, data and commit messages) describes the finished product only:

- No project plans, phases, status reports, test reports, change logs, version history, open questions or dates of when work was done.
- No notes about why the project was made, who it is shown to or how it is used outside the app.
- No internal working notes, local paths, references to files that are not in the repo, or instructions meant for the person building the app.
- No secrets (API keys, passwords, `.env` files), real personal or customer data, or real company names.

Check every file against this list before it is published.

## Change workflow

1. Read the relevant part of `SPEC.md` and identify the end-product requirement and the demonstrator scope.
2. Make the smallest coherent change that advances the specified user outcome.
3. Update `SPEC.md` in the same task if a requirement, acceptance criterion, scope or decision changes.
4. Write user-facing text that a first-time visitor can understand alone. Put that text in both language files (`no.ts` and `en.ts`), not in components.
5. Run the type check, tests and build, and check the changed pages at the screen widths above.
6. Report the changed files, the visible outcome, the verification done, and any remaining gap between the demonstrator and the end-product requirements.
