// Vercel API Route: app/api/codeguard/patch/route.ts
// Standards: Web API Request/Response (Compat with Edge/Node)

const CODEGUARD_API = 'https://api.codeguard.ai/v1';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: Request) {
    const headers = { 'Content-Type': 'application/json' };

    try {
        const { patch_id, original_code, dry_run = true } = await request.json();

        if (!patch_id || !original_code) {
            return new Response(JSON.stringify({ error: 'patch_id and original_code required' }), {
                status: 400,
                headers
            });
        }

        const apiKey = process.env.CODEGUARD_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'CODEGUARD_API_KEY not configured' }), {
                status: 500,
                headers
            });
        }

        const response = await fetch(`${CODEGUARD_API}/patch/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                patch_id,
                original_code: btoa(original_code), // Standard btoa instead of Buffer for Edge
                dry_run,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return new Response(JSON.stringify({ error: error.error || 'Patch failed' }), {
                status: response.status,
                headers
            });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200, headers });
    } catch (error) {
        return new Response(JSON.stringify({ 
            error: 'Patch failed', 
            message: error instanceof Error ? error.message : 'Unknown' 
        }), {
            status: 500,
            headers
        });
    }
}
