import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { recordTask } from "@/lib/task";
import { QUESTION_GEN_SYSTEM, buildQuestionGenPrompt } from "@/lib/prompts";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

export async function POST(request: NextRequest) {
  const startMs = Date.now();
  try {
    const body = await request.json();
    const { companyName, collectedText } = body;

    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }

    const text = collectedText?.trim() || "(No additional information provided)";
    const userPrompt = buildQuestionGenPrompt(companyName.trim(), text);

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: QUESTION_GEN_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      await recordTask({
        agentType: "question_gen",
        workflowType: "vc_diligence",
        taskType: "question_gen",
        status: "failed",
        inputRef: { companyName: companyName.trim() },
        latencyMs: Date.now() - startMs,
        model: MODEL,
      }).catch(() => {});
      return NextResponse.json(
        { error: "No response from LLM" },
        { status: 500 }
      );
    }

    let cleaned = content.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) cleaned = jsonMatch[1].trim();
    const questions = JSON.parse(cleaned) as string[];

    if (!Array.isArray(questions) || questions.some((q) => typeof q !== "string")) {
      await recordTask({
        agentType: "question_gen",
        workflowType: "vc_diligence",
        taskType: "question_gen",
        status: "failed",
        inputRef: { companyName: companyName.trim() },
        latencyMs: Date.now() - startMs,
        model: MODEL,
      }).catch(() => {});
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    const result = questions.slice(0, 5);
    await recordTask({
      agentType: "question_gen",
      workflowType: "vc_diligence",
      taskType: "question_gen",
      status: "completed",
      inputRef: { companyName: companyName.trim() },
      outputRef: { questionCount: result.length },
      tokensUsed: completion.usage?.total_tokens,
      latencyMs: Date.now() - startMs,
      model: MODEL,
    }).catch(() => {});

    return NextResponse.json({ questions: result });
  } catch (err) {
    console.error("Questions API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
