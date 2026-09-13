import { NextResponse } from "next/server";
import { z } from "zod";
import { freeListings, PRICE_CENTS, STORAGE_BUCKET } from "@/lib/marketplace";
import { hasSupabaseConfig, requireUser, supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const listingSchema = z.object({
  title: z.string().trim().min(3).max(80),
  genre: z.string().trim().min(2).max(40),
  description: z.string().trim().min(20).max(1000),
  repoUrl: z.string().url().max(500).optional().or(z.literal("")),
  storagePath: z.string().min(4).max(500),
  creatorName: z.string().trim().min(2).max(80),
  rightsConfirmed: z.literal(true),
});

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ listings: freeListings });
  const { data, error } = await supabaseAdmin()
    .from("listings")
    .select("id,title,genre,description,creator_name,repo_url,status,price_cents")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load listings" }, { status: 500 });
  const publicListings = (data ?? []).map((listing) => ({ ...listing, storage_path: null, seller_id: null, stripe_account_id: null }));
  return NextResponse.json({ listings: [...publicListings, ...freeListings] });
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Marketplace storage is not configured" }, { status: 503 });
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const parsed = listingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid listing" }, { status: 400 });
  if (!parsed.data.storagePath.startsWith(`${user.id}/`) || !parsed.data.storagePath.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: file } = await admin.storage.from(STORAGE_BUCKET).list(user.id, {
    search: parsed.data.storagePath.slice(user.id.length + 1),
    limit: 1,
  });
  if (!file?.length) return NextResponse.json({ error: "Upload was not found" }, { status: 400 });

  const { data: profile } = await admin.from("profiles").select("stripe_account_id").eq("id", user.id).maybeSingle();
  const { data, error } = await admin.from("listings").insert({
    seller_id: user.id,
    title: parsed.data.title,
    genre: parsed.data.genre,
    description: parsed.data.description,
    creator_name: parsed.data.creatorName,
    repo_url: parsed.data.repoUrl || null,
    storage_path: parsed.data.storagePath,
    stripe_account_id: profile?.stripe_account_id ?? null,
    price_cents: PRICE_CENTS,
    status: "pending",
    rights_confirmed_at: new Date().toISOString(),
  }).select("id,status").single();
  if (error) return NextResponse.json({ error: "Could not create listing" }, { status: 500 });
  return NextResponse.json({ listing: data }, { status: 201 });
}
