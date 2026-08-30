import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { FacebookPixel } from "@/components/analytics/facebook-pixel";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Muzikii — Transforme tes mots en chanson personnalisée",
    template: "%s · Muzikii",
  },
  description:
    "Anniversaire, mariage, dot, hommage… Raconte ton histoire, notre IA écrit les paroles et compose ta chanson sur-mesure. Prête en quelques minutes. Paiement Mobile Money via Moneroo.",
  keywords: [
    "chanson personnalisée",
    "musique IA",
    "cadeau musical",
    "chanson anniversaire",
    "chanson mariage",
    "Mobile Money",
    "Afrique",
  ],
  openGraph: {
    title: "Muzikii — Transforme tes mots en chanson personnalisée",
    description:
      "Raconte ton histoire, notre IA écrit et compose ta chanson. Prête en quelques minutes.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable} h-full`}>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        {env.facebookPixelId && <FacebookPixel pixelId={env.facebookPixelId} />}
        {children}
      </body>
    </html>
  );
}
