import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.21.0"

const PLATFORM_FEE_PERCENTAGE = 0.15 // 15% platform fee
const MIN_TIP_CENTS = 50 // $0.50 minimum
const MAX_TIP_CENTS = 10000 // $100.00 maximum

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }

    const stripe = new Stripe(stripeSecretKey, {
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

    // Parse request body
    const { vehicleId, amountCents, ratingId } = await req.json()

    // Validate input
    if (!vehicleId || typeof vehicleId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'vehicleId is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    if (!amountCents || typeof amountCents !== 'number') {
      return new Response(
        JSON.stringify({ error: 'amountCents is required and must be a number' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Validate amount range
    if (amountCents < MIN_TIP_CENTS) {
      return new Response(
        JSON.stringify({ error: `Minimum tip amount is $${MIN_TIP_CENTS / 100}` }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    if (amountCents > MAX_TIP_CENTS) {
      return new Response(
        JSON.stringify({ error: `Maximum tip amount is $${MAX_TIP_CENTS / 100}` }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Verify vehicle exists and is active
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicle')
      .select('id, route_id, reg_number, is_active')
      .eq('id', vehicleId)
      .eq('is_active', true)
      .maybeSingle()

    if (vehicleError) {
      console.error('Error fetching vehicle:', vehicleError)
      return new Response(
        JSON.stringify({ error: 'Unable to verify vehicle' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    if (!vehicle) {
      return new Response(
        JSON.stringify({ error: 'Vehicle not found or inactive' }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Calculate fees
    const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENTAGE)
    const operatorAmountCents = amountCents - platformFeeCents

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        vehicle_id: vehicleId,
        rating_id: ratingId || '',
        route_id: vehicle.route_id || '',
        platform_fee_cents: platformFeeCents.toString(),
        operator_amount_cents: operatorAmountCents.toString(),
      },
      description: `Tip for vehicle ${vehicle.reg_number}`,
    })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        platformFeeCents,
        operatorAmountCents,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

