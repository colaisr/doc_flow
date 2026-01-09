'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import ImpersonationBanner from '@/components/ImpersonationBanner'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/hooks/useAuth'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()
  const { user } = useAuth() // Always call hooks before any conditional returns
  
  // Pages that should not have sidebar/topbar
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/register'
  const isPublicRAGPage = pathname?.startsWith('/rags/public/')
  const isPublicSigningPage = pathname?.startsWith('/public/sign/')
  const isSigningPage = pathname?.includes('/documents/') && pathname?.endsWith('/sign')
  const isTemplateEditor = pathname?.includes('/templates/') && pathname?.includes('/edit')
  const isDocumentEditor = pathname?.includes('/documents/') && pathname?.includes('/edit')

  if (isAuthPage || isPublicRAGPage || isPublicSigningPage || isSigningPage || isTemplateEditor || isDocumentEditor) {
    return <>{children}</>
  }

  const hasBanner = user?.is_impersonated

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 right-0 z-50">
        <ImpersonationBanner />
      </div>
      <Sidebar />
      <TopBar />
      <main className={`transition-all duration-300 bg-white ${
        hasBanner ? 'pt-24' : 'pt-16'
      } ${isCollapsed ? 'lg:mr-20' : 'lg:mr-72'}`}>
        {children}
      </main>
    </div>
  )
}

