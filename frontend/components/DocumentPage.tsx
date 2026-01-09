'use client'

interface DocumentPageProps {
  htmlContent: string
  overlay?: React.ReactNode
  dir?: 'rtl' | 'ltr'
}

/**
 * DocumentPage
 * Shared A4 page shell identical to the editor layout.
 * Renders static HTML content and optional overlay elements (e.g., signature blocks).
 */
export default function DocumentPage({ htmlContent, overlay, dir = 'rtl' }: DocumentPageProps) {
  return (
    <div className="flex justify-center">
      {/* Document wrapper - matches editor structure exactly */}
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
          className="ProseMirror prose prose-sm max-w-none focus:outline-none"
          style={{
            width: '666px', // 794px - (64px * 2) = 666px (matches editor)
            padding: '64px', // 16 * 4 = 64px (p-16) - matches editor
            margin: '0 auto',
            minHeight: '995px', // 1123px - (64px * 2) = 995px
            position: 'relative',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          dir={dir}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Overlay (e.g., signature blocks) */}
        {overlay}
      </div>
    </div>
  )
}
