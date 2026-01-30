export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@/lib/mcp/transport'; // verified
import { server } from '@/lib/mcp/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Create a singleton transport for the session manager
const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID()
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Permite que Cursor, Replit e outros se conectem
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
    // 1. Auth & Quota Check
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('apiKey');

    if (!apiKey) {
        return new Response('Auth required. Provide x-api-key header or query param.', { status: 401 });
    }

    // Call Supabase function to check quota
    const { data: hasQuota, error: quotaError } = await supabase.rpc('check_license_quota', {
        p_api_key: apiKey
    });

    if (quotaError || !hasQuota) {
        return new Response('Invalid key or quota exceeded.', {
            status: 403,
            headers: corsHeaders
        });
    }

    // Ensure server is connected to the transport
    await server.connect(transport);

    // Track usage (fire and forget)
    supabase.rpc('increment_license_requests', { p_api_key: apiKey }).then(() => { });

    // 2. Handle the request using the Web Standard transport
    const response = await transport.handleRequest(req);
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('apiKey');

    if (!apiKey) {
        return new Response('Auth required.', {
            status: 401,
            headers: corsHeaders
        });
    }

    // Connect just in case (no-op if already connected)
    await server.connect(transport);

    const response = await transport.handleRequest(req);
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

export async function DELETE(req: NextRequest) {
    const response = await transport.handleRequest(req);
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}
