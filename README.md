# FlyMart

FlyMart is a Vercel-ready marketplace for runnable fly-brain games, harnesses, and experiments. Authentic third-party open-source projects stay free. Creators can sign in, upload a private ZIP, connect a Stripe Express payout account, and sell their own release for **$2.99 USD**.

## What is implemented

- Passwordless email sign-in through Supabase Auth
- Private seller uploads to Supabase Storage, limited to ZIP files up to 100 MB
- A creator rights attestation before submission
- Owner review queue at `/admin` so uploads are inspected before publication
- Stripe Connect Express seller onboarding and payout status checks
- Stripe Checkout destination charges at exactly $2.99
- Configurable platform fee through `PLATFORM_FEE_BPS` (defaults to 1000, or 10%)
- Signature-verified Stripe webhook fulfillment
- Durable purchases and protected, one-minute download URLs
- Buyer library and seller access to their own files
- Free attributed downloads for DOOMFLY and FlyBrain-HalfLife
- Explicit setup mode when payment infrastructure is absent; the UI never simulates a successful payment

## Local setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/migrations/001_marketplace.sql`.
3. In Supabase Auth URL Configuration, add `http://localhost:3000` and your production `https://flymart.xyz` redirect URLs.
4. Copy `.env.example` to `.env.local`, replace every placeholder, and set `ADMIN_EMAILS` to the comma-separated email addresses allowed to review listings.
5. Enable Stripe Connect and customize Connect branding in the Stripe Dashboard.
6. Add a Stripe webhook endpoint for `checkout.session.completed`, `charge.refunded`, and `charge.dispute.created` at `https://flymart.xyz/api/webhooks/stripe`, then put its signing secret in `STRIPE_WEBHOOK_SECRET`.
7. Run `npm install` and `npm run dev:vercel`.

Use Stripe test keys and a test-mode webhook until checkout, payout onboarding, downloads, refunds, and disputes have been tested end to end.

## Deploy to Vercel

Import the repository into Vercel. The included `vercel.json` runs the native Next.js build. Add every variable from `.env.example` under Project Settings → Environment Variables, replacing `NEXT_PUBLIC_APP_URL` with the production origin. Redeploy after adding or changing variables.

The public Supabase URL and publishable key may be exposed to the browser. Keep `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` server-only.

## Payment model

FlyMart creates a Stripe Checkout destination charge for one seller per purchase. Stripe transfers the funds to that seller’s connected account and returns the configured application fee to FlyMart. Under this charge model, FlyMart’s platform balance pays Stripe processing fees and is responsible for refunds and chargebacks. The default 10% fee on a $2.99 transaction may not cover Stripe’s fixed processing fee, so set `PLATFORM_FEE_BPS` after deciding the marketplace economics.

Crypto checkout is not enabled. It needs its own provider, confirmed-payment webhook, payout policy, and entitlement fulfillment before it can share the same buyer library safely.
