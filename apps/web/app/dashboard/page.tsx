'use client'

import { useEffect, useState } from 'react'
import StatsCard from '@/components/dashboard/StatsCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import { FaStore, FaStar, FaComments, FaChartBar } from 'react-icons/fa'
import Link from 'next/link'

interface Stats {
  total_businesses: number
  total_reviews: number
  average_rating: number
  recent_reviews: any[]
  reviews_trend?: Array<{ date: string; average_rating: number }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        // Fetch businesses owned by user
        const { data: businesses } = await supabase
          .from('business')
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_active', true)

        const businessIds = businesses?.map(b => b.id) || []

        if (businessIds.length === 0) {
          setStats({
            total_businesses: 0,
            total_reviews: 0,
            average_rating: 0,
            recent_reviews: [],
          })
          setLoading(false)
          return
        }

        // Fetch reviews
        const { data: reviews } = await supabase
          .from('review')
          .select('stars, created_at')
          .in('business_id', businessIds)
          .eq('is_public', true)

        const totalReviews = reviews?.length || 0
        const averageRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length
          : 0

        // Get recent reviews
        const { data: recentReviews } = await supabase
          .from('review')
          .select('*, business:business_id(name, logo_url)')
          .in('business_id', businessIds)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(5)

        setStats({
          total_businesses: businessIds.length,
          total_reviews: totalReviews,
          average_rating: averageRating,
          recent_reviews: recentReviews || [],
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!stats) {
    return <div>Failed to load dashboard</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <Link
          href="/dashboard/businesses"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Manage Businesses
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Businesses"
          value={stats.total_businesses}
          icon={<FaStore className="w-8 h-8" />}
          href="/dashboard/businesses"
        />
        <StatsCard
          title="Total Reviews"
          value={stats.total_reviews}
          icon={<FaComments className="w-8 h-8" />}
        />
        <StatsCard
          title="Average Rating"
          value={stats.average_rating.toFixed(1)}
          icon={<FaStar className="w-8 h-8" />}
          subtitle="/ 5.0"
        />
      </div>

      {/* Recent Reviews */}
      {stats.recent_reviews && stats.recent_reviews.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Recent Reviews</h2>
          <div className="space-y-4">
            {stats.recent_reviews.map((review: any) => (
              <div
                key={review.id}
                className="border-b dark:border-gray-700 pb-4 last:border-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {review.business?.logo_url && (
                      <img
                        src={review.business.logo_url}
                        alt={review.business.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {review.business?.name || 'Business'}
                    </span>
                  </div>
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
                </div>
                {review.comment && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{review.comment}</p>
                )}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

