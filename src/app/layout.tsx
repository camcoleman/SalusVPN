import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import SolanaProvider from "@/components/SolanaProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalusVPN",
  description:
    "Verify and choose trusted VPN relay infrastructure before connecting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}
