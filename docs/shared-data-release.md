# Shared website/mobile backend — release candidate

## Status and intended result

Prepared from live commit `6db05438be3ace0e6b70c53add745ceeee1fc69d` in the managed
`hayat-shared-backend/Hayat` worktree. The older primary website checkout must
not be deployed over the VDS website. The primary mobile changes are integrated
into this candidate. The mobile dock/typography follow-up is included, with
43 passing mobile tests and native iOS screenshots. See `api-v2-verification.md`
for checks and limits.

Production origin: `https://new.biohayat.ru`; server: `155.212.211.210`;
current checkout: `/root/biohayat`. Credentials are not stored in this document.
Latest read-only check found the same base commit, only untracked `backup.sql`,
and running `biohayat-app-1`, `biohayat-db-1`, `biohayat-caddy-1` containers.

The additive v2 API shares the website's PostgreSQL tables. The existing v1
contract remains available. Website checkout, favorites, account and stock
cancellation paths receive the matching consistency fixes. Mobile release API
origin is `https://new.biohayat.ru/api/v2` in defaults and EAS profiles.

## Authorized release procedure

The user explicitly approved production deployment on 2026-10-06. Execution
results are recorded separately below; approval alone is not proof of deployment.

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
