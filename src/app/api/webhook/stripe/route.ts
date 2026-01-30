import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '../../../../lib/email';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const email = session.customer_details?.email;

        if (!email) {
            console.error('No email found in Stripe session');
            return NextResponse.json({ error: 'No email found' }, { status: 400 });
        }

        // 1. Generate Secure API Key
        const apiKey = `cg_live_${crypto.randomBytes(24).toString('hex')}`;
        const tier = session.metadata?.tier || 'pro';

        // 2. Save to Supabase
        console.log(`Creating license for ${email} with tier ${tier}`);
        const { error: dbError } = await supabase.from('licenses').insert({
            email,
            api_key: apiKey,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            tier,
            status: 'active'
        });

        if (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // 3. Send Welcome Email
        await sendWelcomeEmail(email, apiKey).catch(e => console.error('Email error:', e));
    }

    // --- Gestão de Assinatura Permanente ---

    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as any;
        // Garante que a licença continue ativa após renovação mensal bem sucedida
        await supabase
            .from('licenses')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', invoice.subscription);
        console.log(`Subscription ${invoice.subscription} renewed successfully.`);
    }

    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as any;
        // Marca como 'past_due' para o MCP bloquear acessos temporariamente
        await supabase
            .from('licenses')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription);
        console.log(`Payment failed for ${invoice.subscription}. License suspended.`);
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as any;
        // Desativa a chave permanentemente se o plano for cancelado
        await supabase
            .from('licenses')
            .update({ status: 'expired' })
            .eq('stripe_subscription_id', subscription.id);
        console.log(`Subscription ${subscription.id} cancelled. License expired.`);
    }

    return NextResponse.json({ received: true });
}
