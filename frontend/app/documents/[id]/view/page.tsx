'use client'

import { useAuth } from '@/hooks/useAuth'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getDocument, type Document, type DocumentSignature } from '@/lib/api/documents'
import { deserializeSignatureBlocks, type SignatureBlock } from '@/lib/signatureBlocks'
import { FileText, Download, ArrowRight, CheckCircle } from 'lucide-react'
import DocumentPage from '@/components/DocumentPage'

export default function DocumentViewPage() {
  const router = useRouter()
  const params = useParams()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  
  const documentId = params?.id ? parseInt(params.id as string, 10) : null
  const [document, setDocument] = useState<Document | null>(null)
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch document with signatures
  useEffect(() => {
    if (!documentId || isNaN(documentId)) {
      setError('מזהה מסמך לא תקין')
      setLoading(false)
      return
    }

    if (authLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    async function loadDocument() {
      setLoading(true)
      setError(null)
      try {
        // Fetch document with signatures included
        const data = await getDocument(documentId, true, false)
        setDocument(data)
        
        // Load signature blocks
        if (data.signature_blocks) {
          const blocks = deserializeSignatureBlocks(data.signature_blocks)
          setSignatureBlocks(blocks)
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

    loadDocument()
  }, [documentId, authLoading, isAuthenticated, router])

  // Create a map of block_id -> signature
  const signatureMap = new Map<string, DocumentSignature>()
  if (document?.signatures) {
    document.signatures.forEach(sig => {
      if (sig.signature_block_id) {
        signatureMap.set(sig.signature_block_id, sig)
      }
    })
  }

  const handleExportPDF = () => {
    if (!document) return
    
    // Create a map of block_id -> signature for PDF export
    const sigMap = new Map<string, DocumentSignature>()
    if (document.signatures) {
      document.signatures.forEach(sig => {
        if (sig.signature_block_id) {
          sigMap.set(sig.signature_block_id, sig)
        }
      })
    }
    
    // Create a new window with the document content
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('לא ניתן לפתוח חלון חדש. אנא בדוק את הגדרות הדפדפן.')
      return
    }

    // Build HTML with document content and signatures
    const PAGE_PADDING_PX = 64
    const OLD_FORMAT_THRESHOLD = 280
    
    const signatureBlocksHtml = signatureBlocks.map(block => {
      const signature = sigMap.get(block.id)
      if (!signature || !signature.signature_data) return ''
      
      const needsOffset = block.x < OLD_FORMAT_THRESHOLD
      const x = needsOffset ? block.x + PAGE_PADDING_PX : block.x
      const y = needsOffset ? block.y + PAGE_PADDING_PX : block.y
      
      return `
        <div class="signature-block" style="left: ${x}px; top: ${y}px; width: ${block.width}px; height: ${block.height}px;">
          <img src="${signature.signature_data}" alt="חתימה ${signature.signer_name}" />
          <div class="signature-info">
            ${signature.signer_name}
            ${signature.signed_at ? ` - ${new Date(signature.signed_at).toLocaleDateString('he-IL')}` : ''}
          </div>
        </div>
      `
    }).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <title>${document.title}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 64px;
              font-family: Arial, sans-serif;
              direction: rtl;
            }
            .document-content {
              max-width: 666px;
              margin: 0 auto;
            }
            .signature-block {
              position: absolute;
              border: 2px solid #10b981;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px;
            }
            .signature-block img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .signature-info {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: #d1fae5;
              color: #065f46;
              font-size: 10px;
              text-align: center;
              padding: 4px 8px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="document-content">
            ${document.rendered_content}
          </div>
          ${signatureBlocksHtml}
          <script>
            window.onload = function() {
              window.print()
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען...</div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-600">{error || 'המסמך לא נמצא'}</div>
        <button
          onClick={() => router.push(`/leads/${document?.lead_id || ''}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          חזור לליד
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{document.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                מסמך חתום
                {document.signatures && document.signatures.length > 0 && (
                  <span className="mr-2">
                    • {document.signatures.length} {document.signatures.length === 1 ? 'חתימה' : 'חתימות'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              ייצא ל-PDF
            </button>
            <button
              onClick={() => router.push(`/leads/${document.lead_id}`)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לליד
            </button>
          </div>
        </div>
      </div>

      {/* Document Content with Signatures */}
      <div className="flex-1 overflow-auto bg-gray-100 py-8">
        <DocumentPage
          htmlContent={document.rendered_content}
          overlay={
            signatureBlocks.length > 0 ? (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
                {signatureBlocks.map((block) => {
                  const signature = signatureMap.get(block.id)
                  const isSigned = !!signature

                  const x = block.x
                  const y = Math.max(0, block.y - 64)

                  if (signatureBlocks.indexOf(block) === 0) {
                    console.debug('[DocumentView] first block pos', {
                      id: block.id,
                      raw: { x: block.x, y: block.y },
                      applied: { x, y },
                    })
                  }

                  return (
                    <div
                      key={block.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        width: `${block.width}px`,
                        height: `${block.height}px`,
                        zIndex: 10,
                        boxSizing: 'border-box',
                        position: 'absolute',
                      }}
                    >
                      {isSigned && signature.signature_data ? (
                        <div
                          className="w-full h-full border-2 border-green-500 bg-white rounded overflow-hidden relative"
                          style={{
                            width: `${block.width}px`,
                            height: `${block.height}px`,
                            boxSizing: 'border-box',
                          }}
                        >
                          <img
                            src={signature.signature_data}
                            alt={`חתימה ${signature.signer_name || ''}`}
                            className="w-full h-full object-contain"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              display: 'block',
                            }}
                          />
                          {signature.signer_name && (
                            <div className="absolute bottom-0 left-0 right-0 bg-green-100 text-green-800 text-xs text-center py-1 px-2 rounded-b">
                              {signature.signer_name}
                              {signature.signed_at && (
                                <span className="block text-xs opacity-75 mt-0.5">
                                  {new Date(signature.signed_at).toLocaleDateString('he-IL')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full border-2 border-dashed border-gray-300 bg-gray-50 rounded flex flex-col items-center justify-center">
                          <span className="text-xs text-gray-500 text-center px-2">
                            {block.label || 'לא חתום'}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  )
}