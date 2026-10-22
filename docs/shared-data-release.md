# Shared website/mobile backend — deployed release

## Status and result

Prepared from live commit `6db05438be3ace0e6b70c53add745ceeee1fc69d` in the managed
`hayat-shared-backend/Hayat` worktree. The older primary website checkout must
not be deployed over the VDS website. The primary mobile changes are integrated
into this candidate. The mobile dock/typography follow-up is included, with
43 passing mobile tests and native iOS screenshots. See `api-v2-verification.md`
for checks and limits.

Production origin: `https://new.biohayat.ru`; server: `155.212.211.210`.
Deployment of committed source `b1be149` completed on 2026-10-06 (Europe/Moscow).
Application source is unchanged from `021c038`; `b1be149` adds release instructions.
Active source: `/root/biohayat-releases/20261006-b1be149`. The original checkout
`/root/biohayat` remains at the live base with its untracked `backup.sql` preserved.
Credentials are not stored in this document.

The additive v2 API shares the website's PostgreSQL tables. The existing v1
contract remains available. Website checkout, favorites, account and stock
cancellation paths receive the matching consistency fixes. Mobile release API
origin is `https://new.biohayat.ru/api/v2` in defaults and EAS profiles.

## Authorized release procedure

The user explicitly approved production deployment on 2026-10-06. Execution
results are recorded below.

1. Obtain explicit deployment approval. Recheck remote HEAD, uncommitted changes,
   running image, disk space, database health and effective Compose project name.
   Stop and reconcile any source change since the recorded live base.
2. Acquire `/tmp/biohayat-deploy.lock`, the lock used by the verified live cron.
   Recheck source/image after acquiring it. Save the original root crontab in the
   protected backup directory and comment out only the Hayat auto-deploy job.
   Keep it paused until its tracked source branch contains this approved release;
   the old script rebuilds the app before attempting `db:push`, so even a rejected
   schema change would not protect the running application. Leave other jobs intact.
   Save a fresh database backup using `pg_dump` from the existing DB container;
   verify the dump is readable. Retain the current app image under a rollback
   tag, the original release source/configuration and upload volume identity.
   Keep all secrets only on the server. Do not reset the server checkout or touch
   its existing `backup.sql`.
3. Transfer only the committed candidate to a separate release directory. Reuse
   the existing server environment through a protected server-local file; do not
   transfer the local test `.env`. Ensure both the Docker build argument and
   runtime `NEXT_PUBLIC_SITE_URL` equal `https://new.biohayat.ru`. Build the new
   application image before replacing the running container. Database and
   uploads must remain the existing Compose volumes under project `biohayat`.
4. Review and apply `prisma/changes/20261005_shared_mobile_data.sql` **once** to
   the existing database with `psql -v ON_ERROR_STOP=1`. It is transactional and
   uses bounded lock and statement timeouts. Verify the target fields/table are
   absent before execution, then compare the actual database with the candidate
   Prisma schema. It adds nullable/defaulted columns, a Device table and indexes; it removes no
   customer, product or order data. Check the resulting schema. Do not substitute
   `db push --accept-data-loss`, reset, or seed commands.
5. Recreate only the app container with the new image and existing environment/
   volumes. Keep database and Caddy running. Verify app health/logs and HTTPS.
6. Perform read-only public smoke checks on catalog, product images, v1 and v2,
   and compare representative product IDs/prices. Use a separately authorized
   test account for private live smoke; never run the local fixture harness,
   create test orders, or send CRM messages on production without authorization.
7. Verify the native app against the deployed v2 origin. Deliver the updated
   development build, or prepare a separately authorized signed distribution.
   JS/Hermes export is not an installed IPA/APK or App Store publication.

## Rollback

Before checking rollback eligibility, quiesce and drain candidate order writes.
The simplest gate is to stop the candidate app while retaining DB/Caddy, wait
for its database transactions to finish, then query eligibility. Keep this gate
in place through image replacement; checking while checkout remains available
has a race with new orders.

Before any `inventoryVersion = 1` order exists, the saved application image can
be restored with the same configuration and volumes. Leave the additive schema
in place: the old Prisma client ignores the new fields/table. Verify this condition
from the database immediately before considering an old-image rollback.

After any `inventoryVersion = 1` order exists, **do not perform an unconditional
old-image rollback**. Prefer a forward fix. If old code is unavoidable, first gate
order status/cancellation operations and CRM order webhooks, then reconcile each
new order's stock and `stockReserved` markers before enabling old or new processing.
The old cancellation path restores stock without clearing these markers; a later
new-code cancellation could restore the same stock twice. The old webhook can also
reopen cancelled orders. Schema compatibility alone is not behavioral compatibility.

Never drop the additive fields, restore an old database over new orders, or delete
volumes. Keep the old auto-deploy cron paused during rollback. Restoring it requires
the tracked source branch to contain the approved compatible implementation. A
rollback disables v2 and its safeguards; suspend the new mobile release accordingly.

## User-visible details

Cart contents remain per device. Existing account favorites/orders/profile and
tracker records are shared; old unscoped mobile credentials require sign-in
again. Old local cart and guest favorites are not automatically carried forward.
Historical orders require manager-led cancellation and inventory reconciliation.
Native UI for address-book management, promo/referral programs and wholesale
ordering is outside this integration; the existing website retains those flows.

## Production execution evidence — 2026-10-06

- Release image: `biohayat-app:shared-20261006-b1be149`, image ID
  `sha256:a1ade084112f25c420c6f869ad11e0d78a65226b9672376106bb5ace57cef6c3`.
  Docker build (including the production Next.js/Turbopack build) completed on VDS.
  The running image's revision label is `b1be149`.
- Protected backup directory: `/root/biohayat-backups/20261006-b1be149`.
  It contains the custom-format PostgreSQL dump, uploads archive, base and release
  source archives, original environment/Compose/Caddy files and crontab, image and
  volume identities, checksums and execution logs. `pg_restore --list` and a full
  `pg_restore --file=/dev/null` read passed; the uploads archive listing passed.
  The retained old image is `biohayat-app:rollback-20261006-b1be149`.
- Only the verified Hayat auto-deploy cron was commented out while holding its
  existing flock. Other crontab lines were preserved byte-for-byte. **It remains
  paused** until its tracked source branch contains the compatible approved release.
  No remote Git branch was pushed or reset. Do not resume the old job blindly.
- Applied `prisma/changes/20261005_shared_mobile_data.sql` once, after checking all
  new fields/table absent, with `lock_timeout=5s`, `statement_timeout=60s` and
  `ON_ERROR_STOP`. Candidate Prisma-to-live-schema diff reports **no difference**.
  All nine new fields and the new Device table/indexes/constraint are covered by
  that comparison. Existing row counts remained 119 products, two customers, two
  orders and two order items; both historical orders retained inventoryVersion 0.
- Recreated only app with explicit project `biohayat`, protected server-local
  environment and `--no-deps --no-build`. Database/Caddy container IDs and all
  persistent mounts remained identical. Runtime environment (including auth and
  database settings) matches the original resolved configuration.
- HTTPS readiness passed after one transient 502 during app replacement. Public
  catalog, product pages and representative image requests returned 200. Both v1
  and v2 report 119 products; all 24 first-page rows match by ID, slug and price,
  and website catalog links match in order. Examples: metodrol 90000 kopecks,
  vitamin-d3-k2 130000, kyst-al-hindi-maslo 60000.
- Categories, banners, public settings and product detail v2 GETs returned 200.
  Unauthenticated account, orders, favorites, addresses and intake GETs returned
  401. No test customers/orders, authenticated production writes or CRM messages
  were created for smoke testing. Initial app logs contained no error lines.
- Production logs and markers are retained in the protected backup directory:
  `docker-build.log`, `migration.log`, `schema-verification.log`, `app-cutover.log`,
  `containers.before.json`, `containers.after.json`, and `*.complete` markers.
  Backups have not been test-restored into a separate database; archive readability
  and complete decode were verified without production restore operations.
- The existing iOS development client was run with
  `EXPO_PUBLIC_API_URL=https://new.biohayat.ru/api/v2`. It displayed **119 products**,
  the matching first-page prices and the live Metodrol image/detail/900-RUB dock.
  Live checkout/customer mutations were intentionally excluded. Screenshots:
  `/tmp/hayat-shared-data/live-mobile-catalog.png` and `live-mobile-product.png`.
- Production names exposed a remaining narrow category-label issue. A separate
  mobile-only follow-up places icons above the full-width names, preserving tap
  destinations and intrinsic heights. The original standard leaf beside ХАЯТ
  was also replaced, at the user's request, with the website's exact normal/white
  tree logo PNGs. These mobile source changes do not modify the deployed backend.
  Primary mobile integration passed 43/43 tests and nonincremental TypeScript;
  independent final reviews found no material issues. Normal and enlarged native
  screenshots confirm the new category layout and official logo after reload.
  Native hot text-size changes briefly showed stale text layout before reload;
  unrestricted in-place Dynamic Type transitions remain unverified.
  Android runtime and signed IPA/APK/store delivery remain unverified/unpublished.

## Internal TestFlight delivery — 2026-10-06

- The user authorized TestFlight delivery and then selected the existing internal
  group instead of external testing. No external group, external review submission
  or App Store public release was created.
- Built mobile source from committed `e3a1337b69fc9f59ea5fcad1698b9c2dd7842b9c`
  using scoped EAS CLI 24.10.0 and the production store profile. All 277 uploaded
  mobile files matched that commit. Independent read-only release review found no
  material blockers, local environment files, credentials or runtime localhost
  URLs in the upload payload. Existing signing credentials were reused unchanged.
- EAS build `b85d2b5d-163d-4c76-868f-fbeadaf1dd1c` finished successfully:
  **1.0.0 (6)**, bundle `ru.biohayat.app`, team `98SHYK65HQ`.
  The downloaded 22,862,263-byte IPA has SHA-256
  `b76fcecd797855361d74deff51538f1150e969f507a59106b533b8d6d8edf349`.
  ZIP integrity, embedded bundle/version/build, production v2 URL, distribution
  profile and binary entitlements passed. `codesign --verify --deep --strict`
  passed; `get-task-allow` is false.
- EAS submission `86e2fdfc-ac5a-4eb9-bb59-59f4490d14fe` finished successfully.
  An earlier scheduling request with release notes was rejected by EAS because
  that convenience feature requires Enterprise; ordinary submission succeeded
  without changing the account plan. Russian test notes were saved directly in
  App Store Connect and read back for verification.
- Apple build resource `14a7121d-7e5f-47cb-8c18-2f405aa8ea6c` reports
  `processingState=VALID` and `internalBuildState=IN_BETA_TESTING`.
  Membership was verified in **Внутреннее тестирование**, group
  `9b913c5b-5f05-4e43-8660-9bd963cbf06c`. Its existing automatic distribution
  added the build; the existing tester list and permissions were unchanged.
- Verification evidence: `/tmp/hayat-shared-data/ipa-build6-verification.json`,
  `testflight-build6-verification.json`, and EAS build/submission status records.
  This establishes signed iOS delivery and group availability, not installation
  or runtime testing of the TestFlight binary on a physical device. Android
  distribution remains outside this delivery.

## Mobile interface refinement — 2026-10-22

- Operational screens now default to compact native navigation titles in every
  content state. Explicit large-title opt-in remains available. Shared screen
  wrappers preserve their first scroll descendant; loading/error grids and
  article lists reserve the transparent header inset correctly.
- Cards use calmer borders and smaller default corners; primary buttons and
  selected filter chips use accessible action colors without an ambient glow.
  The guest invitation is more compact and home sections appear immediately.
  Official Hayat assets, product data, routes and business logic are preserved.
- Authentication opens as a native sheet above its originating screen, with
  normal-height and expanded detents, full-height accessibility/short-screen
  fallback, persistent measured close header, original logo and visible field
  labels. Registration shares the sheet. Filter and time-picker headers use the
  same close treatment. Search retains its native full-height modal because its
  fixed input plus interchangeable lists overlap under form-sheet frame rules;
  this was reproduced and the corrected native presentation was verified.
- Route-scoped auth dismissal is idempotent, observes removal/unmount and live
  focus, and targets the exact auth route with a source/target-bound POP. A late
  login response cannot pop the screen underneath a dismissed sheet. The
  underlying authentication/session and checkout-resume logic was not changed.
- Verification: 61 mobile tests and nonincremental TypeScript pass; independent
  final review has no unresolved material findings. The Android close-symbol
  regression was fixed and tested with the installed non-iOS Expo renderer.
  Baseline tests reproduced expanded header defaults and insufficient selected
  action contrast; the original late auth callback reproduced a double back.
- Native QA used the existing iOS 26.5 development client on the dedicated Hayat
  iPhone 17 Pro and compact iPhone SE simulators: light/normal text, dark/large
  text, compact account header, auth and registration, sheet expansion, password
  keyboard visibility and close-to-account, filter cancellation, and search
  layout. Public catalog still showed 119 products. No live sign-ins, customer
  writes, orders or backend deployments were performed.
- Native screenshots: the task's visualization folder `hayat-ui-20261022/`
  contains `account.png`, `auth.png`, `registration-expanded.png`,
  `compact-dark-account.png` and `search.png`. Detailed local test logs reside
  in `/tmp/hayat-ui-20261022/`. Physical-device gestures/performance, Android
  device rendering and authenticated native time-picker flows were not tested.

### TestFlight build 7 delivery

- Source: `092bb2f85f6be5c554c0d16633f9294b660b06a9`. All 281 tracked mobile
  files matched the primary checkout and inspected EAS archive. Local environment
  files, private keys and installed dependencies were excluded from the archive.
- EAS production build `f2ec35a7-4775-47e6-8a59-bab52264d3ea` and submission
  `a078fa4f-e670-49a7-8c5d-50e8d0407f0d` finished successfully. Signing credentials
  were reused. IPA version **1.0.0 (7)**, `ru.biohayat.app`, 22,864,036 bytes,
  SHA-256 `004aba73ef6e3b0c3e84e6c669ed2281cae4c77fcb7e6cc649a39a525615af9b`.
  ZIP integrity, embedded production API origin/version and binary entitlements
  passed; `codesign --verify --deep --strict` passed. Android JS/Hermes export
  also completed; this is not an Android native-device test or store release.
- Apple build `84691dde-f39d-4cb7-87bf-e655e2ac76da` reports `VALID` and
  `IN_BETA_TESTING`. Membership in existing internal group **Внутреннее тестирование**
  (`9b913c5b-5f05-4e43-8660-9bd963cbf06c`) and Russian release notes were read back
  successfully at 19:29 Moscow time on 2026-10-22. No external/public release
  or tester permission change was made.
- Delivery evidence is retained in `/tmp/hayat-ui-20261022/` as
  `ipa-verification.json`, `testflight-verification.json` and EAS status records.

## Sign-in and product redesign — 2026-10-22

- Replaced the fixed-height sign-in composition with a measured intrinsic form,
  centered original brand mark and readable title, visible field labels and
  adjacent form actions. Native detents follow login, registration and error
  content; overflowing forms retain scrolling and home-indicator clearance.
  Floating iOS 26 sheets avoid redundant bottom space; full-height, older-iOS
  and Android forms retain their manual bottom inset. Dismissal guards remain.
- Empty phone fields now display `+7 ___ ___-__-__`. Placeholder characters never
  enter the model. Ten-digit subscriber input, domestic 8-prefix and formatted
  +7 input converge on the canonical number. Explicit foreign and overlong
  numbers are no longer silently rewritten/truncated into another account.
  Autofill metadata, clear behavior and one-time focus advance are preserved.
- Product identity precedes a bounded, rounded, contain-fit media panel beneath
  an opaque compact navigation bar. Price and availability remain factual;
  the purchase dock is always available and reserves its measured height once.
  Removed vertical photo stretching and duplicate availability text. Existing
  details, contraindications, full-screen media, sharing and tracker flows remain.
- Product cards and cart product links use the public, installed Expo Router
  `Link.AppleZoom` source and target APIs on iOS. The native transition originates
  from the actual tapped photo; independent favorite/cart actions do not navigate.
  Reduced Motion, Android, old iOS and source-less/cross-modal entry have normal
  navigation fallbacks. Expo's Slot child-style requirement is covered by a
  regression using its installed renderer; source frames/refs are preserved.
- Verification: **76 tests**, nonincremental TypeScript and independent code
  review passed. Native iOS 26.5 QA confirmed visible mask, ten-digit input
  formatting, redesigned layouts and pointer-driven card expansion/return.
  Native capture was made after restarting the dedicated simulator with
  its QA Reduce Motion setting disabled. No live sign-in, customer/order write or backend
  deployment was performed. Android and older-iOS native execution is unverified.
- Local evidence: `/tmp/hayat-redesign-20261022/`; native transition recording
  `product-zoom.mp4`, extracted `zoom-a.png` through `zoom-c.png`, and return
  recording `product-return.mp4`. A concise actual-animation clip is retained
  in the task visualization folder `hayat-redesign-20261022/product-opening.mp4`.

### TestFlight build 8 delivery

- Source `c1a23d85bef1b2c8f46722db25f1ef5c06a252b8`; all 287 tracked mobile
  files matched the primary checkout and inspected upload archive. Private keys,
  local environment files and installed dependencies were excluded.
- EAS production build `9ac78220-4c3e-45a7-94eb-d6beb99a18ab` and submission
  `03618ad2-f5d7-4258-a503-c549d17272eb` finished successfully. Version **1.0.0 (8)**,
  bundle `ru.biohayat.app`; existing signing credentials were reused.
  The 22,868,016-byte IPA has SHA-256
  `67876a367f797e6d6ec0f0751318f5d4d318ef9177116e7cc62bf08397a92321`.
  ZIP integrity, production API origin, version, binary entitlements and
  `codesign --verify --deep --strict` passed. Android JS/Hermes export passed.
- Apple build `43880609-9c4d-4dbd-8d02-61c3119fc646` reports `VALID` and
  `IN_BETA_TESTING`. Its membership in **Внутреннее тестирование**
  (`9b913c5b-5f05-4e43-8660-9bd963cbf06c`) and Russian test notes were read back
  successfully on 2026-10-22. No external/public release or tester access change.
- Evidence is in `/tmp/hayat-redesign-20261022/`: `ipa-verification.json`,
  `testflight-verification.json`, EAS status records and final test/export logs.
