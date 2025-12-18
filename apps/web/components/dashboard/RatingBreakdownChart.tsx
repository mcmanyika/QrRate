'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface RatingBreakdownData {
  campaignId: string
  campaignName: string
  ratings: { [key: number]: number }
}

interface RatingBreakdownChartProps {
  data: RatingBreakdownData[]
}

export default function RatingBreakdownChart({ data }: RatingBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No rating breakdown data available
      </div>
    )
  }

  // Transform data for stacked bar chart
  const chartData = data.map(item => {
    const total = Object.values(item.ratings).reduce((sum, count) => sum + count, 0)
    return {
      name: item.campaignName.length > 15 
        ? item.campaignName.substring(0, 15) + '...' 
        : item.campaignName,
      fullName: item.campaignName,
      '5 Stars': item.ratings[5] || 0,
      '4 Stars': item.ratings[4] || 0,
      '3 Stars': item.ratings[3] || 0,
      '2 Stars': item.ratings[2] || 0,
      '1 Star': item.ratings[1] || 0,
      total,
    }
  })

  const colors = {
    '5 Stars': '#4b5563',
    '4 Stars': '#6b7280',
    '3 Stars': '#9ca3af',
    '2 Stars': '#d1d5db',
    '1 Star': '#e5e7eb',
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = data.total
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {data.fullName}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Total: <span className="font-semibold">{total}</span>
          </p>
          {['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'].map((rating) => {
            const count = data[rating]
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
            return count > 0 ? (
              <p key={rating} className="text-xs text-gray-600 dark:text-gray-400">
                {rating}: <span className="font-semibold">{count}</span> ({percentage}%)
              </p>
            ) : null
          })}
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
        <Bar dataKey="5 Stars" stackId="a" fill={colors['5 Stars']} />
        <Bar dataKey="4 Stars" stackId="a" fill={colors['4 Stars']} />
        <Bar dataKey="3 Stars" stackId="a" fill={colors['3 Stars']} />
        <Bar dataKey="2 Stars" stackId="a" fill={colors['2 Stars']} />
        <Bar dataKey="1 Star" stackId="a" fill={colors['1 Star']} />
      </BarChart>
    </ResponsiveContainer>
  )
}

