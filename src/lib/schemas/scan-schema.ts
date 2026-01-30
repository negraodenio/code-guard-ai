import { z } from 'zod';

export const FrameworkSchema = z.object({
    id: z.string(),
    name: z.string(),
    tier: z.number().int().min(1).max(3),
    country: z.enum(['BR', 'Global', 'CN', 'EU', 'US', 'N/A']),
    violations: z.number().int().min(0),
    passed: z.boolean()
});

export const ScanResultSchema = z.object({
    score: z.number().min(0).max(100),
    grade: z.enum(['A', 'B', 'C', 'F']),
    violations: z.array(z.object({
        severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
        framework: z.string(),
        code: z.string(),
        message: z.string(),
        fix: z.string(),
        remediationSnippet: z.string().optional(),
        financialRisk: z.string().optional(),
        remediationCost: z.string().optional(),
        businessImpact: z.string().optional(),
        mitigationEffort: z.enum(['baixo', 'medio', 'alto']).optional()
    })),
    summary: z.string(),
    executiveSummary: z.object({
        overview: z.string(),
        riskAssessment: z.string(),
        actionableVerdict: z.string()
    }),
    context: z.string(),
    trustLevel: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    frameworks: z.array(FrameworkSchema).nonempty({ message: "Families array cannot be empty in production scan" }),
    recommendsCertifiedBlueprint: z.boolean()
});

export type ScanResult = z.infer<typeof ScanResultSchema>;
