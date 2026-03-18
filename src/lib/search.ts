/**
 * Company name search
 * 1) If SERPER_API_KEY exists → use Serper (Google)
 * 2) Otherwise → DuckDuckGo (duck-duck-scrape, free, no API key required)
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

async function searchWithSerper(companyName: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey?.trim()) return [];

  const query = `${companyName} startup company funding`;
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 5 }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    console.error("Serper API error:", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  const organic = data.organic ?? [];
  return organic
    .filter((o) => o.link && (o.snippet || o.title))
    .map((o) => ({
      title: o.title ?? "",
      link: o.link!,
      snippet: o.snippet ?? "",
    }));
}

async function searchWithDuckDuckGo(companyName: string): Promise<SearchResult[]> {
  try {
    const { search } = await import("duck-duck-scrape");
    const query = `${companyName} startup company funding`;
    const results = await search(query, { safeSearch: 0 });
    const items = results.results ?? [];
    return items
      .filter((r) => r.url)
      .slice(0, 5)
      .map((r) => ({
        title: r.title ?? "",
        link: r.url ?? "",
        snippet: r.description ?? "",
      }));
  } catch (err) {
    console.error("DuckDuckGo search error:", err);
    return [];
  }
}

export async function searchByCompany(companyName: string): Promise<SearchResult[]> {
  const serperResults = await searchWithSerper(companyName);
  if (serperResults.length > 0) return serperResults;

  return searchWithDuckDuckGo(companyName);
}
