'use client'

import { SignatureBlock } from '@/lib/signatureBlocks'
import { SignatureBlockStatus } from '@/lib/api/documents'
import { CheckCircle, Pen } from 'lucide-react'

interface SigningOverlayProps {
  signatureBlocks: SignatureBlock[]
  signatureStatuses: SignatureBlockStatus[]
  contentAreaRef: React.RefObject<HTMLDivElement>
  onBlockClick: (blockId: string) => void
}

export default function SigningOverlay({
  signatureBlocks,
  signatureStatuses,
  contentAreaRef,
  onBlockClick,
}: SigningOverlayProps) {
  // Create a map of block_id -> status
  const statusMap = new Map<string, SignatureBlockStatus>()
  signatureStatuses.forEach(status => {
    statusMap.set(status.block_id, status)
  })

  // Debug: log first block position to compare editor vs signing page
  if (signatureBlocks.length > 0) {
    const b = signatureBlocks[0]
    console.debug('[SigningOverlay] first block pos', {
      id: b.id,
      raw: { x: b.x, y: b.y, width: b.width, height: b.height },
      applied: { x: b.x, y: b.y, width: b.width, height: b.height },
    })
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 20,
      }}
    >
      {signatureBlocks.map((block) => {
        const status = statusMap.get(block.id)
        const isSigned = status?.is_signed ?? false

        // Apply a consistent upward correction to match editor layout
        const x = block.x;
        const y = Math.max(0, block.y - 64);

        return (
          <div
            key={block.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${block.width}px`,
              height: `${block.height}px`,
              zIndex: isSigned ? 10 : 20,
              // Ensure block maintains exact position and size
              boxSizing: 'border-box',
            }}
          >
            {isSigned ? (
              // Signed block - show signature image (maintains exact size)
              <div 
                className="w-full h-full border-2 border-green-500 bg-white rounded overflow-hidden relative"
                style={{
                  width: `${block.width}px`,
                  height: `${block.height}px`,
                  boxSizing: 'border-box',
                }}
              >
                {status.signature_data ? (
                  <img
                    src={status.signature_data}
                    alt={`חתימה ${status.signer_name || ''}`}
                    className="w-full h-full object-contain"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-green-600">
                    <CheckCircle className="w-8 h-8" />
                    <span className="text-xs font-medium">חתום</span>
                  </div>
                )}
                {status.signer_name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-green-100 text-green-800 text-xs text-center py-1 px-2 rounded-b">
                    {status.signer_name}
                  </div>
                )}
              </div>
            ) : (
              // Unsigned block - show placeholder with click action (maintains exact size)
              <div 
                className="w-full h-full border-2 border-dashed border-blue-400 bg-blue-50 rounded flex flex-col items-center justify-center hover:bg-blue-100 hover:border-blue-500 transition-colors cursor-pointer"
                style={{
                  width: `${block.width}px`,
                  height: `${block.height}px`,
                  boxSizing: 'border-box',
                }}
                onClick={() => onBlockClick(block.id)}
              >
                <Pen className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-xs font-medium text-blue-800 text-center px-2">
                  {block.label || 'לחץ לחתימה'}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}