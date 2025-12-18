'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TagAnalysisData {
  tag: string
  count: number
  percentage: number
}

interface TagAnalysisChartProps {
  data: TagAnalysisData[]
}

export default function TagAnalysisChart({ data }: TagAnalysisChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No tag data available
      </div>
    )
  }

  const chartData = data.map(item => ({
    tag: item.tag,
    count: item.count,
    percentage: Number(item.percentage.toFixed(1)),
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {data.tag}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Count: <span className="font-semibold">{data.count}</span>
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Percentage: <span className="font-semibold">{data.percentage}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Color gradient based on frequency
  const maxCount = Math.max(...chartData.map(d => d.count))
  const getColor = (count: number) => {
    const intensity = count / maxCount
    if (intensity > 0.7) return '#4b5563'
    if (intensity > 0.4) return '#6b7280'
    return '#9ca3af'
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={chartData} 
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis
          type="number"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="tag"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          width={70}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
        />
        <Bar 
          dataKey="count" 
          fill="#6b7280"
          radius={[0, 4, 4, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.count)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

