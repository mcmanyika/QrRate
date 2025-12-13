'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatsCard from '@/components/dashboard/StatsCard'
import { FaTrophy, FaStar, FaComments, FaStore } from 'react-icons/fa'

export default function EventDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [event, setEvent] = useState<any>(null)
  const [businesses, setBusinesses] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddBusiness, setShowAddBusiness] = useState(false)
  const [businessSearch, setBusinessSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [addingBusiness, setAddingBusiness] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadEventData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from('event')
          .select('*')
          .eq('id', eventId)
          .eq('organizer_id', user.id)
          .single()

        if (eventError || !eventData) {
          console.error('Event not found or unauthorized')
          router.push('/dashboard/events')
          return
        }

        setEvent(eventData)

        // Fetch businesses in event
        const { data: eventBusinesses } = await supabase
          .from('event_business')
          .select('*, business:business_id(*)')
          .eq('event_id', eventId)

        setBusinesses(eventBusinesses?.map(eb => eb.business).filter(Boolean) || [])

        // Calculate stats
        if (eventBusinesses && eventBusinesses.length > 0) {
          const businessIds = eventBusinesses.map(eb => eb.business_id).filter(Boolean)
          
          const { data: reviews } = await supabase
            .from('review')
            .select('business_id, stars')
            .in('business_id', businessIds)
            .eq('is_public', true)

          const totalReviews = reviews?.length || 0
          const avgRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length
            : 0

          setStats({
            total_businesses: businessIds.length,
            total_reviews: totalReviews,
            avg_rating: avgRating,
          })
        } else {
          setStats({
            total_businesses: 0,
            total_reviews: 0,
            avg_rating: 0,
          })
        }
      } catch (error) {
        console.error('Error loading event data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      loadEventData()
    }
  }, [eventId, router])

  // Debounce search when businessSearch changes
  useEffect(() => {
    if (!showAddBusiness || !businessSearch.trim()) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      handleSearchBusinesses()
    }, 300)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSearch, showAddBusiness, eventId])

  async function handleSearchBusinesses() {
    if (!businessSearch.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    try {
      const supabase = createClient()
      
      // Get IDs of businesses already in this event
      const { data: existingBusinesses } = await supabase
        .from('event_business')
        .select('business_id')
        .eq('event_id', eventId)
      
      const existingIds = existingBusinesses?.map(eb => eb.business_id).filter(Boolean) || []
      
      // Search for businesses
      const { data, error } = await supabase
        .from('business')
        .select('id, name, category, logo_url')
        .ilike('name', `%${businessSearch.trim()}%`)
        .eq('is_active', true)
        .limit(20) // Get more results to filter client-side

      if (error) {
        console.error('Error searching businesses:', error)
        setSearchResults([])
        return
      }

      // Filter out businesses already in event (client-side)
      const filtered = (data || []).filter(b => !existingIds.includes(b.id)).slice(0, 10)
      setSearchResults(filtered)
    } catch (error) {
      console.error('Error searching businesses:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleAddBusiness(businessId: string) {
    setAddingBusiness(businessId)
    setSuccessMessage(null)
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('event_business')
        .insert({
          event_id: eventId,
          business_id: businessId,
        })

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - business already in event
          setAddingBusiness(null)
          alert('This business is already added to the event')
          return
        }
        throw error
      }

      // Find the business name for success message
      const addedBusiness = searchResults.find(b => b.id === businessId)
      const businessName = addedBusiness?.name || 'Vendor'

      // Reload businesses and stats
      const { data: eventBusinesses } = await supabase
        .from('event_business')
        .select('*, business:business_id(*)')
        .eq('event_id', eventId)

      const updatedBusinesses = eventBusinesses?.map(eb => eb.business).filter(Boolean) || []
      setBusinesses(updatedBusinesses)

      // Recalculate stats
      if (updatedBusinesses.length > 0) {
        const businessIds = updatedBusinesses.map(b => b.id).filter(Boolean)
        
        const { data: reviews } = await supabase
          .from('review')
          .select('business_id, stars')
          .in('business_id', businessIds)
          .eq('is_public', true)

        const totalReviews = reviews?.length || 0
        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length
          : 0

        setStats({
          total_businesses: businessIds.length,
          total_reviews: totalReviews,
          avg_rating: avgRating,
        })
      } else {
        setStats({
          total_businesses: 0,
          total_reviews: 0,
          avg_rating: 0,
        })
      }

      // Show success message
      setSuccessMessage(`${businessName} has been added to the event!`)
      setAddingBusiness(null)
      
      // Clear search after a short delay
      setTimeout(() => {
        setShowAddBusiness(false)
        setBusinessSearch('')
        setSearchResults([])
        setSuccessMessage(null)
      }, 2000)
    } catch (error) {
      console.error('Error adding business:', error)
      setAddingBusiness(null)
      alert(error instanceof Error ? error.message : 'Failed to add business to event')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!event) {
    return <div>Event not found</div>
  }

  // Sort businesses by review count and rating
  const sortedBusinesses = [...businesses].sort((a, b) => {
    // This would need actual stats from business_stats view
    return 0
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/events"
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Events
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{event.name}</h1>
        {event.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">{event.description}</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Vendors"
          value={stats?.total_businesses || 0}
          icon={<FaStore className="w-8 h-8" />}
        />
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
      </div>

      {/* Add Business Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vendors</h2>
          <button
            onClick={() => setShowAddBusiness(!showAddBusiness)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {showAddBusiness ? 'Cancel' : 'Add Vendor'}
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">{successMessage}</p>
          </div>
        )}

        {showAddBusiness && (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={businessSearch}
                onChange={(e) => setBusinessSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchBusinesses()
                  }
                }}
                placeholder="Search businesses by name..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearchBusinesses}
                disabled={searching || !businessSearch.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searching && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Searching...</p>
            )}
            {!searching && businessSearch.trim() && searchResults.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No businesses found. Try a different search term.</p>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((business) => (
                  <div
                    key={business.id}
                    className={`p-3 border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      addingBusiness === business.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                    }`}
                    onClick={() => {
                      if (addingBusiness !== business.id) {
                        handleAddBusiness(business.id)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt={business.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <FaStore className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{business.name}</p>
                        {business.category && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{business.category}</p>
                        )}
                      </div>
                      {addingBusiness === business.id ? (
                        <span className="text-blue-600 dark:text-blue-400 text-sm">Adding...</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 text-sm">Click to Add →</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Business List */}
        {businesses.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No vendors added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedBusinesses.map((business) => (
              <Link
                key={business.id}
                href={`/dashboard/businesses/${business.id}`}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {business.logo_url && (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{business.name}</p>
                    {business.category && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{business.category}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

