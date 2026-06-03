import { z } from "zod";

// ─── Page Understanding ───

const moduleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  elements: z.array(z.string()),
});

const riskSchema = z.object({
  type: z.string(),
  description: z.string(),
  source: z.string(),
});

const pageUnderstandingSchema = z.object({
  pageType: z.string(),
  businessDomain: z.string().optional(),
  confidence: z.number(),
  modules: z.array(moduleSchema),
  risks: z.array(riskSchema),
});

// ─── Insights ───

const insightSchema = z.object({
  businessRule: z.string().optional(),
  risk: z.string().optional(),
  evidence: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]),
});

// ─── Questions ───

const questionSchema = z.object({
  id: z.string(),
  category: z.enum(["product", "engineering", "qa"]),
  question: z.string(),
});

// ─── Cases ───

const caseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  preconditions: z.array(z.string()),
  steps: z.array(z.string()),
  expectedResult: z.string(),
  priority: z.enum(["P0", "P1", "P2"]).optional(),
  caseType: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ─── Coverage ───

const coverageEntrySchema = z.object({
  requirementId: z.string(),
  caseIds: z.array(z.string()),
});

// ─── Validation ───

const missingCoverageSchema = z.object({
  requirementId: z.string(),
  reason: z.string(),
});

const duplicatedCasesSchema = z.object({
  caseIds: z.array(z.string()),
  reason: z.string(),
});

const validationSchema = z.object({
  passed: z.boolean(),
  score: z.number(),
  missingCoverage: z.array(missingCoverageSchema),
  duplicatedCases: z.array(duplicatedCasesSchema),
});

// ─── Root Schema ───

export const windhooxAgentResultSchema = z.object({
  pageUnderstanding: pageUnderstandingSchema,
  insights: z.array(insightSchema),
  questions: z.array(questionSchema),
  cases: z.array(caseSchema),
  coverage: z.array(coverageEntrySchema),
  validation: validationSchema,
});

export type WindhooxAgentResult = z.infer<typeof windhooxAgentResultSchema>;
