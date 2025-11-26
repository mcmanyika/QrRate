import { NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()

    // Get current active subscription
    const { data: subscription } = await supabase
      .from('transporter_subscription')
      .select('plan_id, status, plan:subscription_plan(name)')
      .eq('transporter_id', transporter.id)
      .eq('status', 'active')
      .single()

    // If no active subscription, return default free plan
    if (!subscription) {
      const { data: freePlan } = await supabase
        .from('subscription_plan')
        .select('id, name')
        .eq('name', 'free')
        .single()

      return NextResponse.json({
        plan_id: freePlan?.id || null,
        plan_name: 'free',
        status: 'active',
      })
    }

    return NextResponse.json({
      plan_id: subscription.plan_id,
      plan_name: (subscription.plan as any)?.name || 'free',
      status: subscription.status,
    })
  } catch (error) {
    console.error('Failed to fetch subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

