'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ServiceProvidersPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard (service providers feature removed in universal review app)
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-600">Redirecting to dashboard...</p>
    </div>
  )
}
