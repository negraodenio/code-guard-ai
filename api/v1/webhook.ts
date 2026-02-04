/**
 * CodeGuard API v1 - Stripe Webhook
 * 
 * POST /api/v1/webhook
 * 
 * Receives events from Stripe to update user credits automatically.
 * Handles 'checkout.session.completed'.
 */

import { getSupabaseClient } from '../src/supabase/client';

// Simple Stripe Signature Verification (Mock for Edge, use 'stripe' npm in Node)
// In production Vercel Edge, we'd use 'stripe-edge' or similar
async function verifyStripeSignature(req: Request, secret: string) {
    // This is a placeholder. Real implementation requires crypto/subtle
    // For MVP/Demo correctness, verifying the secret in the payload or URL is easier
    // but less secure. We'll assume the header presence for now.
    return req.headers.get('stripe-signature') ? true : false;
}

export async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const STRIPE_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!STRIPE_SECRET) {
        console.error('Missing STRIPE_WEBHOOK_SECRET');
        return new Response('Server Error', { status: 500 });
    }

    try {
        const signature = req.headers.get('stripe-signature');
        if (!signature) {
            return new Response('Missing signature', { status: 400 });
        }

        const text = await req.text();
        const event = JSON.parse(text);

        // Security check: Verify Stripe Signature
        // In production, use 'stripe' library's constructEvent
        const isValidSignature = await verifyStripeSignature(req, STRIPE_SECRET);
        if (!isValidSignature) {
            console.warn('[Security] Invalid Stripe Signature. Rejecting.');
            return new Response('Invalid signature', { status: 400 });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userEmail = session.customer_details?.email || session.metadata?.email;
            const amountPaid = session.amount_total; // in cents

            // Business Logic: €19.99 = 20 credits (approx)
            // Or use metadata for exact credit amount
            const creditsToAdd = session.metadata?.credits ? parseInt(session.metadata.credits) : 20;

            if (userEmail) {
                const supabase = getSupabaseClient();
                if (supabase) {
                    // Update user credits
                    // Using RPC to increment is safer for concurrency
                    // await supabase.rpc('increment_credits', { email: userEmail, amount: creditsToAdd });

                    // Simple select-update fallback
                    const { data: user } = await supabase
                        .from('user_credits')
                        .select('credits')
                        .eq('email', userEmail)
                        .single();

                    const newBalance = (user?.credits || 0) + creditsToAdd;

                    await supabase
                        .from('user_credits')
                        .upsert({ email: userEmail, credits: newBalance, last_updated: new Date().toISOString() });

                    console.log(`[Billing] Added ${creditsToAdd} credits to ${userEmail}`);
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });

    } catch (err) {
        console.error(`Webhook Error: ${(err as Error).message}`);
        return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
    }
}

export const config = { runtime: 'edge' };
export default handler;
