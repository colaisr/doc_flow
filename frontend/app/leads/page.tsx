'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { getLeads, type Lead, type LeadStage, type ListLeadsParams } from '@/lib/api/leads'
import { getStages } from '@/lib/api/stages'
import { useOrganizationContext } from '@/contexts/OrganizationContext'
import CreateLeadModal from '@/components/CreateLeadModal'

export default function LeadsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const { currentOrganizationId } = useOrganizationContext()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filters
  const [selectedStages, setSelectedStages] = useState<number[]>([])
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch stages on mount
  useEffect(() => {
    async function fetchStages() {
      try {
        const stagesData = await getStages()
        setStages(stagesData)
      } catch (err) {
        console.error('Failed to fetch stages:', err)
      }
    }
    fetchStages()
  }, [])

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!currentOrganizationId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const params: ListLeadsParams = {
        page,
        limit,
      }
      
      if (selectedStages.length > 0) {
        params.stage_id = selectedStages
      }
      if (selectedUsers.length > 0) {
        params.assigned_user_id = selectedUsers
      }
      if (debouncedSearch) {
        params.search = debouncedSearch
      }
      
      const response = await getLeads(params)
      setLeads(response.leads)
      setTotal(response.total)
      setTotalPages(response.total_pages)
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת הלידים')
      console.error('Failed to fetch leads:', err)
    } finally {
      setLoading(false)
    }
  }, [currentOrganizationId, page, limit, selectedStages, selectedUsers, debouncedSearch])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">טוען...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleStageToggle = (stageId: number) => {
    setSelectedStages(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    )
    setPage(1)
  }

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
    setPage(1)
  }

  const clearFilters = () => {
    setSelectedStages([])
    setSelectedUsers([])
    setSearchQuery('')
    setPage(1)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                לידים
              </h1>
              <p className="text-gray-600">
                ניהול לידים ולקוחות פוטנציאליים
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              צור ליד חדש
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                חיפוש
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש לפי שם, אימייל, טלפון..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Stage Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סטטוס
              </label>
              <div className="flex flex-wrap gap-2">
                {stages.map(stage => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageToggle(stage.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStages.includes(stage.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedStages.length > 0 || selectedUsers.length > 0 || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                נקה מסננים
              </button>
            )}
          </div>
        </div>

        {/* Leads List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">טוען לידים...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">לא נמצאו לידים</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {leads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {lead.full_name}
                          </h3>
                          {lead.email && (
                            <span className="text-sm text-gray-600">
                              {lead.email}
                            </span>
                          )}
                          {lead.stage && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {lead.stage.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    עמוד {page} מתוך {totalPages} ({total} לידים)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      קודם
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      הבא
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchLeads()
        }}
      />
    </div>
  )
}
