import { NextResponse } from "next/server";
import { requireUser, supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stripe";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const admin = supabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("stripe_account_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_account_id) return NextResponse.json({ connected: false });
  const account = await stripeClient().accounts.retrieve(profile.stripe_account_id);
  const connected = Boolean(!account.deleted && account.charges_enabled && account.payouts_enabled);
  await admin.from("profiles").update({ stripe_charges_enabled: connected }).eq("id", user.id);
  if (connected) await admin.from("listings").update({ stripe_account_id: profile.stripe_account_id }).eq("seller_id", user.id).eq("status", "pending");
  return NextResponse.json({ connected });
}
