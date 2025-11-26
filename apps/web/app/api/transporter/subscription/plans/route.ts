import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all subscription plans
    const { data: plans, error } = await supabase
      .from('subscription_plan')
      .select('*')
      .order('price_monthly_cents', { ascending: true })

    if (error) {
      console.error('Failed to fetch plans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch plans' },
        { status: 500 }
      )
    }

    // Transform features from jsonb to array
    const transformedPlans = plans?.map(plan => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : [],
    })) || []

    return NextResponse.json(transformedPlans)
  } catch (error) {
    console.error('Failed to fetch plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

