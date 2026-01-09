'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getLead, deleteLead, type LeadDetail } from '@/lib/api/leads'
import { listDocuments, type Document } from '@/lib/api/documents'
import { LEAD_FIELD_SECTIONS } from '@/lib/leadFields'
import EditableField from '@/components/EditableField'
import StageTimeline from '@/components/StageTimeline'
import StageChangeDropdown from '@/components/StageChangeDropdown'
import UserAssignmentDropdown from '@/components/UserAssignmentDropdown'
import CollapsibleSection from '@/components/CollapsibleSection'
import { FileText, Eye, Plus, Copy, ExternalLink, Send } from 'lucide-react'
import CreateDocumentModal from '@/components/CreateDocumentModal'
import { createSigningLink } from '@/lib/api/documents'

export default function LeadDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showCreateDocumentModal, setShowCreateDocumentModal] = useState(false)
  const [documentsTab, setDocumentsTab] = useState<'contracts' | 'signed'>('contracts')
  const [creatingLinks, setCreatingLinks] = useState<Record<number, boolean>>({})
  const [copiedUrls, setCopiedUrls] = useState<Record<number, boolean>>({})

  const leadId = params?.id ? parseInt(params.id as string, 10) : null

  // Check if we should show the create document modal
  useEffect(() => {
    const action = searchParams?.get('action')
    if (action === 'prepare-document' && leadId) {
      setShowCreateDocumentModal(true)
      // Clean up the URL
      router.replace(`/leads/${leadId}`)
    }
  }, [searchParams, leadId, router])

  // Fetch lead data
  useEffect(() => {
    if (leadId === null || isNaN(leadId)) {
      setError('מזהה ליד לא תקין')
      setLoading(false)
      return
    }

    // Capture validated ID to help TypeScript
    const validatedId: number = leadId

    async function fetchLead() {
      setLoading(true)
      setError(null)
      try {
        const leadData = await getLead(validatedId)
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

  // Fetch documents for this lead
  useEffect(() => {
    if (leadId === null || isNaN(leadId)) return

    // Capture validated ID to help TypeScript
    const validatedId: number = leadId

    async function fetchDocuments() {
      setLoadingDocuments(true)
      try {
        const response = await listDocuments({ lead_id: validatedId })
        setDocuments(response.items)
      } catch (err: any) {
        console.error('Failed to fetch documents:', err)
      } finally {
        setLoadingDocuments(false)
      }
    }

    if (isAuthenticated && !authLoading && leadId) {
      fetchDocuments()
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

        {/* Contracts and Documents Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">חוזים ומסמכים</h2>
            <button
              onClick={() => setShowCreateDocumentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              צור חוזה חדש
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6" dir="rtl">
            <nav className="flex gap-2">
              <button
                onClick={() => setDocumentsTab('contracts')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  documentsTab === 'contracts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                חוזים לחתימה
              </button>
              <button
                onClick={() => setDocumentsTab('signed')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  documentsTab === 'signed'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                מסמכים חתומים
              </button>
            </nav>
          </div>

          {loadingDocuments ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Contracts to Sign Tab */}
              {documentsTab === 'contracts' && (() => {
                const contractsToSign = documents.filter(doc => doc.status === 'draft' || doc.status === 'ready' || doc.status === 'sent')
                return contractsToSign.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">אין חוזים לחתימה</p>
                    <p className="text-gray-500 text-sm mt-2">צור חוזה חדש מהתבנית</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contractsToSign.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <FileText className="w-8 h-8 text-gray-400" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-gray-900">{doc.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                doc.contract_type === 'buyer' ? 'bg-blue-100 text-blue-800' :
                                doc.contract_type === 'seller' ? 'bg-purple-100 text-purple-800' :
                                doc.contract_type === 'lawyer' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.contract_type === 'buyer' ? 'לקוח' :
                                 doc.contract_type === 'seller' ? 'מוכר' :
                                 doc.contract_type === 'lawyer' ? 'עורך דין' : 'לא מוגדר'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span>{doc.template?.name || 'תבנית'}</span>
                              <span>•</span>
                              <span>{new Date(doc.created_at).toLocaleDateString('he-IL')}</span>
                              <span>•</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                doc.status === 'ready' ? 'bg-green-100 text-green-800' :
                                doc.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.status === 'ready' ? 'מוכן לשליחה' :
                                 doc.status === 'sent' ? 'נשלח' :
                                 doc.status === 'draft' ? 'טיוטה' : doc.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Signing Link Section - for ready/sent contracts */}
                          {(doc.status === 'ready' || doc.status === 'sent') && (
                            <div className="flex items-center gap-2 mr-4">
                              {doc.signing_url ? (
                                <>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(doc.signing_url!)
                                      setCopiedUrls(prev => ({ ...prev, [doc.id]: true }))
                                      setTimeout(() => {
                                        setCopiedUrls(prev => {
                                          const newState = { ...prev }
                                          delete newState[doc.id]
                                          return newState
                                        })
                                      }, 2000)
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                                    title="העתק קישור חתימה"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    {copiedUrls[doc.id] ? 'הועתק!' : 'העתק קישור'}
                                  </button>
                                  <a
                                    href={doc.signing_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                                    title="פתח קישור חתימה"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    פתח
                                  </a>
                                </>
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (!leadId) return
                                    
                                    setCreatingLinks(prev => ({ ...prev, [doc.id]: true }))
                                    try {
                                      const response = await createSigningLink(doc.id, {
                                        intended_signer_email: null,
                                        expires_in_days: null,
                                      })
                                      
                                      // Refresh documents to get updated data from server
                                      const updatedResponse = await listDocuments({ lead_id: leadId })
                                      setDocuments(updatedResponse.items)
                                      
                                      // Copy to clipboard automatically
                                      navigator.clipboard.writeText(response.signing_url)
                                      setCopiedUrls(prev => ({ ...prev, [doc.id]: true }))
                                      setTimeout(() => {
                                        setCopiedUrls(prev => {
                                          const newState = { ...prev }
                                          delete newState[doc.id]
                                          return newState
                                        })
                                      }, 2000)
                                    } catch (err: any) {
                                      console.error('Failed to create signing link:', err)
                                      alert(err.message || 'שגיאה ביצירת קישור חתימה')
                                    } finally {
                                      setCreatingLinks(prev => {
                                        const newState = { ...prev }
                                        delete newState[doc.id]
                                        return newState
                                      })
                                    }
                                  }}
                                  disabled={creatingLinks[doc.id]}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="צור קישור חתימה"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {creatingLinks[doc.id] ? 'יוצר...' : 'צור קישור'}
                                </button>
                              )}
                            </div>
                          )}
                          
                          <button
                            onClick={() => router.push(`/documents/${doc.id}/edit`)}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            ערוך
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Signed Documents Tab */}
              {documentsTab === 'signed' && (() => {
                const signedDocuments = documents.filter(doc => doc.status === 'signed')
                return signedDocuments.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">אין מסמכים חתומים</p>
                    <p className="text-gray-500 text-sm mt-2">מסמכים חתומים יופיעו כאן</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {signedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <FileText className="w-8 h-8 text-green-500" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-gray-900">{doc.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                doc.contract_type === 'buyer' ? 'bg-blue-100 text-blue-800' :
                                doc.contract_type === 'seller' ? 'bg-purple-100 text-purple-800' :
                                doc.contract_type === 'lawyer' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.contract_type === 'buyer' ? 'לקוח' :
                                 doc.contract_type === 'seller' ? 'מוכר' :
                                 doc.contract_type === 'lawyer' ? 'עורך דין' : 'לא מוגדר'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span>{doc.template?.name || 'תבנית'}</span>
                              <span>•</span>
                              <span>נחתם ב: {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString('he-IL') : new Date(doc.updated_at || doc.created_at).toLocaleDateString('he-IL')}</span>
                              <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                חתום
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/documents/${doc.id}/edit`)}
                          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          ערוך
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </>
          )}
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

      {/* Create Document Modal */}
      {leadId && (
        <CreateDocumentModal
          isOpen={showCreateDocumentModal}
          onClose={() => setShowCreateDocumentModal(false)}
          leadId={leadId}
          onDocumentCreated={(documentId) => {
            // Refresh documents list
            if (leadId) {
              listDocuments({ lead_id: leadId })
                .then((response) => setDocuments(response.items))
                .catch(console.error)
            }
            // Redirect to document edit page
            router.push(`/documents/${documentId}/edit`)
          }}
        />
      )}
    </div>
  )
}

