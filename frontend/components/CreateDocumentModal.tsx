'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import { fetchTemplates, type Template } from '@/lib/api/templates'
import { createDocument, type Document } from '@/lib/api/documents'
import { useOrganizationContext } from '@/contexts/OrganizationContext'

interface CreateDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: number
  existingDocuments?: Document[] // Documents that already exist for this lead
  onDocumentCreated: (documentId: number) => void
}

export default function CreateDocumentModal({
  isOpen,
  onClose,
  leadId,
  existingDocuments = [],
  onDocumentCreated,
}: CreateDocumentModalProps) {
  const { currentOrganizationId } = useOrganizationContext()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [contractType, setContractType] = useState<'buyer' | 'seller' | 'lawyer' | null>(null)

  // Determine which contract types already exist
  const existingContractTypes = new Set(
    existingDocuments
      .filter(doc => doc.contract_type)
      .map(doc => doc.contract_type!)
  )
  
  const isBuyerTaken = existingContractTypes.has('buyer')
  const isSellerTaken = existingContractTypes.has('seller')
  const isLawyerTaken = existingContractTypes.has('lawyer')

  // Reset contract type if it becomes invalid (shouldn't happen, but safety check)
  useEffect(() => {
    if (contractType && existingContractTypes.has(contractType)) {
      setContractType(null)
    }
  }, [contractType, existingContractTypes])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setContractType(null)
      setSelectedTemplateId(null)
      setError(null)
    }
  }, [isOpen])

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen && currentOrganizationId) {
      setLoading(true)
      setError(null)
      fetchTemplates(currentOrganizationId)
        .then((data) => {
          setTemplates(data)
        })
        .catch((err) => {
          setError(err.message || 'שגיאה בטעינת התבניות')
          console.error('Failed to fetch templates:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, currentOrganizationId])

  const handleCreateDocument = async () => {
    if (!selectedTemplateId) {
      setError('נא לבחור תבנית')
      return
    }

    if (!contractType) {
      setError('נא לבחור סוג חוזה')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const document = await createDocument({
        template_id: selectedTemplateId,
        lead_id: leadId,
        contract_type: contractType,
      })
      
      onDocumentCreated(document.id)
      onClose()
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת המסמך')
      console.error('Failed to create document:', err)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">צור מסמך חדש</h2>
            <button
              onClick={onClose}
              disabled={creating}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="mr-3 text-gray-600">טוען תבניות...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">אין תבניות זמינות</p>
                <p className="text-gray-500 text-sm">צור תבנית חדשה לפני יצירת מסמך</p>
              </div>
            ) : isBuyerTaken && isSellerTaken && isLawyerTaken ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">כל סוגי החוזים כבר נוצרו</p>
                <p className="text-gray-500 text-sm">לא ניתן ליצור חוזה נוסף עבור ליד זה</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Contract Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    סוג חוזה *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isBuyerTaken) {
                          setContractType('buyer')
                          setError(null)
                        }
                      }}
                      disabled={creating || isBuyerTaken}
                      title={isBuyerTaken ? 'חוזה לקוח כבר קיים עבור ליד זה' : undefined}
                      className={`p-4 border-2 rounded-lg text-center transition-all relative ${
                        contractType === 'buyer'
                          ? 'border-blue-600 bg-blue-50'
                          : isBuyerTaken
                          ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className={`font-semibold mb-1 ${isBuyerTaken ? 'text-gray-500' : 'text-gray-900'}`}>
                        חוזה לקוח
                      </div>
                      <div className={`text-xs ${isBuyerTaken ? 'text-gray-400' : 'text-gray-500'}`}>
                        Buyer Contract
                      </div>
                      {isBuyerTaken && (
                        <div className="absolute top-2 left-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSellerTaken) {
                          setContractType('seller')
                          setError(null)
                        }
                      }}
                      disabled={creating || isSellerTaken}
                      title={isSellerTaken ? 'חוזה מוכר כבר קיים עבור ליד זה' : undefined}
                      className={`p-4 border-2 rounded-lg text-center transition-all relative ${
                        contractType === 'seller'
                          ? 'border-blue-600 bg-blue-50'
                          : isSellerTaken
                          ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className={`font-semibold mb-1 ${isSellerTaken ? 'text-gray-500' : 'text-gray-900'}`}>
                        חוזה מוכר
                      </div>
                      <div className={`text-xs ${isSellerTaken ? 'text-gray-400' : 'text-gray-500'}`}>
                        Seller Contract
                      </div>
                      {isSellerTaken && (
                        <div className="absolute top-2 left-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLawyerTaken) {
                          setContractType('lawyer')
                          setError(null)
                        }
                      }}
                      disabled={creating || isLawyerTaken}
                      title={isLawyerTaken ? 'חוזה עורך דין כבר קיים עבור ליד זה' : undefined}
                      className={`p-4 border-2 rounded-lg text-center transition-all relative ${
                        contractType === 'lawyer'
                          ? 'border-blue-600 bg-blue-50'
                          : isLawyerTaken
                          ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className={`font-semibold mb-1 ${isLawyerTaken ? 'text-gray-500' : 'text-gray-900'}`}>
                        חוזה עורך דין
                      </div>
                      <div className={`text-xs ${isLawyerTaken ? 'text-gray-400' : 'text-gray-500'}`}>
                        Lawyer Contract
                      </div>
                      {isLawyerTaken && (
                        <div className="absolute top-2 left-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                  {(isBuyerTaken || isSellerTaken || isLawyerTaken) && (
                    <p className="mt-2 text-sm text-gray-500">
                      חוזים שכבר קיימים אינם זמינים לבחירה
                    </p>
                  )}
                </div>

                {/* Template Selection */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">בחר תבנית *</p>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplateId(template.id)
                          setError(null)
                        }}
                        disabled={creating}
                        className={`w-full p-4 border-2 rounded-lg text-right transition-all ${
                          selectedTemplateId === template.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                            {template.description && (
                              <p className="text-sm text-gray-600">{template.description}</p>
                            )}
                          </div>
                          {selectedTemplateId === template.id && (
                            <div className="mr-3 flex-shrink-0">
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={creating}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ביטול
            </button>
            <button
              onClick={handleCreateDocument}
              disabled={creating || !selectedTemplateId || !contractType || templates.length === 0 || (isBuyerTaken && isSellerTaken && isLawyerTaken)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  יוצר מסמך...
                </>
              ) : (
                'צור מסמך'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
