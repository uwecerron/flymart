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
};

export const freeListings: MarketplaceListing[] = [
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
