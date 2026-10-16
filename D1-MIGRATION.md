# GoGo Cloudflare D1 migration

**Decision:** GoGo will use Cloudflare Workers + Cloudflare D1. Neon PostgreSQL is no longer the target production database.

## Required Cloudflare setup

1. Back up any existing Neon PostgreSQL data before retiring it. This migration creates empty D1 tables; it does **not** automatically copy existing orders, users, rides, menus, or restaurants.
2. Open Cloudflare Dashboard → Workers & Pages → D1 SQL Database.
3. Create a database named `gogo-db`.
4. Configure the D1 binding for the **gogo-app Worker** with the variable name exactly `Gogo`. The code, health check and tests all use this case-sensitive binding name.
5. Record the D1 database ID. It must be added to the Wrangler configuration before a reproducible CLI/Git-integrated deployment can be considered complete. Do not put a fake ID or a production secret in source control.
6. From the repository root, apply the schema with `npx wrangler d1 execute gogo-db --remote --file=migrations/0001_d1_schema.sql`. Confirm the tables exist before enabling order or ride workflows.
7. Run `npm install`, `npm test` and `npm run build`. Deploy only after the real database ID and binding are configured.
8. Verify `/api/health` reports `databaseBindingPresent:true`, then manually test a grocery order, ride request, lodge registration, restaurant registration and merchant/driver operations. Health checks only confirm binding presence, not full database correctness.
9. Configure `GOGO_DRIVER_TOKEN`, `GOGO_MERCHANT_TOKEN`, `GOGO_RESTAURANT_ADMIN_TOKEN`, `MOBICOM_PAY_URL`, `MOBICOM_PAY_API_KEY`, and `MOBICOM_PAY_WEBHOOK_SECRET` as Worker secrets/variables. Do not enable payment until the complete sandbox flow and signed webhook are tested.

## Data migration and rollback

- Export and reconcile any required Neon data before switching traffic. Creating the D1 schema does not migrate existing rows.
- Keep a verified backup until orders, partner records, rides, restaurant/menu data and payment statuses have been reconciled.
- If D1 queries fail, roll back the Worker deployment and restore service only after confirming the database state. Do not delete Neon data until the data migration is signed off.

## Technical notes

- `lib/database.js` translates the current PostgreSQL-style numbered placeholders and supported array predicate into D1-compatible SQLite SQL.
- D1 uses integer cents for monetary columns.
- The production D1 binding ID is not yet recorded in this repository; this remains a deployment blocker.
- Shared dashboard tokens are prototype credentials, not tenant-specific merchant authentication. Do not distribute them to independent merchants.
