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
  campaign_type?: string
  is_active: boolean
  created_at: string
}

interface CampaignQuestion {
  question_text: string
  question_type: 'rating' | 'text' | 'multiple_choice' | 'yes_no'
  is_required: boolean
  options?: string[]
  min_rating?: number
  max_rating?: number
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'business',
    start_date: '',
    end_date: '',
    location: '',
    questions: [] as CampaignQuestion[],
  })
  const [submitting, setSubmitting] = useState(false)

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          question_text: '',
          question_type: 'rating',
          is_required: false,
          min_rating: 1,
          max_rating: 5,
        },
      ],
    })
  }

  const updateQuestion = (index: number, updates: Partial<CampaignQuestion>) => {
    const newQuestions = [...formData.questions]
    newQuestions[index] = { ...newQuestions[index], ...updates }
    setFormData({ ...formData, questions: newQuestions })
  }

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    })
  }

  useEffect(() => {
    async function loadEvents() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Please log in to view campaigns')
          setLoading(false)
          return
        }

        // Fetch campaigns organized by user
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
        setError('Failed to load campaigns')
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  async function handleCreateEvent() {
    if (!formData.name.trim()) {
      alert('Campaign name is required')
      return
    }

    if (formData.questions.length === 0) {
      alert('Please add at least one question or rating criterion')
      return
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i]
      if (!q.question_text.trim()) {
        alert(`Question ${i + 1} must have text`)
        return
      }
      if (q.question_type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        alert(`Question ${i + 1} (Multiple Choice) must have at least 2 options`)
        return
      }
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Please log in to create campaigns')
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

      // Create campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('event')
        .insert({
          organizer_id: user.id,
          name: formData.name.trim(),
          slug: finalSlug,
          description: formData.description.trim() || null,
          campaign_type: formData.campaign_type,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          location: formData.location.trim() || null,
          is_active: true,
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Create questions
      if (formData.questions.length > 0) {
        const questionsToInsert = formData.questions.map((q, index) => ({
          campaign_id: campaignData.id,
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          is_required: q.is_required,
          order_index: index,
          options: q.options && q.options.length > 0 ? q.options : null,
          min_rating: q.min_rating || 1,
          max_rating: q.max_rating || 5,
        }))

        const { error: questionsError } = await supabase
          .from('campaign_question')
          .insert(questionsToInsert)

        if (questionsError) throw questionsError
      }

      setEvents([campaignData, ...events])
      setShowCreateForm(false)
      setFormData({
        name: '',
        description: '',
        campaign_type: 'business',
        start_date: '',
        end_date: '',
        location: '',
        questions: [],
      })
    } catch (err) {
      console.error('Error creating campaign:', err)
      alert('Failed to create campaign')
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Campaigns</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          {showCreateForm ? 'Cancel' : 'Create Campaign'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Create New Campaign</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                placeholder="Farmers Market 2024"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Campaign Type *
              </label>
              <select
                value={formData.campaign_type}
                onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
              >
                <option value="product">Product</option>
                <option value="business">Business</option>
                <option value="event">Event</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                placeholder="Campaign description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                placeholder="123 Main St, City, State"
              />
            </div>

            {/* Questions Builder */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Questions / Rating Criteria *
                </label>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  + Add Question
                </button>
              </div>
              
              {formData.questions.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Add at least one question or rating criterion</p>
              )}

              {formData.questions.map((question, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Question {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, { question_text: e.target.value })}
                      placeholder="Enter question or rating criterion"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                    />
                    
                    <select
                      value={question.question_type}
                      onChange={(e) => updateQuestion(index, { question_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="rating">Star Rating</option>
                      <option value="text">Text Response</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="yes_no">Yes/No</option>
                    </select>

                    {question.question_type === 'multiple_choice' && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Options (one per line)
                        </label>
                        <textarea
                          value={question.options?.join('\n') || ''}
                          onChange={(e) => updateQuestion(index, { 
                            options: e.target.value.split('\n').filter(o => o.trim()) 
                          })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}

                    {question.question_type === 'rating' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Min Rating
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={question.min_rating || 1}
                            onChange={(e) => updateQuestion(index, { min_rating: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Max Rating
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={question.max_rating || 5}
                            onChange={(e) => updateQuestion(index, { max_rating: parseInt(e.target.value) || 5 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    )}

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={question.is_required}
                        onChange={(e) => updateQuestion(index, { is_required: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleCreateEvent}
              disabled={submitting || !formData.name.trim() || formData.questions.length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any campaigns yet.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow transition-shadow"
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

