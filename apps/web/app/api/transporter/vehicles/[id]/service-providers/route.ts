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
    const vehicleId = params.id

    // Verify vehicle belongs to transporter
    const { data: vehicle } = await supabase
      .from('vehicle')
      .select('id')
      .eq('id', vehicleId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Get service providers assigned to this vehicle
    const { data, error } = await supabase
      .from('vehicle_service_provider')
      .select('service_provider_id, service_provider:service_provider_id(id, name, service_type, phone, email)')
      .eq('vehicle_id', vehicleId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const vehicleId = params.id
    const body = await request.json()
    const { service_provider_id } = body

    if (!service_provider_id) {
      return NextResponse.json(
        { error: 'Service provider ID is required' },
        { status: 400 }
      )
    }

    // Verify vehicle belongs to transporter
    const { data: vehicle } = await supabase
      .from('vehicle')
      .select('id')
      .eq('id', vehicleId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Verify service provider belongs to transporter
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

    // Create assignment
    const { data, error } = await supabase
      .from('vehicle_service_provider')
      .insert({
        vehicle_id: vehicleId,
        service_provider_id: service_provider_id,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const vehicleId = params.id
    const { searchParams } = new URL(request.url)
    const serviceProviderId = searchParams.get('service_provider_id')

    if (!serviceProviderId) {
      return NextResponse.json(
        { error: 'Service provider ID is required' },
        { status: 400 }
      )
    }

    // Verify vehicle belongs to transporter
    const { data: vehicle } = await supabase
      .from('vehicle')
      .select('id')
      .eq('id', vehicleId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Remove assignment
    const { error } = await supabase
      .from('vehicle_service_provider')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('service_provider_id', serviceProviderId)

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

