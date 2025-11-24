import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const body = await request.json()
    const { reg_number, route_id, is_active, qr_code_svg, driver_staff_id, conductor_staff_id } = body

    const supabase = await createClient()

    // Verify vehicle belongs to transporter
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicle')
      .select('id')
      .eq('id', params.id)
      .eq('transporter_id', transporter.id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (reg_number !== undefined) updateData.reg_number = reg_number
    if (route_id !== undefined) updateData.route_id = route_id
    if (is_active !== undefined) updateData.is_active = is_active
    if (qr_code_svg !== undefined) updateData.qr_code_svg = qr_code_svg
    if (driver_staff_id !== undefined) updateData.driver_staff_id = driver_staff_id || null
    if (conductor_staff_id !== undefined) updateData.conductor_staff_id = conductor_staff_id || null

    const { data, error } = await supabase
      .from('vehicle')
      .update(updateData)
      .eq('id', params.id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()

    // Verify vehicle belongs to transporter
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicle')
      .select('id')
      .eq('id', params.id)
      .eq('transporter_id', transporter.id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('vehicle')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

