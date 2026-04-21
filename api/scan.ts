import { NextRequest, NextResponse } from 'next/server';
import { AuditDispatcher } from '../src/core/dispatcher';
import { UnifiedAuthenticator } from '../src/core/auth';

// Use Node.js runtime to allow FS operations via the shim
export const runtime = 'nodejs';

// Singleton instance to minimize overhead in Serverless
const dispatcher = new AuditDispatcher();

export async function POST(request: NextRequest) {
    try {
        // 1. Unified Authentication
        const authHeader = request.headers.get('authorization') || request.headers.get('x-api-key') || '';
        const auth = UnifiedAuthenticator.authenticate(authHeader);

        if (!auth.authenticated) {
            return NextResponse.json(
                {
                    error: 'Unauthorized',
                    message: 'Valid API key required in authorization header',
                    docs: 'https://docs.codeguard.ai/api'
                },
                { status: 401 }
            );
        }

        UnifiedAuthenticator.logAccess('POST', '/api/scan', auth.fingerprint!);

        // 2. Parse Request
        const body = await request.json();
        
        // 3. Dispatch to Tool
        // The API defaults to 'codeguard_audit' tool
        const result = await dispatcher.dispatch('codeguard_audit', {
            ...body,
            filePath: body.filePath || process.cwd() // Default to project root
        });

        // 4. Handle tool response
        if (result.error) {
            const status = result.error === 'PREMIUM_FEATURE_LOCKED' ? 403 : 500;
            return NextResponse.json(result, { status });
        }

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('[API Scan Error]:', error);
        return NextResponse.json(
            { 
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}