"""
Lead model for CRM functionality.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    # ========== Core/System Fields ==========
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey('lead_stages.id'), nullable=False, index=True)
    assigned_user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    source = Column(String(50), nullable=False, default='manual')  # 'manual' or 'form'
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ========== Basic Information Fields ==========
    full_name = Column(String(255), nullable=False)  # Required - שם
    client_id = Column(String(50), nullable=True)  # ת"ז
    phone = Column(String(50), nullable=True)  # טלפון
    address = Column(Text, nullable=True)  # כתובת מגורים
    email = Column(String(255), nullable=True)  # דוא"ל
    birth_date = Column(Date, nullable=True)  # תאריך לידה

    # ========== Transaction Details Fields ==========
    signing_date = Column(Date, nullable=True)  # יום החתימה
    plot_number = Column(String(50), nullable=True)  # חלקה
    block_number = Column(String(50), nullable=True)  # גוש
    area_sqm = Column(Numeric(10, 2), nullable=True)  # מ"ר
    transaction_amount = Column(Numeric(15, 2), nullable=True)  # סך עסקה
    legal_fee = Column(Numeric(15, 2), nullable=True)  # שכ"ט
    registration_expenses_before_vat = Column(Numeric(15, 2), nullable=True)  # הוצאות רישום לפני מע"מ
    fee_and_registration_before_vat = Column(Numeric(15, 2), nullable=True)  # שכר טרחה + הוצאות רישום לפני מע"מ
    registration_expenses_by_summary = Column(Numeric(15, 2), nullable=True)  # הוצאות רישום לפי סיכום
    fee_by_summary = Column(Numeric(15, 2), nullable=True)  # שכ"ט לפי סיכום
    shared_fee = Column(Numeric(15, 2), nullable=True)  # שכ"ט (שיתוף)
    transaction_name = Column(String(255), nullable=True)  # שם העסקה

    # ========== Document & Status Fields ==========
    id_scan = Column(String(500), nullable=True)  # צילום ת.ז (URL or path)
    search_component = Column(String(255), nullable=True)  # רכיב סיחור
    land_component = Column(String(255), nullable=True)  # רכיב קרקע
    land_component_text = Column(String(500), nullable=True)  # רכיב קרקע במילים
    search_component_text = Column(String(500), nullable=True)  # רכיב סיחור במילים
    transaction_amount_text = Column(String(500), nullable=True)  # סך עסקה במילים
    search_component_percent = Column(Numeric(5, 2), nullable=True)  # שיעור רכיב סיחור %
    additional_buyer_details = Column(Text, nullable=True)  # פרטי רוכש נוספים בעסקה
    membership_request = Column(String(255), nullable=True)  # בקשת הצטרפות
    fee_agreement = Column(String(255), nullable=True)  # הסכם שכ"ט
    client_recognition_form = Column(String(255), nullable=True)  # טופס הכרת לקוח
    signing_status = Column(String(100), nullable=True)  # סטטוס חתימה
    fee_payment_status = Column(String(100), nullable=True)  # תשלום שכר טרחה
    project_name = Column(String(255), nullable=True)  # שם הפרויקט
    buyer_count = Column(Integer, nullable=True)  # מספר רוכשים בעסקה

    # ========== Date & Deadline Fields ==========
    realization_date = Column(Date, nullable=True)  # מועד מימוש
    realization_number = Column(String(50), nullable=True)  # מספר מימוש
    realization_status = Column(String(100), nullable=True)  # סטטוס מימוש
    has_improvement_levy = Column(Boolean, nullable=True)  # יש היטל השבחה?
    days_to_report = Column(Integer, nullable=True)  # ימים לדיווח
    days_to_purchase_tax_payment = Column(Integer, nullable=True)  # ימים לתשלום מס רכישה
    report_deadline = Column(Date, nullable=True)  # מועד לדיווח
    purchase_tax_payment_deadline = Column(Date, nullable=True)  # מועד לתשלום מס רכישה
    payment_request_sent_date = Column(Date, nullable=True)  # תאריך שליחת דרישת תשלום
    days_to_send_payment_request = Column(Integer, nullable=True)  # ימים לשליחת לדרישת תשלום
    payment_request_deadline = Column(Date, nullable=True)  # מועד שליחת דרישת תשלום

    # ========== Trigger Fields ==========
    date_trigger = Column(String(255), nullable=True)  # טריגר תאריך
    payment_request_date_trigger = Column(String(255), nullable=True)  # טריגר להגדרת תאריך לדרישת תשלום
    payment_request_send_trigger = Column(String(255), nullable=True)  # טריגר לשליחת דרישת תשלום
    reminder_message3_trigger = Column(String(255), nullable=True)  # טריגר שליחת הודעה 3 (תזכורת)
    reminder_message4_trigger = Column(String(255), nullable=True)  # טריגר שליחת הודעה 4 (תזכורת)
    reminder_message5_trigger = Column(String(255), nullable=True)  # טריגר לשליחת הודעה 5 (תזכורת)
    reminder_message6_trigger = Column(String(255), nullable=True)  # טריגר לשליחת הודעה 6 (תזכורת)

    # ========== Integration & External ID Fields ==========
    morning_client_id_company = Column(String(100), nullable=True)  # ID לקוח במורנינג (חברה)
    morning_client_id_office = Column(String(100), nullable=True)  # ID לקוח במורנינג (משרד)
    invoice_id = Column(String(100), nullable=True)  # ID חשבונית
    invoice_source = Column(String(255), nullable=True)  # מקור החשבונית
    morning_item_id = Column(String(100), nullable=True)  # Item ID
    financial_client_created = Column(Boolean, nullable=True)  # צור לקוח בכספים
    morning_client_created = Column(Boolean, nullable=True)  # הקמת לקוח במורינג

    # ========== Document Link Fields ==========
    payment_request_document = Column(String(500), nullable=True)  # מסמך - דרישת תשלום
    payment_request_link = Column(String(500), nullable=True)  # לינק לדרישת תשלום
    signing_documents_word = Column(String(500), nullable=True)  # מסמכים לחתימה - WORD
    signing_documents_pdf = Column(String(500), nullable=True)  # מסמכים לחתימה - PDF
    signed_by_client_documents = Column(String(500), nullable=True)  # מסמכים חתומים על ידי לקוח
    documents_for_lawyer_verification = Column(String(500), nullable=True)  # מסמכים לאימות עו"ד
    verified_client_signed_documents = Column(String(500), nullable=True)  # מסמכים חתומים על ידי לקוח מאומתים
    attachments_link = Column(String(500), nullable=True)  # לינק לנספחים
    attachments_and_agreement_link = Column(String(500), nullable=True)  # לינק לנספחים והסכם שיתוף
    signed_attachments_and_agreement = Column(String(500), nullable=True)  # נספחים והסכם שיתוף חתומים
    company_seller_documents = Column(String(500), nullable=True)  # מסמכי חברה/המוכר
    company_seller_signing_link = Column(String(500), nullable=True)  # לינק לחתימת חברה/מוכר
    signed_by_company_seller_documents = Column(String(500), nullable=True)  # מסמכים חתומים עי ידי חברה/מוכר
    verified_company_seller_signed_documents = Column(String(500), nullable=True)  # מסמכים חתומים עי ידי חברה/מוכר מאומתים

    # ========== User & Assignment Fields ==========
    lawyer_name = Column(String(255), nullable=True)  # עו"ד (מחתים)
    lawyer_name_general = Column(String(255), nullable=True)  # עו"ד
    authorized_signer_for_company = Column(String(255), nullable=True)  # מורשה חתימה במקרה של חברה
    agent_name = Column(String(255), nullable=True)  # שם הסוכן
    whatsapp_number = Column(String(50), nullable=True)  # וואטסאפ

    # ========== Status & Workflow Fields ==========
    client_type = Column(String(100), nullable=True)  # סוג לקוח
    is_employee_or_self_employed = Column(Boolean, nullable=True)  # לסמן שכיר או עצמאי
    full_transaction_details = Column(Boolean, nullable=True)  # מלא פרטי עסקה
    whatsapp_sent = Column(Boolean, nullable=True)  # שליחת וואטסאפ
    transfer_to_registration = Column(Boolean, nullable=True)  # העברה לרישום בעלות
    transfer_to_ownership_registration = Column(Boolean, nullable=True)  # העברה ל״רישום בעלויות״
    transfer_to_appointments_board = Column(Boolean, nullable=True)  # העבר לבורד זימונים
    group_transactions_after_realization = Column(Boolean, nullable=True)  # גרופ עסקאות לאחר מימוש
    create_levy_board_item = Column(Boolean, nullable=True)  # יצירת איטם בורד היטלי השבחה
    create_financial_client_trigger = Column(String(255), nullable=True)  # טריגר יצירת לקוח בכספים

    # ========== Power of Attorney Fields ==========
    poa_share_agreement = Column(String(500), nullable=True)  # ייפוי כח הסכם שיתוף
    poa_planning = Column(String(500), nullable=True)  # ייפוי כח תכנוני

    # ========== Collection & Payment Fields ==========
    non_payment_reason = Column(String(255), nullable=True)  # סיבת אי תשלום
    coordinated_call_payment_date = Column(Date, nullable=True)  # מועד מתואם שיחה/תשלום
    initiated_contact_attempts = Column(Integer, nullable=True)  # מספר ניסיון התקשרות יזום
    last_contact_date = Column(Date, nullable=True)  # תאריך יצירת קשר אחרון
    collection_notes = Column(Text, nullable=True)  # הערות גבייה
    plot_value = Column(Numeric(15, 2), nullable=True)  # מגרש תמורה
    realization_completed_if_error = Column(Boolean, nullable=True)  # בוצע מימוש ( אם הייתה שגיאה)

    # ========== Message Reminder Fields ==========
    reminder_message3_date = Column(Date, nullable=True)  # מועד שליחת הודעה 3 (7 ימים)
    reminder_message4_date = Column(Date, nullable=True)  # מועד שליחת הודעה 4 (21 ימים)
    reminder_message5_date = Column(Date, nullable=True)  # מועד שליחת הודעה 5 (42 ימים)
    reminder_message6_date = Column(Date, nullable=True)  # מועד שליחת הודעה 6 (84 ימים)

    # ========== Other Fields ==========
    check_call_reminder = Column(Date, nullable=True)  # תזכורת לבדיקה/שיחה
    preparation_signature_document = Column(Boolean, nullable=True)  # הכן מסמך לחתימה דיגיטלית
    create_client_signing_link = Column(Boolean, nullable=True)  # צור לינק לחתימת לקוח
    client_signing_link = Column(String(500), nullable=True)  # לינק לחתימה עבור לקוח
    create_attachments_link = Column(Boolean, nullable=True)  # צור לינק לנספחים
    create_company_seller_link = Column(Boolean, nullable=True)  # צור לינק לחתימת חברה/מוכר
    identification_mark = Column(String(255), nullable=True)  # סימן זיהוי
    action_confirmation_ea = Column(String(255), nullable=True)  # אישור ביצוע פעולה הע"א
    ea_registration_status = Column(String(255), nullable=True)  # סטטוס רישום הע"א
    page_spread = Column(String(255), nullable=True)  # פריסת העמודים

    # ========== Relationships ==========
    organization = relationship("Organization", foreign_keys=[organization_id])
    stage = relationship("LeadStage", foreign_keys=[stage_id], back_populates="leads")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    stage_history = relationship("LeadStageHistory", back_populates="lead", order_by="LeadStageHistory.changed_at")
    documents = relationship("Document", back_populates="lead", cascade="all, delete-orphan")

