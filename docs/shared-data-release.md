# Shared website/mobile backend — release candidate

## Status and intended result

Prepared from live commit `6db05438be3ace0e6b70c53add745ceeee1fc69d` in the managed
`hayat-shared-backend/Hayat` worktree. The older primary website checkout must
not be deployed over the VDS website. The primary mobile changes are integrated
into this candidate. See `api-v2-verification.md` for checks and limits.

Production origin: `https://new.biohayat.ru`; server: `155.212.211.210`;
current checkout: `/root/biohayat`. Credentials are not stored in this document.
Latest read-only check found the same base commit, only untracked `backup.sql`,
and running `biohayat-app-1`, `biohayat-db-1`, `biohayat-caddy-1` containers.

The additive v2 API shares the website's PostgreSQL tables. The existing v1
contract remains available. Website checkout, favorites, account and stock
cancellation paths receive the matching consistency fixes. Mobile release API
origin is `https://new.biohayat.ru/api/v2` in defaults and EAS profiles.

## Authorized release procedure (not yet executed)

1. Obtain explicit deployment approval. Recheck remote HEAD, uncommitted changes,
   running image, disk space, database health and effective Compose project name.
   Stop and reconcile any source change since the recorded live base.
2. Save a fresh database backup using `pg_dump` from the existing DB container;
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
   adds nullable/defaulted columns, a Device table and indexes; it removes no
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

If health checks fail, restore the saved application image with the same
configuration and volumes. Leave the additive schema in place: the old Prisma
client ignores the added fields/table. Do not roll back by dropping columns,
restoring an old database over new orders, or deleting volumes. A rollback to
old code disables v2 and its new safeguards; suspend the new mobile release and
reconcile any orders written during the failed release before another attempt.

## User-visible details

Cart contents remain per device. Existing account favorites/orders/profile and
tracker records are shared; old unscoped mobile credentials require sign-in
again. Old local cart and guest favorites are not automatically carried forward.
Historical orders require manager-led cancellation and inventory reconciliation.
Native UI for address-book management, promo/referral programs and wholesale
ordering is outside this integration; the existing website retains those flows.
