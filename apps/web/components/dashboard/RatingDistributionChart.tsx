'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface RatingDistributionData {
  rating: number // 1-5
  count: number
  percentage: number
}

interface RatingDistributionChartProps {
  data: RatingDistributionData[]
}

export default function RatingDistributionChart({ data }: RatingDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No rating data available
      </div>
    )
  }

  // Ensure all ratings 1-5 are present, fill missing with 0
  const ratingMap = new Map(data.map(item => [item.rating, item]))
  const chartData = [1, 2, 3, 4, 5]
    .map(rating => {
      const item = ratingMap.get(rating)
      return item || { rating, count: 0, percentage: 0 }
    })
    .filter(item => item.count > 0) // Only show ratings with counts > 0

  // If no ratings have counts, show empty state
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No rating data available
      </div>
    )
  }

  // Color scheme: dark theme - softer, muted tones
  const getColor = (rating: number) => {
    switch (rating) {
      case 5: return '#4b5563' // lighter dark gray
      case 4: return '#6b7280' // light gray
      case 3: return '#9ca3af' // lighter gray
      case 2: return '#d1d5db' // lightest gray
      case 1: return '#e5e7eb' // very light gray
      default: return '#f3f4f6' // almost white
    }
  }

  const total = chartData.reduce((sum, item) => sum + item.count, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {data.rating} Star{data.rating !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Count: <span className="font-semibold">{data.count}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Percentage: <span className="font-semibold">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  const pieData = chartData.map(item => ({
    name: `${item.rating} Star${item.rating !== 1 ? 's' : ''}`,
    value: item.count,
    rating: item.rating,
    percentage: item.percentage,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          activeShape={false}
        >
          {pieData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={getColor(entry.rating)}
              stroke="none"
              strokeWidth={0}
            />
          ))}
        </Pie>
        <Tooltip 
          content={<CustomTooltip />} 
          contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
          wrapperStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
          itemStyle={{ backgroundColor: 'transparent' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
