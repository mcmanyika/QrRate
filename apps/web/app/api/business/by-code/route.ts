import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { 
          status: 400,
          headers: corsHeaders
        }
      )
    }

    const supabase = await createClient()

    // Find QR code and business
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_code')
      .select('*, business:business_id(*, business_settings(*))')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (qrError || !qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      )
    }

    if (!qrCode.business || !qrCode.business.is_active) {
      return NextResponse.json(
        { error: 'Business not found or inactive' },
        { status: 404 }
      )
    }

    // Get business stats
    const { data: stats } = await supabase
      .from('business_stats')
      .select('*')
      .eq('business_id', qrCode.business.id)
      .single()

    return NextResponse.json({
      business: qrCode.business,
      qr_code: {
        id: qrCode.id,
        code: qrCode.code,
        name: qrCode.name,
        location: qrCode.location,
      },
      stats: stats || {
        total_reviews: 0,
        avg_rating: 0,
        reviews_last_7d: 0,
        reviews_last_30d: 0,
      },
      settings: qrCode.business.business_settings || null,
    }, {
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Error fetching business by code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: corsHeaders
      }
    )
  }
}

