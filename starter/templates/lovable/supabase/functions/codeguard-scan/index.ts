// supabase/functions/codeguard-scan/index.ts
// Edge Function para Lovable - Integração com CodeGuard API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CODEGUARD_API = 'https://api.codeguard.ai/v1';

interface ScanRequest {
    file_content: string;
    filename: string;
    frameworks?: string[];
    project_id?: string;
}

interface ScanResult {
    success: boolean;
    credits_used: number;
    report: {
        summary: {
            total: number;
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        violations: Array<{
            id: string;
            line: number;
            severity: string;
            message: string;
            suggestion: string;
        }>;
    };
}

// Supabase admin client para logging
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request): Promise<Response> => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        // Parse request body
        const { file_content, filename, frameworks = ['lgpd', 'gdpr'] } =
            await req.json() as ScanRequest;

        // Validate input
        if (!file_content || !filename) {
            return new Response(
                JSON.stringify({ error: 'file_content and filename required' }),
                { status: 400, headers }
            );
        }

        // Get API key from environment
        const apiKey = Deno.env.get('CODEGUARD_API_KEY');
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'CODEGUARD_API_KEY not configured' }),
                { status: 500, headers }
            );
        }

        // Forward to CodeGuard Cloud API
        const response = await fetch(`${CODEGUARD_API}/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                content: btoa(file_content), // base64 encode
                filename,
                frameworks,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return new Response(
                JSON.stringify({ error: error.error || 'Scan failed' }),
                { status: response.status, headers }
            );
        }

        const result: ScanResult = await response.json();

        // Log scan result to Supabase (optional - for analytics)
        try {
            await supabaseAdmin.from('codeguard_logs').insert({
                filename,
                frameworks,
                violations_found: result.report?.summary?.total || 0,
                credits_used: result.credits_used,
                created_at: new Date().toISOString(),
            });
        } catch (logError) {
            console.error('Log error:', logError);
            // Don't fail the request if logging fails
        }

        return new Response(JSON.stringify(result), { headers });

    } catch (error) {
        console.error('Edge function error:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal error',
                message: error instanceof Error ? error.message : 'Unknown'
            }),
            { status: 500, headers }
        );
    }
});
