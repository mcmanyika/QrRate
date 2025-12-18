'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ResponseRateGaugeProps {
  overall: number
  byCampaign: Array<{ campaignId: string; campaignName: string; rate: number }>
}

export default function ResponseRateGauge({ overall, byCampaign }: ResponseRateGaugeProps) {
  // Determine color based on response rate
  const getColor = (rate: number) => {
    if (rate < 10) return '#ef4444' // red
    if (rate < 30) return '#f59e0b' // yellow
    return '#10b981' // green
  }

  const gaugeData = [
    {
      name: 'Response Rate',
      value: Math.min(overall, 100),
      fill: getColor(overall),
    },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Overall Response Rate
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{data.value.toFixed(1)}%</span>
          </p>
          {byCampaign.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">By Campaign:</p>
              {byCampaign.slice(0, 5).map((campaign) => (
                <p key={campaign.campaignId} className="text-xs text-gray-600 dark:text-gray-400">
                  {campaign.campaignName.substring(0, 20)}: {campaign.rate.toFixed(1)}%
                </p>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          data={gaugeData}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            fill={gaugeData[0].fill}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {overall.toFixed(1)}%
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">Response Rate</p>
      </div>
    </div>
  )
}

