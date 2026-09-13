"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Box, BrainCircuit, Check, Code2, CreditCard, Gamepad2, LogIn, Play, Search, Sparkles, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MarketplaceListing } from "@/lib/marketplace";
import { hasBrowserSupabaseConfig, supabaseBrowser } from "@/lib/supabase-browser";

type Config = { marketplaceReady: boolean; authReady: boolean; paymentsReady: boolean };

function Art({ listing }: { listing: MarketplaceListing }) {
  const browser = listing.runtime_kind === "browser";
  const doom = listing.genre === "Doom";
  const image = doom ? "/art/fruit-fly-macro.webp" : "/art/fruit-fly-connectome.webp";
  const caption = browser ? "139K NEURONS × WEB WORKER" : doom ? "FLY BRAIN × DOOM" : "NEURAL PILOT × HALF-LIFE";
  return <div className={`art specimen-art ${doom || browser ? "fly" : "signal"}`}><div className="cabinet-stars" aria-hidden="true">✦ · ✧ · ✦</div><div className="specimen-grid"/><Image className="specimen-card-image" src={image} width={1200} height={900} sizes="(max-width: 900px) 100vw, 45vw" alt={doom ? "Photorealistic macro fruit fly with neural graph" : "Photorealistic fruit fly connectome profile"}/><div className="specimen-readout"><span>{browser ? "LIVE CONNECTOME" : doom ? "COMPOUND EYE FEED" : "MOTOR PATHWAY"}</span><i/><i/><i/><i/><i/></div><strong>{listing.title}</strong><span className="art-caption">{caption}</span></div>;
}

function runtimeLabel(listing: MarketplaceListing) {
  if (listing.runtime_kind === "browser") return "PLAY ACTUAL CODE";
  if (listing.runtime_kind === "stream") return "RUNTIME SETUP";
  if (listing.runtime_kind === "external") return "REQUIRES RUNNER";
  return listing.status === "free" ? "VIEW SOURCE" : "UNLOCK · $2.99";
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
  const [activeRuntimeId, setActiveRuntimeId] = useState<string | null>(null);
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
    <header><Link className="brand" href="/"><span className="brand-icon"><span className="mini-fly">●</span></span>fly<span>mart</span><sup>ARCADE</sup></Link><nav><a href="#browse">The arcade</a><button onClick={() => setCreatorOpen(true)}>Publish a game <ArrowUpRight size={15}/></button><Link href="/library">My games</Link></nav>{user ? <Button variant="outline" onClick={() => supabaseBrowser().auth.signOut()}>{user.email?.split("@")[0]} · Sign out</Button> : <Button onClick={() => setAuthOpen(true)}><LogIn size={16}/> Player one</Button>}</header>
    <main>
      <div className="arcade-marquee"><span>● ARCADE ONLINE</span><div>OPEN SOURCE FLY BRAIN GAMES <b>✦</b> RUN IN YOUR BROWSER <b>✦</b> SOURCE INCLUDED</div><span>{String(listings.length).padStart(2, "0")} CABINETS</span></div>
      <section className="intro arcade-hero"><div className="hero-copy"><p className="eyebrow"><Sparkles size={13}/> PLAY FLY BRAIN GAMES</p><h1>Run the brain.<br/><em>Play the result.</em></h1><p className="lede">Play open-source fly brain projects in your browser, or publish one of your own.</p><div className="hero-actions"><Button asChild><a href="#browse"><Play fill="currentColor" size={15}/> Browse games</a></Button><Button variant="outline" onClick={() => setCreatorOpen(true)}>Publish a game <ArrowUpRight size={15}/></Button></div><div className="player-stats"><span><BrainCircuit/> 139,255 neurons</span><span><Zap/> Runs on your device</span></div></div><div className="fly-stage macro-stage"><div className="neural-orbit orbit-one"/><div className="neural-orbit orbit-two"/><div className="screen-lines"/><span className="score score-a">+299</span><span className="score score-b">1UP</span><span className="boss-label">SPECIMEN // DROSOPHILA</span><div className="scan-readouts"><span>VISION <b>ONLINE</b></span><span>WING VECTOR <b>LOCKED</b></span><span>DECISION <b>CHAOTIC</b></span></div><Image className="blender-fly macro-fly" src="/art/fruit-fly-macro.webp" width={1200} height={900} priority sizes="(max-width: 900px) 100vw, 55vw" alt="Photorealistic 3D fruit fly with a glowing neural activity graph, rendered in Blender"/><div className="insert-coin"><span>PRESS START</span><ArrowDown size={15}/></div></div></section>
      {!config.marketplaceReady && <div className="setup-banner"><strong>Marketplace setup mode</strong><span>The catalog works now. Add Stripe and Supabase environment variables to activate accounts, uploads, checkout, payouts, and private downloads.</span></div>}
      <section className="featured"><div className="feature-copy"><span className="tag">PUBLISH A GAME ↗</span><h2>Built a fly brain game?<br/>Put it in the arcade.</h2><p>Upload the source, connect Stripe, and sell access for $2.99.</p><Button onClick={() => setCreatorOpen(true)}><Upload size={16}/> Publish a game</Button><span className="feature-note">Private files · Stripe payouts · License required</span></div><div className="cabinet"><div className="cabinet-top">FLYMART</div><div className="cabinet-screen"><Image src="/art/fruit-fly-connectome.webp" width={1200} height={900} sizes="220px" alt="Fruit fly connectome scan rendered in Blender"/><span>BROWSER READY</span></div><div className="cabinet-controls"><i/><i/><span>•••</span></div></div></section>
      <section id="browse" className="catalog"><div className="section-heading"><h2>Choose a game<span>{String(listings.length).padStart(2, "0")} / SOURCE CHECKED PROJECTS</span></h2><div className="search"><Search size={17}/><Input aria-label="Search games" placeholder="Search games…" value={query} onChange={(event) => setQuery(event.target.value)}/></div></div><div className="filters"><div className="status-dot"/><strong>BROWSER RUNTIME READY</strong><span>Playable listings run the linked source in your browser. Paid releases cost $2.99.</span></div><div className="game-grid">{visible.map((item, index) => <article key={item.id} className="game-card"><div className="cabinet-number">CABINET {String(index + 1).padStart(2, "0")}</div><button className="art-button" onClick={() => setSelected(item)}><Art listing={item}/><span className="play-overlay"><Play size={11} fill="currentColor"/> {runtimeLabel(item)}</span></button><div className="game-info"><div className="game-meta"><span>{item.genre}</span><span>{item.runtime_kind === "browser" ? "LIVE SOURCE" : item.status === "free" ? "SOURCE CHECKED" : "PAID RELEASE"}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="creator"><Code2 size={14}/>{item.creator_name}</div><div className="card-bottom"><span>{item.runtime_kind === "browser" ? "FREE PLAY" : item.status === "free" ? "FREE SOURCE" : "$2.99 USD"}</span><Button variant="outline" onClick={() => setSelected(item)}>{runtimeLabel(item)} <ArrowUpRight size={14}/></Button></div></div></article>)}</div>{!visible.length && <div className="empty"><Box/><h3>No games found</h3><p>Try a different search.</p></div>}</section>
      <section className="creator-banner"><div className="code-mark">&lt;/&gt;</div><div><p className="eyebrow">PUBLISH A PROJECT</p><h2>Add your game to FlyMart.</h2><p>Upload the source, connect Stripe, and sell each copy for $2.99.</p></div><Button onClick={() => setCreatorOpen(true)}>Create a listing <ArrowUpRight size={17}/></Button></section>
      <footer><Link className="brand" href="/">flymart</Link><p>Fly brain games you can inspect and run.</p><span>Payments by Stripe</span></footer>
    </main>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setActiveRuntimeId(null); } }}><DialogContent className="game-dialog !w-[min(96vw,1180px)] !max-w-[1180px]"><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.status === "free" ? selected.runtime_kind === "browser" ? "Runs in your browser. Source and commit are listed below." : "Source checked. This project needs an external runner." : "One-time purchase. $2.99 USD."}</DialogDescription>{selected?.status === "free" ? <div className="demo">{selected.runtime_kind === "browser" && selected.runtime_path ? activeRuntimeId === selected.id ? <iframe className="authentic-runtime" src={selected.runtime_path} title={`${selected.title} source runtime`} allow="cross-origin-isolated"/> : <div className="runtime-gate"><BrainCircuit/><strong>Run 139,255 neurons in Chrome</strong><p>This downloads 12.4 MB once. Chrome runs the simulation on your device and keeps the files for repeat plays.</p><Button onClick={() => setActiveRuntimeId(selected.id)}><Play fill="currentColor"/> Start simulation</Button></div> : <div className="runtime-unavailable"><BrainCircuit/><strong>This project needs an external runner</strong><p>{selected.runtime_note}</p></div>}<p>{selected.description}</p><div className="provenance"><span>SOURCE</span><strong>{selected.runtime_kind === "browser" ? "Pinned repository version" : "No browser version available"}</strong>{selected.source_commit && <code>{selected.source_commit}</code>}<small>{selected.runtime_note}</small></div><div className="actions">{selected.download_path && <Button asChild><a href={selected.download_path} download>Download source ZIP</a></Button>}{selected.runtime_path && <Button asChild variant="outline"><a href={selected.runtime_path} target="_blank" rel="noreferrer">Open full screen ↗</a></Button>}{selected.repo_url && <Button asChild variant="outline"><a href={selected.repo_url} target="_blank" rel="noreferrer">View on GitHub ↗</a></Button>}</div></div> : selected && <><div className="checkout-summary"><Gamepad2/><div><strong>{selected.title}</strong><p>Includes permanent access to the project files</p></div><strong>$2.99</strong></div><div className="notice"><strong>Pay with Stripe</strong><p>After payment, FlyMart creates a private download link that expires shortly.</p></div><Button disabled={busy || !config.marketplaceReady} onClick={() => checkout(selected)}><CreditCard/> {busy ? "Opening Stripe…" : "Buy for $2.99"}</Button>{!config.marketplaceReady && <p className="fine">Stripe and Supabase must be configured before checkout can open.</p>}</>}</DialogContent></Dialog>
    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent><DialogTitle>Sign in to FlyMart</DialogTitle><DialogDescription>We’ll email you a secure sign-in link. No password needed.</DialogDescription><label>Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><Button disabled={busy || !email} onClick={sendMagicLink}>{busy ? "Sending…" : "Email me a sign-in link"}</Button><p role="status" className="fine">{message}</p></DialogContent></Dialog>
    <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}><DialogContent className="creator-dialog"><DialogTitle>Sell your fly-brain project.</DialogTitle><DialogDescription>Every release costs $2.99. Connect Stripe to receive payouts.</DialogDescription>{!user ? <><div className="notice">Sign in before uploading so the private file and payout account belong to you.</div><Button onClick={() => { setCreatorOpen(false); setAuthOpen(true); }}>Sign in to continue</Button></> : <><Button variant="outline" disabled={busy || !config.paymentsReady} onClick={onboardSeller}>Connect or update Stripe payouts <ArrowUpRight size={16}/></Button><form onSubmit={createListing}><label>Project title<Input required minLength={3} maxLength={80} value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}/></label><label>Creator display name<Input required value={form.creatorName} onChange={(e) => setForm({...form, creatorName: e.target.value})}/></label><label>Genre<select value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})}>{["Harness","Arcade","Simulation","Puzzle","Experiment","Other"].map((genre) => <option key={genre}>{genre}</option>)}</select></label><label>Source or demo URL (optional)<Input type="url" value={form.repoUrl} onChange={(e) => setForm({...form, repoUrl: e.target.value})}/></label><label>What buyers receive<Textarea required minLength={20} maxLength={1000} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/></label><label>Runnable project ZIP · max 100 MB<Input required type="file" accept=".zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)}/></label><label className="rights-check"><input required type="checkbox" checked={form.rightsConfirmed} onChange={(e) => setForm({...form, rightsConfirmed: e.target.checked})}/><span>I created this project or have permission to sell and distribute every included file.</span></label><div className="listing-price"><span>One-time price</span><strong>$2.99 USD</strong></div><Button type="submit" disabled={busy || !config.authReady || !form.rightsConfirmed}>{busy ? "Working…" : <><Check/> Upload and create listing</>}</Button><p role="status" className="fine">{message}</p></form></>}</DialogContent></Dialog>
  </>;
}
