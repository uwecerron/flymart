import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlyMart — The tiny brain arcade",
  description: "Enter an arcade of fly-brain games, strange neural controllers, and creator-built experiments.",
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
