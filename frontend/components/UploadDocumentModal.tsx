'use client'

import { useState } from 'react'
import { X, Upload, FileText, ChevronDown } from 'lucide-react'
import { uploadDocument } from '@/lib/api/documents'
import { DOCUMENT_TYPES, type DocumentType } from '@/lib/documentTypes'

interface UploadDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: number
  onDocumentUploaded: () => void
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  leadId,
  onDocumentUploaded,
}: UploadDocumentModalProps) {
  const [documentType, setDocumentType] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('רק קבצי PDF מותרים')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!documentType) {
      setError('אנא בחר סוג מסמך')
      return
    }

    if (!selectedFile) {
      setError('אנא בחר קובץ להעלאה')
      return
    }

    setUploading(true)
    setError(null)

    try {
      await uploadDocument({
        lead_id: leadId,
        document_type: documentType,
        file: selectedFile,
      })

      // Reset form
      setDocumentType(null)
      setSelectedFile(null)
      setError(null)

      // Notify parent
      onDocumentUploaded()

      // Close modal
      onClose()
    } catch (err: any) {
      console.error('Failed to upload document:', err)
      let errorMessage = 'שגיאה בהעלאת המסמך'
      
      if (err.response) {
        // Server responded with an error
        errorMessage = err.response.data?.detail || err.response.data?.message || `שגיאת שרת: ${err.response.status}`
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'לא התקבלה תגובה מהשרת. אנא בדוק את החיבור.'
      } else {
        // Error in request setup
        errorMessage = err.message || 'שגיאה בהעלאת המסמך'
      }
      
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setDocumentType(null)
      setSelectedFile(null)
      setError(null)
      setShowDropdown(false)
      onClose()
    }
  }

  const selectedDocumentType = documentType ? DOCUMENT_TYPES.find(t => t.id === documentType) : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">העלה מסמך</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              בחר סוג מסמך
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={uploading}
                className={`w-full px-4 py-3 text-right bg-white border-2 rounded-lg transition-all flex items-center justify-between ${
                  selectedDocumentType
                    ? 'border-blue-600 text-gray-900'
                    : 'border-gray-200 text-gray-500'
                } disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-300`}
              >
                <span className={selectedDocumentType ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedDocumentType ? selectedDocumentType.label : 'בחר סוג מסמך...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {DOCUMENT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setDocumentType(type.id)
                          setShowDropdown(false)
                          setError(null)
                        }}
                        className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors ${
                          documentType === type.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              בחר קובץ PDF
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileText className="w-12 h-12 text-green-500 mb-2" />
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      disabled={uploading}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      הסר קובץ
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>לחץ להעלאה</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept=".pdf"
                          className="sr-only"
                          onChange={handleFileSelect}
                          disabled={uploading}
                        />
                      </label>
                      <p className="pr-1">או גרור ושחרר</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF בלבד</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !documentType || !selectedFile}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                מעלה...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                העלה מסמך
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
