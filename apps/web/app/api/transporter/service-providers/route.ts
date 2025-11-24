import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get('service_type') // Optional filter: 'maintenance', 'fuel_supplier', 'general'

    let query = supabase
      .from('service_provider')
      .select('*')
      .eq('transporter_id', transporter.id)
      .order('name', { ascending: true })

    if (serviceType && (serviceType === 'maintenance' || serviceType === 'fuel_supplier' || serviceType === 'general')) {
      query = query.eq('service_type', serviceType)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Get vehicle counts for each service provider
    const providers = data || []
    const providersWithCounts = await Promise.all(
      providers.map(async (provider: any) => {
        const { count } = await supabase
          .from('vehicle_service_provider')
          .select('id', { count: 'exact', head: true })
          .eq('service_provider_id', provider.id)
        
        return {
          ...provider,
          vehicle_count: count || 0,
        }
      })
    )

    return NextResponse.json(providersWithCounts)
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
    const { name, phone, email, service_type, address, contact_person } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!service_type || (service_type !== 'maintenance' && service_type !== 'fuel_supplier' && service_type !== 'general')) {
      return NextResponse.json(
        { error: 'Service type must be "maintenance", "fuel_supplier", or "general"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_provider')
      .insert({
        transporter_id: transporter.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        service_type: service_type,
        address: address?.trim() || null,
        contact_person: contact_person?.trim() || null,
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

