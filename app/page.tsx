"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowUpRight, Box, Check, Code2, CreditCard, Gamepad2, LogIn, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MarketplaceListing } from "@/lib/marketplace";
import { hasBrowserSupabaseConfig, supabaseBrowser } from "@/lib/supabase-browser";

type Config = { marketplaceReady: boolean; authReady: boolean; paymentsReady: boolean };

function Art({ listing }: { listing: MarketplaceListing }) {
  return <div className={`art ${listing.genre === "Doom" ? "fly" : "signal"}`}><Code2 size={42}/><strong>{listing.title}</strong><span className="art-caption">CONNECTOME → CONTROLLER → GAME</span></div>;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!hasBrowserSupabaseConfig()) return {};
  const { data } = await supabaseBrowser().auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export default function Home() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [config, setConfig] = useState<Config>({ marketplaceReady: false, authReady: false, paymentsReady: false });
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", genre: "Experiment", creatorName: "", repoUrl: "", description: "", rightsConfirmed: false });

  async function refresh() {
    const [listingsResponse, configResponse] = await Promise.all([fetch("/api/listings"), fetch("/api/config")]);
    const listingBody = await listingsResponse.json() as { listings?: MarketplaceListing[] };
    setListings(listingBody.listings ?? []);
    setConfig(await configResponse.json());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    if (!hasBrowserSupabaseConfig()) return () => window.clearTimeout(timer);
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { window.clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !config.paymentsReady || new URLSearchParams(window.location.search).get("stripe") !== "return") return;
    authHeaders().then((headers) => fetch("/api/connect/status", { headers })).then(() => refresh());
  }, [user, config.paymentsReady]);

  const visible = useMemo(() => listings.filter((item) => `${item.title} ${item.genre} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [listings, query]);

  async function sendMagicLink() {
    if (!hasBrowserSupabaseConfig()) return setMessage("Add the Supabase environment variables in Vercel first.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setMessage(error ? error.message : "Check your email for the FlyMart sign-in link.");
    setBusy(false);
  }

  async function onboardSeller() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/connect/onboard", { method: "POST", headers: await authHeaders() });
    const body = await response.json() as { url?: string; error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(body.error ?? "Could not start Stripe onboarding");
    if (body.url) window.location.assign(body.url);
  }

  async function createListing(event: React.FormEvent) {
    event.preventDefault();
    if (!user) { setAuthOpen(true); return; }
    if (!file || !file.name.toLowerCase().endsWith(".zip")) return setMessage("Choose a ZIP containing your runnable project.");
    if (file.size > 100 * 1024 * 1024) return setMessage("ZIP files must be 100 MB or smaller.");
    setBusy(true); setMessage("Uploading your private ZIP…");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabaseBrowser().storage.from("seller-files").upload(storagePath, file, { contentType: "application/zip", upsert: false });
    if (uploadError) { setBusy(false); return setMessage(uploadError.message); }
    const response = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ ...form, storagePath }) });
    const body = await response.json() as { listing?: { status: string }; error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(body.error ?? "Could not create listing");
    setMessage(body.listing?.status === "published" ? "Your $2.99 listing is live." : "Listing submitted for FlyMart review. Finish Stripe onboarding if you have not already.");
    await refresh();
  }

  async function checkout(listing: MarketplaceListing) {
    if (!user) { setSelected(null); setAuthOpen(true); return; }
    setBusy(true); setMessage("");
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ listingId: listing.id }) });
    const body = await response.json() as { url?: string; error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(body.error ?? "Checkout could not start");
    if (body.url) window.location.assign(body.url);
  }

  return <>
    <header><Link className="brand" href="/"><span className="brand-icon"><Gamepad2/></span>fly<span>mart</span><sup>BETA</sup></Link><nav><a href="#browse">Discover</a><button onClick={() => setCreatorOpen(true)}>For creators <ArrowUpRight size={15}/></button><Link href="/library">Library</Link></nav>{user ? <Button variant="outline" onClick={() => supabaseBrowser().auth.signOut()}>{user.email?.split("@")[0]} · Sign out</Button> : <Button onClick={() => setAuthOpen(true)}><LogIn size={16}/> Sign in</Button>}</header>
    <main>
      <section className="intro"><div><p className="eyebrow">TINY BRAINS. UNREASONABLE POSSIBILITIES.</p><h1>The launchpad for<br/>fly-brain games.</h1><p className="lede">Discover authentic open-source experiments or sell your own runnable project for $2.99.</p></div><div className="price-stamp"><span>EVERY CREATOR RELEASE</span><strong><sup>$</sup>2.99</strong><span>ONE-TIME PURCHASE</span></div></section>
      {!config.marketplaceReady && <div className="setup-banner"><strong>Marketplace setup mode</strong><span>The catalog works now. Add Stripe and Supabase environment variables to activate accounts, uploads, checkout, payouts, and private downloads.</span></div>}
      <section className="featured"><div className="feature-copy"><span className="tag">CREATOR MARKETPLACE ↗</span><h2>Build something strange.<br/>Ship it to the swarm.</h2><p>Creators upload private ZIPs, confirm distribution rights, connect a Stripe payout account, and publish at one simple price.</p><Button onClick={() => setCreatorOpen(true)}><Upload size={16}/> Sell a project</Button><span className="feature-note">Stripe Connect payouts · Protected buyer downloads</span></div><div className="art fly"><Gamepad2 size={54}/><strong>FLYMART</strong><span className="art-caption">BUILD → UPLOAD → SELL</span></div></section>
      <section id="browse" className="catalog"><div className="section-heading"><h2>Inside the launchpad<span>{String(listings.length).padStart(2, "0")} / VERIFIED SOURCE & CREATOR RELEASES</span></h2><div className="search"><Search size={17}/><Input aria-label="Search games" placeholder="Find something weird…" value={query} onChange={(event) => setQuery(event.target.value)}/></div></div><div className="filters"><span>Open-source items remain free · Creator uploads are $2.99</span></div><div className="game-grid">{visible.map((item) => <article key={item.id} className="game-card"><button className="art-button" onClick={() => setSelected(item)}><Art listing={item}/><span className="play-overlay">{item.status === "free" ? "Open source" : "$2.99"}</span></button><div className="game-info"><div className="game-meta"><span>{item.genre}</span><span>{item.status === "free" ? "MIT source" : "Creator release"}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="creator"><Code2 size={14}/>{item.creator_name}</div><div className="card-bottom"><span>{item.status === "free" ? "Free" : "$2.99 USD"}</span><Button variant="outline" onClick={() => setSelected(item)}>{item.status === "free" ? "View source" : "Buy"} <ArrowUpRight size={14}/></Button></div></div></article>)}</div>{!visible.length && <div className="empty"><Box/><h3>No projects found</h3><p>Try another name or category.</p></div>}</section>
      <section className="creator-banner"><div className="code-mark">&lt;/&gt;</div><div><p className="eyebrow">BUILT SOMETHING STRANGE?</p><h2>Your fly experiment deserves a launch.</h2><p>Upload a runnable ZIP, connect payouts, and sell each copy for $2.99.</p></div><Button onClick={() => setCreatorOpen(true)}>Create a listing <ArrowUpRight size={17}/></Button></section>
      <footer><Link className="brand" href="/">flymart</Link><p>flymart.xyz · Built for the “what if” people.</p><span>Stripe Connect marketplace</span></footer>
    </main>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="game-dialog"><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.status === "free" ? "Original upstream source with attribution." : "One-time purchase · $2.99 USD"}</DialogDescription>{selected?.status === "free" ? <div className="demo"><p>{selected.description}</p><div className="notice">The upstream repository remains freely available. FlyMart does not charge for third-party open-source packages.</div><div className="actions"><Button asChild><a href={`/downloads/${selected.id}-source.zip`} download>Download source ZIP</a></Button>{selected.repo_url && <Button asChild variant="outline"><a href={selected.repo_url} target="_blank" rel="noreferrer">GitHub ↗</a></Button>}</div></div> : selected && <><div className="checkout-summary"><Gamepad2/><div><strong>{selected.title}</strong><p>Permanent access to this creator release</p></div><strong>$2.99</strong></div><div className="notice"><strong>Secure card checkout</strong><p>Stripe processes the payment and routes the seller payout. Your purchase unlocks a short-lived private download link.</p></div><Button disabled={busy || !config.marketplaceReady} onClick={() => checkout(selected)}><CreditCard/> {busy ? "Starting checkout…" : "Buy with Stripe · $2.99"}</Button>{!config.marketplaceReady && <p className="fine">The owner must finish Stripe and Supabase setup before checkout opens.</p>}</>}</DialogContent></Dialog>
    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent><DialogTitle>Sign in to FlyMart</DialogTitle><DialogDescription>We’ll email you a secure sign-in link. No password needed.</DialogDescription><label>Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><Button disabled={busy || !email} onClick={sendMagicLink}>{busy ? "Sending…" : "Email me a sign-in link"}</Button><p role="status" className="fine">{message}</p></DialogContent></Dialog>
    <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}><DialogContent className="creator-dialog"><DialogTitle>Sell your fly-brain project.</DialogTitle><DialogDescription>Every release costs $2.99. Connect Stripe to receive payouts.</DialogDescription>{!user ? <><div className="notice">Sign in before uploading so the private file and payout account belong to you.</div><Button onClick={() => { setCreatorOpen(false); setAuthOpen(true); }}>Sign in to continue</Button></> : <><Button variant="outline" disabled={busy || !config.paymentsReady} onClick={onboardSeller}>Connect or update Stripe payouts <ArrowUpRight size={16}/></Button><form onSubmit={createListing}><label>Project title<Input required minLength={3} maxLength={80} value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}/></label><label>Creator display name<Input required value={form.creatorName} onChange={(e) => setForm({...form, creatorName: e.target.value})}/></label><label>Genre<select value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})}>{["Harness","Arcade","Simulation","Puzzle","Experiment","Other"].map((genre) => <option key={genre}>{genre}</option>)}</select></label><label>Source or demo URL (optional)<Input type="url" value={form.repoUrl} onChange={(e) => setForm({...form, repoUrl: e.target.value})}/></label><label>What buyers receive<Textarea required minLength={20} maxLength={1000} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/></label><label>Runnable project ZIP · max 100 MB<Input required type="file" accept=".zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)}/></label><label className="rights-check"><input required type="checkbox" checked={form.rightsConfirmed} onChange={(e) => setForm({...form, rightsConfirmed: e.target.checked})}/><span>I created this project or have permission to sell and distribute every included file.</span></label><div className="listing-price"><span>One-time price</span><strong>$2.99 USD</strong></div><Button type="submit" disabled={busy || !config.authReady || !form.rightsConfirmed}>{busy ? "Working…" : <><Check/> Upload and create listing</>}</Button><p role="status" className="fine">{message}</p></form></>}</DialogContent></Dialog>
  </>;
}
