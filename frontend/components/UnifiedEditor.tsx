'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { fetchTemplate, updateTemplate, createTemplate, type Template } from '@/lib/api/templates'
import { getDocument, updateDocument, type Document } from '@/lib/api/documents'
import { useOrganizationContext } from '@/contexts/OrganizationContext'
import GoogleDocsEditor, { GoogleDocsEditorRef } from '@/components/GoogleDocsEditor'
import { Save, X, Check } from 'lucide-react'
import { SignatureBlock, serializeSignatureBlocks, deserializeSignatureBlocks } from '@/lib/signatureBlocks'

interface UnifiedEditorProps {
  itemId: string | null
  isNew: boolean
  isDocumentEdit: boolean
}

export default function UnifiedEditor({ itemId, isNew, isDocumentEdit }: UnifiedEditorProps) {
  const router = useRouter()
  const { currentOrganizationId } = useOrganizationContext()
  
  const [template, setTemplate] = useState<Template | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [markingReady, setMarkingReady] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [content, setContent] = useState('<p></p>')
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  
  const editorRef = useRef<GoogleDocsEditorRef>(null)

  // Fetch template or document based on route
  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setIsEditingName(true)
      return
    }

    if (!itemId || isNaN(parseInt(itemId))) {
      setError(isDocumentEdit ? 'מזהה מסמך לא תקין' : 'מזהה תבנית לא תקין')
      setLoading(false)
      return
    }

    const validatedId = parseInt(itemId)

    async function loadItem() {
      setLoading(true)
      setError(null)
      try {
        if (isDocumentEdit) {
          const data = await getDocument(validatedId, false, false)
          setDocument(data)
          setName(data.title)
          setContent(data.rendered_content || '<p></p>')
          const blocks = deserializeSignatureBlocks(data.signature_blocks || null)
          setSignatureBlocks(blocks)
        } else {
          const data = await fetchTemplate(validatedId)
          setTemplate(data)
          setName(data.name)
          setContent(data.content || '<p></p>')
          const blocks = deserializeSignatureBlocks(data.signature_blocks || null)
          setSignatureBlocks(blocks)
        }
      } catch (err: any) {
        if (err.message === 'Template not found' || err.message === 'Document not found' || err.message?.includes('404')) {
          setError(isDocumentEdit ? 'המסמך לא נמצא' : 'התבנית לא נמצאה')
        } else {
          setError(err.message || (isDocumentEdit ? 'שגיאה בטעינת המסמך' : 'שגיאה בטעינת התבנית'))
        }
        console.error(`Failed to fetch ${isDocumentEdit ? 'document' : 'template'}:`, err)
      } finally {
        setLoading(false)
      }
    }

    loadItem()
  }, [itemId, isNew, isDocumentEdit])

  // Track dirty state
  useEffect(() => {
    if (isDocumentEdit && document) {
      const originalBlocks = deserializeSignatureBlocks(document.signature_blocks || null)
      const originalBlocksJson = serializeSignatureBlocks(originalBlocks)
      const currentBlocksJson = serializeSignatureBlocks(signatureBlocks)
      
      const isChanged =
        name !== document.title ||
        content !== (document.rendered_content || '<p></p>') ||
        currentBlocksJson !== originalBlocksJson
      setIsDirty(isChanged)
    } else if (template) {
      const originalBlocks = deserializeSignatureBlocks(template.signature_blocks || null)
      const blocksChanged = JSON.stringify(signatureBlocks) !== JSON.stringify(originalBlocks)
      
      const isChanged =
        name !== template.name ||
        content !== (template.content || '<p></p>') ||
        blocksChanged
      setIsDirty(isChanged)
    } else if (isNew) {
      const isChanged = name !== '' || content !== '<p></p>' || signatureBlocks.length > 0
      setIsDirty(isChanged)
    }
  }, [name, content, signatureBlocks, template, document, isNew, isDocumentEdit])

  const handleSave = async () => {
    if (isDocumentEdit) {
      if (!itemId || isNaN(parseInt(itemId))) return

      setSaving(true)
      setError(null)

      try {
        console.log('Saving document:', {
          documentId: parseInt(itemId),
          status: document?.status,
          hasContent: !!content,
          hasTitle: !!name.trim(),
          signatureBlocksCount: signatureBlocks.length
        })
        
        const updatedDoc = await updateDocument(parseInt(itemId), {
          rendered_content: content,
          title: name.trim(),
          signature_blocks: serializeSignatureBlocks(signatureBlocks),
        })
        
        console.log('Document saved successfully:', updatedDoc)
        setDocument(updatedDoc)
        setIsDirty(false)
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'שגיאה בשמירת המסמך'
        setError(errorMessage)
        console.error('Failed to save document:', {
          error: err,
          response: err.response,
          message: err.message,
          documentId: parseInt(itemId),
          documentStatus: document?.status
        })
      } finally {
        setSaving(false)
      }
    } else {
      if (!currentOrganizationId) {
        alert('אין ארגון נבחר')
        return
      }

      if (!name.trim()) {
        alert('נא להזין שם תבנית')
        setIsEditingName(true)
        return
      }

      setSaving(true)
      setError(null)

      try {
        const signatureBlocksJson = signatureBlocks.length > 0 
          ? serializeSignatureBlocks(signatureBlocks) 
          : null
        
        if (isNew) {
          const newTemplate = await createTemplate(currentOrganizationId, {
            name: name.trim(),
            description: null,
            content: content,
            signature_blocks: signatureBlocksJson || undefined,
          })
          router.push(`/templates/${newTemplate.id}/edit`)
        } else {
          if (!itemId || isNaN(parseInt(itemId))) return
          await updateTemplate(parseInt(itemId), {
            name: name.trim(),
            description: template?.description || null,
            content: content,
            signature_blocks: signatureBlocksJson || undefined,
          })
          setIsDirty(false)
          const updated = await fetchTemplate(parseInt(itemId))
          setTemplate(updated)
        }
      } catch (err: any) {
        setError(err.message || 'שגיאה בשמירת התבנית')
        console.error('Failed to save template:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleMarkAsReady = async () => {
    if (!isDocumentEdit || !itemId || !document) return

    setMarkingReady(true)
    setError(null)

    try {
      if (isDirty) {
        await updateDocument(parseInt(itemId), {
          rendered_content: content,
          title: name.trim(),
          signature_blocks: serializeSignatureBlocks(signatureBlocks),
        })
      }

      const updatedDoc = await updateDocument(parseInt(itemId), {
        status: 'ready',
      })
      setDocument(updatedDoc)
      setIsDirty(false)
      
      // Navigate back to lead page to see updated status
      if (document?.lead_id) {
        router.push(`/leads/${document.lead_id}`)
      } else {
        router.push('/leads')
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בסימון המסמך כמוכן')
      console.error('Failed to mark document as ready:', err)
    } finally {
      setMarkingReady(false)
    }
  }

  const handleCancel = () => {
    if (isDirty && !confirm('יש לך שינויים לא שמורים. האם אתה בטוח שברצונך לחזור?')) {
      return
    }
    if (isDocumentEdit) {
      // Navigate back to lead page
      if (document?.lead_id) {
        router.push(`/leads/${document.lead_id}`)
      } else {
        router.push('/leads')
      }
    } else {
      router.push('/templates')
    }
  }

  if (loading && !isNew) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען...</div>
      </div>
    )
  }

  if (error && !isNew) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-600">{error}</div>
        <button
          onClick={() => router.push(isDocumentEdit ? '/leads' : '/templates')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {isDocumentEdit ? 'חזור ללידים' : 'חזור לרשימת התבניות'}
        </button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-800' },
      ready: { label: 'מוכן לשליחה', color: 'bg-green-100 text-green-800' },
      sent: { label: 'נשלח', color: 'bg-blue-100 text-blue-800' },
      signed: { label: 'חתום', color: 'bg-purple-100 text-purple-800' },
    }
    const config = statusConfig[status] || statusConfig.draft
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getContractTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      buyer: 'חוזה לקוח',
      seller: 'חוזה מוכר',
      lawyer: 'חוזה עורך דין',
    }
    return labels[type || ''] || type || ''
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-300 shadow-sm px-4 py-2 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={handleCancel}
            className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded"
            title="חזור"
          >
            <X className="w-5 h-5" />
          </button>
          
          {isEditingName ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingName(false)
                }
              }}
              placeholder={isDocumentEdit ? 'שם המסמך' : 'שם התבנית'}
              className="text-lg font-medium border-none outline-none bg-transparent focus:bg-gray-50 px-2 py-1 rounded"
              autoFocus
              dir="rtl"
            />
          ) : (
            <div className="flex items-center gap-3">
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-lg font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                {name || (isDocumentEdit ? 'שם המסמך' : 'שם התבנית')}
              </h1>
              {isDocumentEdit && document && (
                <>
                  {document.contract_type && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      document.contract_type === 'buyer' ? 'bg-blue-100 text-blue-800' :
                      document.contract_type === 'seller' ? 'bg-purple-100 text-purple-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {getContractTypeLabel(document.contract_type)}
                    </span>
                  )}
                  {getStatusBadge(document.status)}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-gray-500">יש שינויים לא שמורים</span>
          )}
          
          {/* Mark as Ready button (for draft documents only) */}
          {isDocumentEdit && document && document.status === 'draft' && (
            <button
              onClick={handleMarkAsReady}
              disabled={markingReady || saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {markingReady ? 'מסמן...' : 'סמן כמוכן לשליחה'}
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={saving || markingReady}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <GoogleDocsEditor
          ref={editorRef}
          content={content}
          onChange={setContent}
          signatureBlocks={signatureBlocks}
          onSignatureBlocksUpdate={setSignatureBlocks}
        />
      </div>

      {error && (
        <div className="absolute top-20 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" dir="rtl">
          {error}
        </div>
      )}
    </div>
  )
}
