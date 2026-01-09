'use client'

import { useState } from 'react'
import { X, Send, Copy, Check, Mail } from 'lucide-react'
import { createSigningLink, type Document, type CreateSigningLinkResponse } from '@/lib/api/documents'

interface SendSigningLinkModalProps {
  document: Document
  onClose: () => void
}

export default function SendSigningLinkModal({ document, onClose }: SendSigningLinkModalProps) {
  const [signerEmail, setSignerEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number | null>(30)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<CreateSigningLinkResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const getContractTypeLabel = (contractType: string | null) => {
    switch (contractType) {
      case 'buyer': return 'לקוח'
      case 'seller': return 'מוכר'
      case 'lawyer': return 'עורך דין'
      default: return 'חותם'
    }
  }

  const handleCreateLink = async () => {
    setCreating(true)
    setError(null)

    try {
      const response = await createSigningLink(document.id, {
        intended_signer_email: signerEmail.trim() || null,
        expires_in_days: expiresInDays,
      })
      setCreatedLink(response)
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת קישור חתימה')
      console.error('Failed to create signing link:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!createdLink) return

    try {
      await navigator.clipboard.writeText(createdLink.signing_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleEmailClick = () => {
    if (!createdLink) return

    const subject = encodeURIComponent('בקשת חתימה על מסמך')
    const body = encodeURIComponent(
      `שלום,\n\nאנא חתום על המסמך באמצעות הקישור הבא:\n${createdLink.signing_url}\n\nתודה`
    )
    window.location.href = `mailto:${signerEmail}?subject=${subject}&body=${body}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">שלח קישור חתימה</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="סגור"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {!createdLink ? (
          <>
            {/* Form */}
            <div className="space-y-6">
              {/* Contract Type Info */}
              {document.contract_type && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">סוג חוזה:</span> {getContractTypeLabel(document.contract_type)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    הקישור נועד לחתימה עבור {getContractTypeLabel(document.contract_type)}
                  </p>
                </div>
              )}

              {/* Email Input (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כתובת אימייל של החותם (אופציונלי)
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  אימייל זה ישמש לזיהוי החותם (לא חובה)
                </p>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תוקף הקישור (ימים)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  השאר ריק לעיצוב ללא הגבלת זמן
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={creating}
                >
                  ביטול
                </button>
                <button
                  onClick={handleCreateLink}
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      יוצר...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      צור קישור
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  קישור חתימה נוצר בהצלחה!
                </p>
              </div>

              {/* Link Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קישור חתימה
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createdLink.signing_url}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="העתק קישור"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        הועתק!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        העתק
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Email Button (if email provided) */}
              {signerEmail && (
                <button
                  onClick={handleEmailClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  פתח מייל
                </button>
              )}

              {/* Link Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2 text-sm">
                  {document.contract_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">סוג חוזה:</span>
                      <span className="font-medium text-gray-900">
                        {getContractTypeLabel(document.contract_type)}
                      </span>
                    </div>
                  )}
                  {createdLink.intended_signer_email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">אימייל:</span>
                      <span className="font-medium text-gray-900">
                        {createdLink.intended_signer_email}
                      </span>
                    </div>
                  )}
                  {createdLink.expires_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">תפוגה:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(createdLink.expires_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setCreatedLink(null)
                    setSignerEmail('')
                    setError(null)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  צור קישור נוסף
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  סגור
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
