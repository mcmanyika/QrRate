import Link from 'next/link'
import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  subtitle?: string
  href?: string
}

export default function StatsCard({ title, value, icon, subtitle, href }: StatsCardProps) {
  const cardContent = (
    <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg ${href ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-gray-600 dark:text-gray-400">
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
                {subtitle && (
                  <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

