'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function EventPublicPage() {
  const params = useParams()
  const slug = params.slug as string
  const [event, setEvent] = useState<any>(null)
  const [businesses, setBusinesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvent() {
      try {
        const supabase = createClient()
        
        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from('event')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (eventError || !eventData) {
          console.error('Event not found')
          setLoading(false)
          return
        }

        setEvent(eventData)

        // Fetch businesses in event with stats
        const { data: eventBusinesses } = await supabase
          .from('event_business')
          .select('*, business:business_id(*)')
          .eq('event_id', eventData.id)

        const businessList = eventBusinesses?.map(eb => eb.business).filter(Boolean) || []
        
        // Fetch stats for each business
        const businessIds = businessList.map(b => b.id)
        if (businessIds.length > 0) {
          const { data: statsData } = await supabase
            .from('business_stats')
            .select('*')
            .in('business_id', businessIds)

          // Merge stats with businesses
          const businessesWithStats = businessList.map(business => {
            const stats = statsData?.find(s => s.business_id === business.id)
            return {
              ...business,
              stats: stats || {
                total_reviews: 0,
                avg_rating: 0,
              }
            }
          })

          // Sort by rating and review count
          businessesWithStats.sort((a, b) => {
            if (b.stats.avg_rating !== a.stats.avg_rating) {
              return b.stats.avg_rating - a.stats.avg_rating
            }
            return b.stats.total_reviews - a.stats.total_reviews
          })

          setBusinesses(businessesWithStats)
        } else {
          setBusinesses([])
        }
      } catch (error) {
        console.error('Error loading event:', error)
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600">This event does not exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
          {event.description && (
            <p className="text-gray-600 mb-4">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {event.location && (
              <div>
                <span className="font-medium">📍 Location:</span> {event.location}
              </div>
            )}
            {event.start_date && (
              <div>
                <span className="font-medium">📅 Date:</span>{' '}
                {new Date(event.start_date).toLocaleDateString()}
                {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>

        {/* Top Vendors */}
        {businesses.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Top Rated Vendors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.slice(0, 6).map((business, index) => (
                <Link
                  key={business.id}
                  href={`/business/${business.slug}`}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {index < 3 && (
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    )}
                    {business.logo_url && (
                      <Image
                        src={business.logo_url}
                        alt={business.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{business.name}</p>
                      {business.category && (
                        <p className="text-xs text-gray-500 capitalize">{business.category}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={business.stats.avg_rating >= n ? 'text-yellow-400' : 'text-gray-300'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {business.stats.avg_rating.toFixed(1)} ({business.stats.total_reviews} reviews)
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Vendors */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">All Vendors</h2>
          {businesses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No vendors added to this event yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/business/${business.slug}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {business.logo_url && (
                      <Image
                        src={business.logo_url}
                        alt={business.name}
                        width={50}
                        height={50}
                        className="rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{business.name}</p>
                      {business.category && (
                        <p className="text-xs text-gray-500 capitalize">{business.category}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={business.stats.avg_rating >= n ? 'text-yellow-400' : 'text-gray-300'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {business.stats.avg_rating.toFixed(1)} ({business.stats.total_reviews})
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

