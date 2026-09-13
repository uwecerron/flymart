import { NextResponse } from "next/server";
import { appUrl } from "@/lib/marketplace";
import { requireUser, supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const admin = supabaseAdmin();
  const stripe = stripeClient();
  const { data: profile } = await admin.from("profiles").select("stripe_account_id").eq("id", user.id).maybeSingle();
  let accountId = profile?.stripe_account_id as string | undefined;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: { flymart_user_id: user.id },
    });
    accountId = account.id;
    const { error } = await admin.from("profiles").upsert({ id: user.id, stripe_account_id: accountId });
    if (error) return NextResponse.json({ error: "Could not save payout account" }, { status: 500 });
  }
  const base = appUrl(request);
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/?stripe=refresh`,
    return_url: `${base}/?stripe=return`,
    type: "account_onboarding",
  });
  return NextResponse.json({ url: link.url });
}
