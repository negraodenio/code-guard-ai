import { RepoIntelligence } from '../repo-intelligence/analyzer';
import { CodingMemory } from '../coding-memory/memory';
import { FinOpsAnalyzer } from '../tools/finops/costEstimator';
import { DataLineageTracker } from '../tools/governance/dataLineage';
import { WCAGScanner } from '../tools/accessibility/wcagScanner';
import { ComplianceCTFGenerator } from '../tools/ctf/generator';
import { analyzeCompliance as aiAnalyze } from '../ai';

export class ComplianceOrchestrator {
    private repoIntel: RepoIntelligence | null = null;
    private memory: CodingMemory | null = null;
    private finops: FinOpsAnalyzer | null = null;
    private lineage: DataLineageTracker | null = null;
    private a11y: WCAGScanner | null = null;
    public ctf = new ComplianceCTFGenerator(); // Lightweight, can stay

    private getRepoIntel() {
        if (!this.repoIntel) this.repoIntel = new RepoIntelligence();
        return this.repoIntel;
    }

    private getMemory() {
        if (!this.memory) this.memory = new CodingMemory();
        return this.memory;
    }

    private getFinops() {
        if (!this.finops) this.finops = new FinOpsAnalyzer();
        return this.finops;
    }

    private getLineage() {
        if (!this.lineage) this.lineage = new DataLineageTracker();
        return this.lineage;
    }

    private getA11y() {
        if (!this.a11y) this.a11y = new WCAGScanner();
        return this.a11y;
    }

    /**
     * The "Grand Central" for all compliance operations
     */
    async fullAudit(code: string, filePath: string, repoId: string, repoPath: string, frameworks: string[] = []) {
        // 1. Repo Intelligence (Context)
        const context = await this.getRepoIntel().analyzeContext(repoPath);
        const trustZone = this.getRepoIntel().getTrustZone(filePath);

        // 2. Coding Memory (RAG)
        const similar = await this.getMemory().querySimilar(repoId, code);

        // 3. AI Analysis (Semantic Judge)
        const aiResult = await aiAnalyze(code, frameworks);

        // 4. Specialized: FinOps, Lineage, A11y
        const finopsResult = await this.getFinops().analyzeCosts(code);
        const lineageResult = await this.getLineage().trackLineage(code);
        const a11yResult = await this.getA11y().scan(code);

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

    async estimateCosts(code: string, traffic: number = 100000) {
        return this.getFinops().analyzeCosts(code, traffic);
    }

    async trackLineage(code: string) {
        return this.getLineage().trackLineage(code);
    }

    async scanAccessibility(code: string) {
        return this.getA11y().scan(code);
    }
}

export const orchestrator = new ComplianceOrchestrator();
