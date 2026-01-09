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
  // Constants matching editor
  const PAGE_PADDING_PX = 64; // 16 * 4 = 64px (p-16)
  
  // Create a map of block_id -> status
  const statusMap = new Map<string, SignatureBlockStatus>()
  signatureStatuses.forEach(status => {
    statusMap.set(status.block_id, status)
  })

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

        // Signature block coordinates handling:
        // - Blocks created with old code: relative to content area (centered x ~233)
        // - Blocks created with new code: relative to page wrapper (centered x ~297)
        // - Blocks that were dragged: relative to page wrapper (can be any value)
        // 
        // Heuristic: if x is less than 280 (midpoint between old ~233 and new ~297),
        // it's likely old format (content-relative), so add padding offset.
        // Otherwise, it's new format or dragged (page-relative), use as-is.
        const OLD_FORMAT_THRESHOLD = 280; // Midpoint between old (233) and new (297) centered positions
        const needsOffset = block.x < OLD_FORMAT_THRESHOLD;
        const x = needsOffset ? block.x + PAGE_PADDING_PX : block.x;
        const y = needsOffset ? block.y + PAGE_PADDING_PX : block.y;

        return (
          <div
            key={block.id}
            className="absolute pointer-events-auto cursor-pointer transition-all hover:shadow-lg"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${block.width}px`,
              height: `${block.height}px`,
              zIndex: isSigned ? 10 : 20,
            }}
            onClick={() => !isSigned && onBlockClick(block.id)}
          >
            {isSigned ? (
              // Signed block - show signature image
              <div className="w-full h-full border-2 border-green-500 bg-white rounded flex items-center justify-center p-2">
                {status.signature_data ? (
                  <img
                    src={status.signature_data}
                    alt={`חתימה ${status.signer_name || ''}`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-green-600">
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
              // Unsigned block - show placeholder with click action
              <div className="w-full h-full border-2 border-dashed border-blue-400 bg-blue-50 rounded flex flex-col items-center justify-center hover:bg-blue-100 hover:border-blue-500 transition-colors">
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