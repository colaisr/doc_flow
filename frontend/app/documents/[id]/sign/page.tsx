'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { getDocument, submitSignature, type Document, type SubmitSignatureRequest } from '@/lib/api/documents'
import { deserializeSignatureBlocks, type SignatureBlock } from '@/lib/signatureBlocks'
import SignatureCanvas, { type SignatureCanvasRef } from '@/components/SignatureCanvas'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function InternalSigningPage() {
  const router = useRouter()
  const params = useParams()
  const { isLoading: authLoading, isAuthenticated, user } = useAuth()

  const [document, setDocument] = useState<Document | null>(null)
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signerName, setSignerName] = useState('')

  const signatureCanvasRef = useRef<SignatureCanvasRef>(null)
  const documentId = params?.id ? parseInt(params.id as string, 10) : null

  // Fetch document data
  useEffect(() => {
    if (documentId === null || isNaN(documentId)) {
      setError('מזהה מסמך לא תקין')
      setLoading(false)
      return
    }

    // Capture validated ID to help TypeScript
    const validatedId: number = documentId

    async function fetchDocument() {
      setLoading(true)
      setError(null)
      try {
        const docData = await getDocument(validatedId, true, true)
        setDocument(docData)

        // Load signature blocks from template
        if (docData.template) {
          // We need to fetch template to get signature_blocks
          // For now, we'll get them from the document view
          // In Phase 3.8, we'll need to add signature_blocks to DocumentResponse
        }

        // Set signer name from current user
        if (user) {
          setSignerName(user.full_name || user.email)
        }

        // Check if already signed
        const hasInternalSignature = docData.signatures?.some(sig => sig.signer_type === 'internal')
        if (hasInternalSignature) {
          setError('המסמך כבר נחתם על ידי משתמש פנימי')
        }
      } catch (err: any) {
        if (err.message === 'Document not found' || err.message?.includes('404')) {
          setError('המסמך לא נמצא')
        } else {
          setError(err.message || 'שגיאה בטעינת המסמך')
        }
        console.error('Failed to fetch document:', err)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && !authLoading) {
      fetchDocument()
    }
  }, [documentId, isAuthenticated, authLoading, user])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  const handleSubmit = async () => {
    if (!document || !signatureCanvasRef.current) return

    if (!signatureData) {
      setSubmitError('יש לחתום על המסמך')
      return
    }

    if (!signerName.trim()) {
      setSubmitError('יש להזין שם חותם')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const request: SubmitSignatureRequest = {
        signer_name: signerName.trim(),
        signer_email: user?.email || null,
        signature_data: signatureData,
      }

      await submitSignature(document.id, request)
      setSuccess(true)

      // Redirect to lead page after 2 seconds to see updated status
      setTimeout(() => {
        if (document.lead_id) {
          router.push(`/leads/${document.lead_id}`)
        } else {
          router.push('/leads')
        }
      }, 2000)
    } catch (err: any) {
      setSubmitError(err.message || 'שגיאה בשליחת החתימה')
      console.error('Failed to submit signature:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען מסמך...</p>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md mx-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h1>
          <p className="text-gray-600 mb-4">{error || 'המסמך לא נמצא'}</p>
          <button
            onClick={() => router.push('/leads')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            חזור לרשימת לידים
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">חתימה נשלחה בהצלחה!</h1>
          <p className="text-gray-600 mb-4">המסמך נחתם בהצלחה. מעביר לדף הליד...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => {
                if (document.lead_id) {
                  router.push(`/leads/${document.lead_id}`)
                } else {
                  router.push('/leads')
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="חזור"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">חתימה על מסמך</h1>
              <p className="text-sm text-gray-500 mt-1">{document.title}</p>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">תוכן המסמך</h2>
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: document.rendered_content }}
            dir="rtl"
          />
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">חתימה</h2>

          {/* Signer Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם החותם <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="הזן את שמך"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Signature Canvas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              חתום כאן <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center">
              <SignatureCanvas
                ref={signatureCanvasRef}
                width={600}
                height={200}
                onSignatureChange={(data) => setSignatureData(data)}
                placeholder="חתום כאן..."
              />
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{submitError}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                if (document.lead_id) {
                  router.push(`/leads/${document.lead_id}`)
                } else {
                  router.push('/leads')
                }
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !signatureData || !signerName.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  שולח...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  שלח חתימה
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
