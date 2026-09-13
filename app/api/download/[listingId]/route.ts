import { NextResponse } from "next/server";
import { STORAGE_BUCKET } from "@/lib/marketplace";
import { requireAdmin, requireUser, supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request, context: { params: Promise<{ listingId: string }> }) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { listingId } = await context.params;
  const admin = supabaseAdmin();
  const { data: listing } = await admin.from("listings").select("seller_id,storage_path").eq("id", listingId).single();
  if (!listing?.storage_path) return NextResponse.json({ error: "File not found" }, { status: 404 });
  const ownsListing = listing.seller_id === user.id;
  const isAdmin = Boolean(await requireAdmin(request));
  const { data: purchase } = await admin.from("purchases").select("id").eq("listing_id", listingId).eq("buyer_id", user.id).eq("status", "paid").maybeSingle();
  if (!ownsListing && !isAdmin && !purchase) return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).createSignedUrl(listing.storage_path, 60, { download: true });
  if (error || !data) return NextResponse.json({ error: "Could not create download" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, 303);
}
