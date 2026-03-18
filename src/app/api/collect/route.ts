import { NextRequest, NextResponse } from "next/server";
import { recordTask } from "@/lib/task";
import { extractTextFromUrl } from "@/lib/scraper";
import { searchByCompany } from "@/lib/search";

export interface CollectResult {
  sources: Array<{
    url: string | null;
    title?: string;
    text: string;
    source: "url" | "search" | "pasted";
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startMs = Date.now();
  try {
    const body = await request.json();
    const { companyName, url, extraText } = body;

    const sources: CollectResult["sources"] = [];

    // 1) Extract text from URL
    if (url?.trim()) {
      try {
        const { text, title } = await extractTextFromUrl(url.trim());
        sources.push({
          url: url.trim(),
          title,
          text,
          source: "url",
        });
      } catch (err) {
        return NextResponse.json(
          {
            error: `URL extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          },
          { status: 400 }
        );
      }
    }

    // 2) Company name search (Serper API)
    if (companyName?.trim()) {
      const searchResults = await searchByCompany(companyName.trim());
      for (const r of searchResults) {
        sources.push({
          url: r.link,
          title: r.title,
          text: r.snippet,
          source: "search",
        });
      }
    }

    // 3) User-pasted text
    if (extraText?.trim()) {
      sources.push({
        url: null,
        text: extraText.trim(),
        source: "pasted",
      });
    }

    if (sources.length === 0) {
      const msg = companyName?.trim()
        ? "No search results. Try entering a URL or extra text directly."
        : "Please enter at least one of: company name, URL, or extra text.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await recordTask({
      agentType: "collect",
      workflowType: "vc_diligence",
      taskType: "collect",
      status: "completed",
      inputRef: { companyName: companyName?.trim(), hasUrl: !!url?.trim() },
      outputRef: { sourceCount: sources.length },
      latencyMs: Date.now() - startMs,
    }).catch(() => {});

    return NextResponse.json({ sources });
  } catch (err) {
    console.error("Collect API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
