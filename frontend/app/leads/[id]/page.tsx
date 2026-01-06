'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getLead, deleteLead, type LeadDetail } from '@/lib/api/leads'
import { LEAD_FIELD_SECTIONS } from '@/lib/leadFields'
import EditableField from '@/components/EditableField'
import StageTimeline from '@/components/StageTimeline'
import StageChangeDropdown from '@/components/StageChangeDropdown'
import UserAssignmentDropdown from '@/components/UserAssignmentDropdown'
import CollapsibleSection from '@/components/CollapsibleSection'

export default function LeadDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const leadId = params?.id ? parseInt(params.id as string, 10) : null

  // Fetch lead data
  useEffect(() => {
    if (!leadId || isNaN(leadId)) {
      setError('מזהה ליד לא תקין')
      setLoading(false)
      return
    }

    async function fetchLead() {
      setLoading(true)
      setError(null)
      try {
        const leadData = await getLead(leadId)
        setLead(leadData)
      } catch (err: any) {
        if (err.message === 'Lead not found' || err.message?.includes('404')) {
          setError('הליד לא נמצא')
        } else {
          setError(err.message || 'שגיאה בטעינת הליד')
        }
        console.error('Failed to fetch lead:', err)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && !authLoading) {
      fetchLead()
    }
  }, [leadId, isAuthenticated, authLoading])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  async function handleDeleteLead() {
    if (!leadId) return

    setDeleting(true)
    setError(null)
    try {
      await deleteLead(leadId)
      // Redirect to leads list after successful deletion
      router.push('/leads')
      // Optionally show a success message - could use a toast notification system
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת הליד')
      setShowDeleteConfirm(false)
      console.error('Failed to delete lead:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading || loading) {
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

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/leads')}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l-7-7 7-7m7 14l-7-7 7-7" />
            </svg>
            חזרה לרשימת לידים
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">שגיאה</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/leads')}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l-7-7 7-7m7 14l-7-7 7-7" />
            </svg>
            חזרה לרשימת לידים
          </button>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600">לא נמצא מידע על הליד</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => router.push('/leads')}
                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="חזרה לרשימת לידים"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l-7-7 7-7m7 14l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {lead.full_name || 'ליד ללא שם'}
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <StageChangeDropdown
                    currentStageId={lead.stage_id}
                    leadId={lead.id}
                    onStageChanged={(newStageId) => {
                      // Refresh lead data
                      getLead(lead.id).then(updatedLead => {
                        setLead(updatedLead)
                      }).catch(err => {
                        console.error('Failed to refresh lead:', err)
                      })
                    }}
                  />
                  <UserAssignmentDropdown
                    currentUserId={lead.assigned_user_id}
                    leadId={lead.id}
                    onUserChanged={(newUserId) => {
                      // Update local state
                      setLead(prev => prev ? { ...prev, assigned_user_id: newUserId } : null)
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                מחק ליד
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(false)} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">מחיקת ליד</h3>
                <p className="text-gray-700 mb-6">
                  האם אתה בטוח שברצונך למחוק את הליד <strong>{lead?.full_name}</strong>?
                  <br />
                  פעולה זו לא ניתנת לביטול.
                </p>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleDeleteLead}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'מוחק...' : 'מחק'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage Timeline */}
        {lead.stage_history && lead.stage_history.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">היסטוריית סטטוס</h2>
            <StageTimeline
              stageHistory={lead.stage_history}
              currentStageId={lead.stage_id}
            />
          </div>
        )}

        {/* Related Documents Section (Placeholder) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">מסמכים</h2>
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-lg">מסמכים יופיעו כאן</p>
            <p className="text-gray-500 text-sm mt-2">פונקציונליות זו תתווסף בשלב 2</p>
          </div>
        </div>

        {/* Field Sections */}
        {LEAD_FIELD_SECTIONS.map((section) => {
          const sectionFields = section.fields.filter(field => {
            // For now, show all fields. Later we can filter based on visibility rules
            return true
          })

          if (sectionFields.length === 0) return null

          // Basic section is always open, others are collapsed by default
          const defaultOpen = section.id === 'basic'

          return (
            <CollapsibleSection
              key={section.id}
              title={section.name}
              defaultOpen={defaultOpen}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {sectionFields.map((field) => (
                  <EditableField
                    key={field.key}
                    field={field}
                    value={(lead as any)[field.key]}
                    leadId={lead.id}
                    onUpdate={(key, newValue) => {
                      // Update local state immediately for better UX
                      setLead(prev => prev ? { ...prev, [key]: newValue } : null)
                    }}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )
        })}


      </div>
    </div>
  )
}

