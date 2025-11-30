import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const body = await request.json()
    const { reg_number, country_code = 'KE' } = body

    if (!reg_number) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Use service role client to bypass RLS for checking/updating
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if vehicle exists
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicle')
      .select('id, reg_number, country_code, transporter_id')
      .eq('reg_number', reg_number.trim().toUpperCase())
      .eq('country_code', country_code)
      .maybeSingle()

    if (vehicleError) {
      return NextResponse.json(
        { error: vehicleError.message },
        { status: 400 }
      )
    }

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check if vehicle is already claimed by another transporter
    if (vehicle.transporter_id && vehicle.transporter_id !== transporter.id) {
      return NextResponse.json(
        { error: 'This vehicle is already claimed by another transporter' },
        { status: 403 }
      )
    }

    // Claim the vehicle (update transporter_id) using service role
    const { data: updatedVehicle, error: updateError } = await supabaseAdmin
      .from('vehicle')
      .update({ transporter_id: transporter.id })
      .eq('id', vehicle.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

