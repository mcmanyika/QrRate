'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VehiclesPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to businesses page
    router.replace('/dashboard/businesses')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-600">Redirecting to businesses...</p>
    </div>
  )
}
