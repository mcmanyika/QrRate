import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const body = await request.json()
    const { vehicle_id } = body

    if (!vehicle_id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify vehicle belongs to transporter
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicle')
      .select('id, reg_number')
      .eq('id', vehicle_id)
      .eq('transporter_id', transporter.id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Generate QR code URL - this should point to the rating page with vehicle ID
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrCodeUrl = `${baseUrl}/rate/${vehicle_id}`

    // Generate QR code SVG
    const qrCodeSvg = await QRCode.toString(qrCodeUrl, {
      type: 'svg',
      width: 300,
      margin: 2,
    })

    // Update vehicle with QR code
    const { data: updatedVehicle, error: updateError } = await supabase
      .from('vehicle')
      .update({ qr_code_svg: qrCodeSvg })
      .eq('id', vehicle_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      qr_code_svg: qrCodeSvg,
      qr_code_url: qrCodeUrl,
      vehicle: updatedVehicle,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

