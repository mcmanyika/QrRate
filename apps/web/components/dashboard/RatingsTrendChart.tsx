'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RatingsTrendData {
  date: string
  average_rating: number
}

interface RatingsTrendChartProps {
  data: RatingsTrendData[]
}

export default function RatingsTrendChart({ data }: RatingsTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No rating data available
      </div>
    )
  }

  // Format dates for display (show month/day)
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: item.date,
    rating: Number(item.average_rating.toFixed(1)),
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg" style={{ backgroundColor: 'white' }}>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {new Date(data.fullDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Average Rating: <span className="font-semibold">{data.rating}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 5]}
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280' }}
          label={{ value: 'Rating', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
        />
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
        <Line
          type="monotone"
          dataKey="rating"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
          name="Average Rating"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

