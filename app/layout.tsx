import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Namefield — check a word across every extension",
  description:
    "Search a word and see which domain extensions it's registered on, and which are still open.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
