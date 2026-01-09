'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { getPublicSigningPage, submitPublicSignature, type PublicSigningPageData, type SubmitPublicSignatureRequest } from '@/lib/api/documents'
import { deserializeSignatureBlocks, type SignatureBlock } from '@/lib/signatureBlocks'
import SignatureCanvas, { type SignatureCanvasRef } from '@/components/SignatureCanvas'
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react'

export default function PublicSigningPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [documentData, setDocumentData] = useState<PublicSigningPageData | null>(null)
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')

  const signatureCanvasRef = useRef<SignatureCanvasRef>(null)

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
          // Filter blocks by signer type if needed
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

  const handleSubmit = async () => {
    if (!documentData || !signatureCanvasRef.current || !token) return

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
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim() || null,
        signature_data: signatureData,
      }

      await submitPublicSignature(token, request)
      setSuccess(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'שגיאה בשליחת החתימה'
      setSubmitError(errorMessage)
      console.error('Failed to submit signature:', err)
    } finally {
      setSubmitting(false)
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">חתימה נשלחה בהצלחה!</h1>
          <p className="text-gray-600 mb-4">
            תודה על החתימה. המסמך נחתם בהצלחה ונשמר במערכת.
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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">חתימה על מסמך</h1>
              <p className="text-sm text-gray-500 mt-1">{documentData.document_title}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            אנא קרא את המסמך בקפידה, חתום למטה, ולחץ על "שלח חתימה" כדי להשלים את התהליך.
          </p>
        </div>

        {/* Document Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">תוכן המסמך</h2>
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: documentData.rendered_content }}
            dir="rtl"
          />
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">חתימה</h2>

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

          {/* Signer Email Input (optional, pre-filled if provided) */}
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

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
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
                  <CheckCircle className="w-5 h-5" />
                  שלח חתימה
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-center">
            החתימה שלך מאובטחת ונשמרת במערכת. קישור זה מיועד לשימוש חד-פעמי.
          </p>
        </div>
      </div>
    </div>
  )
}
