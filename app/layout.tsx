import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Royal Roulette",
  description: "A realistic European roulette game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}

