import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, CURRENCY, platformFeeAmount, PRICE_CENTS } from "@/lib/marketplace";
import { requireUser, supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stripe";

const schema = z.object({ listingId: z.string().uuid() });

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user?.email) return NextResponse.json({ error: "Sign in with email before buying" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data: listing } = await admin.from("listings").select("id,title,seller_id,stripe_account_id,status,price_cents").eq("id", parsed.data.listingId).single();
  if (!listing || listing.status !== "published" || !listing.stripe_account_id) return NextResponse.json({ error: "Listing is not available" }, { status: 404 });
  if (listing.seller_id === user.id) return NextResponse.json({ error: "You already own this listing" }, { status: 400 });
  const { data: existing } = await admin.from("purchases").select("id").eq("buyer_id", user.id).eq("listing_id", listing.id).eq("status", "paid").maybeSingle();
  if (existing) return NextResponse.json({ url: `${appUrl(request)}/library` });

  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [{ price_data: { currency: CURRENCY, unit_amount: PRICE_CENTS, product_data: { name: listing.title } }, quantity: 1 }],
    payment_intent_data: {
      application_fee_amount: platformFeeAmount(),
      transfer_data: { destination: listing.stripe_account_id },
      metadata: { listing_id: listing.id, buyer_id: user.id },
    },
    metadata: { listing_id: listing.id, buyer_id: user.id },
    success_url: `${appUrl(request)}/library?checkout=success`,
    cancel_url: `${appUrl(request)}/?checkout=cancelled`,
  }, { idempotencyKey: `checkout:${user.id}:${listing.id}:${Date.now() >> 16}` });
  return NextResponse.json({ url: session.url });
}
