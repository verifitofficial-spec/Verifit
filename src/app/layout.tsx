import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://verifit.online'),
  title: {
    default: "VeriFit — Verifizierte Personal Trainer",
    template: "%s | VeriFit",
  },
  description:
    "VeriFit verbindet dich mit manuell geprüften Personal Trainern für Fitness, Reha und Longevity in der DACH-Region.",
  openGraph: {
    title: "VeriFit — Verifizierte Personal Trainer",
    description:
      "VeriFit verbindet dich mit manuell geprüften Personal Trainern für Fitness, Reha und Longevity in der DACH-Region.",
    url: 'https://verifit.online',
    siteName: 'VeriFit',
    locale: 'de_DE',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950">{children}</body>
    </html>
  );
}