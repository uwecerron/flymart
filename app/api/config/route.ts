import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-admin";
import { hasStripeConfig } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    marketplaceReady: hasSupabaseConfig() && hasStripeConfig(),
    authReady: hasSupabaseConfig(),
    paymentsReady: hasStripeConfig(),
  });
}
