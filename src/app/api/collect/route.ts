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

    // 1) URL에서 텍스트 추출
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
            error: `URL 추출 실패: ${err instanceof Error ? err.message : "Unknown error"}`,
          },
          { status: 400 }
        );
      }
    }

    // 2) 회사명 검색 (Serper API)
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

    // 3) 사용자가 붙여넣은 텍스트
    if (extraText?.trim()) {
      sources.push({
        url: null,
        text: extraText.trim(),
        source: "pasted",
      });
    }

    if (sources.length === 0) {
      const msg = companyName?.trim()
        ? "검색 결과가 없습니다. URL 또는 추가 텍스트를 직접 입력해보세요."
        : "회사명, URL, 또는 추가 텍스트 중 하나 이상을 입력해주세요.";
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
