"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Download, Gamepad2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasBrowserSupabaseConfig, supabaseBrowser } from "@/lib/supabase-browser";

type ReviewListing = { id: string; title: string; genre: string; description: string; creator_name: string; repo_url: string | null; status: string; created_at: string };

async function headers(): Promise<Record<string, string>> {
  const { data } = await supabaseBrowser().auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export default function Admin() {
  const [listings, setListings] = useState<ReviewListing[]>([]);
  const [message, setMessage] = useState("Loading review queue…");
  async function load() {
    if (!hasBrowserSupabaseConfig()) return setMessage("Marketplace accounts are not configured.");
    const response = await fetch("/api/admin/listings", { headers: await headers() });
    const body = await response.json() as { listings?: ReviewListing[]; error?: string };
    if (!response.ok) return setMessage(body.error ?? "Could not load the queue.");
    setListings(body.listings ?? []); setMessage("");
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  async function review(id: string, status: "published" | "rejected") {
    const response = await fetch("/api/admin/listings", { method: "PATCH", headers: { "Content-Type": "application/json", ...(await headers()) }, body: JSON.stringify({ id, status }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) return setMessage(body.error ?? "Could not save the decision.");
    setMessage(status === "published" ? "Listing approved and published." : "Listing rejected.");
    await load();
  }
  async function inspect(id: string) {
    const response = await fetch(`/api/download/${id}`, { headers: await headers(), redirect: "follow" });
    if (!response.ok) return setMessage("Could not create the inspection download.");
    window.location.assign(response.url);
  }
  return <><header><Link className="brand" href="/"><span className="brand-icon"><Gamepad2/></span>fly<span>mart</span></Link><Button asChild variant="outline"><Link href="/">Back to marketplace</Link></Button></header><main><section className="library"><p className="eyebrow">OWNER REVIEW</p><h1>Review new listings.</h1><p className="lede">Check the repository and uploaded files before approval. Sellers must also complete Stripe verification.</p>{message && <div className="notice">{message}</div>}<div className="library-list">{listings.map((listing) => <article key={listing.id}><div><span className="tag">{listing.status.toUpperCase()} · {listing.genre}</span><h2>{listing.title}</h2><p>{listing.description}</p><small>By {listing.creator_name}</small>{listing.repo_url && <p><a className="underline" href={listing.repo_url} target="_blank" rel="noreferrer">Inspect project URL ↗</a></p>}</div><div className="review-actions"><Button variant="outline" onClick={() => inspect(listing.id)}><Download/> Inspect ZIP</Button><Button disabled={listing.status === "published"} onClick={() => review(listing.id, "published")}><Check/> Approve</Button><Button variant="outline" disabled={listing.status === "rejected"} onClick={() => review(listing.id, "rejected")}><X/> Reject</Button></div></article>)}</div></section></main></>;
}
