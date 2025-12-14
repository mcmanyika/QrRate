'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatsCard from '@/components/dashboard/StatsCard'
import { FaTrophy, FaStar, FaComments, FaStore, FaQrcode, FaDownload, FaEdit, FaTrash } from 'react-icons/fa'

export default function EventDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [event, setEvent] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [campaignQRCode, setCampaignQRCode] = useState<any>(null)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [campaignQuestions, setCampaignQuestions] = useState<any[]>([])
  const [showQuestions, setShowQuestions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'business',
    questions: [] as any[],
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
          console.error('Campaign not found or unauthorized')
          router.push('/dashboard/events')
          return
        }

        setEvent(eventData)

        // Initialize edit form with current data
        setEditFormData({
          name: eventData.name || '',
          description: eventData.description || '',
          campaign_type: eventData.campaign_type || 'business',
          questions: [],
        })

        // Fetch campaign questions
        const { data: questionsData } = await supabase
          .from('campaign_question')
          .select('*')
          .eq('campaign_id', eventId)
          .order('order_index', { ascending: true })

        const questions = questionsData || []
        setCampaignQuestions(questions)
        
        // Initialize edit form questions
        setEditFormData(prev => ({
          ...prev,
          questions: questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            is_required: q.is_required,
            options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []),
            min_rating: q.min_rating || 1,
            max_rating: q.max_rating || 5,
          })),
        }))

        // Fetch QR code for this campaign (only one allowed)
        const { data: qrCodeData } = await supabase
          .from('qr_code')
          .select('*')
          .eq('campaign_id', eventId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        setCampaignQRCode(qrCodeData || null)

        // Calculate stats from campaign reviews
        const { data: reviews } = await supabase
          .from('review')
          .select('stars')
          .eq('campaign_id', eventId)
          .eq('is_public', true)

        const totalReviews = reviews?.length || 0
        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.stars || 0), 0) / reviews.length
          : 0

        setStats({
          total_reviews: totalReviews,
          avg_rating: avgRating,
        })
      } catch (error) {
        console.error('Error loading campaign data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      loadEventData()
    }
  }, [eventId, router])

  const addQuestion = () => {
    setEditFormData({
      ...editFormData,
      questions: [
        ...editFormData.questions,
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

  const updateQuestion = (index: number, updates: any) => {
    const newQuestions = [...editFormData.questions]
    newQuestions[index] = { ...newQuestions[index], ...updates }
    setEditFormData({ ...editFormData, questions: newQuestions })
  }

  const removeQuestion = (index: number) => {
    setEditFormData({
      ...editFormData,
      questions: editFormData.questions.filter((_, i) => i !== index),
    })
  }

  async function handleSaveEdit() {
    if (!editFormData.name.trim()) {
      alert('Campaign name is required')
      return
    }

    if (editFormData.questions.length === 0) {
      alert('Please add at least one question or rating criterion')
      return
    }

    // Validate questions
    for (let i = 0; i < editFormData.questions.length; i++) {
      const q = editFormData.questions[i]
      if (!q.question_text.trim()) {
        alert(`Question ${i + 1} must have text`)
        return
      }
      if (q.question_type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        alert(`Question ${i + 1} (Multiple Choice) must have at least 2 options`)
        return
      }
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/campaign/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update campaign')
      }

      const { event: updatedEvent, questions: updatedQuestions } = await response.json()

      setEvent(updatedEvent)
      setCampaignQuestions(updatedQuestions)
      setIsEditing(false)
      
      // Update edit form data with new values
      setEditFormData({
        name: updatedEvent.name || '',
        description: updatedEvent.description || '',
        campaign_type: updatedEvent.campaign_type || 'business',
        questions: updatedQuestions.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []),
          min_rating: q.min_rating || 1,
          max_rating: q.max_rating || 5,
        })),
      })
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert(error instanceof Error ? error.message : 'Failed to update campaign')
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteClick() {
    setShowDeleteModal(true)
  }

  async function handleDeleteConfirm() {
    if (!eventId) return

    setDeleting(true)
    setShowDeleteModal(false)
    
    try {
      const response = await fetch(`/api/campaign/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete campaign')
      }

      // Redirect to campaigns list
      router.push('/dashboard/events')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete campaign')
      setDeleting(false)
    }
  }

  async function handleGenerateQR() {
    if (!eventId) return
    
    // If QR code already exists, don't generate another
    if (campaignQRCode) {
      alert('This campaign already has a QR code. Each campaign can only have one QR code.')
      return
    }
    
    setGeneratingQR(true)
    try {
      const response = await fetch('/api/campaign/qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: eventId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate QR code')
      }

      const { qr_code } = await response.json()

      // Set the single QR code
      setCampaignQRCode(qr_code)
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate QR code')
    } finally {
      setGeneratingQR(false)
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
    return <div>Campaign not found</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/dashboard/events"
          className="text-blue-600 hover:text-blue-800 mb-1 inline-block text-sm"
        >
          ← Back to Campaigns
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.name}</h1>
            {event.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{event.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
            >
              <FaEdit />
              {isEditing ? 'Cancel Edit' : 'Edit Campaign'}
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <FaTrash />
              {deleting ? 'Deleting...' : 'Delete Campaign'}
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Info / Edit Form */}
      {isEditing ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Edit Campaign</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Campaign Type *
              </label>
              <select
                value={editFormData.campaign_type}
                onChange={(e) => setEditFormData({ ...editFormData, campaign_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="product">Product</option>
                <option value="business">Business</option>
                <option value="event">Event</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
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
              
              {editFormData.questions.map((question, index) => (
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
                      onChange={(e) => updateQuestion(index, { question_type: e.target.value })}
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

              {editFormData.questions.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Add at least one question or rating criterion</p>
              )}
            </div>

            <button
              onClick={handleSaveEdit}
              disabled={saving || !editFormData.name.trim() || editFormData.questions.length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Campaign Type</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {event.campaign_type || 'Not set'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatsCard
          title="QR Code"
          value={campaignQRCode ? '1' : '0'}
          icon={<FaQrcode className="w-8 h-8" />}
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
        <StatsCard
          title="Questions"
          value={campaignQuestions.length}
          icon={<FaQrcode className="w-8 h-8" />}
        />
      </div>

      {/* Campaign Questions Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Campaign Questions</h2>
          <button
            onClick={() => setShowQuestions(!showQuestions)}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
          >
            {showQuestions ? 'Hide' : 'View'} Questions
          </button>
        </div>
        {showQuestions && (
          <div>
            {campaignQuestions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No questions added to this campaign yet.</p>
            ) : (
              <div className="space-y-2">
                {campaignQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Q{index + 1}:</span>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{question.question_text}</p>
                          {question.is_required && (
                            <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">Required</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Type: <span className="font-medium capitalize">{question.question_type.replace('_', ' ')}</span></span>
                          {question.question_type === 'rating' && (
                            <span>Range: {question.min_rating} - {question.max_rating}</span>
                          )}
                          {question.question_type === 'multiple_choice' && question.options && (
                            <span>Options: {Array.isArray(question.options) ? question.options.length : 0}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Code Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">QR Code</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Generate a QR code for this campaign. When scanned, customers will see your campaign questions.
            </p>
          </div>
          {!campaignQRCode && (
            <button
              onClick={handleGenerateQR}
              disabled={generatingQR}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
              <FaQrcode />
              {generatingQR ? 'Generating...' : 'Generate QR Code'}
            </button>
          )}
        </div>

        {campaignQRCode ? (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {campaignQRCode.name || 'QR Code'}
                </p>
                {campaignQRCode.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{campaignQRCode.location}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Code: <span className="font-mono">{campaignQRCode.code}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Scans: {campaignQRCode.scan_count || 0}
                </p>
              </div>
              {campaignQRCode.qr_code_svg && (
                <div className="flex justify-center mb-3">
                  <div 
                    className="bg-white p-3 rounded-lg border border-gray-200"
                    dangerouslySetInnerHTML={{ __html: campaignQRCode.qr_code_svg }}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <a
                  href={campaignQRCode.qr_code_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  View
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(campaignQRCode.qr_code_url)
                    alert('QR code URL copied to clipboard!')
                  }}
                  className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Copy URL
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Right-click QR code to save image
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <FaQrcode className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm">No QR code generated yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Click "Generate QR Code" to create a QR code for this campaign
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Delete Campaign
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete "{event?.name}"? This will also delete all associated QR codes, questions, and reviews. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

