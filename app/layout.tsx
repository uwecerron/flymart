import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlyMart — A launchpad for fly-brain experiments",
  description: "Discover authentic fly-brain experiments or sell your own runnable project for $2.99 with protected downloads and Stripe Connect payouts.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
