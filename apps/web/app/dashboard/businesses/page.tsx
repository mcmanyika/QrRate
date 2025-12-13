'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/LoadingSpinner'
import Image from 'next/image'

interface Business {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  category?: string
  is_active: boolean
  created_at: string
  business_stats?: {
    total_reviews: number
    avg_rating: number
  }
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Please log in to view your businesses')
          setLoading(false)
          return
        }

        // Fetch businesses owned by user
        const { data, error: fetchError } = await supabase
          .from('business')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })

        // Fetch stats separately (view might have RLS issues)
        if (data && data.length > 0) {
          const businessIds = data.map(b => b.id)
          const { data: statsData } = await supabase
            .from('business_stats')
            .select('*')
            .in('business_id', businessIds)

          // Merge stats with businesses
          const businessesWithStats = data.map(business => ({
            ...business,
            business_stats: statsData?.find(s => s.business_id === business.id) || {
              total_reviews: 0,
              avg_rating: 0,
            }
          }))
          setBusinesses(businessesWithStats)
        } else {
          setBusinesses([])
        }

        if (fetchError) {
          throw fetchError
        }
      } catch (err) {
        console.error('Error loading businesses:', err)
        setError('Failed to load businesses')
      } finally {
        setLoading(false)
      }
    }

    loadBusinesses()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/auth/login"
            className="text-blue-600 hover:underline"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Businesses</h1>
        <Link
          href="/dashboard/businesses/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Business
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any businesses yet.</p>
          <Link
            href="/dashboard/businesses/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Business
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <div
              key={business.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              {business.logo_url && (
                <div className="h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Image
                    src={business.logo_url}
                    alt={business.name}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {business.name}
                </h2>
                {business.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {business.description}
                  </p>
                )}
                {business.category && (
                  <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium capitalize mb-4">
                    {business.category}
                  </span>
                )}
                
                {business.business_stats && (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {business.business_stats.avg_rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {business.business_stats.total_reviews || 0} reviews
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/businesses/${business.id}`}
                    className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Dashboard
                  </Link>
                  <Link
                    href={`/business/${business.slug}`}
                    target="_blank"
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    View Public
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

