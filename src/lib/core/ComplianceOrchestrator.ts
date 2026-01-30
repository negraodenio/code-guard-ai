import { RepoIntelligence } from '../repo-intelligence/analyzer';
import { CodingMemory } from '../coding-memory/memory';
import { FinOpsAnalyzer } from '../tools/finops/costEstimator';
import { DataLineageTracker } from '../tools/governance/dataLineage';
import { WCAGScanner } from '../tools/accessibility/wcagScanner';
import { ComplianceCTFGenerator } from '../tools/ctf/generator';
import { analyzeCompliance as aiAnalyze } from '../ai';

export class ComplianceOrchestrator {
    private repoIntel = new RepoIntelligence();
    private memory = new CodingMemory();
    private finops = new FinOpsAnalyzer();
    private lineage = new DataLineageTracker();
    private a11y = new WCAGScanner();
    public ctf = new ComplianceCTFGenerator();

    /**
     * The "Grand Central" for all compliance operations
     */
    async fullAudit(code: string, filePath: string, repoId: string, repoPath: string, frameworks: string[] = []) {
        // 1. Repo Intelligence (Context)
        const context = await this.repoIntel.analyzeContext(repoPath);
        const trustZone = this.repoIntel.getTrustZone(filePath);

        // 2. Coding Memory (RAG)
        const similar = await this.memory.querySimilar(repoId, code);

        // 3. AI Analysis (Semantic Judge)
        const aiResult = await aiAnalyze(code, frameworks);

        // 4. Specialized: FinOps, Lineage, A11y
        const finopsResult = await this.finops.analyzeCosts(code);
        const lineageResult = await this.lineage.trackLineage(code);
        const a11yResult = await this.a11y.scan(code);

        // 5. Synthesis
        const baseResult = aiResult as any;
        const finalTrustZone = trustZone === 'production' ? 'PRODUCTION_SURFACE (High Risk)' : 'SANDBOX (Low Risk)';

        return {
            ...baseResult,
            intelligence: {
                ...baseResult.intelligence,
                context: context.type,
                trustZone: finalTrustZone, // Unified source of truth
                memoryDepth: similar.length
            },
            // Only include specialist scans if they found something or were explicitly requested
            ...(finopsResult.totalMonthlyEstimate > 0 ? { finops: finopsResult } : {}),
            ...(lineageResult.length > 0 || a11yResult.length > 0 ? {
                governance: {
                    dataLineage: lineageResult,
                    accessibility: a11yResult
                }
            } : {}),
            recommendsCertifiedBlueprint: (aiResult as any).score < 90
        };
    }
}

export const orchestrator = new ComplianceOrchestrator();
