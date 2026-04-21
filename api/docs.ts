import { NextRequest, NextResponse } from 'next/server';

// Edge Runtime for Vercel
export const runtime = 'edge';

export async function GET(request: NextRequest) {
    // Redirect to external documentation
    return NextResponse.redirect('https://code-guard.eu/api-docs', { status: 302 });
}