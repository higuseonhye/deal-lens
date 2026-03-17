export type Priority = "P0" | "P1" | "P2";
export type Severity = "low" | "medium" | "high";
export type Owner = "human" | "ai";

export interface MissingCoverage {
  area: string;
  whyItMatters: string;
  whatToCheck: string;
}

export interface ContradictionFlag {
  flag: string;
  whyItMatters: string;
  howToResolve: string;
}

export interface SourceQualitySummary {
  primarySources: number;
  secondarySources: number;
  unknown: number;
  notes: string;
}

export interface DiligenceQuestion {
  question: string;
  whyThisQuestion: string;
  expectedEvidence: string;
  priority: Priority;
}

export interface EvidenceLedgerEntry {
  claim: string;
  sourceUrl: string | null;
  snippet: string | null;
  confidence: number;
  included: boolean;
  notes?: string;
}

export interface RedFlag {
  risk: string;
  severity: Severity;
  reasoning: string;
}

export interface NextAction {
  action: string;
  owner: Owner;
  expectedTime: string;
}

export interface ReliabilityCard {
  companyName: string;
  question: string;
  evidenceScore: number;
  evidenceScoreRationale: string;
  missingCoverage: MissingCoverage[];
  contradictionFlags: ContradictionFlag[];
  sourceQualitySummary: SourceQualitySummary;
  diligenceQuestions: DiligenceQuestion[];
  evidenceLedger: EvidenceLedgerEntry[];
  assumptions: string[];
  redFlags: RedFlag[];
  nextActions: NextAction[];
}
