interface StatsCardProps {
  title: string
  value: string | number
  icon: string
  subtitle?: string
}

export default function StatsCard({ title, value, icon, subtitle }: StatsCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-3xl">{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {subtitle && (
                  <div className="ml-2 text-sm text-gray-500">{subtitle}</div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

