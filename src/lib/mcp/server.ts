import { Server } from '@modelcontextprotocol/sdk';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk';
import { orchestrator } from '../core/ComplianceOrchestrator';
import { z } from 'zod';

// Re-define schemas locally for validation in handlers, but don't export to JSON dynamically
const ScanSchema = z.object({
    code: z.string(),
    filePath: z.string(),
    repoId: z.string(),
    repoPath: z.string().default('.'),
    frameworks: z.array(z.string()).default(['LGPD', 'FAPI-BR'])
});

const FinOpsSchema = z.object({
    code: z.string(),
    traffic: z.number().default(100000)
});

const SimpleCodeSchema = z.object({
    code: z.string()
});

export const server = new Server({
    name: 'code-guard-pro',
    version: '5.0.0'
}, {
    capabilities: {
        tools: {},
        resources: {}
    }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'scan_compliance',
                description: 'Deep audit for LGPD, BACEN, FAPI-BR.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        filePath: { type: 'string' },
                        repoId: { type: 'string' },
                        repoPath: { type: 'string', default: '.' },
                        frameworks: { type: 'array', items: { type: 'string' }, default: ['LGPD', 'FAPI-BR'] }
                    },
                    required: ['code', 'filePath', 'repoId']
                } as any
            },
            {
                name: 'estimate_infra_cost',
                description: 'FinOps: Detect patterns like N+1 queries and estimate AWS costs.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        traffic: { type: 'number', default: 100000 }
                    },
                    required: ['code']
                } as any
            },
            {
                name: 'analyze_data_lineage',
                description: 'Governance: Map PII flow from source to sink.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' }
                    },
                    required: ['code']
                } as any
            },
            {
                name: 'check_accessibility',
                description: 'A11y: WCAG 2.2 AA scan for React/Vue.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' }
                    },
                    required: ['code']
                } as any
            },
            {
                name: 'generate_ctf_challenge',
                description: 'Gamefication: Generate a compliance vulnerability challenge.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        difficulty: { type: 'string', enum: ['junior', 'senior'] }
                    }
                } as any
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
        const code = (args as any)?.code || '';

        switch (name) {
            case 'scan_compliance':
                const scanArgs = ScanSchema.parse(args) as any;
                const scanRes = await orchestrator.fullAudit(
                    scanArgs.code,
                    scanArgs.filePath,
                    scanArgs.repoId,
                    scanArgs.repoPath,
                    scanArgs.frameworks
                );
                return { content: [{ type: 'text', text: JSON.stringify(scanRes, null, 2) }] };

            case 'estimate_infra_cost':
                const finArgs = FinOpsSchema.parse(args) as any;
                const finRes = await (orchestrator as any).finops.analyzeCosts(finArgs.code, finArgs.traffic);
                return { content: [{ type: 'text', text: JSON.stringify(finRes, null, 2) }] };

            case 'analyze_data_lineage':
                const linRes = await (orchestrator as any).lineage.trackLineage(code);
                return { content: [{ type: 'text', text: JSON.stringify(linRes, null, 2) }] };

            case 'check_accessibility':
                const accRes = await (orchestrator as any).a11y.scan(code);
                return { content: [{ type: 'text', text: JSON.stringify(accRes, null, 2) }] };

            case 'generate_ctf_challenge':
                const diffInput = (args as any).difficulty || 'junior';
                const ctfRes = await (orchestrator as any).ctf.generateChallenge(diffInput);
                return { content: [{ type: 'text', text: JSON.stringify(ctfRes, null, 2) }] };

            default:
                throw new Error(`Tool ${name} not found`);
        }
    } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            { uri: 'blueprint://lgpd-logger', name: 'LGPD Safe Logger', mimeType: 'text/typescript' },
            { uri: 'blueprint://fapi-auth', name: 'FAPI-BR Auth Middleware', mimeType: 'text/typescript' }
        ]
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
    return { contents: [{ uri: request.params.uri, mimeType: 'text/typescript', text: '// Blueprint content...' }] };
});
