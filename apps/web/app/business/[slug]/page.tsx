'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function BusinessProfilePage() {
  const params = useParams()
  const slug = params.slug as string
  const [business, setBusiness] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)

  useEffect(() => {
    async function loadBusiness() {
      try {
        const response = await fetch(`/api/business/${slug}?page=${page}&limit=10`)
        if (!response.ok) {
          throw new Error('Failed to load business')
        }
        const data = await response.json()
        setBusiness(data.business)
        setStats(data.stats)
        setReviews(data.reviews)
        setPagination(data.pagination)
      } catch (error) {
        console.error('Error loading business:', error)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      loadBusiness()
    }
  }, [slug, page])

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

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h1>
          <p className="text-gray-600">This business profile does not exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Business Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {business.logo_url && (
              <div className="flex-shrink-0">
                <Image
                  src={business.logo_url}
                  alt={business.name}
                  width={120}
                  height={120}
                  className="rounded-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold mb-2">{business.name}</h1>
              {business.description && (
                <p className="text-gray-600 mb-4">{business.description}</p>
              )}
              {business.category && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                  {business.category}
                </span>
              )}
            </div>
            {stats && (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">
                    {stats.avg_rating?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={stats.avg_rating >= n ? 'text-yellow-400' : 'text-gray-300'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.total_reviews || 0}</div>
                  <div className="text-sm text-gray-600">Total Reviews</div>
                </div>
              </div>
            )}
          </div>

          {/* Business Info */}
          {(business.address || business.phone || business.email || business.website) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {business.address && (
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <p className="text-gray-600">{business.address}</p>
                    {business.city && business.state && (
                      <p className="text-gray-600">{business.city}, {business.state}</p>
                    )}
                  </div>
                )}
                {business.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-600">{business.phone}</p>
                  </div>
                )}
                {business.email && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-600">{business.email}</p>
                  </div>
                )}
                {business.website && (
                  <div>
                    <span className="font-medium text-gray-700">Website:</span>
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {business.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Reviews</h2>
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
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
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {review.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {review.comment && (
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                  )}

                  {review.photo_urls && review.photo_urls.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {review.photo_urls.map((url: string, i: number) => (
                        <Image
                          key={i}
                          src={url}
                          alt={`Review photo ${i + 1}`}
                          width={100}
                          height={100}
                          className="rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {review.business_response && (
                    <div className="mt-4 pl-4 border-l-2 border-gray-300">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Business Response:</p>
                      <p className="text-sm text-gray-600">{review.business_response}</p>
                      {review.business_response_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(review.business_response_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} of {pagination.total_pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={page === pagination.total_pages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

