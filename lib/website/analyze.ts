import * as cheerio from "cheerio";
import { getTextProvider } from "@/lib/ai";

export interface WebsiteAnalysis {
  niche: string;
  products: string[];
  targetAudience: string;
  brandVoice: string;
  summary: string;
}

const ANALYSIS_SYSTEM_PROMPT = `You are a brand strategist. Given raw text scraped from a
company's website, infer their niche, core products/services, likely target audience, and
brand voice (tone, vocabulary, personality). Be specific and avoid generic filler.`;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    niche: { type: "string" },
    products: { type: "array", items: { type: "string" } },
    targetAudience: { type: "string" },
    brandVoice: { type: "string" },
    summary: { type: "string" },
  },
  required: ["niche", "products", "targetAudience", "brandVoice", "summary"],
};

/** Fetches and extracts readable text from a URL using Firecrawl if configured,
 *  falling back to a direct fetch + cheerio text extraction otherwise. */
async function scrapeWebsiteText(url: string): Promise<string> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  if (firecrawlKey) {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (res.ok) {
      const data = await res.json();
      const markdown = data?.data?.markdown;
      if (markdown) return markdown.slice(0, 20000);
    }
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalForgeBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const title = $("title").text();
  const description = $('meta[name="description"]').attr("content") ?? "";
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  return `Title: ${title}\nDescription: ${description}\n\n${bodyText}`.slice(0, 20000);
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const text = await scrapeWebsiteText(url);
  const provider = getTextProvider();
  return provider.generateJSON<WebsiteAnalysis>({
    system: ANALYSIS_SYSTEM_PROMPT,
    prompt: `Website URL: ${url}\n\nScraped content:\n${text}\n\nRespond ONLY with JSON matching the provided schema.`,
    schema: ANALYSIS_SCHEMA,
  });
}
