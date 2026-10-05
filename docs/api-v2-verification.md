# Shared website/mobile data — verification, 2026-10-05

Candidate is based on the exact live website commit
`6db05438be3ace0e6b70c53add745ceeee1fc69d`, with an additive `/api/v2` and the
updated mobile client. Production has not been changed. Its current origin is
`https://new.biohayat.ru`; `localhost:3187` is the isolated test server.

## Reproducible local checks

`scripts/test-v2.ts` creates identifiable fixtures and removes only those exact
records. It refuses remote databases, any database other than
`hayat_shared_data_test` on localhost port 5434, remote HTTP origins, or enabled
outbound Bitrix integration. Never point this harness at production.

With a local `.env` containing that database URL, a local test AUTH_SECRET and
`NEXT_PUBLIC_SITE_URL=http://localhost:3187`:

```sh
pnpm exec prisma generate
pnpm exec tsc --noEmit --incremental false
pnpm exec next build --webpack
pnpm exec next start --port 3187
# In another terminal, same checkout:
pnpm exec tsx scripts/test-v2.ts
```

Start a fresh server before repeating the harness: a run uses four of the five
website login attempts permitted per IP in fifteen minutes. Tests do not bypass
rate limits. A dedicated test database must already match `prisma/schema.prisma`.

From the primary checkout's `mobile/` (its installed dependencies were reused):

```sh
node --test tests/*.test.mjs
npx --no-install tsc --noEmit --incremental false
npx --no-install expo export --platform ios --platform android --output-dir /tmp/hayat-shared-data/mobile-export-final
```

The integrated mobile source/tests were byte-compared with the tested primary
copy; 224 files matched at the final independent review.

## Final evidence

- **13 grouped HTTP/Prisma checks passed against the production Next build**, not
  only the development server. Fixture cleanup passed. Negative database guard
  checks rejected a remote host and a different local database name.
- **43 mobile tests passed**, including tests that execute the real auth store,
  API client, query cache, checkout helper and extracted UI callbacks. Eight
  routing tests use the installed Expo Router resolver; they reproduced the old
  unmatched checkout and sibling routes before their fixes. Mobile
  TypeScript passed. Final iOS and Android JS/Hermes exports passed after the
  logout/deletion race and navigation fixes.
- Server TypeScript and `next build --webpack` passed. Scoped backend ESLint
  had zero errors and two React effect warnings in the changed
  favorites provider. `git diff --check` passed; no suppressions were added.
- **Migration rehearsal passed**: generated the original live schema into a
  separate local `hayat_shared_migration_test` database, applied
  `prisma/changes/20261005_shared_mobile_data.sql` with `ON_ERROR_STOP=1`, and
  compared the result to the target Prisma schema. Result: `No difference
  detected`, exit 0. No production database was used.
- Independent critical review completed with **no unresolved material findings**.
  Reproductions verified cross-account isolation, serialized secure-storage
  writes, delayed notification cleanup, exact-once reservation restoration,
  terminal cancellation, concurrent same-key checkout with only one CRM-sync
  invocation, serialized intake toggles and website favorites account boundaries.

HTTP coverage: catalog sorts/filters/pagination; batched saved product IDs beyond
the default page; current prices and image origins; categories/settings/content;
legacy v1 envelope compatibility; shared web/API customers; additive favorites;
inactive/deleted sessions; private record ownership; concurrent default addresses;
whole-cart validation; stale totals; stock competition; idempotent retries and
same-key concurrency; historical cancellation; terminal webhook; shared intake,
logs and consultations.

Evidence logs on this machine:
`/tmp/hayat-shared-data/backend-build.log`,
`/tmp/hayat-shared-data/http-production-verification.log`,
`/tmp/hayat-shared-data/mobile-export-final.log`,
`/tmp/hayat-shared-data/migration-verification.log`.

## Limits and release behavior

- Signed IPA/APK builds, physical devices, native push delivery, external CRM
  delivery, external delivery services and production deployment are not proved
  by these checks. The CRM invocation-count check uses a stub.
- Server HTML/HTTP checks and actual-provider concurrency tests do not by
  themselves prove browser interaction. Native/browser smoke evidence, if
  performed, is recorded separately below.
- Cart contents remain local to each device. Catalog, prices, stock, customer
  identity/profile, account favorites, orders, addresses, tracker and
  consultations use shared database records. An API endpoint does not imply a
  native screen exists for every website feature.
- Old unscoped credentials/private cache are discarded; users sign in again.
  Old local cart/guest-favorite storage is not automatically migrated. Account
  favorites/orders remain in the server database.
- Historical orders have no reliable reservation provenance; their cancellation
  requires manager handling and manual inventory reconciliation. New orders
  record and restore only the stock actually reserved.
- Publication and production deployment require separate explicit authorization
  under `docs/codex-workflow.md`. See `docs/shared-data-release.md`.

## Orchestration constraints

Sol handled ordinary mobile implementation, routing and the independent backend
harness; Luna handled bounded inventory/documentation/packaging reads. Critical
synchronization decisions and fixes stayed with the orchestrator; a separate
Astra reviewer performed read-only critical reproductions and final diff review.
The client has no agent-close operation and does not expose per-agent filesystem
sandbox enforcement here; completed agents were reused, with read-only review
maintained by scope and observed actions. No cost savings are inferred from these
role assignments.

## Native and browser smoke on the final client

Used a dedicated **Hayat Shared Data QA** iPhone 17 Pro simulator on iOS 26.5
(`8FD6B2AD-899F-4EE4-B700-BDE60627BA17`), the existing matching Expo57 Debug
client and current Metro JS pointed at localhost3187/api/v2. Other project
simulators were not changed. Browser used the same local production Next
server. All records below were disposable fixtures; outbound CRM was disabled.

- Website and native catalog both displayed the same fixture product at
  **1,234 RUB**; both authenticated the same fixture customer.
- Adding a favorite in native appeared on the website. Removing it through
  the website button produced the native empty state when favorites reopened.
- Native checkout created an order visible in the website account. The first
  pass exposed an existing relative-route defect after successful submission.
  The same cause also affected sibling order/article/consultation/product links.
  Fixed routes were independently reviewed and covered by eight resolver tests.
- Final native retest created order **16**, showed **“Заявка принята”**, opened
  order history and its correct detail screen, and the same order16/1,234RUB
  appeared on the website. Product navigation from account favorites also
  passed on iOS after the route fix.
- The final export after all routing fixes completed successfully for both
  iOS and Android. This is JS/Hermes export, not signed native distribution.

Screenshots before fixture cleanup:
`/tmp/hayat-shared-data/mobile-order-success.png` and
`/tmp/hayat-shared-data/web-mobile-order.png`. Other native flows and Android
runtime interactions were not exhaustively exercised.

After smoke, scoped cleanup removed only the two UI-fixture orders, fixture
customer, product and category. Temporary browser, Metro/Next processes and
the task-owned simulator were stopped. No production records were created.

## Mobile dock and typography follow-up (2026-10-05)

The product dock no longer adds a fixed 49-point tab height on top of the native
inset. It uses an 8-point gap and its measured height for content reservation.
Narrow layouts or enlarged text stack price and action. Shared buttons grow with
their labels; prices retain nonbreaking currency groups; section headings wrap;
stepper controls have 44-point iOS / 48-point Android targets.

Display-only Russian typesetting binds short prepositions and common numeric
units, preserving paragraphs, existing nonbreaking spaces, URLs, emails,
technical identifiers and nested React elements. It does not modify input/API
values or join across link/element boundaries. Compact product-card excerpts
and system navigation titles may still intentionally use ellipsis.

Native large-text checks exposed a clipped home hero, narrow category labels
and a squeezed catalog count. Hero content/header and catalog-control heights
are now measured; category widths respond to font size. Independent review
caught stale hero height when the tallest server banner was removed; a rerender
regression reproduces and fixes that case without another retained-banner
layout event (852 to 367 points in the test scenario).

Final evidence after integration:

- 43/43 mobile tests and nonincremental TypeScript pass, independently rechecked.
- Independent final diff review has no unresolved material findings.
- Final iOS and Android JS/Hermes exports pass; log:
  `/tmp/hayat-shared-data/mobile-export-ui-release.log`.
- `git diff --check` passes; Impeccable typography detector returns no findings.
- Native iPhone SE3, iOS26.5, dark mode and XXXL text: full home heading with
  correct short-preposition grouping and readable cart total/action confirmed.
- Native iPhone17Pro in system Reduce Motion mode: 1,234-RUB product dock sits
  approximately 8 points above native tabs. In dark/XXXL mode it stacks cleanly;
  increasing quantity from one to two shows 246,912 RUB without clipping.
- Screenshots: `/tmp/hayat-shared-data/ui-final-product-dock.png`,
  `/tmp/hayat-shared-data/ui-final-product-large-type.png`,
  `/tmp/hayat-shared-data/ui-final-home-typeset.png`, and
  `/tmp/hayat-shared-data/ui-final-cart-compact.png`.

Visual limits: concurrent Simulator use by another task and unreliable automated
scroll gestures prevented a complete final animated-reveal/end-of-scroll and
category-scroll pass. Dock position was confirmed using the genuine iOS Reduce
Motion setting, with no application-code override. The task-owned iPhone17Pro
QA device retains Reduce Motion enabled for that scenario; check it before a
future animation test. No Android device/emulator, signed distribution or
physical-device check was performed. These are JS exports, not IPA/APK builds.
No production data or server configuration changed in this UI follow-up.

After this UI check, scoped cleanup removed exactly two local typography-fixture
products and their category. Both task-owned QA simulators and the local Metro/
Next processes were stopped. The other task's simulator/chat was not modified
or messaged. All 462 baseline files outside primary `mobile/` remain unchanged.

## Approved VDS deployment and real-catalog follow-up (2026-10-06)

The shared backend was deployed after explicit user approval. See
`shared-data-release.md` for the exact image/source, verified protected backups,
additive migration, app-only cutover, paused competing cron and safe rollback
conditions. Public HTTPS checks passed: v1/v2 both report 119 products; all 24
first-page IDs/slugs/prices and website links match. Public v2 routes return 200,
and private routes reject unauthenticated requests with 401. No production test
accounts/orders or CRM messages were created.

The iOS development client loaded the deployed production catalog (119 products)
and live Metodrol detail at 900 RUB. This is still a development client served by
Metro, not a signed distribution build. Evidence: `/tmp/hayat-shared-data/`
`live-mobile-catalog.png`, `live-mobile-product.png`.

Actual category names revealed residual midword wrapping at normal size. Moving
the icon above the full-width label fixes the 88-point text bottleneck, retains
intrinsic height/accessibility/tap routes, and passes the regression that failed
with the old layout. At the user's request, both header states now use exact
website brand PNGs (normal/white tree mark), replacing the standard leaf icon.
No API/backend/dependency changes were needed for these refinements.

Final primary checks: 43/43 mobile tests and nonincremental TypeScript pass;
independent category and brand component reviews found no material issues.
The managed checkout lacks mobile dependencies, so its focused 16 typography
tests passed but full checks were run using the installed primary mobile stack.
Normal native category screenshot: `live-mobile-categories-final.png`;
XXXL after reload with the official white logo: `live-mobile-official-logo-large.png`.
Changing native text size while running briefly retained stale layout; fresh
reload renders full hero copy correctly. In-place font-size transitions and
horizontal/end-of-scroll gestures are not fully verified. Previous Android
JS/Hermes exports predate these final style/asset-only changes; Android runtime,
physical devices and signed distribution remain unverified.
