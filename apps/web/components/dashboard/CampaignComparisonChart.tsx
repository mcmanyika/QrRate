'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CampaignComparisonData {
  campaignId: string
  campaignName: string
  totalReviews: number
  avgRating: number
  responseRate: number
  growthRate: number
}

interface CampaignComparisonChartProps {
  data: CampaignComparisonData[]
}

export default function CampaignComparisonChart({ data }: CampaignComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No campaign data available
      </div>
    )
  }

  // Prepare chart data - truncate long campaign names
  const chartData = data.map(item => ({
    name: item.campaignName.length > 20 
      ? item.campaignName.substring(0, 20) + '...' 
      : item.campaignName,
    fullName: item.campaignName,
    reviews: item.totalReviews,
    rating: Number(item.avgRating.toFixed(1)),
    responseRate: Number(item.responseRate.toFixed(1)),
    growthRate: Number(item.growthRate.toFixed(1)),
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {data.fullName}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
              <span style={{ color: entry.color }}>{entry.name}:</span>{' '}
              <span className="font-semibold">{entry.value}{entry.dataKey === 'rating' ? '★' : entry.dataKey === 'responseRate' || entry.dataKey === 'growthRate' ? '%' : ''}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 11 }}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '11px' }}
          formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
        />
        <Bar dataKey="reviews" fill="#4b5563" name="Total Reviews" />
        <Bar dataKey="rating" fill="#6b7280" name="Avg Rating" />
        <Bar dataKey="responseRate" fill="#9ca3af" name="Response Rate %" />
      </BarChart>
    </ResponsiveContainer>
  )
}

