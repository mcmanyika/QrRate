import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.21.0"

serve(async (req) => {
  try {
    // Get Stripe webhook secret from environment
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set')
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get Supabase service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the signature from the request headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the raw body
    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(supabase, paymentIntent)
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailure(supabase, paymentIntent)
        break
      }
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentCanceled(supabase, paymentIntent)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

async function handlePaymentSuccess(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const paymentIntentId = paymentIntent.id
  const metadata = paymentIntent.metadata

  // Check if tip record already exists
  const { data: existingTip } = await supabase
    .from('tip')
    .select('id, stripe_status')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  // If already succeeded, skip (idempotent)
  if (existingTip && existingTip.stripe_status === 'succeeded') {
    console.log(`Tip ${existingTip.id} already marked as succeeded`)
    return
  }

  // Update or insert tip record
  const tipData = {
    stripe_payment_intent_id: paymentIntentId,
    stripe_status: 'succeeded' as const,
    vehicle_id: metadata.vehicle_id,
    route_id: metadata.route_id || null,
    rating_id: metadata.rating_id || null,
    amount_cents: paymentIntent.amount,
    platform_fee_cents: parseInt(metadata.platform_fee_cents || '0'),
    operator_amount_cents: parseInt(metadata.operator_amount_cents || '0'),
    currency: paymentIntent.currency,
  }

  if (existingTip) {
    // Update existing record
    const { error } = await supabase
      .from('tip')
      .update(tipData)
      .eq('id', existingTip.id)

    if (error) {
      console.error('Error updating tip:', error)
      throw error
    }
  } else {
    // Insert new record (shouldn't happen if frontend created it, but handle gracefully)
    // Note: device_hash will need to be set by frontend, so this is a fallback
    const { error } = await supabase
      .from('tip')
      .insert({
        ...tipData,
        device_hash: 'webhook_' + Date.now(), // Fallback, ideally frontend sets this
      })

    if (error) {
      console.error('Error inserting tip:', error)
      throw error
    }
  }
}

async function handlePaymentFailure(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const paymentIntentId = paymentIntent.id

  const { error } = await supabase
    .from('tip')
    .update({ stripe_status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntentId)

  if (error) {
    console.error('Error updating tip status to failed:', error)
    throw error
  }
}

async function handlePaymentCanceled(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const paymentIntentId = paymentIntent.id

  const { error } = await supabase
    .from('tip')
    .update({ stripe_status: 'canceled' })
    .eq('stripe_payment_intent_id', paymentIntentId)

  if (error) {
    console.error('Error updating tip status to canceled:', error)
    throw error
  }
}

