import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_CONTENT_LENGTH = 100_000; // ~100KB to avoid huge responses

export async function extractTextFromUrl(url: string): Promise<{ text: string; title?: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();
  if (html.length > 500_000) {
    throw new Error("Page too large (exceeds 500KB)");
  }

  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside, iframe, noscript").remove();
  const bodySelector = $("body").length ? "body" : "*";
  let text = $(bodySelector).text().replace(/\s+/g, " ").trim();

  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.slice(0, MAX_CONTENT_LENGTH) + "\n[... content truncated ...]";
  }

  const title = $("title").first().text().trim() || undefined;
  return { text: text || "(Could not extract text)", title };
}
