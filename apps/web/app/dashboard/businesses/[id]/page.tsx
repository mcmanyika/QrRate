'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatsCard from '@/components/dashboard/StatsCard'
import { FaStar, FaQrcode, FaComments, FaChartBar } from 'react-icons/fa'
import Image from 'next/image'
import Link from 'next/link'

export default function BusinessDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const businessId = params.id as string
  const [business, setBusiness] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<any | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)

  useEffect(() => {
    async function loadBusinessData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Fetch business
        const { data: businessData, error: businessError } = await supabase
          .from('business')
          .select('*')
          .eq('id', businessId)
          .eq('owner_id', user.id)
          .single()

        if (businessError || !businessData) {
          console.error('Business not found or unauthorized')
          router.push('/dashboard/businesses')
          return
        }

        setBusiness(businessData)

        // Fetch stats
        const { data: statsData } = await supabase
          .from('business_stats')
          .select('*')
          .eq('business_id', businessId)
          .single()

        setStats(statsData)

        // Fetch recent reviews
        const { data: reviewsData } = await supabase
          .from('review')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10)

        setReviews(reviewsData || [])

        // Fetch QR codes
        const { data: qrCodesData } = await supabase
          .from('qr_code')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })

        setQrCodes(qrCodesData || [])
      } catch (error) {
        console.error('Error loading business data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      loadBusinessData()
    }
  }, [businessId, router])

  async function handleRespondToReview(reviewId: string) {
    if (!responseText.trim()) return

    setSubmittingResponse(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('review')
        .update({
          business_response: responseText.trim(),
          business_response_at: new Date().toISOString(),
        })
        .eq('id', reviewId)

      if (error) throw error

      // Refresh reviews
      const { data: reviewsData } = await supabase
        .from('review')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)

      setReviews(reviewsData || [])
      setSelectedReview(null)
      setResponseText('')
    } catch (error) {
      console.error('Error responding to review:', error)
      alert('Failed to submit response')
    } finally {
      setSubmittingResponse(false)
    }
  }

  async function handleGenerateQR() {
    try {
      const response = await fetch('/api/business/qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      })

      if (response.ok) {
        // Reload QR codes
        const supabase = createClient()
        const { data: qrCodesData } = await supabase
          .from('qr_code')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })

        setQrCodes(qrCodesData || [])
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!business) {
    return <div>Business not found</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/businesses"
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Businesses
        </Link>
        <div className="flex items-center gap-4">
          {business.logo_url && (
            <Image
              src={business.logo_url}
              alt={business.name}
              width={60}
              height={60}
              className="rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{business.name}</h1>
            {business.category && (
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{business.category}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Reviews"
          value={stats?.total_reviews || 0}
          icon={<FaComments className="w-8 h-8" />}
        />
        <StatsCard
          title="Average Rating"
          value={stats?.avg_rating?.toFixed(1) || '0.0'}
          icon={<FaStar className="w-8 h-8" />}
          subtitle="/ 5.0"
        />
        <StatsCard
          title="Reviews (7 days)"
          value={stats?.reviews_last_7d || 0}
          icon={<FaChartBar className="w-8 h-8" />}
        />
        <StatsCard
          title="QR Codes"
          value={qrCodes.length}
          icon={<FaQrcode className="w-8 h-8" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reviews */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Reviews</h2>
            <Link
              href={`/dashboard/businesses/${businessId}/reviews`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All
            </Link>
          </div>
          {reviews.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, 5).map((review) => (
                <div
                  key={review.id}
                  className="border-b dark:border-gray-700 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {!review.business_response && (
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Respond
                      </button>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{review.comment}</p>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {review.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {review.business_response && (
                    <div className="mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Response:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{review.business_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Codes */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">QR Codes</h2>
            <button
              onClick={handleGenerateQR}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Generate QR
            </button>
          </div>
          {qrCodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No QR codes yet</p>
              <button
                onClick={handleGenerateQR}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Your First QR Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {qrCodes.map((qr) => (
                <div
                  key={qr.id}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* QR Code Image in Card - Left Side */}
                    {qr.qr_code_svg && (
                      <div className="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-start">
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm">
                          <div
                            className="w-40 h-40 flex items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: qr.qr_code_svg }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* QR Code Details - Right Side */}
                    <div className="flex-1 w-full min-w-0 space-y-4">
                      {/* Title and Location */}
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">
                          {qr.name || 'QR Code'}
                        </h3>
                        {qr.location && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{qr.location}</p>
                        )}
                      </div>

                      {/* Code and Scans Info */}
                      <div className="flex flex-wrap gap-3">
                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-md">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Code</p>
                          <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{qr.code}</p>
                        </div>
                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-md">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Scans</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{qr.scan_count || 0}</p>
                        </div>
                      </div>

                      {/* Review URL */}
                      {qr.qr_code_url && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Review URL</p>
                          <a
                            href={qr.qr_code_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 break-all bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800"
                          >
                            {qr.qr_code_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Respond to Review</h3>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Write your response..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedReview(null)
                  setResponseText('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespondToReview(selectedReview.id)}
                disabled={!responseText.trim() || submittingResponse}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingResponse ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

