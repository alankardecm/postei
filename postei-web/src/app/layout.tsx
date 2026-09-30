import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display com personalidade (largura e peso variaveis). Evita de proposito a
// Inter, que ja e a fonte usada DENTRO dos criativos e viraria monotonia.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://postei.amconsultoria.tech"),
  title: {
    default: "Postei — seu mês no LinkedIn e Instagram, pronto",
    template: "%s — Postei",
  },
  description:
    "30 posts com imagem e legenda no tom do seu segmento. Você escolhe LinkedIn, Instagram ou os dois — revisa e publica, com consistência profissional e sem cartão para testar.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Postei — seu mês no LinkedIn e Instagram, pronto",
    description:
      "30 posts prontos no tom da sua empresa. Você revisa e publica. Sem briefing arrastado, sem cartão para começar.",
    url: "/",
    siteName: "Postei",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Postei — sua presença no LinkedIn e Instagram, pronta" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Postei — seu mês no LinkedIn e Instagram, pronto",
    description:
      "Receba o mês de posts pronto. Revise e publique no LinkedIn e Instagram.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolage.variable} ${instrument.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
