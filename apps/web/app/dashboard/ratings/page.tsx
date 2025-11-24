'use client'

import { useEffect, useState } from 'react'
import RatingCard from '@/components/dashboard/RatingCard'
import Pagination from '@/components/dashboard/Pagination'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Rating {
  id: string
  stars: number
  comment?: string | null
  created_at: string
  vehicle_id?: string
  vehicle?: {
    id?: string
    reg_number: string
  } | null
  tags?: string[] | null
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function RatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 4,
    total: 0,
    totalPages: 0,
  })
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [vehicleStats, setVehicleStats] = useState<{
    avgStars: number
    numRatings: number
    tagAverages: Record<string, number>
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    async function fetchRatings() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '4',
        })
        if (selectedVehicle) {
          params.append('vehicle_id', selectedVehicle)
        }
        const response = await fetch(`/api/transporter/ratings?${params}`)
        if (response.ok) {
          const result = await response.json()
          setRatings(result.data || [])
          setPagination(result.pagination || pagination)
        }
      } catch (error) {
        console.error('Failed to fetch ratings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRatings()
  }, [selectedVehicle, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Filter ratings based on search query
  const filteredRatings = ratings.filter((rating) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const vehicleMatch = rating.vehicle?.reg_number.toLowerCase().includes(query)
    const commentMatch = rating.comment?.toLowerCase().includes(query)
    const tagsMatch = rating.tags?.some((tag) => tag.toLowerCase().includes(query))
    
    return vehicleMatch || commentMatch || tagsMatch
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Ratings</h1>
      </div>

      {/* Search Field */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by vehicle, comment, or tags..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      {filteredRatings.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No ratings yet</p>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {filteredRatings.map((rating) => (
              <div
                key={rating.id}
                onClick={async () => {
                  setSelectedRating(rating)
                  // Fetch vehicle stats
                  const vehicleId = rating.vehicle_id || rating.vehicle?.id
                  if (vehicleId) {
                    setLoadingStats(true)
                    try {
                      const response = await fetch(`/api/transporter/vehicles/${vehicleId}/stats`)
                      if (response.ok) {
                        const data = await response.json()
                        setVehicleStats(data)
                      }
                    } catch (error) {
                      console.error('Failed to fetch vehicle stats:', error)
                    } finally {
                      setLoadingStats(false)
                    }
                  }
                }}
                className="cursor-pointer"
              >
                <RatingCard rating={rating} />
              </div>
            ))}
          </div>
          {searchQuery.trim() === '' && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
            />
          )}
        </>
      )}

      {/* Rating Details Modal */}
      {selectedRating && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedRating(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Rating Details
                </h3>
                <button
                  onClick={() => {
                    setSelectedRating(null)
                    setVehicleStats(null)
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Vehicle */}
                  {selectedRating.vehicle && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        Vehicle
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{selectedRating.vehicle.reg_number}</p>
                    </div>
                  )}

                  {/* Vehicle Stats */}
                  {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : vehicleStats ? (
                    <>
                      {/* Overall Rating */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">
                          Overall Rating
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                            {vehicleStats.avgStars.toFixed(1)}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex">
                              {Array.from({ length: 5 }, (_, i) => i < Math.round(vehicleStats.avgStars)).map(
                                (filled, i) => (
                                  <span key={i} className="text-yellow-400 text-xl">
                                    {filled ? '★' : '☆'}
                                  </span>
                                )
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Based on {vehicleStats.numRatings} {vehicleStats.numRatings === 1 ? 'rating' : 'ratings'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Average by Category */}
                      {Object.keys(vehicleStats.tagAverages).length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">
                            Average by Category
                          </label>
                          <div className="space-y-3">
                            {['Cleanliness', 'Driving safety', 'Friendliness', 'Punctuality'].map((tag) => {
                              const avg = vehicleStats.tagAverages[tag]
                              if (!avg) return null
                              return (
                                <div key={tag} className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2 last:border-0">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{tag}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {avg.toFixed(1)}
                                    </span>
                                    <div className="flex">
                                      {Array.from({ length: 5 }, (_, i) => i < Math.round(avg)).map(
                                        (filled, j) => (
                                          <span key={j} className="text-yellow-400 text-sm">
                                            {filled ? '★' : '☆'}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}

                {/* Comment */}
                  {selectedRating.comment && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        Comment
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{selectedRating.comment}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedRating.tags && selectedRating.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        Tags
                      </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedRating.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                    onClick={() => {
                      setSelectedRating(null)
                      setVehicleStats(null)
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

