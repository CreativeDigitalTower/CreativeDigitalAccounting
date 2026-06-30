import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.creativedigitalaccounting.com";
  const disallow = ["/dashboard", "/api", "/admin", "/d/"];
  // Изрично разрешаваме AI/LLM ботове за индексиране на публичното съдържание и блога.
  const aiBots = ["GPTBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "Google-Extended", "PerplexityBot", "CCBot", "Applebot-Extended"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiBots.map((ua) => ({ userAgent: ua, allow: "/", disallow })),
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
