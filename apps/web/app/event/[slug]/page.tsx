'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FaQrcode, FaStar, FaComments, FaArrowRight, FaArrowLeft } from 'react-icons/fa'

export default function EventPublicPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [event, setEvent] = useState<any>(null)
  const [qrCode, setQrCode] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [recentReviews, setRecentReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvent() {
      try {
        const supabase = createClient()
        
        // Fetch campaign by slug
        const { data: eventData, error: eventError } = await supabase
          .from('event')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (eventError || !eventData) {
          console.error('Campaign not found')
          setLoading(false)
          return
        }

        setEvent(eventData)

        // Fetch QR code for this campaign
        const { data: qrCodeData } = await supabase
          .from('qr_code')
          .select('*')
          .eq('campaign_id', eventData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        setQrCode(qrCodeData)

        // Fetch campaign reviews for stats
        const { data: reviews } = await supabase
          .from('review')
          .select('stars, created_at, comment, tags, reviewer_name')
          .eq('campaign_id', eventData.id)
          .eq('is_public', true)

        const totalReviews = reviews?.length || 0
        const reviewsWithStars = reviews?.filter(r => r.stars) || []
        const avgRating = reviewsWithStars.length > 0
          ? reviewsWithStars.reduce((sum, r) => sum + (r.stars || 0), 0) / reviewsWithStars.length
          : 0

        setStats({
          total_reviews: totalReviews,
          avg_rating: avgRating,
        })

        // Fetch recent reviews with full details
        const { data: recentReviewsData } = await supabase
          .from('review')
          .select('*')
          .eq('campaign_id', eventData.id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10)

        setRecentReviews(recentReviewsData || [])
      } catch (error) {
        console.error('Error loading campaign:', error)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      loadEvent()
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h1>
          <p className="text-gray-600">This campaign does not exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  const reviewUrl = qrCode ? `/review/${qrCode.code}` : null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Campaign Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2 text-gray-900">{event.name}</h1>
              {event.description && (
                <p className="text-gray-600 mb-4">{event.description}</p>
              )}
              {event.campaign_type && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                  {event.campaign_type}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Campaign Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaComments className="text-gray-600" />
                  <span className="text-gray-700">Total Reviews</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats?.total_reviews || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaStar className="text-yellow-500" />
                  <span className="text-gray-700">Average Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {stats?.avg_rating ? stats.avg_rating.toFixed(1) : '0.0'}
                  </span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={stats?.avg_rating && stats.avg_rating >= n ? 'text-yellow-400' : 'text-gray-300'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          {qrCode && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Scan to Review</h2>
              <div className="flex flex-col items-center">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div dangerouslySetInnerHTML={{ __html: qrCode.qr_svg || '' }} />
                </div>
                {reviewUrl && (
                  <Link
                    href={reviewUrl}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaQrcode />
                    Leave a Review
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Call to Action */}
          {!qrCode && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Get Started</h2>
              <p className="text-gray-600 mb-4 text-sm">
                QR code not generated yet. Contact the campaign organizer to get the QR code.
              </p>
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Recent Reviews</h2>
            {reviewUrl && (
              <Link
                href={reviewUrl}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm font-medium"
              >
                Leave a Review
                <FaArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          {recentReviews.length === 0 ? (
            <div className="text-center py-12">
              <FaComments className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">No reviews yet.</p>
              {reviewUrl && (
                <Link
                  href={reviewUrl}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Be the first to review
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {review.stars && (
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              className={review.stars >= n ? 'text-yellow-400' : 'text-gray-300'}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                      {review.reviewer_name && (
                        <span className="font-medium text-gray-900">{review.reviewer_name}</span>
                      )}
                      {!review.reviewer_name && (
                        <span className="text-gray-500 text-sm">Anonymous</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 mb-2">{review.comment}</p>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {review.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
