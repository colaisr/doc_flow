'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    // Redirect authenticated users to Leads page
    if (!authLoading && isAuthenticated) {
      router.push('/leads')
    }
  }, [authLoading, isAuthenticated, router])

  // Show loading state while redirecting
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Перенаправление...</p>
        </div>
      </div>
    </div>
  )
}
