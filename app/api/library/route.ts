import { NextResponse } from "next/server";
import { requireUser, supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("purchases").select("listing_id,created_at,listings(title,description)").eq("buyer_id", user.id).eq("status", "paid").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load library" }, { status: 500 });
  return NextResponse.json({ purchases: data ?? [] });
}
