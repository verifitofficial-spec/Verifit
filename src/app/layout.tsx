import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ThemeProvider from "@/components/ThemeProvider";

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
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="verifit-theme",s=localStorage.getItem(k),t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
