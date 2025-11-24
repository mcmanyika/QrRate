import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const vehicleId = searchParams.get('vehicle_id')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('expense')
      .select(`
        *,
        vehicle:vehicle_id(id, reg_number),
        service_provider:service_provider_id(id, name),
        staff:staff_id(id, name)
      `)
      .eq('transporter_id', transporter.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId)
    }

    if (category && ['fuel', 'maintenance', 'insurance', 'staff_payment', 'service_provider_payment', 'other'].includes(category)) {
      query = query.eq('category', category)
    }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('date', dateTo)
    }

    if (search) {
      query = query.or(`description.ilike.%${search}%,vendor.ilike.%${search}%`)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('expense')
      .select('id', { count: 'exact', head: true })
      .eq('transporter_id', transporter.id)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

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
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
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
    const {
      vehicle_id,
      category,
      amount,
      currency = 'usd',
      date,
      description,
      vendor,
      payment_method,
      receipt_url,
      is_recurring = false,
      recurring_frequency,
      service_provider_id,
      staff_id,
    } = body

    if (!vehicle_id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      )
    }

    if (!category || !['fuel', 'maintenance', 'insurance', 'staff_payment', 'service_provider_payment', 'other'].includes(category)) {
      return NextResponse.json(
        { error: 'Valid category is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Verify vehicle belongs to transporter
    const supabase = await createClient()
    const { data: vehicle } = await supabase
      .from('vehicle')
      .select('id')
      .eq('id', vehicle_id)
      .eq('transporter_id', transporter.id)
      .single()

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Verify service provider if provided
    if (service_provider_id) {
      const { data: serviceProvider } = await supabase
        .from('service_provider')
        .select('id')
        .eq('id', service_provider_id)
        .eq('transporter_id', transporter.id)
        .single()

      if (!serviceProvider) {
        return NextResponse.json(
          { error: 'Service provider not found' },
          { status: 404 }
        )
      }
    }

    // Verify staff if provided
    if (staff_id) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('id', staff_id)
        .eq('transporter_id', transporter.id)
        .single()

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff not found' },
          { status: 404 }
        )
      }
    }

    const { data, error } = await supabase
      .from('expense')
      .insert({
        transporter_id: transporter.id,
        vehicle_id,
        category,
        amount: parseFloat(amount),
        currency,
        date,
        description: description?.trim() || null,
        vendor: vendor?.trim() || null,
        payment_method: payment_method || null,
        receipt_url: receipt_url || null,
        is_recurring: Boolean(is_recurring),
        recurring_frequency: is_recurring ? (recurring_frequency || null) : null,
        service_provider_id: service_provider_id || null,
        staff_id: staff_id || null,
        status: 'pending',
      })
      .select(`
        *,
        vehicle:vehicle_id(id, reg_number),
        service_provider:service_provider_id(id, name),
        staff:staff_id(id, name)
      `)
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

