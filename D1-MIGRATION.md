# GoGo Cloudflare D1 migration
This branch prepares GoGo to use Cloudflare D1 instead of Neon PostgreSQL.

## Before merging (production safety)
1. Back up any existing Neon PostgreSQL data. This migration creates empty D1 tables; it does **not** automatically copy existing orders, users, rides, menus, or restaurants.
2. Open Cloudflare D1 in the account hosting `gogo-app`: https://dash.cloudflare.com/a65bce303c9035afa94b046cd260b164/workers-and-pages
3. Create a database named `gogo-db`, then add a D1 binding to the **gogo-app Worker** with binding variable name exactly `DB` (not `BindingGogo`).
4. In a terminal with Cloudflare Wrangler authenticated, from the repository root, apply `npx wrangler d1 execute gogo-db --remote --file=migrations/0001_d1_schema.sql`. Confirm the schema exists before merging.
5. Run `npm test` and `npm run build`, merge the PR, and ensure Cloudflare deploys the new code. D1 binding is managed through Cloudflare dashboard; no database ID is committed.
6. Confirm `https://gogo-app.pkhardware2.workers.dev/api/health` shows `databaseBindingPresent:true`, then manually test an actual order/ride and restaurant operations. Health checks only confirm binding presence.
7. Ensure payment secrets `MOBICOM_PAY_URL`, `MOBICOM_PAY_API_KEY`, and `MOBICOM_PAY_WEBHOOK_SECRET` are configured separately before enabling checkout.

## Rollback
Revert the Cloudflare deployment to the previous production version if D1 queries fail. Do not delete Neon data until all necessary records are copied and reconciled.

## Notes
The existing API's PostgreSQL-style SQL is translated to D1 SQLite syntax by `lib/database.js`. The existing JWT / auth token secrets remain Cloudflare environment secrets; D1 itself does not replace them. Monetary amounts are represented as integer cents in D1.
