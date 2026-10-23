# Tracker release — 2026-10-23

## Behavior and contracts

The mobile tracker persists courses, dated cadence and desired-state check-ins in an encrypted,
backend/customer-scoped vault before reporting success. It works as a guest with an explicit
on-device/loss warning. Guest courses enter an account only after an explicit transfer; source
records remain on-device and a durable ID map prevents repeat imports. Account work survives
network failures and logout under its original owner. Account deletion purges tracker records
and receipts on the server, and attempts both ciphertext/key deletion locally; successful server
deletion always hides/logs out the captured identity even if device cleanup fails.

A course repeats from its first civil day every 1–365 days; duration is inclusive calendar days.
Actual history survives schedule/time/pause changes. Current schedules never manufacture old
missed-dose denominators. Deleted remote courses retain pending local facts for explicit recovery
into a new UUID, including known historical records; original deleted IDs are never resurrected.

Operations have immutable IDs and receipts. Revision checks prevent silent overwrites; stale
same-value log operations may converge without a write, but acknowledge only their unchanged
expected revision, never a foreign writer's revision. Open edit forms preserve the revision from
opening even after background refreshes. Legacy clients cannot read or mutate modern schedules.

Reminders are finite exact occurrences, grouped by day/time, within a 366-day horizon and the
remaining global OS notification budget (60 minus other requests/snoozes). iOS uses one-shot
calendar components with no fixed timezone; Android rebuilds dated occurrences on foreground.
The UI reports the actual next date/horizon and asks users to reopen the app to replenish it.
Notification actions use the original occurrence day, wait for owner/vault hydration, commit
locally, and ignore obsolete group members without poisoning storage. Both reminder switches
share the same owner-scoped preference. Reduce Motion removes the check effect.

## Verification

- Baseline: 94 mobile tests passed.
- New checks cover civil intervals/DST boundaries; restart/offline saves; failed disk/key/tamper
  handling; atomic guest transfer; ownership/session transitions; lost/replayed acknowledgements;
  concurrent revisions/ABA; recovery of cached/imported history; obsolete notifications; bounded
  metadata; form retry/draft ID, unknown history and user-facing states.
- `node --test mobile/tests/*.test.mjs` (run from repository root): 124/124 passed on the integrated candidate.
- Mobile/root nonincremental typechecks, scoped root ESLint and Next production build are required.
- `pnpm exec tsx scripts/test-tracker-offline.ts`: 12 grouped real HTTP/Postgres checks passed in a
  dedicated localhost:3187 / 127.0.0.1:5434/hayat_shared_data_test environment; synthetic accounts
  clean themselves up, with no production/CRM/order writes.
- `pnpm exec tsx scripts/test-v2.ts`: 13/13 existing integration groups passed, including unchanged
  public catalog, ownership, address and order contracts, in the same isolated local environment.
  A rerun initially hit the existing login throttle; only the dedicated local server was restarted
  before the clean run. Negative-cell assertions now verify public positive reads plus revision2.
- Mobile/root nonincremental typechecks, scoped root ESLint and Next production build passed.
- Independent read-only Astra review reproduced the critical failure cases and verified fixes.
- Native validation and final release evidence are recorded after the candidate build completes.

Mobile `npm run lint` is not an established non-mutating check: no mobile ESLint configuration or
ESLint dependency exists and Expo's first-run setup installs/configures them. No unsolicited
lint tooling/dependencies were installed; TypeScript and behavior checks run instead.

## Server rollout boundary

The user explicitly approved the VDS deployment with backup and internal TestFlight upload on
2026-10-23. The committed candidate, source hash, additive migration and signed binary were
verified before approval under docs/codex-workflow.md. No local .env or credentials were copied
into the source/image, and the dirty primary backend checkout was not used for deployment.

The additive migration is `prisma/changes/20261023-offline-tracker.sql`. Validate current schema,
backup the live database in custom format, prove the backup decodes, preserve uploads and current
env/compose/container metadata. Apply the additive columns/table before starting the new image.
Keep existing project/env/base compose; use a new image-only override as in the preceding release.
Smoke authenticated snapshot, legacy gating, public catalog and new desired-state receipts using
only dedicated QA customers; remove only the new synthetic tracker fixtures after checking.

**Rollback compatibility:** negative log cells now remain as `taken=false`, and modern schedules
must stay gated from old daily clients. Do not run an unpatched pre-tracker image against this
schema/data: it counts negative cells as taken and may expose interval plans as daily. Prefer a
forward fix or another protocol-compatible image. A whole-database restore would discard unrelated
post-release data and is not a code rollback. Receipts must not be pruned while offline operations
can still retry. Production backup files remain private and are never committed.

Native AES uses the installed Expo57 iOS implementation backed by Apple's CryptoKit. The existing
ITSAppUsesNonExemptEncryption=false remains consistent with OS-provided encryption; no custom
crypto or SQLCipher implementation was added. Native dependency changes require a new binary.

## Packaging / native evidence

The first cloud attempt 1.0.0(10), dacc2352-5235-4bf4-b030-9e74b0a21687, failed before
native compilation: Metro did not include the sibling shared calendar directory. The repository
has separate package-manager projects, not declared workspaces, so mobile/metro.config.js now
extends expo/metro-config and adds only ../shared to watchFolders. Actual iOS (6.2MB Hermes)
and Android (6.4MB Hermes) production exports passed after this fix. Archive inspection found
1059 source files, the shared calendar/vault present, no env/keys/native credentials/dependencies.

Native simulator compilation passed on Xcode26.6 for the existing Hayat Shared Data QA device.
An initial disk-full error corrupted the task's module cache. Only prior generated Hayat iOS
build output and this task's module cache were cleared; no other projects or global simulator
services were restarted. Runtime/appearance evidence follows the successful installation.

Online expo-doctor recommended nine newer SDK57 patch packages already unchanged from the
released baseline; its advisory check remains reported, not suppressed. The new expo-crypto
57.0.4 matches the installed SDK57.0.23 manifest. Offline expo install --check reported up-to-date
with its offline reliability caveat. No blanket SDK/dependency upgrade was attempted.

Primary checkout integration: 315 tracked mobile/shared source files were byte-mirrored after
verifying all295 previous mobile files still matched bb7cba2. Existing dirty backend edits were
preserved. New Metro configuration was mirrored afterward. Primary mobile typecheck passed once
Expo's generated route declaration was refreshed from the identical canonical mobile sources.
The primary full test run passed119 tests but could not load the five pre-existing cross-backend
compatibility checks: its older seed-data module lacks the released component dictionary and the
reference evidence module is absent. That medical seed contract was not overwritten. The canonical
release checkout passes all124 checks and is the sole backend deployment/build source.

## Verified build and rollout

- Code source: 86856a6f5a2310a7df0dfafb7c33f0f1aee8de47.
- EAS production build: 6e96fdf7-a023-4744-85f2-a31d3788eb0d, FINISHED, 1.0.0(11).
- IPA: 22,951,280 bytes; SHA256 27075f411807536af9bc451817fd459277c53c5551ff44234572c4a5324ffb7d.
- Verified bundle ru.biohayat.app/version11, strict deep code signature, native ExpoCrypto code,
  production API string and absence of the local QA API/Metro addresses in the packaged JS.
- Source archive SHA256: 064aec97d4316f950fb908132b78bf6903d81e71aa7c0ffa37412001d8e367e2.
- Primary source mirror: 316 files identical; its30 focused tracker tests and typecheck passed.
- Canonical124 mobile tests, root/mobile typechecks, root lint, Next production build,
  iOS/Android production JS exports, 12 tracker protocol and13 existing v2 groups passed.
- Native runtime/appearance acceptance remains verification blocked: CUA opened an old generic
  Simulator session, and reliable selection of the dedicated QA window could not be completed.
  Those old screens are not evidence for this candidate. No other apps or global simulator
  services were restarted. Do not claim native AES execution, closed-app notification delivery,
  physical haptics, theme/large-type rendering or offline cold-restart acceptance as passed.
- Only this task's local Next/Metro/Postgres were stopped after checks. Temporary UI worktree
  removed after its clean UI commit was integrated. Generated native cache removed after install;
  logs, installed QA binary and signed production IPA remain. Three existing agents were reused;
  the client has no close-agent tool, so they finished but were not reported as technically closed.

The user subsequently authorized and completed both release actions:

- VDS release directory: `/root/biohayat-releases/20261023-86856a6`.
- Live image: `biohayat-app:tracker-20261023-86856a6`, ID
  `sha256:6401dde5403ebf81dc71f6a8e9f416b9fa8326f8eb5514a7447230f9bf5c7719`.
- Private backup: `/root/biohayat-backups/20261023-tracker-86856a6`; fresh pre-cutover custom
  dump SHA256 `81e4ad41d136681a9a6d442aa403a11a3851b56c0b43e40a4b21b0a1304b0832`.
  The dump fully decoded and the uploads archive was readable.
- Migration applied with ON_ERROR_STOP, one transaction, lock_timeout5s/statement_timeout30s.
  Candidate Prisma introspection found zero schema differences before switching only app.
- Exact effective environment, ports and uploads mounts remained unchanged. DB/Caddy container
  IDs and crontab remained unchanged; the legacy Hayat auto-deploy remains paused.
- Seven grouped production checks passed: cold settings/catalog/v1 envelope; pre-cutover bearer
  token validity and anonymous rejection; four-day create/replay/ownership; old-client gates;
  mark/unmark/tombstone revisions/stale conflict/immutable ACK; schedule edit retaining cells;
  exact synthetic cleanup and no resurrection on lost-create replay.
- Counts before/after:119 products,4 customers,4 original courses,5 original logs. Six immutable
  receipts from the scoped synthetic course remain by design; its plan/logs were removed.
  No production order/CRM writes were performed. Catalog validation proves total and envelope,
  not every price; session validation covers bearer tokens, not a separate website-cookie test.
- Independent read-only evidence review found no material bounded server acceptance gap.
  Sanitized `deployment-proof.json` also records live image, schema, backup, configuration,
  container, counts and exact fixture/receipt checks without credentials or clinical payloads.
- EAS submission:13c26ed0-7d6a-41a2-ae88-2a8008425d39. App Store Connect build:
  `20a8748d-9251-44c4-ac7a-1c4d4ed452fb`, VALID, IN_BETA_TESTING.
- Existing internal group `9b913c5b-5f05-4e43-8660-9bd963cbf06c` includes build11 and its existing
  tester. Russian test notes verified via betaBuildLocalizations.whatsNew. No external-group
  publication or Beta Review submission was performed; external state remains READY_FOR_BETA_SUBMISSION.
- Native runtime/visual limitations remain as disclosed and accepted for this internal test release.

