"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import EditorToolbar from "./EditorToolbar";
import { FontSize } from "@/lib/tiptap/FontSize";
import { MergeField } from "@/lib/tiptap/MergeField";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  onAddSignatureBlock?: (type: 'client' | 'internal') => void;
}

export interface TipTapEditorRef {
  getEditor: () => ReturnType<typeof useEditor>;
}

const TipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(
  ({ content, onChange, placeholder = "התחל להקליד...", editable = true, onAddSignatureBlock }, ref) => {
  const isUpdatingFromProps = useRef(false);
  
  // Helper function to convert {{lead.field_key}} to merge field nodes
  const convertMergeFieldsToNodes = (htmlContent: string): string => {
    // Convert {{lead.field_key}} syntax to HTML spans that the MergeField extension can parse
    return htmlContent.replace(
      /\{\{lead\.(\w+)\}\}/g,
      '<span data-merge-field="true" data-field-key="$1" class="merge-field">{{lead.$1}}</span>'
    );
  };

  // Convert merge field nodes back to {{lead.field_key}} syntax
  const convertMergeFieldsToText = (html: string): string => {
    // Replace merge field spans with {{lead.field_key}} syntax
    return html.replace(
      /<span[^>]*data-merge-field="true"[^>]*data-field-key="([^"]+)"[^>]*>([^<]*)<\/span>/gi,
      '{{lead.$1}}'
    );
  };
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading since we're using font size instead
        heading: false,
        // Disable link and underline from StarterKit since we're adding them explicitly
        link: false,
        underline: false,
        // Keep paste rules enabled to handle rich text paste
      }),
      TextStyle, // Must be before FontSize
      FontSize, // Depends on TextStyle
      MergeField, // Merge fields extension
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
        defaultAlignment: 'right', // RTL default
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    immediatelyRender: false, // Fix SSR hydration mismatch
      editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 rtl",
        dir: "rtl",
        style: "direction: rtl; text-align: right;",
      },
      // Transform pasted HTML to clean up Google Docs markup while preserving formatting
      transformPastedHTML: (html) => {
        // TipTap automatically handles HTML paste, but we clean up Google Docs specific markup
        // while preserving formatting styles
        let cleaned = html;
        
        // Remove Google Docs specific style tags (but keep inline styles)
        cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        
        // Remove Google Docs specific classes but keep inline styles
        cleaned = cleaned.replace(/class="[^"]*"/gi, '');
        
        // Remove Google Docs span wrappers but preserve their style attributes
        cleaned = cleaned.replace(/<span[^>]*style="([^"]*)"[^>]*>/gi, (match, style) => {
          // Preserve important formatting styles
          const importantStyles = ['color', 'font-weight', 'font-size', 'font-style', 'text-decoration'];
          const preserved = style
            .split(';')
            .filter((s: string) => {
              const prop = s.split(':')[0]?.trim().toLowerCase();
              return importantStyles.some(important => prop?.startsWith(important));
            })
            .join(';');
          return preserved ? `<span style="${preserved}">` : '';
        });
        
        // Clean up empty spans
        cleaned = cleaned.replace(/<span[^>]*><\/span>/gi, '');
        
        return cleaned;
      },
    },
    onUpdate: ({ editor }) => {
      // Don't trigger onChange if we're updating from props
      if (!isUpdatingFromProps.current) {
        const html = editor.getHTML();
        // Convert merge field nodes back to {{lead.field_key}} syntax
        const serialized = convertMergeFieldsToText(html);
        onChange(serialized);
      }
    },
  });

    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
    }));

    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        isUpdatingFromProps.current = true;
        // Convert {{lead.field_key}} syntax to merge field nodes before setting content
        const processedContent = convertMergeFieldsToNodes(content);
        editor.commands.setContent(processedContent);
        // Reset flag after a short delay to allow the update to complete
        setTimeout(() => {
          isUpdatingFromProps.current = false;
        }, 0);
      }
    }, [content, editor]);

    if (!editor) {
      return null;
    }

    return (
      <div className="border border-gray-300 rounded-lg bg-white" dir="rtl">
        {editable && <EditorToolbar editor={editor} onAddSignatureBlock={onAddSignatureBlock} />}
        <EditorContent editor={editor} />
      </div>
    );
  }
);

TipTapEditor.displayName = "TipTapEditor";

export default TipTapEditor;

