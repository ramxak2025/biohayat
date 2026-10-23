# Tracker candidate — 2026-10-23

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

No production changes are authorized by this implementation task yet. Deployment/publication
requires separate explicit user approval under docs/codex-workflow.md. Prepare the committed
candidate, its source hash, migration and backup plan before requesting that approval. Never
copy a local .env or credentials into an image/source archive or deploy the dirty primary checkout.

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
