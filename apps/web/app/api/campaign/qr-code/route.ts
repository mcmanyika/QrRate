import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

// Simple nanoid-like function for generating short codes
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaign_id, name, location } = body

    if (!campaign_id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('event')
      .select('id, name')
      .eq('id', campaign_id)
      .eq('organizer_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if QR code already exists for this campaign
    const { data: existingQRCode } = await supabase
      .from('qr_code')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('is_active', true)
      .maybeSingle()

    if (existingQRCode) {
      return NextResponse.json({
        qr_code: existingQRCode,
        download_url: existingQRCode.qr_code_url,
      })
    }

    // Generate unique short code
    let code: string = ''
    let attempts = 0
    let isUnique = false

    while (!isUnique && attempts < 10) {
      code = generateShortCode()
      const { data: existing } = await supabase
        .from('qr_code')
        .select('id')
        .eq('code', code)
        .single()
      
      if (!existing) {
        isUnique = true
      } else {
        attempts++
      }
    }

    if (!isUnique || !code) {
      return NextResponse.json(
        { error: 'Failed to generate unique code. Please try again.' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrCodeUrl = `${baseUrl}/review/${code}`

    // Generate QR code SVG
    const qrCodeSvg = await QRCode.toString(qrCodeUrl, {
      type: 'svg',
      width: 300,
      margin: 2,
    })

    // Create QR code record
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_code')
      .insert({
        campaign_id: campaign_id,
        business_id: null, // Campaign-only QR code
        code: code!,
        qr_code_svg: qrCodeSvg,
        qr_code_url: qrCodeUrl,
        name: name || null,
        location: location || null,
        is_active: true,
        scan_count: 0,
      })
      .select()
      .single()

    if (qrError) {
      console.error('Error creating QR code:', qrError)
      return NextResponse.json(
        { error: qrError.message || 'Failed to create QR code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      qr_code: qrCode,
      download_url: qrCodeUrl,
    })
  } catch (error) {
    console.error('Error in QR code generation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

