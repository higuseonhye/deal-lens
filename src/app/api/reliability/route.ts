import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { recordTask } from "@/lib/task";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import { ReliabilityCardSchema } from "@/lib/reliability-schema";
import type { ReliabilityCard } from "@/types/reliability";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function extractJson(text: string): string {
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) cleaned = jsonMatch[1].trim();
  return cleaned;
}

function parseAndValidate(text: string): { success: true; card: ReliabilityCard } | { success: false; error: string } {
  try {
    const cleaned = extractJson(text);
    const parsed = JSON.parse(cleaned);
    const result = ReliabilityCardSchema.safeParse(parsed);
    if (!result.success) {
      return { success: false, error: result.error.message };
    }
    const card: ReliabilityCard = {
      companyName: result.data.companyName,
      question: result.data.question,
      evidenceScore: result.data.evidenceScore,
      evidenceScoreRationale: result.data.evidenceScoreRationale,
      missingCoverage: result.data.missingCoverage,
      contradictionFlags: result.data.contradictionFlags,
      sourceQualitySummary: result.data.sourceQualitySummary,
      diligenceQuestions: result.data.diligenceQuestions,
      evidenceLedger: result.data.evidenceLedger,
      assumptions: result.data.assumptions,
      redFlags: result.data.redFlags,
      nextActions: result.data.nextActions,
    };
    return { success: true, card };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "JSON parse failed",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, url, extraText, question, sources: collectedSources } = body;

    if (!companyName?.trim() || !question?.trim()) {
      return NextResponse.json(
        { error: "companyName and question are required" },
        { status: 400 }
      );
    }

    let sources: Array<{ url: string | null; extractedText: string }>;

    if (Array.isArray(collectedSources) && collectedSources.length > 0) {
      sources = collectedSources.map(
        (s: { url?: string | null; text?: string }) => ({
          url: s.url ?? null,
          extractedText: s.text ?? "",
        })
      );
    } else {
      const hasUrl = !!url?.trim();
      const hasText = !!extraText?.trim();
      sources = [];
      if (hasUrl && hasText) {
        sources.push({ url: url!.trim(), extractedText: extraText!.trim() });
      } else if (hasUrl) {
        sources.push({
          url: url!.trim(),
          extractedText: "(URL provided but no extracted text - treat claims as unverified)",
        });
      } else if (hasText) {
        sources.push({ url: null, extractedText: extraText!.trim() });
      } else {
        sources.push({
          url: null,
          extractedText: "(No sources provided - build card from question and company name only, mark evidence as minimal)",
        });
      }
    }

    const userPrompt = buildUserPrompt({
      companyName: companyName.trim(),
      question: question.trim(),
      sources,
    });

    const openai = getOpenAI();
    const maxRetries = 2;
    let lastError = "";
    let normalized: ReliabilityCard | null = null;
    let lastUsage: { total_tokens?: number } | null = null;
    const startMs = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const retryHint = attempt > 0 ? "\n\n[RETRY] Return ONLY valid JSON. No markdown code blocks. No text before or after the JSON." : "";
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt + retryHint },
        ],
        temperature: attempt > 0 ? 0.1 : 0.2,
        max_tokens: 4096,
      });

      const content = completion.choices[0]?.message?.content;
      lastUsage = completion.usage ?? null;
      if (!content) {
        lastError = "No response from LLM";
        continue;
      }

      const result = parseAndValidate(content);
      if (result.success) {
        normalized = {
          ...result.card,
          companyName: result.card.companyName || companyName.trim(),
          question: result.card.question || question.trim(),
        };
        break;
      }
      lastError = result.error;
      if (attempt < maxRetries) {
        console.warn(`Reliability card parse attempt ${attempt + 1} failed:`, result.error);
      }
    }

    if (!normalized) {
      await recordTask({
        agentType: "reliability",
        workflowType: "vc_diligence",
        taskType: "reliability_card",
        status: "failed",
        inputRef: { companyName, question },
        latencyMs: Date.now() - startMs,
        model: MODEL,
      }).catch(() => {});
      return NextResponse.json(
        { error: `JSON 파싱 실패. ${lastError}` },
        { status: 500 }
      );
    }

    const record = await prisma.reliabilityCard.create({
      data: {
        companyName: normalized.companyName,
        question: normalized.question,
        url: url?.trim() || null,
        extraText: extraText?.trim() || null,
        cardJson: JSON.stringify(normalized),
      },
    });

    // Create trackable next actions from card
    const nextActions = normalized.nextActions ?? [];
    if (nextActions.length > 0) {
      await prisma.nextAction.createMany({
        data: nextActions.map((a) => ({
          cardId: record.id,
          companyName: normalized.companyName,
          action: a.action,
          owner: a.owner,
          expectedTime: a.expectedTime,
        })),
      });
    }

    // AgentOS: Reputation 시드 - Task 기록
    await recordTask({
      agentType: "reliability",
      workflowType: "vc_diligence",
      taskType: "reliability_card",
      status: "completed",
      inputRef: { companyName, question },
      outputRef: { cardId: record.id },
      tokensUsed: lastUsage?.total_tokens,
      latencyMs: Date.now() - startMs,
      model: MODEL,
    }).catch(() => {});

    return NextResponse.json({
      id: record.id,
      card: normalized,
    });
  } catch (err) {
    console.error("Reliability API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
