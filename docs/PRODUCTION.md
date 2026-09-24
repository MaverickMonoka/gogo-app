# GoGo production checklist

## Required environment secrets
- GOGO_ORDER_SECRET
- MOBICOM_PAY_URL
- MOBICOM_WEBHOOK_SECRET

Never commit real secrets.

## Transaction path
GoGo checkout -> POST /api/create-order -> Mobicom Pay -> gateway -> signed webhook -> payment status -> merchant fulfilment.

## Production data still required
A durable database is required before public launch for customers, merchants, products, inventory, orders, payment events, deliveries, properties, rooms and bookings.

## Launch gates
1. Mobicom Pay checkout endpoint deployed and reachable.
2. Signed webhook validated end-to-end.
3. Durable database connected.
4. Moratiwa catalogue completed with clean individual product assets and confirmed pricing.
5. Merchant order dashboard operational.
6. Test payment, failed payment and duplicate webhook tests pass.
7. Deployment health check returns status ok.
