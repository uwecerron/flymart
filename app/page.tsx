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
import { FlyArcadeGame } from "@/components/fly-arcade-game";

type Config = { marketplaceReady: boolean; authReady: boolean; paymentsReady: boolean };

function NeuralFly({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? "neural-fly compact" : "neural-fly"} viewBox="0 0 520 360" role="img" aria-label="A cartoon fruit fly with a glowing neural brain">
    <defs>
      <radialGradient id="bodyGlow" cx="45%" cy="38%"><stop offset="0" stopColor="#87965f"/><stop offset="1" stopColor="#252b1f"/></radialGradient>
      <linearGradient id="wingGlow" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eefec2" stopOpacity=".9"/><stop offset="1" stopColor="#99e9ff" stopOpacity=".12"/></linearGradient>
      <filter id="neon"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse className="fly-shadow" cx="260" cy="313" rx="125" ry="17"/>
    <g className="fly-wings">
      <path d="M232 170C160 50 39 48 48 128c8 69 101 107 181 91"/>
      <path d="M289 169C360 48 483 48 474 129c-8 68-104 105-181 90"/>
      <path className="wing-vein" d="M217 186 74 100m145 92L98 169m205 15 143-84m-145 92 122-23"/>
    </g>
    <g className="fly-legs"><path d="m218 242-89 62m105-50-39 76m105-88 90 62m-105-50 39 76"/></g>
    <ellipse className="fly-body" cx="260" cy="219" rx="70" ry="91"/>
    <path className="body-stripe" d="M206 190h108M196 218h128M203 247h114"/>
    <circle className="fly-head" cx="260" cy="133" r="58"/>
    <ellipse className="fly-eye left" cx="230" cy="126" rx="28" ry="35"/><ellipse className="fly-eye right" cx="290" cy="126" rx="28" ry="35"/>
    <g className="brain" filter="url(#neon)"><path d="M239 126c-12-7-11-26 3-29 4-15 25-17 31-4 16-4 27 13 19 25 10 11 0 28-15 26-8 12-27 8-29-5-14 4-22-6-18-17z"/><path d="m242 104 15 13 15-19m-15 19-8 20m8-20 24 9m-9-28 9 28"/><circle cx="242" cy="104" r="3"/><circle cx="257" cy="117" r="3"/><circle cx="272" cy="98" r="3"/><circle cx="249" cy="137" r="3"/><circle cx="281" cy="126" r="3"/></g>
    <path className="antenna" d="M239 84q-24-35-43-17m85 17q24-35 43-17"/>
  </svg>;
}

function Art({ listing }: { listing: MarketplaceListing }) {
  const doom = listing.genre === "Doom";
  return <div className={`art ${doom ? "fly" : "signal"}`}><div className="cabinet-stars" aria-hidden="true">✦ · ✧ · ✦</div><NeuralFly compact/><strong>{listing.title}</strong><span className="art-caption">{doom ? "FLY BRAIN × DOOM" : "NEURAL PILOT × HALF-LIFE"}</span></div>;
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
    <header><Link className="brand" href="/"><span className="brand-icon"><span className="mini-fly">●</span></span>fly<span>mart</span><sup>ARCADE</sup></Link><nav><a href="#browse">The arcade</a><button onClick={() => setCreatorOpen(true)}>Publish a game <ArrowUpRight size={15}/></button><Link href="/library">My games</Link></nav>{user ? <Button variant="outline" onClick={() => supabaseBrowser().auth.signOut()}>{user.email?.split("@")[0]} · Sign out</Button> : <Button onClick={() => setAuthOpen(true)}><LogIn size={16}/> Player one</Button>}</header>
    <main>
      <div className="arcade-marquee"><span>● ARCADE ONLINE</span><div>FLY BRAIN GAMES <b>✦</b> WEIRD SIMULATIONS <b>✦</b> TINY NEURONS, BIG SCORES</div><span>02 CABINETS</span></div>
      <section className="intro arcade-hero"><div className="hero-copy"><p className="eyebrow"><Sparkles size={13}/> THE INTERNET&apos;S TINIEST ARCADE</p><h1>Tiny brain.<br/><em>Big high score.</em></h1><p className="lede">A game arcade for neural flies, strange controllers, and experiments that should not work—but do.</p><div className="hero-actions"><Button asChild><a href="#browse"><Play fill="currentColor" size={15}/> Enter the arcade</a></Button><Button variant="outline" onClick={() => setCreatorOpen(true)}>Publish your game <ArrowUpRight size={15}/></Button></div><div className="player-stats"><span><BrainCircuit/> 166,606 neurons</span><span><Zap/> questionable decisions</span></div></div><div className="fly-stage"><div className="neural-orbit orbit-one"/><div className="neural-orbit orbit-two"/><div className="screen-lines"/><span className="score score-a">+299</span><span className="score score-b">1UP</span><span className="boss-label">PILOT // FLY-01</span><Image className="blender-fly" src="/art/flymart-neural-fly.webp" width={1000} height={820} priority sizes="(max-width: 900px) 100vw, 55vw" alt="A 3D neural fly arcade pilot rendered in Blender"/><div className="insert-coin"><span>PRESS START</span><ArrowDown size={15}/></div></div></section>
      {!config.marketplaceReady && <div className="setup-banner"><strong>Marketplace setup mode</strong><span>The catalog works now. Add Stripe and Supabase environment variables to activate accounts, uploads, checkout, payouts, and private downloads.</span></div>}
      <section className="featured"><div className="feature-copy"><span className="tag">NEW CABINET WANTED ↗</span><h2>Teach a tiny brain.<br/>Drop it in the arcade.</h2><p>Connect a curious controller to a game, package the experiment, and release it to players and builders for one simple price.</p><Button onClick={() => setCreatorOpen(true)}><Upload size={16}/> Publish a cabinet</Button><span className="feature-note">Private uploads · Stripe payouts · Licensed downloads</span></div><div className="cabinet"><div className="cabinet-top">FLYMART</div><div className="cabinet-screen"><Image src="/art/flymart-neural-fly.webp" width={1000} height={820} sizes="220px" alt="FlyMart arcade pilot"/><span>READY!</span></div><div className="cabinet-controls"><i/><i/><span>•••</span></div></div></section>
      <section id="browse" className="catalog"><div className="section-heading"><h2>Choose your cabinet<span>{String(listings.length).padStart(2, "0")} / VERIFIED FLY-BRAIN EXPERIMENTS</span></h2><div className="search"><Search size={17}/><Input aria-label="Search games" placeholder="Search the arcade…" value={query} onChange={(event) => setQuery(event.target.value)}/></div></div><div className="filters"><div className="status-dot"/><strong>THE SWARM IS AWAKE</strong><span>Open-source cabinets are free · Creator releases are $2.99</span></div><div className="game-grid">{visible.map((item, index) => <article key={item.id} className="game-card"><div className="cabinet-number">CABINET {String(index + 1).padStart(2, "0")}</div><button className="art-button" onClick={() => setSelected(item)}><Art listing={item}/><span className="play-overlay"><Play size={11} fill="currentColor"/> {item.status === "free" ? "VIEW EXPERIMENT" : "UNLOCK · $2.99"}</span></button><div className="game-info"><div className="game-meta"><span>{item.genre}</span><span>{item.status === "free" ? "OPEN SOURCE" : "CREATOR RELEASE"}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="creator"><Code2 size={14}/>{item.creator_name}</div><div className="card-bottom"><span>{item.status === "free" ? "FREE PLAY" : "$2.99 USD"}</span><Button variant="outline" onClick={() => setSelected(item)}>{item.status === "free" ? "Open cabinet" : "Unlock"} <ArrowUpRight size={14}/></Button></div></div></article>)}</div>{!visible.length && <div className="empty"><Box/><h3>No cabinets found</h3><p>Try another game or experiment.</p></div>}</section>
      <section className="creator-banner"><div className="code-mark">&lt;/&gt;</div><div><p className="eyebrow">BUILT SOMETHING STRANGE?</p><h2>Your fly experiment deserves a launch.</h2><p>Upload a runnable ZIP, connect payouts, and sell each copy for $2.99.</p></div><Button onClick={() => setCreatorOpen(true)}>Create a listing <ArrowUpRight size={17}/></Button></section>
      <footer><Link className="brand" href="/">flymart</Link><p>flymart.xyz · Built for the “what if” people.</p><span>Stripe Connect marketplace</span></footer>
    </main>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="game-dialog !w-[min(96vw,980px)] !max-w-[980px]"><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.status === "free" ? "Browser arcade preview · Original upstream source credited below." : "One-time purchase · $2.99 USD"}</DialogDescription>{selected?.status === "free" ? <div className="demo"><FlyArcadeGame mode={selected.genre === "Doom" ? "doom" : "halflife"}/><p>{selected.description}</p><div className="notice">This browser mini-game is a FlyMart preview inspired by the listed experiment. The upstream research project remains freely available and separately attributed.</div><div className="actions"><Button asChild><a href={`/downloads/${selected.id}-source.zip`} download>Download source ZIP</a></Button>{selected.repo_url && <Button asChild variant="outline"><a href={selected.repo_url} target="_blank" rel="noreferrer">Original GitHub ↗</a></Button>}</div></div> : selected && <><div className="checkout-summary"><Gamepad2/><div><strong>{selected.title}</strong><p>Permanent access to this creator release</p></div><strong>$2.99</strong></div><div className="notice"><strong>Secure card checkout</strong><p>Stripe processes the payment and routes the seller payout. Your purchase unlocks a short-lived private download link.</p></div><Button disabled={busy || !config.marketplaceReady} onClick={() => checkout(selected)}><CreditCard/> {busy ? "Starting checkout…" : "Buy with Stripe · $2.99"}</Button>{!config.marketplaceReady && <p className="fine">The owner must finish Stripe and Supabase setup before checkout opens.</p>}</>}</DialogContent></Dialog>
    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent><DialogTitle>Sign in to FlyMart</DialogTitle><DialogDescription>We’ll email you a secure sign-in link. No password needed.</DialogDescription><label>Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><Button disabled={busy || !email} onClick={sendMagicLink}>{busy ? "Sending…" : "Email me a sign-in link"}</Button><p role="status" className="fine">{message}</p></DialogContent></Dialog>
    <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}><DialogContent className="creator-dialog"><DialogTitle>Sell your fly-brain project.</DialogTitle><DialogDescription>Every release costs $2.99. Connect Stripe to receive payouts.</DialogDescription>{!user ? <><div className="notice">Sign in before uploading so the private file and payout account belong to you.</div><Button onClick={() => { setCreatorOpen(false); setAuthOpen(true); }}>Sign in to continue</Button></> : <><Button variant="outline" disabled={busy || !config.paymentsReady} onClick={onboardSeller}>Connect or update Stripe payouts <ArrowUpRight size={16}/></Button><form onSubmit={createListing}><label>Project title<Input required minLength={3} maxLength={80} value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}/></label><label>Creator display name<Input required value={form.creatorName} onChange={(e) => setForm({...form, creatorName: e.target.value})}/></label><label>Genre<select value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})}>{["Harness","Arcade","Simulation","Puzzle","Experiment","Other"].map((genre) => <option key={genre}>{genre}</option>)}</select></label><label>Source or demo URL (optional)<Input type="url" value={form.repoUrl} onChange={(e) => setForm({...form, repoUrl: e.target.value})}/></label><label>What buyers receive<Textarea required minLength={20} maxLength={1000} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/></label><label>Runnable project ZIP · max 100 MB<Input required type="file" accept=".zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)}/></label><label className="rights-check"><input required type="checkbox" checked={form.rightsConfirmed} onChange={(e) => setForm({...form, rightsConfirmed: e.target.checked})}/><span>I created this project or have permission to sell and distribute every included file.</span></label><div className="listing-price"><span>One-time price</span><strong>$2.99 USD</strong></div><Button type="submit" disabled={busy || !config.authReady || !form.rightsConfirmed}>{busy ? "Working…" : <><Check/> Upload and create listing</>}</Button><p role="status" className="fine">{message}</p></form></>}</DialogContent></Dialog>
  </>;
}
