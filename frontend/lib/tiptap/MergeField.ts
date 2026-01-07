import { Node, mergeAttributes } from '@tiptap/core'

export interface MergeFieldOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mergeField: {
      /**
       * Insert a merge field
       */
      insertMergeField: (fieldKey: string) => ReturnType
    }
  }
}

export const MergeField = Node.create<MergeFieldOptions>({
  name: 'mergeField',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      fieldKey: {
        default: null,
        parseHTML: element => element.getAttribute('data-field-key'),
        renderHTML: attributes => {
          if (!attributes.fieldKey) {
            return {}
          }
          return {
            'data-field-key': attributes.fieldKey,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-merge-field]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false
          return {
            fieldKey: element.getAttribute('data-field-key'),
          }
        },
      },
      // Also parse {{lead.field_key}} syntax from plain text
      {
        tag: 'p',
        getAttrs: (element) => {
          if (typeof element === 'string') return false
          const text = element.textContent || ''
          const match = text.match(/\{\{lead\.(\w+)\}\}/)
          if (match && match[1]) {
            return {
              fieldKey: match[1],
            }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const fieldKey = HTMLAttributes['data-field-key'] || HTMLAttributes.fieldKey
    if (!fieldKey) return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
    
    // Render as a span with data attributes for editor display
    // The actual {{lead.field_key}} text will be extracted during serialization
    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-merge-field': 'true',
          'data-field-key': fieldKey,
          class: 'merge-field',
          contenteditable: 'false',
        }
      ),
      `{{lead.${fieldKey}}}`,
    ]
  },

  addCommands() {
    return {
      insertMergeField:
        (fieldKey: string) =>
        ({ commands, state, tr }) => {
          // Insert as HTML content that will be parsed by parseHTML
          const html = `<span data-merge-field="true" data-field-key="${fieldKey}" class="merge-field">{{lead.${fieldKey}}}</span>`;
          return commands.insertContent(html);
        },
    }
  },
})

