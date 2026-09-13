"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasBrowserSupabaseConfig, supabaseBrowser } from "@/lib/supabase-browser";

type Purchase = { listing_id: string; created_at: string; listings: { title: string; description: string } | null };

export default function Library() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [message, setMessage] = useState("Loading your purchases…");
  useEffect(() => {
    async function load() {
      if (!hasBrowserSupabaseConfig()) return setMessage("Marketplace accounts are not configured yet.");
      const { data } = await supabaseBrowser().auth.getSession();
      if (!data.session) return setMessage("Sign in from the home page to see your purchases.");
      const response = await fetch("/api/library", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json() as { purchases?: Purchase[]; error?: string };
      if (!response.ok) return setMessage(body.error ?? "Could not load your library.");
      setPurchases(body.purchases ?? []);
      setMessage(body.purchases?.length ? "" : "Your purchases will appear here.");
    }
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function download(listingId: string) {
    const { data } = await supabaseBrowser().auth.getSession();
    if (!data.session) return setMessage("Sign in again to download.");
    const response = await fetch(`/api/download/${listingId}`, { headers: { Authorization: `Bearer ${data.session.access_token}` }, redirect: "follow" });
    if (!response.ok) return setMessage("The download link could not be created.");
    window.location.assign(response.url);
  }
  return <><header><Link className="brand" href="/"><span className="brand-icon"><Gamepad2/></span>fly<span>mart</span></Link><Button asChild variant="outline"><Link href="/">Back to marketplace</Link></Button></header><main><section className="library"><p className="eyebrow">YOUR LIBRARY</p><h1>Your purchases.</h1><p className="lede">Paid files stay private. Download links expire after one minute.</p>{message && <div className="notice">{message}</div>}<div className="library-list">{purchases.map((purchase) => <article key={purchase.listing_id}><div><strong>{purchase.listings?.title ?? "Creator release"}</strong><p>{purchase.listings?.description}</p></div><Button onClick={() => download(purchase.listing_id)}><Download size={16}/> Download ZIP</Button></article>)}</div></section></main></>;
}
