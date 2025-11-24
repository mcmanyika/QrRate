'use client'

import { useEffect, useState } from 'react'
import StatsCard from '@/components/dashboard/StatsCard'

interface Stats {
  total_vehicles: number
  total_ratings: number
  average_rating: number
  total_tips: number
  total_tips_amount_cents: number
  recent_ratings: any[]
  expense_stats?: {
    current_month_total: number
    pending_approvals: number
    top_category: string
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'rating' | 'vehicle' | 'date'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedRating, setSelectedRating] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [vehicleStats, setVehicleStats] = useState<{
    avgStars: number
    numRatings: number
    tagAverages: Record<string, number>
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/transporter/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!stats) {
    return <div>Failed to load dashboard</div>
  }

  const tipsAmount = (stats.total_tips_amount_cents / 100).toFixed(2)

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Vehicles"
          value={stats.total_vehicles}
          icon="🚐"
        />
        <StatsCard
          title="Total Ratings"
          value={stats.total_ratings}
          icon="⭐"
        />
        <StatsCard
          title="Average Rating"
          value={stats.average_rating.toFixed(1)}
          icon="📊"
          subtitle="/ 5.0"
        />
        <StatsCard
          title="Total Tips"
          value={`$${tipsAmount}`}
          icon="💝"
          subtitle={`${stats.total_tips} tips`}
        />
      </div>

      {/* Expense Stats */}
      {stats.expense_stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <StatsCard
            title="Monthly Expenses"
            value={`$${stats.expense_stats.current_month_total.toFixed(2)}`}
            icon="💰"
            subtitle="This month"
          />
          <StatsCard
            title="Pending Approvals"
            value={stats.expense_stats.pending_approvals}
            icon="⏳"
            subtitle="expenses"
          />
          <StatsCard
            title="Top Category"
            value={stats.expense_stats.top_category === 'none' ? 'N/A' : stats.expense_stats.top_category.charAt(0).toUpperCase() + stats.expense_stats.top_category.slice(1).replace('_', ' ')}
            icon="📈"
            subtitle="this month"
          />
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recent Ratings</h2>
        </div>

        {/* Search Field */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vehicle, comment, or tags..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {stats.recent_ratings.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No ratings yet</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  if (sortBy === 'rating') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortBy('rating')
                    setSortOrder('desc')
                  }
                }}
                  className="flex items-center gap-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Rating
                {sortBy === 'rating' && (
                  <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'vehicle') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortBy('vehicle')
                    setSortOrder('asc')
                  }
                }}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                Vehicle
                {sortBy === 'vehicle' && (
                  <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'date') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortBy('date')
                    setSortOrder('desc')
                  }
                }}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                Date
                {sortBy === 'date' && (
                  <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </div>
            {/* Rows */}
            <div className="divide-y divide-gray-200">
              {[...stats.recent_ratings]
                .filter((rating) => {
                  if (!searchQuery.trim()) return true
                  
                  const query = searchQuery.toLowerCase()
                  const vehicleMatch = rating.vehicle?.reg_number.toLowerCase().includes(query)
                  const commentMatch = rating.comment?.toLowerCase().includes(query)
                  const tagsMatch = rating.tags?.some((tag: string) => tag.toLowerCase().includes(query))
                  
                  return vehicleMatch || commentMatch || tagsMatch
                })
                .sort((a, b) => {
                  let comparison = 0
                  if (sortBy === 'rating') {
                    comparison = a.stars - b.stars
                  } else if (sortBy === 'vehicle') {
                    const aReg = a.vehicle?.reg_number || ''
                    const bReg = b.vehicle?.reg_number || ''
                    comparison = aReg.localeCompare(bReg)
                  } else if (sortBy === 'date') {
                    comparison =
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
                  }
                  return sortOrder === 'asc' ? comparison : -comparison
                })
                .slice(0, 2)
                .map((rating) => {
                  const stars = Array.from(
                    { length: 5 },
                    (_, i) => i < rating.stars
                  )
                  return (
                    <div
                      key={rating.id}
                      onClick={async () => {
                        setSelectedRating(rating)
                        // Fetch vehicle stats
                        const vehicleId = (rating as any).vehicle_id || rating.vehicle?.id
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
                      className="grid grid-cols-3 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex">
                        {stars.map((filled, i) => (
                          <span key={i} className="text-yellow-400 text-xl">
                            {filled ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center">
                        {rating.vehicle && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {rating.vehicle.reg_number}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Rating Details Modal */}
      {selectedRating && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setSelectedRating(null)
            setVehicleStats(null)
          }}
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
                  {vehicleStats && (
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
                  )}

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

