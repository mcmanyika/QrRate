'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/LoadingSpinner'
import CampaignComparisonChart from '@/components/dashboard/CampaignComparisonChart'
import TagAnalysisChart from '@/components/dashboard/TagAnalysisChart'
import ResponseRateGauge from '@/components/dashboard/ResponseRateGauge'
import TimeSeriesAreaChart from '@/components/dashboard/TimeSeriesAreaChart'
import RatingBreakdownChart from '@/components/dashboard/RatingBreakdownChart'
import EngagementMetricsChart from '@/components/dashboard/EngagementMetricsChart'
import InsightsPanel from '@/components/dashboard/InsightsPanel'
import { FaDownload, FaFilePdf, FaFileCsv } from 'react-icons/fa'
import jsPDF from 'jspdf'

interface ReportData {
  campaignComparison: Array<{
    campaignId: string
    campaignName: string
    totalReviews: number
    avgRating: number
    responseRate: number
    growthRate: number
  }>
  tagAnalysis: Array<{
    tag: string
    count: number
    percentage: number
  }>
  responseRateMetrics: {
    overall: number
    byCampaign: Array<{ campaignId: string; campaignName: string; rate: number }>
    trend: Array<{ date: string; rate: number }>
  }
  timeSeriesAnalysis: Array<{
    date: string
    reviewCount: number
    avgRating: number
    responseRate: number
  }>
  ratingBreakdown: Array<{
    campaignId: string
    campaignName: string
    ratings: { [key: number]: number }
  }>
  engagementMetrics: {
    avgCommentLength: number
    reviewsWithComments: number
    reviewsWithCommentsPercent: number
    avgTagsPerReview: number
    engagementScore: number
  }
  insights: Array<{
    type: 'highlight' | 'alert' | 'recommendation'
    title: string
    message: string
    priority: 'high' | 'medium' | 'low'
  }>
}

interface Filters {
  campaigns: string[] // Multi-select campaigns
  dateRange: '7d' | '30d' | '90d' | 'custom' | null
  customDateStart: string | null
  customDateEnd: string | null
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<Filters>({
    campaigns: [],
    dateRange: '30d',
    customDateStart: null,
    customDateEnd: null,
  })

  useEffect(() => {
    fetchReports()
  }, [filters])

  async function fetchReports() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch campaigns
      const { data: userCampaigns } = await supabase
        .from('event')
        .select('id, name')
        .eq('organizer_id', user.id)
        .eq('is_active', true)

      const allCampaignIds = userCampaigns?.map(c => c.id) || []
      setCampaigns(userCampaigns || [])

      if (allCampaignIds.length === 0) {
        setReportData({
          campaignComparison: [],
          tagAnalysis: [],
          responseRateMetrics: { overall: 0, byCampaign: [], trend: [] },
          timeSeriesAnalysis: [],
          ratingBreakdown: [],
          engagementMetrics: {
            avgCommentLength: 0,
            reviewsWithComments: 0,
            reviewsWithCommentsPercent: 0,
            avgTagsPerReview: 0,
            engagementScore: 0,
          },
          insights: [],
        })
        setLoading(false)
        return
      }

      // Determine which campaigns to analyze
      const campaignIds = filters.campaigns.length > 0 
        ? filters.campaigns.filter(id => allCampaignIds.includes(id))
        : allCampaignIds

      // Calculate date range
      const now = new Date()
      let startDate: Date
      
      if (filters.dateRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (filters.dateRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else if (filters.dateRange === '90d') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      } else if (filters.dateRange === 'custom' && filters.customDateStart) {
        startDate = new Date(filters.customDateStart)
      } else {
        startDate = new Date(0) // All time
      }

      let endDate: Date | null = null
      if (filters.dateRange === 'custom' && filters.customDateEnd) {
        endDate = new Date(filters.customDateEnd)
        endDate.setHours(23, 59, 59, 999)
      }

      // Fetch reviews
      let reviewQuery = supabase
        .from('review')
        .select('*, campaign:campaign_id(id, name)')
        .in('campaign_id', campaignIds)
        .eq('is_public', true)

      if (filters.dateRange) {
        reviewQuery = reviewQuery.gte('created_at', startDate.toISOString())
        if (endDate) {
          reviewQuery = reviewQuery.lte('created_at', endDate.toISOString())
        }
      }

      const { data: reviews, error: reviewsError } = await reviewQuery
      
      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
        throw reviewsError
      }

      // Fetch previous period for growth calculation
      const previousPeriodStart = new Date(startDate.getTime() - (endDate ? (endDate.getTime() - startDate.getTime()) : 30 * 24 * 60 * 60 * 1000))
      const previousPeriodEnd = startDate

      let previousReviewQuery = supabase
        .from('review')
        .select('id, campaign_id, created_at')
        .in('campaign_id', campaignIds)
        .eq('is_public', true)
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', previousPeriodEnd.toISOString())

      const { data: previousReviews, error: previousReviewsError } = await previousReviewQuery
      
      if (previousReviewsError) {
        console.warn('Error fetching previous reviews:', previousReviewsError)
      }

      // Fetch QR codes for response rate calculation
      let qrCodes: any[] = []
      if (campaignIds.length > 0) {
        const { data: qrData, error: qrError } = await supabase
          .from('qr_code')
          .select('id, campaign_id, created_at')
          .in('campaign_id', campaignIds)
          .eq('is_active', true)
        
        if (qrError) {
          console.warn('Error fetching QR codes:', qrError)
        } else {
          qrCodes = qrData || []
        }
      }

      // Fetch rating answers from campaign questions
      const reviewIds = reviews?.map(r => r.id).filter(Boolean) || []
      let ratingAnswersMap: Record<string, number> = {}

      if (reviewIds.length > 0) {
        const { data: ratingQuestions } = await supabase
          .from('campaign_question')
          .select('id, campaign_id')
          .in('campaign_id', campaignIds)
          .eq('question_type', 'rating')

        if (ratingQuestions && ratingQuestions.length > 0) {
          const { data: ratingAnswers } = await supabase
            .from('campaign_review_answer')
            .select('answer_rating, review_id')
            .in('review_id', reviewIds)
            .in('question_id', ratingQuestions.map(q => q.id))
            .not('answer_rating', 'is', null)

          if (ratingAnswers) {
            ratingAnswers.forEach((answer) => {
              if (answer.answer_rating && answer.review_id && !ratingAnswersMap[answer.review_id]) {
                ratingAnswersMap[answer.review_id] = answer.answer_rating
              }
            })
          }
        }
      }

      // Calculate campaign comparison
      const campaignComparison = campaignIds.map(campaignId => {
        const campaignReviews = reviews?.filter(r => r.campaign_id === campaignId) || []
        const campaignPreviousReviews = previousReviews?.filter(r => r.campaign_id === campaignId) || []
        const campaignQRCodes = qrCodes?.filter(q => q.campaign_id === campaignId) || []

        const totalReviews = campaignReviews.length
        const previousTotal = campaignPreviousReviews.length
        const growthRate = previousTotal > 0 
          ? ((totalReviews - previousTotal) / previousTotal) * 100 
          : totalReviews > 0 ? 100 : 0

        // Calculate average rating
        let avgRating = 0
        const ratings = campaignReviews
          .map(r => r.stars || ratingAnswersMap[r.id] || null)
          .filter((r): r is number => r !== null && r >= 1 && r <= 5)
        
        if (ratings.length > 0) {
          avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        }

        // Calculate response rate (reviews / QR codes)
        const responseRate = campaignQRCodes.length > 0
          ? (totalReviews / campaignQRCodes.length) * 100
          : 0

        const campaign = userCampaigns?.find(c => c.id === campaignId)

        return {
          campaignId,
          campaignName: campaign?.name || 'Unknown',
          totalReviews,
          avgRating,
          responseRate: Math.min(responseRate, 100), // Cap at 100%
          growthRate,
        }
      })

      // Calculate tag analysis
      const tagCounts: Record<string, number> = {}
      reviews?.forEach(review => {
        if (review.tags && Array.isArray(review.tags)) {
          review.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        }
      })

      const totalTaggedReviews = Object.values(tagCounts).reduce((sum, count) => sum + count, 0)
      const tagAnalysis = Object.entries(tagCounts)
        .map(([tag, count]) => ({
          tag,
          count,
          percentage: totalTaggedReviews > 0 ? (count / totalTaggedReviews) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10 tags

      // Calculate response rate metrics
      const totalQRCodes = qrCodes?.length || 0
      const totalReviewsCount = reviews?.length || 0
      const overallResponseRate = totalQRCodes > 0 
        ? (totalReviewsCount / totalQRCodes) * 100 
        : 0

      const responseRateByCampaign = campaignIds.map(campaignId => {
        const campaignReviews = reviews?.filter(r => r.campaign_id === campaignId) || []
        const campaignQRCodes = qrCodes?.filter(q => q.campaign_id === campaignId) || []
        const rate = campaignQRCodes.length > 0
          ? (campaignReviews.length / campaignQRCodes.length) * 100
          : 0
        const campaign = userCampaigns?.find(c => c.id === campaignId)
        return {
          campaignId,
          campaignName: campaign?.name || 'Unknown',
          rate: Math.min(rate, 100),
        }
      })

      // Calculate time series (daily for last 30 days)
      const timeSeriesMap: Record<string, { count: number; totalRating: number; ratingCount: number; qrScans: number }> = {}
      const daysToShow = filters.dateRange === '7d' ? 7 : filters.dateRange === '90d' ? 90 : 30

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split('T')[0]
        timeSeriesMap[dateKey] = { count: 0, totalRating: 0, ratingCount: 0, qrScans: 0 }
      }

      reviews?.forEach(review => {
        if (review.created_at) {
          const dateKey = new Date(review.created_at).toISOString().split('T')[0]
          if (timeSeriesMap[dateKey]) {
            timeSeriesMap[dateKey].count++
            const rating = review.stars || ratingAnswersMap[review.id]
            if (rating && rating >= 1 && rating <= 5) {
              timeSeriesMap[dateKey].totalRating += rating
              timeSeriesMap[dateKey].ratingCount++
            }
          }
        }
      })

      qrCodes?.forEach(qr => {
        if (qr.created_at) {
          const dateKey = new Date(qr.created_at).toISOString().split('T')[0]
          if (timeSeriesMap[dateKey]) {
            timeSeriesMap[dateKey].qrScans++
          }
        }
      })

      const timeSeriesAnalysis = Object.entries(timeSeriesMap)
        .map(([date, data]) => ({
          date,
          reviewCount: data.count,
          avgRating: data.ratingCount > 0 ? data.totalRating / data.ratingCount : 0,
          responseRate: data.qrScans > 0 ? (data.count / data.qrScans) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Calculate rating breakdown by campaign
      const ratingBreakdown = campaignIds.map(campaignId => {
        const campaignReviews = reviews?.filter(r => r.campaign_id === campaignId) || []
        const ratings: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        
        campaignReviews.forEach(review => {
          const rating = review.stars || ratingAnswersMap[review.id]
          if (rating && rating >= 1 && rating <= 5) {
            ratings[rating] = (ratings[rating] || 0) + 1
          }
        })

        const campaign = userCampaigns?.find(c => c.id === campaignId)
        return {
          campaignId,
          campaignName: campaign?.name || 'Unknown',
          ratings,
        }
      })

      // Calculate engagement metrics
      const reviewsWithComments = reviews?.filter(r => r.comment && r.comment.trim().length > 0) || []
      const totalCommentLength = reviewsWithComments.reduce((sum, r) => sum + (r.comment?.length || 0), 0)
      const avgCommentLength = reviewsWithComments.length > 0 ? totalCommentLength / reviewsWithComments.length : 0
      const reviewsWithCommentsPercent = reviews && reviews.length > 0
        ? (reviewsWithComments.length / reviews.length) * 100
        : 0

      const totalTags = reviews?.reduce((sum, r) => sum + (Array.isArray(r.tags) ? r.tags.length : 0), 0) || 0
      const avgTagsPerReview = reviews && reviews.length > 0 ? totalTags / reviews.length : 0

      // Calculate overall average rating for engagement score
      const allRatings = reviews
        ?.map(r => r.stars || ratingAnswersMap[r.id] || null)
        .filter((r): r is number => r !== null && r >= 1 && r <= 5) || []
      const overallAvgRating = allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
        : 0

      // Engagement score: weighted formula
      const commentScore = reviewsWithCommentsPercent * 0.3
      const tagScore = Math.min(avgTagsPerReview * 20, 20) // Max 20 points for tags
      const lengthScore = Math.min(avgCommentLength / 10, 30) // Max 30 points for length
      const ratingScore = overallAvgRating * 4 // Max 20 points for ratings (5 * 4)
      const engagementScore = commentScore + tagScore + lengthScore + ratingScore

      // Generate insights
      const insights: ReportData['insights'] = []

      // Top performing campaign
      if (campaignComparison.length > 0) {
        const topCampaign = campaignComparison.reduce((max, c) => 
          c.avgRating > max.avgRating ? c : max
        )
        if (topCampaign.avgRating >= 4) {
          insights.push({
            type: 'highlight',
            title: 'Top Performing Campaign',
            message: `${topCampaign.campaignName} has the highest average rating of ${topCampaign.avgRating.toFixed(1)} stars`,
            priority: 'high',
          })
        }
      }

      // Low response rate alert
      if (overallResponseRate < 10) {
        insights.push({
          type: 'alert',
          title: 'Low Response Rate',
          message: `Overall response rate is ${overallResponseRate.toFixed(1)}%. Consider promoting your QR codes more actively.`,
          priority: 'high',
        })
      }

      // Growth insights
      campaignComparison.forEach(campaign => {
        if (campaign.growthRate < -20) {
          insights.push({
            type: 'alert',
            title: 'Declining Reviews',
            message: `${campaign.campaignName} has ${Math.abs(campaign.growthRate).toFixed(0)}% fewer reviews than the previous period.`,
            priority: 'medium',
          })
        } else if (campaign.growthRate > 50) {
          insights.push({
            type: 'highlight',
            title: 'Rapid Growth',
            message: `${campaign.campaignName} has ${campaign.growthRate.toFixed(0)}% more reviews than the previous period!`,
            priority: 'medium',
          })
        }
      })

      // Engagement recommendations
      if (reviewsWithCommentsPercent < 30) {
        insights.push({
          type: 'recommendation',
          title: 'Improve Engagement',
          message: 'Only ' + reviewsWithCommentsPercent.toFixed(0) + '% of reviews include comments. Consider asking more specific questions to encourage detailed feedback.',
          priority: 'medium',
        })
      }

      setReportData({
        campaignComparison,
        tagAnalysis,
        responseRateMetrics: {
          overall: Math.min(overallResponseRate, 100),
          byCampaign: responseRateByCampaign,
          trend: timeSeriesAnalysis.map(ts => ({ date: ts.date, rate: ts.responseRate })),
        },
        timeSeriesAnalysis,
        ratingBreakdown,
        engagementMetrics: {
          avgCommentLength,
          reviewsWithComments: reviewsWithComments.length,
          reviewsWithCommentsPercent,
          avgTagsPerReview,
          engagementScore,
        },
        insights,
      })
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      // Set empty report data on error
      setReportData({
        campaignComparison: [],
        tagAnalysis: [],
        responseRateMetrics: { overall: 0, byCampaign: [], trend: [] },
        timeSeriesAnalysis: [],
        ratingBreakdown: [],
        engagementMetrics: {
          avgCommentLength: 0,
          reviewsWithComments: 0,
          reviewsWithCommentsPercent: 0,
          avgTagsPerReview: 0,
          engagementScore: 0,
        },
        insights: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    // TODO: Implement PDF export
    alert('PDF export coming soon')
  }

  const handleExportCSV = async () => {
    // TODO: Implement CSV export
    alert('CSV export coming soon')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!reportData) {
    return <div>Failed to load reports</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs">Comprehensive insights into your campaigns and reviews</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs"
          >
            <FaFilePdf />
            Export PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs"
          >
            <FaFileCsv />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaigns (leave empty for all)
            </label>
            <select
              multiple
              value={filters.campaigns}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                setFilters({ ...filters, campaigns: selected })
              }}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-xs"
              size={3}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value as '7d' | '30d' | '90d' | 'custom'
                setFilters({ ...filters, dateRange: value })
              }}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-xs"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {filters.dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.customDateStart || ''}
                  onChange={(e) => setFilters({ ...filters, customDateStart: e.target.value || null })}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.customDateEnd || ''}
                  onChange={(e) => setFilters({ ...filters, customDateEnd: e.target.value || null })}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-xs"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Insights Panel */}
      {reportData.insights.length > 0 && (
        <div className="mb-3">
          <InsightsPanel insights={reportData.insights} />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Campaign Comparison */}
        {reportData.campaignComparison.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Campaign Comparison</h2>
            <CampaignComparisonChart data={reportData.campaignComparison} />
          </div>
        )}

        {/* Response Rate Gauge */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Response Rate</h2>
          <ResponseRateGauge 
            overall={reportData.responseRateMetrics.overall}
            byCampaign={reportData.responseRateMetrics.byCampaign}
          />
        </div>

        {/* Tag Analysis */}
        {reportData.tagAnalysis.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Top Tags</h2>
            <TagAnalysisChart data={reportData.tagAnalysis} />
          </div>
        )}

        {/* Rating Breakdown */}
        {reportData.ratingBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Rating Breakdown by Campaign</h2>
            <RatingBreakdownChart data={reportData.ratingBreakdown} />
          </div>
        )}

        {/* Time Series */}
        {reportData.timeSeriesAnalysis.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 lg:col-span-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Time Series Analysis</h2>
            <TimeSeriesAreaChart data={reportData.timeSeriesAnalysis} />
          </div>
        )}

        {/* Engagement Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 lg:col-span-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Engagement Metrics</h2>
          <EngagementMetricsChart data={reportData.engagementMetrics} />
        </div>
      </div>
    </div>
  )
}

