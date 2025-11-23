interface RatingCardProps {
  rating: {
    id: string
    stars: number
    comment?: string | null
    created_at: string
    vehicle?: {
      reg_number: string
    } | null
    tags?: string[] | null
  }
}

export default function RatingCard({ rating }: RatingCardProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < rating.stars)

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="flex">
              {stars.map((filled, i) => (
                <span key={i} className="text-yellow-400 text-xl">
                  {filled ? '★' : '☆'}
                </span>
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-500">
              {new Date(rating.created_at).toLocaleDateString()}
            </span>
          </div>
          {rating.vehicle && (
            <p className="text-sm text-gray-600 mb-2">
              Vehicle: {rating.vehicle.reg_number}
            </p>
          )}
          {rating.tags && rating.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {rating.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

