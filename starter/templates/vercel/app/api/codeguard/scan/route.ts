// Vercel API Route: app/api/codeguard/scan/route.ts
// Standards: Web API Request/Response (Compat with Edge/Node)

const CODEGUARD_API = 'https://api.codeguard.ai/v1';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
    const headers = { 'Content-Type': 'application/json' };
    
    try {
        const { code, filename, frameworks = ['lgpd', 'gdpr'] } = await request.json();

        if (!code || !filename) {
            return new Response(JSON.stringify({ error: 'code and filename required' }), {
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

        const response = await fetch(`${CODEGUARD_API}/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                content: btoa(code), // Standard btoa instead of Buffer for Edge
                filename,
                frameworks,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return new Response(JSON.stringify({ error: error.error || 'Scan failed' }), {
                status: response.status,
                headers
            });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200, headers });
    } catch (error) {
        return new Response(JSON.stringify({ 
            error: 'Scan failed', 
            message: error instanceof Error ? error.message : 'Unknown' 
        }), {
            status: 500,
            headers
        });
    }
}
