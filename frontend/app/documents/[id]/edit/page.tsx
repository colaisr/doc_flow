'use client'

import { useAuth } from '@/hooks/useAuth'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UnifiedEditor from '@/components/UnifiedEditor'

export default function DocumentEditPage() {
  const router = useRouter()
  const params = useParams()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  
  const itemId = params?.id ? (params.id as string) : null
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען...</div>
      </div>
    )
  }

  return <UnifiedEditor itemId={itemId} isNew={false} isDocumentEdit={true} />
}
