import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid" && session.metadata?.listing_id && session.metadata?.buyer_id) {
      const { error } = await supabaseAdmin().from("purchases").upsert({
        listing_id: session.metadata.listing_id,
        buyer_id: session.metadata.buyer_id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        amount_cents: session.amount_total ?? 299,
        status: "paid",
      }, { onConflict: "listing_id,buyer_id" });
      if (error) return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (charge.refunded && paymentIntentId) {
      const { error } = await supabaseAdmin().from("purchases").update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId);
      if (error) return NextResponse.json({ error: "Refund update failed" }, { status: 500 });
    }
  }
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
    if (chargeId) {
      const charge = await stripeClient().charges.retrieve(chargeId);
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (paymentIntentId) {
        const { error } = await supabaseAdmin().from("purchases").update({ status: "disputed" }).eq("stripe_payment_intent_id", paymentIntentId);
        if (error) return NextResponse.json({ error: "Dispute update failed" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
