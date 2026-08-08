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
  title: "Postei — seu mês de conteúdo, pronto",
  description:
    "Diga o ramo do seu negócio e receba o mês inteiro de posts pronto: imagem, legenda, hashtags e chamada. Sem começar do zero toda semana.",
  openGraph: {
    title: "Postei — seu mês de conteúdo, pronto",
    description:
      "Diga o ramo do seu negócio e receba o mês inteiro de posts pronto.",
    type: "website",
    locale: "pt_BR",
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
