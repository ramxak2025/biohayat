# Tracker offline contract, 2026-10-23

User acceptance: reliable native tracker, guest mode with honest device-only/loss warning,
full offline CRUD/check-in surviving restart, explicit account backup/sync, every-N civil days
from a selected first date, clear UI with restrained purposeful motion and Reduce Motion.
The current simulator may not be restarted if that interrupts other projects.

Root owns shared contracts, schema/API, encrypted local engine, session binding and notification
scheduling. Sol UI work uses a verified isolated worktree and consumes the public controller.
Astra independently reviews/derives critical tests. No child delegates. Deployment/publication
requires the standing explicit authorization rule after a concrete candidate is verified.

## Calendar/history

One pure calendar module uses civil-day ordinals, not elapsed local milliseconds. First day,
first+N, first+2N are due. Duration is calendar days, inclusive, separate from dose count.
Times follow the device's local wall clock. Anchors stay fixed on travel. Modern snapshot POST
atomically binds missing legacy anchors to creation day in the first modern client's validated
IANA zone; existing log day strings never move. New schedules are version2 and gated from old
read AND write consumers, including cached old clients. Existing version1 daily plans survive.
History presents actual recorded marks, including removed old times; it does not reconstruct
unrecorded historic prescriptions or missed-dose/streak denominators from today's schedule.
Future marks are rejected. Today's new marks require a due active schedule; existing historical
cells may be corrected and explicitly imported past guest history may be recorded.

## Durable state, identity and replay

Expo57 native AES-GCM encrypts each backend/owner partition with a SecureStore key and owner/schema
AAD. Only ciphertext enters AsyncStorage. Entire read/reduce/encrypt/persist/publish transactions
are serialized; success is emitted after local durability. Key loss/corrupt ciphertext is an
error, not an empty vault. One SDK dependency, expo-crypto, is justified for OS-backed encryption.
Its installed iOS AES implementation imports CryptoKit. No SQLCipher/custom crypto dependency.
Account partitions stay encrypted and hidden after logout; they resume only for the same owner.
Account deletion purges the matching local partition. No guest data enters an account implicitly.
Guest import atomically persists destination ID mapping/outbox, keeps source until success and
is locally idempotent across crashes. Its banner explains loss on uninstall/device replacement.

Server desired-state operations use immutable op IDs/hashes, CAS plan/cell revisions, and receipts
that survive plan deletion. A lost response can be replayed without toggling or recreating data.
Negative log cells persist a revision to detect ABA. Ack revision is distinct from CURRENT entity;
a replay after deletion returns currentPlan:null. Pending children rebase only on their own
predecessor acknowledgment; remote revisions cause explicit recoverable conflicts. Refresh cannot
discard pending local intent. Customer-row locks serialize new and legacy tracker mutations.
Snapshots are complete for all plans and their declared bounded log range; partial/unknown history
never means zero. Authentication errors retain the original owner's work without retry storms.

## Reminders and verification

Schedule exact upcoming civil occurrences, honoring cadence/start/end/pause; next60 maximum,
within366days, also budgeting snoozes against OS pending notifications. Show actual horizon.
Replenish on launch/foreground/edits. No indefinite delivery guarantee. Payload carries occurrence
day, slot and owner; notification actions wait for vault hydration and commit locally first.
Duplicate responses are desired-state/idempotent; late-night actions retain original day.
Update today/timezone on foreground, midnight and in-app clock changes.

Baseline94 mobile tests passed before behavior changes. Required regression scenarios include
storage failure/key loss, process restart, queued CRUD, lost create ack then remote deletion,
mark ack then newer unmark, opposite/rapid taps, concurrent devices, account changes during I/O,
401 recovery, guest import crash, timezone/DST/leap/year boundaries, legacy anchor races and cached
old-client mutation rejection. Independent actual-diff review and integrated final checks follow.
