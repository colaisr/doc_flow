'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { getPublicSigningPage, submitPublicSignature, finishPublicSigning, type PublicSigningPageData, type SubmitPublicSignatureRequest } from '@/lib/api/documents'
import { deserializeSignatureBlocks, type SignatureBlock } from '@/lib/signatureBlocks'
import SignatureCanvas, { type SignatureCanvasRef } from '@/components/SignatureCanvas'
import SigningOverlay from '@/components/SigningOverlay'
import { CheckCircle, XCircle, AlertCircle, FileText, X, Pen } from 'lucide-react'

export default function PublicSigningPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [documentData, setDocumentData] = useState<PublicSigningPageData | null>(null)
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [showRemainingBlocksHint, setShowRemainingBlocksHint] = useState(false)

  const signatureCanvasRef = useRef<SignatureCanvasRef>(null)
  const contentAreaRef = useRef<HTMLDivElement>(null)

  // Fetch document data using token
  useEffect(() => {
    if (!token) {
      setError('קישור חתימה לא תקין')
      setLoading(false)
      return
    }

    async function fetchDocumentData() {
      setLoading(true)
      setError(null)
      try {
        const data = await getPublicSigningPage(token)
        setDocumentData(data)

        // Load signature blocks
        if (data.signature_blocks) {
          const blocks = deserializeSignatureBlocks(data.signature_blocks)
          setSignatureBlocks(blocks)
        }

        // Set email if provided
        if (data.signer_email) {
          setSignerEmail(data.signer_email)
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'שגיאה בטעינת המסמך'
        setError(errorMessage)
        console.error('Failed to fetch document:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDocumentData()
  }, [token])

  const handleBlockClick = (blockId: string) => {
    // Check if block is already signed
    const status = documentData?.signature_statuses.find(s => s.block_id === blockId)
    if (status?.is_signed) {
      return // Don't allow clicking signed blocks
    }

    setSelectedBlockId(blockId)
    setShowSignModal(true)
    setSignatureData(null)
    setSubmitError(null)
  }

  const handleCloseModal = () => {
    setShowSignModal(false)
    setSelectedBlockId(null)
    setSignatureData(null)
    signatureCanvasRef.current?.clear()
  }

  const handleSubmitSignature = async () => {
    if (!documentData || !selectedBlockId || !signatureCanvasRef.current || !token) return

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
      const request: SubmitPublicSignatureRequest = {
        signature_block_id: selectedBlockId,
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim() || null,
        signature_data: signatureData,
      }

      const response = await submitPublicSignature(token, request)
      
      // Refresh document data to get updated signature statuses
      const updatedData = await getPublicSigningPage(token)
      setDocumentData(updatedData)

      // Close modal and show hint if there are remaining blocks
      handleCloseModal()
      
      if (!response.all_blocks_signed && response.remaining_blocks > 0) {
        setShowRemainingBlocksHint(true)
        setTimeout(() => setShowRemainingBlocksHint(false), 5000)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'שגיאה בשליחת החתימה'
      setSubmitError(errorMessage)
      console.error('Failed to submit signature:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = async () => {
    if (!token || !documentData?.all_blocks_signed) return

    setFinishing(true)
    setSubmitError(null)

    try {
      await finishPublicSigning(token)
      setSuccess(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'שגיאה בהשלמת החתימה'
      setSubmitError(errorMessage)
      console.error('Failed to finish signing:', err)
    } finally {
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען מסמך...</p>
        </div>
      </div>
    )
  }

  if (error || !documentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md mx-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h1>
          <p className="text-gray-600 mb-4">
            {error || 'המסמך לא נמצא או הקישור פג תוקף'}
          </p>
          {error?.includes('expired') && (
            <p className="text-sm text-gray-500 mb-4">
              קישור החתימה פג תוקף. אנא צור קשר לקבלת קישור חדש.
            </p>
          )}
          {error?.includes('used') && (
            <p className="text-sm text-gray-500 mb-4">
              קישור זה כבר שימש. כל קישור חתימה יכול לשמש פעם אחת בלבד.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">המסמך נחתם בהצלחה!</h1>
          <p className="text-gray-600 mb-4">
            תודה על החתימה. המסמך נחתם ונשמר במערכת.
          </p>
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              המסמך נחתם ונשמר. תוכל לסגור את הדף הזה.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const unsignedBlocks = signatureBlocks.filter(block => {
    const status = documentData.signature_statuses.find(s => s.block_id === block.id)
    return !status?.is_signed
  })

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{documentData.document_title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">חתימה על מסמך</p>
            </div>
          </div>
        </div>
      </div>

      {/* Remaining Blocks Hint */}
      {showRemainingBlocksHint && unsignedBlocks.length > 0 && (
        <div className="bg-blue-50 border-r-4 border-blue-400 p-4 mx-auto max-w-5xl mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                נותרו {unsignedBlocks.length} מקומות חתימה
              </p>
              <p className="text-xs text-blue-700 mt-1">
                לחץ על התיבות הכחולות במסמך כדי לחתום
              </p>
            </div>
            <button
              onClick={() => setShowRemainingBlocksHint(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Document Content with Overlay - matches editor layout exactly */}
      <div className="flex-1 overflow-auto bg-gray-100 py-8">
        <div className="flex justify-center">
          {/* Document wrapper - matches editor structure */}
          <div
            className="relative bg-white shadow-lg"
            style={{
              width: '794px', // A4 width at 96 DPI (210mm)
              minHeight: '1123px', // A4 height at 96 DPI (297mm)
              maxWidth: '100%',
            }}
          >
            {/* Document Content Area - matches editor exactly */}
            <div
              ref={contentAreaRef}
              className="ProseMirror"
              style={{
                width: '666px', // 794px - (64px * 2) = 666px (matches editor)
                padding: '64px', // 16 * 4 = 64px (p-16) - matches editor
                margin: '0 auto',
                minHeight: '995px', // 1123px - (64px * 2) = 995px
              }}
              dir="rtl"
            >
              {/* Document Content */}
              <div
                className="prose prose-lg max-w-none"
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                dangerouslySetInnerHTML={{ __html: documentData.rendered_content }}
              />
            </div>

            {/* Signature Blocks Overlay - positioned relative to page wrapper */}
            {signatureBlocks.length > 0 && (
              <SigningOverlay
                signatureBlocks={signatureBlocks}
                signatureStatuses={documentData.signature_statuses}
                contentAreaRef={contentAreaRef}
                onBlockClick={handleBlockClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Finish Button (when all blocks are signed) */}
      {documentData.all_blocks_signed && (
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">כל החתימות הושלמו</span>
            </div>
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {finishing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  מסיים...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  סיום חתימה
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Signing Modal */}
      {showSignModal && selectedBlockId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={handleCloseModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">חתימה</h2>
                <button
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Signer Name Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם מלא <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="הזן את שמך המלא"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Signer Email Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    כתובת אימייל (אופציונלי)
                  </label>
                  <input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="example@email.com"
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
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSubmitSignature}
                  disabled={submitting || !signatureData || !signerName.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      שולח...
                    </>
                  ) : (
                    <>
                      <Pen className="w-4 h-4" />
                      שלח חתימה
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}