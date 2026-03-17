/**
 * AgentOS: workflowType - 도메인 확장 시 추가
 */
export const WORKFLOW_TYPES = {
  VC_DILIGENCE: "vc_diligence",
  RESEARCH: "research",
  // future: "ic_prep", "portfolio_review", ...
} as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];
