'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { fetchTemplate, updateTemplate, createTemplate, type Template } from '@/lib/api/templates'
import { useOrganizationContext } from '@/contexts/OrganizationContext'
import TipTapEditor, { TipTapEditorRef } from '@/components/TipTapEditor'
import { ArrowRight, Save, X } from 'lucide-react'
import { SignatureBlock, serializeSignatureBlocks, deserializeSignatureBlocks } from '@/lib/signatureBlocks'

export default function TemplateEditorPage() {
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
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('<p></p>')
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([])
  const [isDirty, setIsDirty] = useState(false)
  
  const editorRef = useRef<TipTapEditorRef>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Fetch template if editing
  useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }

    if (!templateId || isNaN(parseInt(templateId))) {
      setError('מזהה תבנית לא תקין')
      setLoading(false)
      return
    }

    // Capture validated template ID
    const validatedTemplateId = templateId

    async function loadTemplate() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTemplate(parseInt(validatedTemplateId))
        setTemplate(data)
        setName(data.name)
        setDescription(data.description || '')
        setContent(data.content || '<p></p>')
        // Load signature blocks
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
        description !== (template.description || '') ||
        content !== (template.content || '<p></p>') ||
        blocksChanged
      setIsDirty(isChanged)
    } else if (isNew) {
      const isChanged = name !== '' || description !== '' || content !== '<p></p>' || signatureBlocks.length > 0
      setIsDirty(isChanged)
    }
  }, [name, description, content, signatureBlocks, template, isNew])

  const handleSave = async () => {
    if (!currentOrganizationId) {
      alert('אין ארגון נבחר')
      return
    }

    if (!name.trim()) {
      alert('נא להזין שם תבנית')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const signatureBlocksJson = signatureBlocks.length > 0 
        ? serializeSignatureBlocks(signatureBlocks) 
        : null
      
      if (isNew) {
        // Create new template
        const newTemplate = await createTemplate(currentOrganizationId, {
          name: name.trim(),
          description: description.trim() || null,
          content: content,
          signature_blocks: signatureBlocksJson || undefined,
        })
        router.push(`/templates/${newTemplate.id}`)
      } else {
        // Update existing template
        if (!templateId || isNaN(parseInt(templateId))) return
        const updated = await updateTemplate(parseInt(templateId), {
          name: name.trim(),
          description: description.trim() || null,
          content: content,
          signature_blocks: signatureBlocksJson || undefined,
        })
        setTemplate(updated)
        setIsDirty(false)
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
    <div className="container mx-auto px-4 py-8" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="w-5 h-5" />
          חזור
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <X className="w-5 h-5" />
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Template Name and Description */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            שם התבנית *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הזן שם תבנית"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            תיאור (אופציונלי)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="הזן תיאור לתבנית"
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          תוכן התבנית
        </label>
        <div ref={editorContainerRef} className="relative min-h-[400px]">
          <TipTapEditor
            ref={editorRef}
            content={content}
            onChange={setContent}
            editable={true}
          />
        </div>
      </div>

      {/* TODO: Add Merge Fields Panel and Signature Blocks in Phase 2.3 and 2.4 */}
    </div>
  )
}

