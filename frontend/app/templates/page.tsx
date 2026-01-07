'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { fetchTemplates, deleteTemplate, duplicateTemplate, type Template } from '@/lib/api/templates'
import { useOrganizationContext } from '@/contexts/OrganizationContext'
import { Search, Plus, Edit, Copy, Trash2, FileText } from 'lucide-react'

export default function TemplatesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const { currentOrganizationId } = useOrganizationContext()
  
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null)
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch templates
  const loadTemplates = useCallback(async () => {
    if (!currentOrganizationId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchTemplates(currentOrganizationId, debouncedSearch || undefined)
      setTemplates(data)
    } catch (err: any) {
      console.error('Failed to fetch templates:', err)
      const errorMessage = err.message || 'שגיאה בטעינת התבניות'
      setError(`שגיאה: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [currentOrganizationId, debouncedSearch])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  const handleDelete = async (templateId: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התבנית?')) {
      return
    }

    setDeletingId(templateId)
    try {
      await deleteTemplate(templateId)
      await loadTemplates()
    } catch (err: any) {
      alert(err.message || 'שגיאה במחיקת התבנית')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (templateId: number) => {
    setDuplicatingId(templateId)
    try {
      const duplicated = await duplicateTemplate(templateId)
      router.push(`/templates/${duplicated.id}/edit`)
    } catch (err: any) {
      alert(err.message || 'שגיאה בשכפול התבנית')
      setDuplicatingId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="text-red-600 text-center max-w-md">{error}</div>
        <button
          onClick={() => {
            setError(null)
            loadTemplates()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          נסה שוב
        </button>
        <div className="text-sm text-gray-500 text-center max-w-md">
          אם הבעיה נמשכת, ודא שהשרת רץ ושהטבלה document_templates קיימת במסד הנתונים.
          <br />
          הרץ את המיגרציה: <code className="bg-gray-100 px-2 py-1 rounded">alembic upgrade head</code>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">תבניות מסמכים</h1>
        <button
          onClick={() => router.push('/templates/new/edit')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          צור תבנית חדשה
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="חפש תבניות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">אין תבניות עדיין</p>
          <button
            onClick={() => router.push('/templates/new/edit')}
            className="mt-4 text-blue-600 hover:underline"
          >
            צור תבנית ראשונה
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
              {template.description && (
                <p className="text-gray-600 mb-4 line-clamp-2">{template.description}</p>
              )}
              <div className="text-sm text-gray-500 mb-4">
                {template.created_by_user && (
                  <div>נוצר על ידי: {template.created_by_user.full_name || template.created_by_user.email}</div>
                )}
                {template.updated_at && (
                  <div>עודכן לאחרונה: {new Date(template.updated_at).toLocaleDateString('he-IL')}</div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => router.push(`/templates/${template.id}/edit`)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  <Edit className="w-4 h-4" />
                  עריכה
                </button>
                <button
                  onClick={() => handleDuplicate(template.id)}
                  disabled={duplicatingId === template.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" />
                  {duplicatingId === template.id ? 'משכפל...' : 'שכפל'}
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={deletingId === template.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId === template.id ? 'מוחק...' : 'מחק'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

