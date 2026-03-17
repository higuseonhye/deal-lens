/**
 * AgentOS: AI Workforce - 에이전트 조회/생성
 */
import { prisma } from "./prisma";

const AGENT_TYPES = [
  { type: "collect", name: "Info Collector", model: null },
  { type: "question_gen", name: "Question Generator", model: "gpt-4o-mini" },
  { type: "reliability", name: "Reliability Agent", model: "gpt-4o-mini" },
] as const;

export type AgentType = (typeof AGENT_TYPES)[number]["type"];

export async function getOrCreateAgent(type: AgentType, model?: string) {
  let agent = await prisma.agent.findFirst({
    where: { type },
  });
  if (!agent) {
    const config = AGENT_TYPES.find((a) => a.type === type);
    agent = await prisma.agent.create({
      data: {
        name: config?.name ?? type,
        type,
        model: model ?? config?.model ?? null,
      },
    });
  }
  return agent;
}
