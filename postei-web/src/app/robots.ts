import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/painel", "/api/", "/entrar", "/criar-conta", "/sair"],
    },
    sitemap: "https://postei.amconsultoria.tech/sitemap.xml",
  };
}
