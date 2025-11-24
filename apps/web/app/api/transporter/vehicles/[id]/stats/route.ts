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
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicle')
      .select('id')
      .eq('id', vehicleId)
      .eq('transporter_id', transporter.id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Fetch all ratings for this vehicle
    const { data: ratings, error: ratingsError } = await supabase
      .from('rating')
      .select('stars, tag_ratings')
      .eq('vehicle_id', vehicleId)

    if (ratingsError) {
      return NextResponse.json(
        { error: ratingsError.message },
        { status: 400 }
      )
    }

    const allRatings = ratings || []
    const numRatings = allRatings.length

    // Calculate overall average rating
    const avgStars = numRatings > 0
      ? allRatings.reduce((sum, r) => sum + r.stars, 0) / numRatings
      : 0

    // Calculate tag averages
    const tagAverages: Record<string, number> = {}
    const tagCounts: Record<string, number> = {}

    allRatings.forEach((rating) => {
      if (rating.tag_ratings && typeof rating.tag_ratings === 'object') {
        Object.entries(rating.tag_ratings).forEach(([tag, stars]) => {
          if (typeof stars === 'number' && stars > 0) {
            tagAverages[tag] = (tagAverages[tag] || 0) + stars
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          }
        })
      }
    })

    // Calculate final averages
    Object.keys(tagAverages).forEach((tag) => {
      if (tagCounts[tag] > 0) {
        tagAverages[tag] = tagAverages[tag] / tagCounts[tag]
      }
    })

    return NextResponse.json({
      avgStars: Math.round(avgStars * 10) / 10,
      numRatings,
      tagAverages,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

