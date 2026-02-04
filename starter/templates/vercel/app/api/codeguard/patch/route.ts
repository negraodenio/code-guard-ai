// Vercel API Route: app/api/codeguard/patch/route.ts
import { NextRequest, NextResponse } from 'next/server';

const CODEGUARD_API = 'https://api.codeguard.ai/v1';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        const { patch_id, original_code, dry_run = true } = await request.json();

        if (!patch_id || !original_code) {
            return NextResponse.json(
                { error: 'patch_id and original_code required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.CODEGUARD_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'CODEGUARD_API_KEY not configured' },
                { status: 500 }
            );
        }

        const response = await fetch(`${CODEGUARD_API}/patch/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                patch_id,
                original_code: Buffer.from(original_code).toString('base64'),
                dry_run,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.error || 'Patch failed' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: 'Patch failed', message: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
