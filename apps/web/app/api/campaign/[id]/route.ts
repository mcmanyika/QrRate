import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const body = await request.json()
    const { name, description, campaign_type, questions } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns the campaign
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('event')
      .select('id, organizer_id')
      .eq('id', campaignId)
      .single()

    if (fetchError || !existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (existingCampaign.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update campaign
    const { data: updatedEvent, error: updateError } = await supabase
      .from('event')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        campaign_type: campaign_type,
      })
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update campaign' },
        { status: 400 }
      )
    }

    // Delete all existing questions
    const { error: deleteError } = await supabase
      .from('campaign_question')
      .delete()
      .eq('campaign_id', campaignId)

    if (deleteError) {
      console.error('Error deleting old questions:', deleteError)
      return NextResponse.json(
        { error: 'Failed to update questions' },
        { status: 400 }
      )
    }

    // Insert new questions
    let updatedQuestions: any[] = []
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        campaign_id: campaignId,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        is_required: q.is_required || false,
        order_index: index,
        options: q.options && q.options.length > 0 ? q.options : null,
        min_rating: q.min_rating || 1,
        max_rating: q.max_rating || 5,
      }))

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('campaign_question')
        .insert(questionsToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting questions:', insertError)
        return NextResponse.json(
          { error: 'Failed to save questions' },
          { status: 400 }
        )
      }

      updatedQuestions = insertedQuestions || []
    }

    return NextResponse.json({
      event: updatedEvent,
      questions: updatedQuestions,
      message: 'Campaign updated successfully',
    })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns the campaign
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('event')
      .select('id, organizer_id, name')
      .eq('id', campaignId)
      .single()

    if (fetchError || !existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (existingCampaign.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete campaign (cascade will handle related data)
    // Note: We need to delete in order due to foreign key constraints
    
    // 1. Get all review IDs for this campaign
    const { data: reviews } = await supabase
      .from('review')
      .select('id')
      .eq('campaign_id', campaignId)

    const reviewIds = reviews?.map(r => r.id) || []

    // 2. Delete campaign review answers
    if (reviewIds.length > 0) {
      await supabase
        .from('campaign_review_answer')
        .delete()
        .in('review_id', reviewIds)
    }

    // 3. Delete campaign questions
    await supabase
      .from('campaign_question')
      .delete()
      .eq('campaign_id', campaignId)

    // 4. Delete reviews
    await supabase
      .from('review')
      .delete()
      .eq('campaign_id', campaignId)

    // 5. Delete QR codes
    await supabase
      .from('qr_code')
      .delete()
      .eq('campaign_id', campaignId)

    // 6. Finally delete the campaign
    const { error: deleteError } = await supabase
      .from('event')
      .delete()
      .eq('id', campaignId)

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete campaign' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Campaign deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
