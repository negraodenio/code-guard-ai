import { NextRequest, NextResponse } from 'next/server';
import { ShadowAPIScanner } from '../../src/scanner/shadowApi';
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

        // Parse request body
        const body = await request.json();
        const { content, filePath } = body;

        // Validate input
        if (!content && !filePath) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: [{ msg: 'Either content or filePath must be provided', param: 'content,filePath' }]
                },
                { status: 400 }
            );
        }

        if (content && typeof content !== 'string') {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: [{ msg: 'Content must be a string', param: 'content' }]
                },
                { status: 400 }
            );
        }

        if (filePath && typeof filePath !== 'string') {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: [{ msg: 'File path must be a string', param: 'filePath' }]
                },
                { status: 400 }
            );
        }

        // Check license
        const license = LicenseManager.validate(process.env.CODEGUARD_LICENSE_KEY);
        const isAllowed = LicenseManager.checkGate('detect_shadow_apis', license.plan);

        if (!isAllowed) {
            return NextResponse.json(
                {
                    error: "PREMIUM_FEATURE_LOCKED",
                    message: `The shadow API detection requires a PRO license.`,
                    upgrade_url: "https://code-guard.eu/enterprise",
                    current_plan: license.plan
                },
                { status: 403 }
            );
        }

        // Scan for shadow APIs
        let violations = [];

        if (content) {
            violations = ShadowAPIScanner.scan(content);
        } else if (filePath) {
            // In Vercel Edge Runtime, we can't access the file system directly
            // This would need to be adapted for serverless environment
            return NextResponse.json(
                {
                    error: 'File system access not available',
                    message: 'Use the content parameter instead of filePath in serverless environment'
                },
                { status: 400 }
            );
        }

        const result = {
            content: [{
                type: "text",
                text: JSON.stringify({
                    summary: {
                        total_violations: violations.length,
                        critical: violations.filter((v: any) => v.severity === 'CRITICAL').length,
                        license_tier: license.plan,
                        analytics_tracked: true
                    },
                    findings: violations
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