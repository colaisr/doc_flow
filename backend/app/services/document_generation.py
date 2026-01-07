"""
Document generation service - handles merge field replacement and document rendering
"""
import re
import html
from typing import Dict, Any, Optional
from app.models.document_template import DocumentTemplate
from app.models.lead import Lead


def get_lead_field_value(lead: Lead, field_key: str) -> str:
    """
    Get a field value from a Lead object by field key.
    Returns empty string if field doesn't exist or value is None.
    """
    # Get attribute value
    value = getattr(lead, field_key, None)
    
    # Handle None values
    if value is None:
        return ""
    
    # Convert to string
    if isinstance(value, str):
        return value
    elif isinstance(value, (int, float)):
        return str(value)
    elif hasattr(value, 'isoformat'):  # Date/datetime objects
        return value.isoformat()
    elif isinstance(value, bool):
        return "כן" if value else "לא"  # Hebrew: Yes/No
    else:
        return str(value)


def escape_html(text: str) -> str:
    """
    Escape HTML special characters to prevent XSS attacks.
    """
    return html.escape(str(text))


def replace_merge_fields(content: str, lead: Lead) -> str:
    """
    Replace merge fields in template content with actual lead values.
    
    Pattern: {{lead.field_key}}
    
    Args:
        content: HTML template content with merge fields
        lead: Lead object with field values
    
    Returns:
        HTML content with merge fields replaced
    """
    # Pattern to match {{lead.field_key}}
    pattern = r'\{\{lead\.(\w+)\}\}'
    
    def replace_match(match: re.Match) -> str:
        field_key = match.group(1)
        field_value = get_lead_field_value(lead, field_key)
        # HTML escape the value to prevent XSS
        escaped_value = escape_html(field_value)
        return escaped_value
    
    # Replace all merge fields
    rendered_content = re.sub(pattern, replace_match, content)
    
    return rendered_content


def preserve_signature_blocks(rendered_content: str, signature_blocks_json: Optional[str] = None) -> str:
    """
    Ensure signature blocks are preserved in rendered content.
    
    Note: Signature blocks are stored separately in the document model,
    but we need to ensure the HTML structure can accommodate them.
    For now, this function just returns the content as-is since signature
    blocks are handled separately in the frontend/document view.
    
    Args:
        rendered_content: Rendered HTML content
        signature_blocks_json: JSON string with signature block metadata (optional)
    
    Returns:
        HTML content (unchanged for now, signature blocks handled separately)
    """
    # Signature blocks are rendered separately in the frontend,
    # so we just return the content as-is
    return rendered_content


def generate_document_title(template: DocumentTemplate, lead: Lead) -> str:
    """
    Generate document title from template name and lead info.
    
    Format: "{template_name} - {lead.full_name}"
    """
    lead_name = get_lead_field_value(lead, "full_name")
    if lead_name:
        return f"{template.name} - {lead_name}"
    return template.name


def generate_document_content(template: DocumentTemplate, lead: Lead) -> str:
    """
    Generate complete document content from template and lead.
    
    This is the main function that:
    1. Replaces merge fields with lead values
    2. Preserves signature blocks structure
    3. Ensures RTL direction is preserved
    4. HTML escapes values for security
    
    Args:
        template: DocumentTemplate object
        lead: Lead object with field values
    
    Returns:
        Rendered HTML content with all merge fields replaced
    """
    # Start with template content
    content = template.content
    
    # Replace merge fields
    rendered_content = replace_merge_fields(content, lead)
    
    # Preserve signature blocks (they're handled separately, but ensure structure is OK)
    rendered_content = preserve_signature_blocks(rendered_content, template.signature_blocks)
    
    # Ensure RTL direction is preserved
    # Check if content already has dir="rtl" in root element
    if 'dir="rtl"' not in rendered_content and "dir='rtl'" not in rendered_content:
        # Wrap in div with RTL direction if not present
        # Note: This is a simple approach - templates should ideally include dir="rtl" themselves
        if not rendered_content.strip().startswith('<'):
            # If content doesn't start with HTML tag, wrap it
            rendered_content = f'<div dir="rtl">{rendered_content}</div>'
    
    return rendered_content


def validate_merge_fields(content: str, lead: Lead) -> Dict[str, Any]:
    """
    Validate that all merge fields in content can be resolved from lead.
    
    Returns:
        Dictionary with 'valid': bool, 'missing_fields': list, 'all_fields': list
    """
    pattern = r'\{\{lead\.(\w+)\}\}'
    found_fields = set(re.findall(pattern, content))
    
    missing_fields = []
    for field_key in found_fields:
        value = getattr(lead, field_key, None)
        # Field is considered missing if attribute doesn't exist
        # (None values are OK - they'll be replaced with empty string)
        if not hasattr(lead, field_key):
            missing_fields.append(field_key)
    
    return {
        'valid': len(missing_fields) == 0,
        'missing_fields': missing_fields,
        'all_fields': list(found_fields),
    }

