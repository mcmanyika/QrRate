import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    if (!slug) {
      return NextResponse.json(
        { error: 'Business slug is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch business
    const { data: business, error: businessError } = await supabase
      .from('business')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Get business stats
    const { data: stats } = await supabase
      .from('business_stats')
      .select('*')
      .eq('business_id', business.id)
      .single()

    // Get reviews with pagination
    const { data: reviews, error: reviewsError } = await supabase
      .from('review')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
    }

    // Get total review count
    const { count: totalReviews } = await supabase
      .from('review')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('is_public', true)

    return NextResponse.json({
      business,
      stats: stats || {
        total_reviews: 0,
        avg_rating: 0,
        reviews_last_7d: 0,
        reviews_last_30d: 0,
      },
      reviews: reviews || [],
      pagination: {
        page,
        limit,
        total: totalReviews || 0,
        total_pages: Math.ceil((totalReviews || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching business by slug:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

