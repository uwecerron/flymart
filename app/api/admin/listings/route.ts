import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase-admin";

const reviewSchema = z.object({ id: z.string().uuid(), status: z.enum(["published", "rejected"]) });

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { data, error } = await supabaseAdmin().from("listings").select("id,title,genre,description,creator_name,repo_url,seller_id,status,price_cents,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load review queue" }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review decision" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data: listing } = await admin.from("listings").select("seller_id").eq("id", parsed.data.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  const { data: profile } = await admin.from("profiles").select("stripe_account_id,stripe_charges_enabled").eq("id", listing.seller_id).single();
  if (parsed.data.status === "published" && (!profile?.stripe_account_id || !profile.stripe_charges_enabled)) {
    return NextResponse.json({ error: "Seller must finish Stripe verification before approval" }, { status: 409 });
  }
  const { error } = await admin.from("listings").update({ status: parsed.data.status, stripe_account_id: profile?.stripe_account_id ?? null, updated_at: new Date().toISOString() }).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Could not save review decision" }, { status: 500 });
  return NextResponse.json({ status: parsed.data.status });
}
