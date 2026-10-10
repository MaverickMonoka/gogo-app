# GoGo Cloudflare deployment

The customer site, GoGo Food, restaurant admin, ride requests, lodge onboarding, order management and existing APIs are routed through one Cloudflare Worker. Neon remains the database.

## Cloudflare dashboard setup (mobile)

1. Open https://dash.cloudflare.com/ and go to **Workers & Pages → Create → Import a repository**.
2. Select GitHub repository `MaverickMonoka/gogo-app`.
3. For a **Worker** Git integration, use build command `npm run build` and deploy command `npx wrangler deploy` if requested. The repository includes `wrangler.jsonc` and `worker.mjs`. Cloudflare should install dependencies using `npm install`.
4. Configure these **Worker secrets** in Settings → Variables and Secrets:
   - `DATABASE_URL`: the existing Neon PostgreSQL connection string (secret).
   - `GOGO_RESTAURANT_ADMIN_TOKEN`: a long random admin token (secret).
   - `GOGO_DRIVER_TOKEN`, `GOGO_MERCHANT_TOKEN`: long random tokens for existing prototype dashboards.
   - Payment integration: `MOBICOM_PAY_URL`, `MOBICOM_PAY_API_KEY`, `MOBICOM_PAY_WEBHOOK_SECRET`, `GOGO_APP_URL` only after testing the payment contract.
5. Deploy and open the assigned `*.workers.dev` URL.
6. Test `/api/health`, `/restaurants.html`, `/restaurant-admin.html`, then create a test restaurant application.

## CLI alternative

```bash
npm install
npm run deploy:cloudflare
```

Log in using `npx wrangler login` first.

## Notes and limitations

- Cloudflare Workers uses `nodejs_compat` for the existing Node-style `pg` and `crypto` modules. The Worker adapter is committed but **has not been tested in a Cloudflare deployment**. Validate Neon connectivity, especially TLS and outbound database sockets, before going live.
- `neon/restaurants.sql` must already have been executed.
- The admin token is a shared prototype credential, **not individual restaurant authentication**. Do not distribute it to merchants. Build tenant-specific access before onboarding independent merchants.
- Restaurant orders currently record unpaid requests. Do not accept online payment until the Mobicom Pay request/response and signed webhook have been tested end-to-end.
- Restaurant discovery is currently approved GoGo partners in Neon; Google Places/Overpass auto-import has not been implemented.
- Ride tracking remains an illustrative route preview, not GPS.
- Keep Vercel running until the Cloudflare Worker API and frontend pass checks.
