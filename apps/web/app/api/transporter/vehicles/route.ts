import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '4')
    const offset = (page - 1) * limit

    // Get total count
    const { count, error: countError } = await supabase
      .from('vehicle')
      .select('id', { count: 'exact', head: true })
      .eq('transporter_id', transporter.id)

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 400 }
      )
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    // Get paginated data
    const { data, error } = await supabase
      .from('vehicle')
      .select('*, route:route_id(*)')
      .eq('transporter_id', transporter.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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

export async function POST(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const body = await request.json()
    const { reg_number, route_id } = body

    if (!reg_number) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehicle')
      .insert({
        reg_number,
        route_id: route_id || null,
        transporter_id: transporter.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

