'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DriversPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-600">Redirecting to dashboard...</p>
    </div>
  )
}
