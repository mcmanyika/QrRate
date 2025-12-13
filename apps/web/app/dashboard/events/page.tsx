'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Event {
  id: string
  name: string
  slug: string
  description?: string
  start_date?: string
  end_date?: string
  location?: string
  is_active: boolean
  created_at: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadEvents() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Please log in to view events')
          setLoading(false)
          return
        }

        // Fetch events organized by user
        const { data, error: fetchError } = await supabase
          .from('event')
          .select('*')
          .eq('organizer_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        setEvents(data || [])
      } catch (err) {
        console.error('Error loading events:', err)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  async function handleCreateEvent() {
    if (!formData.name.trim()) {
      alert('Event name is required')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Please log in to create events')
        return
      }

      // Generate slug from name
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Check if slug exists
      let finalSlug = slug
      let counter = 1
      while (true) {
        const { data: existing } = await supabase
          .from('event')
          .select('id')
          .eq('slug', finalSlug)
          .single()
        
        if (!existing) break
        finalSlug = `${slug}-${counter}`
        counter++
      }

      const { data, error } = await supabase
        .from('event')
        .insert({
          organizer_id: user.id,
          name: formData.name.trim(),
          slug: finalSlug,
          description: formData.description.trim() || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          location: formData.location.trim() || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setEvents([data, ...events])
      setShowCreateForm(false)
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
      })
    } catch (err) {
      console.error('Error creating event:', err)
      alert('Failed to create event')
    } finally {
      setSubmitting(false)
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Events</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Create Event'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Create New Event</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="Farmers Market 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="Event description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="123 Main St, City, State"
              />
            </div>
            <button
              onClick={handleCreateEvent}
              disabled={submitting || !formData.name.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any events yet.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {event.name}
                </h2>
                {event.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}
                {event.location && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                    📍 {event.location}
                  </p>
                )}
                {event.start_date && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    📅 {new Date(event.start_date).toLocaleDateString()}
                    {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Manage
                  </Link>
                  <Link
                    href={`/event/${event.slug}`}
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

