# GoGo Cloudflare deployment

GoGo is hosted on Cloudflare Workers and uses Cloudflare D1 as its production database. Neon PostgreSQL is not the selected target architecture.

## One-time setup

1. Open Cloudflare Dashboard → Workers & Pages and select the `gogo-app` Worker.
2. Create a D1 database named `gogo-db`.
3. Add a D1 binding with variable name exactly `Gogo`. This name is case-sensitive and must match `lib/database.js`, `api/health.js`, and the D1 tests.
4. Capture the actual D1 database ID and add it to the Wrangler configuration before relying on automated deployments. A dashboard-only binding without a reproducible configuration is not a complete release setup.
5. Apply `migrations/0001_d1_schema.sql` to the remote D1 database.
6. Configure the following Worker secrets/variables:
   - `GOGO_RESTAURANT_ADMIN_TOKEN` — long random admin token.
   - `GOGO_DRIVER_TOKEN` and `GOGO_MERCHANT_TOKEN` — long random prototype dashboard tokens.
   - `MOBICOM_PAY_URL`, `MOBICOM_PAY_API_KEY`, `MOBICOM_PAY_WEBHOOK_SECRET` — only after verifying the Mobicom Pay contract.
   - `GOGO_APP_URL` — public GoGo application origin.
7. Run `npm install`, `npm test` and `npm run build`; then deploy with `npm run deploy:cloudflare`.

## Release acceptance

- `GET /api/health` returns 200 and `databaseBindingPresent:true`.
- Create and retrieve a test grocery order.
- Create a ride and lodge-partner request.
- Register a restaurant, add a menu item, and create a test restaurant order.
- Confirm merchant and driver authentication, allowed order-state transitions and forbidden transitions.
- Complete a PayFast sandbox checkout and verify the signed Mobicom Pay webhook updates the correct order exactly once.
- Confirm no live payments are accepted until the sandbox tests pass.

## Known release blockers

- The real D1 database ID is not yet stored in Wrangler configuration.
- The schema migration creates empty tables and does not copy existing Neon data.
- The payment flow and signed webhook need end-to-end sandbox verification.
- Shared dashboard tokens are prototype credentials, not tenant-specific merchant authentication.
- Ride route previews are not live GPS tracking.
