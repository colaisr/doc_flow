/**
 * Lead field definitions with Hebrew labels and organization into sections
 */

export interface FieldDefinition {
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'textarea' | 'boolean' | 'url'
  section: string
  required?: boolean
}

export interface FieldSection {
  id: string
  name: string
  fields: FieldDefinition[]
}

export const LEAD_FIELD_SECTIONS: FieldSection[] = [
  {
    id: 'basic',
    name: 'פרטים בסיסיים',
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', section: 'basic', required: true },
      { key: 'client_id', label: 'ת.ז', type: 'text', section: 'basic' },
      { key: 'phone', label: 'טלפון', type: 'phone', section: 'basic' },
      { key: 'email', label: 'דוא"ל', type: 'email', section: 'basic' },
      { key: 'address', label: 'כתובת מגורים', type: 'textarea', section: 'basic' },
      { key: 'birth_date', label: 'תאריך לידה', type: 'date', section: 'basic' },
    ],
  },
  {
    id: 'transaction',
    name: 'פרטי עסקה',
    fields: [
      { key: 'signing_date', label: 'יום החתימה', type: 'date', section: 'transaction' },
      { key: 'plot_number', label: 'חלקה', type: 'text', section: 'transaction' },
      { key: 'block_number', label: 'גוש', type: 'text', section: 'transaction' },
      { key: 'area_sqm', label: 'מ"ר', type: 'number', section: 'transaction' },
      { key: 'transaction_amount', label: 'סך עסקה', type: 'number', section: 'transaction' },
      { key: 'legal_fee', label: 'שכ"ט', type: 'number', section: 'transaction' },
      { key: 'registration_expenses_before_vat', label: 'הוצאות רישום לפני מע"מ', type: 'number', section: 'transaction' },
      { key: 'fee_and_registration_before_vat', label: 'שכר טרחה + הוצאות רישום לפני מע"מ', type: 'number', section: 'transaction' },
      { key: 'registration_expenses_by_summary', label: 'הוצאות רישום לפי סיכום', type: 'number', section: 'transaction' },
      { key: 'fee_by_summary', label: 'שכ"ט לפי סיכום', type: 'number', section: 'transaction' },
      { key: 'shared_fee', label: 'שכ"ט (שיתוף)', type: 'number', section: 'transaction' },
      { key: 'transaction_name', label: 'שם העסקה', type: 'text', section: 'transaction' },
      { key: 'project_name', label: 'שם הפרויקט', type: 'text', section: 'transaction' },
      { key: 'buyer_count', label: 'מספר רוכשים בעסקה', type: 'number', section: 'transaction' },
    ],
  },
  {
    id: 'documents',
    name: 'מסמכים וקישורים',
    fields: [
      { key: 'id_scan', label: 'צילום ת.ז', type: 'url', section: 'documents' },
      { key: 'payment_request_document', label: 'מסמך - דרישת תשלום', type: 'url', section: 'documents' },
      { key: 'payment_request_link', label: 'לינק לדרישת תשלום', type: 'url', section: 'documents' },
      { key: 'signing_documents_word', label: 'מסמכים לחתימה - WORD', type: 'url', section: 'documents' },
      { key: 'signing_documents_pdf', label: 'מסמכים לחתימה - PDF', type: 'url', section: 'documents' },
      { key: 'signed_by_client_documents', label: 'מסמכים חתומים על ידי לקוח', type: 'url', section: 'documents' },
      { key: 'documents_for_lawyer_verification', label: 'מסמכים לאימות עו"ד', type: 'url', section: 'documents' },
      { key: 'verified_client_signed_documents', label: 'מסמכים חתומים על ידי לקוח מאומתים', type: 'url', section: 'documents' },
      { key: 'attachments_link', label: 'לינק לנספחים', type: 'url', section: 'documents' },
      { key: 'attachments_and_agreement_link', label: 'לינק לנספחים והסכם שיתוף', type: 'url', section: 'documents' },
      { key: 'signed_attachments_and_agreement', label: 'נספחים והסכם שיתוף חתומים', type: 'url', section: 'documents' },
      { key: 'company_seller_documents', label: 'מסמכי חברה/המוכר', type: 'url', section: 'documents' },
      { key: 'company_seller_signing_link', label: 'לינק לחתימת חברה/מוכר', type: 'url', section: 'documents' },
      { key: 'signed_by_company_seller_documents', label: 'מסמכים חתומים עי ידי חברה/מוכר', type: 'url', section: 'documents' },
      { key: 'verified_company_seller_signed_documents', label: 'מסמכים חתומים עי ידי חברה/מוכר מאומתים', type: 'url', section: 'documents' },
      { key: 'client_signing_link', label: 'לינק לחתימה עבור לקוח', type: 'url', section: 'documents' },
    ],
  },
  {
    id: 'dates',
    name: 'תאריכים ומועדים',
    fields: [
      { key: 'realization_date', label: 'מועד מימוש', type: 'date', section: 'dates' },
      { key: 'realization_number', label: 'מספר מימוש', type: 'text', section: 'dates' },
      { key: 'report_deadline', label: 'מועד לדיווח', type: 'date', section: 'dates' },
      { key: 'purchase_tax_payment_deadline', label: 'מועד לתשלום מס רכישה', type: 'date', section: 'dates' },
      { key: 'payment_request_sent_date', label: 'תאריך שליחת דרישת תשלום', type: 'date', section: 'dates' },
      { key: 'payment_request_deadline', label: 'מועד שליחת דרישת תשלום', type: 'date', section: 'dates' },
      { key: 'reminder_message3_date', label: 'מועד שליחת הודעה 3 (7 ימים)', type: 'date', section: 'dates' },
      { key: 'reminder_message4_date', label: 'מועד שליחת הודעה 4 (21 ימים)', type: 'date', section: 'dates' },
      { key: 'reminder_message5_date', label: 'מועד שליחת הודעה 5 (42 ימים)', type: 'date', section: 'dates' },
      { key: 'reminder_message6_date', label: 'מועד שליחת הודעה 6 (84 ימים)', type: 'date', section: 'dates' },
      { key: 'coordinated_call_payment_date', label: 'מועד מתואם שיחה/תשלום', type: 'date', section: 'dates' },
      { key: 'last_contact_date', label: 'תאריך יצירת קשר אחרון', type: 'date', section: 'dates' },
      { key: 'check_call_reminder', label: 'תזכורת לבדיקה/שיחה', type: 'date', section: 'dates' },
    ],
  },
  {
    id: 'status',
    name: 'סטטוסים וזרימת עבודה',
    fields: [
      { key: 'signing_status', label: 'סטטוס חתימה', type: 'text', section: 'status' },
      { key: 'fee_payment_status', label: 'תשלום שכר טרחה', type: 'text', section: 'status' },
      { key: 'realization_status', label: 'סטטוס מימוש', type: 'text', section: 'status' },
      { key: 'client_type', label: 'סוג לקוח', type: 'text', section: 'status' },
      { key: 'is_employee_or_self_employed', label: 'לסמן שכיר או עצמאי', type: 'boolean', section: 'status' },
      { key: 'full_transaction_details', label: 'מלא פרטי עסקה', type: 'boolean', section: 'status' },
      { key: 'has_improvement_levy', label: 'יש היטל השבחה?', type: 'boolean', section: 'status' },
      { key: 'whatsapp_sent', label: 'שליחת וואטסאפ', type: 'boolean', section: 'status' },
      { key: 'transfer_to_registration', label: 'העברה לרישום בעלות', type: 'boolean', section: 'status' },
      { key: 'transfer_to_ownership_registration', label: 'העברה לרישום בעלויות', type: 'boolean', section: 'status' },
      { key: 'transfer_to_appointments_board', label: 'העבר לבורד זימונים', type: 'boolean', section: 'status' },
      { key: 'group_transactions_after_realization', label: 'גרופ עסקאות לאחר מימוש', type: 'boolean', section: 'status' },
      { key: 'create_levy_board_item', label: 'יצירת איטם בורד היטלי השבחה', type: 'boolean', section: 'status' },
      { key: 'preparation_signature_document', label: 'הכן מסמך לחתימה דיגיטלית', type: 'boolean', section: 'status' },
      { key: 'create_client_signing_link', label: 'צור לינק לחתימת לקוח', type: 'boolean', section: 'status' },
      { key: 'create_attachments_link', label: 'צור לינק לנספחים', type: 'boolean', section: 'status' },
      { key: 'create_company_seller_link', label: 'צור לינק לחתימת חברה/מוכר', type: 'boolean', section: 'status' },
      { key: 'realization_completed_if_error', label: 'בוצע מימוש (אם הייתה שגיאה)', type: 'boolean', section: 'status' },
    ],
  },
  {
    id: 'components',
    name: 'רכיבי עסקה',
    fields: [
      { key: 'search_component', label: 'רכיב סיחור', type: 'text', section: 'components' },
      { key: 'land_component', label: 'רכיב קרקע', type: 'text', section: 'components' },
      { key: 'search_component_percent', label: 'שיעור רכיב סיחור %', type: 'number', section: 'components' },
      { key: 'land_component_text', label: 'רכיב קרקע במילים', type: 'text', section: 'components' },
      { key: 'search_component_text', label: 'רכיב סיחור במילים', type: 'text', section: 'components' },
      { key: 'transaction_amount_text', label: 'סך עסקה במילים', type: 'text', section: 'components' },
    ],
  },
  {
    id: 'integration',
    name: 'אינטגרציות ומזהים חיצוניים',
    fields: [
      { key: 'morning_client_id_company', label: 'ID לקוח במורנינג (חברה)', type: 'text', section: 'integration' },
      { key: 'morning_client_id_office', label: 'ID לקוח במורנינג (משרד)', type: 'text', section: 'integration' },
      { key: 'invoice_id', label: 'ID חשבונית', type: 'text', section: 'integration' },
      { key: 'invoice_source', label: 'מקור החשבונית', type: 'text', section: 'integration' },
      { key: 'morning_item_id', label: 'Item ID', type: 'text', section: 'integration' },
      { key: 'financial_client_created', label: 'צור לקוח בכספים', type: 'boolean', section: 'integration' },
      { key: 'morning_client_created', label: 'הקמת לקוח במורינג', type: 'boolean', section: 'integration' },
    ],
  },
  {
    id: 'users',
    name: 'משתמשים והקצאות',
    fields: [
      { key: 'lawyer_name', label: 'עו"ד (מחתים)', type: 'text', section: 'users' },
      { key: 'lawyer_name_general', label: 'עו"ד', type: 'text', section: 'users' },
      { key: 'authorized_signer_for_company', label: 'מורשה חתימה במקרה של חברה', type: 'text', section: 'users' },
      { key: 'agent_name', label: 'שם הסוכן', type: 'text', section: 'users' },
      { key: 'whatsapp_number', label: 'וואטסאפ', type: 'phone', section: 'users' },
    ],
  },
  {
    id: 'deadlines',
    name: 'מועדים וימים',
    fields: [
      { key: 'days_to_report', label: 'ימים לדיווח', type: 'number', section: 'deadlines' },
      { key: 'days_to_purchase_tax_payment', label: 'ימים לתשלום מס רכישה', type: 'number', section: 'deadlines' },
      { key: 'days_to_send_payment_request', label: 'ימים לשליחת לדרישת תשלום', type: 'number', section: 'deadlines' },
      { key: 'initiated_contact_attempts', label: 'מספר ניסיון התקשרות יזום', type: 'number', section: 'deadlines' },
    ],
  },
  {
    id: 'triggers',
    name: 'טריגרים',
    fields: [
      { key: 'date_trigger', label: 'טריגר תאריך', type: 'text', section: 'triggers' },
      { key: 'payment_request_date_trigger', label: 'טריגר להגדרת תאריך לדרישת תשלום', type: 'text', section: 'triggers' },
      { key: 'payment_request_send_trigger', label: 'טריגר לשליחת דרישת תשלום', type: 'text', section: 'triggers' },
      { key: 'create_financial_client_trigger', label: 'טריגר יצירת לקוח בכספים', type: 'text', section: 'triggers' },
      { key: 'reminder_message3_trigger', label: 'טריגר שליחת הודעה 3 (תזכורת)', type: 'text', section: 'triggers' },
      { key: 'reminder_message4_trigger', label: 'טריגר שליחת הודעה 4 (תזכורת)', type: 'text', section: 'triggers' },
      { key: 'reminder_message5_trigger', label: 'טריגר לשליחת הודעה 5 (תזכורת)', type: 'text', section: 'triggers' },
      { key: 'reminder_message6_trigger', label: 'טריגר לשליחת הודעה 6 (תזכורת)', type: 'text', section: 'triggers' },
    ],
  },
  {
    id: 'poa',
    name: 'ייפויי כח',
    fields: [
      { key: 'poa_share_agreement', label: 'ייפוי כח הסכם שיתוף', type: 'url', section: 'poa' },
      { key: 'poa_planning', label: 'ייפוי כח תכנוני', type: 'url', section: 'poa' },
    ],
  },
  {
    id: 'collection',
    name: 'גבייה ותשלומים',
    fields: [
      { key: 'non_payment_reason', label: 'סיבת אי תשלום', type: 'text', section: 'collection' },
      { key: 'plot_value', label: 'מגרש תמורה', type: 'number', section: 'collection' },
      { key: 'collection_notes', label: 'הערות גבייה', type: 'textarea', section: 'collection' },
    ],
  },
  {
    id: 'other',
    name: 'אחר',
    fields: [
      { key: 'additional_buyer_details', label: 'פרטי רוכש נוספים בעסקה', type: 'textarea', section: 'other' },
      { key: 'membership_request', label: 'בקשת הצטרפות', type: 'text', section: 'other' },
      { key: 'fee_agreement', label: 'הסכם שכ"ט', type: 'text', section: 'other' },
      { key: 'client_recognition_form', label: 'טופס הכרת לקוח', type: 'text', section: 'other' },
      { key: 'identification_mark', label: 'סימן זיהוי', type: 'text', section: 'other' },
      { key: 'action_confirmation_ea', label: 'אישור ביצוע פעולה הע"א', type: 'text', section: 'other' },
      { key: 'ea_registration_status', label: 'סטטוס רישום הע"א', type: 'text', section: 'other' },
      { key: 'page_spread', label: 'פריסת העמודים', type: 'text', section: 'other' },
    ],
  },
]

// Helper function to get field definition by key
export function getFieldDefinition(key: string): FieldDefinition | undefined {
  for (const section of LEAD_FIELD_SECTIONS) {
    const field = section.fields.find(f => f.key === key)
    if (field) return field
  }
  return undefined
}

// Helper function to get all fields as a flat array
export function getAllFields(): FieldDefinition[] {
  return LEAD_FIELD_SECTIONS.flatMap(section => section.fields)
}

// Helper function to format field value for display
export function formatFieldValue(value: any, field: FieldDefinition): string {
  if (value === null || value === undefined || value === '') {
    return 'לא מוגדר'
  }

  switch (field.type) {
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('he-IL')
      }
      if (typeof value === 'string') {
        try {
          return new Date(value).toLocaleDateString('he-IL')
        } catch {
          return value
        }
      }
      return String(value)
    case 'number':
      if (typeof value === 'number') {
        return value.toLocaleString('he-IL')
      }
      return String(value)
    case 'boolean':
      return value ? 'כן' : 'לא'
    case 'url':
      return value
    default:
      return String(value)
  }
}

