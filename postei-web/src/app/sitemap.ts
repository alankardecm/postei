import type { MetadataRoute } from "next";
import { nichos } from "@/lib/conteudo";

const SITE = "https://postei.amconsultoria.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: SITE, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/nichos`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    ...nichos.map((n) => ({
      url: `${SITE}/nichos/${n.id}`,
      lastModified: agora,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.2 },
  ];
}
