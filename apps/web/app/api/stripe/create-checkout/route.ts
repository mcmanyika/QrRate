import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { priceId, planName } = body

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let customerId: string

    // Check if user already has a Stripe customer ID
    const { data: existingSubscription } = await supabase
      .from('event')
      .select('organizer_id')
      .eq('organizer_id', user.id)
      .limit(1)
      .single()

    // For now, create a new customer each time (you can optimize this later)
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    })
    customerId = customer.id

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_name: planName,
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

