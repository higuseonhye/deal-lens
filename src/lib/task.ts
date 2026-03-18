/**
 * AgentOS: Task recording - Reputation seed (performance/cost/accuracy accumulation)
 */
import { prisma } from "./prisma";
import type { AgentType } from "./agents";

export interface RecordTaskParams {
  agentType: AgentType;
  workflowType?: string;
  taskType: string;
  status: "completed" | "failed";
  inputRef?: Record<string, unknown>;
  outputRef?: Record<string, unknown>;
  tokensUsed?: number;
  latencyMs?: number;
  model?: string;
}

export async function recordTask(params: RecordTaskParams) {
  const { getOrCreateAgent } = await import("./agents");
  const agent = await getOrCreateAgent(params.agentType, params.model);

  await prisma.task.create({
    data: {
      agentId: agent.id,
      workflowType: params.workflowType ?? "vc_diligence",
      taskType: params.taskType,
      status: params.status,
      inputRef: params.inputRef ? JSON.stringify(params.inputRef) : null,
      outputRef: params.outputRef ? JSON.stringify(params.outputRef) : null,
      tokensUsed: params.tokensUsed ?? null,
      latencyMs: params.latencyMs ?? null,
    },
  });
}
