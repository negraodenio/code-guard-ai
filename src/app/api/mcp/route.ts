export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { createMcpHandler } from 'mcp-handler';
import { setupMcpServer } from '@/lib/mcp/setup';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const mcpHandler = createMcpHandler(setupMcpServer, {
    scopes: {}
} as any);

async function checkAuth(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('apiKey');

    if (!apiKey) {
        return { authorized: false, error: 'Auth required. Provide x-api-key header or query param.', status: 401 };
    }

    // Call Supabase function to check quota
    const { data: hasQuota, error: quotaError } = await getSupabase().rpc('check_license_quota', {
        p_api_key: apiKey
    });

    if (quotaError || !hasQuota) {
        return { authorized: false, error: 'Invalid key or quota exceeded.', status: 403 };
    }

    // Track usage (fire and forget)
    getSupabase().rpc('increment_license_requests', { p_api_key: apiKey }).then(() => { });

    return { authorized: true };
}

export async function GET(req: NextRequest) {
    const auth = await checkAuth(req);
    if (!auth.authorized) {
        return new Response(auth.error, { status: auth.status });
    }
    return mcpHandler(req);
}

export async function POST(req: NextRequest) {
    const auth = await checkAuth(req);
    if (!auth.authorized) {
        return new Response(auth.error, { status: auth.status });
    }
    return mcpHandler(req);
}

// OPTIONS is typically handled automatically or we can pass it through if mcpHandler supports it,
// but for CORS we usually want explicit handling or middleware. mcp-handler handles basic requests.
export async function DELETE(req: NextRequest) {
    // Auth check might be needed for DELETE too depending on semantics, assuming yes based on previous code.
    const auth = await checkAuth(req);
    if (!auth.authorized) {
        return new Response(auth.error, { status: auth.status });
    }
    return mcpHandler(req);
}

