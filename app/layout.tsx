import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alliance Stage Gate Tracker",
  description: "Blue Yonder alliance partner stage gate tracker MVP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
