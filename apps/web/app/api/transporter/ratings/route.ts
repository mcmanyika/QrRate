import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicle_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '4')
    const offset = (page - 1) * limit

    // Get transporter's vehicle IDs
    const { data: vehicles } = await supabase
      .from('vehicle')
      .select('id')
      .eq('transporter_id', transporter.id)

    const vehicleIds = vehicles?.map(v => v.id) || []

    if (vehicleIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      })
    }

    // Build count query
    let countQuery = supabase
      .from('rating')
      .select('id', { count: 'exact', head: true })
      .in('vehicle_id', vehicleIds)

    if (vehicleId) {
      countQuery = countQuery.eq('vehicle_id', vehicleId)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 400 }
      )
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    // Build data query
    let query = supabase
      .from('rating')
      .select('*, vehicle:vehicle_id(id, reg_number), route:route_id(name)')
      .in('vehicle_id', vehicleIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

