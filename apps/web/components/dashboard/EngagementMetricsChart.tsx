'use client'

interface EngagementMetricsData {
  avgCommentLength: number
  reviewsWithComments: number
  reviewsWithCommentsPercent: number
  avgTagsPerReview: number
  engagementScore: number
}

interface EngagementMetricsChartProps {
  data: EngagementMetricsData
}

export default function EngagementMetricsChart({ data }: EngagementMetricsChartProps) {
  // Calculate engagement score percentage (out of 100)
  const engagementScorePercent = Math.min((data.engagementScore / 100) * 100, 100)

  // Determine engagement level
  const getEngagementLevel = (score: number) => {
    if (score >= 70) return { level: 'Excellent', color: 'text-green-600 dark:text-green-400' }
    if (score >= 50) return { level: 'Good', color: 'text-blue-600 dark:text-blue-400' }
    if (score >= 30) return { level: 'Fair', color: 'text-yellow-600 dark:text-yellow-400' }
    return { level: 'Needs Improvement', color: 'text-red-600 dark:text-red-400' }
  }

  const engagementLevel = getEngagementLevel(data.engagementScore)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Engagement Score */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Engagement Score</p>
        <p className={`text-2xl font-bold ${engagementLevel.color}`}>
          {data.engagementScore.toFixed(0)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {engagementLevel.level}
        </p>
      </div>

      {/* Average Comment Length */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Comment Length</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {data.avgCommentLength.toFixed(0)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">characters</p>
      </div>

      {/* Reviews with Comments */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Reviews with Comments</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {data.reviewsWithComments}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {data.reviewsWithCommentsPercent.toFixed(1)}% of total
        </p>
      </div>

      {/* Average Tags per Review */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Tags per Review</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {data.avgTagsPerReview.toFixed(1)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">tags</p>
      </div>

      {/* Engagement Score Bar */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Score Breakdown</p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
          <div
            className={`h-4 rounded-full ${
              engagementScorePercent >= 70
                ? 'bg-green-600'
                : engagementScorePercent >= 50
                ? 'bg-blue-600'
                : engagementScorePercent >= 30
                ? 'bg-yellow-600'
                : 'bg-red-600'
            }`}
            style={{ width: `${engagementScorePercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {engagementScorePercent.toFixed(0)}% of max
        </p>
      </div>
    </div>
  )
}

