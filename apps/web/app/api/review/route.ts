import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { business_id, campaign_id, qr_code_id, stars, tags, comment, photo_urls, device_hash, campaign_answers } = body

    if (!device_hash) {
      return NextResponse.json(
        { error: 'Missing required field: device_hash' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Must have either business_id or campaign_id
    if (!business_id && !campaign_id) {
      return NextResponse.json(
        { error: 'Missing required field: business_id or campaign_id' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Stars are optional if campaign_answers are provided
    if (!stars && (!campaign_answers || campaign_answers.length === 0)) {
      return NextResponse.json(
        { error: 'Either stars or campaign_answers must be provided' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (stars && (stars < 1 || stars > 5)) {
      return NextResponse.json(
        { error: 'Stars must be between 1 and 5' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = await createClient()

    // Verify business exists and is active (if business_id provided)
    if (business_id) {
      const { data: business, error: businessError } = await supabase
        .from('business')
        .select('id, is_active')
        .eq('id', business_id)
        .single()

      if (businessError || !business || !business.is_active) {
        return NextResponse.json(
          { error: 'Business not found or inactive' },
          { status: 404, headers: corsHeaders }
        )
      }
    }

    // Verify campaign exists and is active (if campaign_id provided)
    if (campaign_id) {
      const { data: campaign, error: campaignError } = await supabase
        .from('event')
        .select('id, is_active')
        .eq('id', campaign_id)
        .single()

      if (campaignError || !campaign || !campaign.is_active) {
        return NextResponse.json(
          { error: 'Campaign not found or inactive' },
          { status: 404, headers: corsHeaders }
        )
      }
    }

    // Verify QR code if provided
    if (qr_code_id) {
      const { data: qrCode, error: qrError } = await supabase
        .from('qr_code')
        .select('id, business_id, campaign_id')
        .eq('id', qr_code_id)
        .single()

      if (qrError || !qrCode) {
        return NextResponse.json(
          { error: 'Invalid QR code' },
          { status: 400, headers: corsHeaders }
        )
      }

      // Verify QR code matches provided business_id or campaign_id
      if (business_id && qrCode.business_id !== business_id) {
        return NextResponse.json(
          { error: 'QR code does not match business' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (campaign_id && qrCode.campaign_id !== campaign_id) {
        return NextResponse.json(
          { error: 'QR code does not match campaign' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Insert review (rate limiting is handled by database triggers)
    const { data: review, error: reviewError } = await supabase
      .from('review')
      .insert({
        business_id: business_id || null,
        campaign_id: campaign_id || null,
        qr_code_id: qr_code_id || null,
        stars: stars || null,
        tags: tags && tags.length > 0 ? tags : null,
        comment: comment && comment.trim() ? comment.trim() : null,
        photo_urls: photo_urls && photo_urls.length > 0 ? photo_urls : null,
        device_hash,
      })
      .select()
      .single()

    if (reviewError) {
      // Handle rate limiting errors
      if (reviewError.message?.includes('daily_review_limit_exceeded')) {
        return NextResponse.json(
          { error: reviewError.message },
          { status: 429, headers: corsHeaders }
        )
      }
      if (reviewError.message?.includes('uniq_review_device_business_hour')) {
        return NextResponse.json(
          { error: 'You have already reviewed this business. Please wait an hour before submitting another review.' },
          { status: 429, headers: corsHeaders }
        )
      }
      console.error('Error creating review:', reviewError)
      return NextResponse.json(
        { error: reviewError.message || 'Failed to create review' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Save campaign answers if provided
    if (review && campaign_answers && Array.isArray(campaign_answers) && campaign_answers.length > 0) {
      const answersToInsert = campaign_answers
        .filter((answer: any) => answer.question_id && (answer.answer_text || answer.answer_rating !== undefined || answer.answer_boolean !== undefined))
        .map((answer: any) => ({
          review_id: review.id,
          question_id: answer.question_id,
          answer_text: answer.answer_text || null,
          answer_rating: answer.answer_rating || null,
          answer_boolean: answer.answer_boolean !== undefined ? answer.answer_boolean : null,
        }))

      if (answersToInsert.length > 0) {
        const { error: answersError } = await supabase
          .from('campaign_review_answer')
          .insert(answersToInsert)

        if (answersError) {
          console.error('Error saving campaign answers:', answersError)
          // Don't fail the review if answers fail to save, but log it
        }
      }
    }

    // Update QR code scan count if QR code was provided
    if (qr_code_id) {
      await supabase.rpc('increment', {
        table_name: 'qr_code',
        column_name: 'scan_count',
        row_id: qr_code_id,
      }).catch(() => {
        // Fallback if RPC doesn't exist - just update directly
        supabase
          .from('qr_code')
          .update({ scan_count: supabase.raw('scan_count + 1') })
          .eq('id', qr_code_id)
      })
    }

    return NextResponse.json({
      review,
      message: 'Review submitted successfully',
    }, {
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

