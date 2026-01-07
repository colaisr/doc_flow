'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { fetchTemplate, updateTemplate, createTemplate, type Template } from '@/lib/api/templates'
import { useOrganizationContext } from '@/contexts/OrganizationContext'
import GoogleDocsEditor, { GoogleDocsEditorRef } from '@/components/GoogleDocsEditor'
import { Save, X } from 'lucide-react'
import { SignatureBlock, serializeSignatureBlocks, deserializeSignatureBlocks } from '@/lib/signatureBlocks'

export default function TemplateEditPage() {
  const router = useRouter()
  const params = useParams()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const { currentOrganizationId } = useOrganizationContext()
  
  const templateId = params?.id ? (params.id as string) : null
  const isNew = templateId === 'new'
  
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [content, setContent] = useState('<p></p>')
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  
  const editorRef = useRef<GoogleDocsEditorRef>(null)

  // Fetch template if editing
  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setIsEditingName(true)
      return
    }

    if (!templateId || isNaN(parseInt(templateId))) {
      setError('מזהה תבנית לא תקין')
      setLoading(false)
      return
    }

    async function loadTemplate() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTemplate(parseInt(templateId))
        setTemplate(data)
        setName(data.name)
        setContent(data.content || '<p></p>')
        const blocks = deserializeSignatureBlocks(data.signature_blocks || null)
        setSignatureBlocks(blocks)
      } catch (err: any) {
        if (err.message === 'Template not found' || err.message?.includes('404')) {
          setError('התבנית לא נמצאה')
        } else {
          setError(err.message || 'שגיאה בטעינת התבנית')
        }
        console.error('Failed to fetch template:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [templateId, isNew])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Track dirty state
  useEffect(() => {
    if (template) {
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
  }, [name, content, signatureBlocks, template, isNew])

  const handleSave = async () => {
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
        await updateTemplate(parseInt(templateId!), {
          name: name.trim(),
          description: template?.description || null,
          content: content,
          signature_blocks: signatureBlocksJson || undefined,
        })
        setIsDirty(false)
        // Reload template to get updated data
        const updated = await fetchTemplate(parseInt(templateId!))
        setTemplate(updated)
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת התבנית')
      console.error('Failed to save template:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (isDirty && !confirm('יש לך שינויים לא שמורים. האם אתה בטוח שברצונך לחזור?')) {
      return
    }
    router.push('/templates')
  }

  if (authLoading || (loading && !isNew)) {
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
          onClick={() => router.push('/templates')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          חזור לרשימת התבניות
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-300 shadow-sm px-4 py-2 flex items-center justify-between">
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
              placeholder="שם התבנית"
              className="text-lg font-medium border-none outline-none bg-transparent focus:bg-gray-50 px-2 py-1 rounded"
              autoFocus
              dir="rtl"
            />
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-lg font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
            >
              {name || 'שם התבנית'}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-gray-500">יש שינויים לא שמורים</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
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
        <div className="absolute top-20 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

