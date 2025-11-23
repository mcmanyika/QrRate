import { NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()

    // Get transporter's vehicle IDs
    const { data: vehicles } = await supabase
      .from('vehicle')
      .select('id')
      .eq('transporter_id', transporter.id)

    const vehicleIds = vehicles?.map(v => v.id) || []

    if (vehicleIds.length === 0) {
      return NextResponse.json({
        total_vehicles: 0,
        total_ratings: 0,
        average_rating: 0,
        total_tips: 0,
        total_tips_amount_cents: 0,
        recent_ratings: [],
      })
    }

    // Get ratings stats
    const { data: ratings } = await supabase
      .from('rating')
      .select('stars, created_at')
      .in('vehicle_id', vehicleIds)

    const totalRatings = ratings?.length || 0
    const averageRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
      : 0

    // Get tips stats
    const { data: tips } = await supabase
      .from('tip')
      .select('amount_cents, operator_amount_cents')
      .in('vehicle_id', vehicleIds)
      .eq('stripe_status', 'succeeded')

    const totalTips = tips?.length || 0
    const totalTipsAmount = tips?.reduce((sum, t) => sum + (t.operator_amount_cents || 0), 0) || 0

    // Get recent ratings
    const { data: recentRatings } = await supabase
      .from('rating')
      .select('*, vehicle:vehicle_id(reg_number)')
      .in('vehicle_id', vehicleIds)
      .order('created_at', { ascending: false })
      .limit(2)

    return NextResponse.json({
      total_vehicles: vehicleIds.length,
      total_ratings: totalRatings,
      average_rating: Math.round(averageRating * 10) / 10,
      total_tips: totalTips,
      total_tips_amount_cents: totalTipsAmount,
      recent_ratings: recentRatings || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

