import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_subscriptions')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { message: 'Email already subscribed' },
        { status: 200 }
      )
    }

    // Insert new subscription
    const { error } = await supabase
      .from('email_subscriptions')
      .insert({
        email: email.toLowerCase().trim(),
        subscribed_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error subscribing email:', error)
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Successfully subscribed' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

