import { NextRequest, NextResponse } from 'next/server';
import { RepoIntelligence } from '../../src/intelligence/ril';
import { LicenseManager } from '../../src/license/LicenseManager';

// Edge Runtime for Vercel
export const runtime = 'edge';

async function authenticateApiKey(request: NextRequest): Promise<boolean> {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const validKeys = process.env.CODEGUARD_API_KEYS?.split(',') || [];

    return apiKey ? validKeys.includes(apiKey) : false;
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        if (!await authenticateApiKey(request)) {
            return NextResponse.json(
                {
                    error: 'Unauthorized',
                    message: 'Valid API key required',
                    docs: 'https://code-guard.eu/api-docs'
                },
                { status: 401 }
            );
        }

        // Check license
        const license = LicenseManager.validate(process.env.CODEGUARD_LICENSE_KEY);
        const isAllowed = LicenseManager.checkGate('codeguard_graph', license.plan);

        if (!isAllowed) {
            return NextResponse.json(
                {
                    error: "PREMIUM_FEATURE_LOCKED",
                    message: `The graph feature requires a PRO license.`,
                    upgrade_url: "https://code-guard.eu/enterprise",
                    current_plan: license.plan
                },
                { status: 403 }
            );
        }

        // Generate dependency graph
        const ril = new RepoIntelligence();
        const context = await ril.indexRepository(process.cwd());
        const graph = await ril.buildDependencyGraph(context);

        const result = {
            content: [{
                type: "text",
                text: JSON.stringify({
                    nodes: context.files.length,
                    edges: graph.edges.size,
                    sensitive_files: graph.sensitiveFiles
                }, null, 2)
            }]
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('[API Error]', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}