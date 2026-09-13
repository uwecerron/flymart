import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlyMart | Fly brain games",
  description: "Play open-source fly brain games in your browser or publish your own.",
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
