/**
 * Document types for uploaded documents
 * These are business process document types, not contract types
 */
export interface DocumentType {
  id: string
  label: string
  triggersStage?: string // Stage name to advance to when this type is uploaded
}

export const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'lawyer_approved_buyer_contract',
    label: 'מסמכי לקוח מאומתים',
    triggersStage: 'מסמכי לקוח מאומתים', // Marks "מסמכי לקוח מאומתים" stage as complete
  },
  {
    id: 'lawyer_approved_seller_contract',
    label: 'מסמכי מוכר מאומתים',
    triggersStage: 'מסמכי מוכר מאומתים', // Marks "מסמכי מוכר מאומתים" stage as complete
  },
]

/**
 * Get document type by ID
 */
export function getDocumentTypeById(id: string): DocumentType | undefined {
  return DOCUMENT_TYPES.find(type => type.id === id)
}
