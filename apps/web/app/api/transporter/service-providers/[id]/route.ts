import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const serviceProviderId = params.id

    // Verify service provider belongs to transporter
    const { data: serviceProvider, error } = await supabase
      .from('service_provider')
      .select('*, vehicle_service_provider(vehicle_id, vehicle:vehicle_id(reg_number))')
      .eq('id', serviceProviderId)
      .eq('transporter_id', transporter.id)
      .single()

    if (error || !serviceProvider) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(serviceProvider)
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const serviceProviderId = params.id
    const body = await request.json()
    const { name, phone, email, service_type, address, contact_person, is_active } = body

    // Verify service provider belongs to transporter
    const { data: existing } = await supabase
      .from('service_provider')
      .select('id')
      .eq('id', serviceProviderId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (service_type !== undefined) {
      if (service_type !== 'maintenance' && service_type !== 'fuel_supplier' && service_type !== 'general') {
        return NextResponse.json(
          { error: 'Service type must be "maintenance", "fuel_supplier", or "general"' },
          { status: 400 }
        )
      }
      updateData.service_type = service_type
    }
    if (address !== undefined) updateData.address = address?.trim() || null
    if (contact_person !== undefined) updateData.contact_person = contact_person?.trim() || null
    if (is_active !== undefined) updateData.is_active = is_active
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('service_provider')
      .update(updateData)
      .eq('id', serviceProviderId)
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
    const serviceProviderId = params.id

    // Verify service provider belongs to transporter
    const { data: existing } = await supabase
      .from('service_provider')
      .select('id')
      .eq('id', serviceProviderId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('service_provider')
      .delete()
      .eq('id', serviceProviderId)

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

