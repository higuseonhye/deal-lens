import { z } from "zod";

export const MissingCoverageSchema = z.object({
  area: z.string(),
  whyItMatters: z.string(),
  whatToCheck: z.string(),
});

export const ContradictionFlagSchema = z.object({
  flag: z.string(),
  whyItMatters: z.string(),
  howToResolve: z.string(),
});

export const SourceQualitySummarySchema = z.object({
  primarySources: z.number(),
  secondarySources: z.number(),
  unknown: z.number(),
  notes: z.string(),
});

export const DiligenceQuestionSchema = z.object({
  question: z.string(),
  whyThisQuestion: z.string(),
  expectedEvidence: z.string(),
  priority: z.enum(["P0", "P1", "P2"]),
});

export const EvidenceLedgerEntrySchema = z.object({
  claim: z.string(),
  sourceUrl: z.union([z.string(), z.null()]).nullable(),
  snippet: z.union([z.string(), z.null()]).nullable(),
  confidence: z.union([z.number(), z.string()]).transform((v) => (typeof v === "string" ? parseFloat(v) || 0 : v)),
  included: z.boolean().default(true),
  notes: z.string().optional(),
});

export const RedFlagSchema = z.object({
  risk: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  reasoning: z.string(),
});

export const NextActionSchema = z.object({
  action: z.string(),
  owner: z.enum(["human", "ai"]),
  expectedTime: z.string(),
});

export const ReliabilityCardSchema = z.object({
  companyName: z.string(),
  question: z.string(),
  evidenceScore: z.union([z.number(), z.string()]).transform((v) => (typeof v === "string" ? parseInt(v, 10) || 0 : v)),
  evidenceScoreRationale: z.string(),
  missingCoverage: z.array(MissingCoverageSchema).default([]),
  contradictionFlags: z.array(ContradictionFlagSchema).default([]),
  sourceQualitySummary: SourceQualitySummarySchema.default({
    primarySources: 0,
    secondarySources: 0,
    unknown: 0,
    notes: "",
  }),
  diligenceQuestions: z.array(DiligenceQuestionSchema).default([]),
  evidenceLedger: z.array(EvidenceLedgerEntrySchema).default([]),
  assumptions: z.array(z.string()).default([]),
  redFlags: z.array(RedFlagSchema).default([]),
  nextActions: z.array(NextActionSchema).default([]),
});

export type ReliabilityCardZod = z.infer<typeof ReliabilityCardSchema>;
