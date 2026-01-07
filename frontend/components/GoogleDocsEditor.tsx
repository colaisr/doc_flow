"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useState } from "react";
import { FontSize } from "@/lib/tiptap/FontSize";
import { MergeField } from "@/lib/tiptap/MergeField";
import GoogleDocsToolbar from "./GoogleDocsToolbar";
import DocumentOverlay from "./DocumentOverlay";
import { SignatureBlock, DEFAULT_SIGNATURE_BLOCK_WIDTH, DEFAULT_SIGNATURE_BLOCK_HEIGHT, createSignatureBlock } from "@/lib/signatureBlocks";

interface GoogleDocsEditorProps {
  content: string;
  onChange: (content: string) => void;
  signatureBlocks?: SignatureBlock[];
  onSignatureBlocksUpdate?: (blocks: SignatureBlock[]) => void;
  placeholder?: string;
}

export interface GoogleDocsEditorRef {
  getEditor: () => ReturnType<typeof useEditor>;
}

// A4 page dimensions in pixels (at 96 DPI)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794; // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI
const PAGE_PADDING_PX = 64; // 16 * 4 = 64px (p-16)
const CONTENT_HEIGHT_PX = A4_HEIGHT_PX - (PAGE_PADDING_PX * 2); // Height minus padding

const GoogleDocsEditor = forwardRef<GoogleDocsEditorRef, GoogleDocsEditorProps>(
  ({ content, onChange, signatureBlocks = [], onSignatureBlocksUpdate, placeholder = "התחל להקליד..." }, ref) => {
  const isUpdatingFromProps = useRef(false);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(A4_HEIGHT_PX);
  
  // Calculate number of pages needed based on content height
  const numPages = Math.max(1, Math.ceil(contentHeight / CONTENT_HEIGHT_PX));

  // Handle adding a new signature block - centered on the first visible page
  const handleAddSignatureBlock = useCallback(() => {
    if (!onSignatureBlocksUpdate || !editorContentRef.current) return;
    
    // Center on first page (accounting for padding)
    const x = Math.floor((A4_WIDTH_PX - PAGE_PADDING_PX * 2 - DEFAULT_SIGNATURE_BLOCK_WIDTH) / 2);
    const y = Math.floor((CONTENT_HEIGHT_PX - DEFAULT_SIGNATURE_BLOCK_HEIGHT) / 2);
    
    const newBlock = createSignatureBlock(x, y);
    onSignatureBlocksUpdate([...signatureBlocks, newBlock]);
  }, [signatureBlocks, onSignatureBlocksUpdate]);
  
  // Helper function to convert {{lead.field_key}} to merge field nodes
  const convertMergeFieldsToNodes = (htmlContent: string): string => {
    return htmlContent.replace(
      /\{\{lead\.(\w+)\}\}/g,
      '<span data-merge-field="true" data-field-key="$1" class="merge-field">{{lead.$1}}</span>'
    );
  };

  // Convert merge field nodes back to {{lead.field_key}} syntax
  const convertMergeFieldsToText = (html: string): string => {
    return html.replace(
      /<span[^>]*data-merge-field="true"[^>]*data-field-key="([^"]+)"[^>]*>([^<]*)<\/span>/gi,
      '{{lead.$1}}'
    );
  };
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        link: false,
        underline: false,
      }),
      TextStyle,
      FontSize,
      MergeField,
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
        defaultAlignment: 'right',
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
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none",
        style: `width: ${A4_WIDTH_PX - PAGE_PADDING_PX * 2}px; padding: ${PAGE_PADDING_PX}px; margin: 0 auto;`,
      },
      transformPastedHTML: (html) => {
        let cleaned = html;
        cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        cleaned = cleaned.replace(/class="[^"]*"/gi, '');
        cleaned = cleaned.replace(/<span[^>]*style="([^"]*)"[^>]*>/gi, (match, style) => {
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
        cleaned = cleaned.replace(/<span[^>]*><\/span>/gi, '');
        return cleaned;
      },
    },
    onUpdate: ({ editor }) => {
      if (!isUpdatingFromProps.current) {
        const html = editor.getHTML();
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
      const processedContent = convertMergeFieldsToNodes(content);
      editor.commands.setContent(processedContent);
      setTimeout(() => {
        isUpdatingFromProps.current = false;
      }, 0);
    }
  }, [content, editor]);

  // Track content height to determine number of pages
  useEffect(() => {
    if (!editor || !editorContentRef.current) return;
    
    const updateHeight = () => {
      if (editorContentRef.current) {
        // Get the actual rendered height of the editor content
        const height = editorContentRef.current.scrollHeight;
        // Only update if height actually changed (to avoid infinite loops)
        setContentHeight(prev => {
          if (Math.abs(prev - height) > 1) {
            return height;
          }
          return prev;
        });
      }
    };
    
    // Use ResizeObserver to track content changes
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to update after render
      requestAnimationFrame(updateHeight);
    });
    
    // Also listen to editor updates
    const updateHandler = () => {
      requestAnimationFrame(updateHeight);
    };
    
    if (editorContentRef.current) {
      resizeObserver.observe(editorContentRef.current);
      editor.on('update', updateHandler);
      editor.on('selectionUpdate', updateHandler);
      // Initial height calculation
      requestAnimationFrame(updateHeight);
    }
    
    return () => {
      resizeObserver.disconnect();
      editor.off('update', updateHandler);
      editor.off('selectionUpdate', updateHandler);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <GoogleDocsToolbar 
        editor={editor} 
        onAddSignatureBlock={handleAddSignatureBlock}
      />
      
      {/* Document Container - Google Docs style */}
      <div className="flex-1 overflow-auto bg-gray-100 py-8">
        <div className="flex justify-center">
          {/* Document wrapper */}
          <div
            className="relative bg-white shadow-lg"
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              maxWidth: '100%',
            }}
          >
            {/* Editor Content */}
            <div
              ref={editorContentRef}
              style={{
                width: `${A4_WIDTH_PX - PAGE_PADDING_PX * 2}px`,
                padding: `${PAGE_PADDING_PX}px`,
                margin: '0 auto',
                minHeight: `${CONTENT_HEIGHT_PX}px`,
              }}
            >
              <EditorContent editor={editor} />
            </div>

            {/* Page break lines - visual indicators */}
            {Array.from({ length: numPages - 1 }).map((_, breakIndex) => (
              <div
                key={`break-${breakIndex}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${(breakIndex + 1) * A4_HEIGHT_PX}px`,
                }}
              >
                {/* Gray gap between pages */}
                <div 
                  className="bg-gray-100 flex items-center justify-center"
                  style={{ height: '24px' }}
                >
                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                    סוף עמוד {breakIndex + 1} — עמוד {breakIndex + 2}
                  </span>
                </div>
              </div>
            ))}

            {/* Document Overlay - for signature blocks */}
            {onSignatureBlocksUpdate && (
              <DocumentOverlay
                signatureBlocks={signatureBlocks}
                onSignatureBlocksUpdate={onSignatureBlocksUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

GoogleDocsEditor.displayName = "GoogleDocsEditor";

export default GoogleDocsEditor;

