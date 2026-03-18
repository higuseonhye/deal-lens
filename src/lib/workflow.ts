/**
 * AgentOS: workflowType - add when extending domain
 */
export const WORKFLOW_TYPES = {
  VC_DILIGENCE: "vc_diligence",
  RESEARCH: "research",
  // future: "ic_prep", "portfolio_review", ...
} as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];
