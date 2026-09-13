export const PRICE_CENTS = 299;
export const CURRENCY = "usd";
export const STORAGE_BUCKET = "seller-files";

export type MarketplaceListing = {
  id: string;
  title: string;
  genre: string;
  description: string;
  creator_name: string;
  repo_url: string | null;
  storage_path: string | null;
  seller_id: string | null;
  stripe_account_id: string | null;
  status: "free" | "pending" | "published" | "rejected";
  price_cents: number;
  runtime_kind?: "browser" | "stream" | "external";
  runtime_path?: string | null;
  runtime_note?: string | null;
  source_commit?: string | null;
  download_path?: string | null;
};

export const freeListings: MarketplaceListing[] = [
  {
    id: "flybrain-browser",
    title: "FlyBrain",
    genre: "Browser Simulation",
    description:
      "The actual 139,255-neuron FlyWire FAFB v783 connectome running in real time through the upstream project's leaky integrate-and-fire Web Worker.",
    creator_name: "snedea / FlyBrain contributors",
    repo_url: "https://github.com/snedea/flybrain",
    storage_path: null,
    seller_id: null,
    stripe_account_id: null,
    status: "free",
    price_cents: 0,
    runtime_kind: "browser",
    runtime_path: "/runtimes/flybrain-9191824-fm4/index.html",
    runtime_note:
      "Runs the pinned upstream browser source and its FlyWire-derived connectome data directly on FlyMart.",
    source_commit: "9191824d17871b7851645782d53d23f213ddb938",
    download_path: null,
  },
  {
    id: "doomfly",
    title: "DOOMFLY",
    genre: "Doom",
    description:
      "MaleCNS connectome simulation wired to a ViZDoom arena. Experimental source from the original repository.",
    creator_name: "nftechie / DOOMFLY contributors",
    repo_url: "https://github.com/nftechie/doomfly",
    storage_path: null,
    seller_id: null,
    stripe_account_id: null,
    status: "free",
    price_cents: 0,
    runtime_kind: "stream",
    runtime_path: null,
    runtime_note:
      "The upstream runtime needs several GB of memory, downloaded MaleCNS data, ViZDoom, and a separate Python worker. FlyMart will only enable play when a real worker stream is connected.",
    source_commit: "71ecf53d78eaffaf1a57ed7b0ccf5d458abc9f33",
    download_path: "/downloads/doomfly-source.zip",
  },
  {
    id: "flybrain-halflife",
    title: "FlyBrain-HalfLife",
    genre: "Half-Life",
    description:
      "A connectome-based LIF controller that maps screen input to movement in Half-Life.",
    creator_name: "Yusuftmle / FlyBrain-HalfLife contributors",
    repo_url: "https://github.com/Yusuftmle/FlyBrain-HalfLife",
    storage_path: null,
    seller_id: null,
    stripe_account_id: null,
    status: "free",
    price_cents: 0,
    runtime_kind: "external",
    runtime_path: null,
    runtime_note:
      "The actual Half-Life mode needs Windows, DirectInput, and an installed GoldSrc/Half-Life runtime. It cannot execute inside Vercel's browser or serverless environment.",
    source_commit: "5dc63cd206f1f20ec5d7bb65e227274e0baa2783",
    download_path: "/downloads/flybrain-halflife-source.zip",
  },
];

export function platformFeeAmount() {
  const basisPoints = Number(process.env.PLATFORM_FEE_BPS ?? "1000");
  const safeBasisPoints = Number.isFinite(basisPoints)
    ? Math.min(10_000, Math.max(0, Math.round(basisPoints)))
    : 1000;
  return Math.round((PRICE_CENTS * safeBasisPoints) / 10_000);
}

export function appUrl(request?: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}
