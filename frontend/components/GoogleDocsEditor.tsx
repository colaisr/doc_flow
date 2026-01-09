"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
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
  uploadPDF: (file: File) => Promise<void>;
}

// Extend TipTap Image: add a marker attribute so we can style PDF pages (only) via CSS.
const PdfImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      pdfPage: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-pdf-page"),
        renderHTML: (attrs) => (attrs.pdfPage ? { "data-pdf-page": attrs.pdfPage } : {}),
      },
    };
  },
});

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
    
    // Center on first page - coordinates are relative to page wrapper (not content area)
    // Content area is 666px wide (794 - 128), centered in 794px page = starts at 64px
    // To center a 200px block in content area: center at 64 + 333 = 397px, block left at 397 - 100 = 297px
    const contentAreaWidth = A4_WIDTH_PX - PAGE_PADDING_PX * 2;
    const contentAreaHeight = CONTENT_HEIGHT_PX;
    const x = Math.floor(PAGE_PADDING_PX + (contentAreaWidth - DEFAULT_SIGNATURE_BLOCK_WIDTH) / 2);
    const y = Math.floor(PAGE_PADDING_PX + (contentAreaHeight - DEFAULT_SIGNATURE_BLOCK_HEIGHT) / 2);
    
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
        types: ['paragraph', 'image'],
        defaultAlignment: 'right',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      PdfImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          // Default image behavior. PDF pages are styled via CSS using [data-pdf-page].
          style: 'display: block; max-width: 100%; height: auto;',
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

  const uploadPDF = useCallback(async (file: File) => {
    if (!editor || typeof window === 'undefined') return;

    try {
      console.log('Starting PDF upload for file:', file.name, file.size);
      
      // Dynamically import pdfjs-dist only on client side
      let pdfjsLib;
      try {
        // For v3.x, the default export should work
        const pdfjsModule = await import('pdfjs-dist');
        // In v3.x, getDocument and other methods are on the module itself
        pdfjsLib = pdfjsModule;
        console.log('PDF.js loaded successfully, version:', pdfjsLib.version);
      } catch (importError: any) {
        console.error('Failed to import pdfjs-dist:', importError);
        console.error('Import error details:', {
          message: importError?.message,
          stack: importError?.stack,
          name: importError?.name
        });
        throw new Error('Failed to load PDF processing library. Please refresh the page and try again.');
      }
      
      // Configure pdf.js worker (must be done after import and only once)
      if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
        // Use jsdelivr CDN which is more reliable and has better CORS support
        // Use the actual installed version
        const version = pdfjsLib.version || '3.11.174';
        // For version 3.x, use the standard build path
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.js`;
        console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      }

      console.log('Reading PDF file...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('PDF file read, size:', arrayBuffer.byteLength);
      
      console.log('Parsing PDF document...');
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0, // Suppress warnings
      }).promise;
      const numPages = pdf.numPages;
      console.log('PDF parsed successfully, pages:', numPages);

      // Calculate content area dimensions (A4 page minus padding)
      const contentAreaWidth = A4_WIDTH_PX - PAGE_PADDING_PX * 2; // 666px
      const contentAreaHeight = A4_HEIGHT_PX - PAGE_PADDING_PX * 2; // 995px
      
      // Use full dimensions to make images fill the page completely
      // Images will be scaled to fill the width, and height will be proportional
      const maxImageWidth = contentAreaWidth; // 666px - fill full width
      const maxImageHeight = contentAreaHeight; // 995px - max height that fits
      
      // Render ALL pages and set the editor content in one transaction (stable, no spacing drift).
      const pageImageUrls: string[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const initialViewport = page.getViewport({ scale: 1.0 });

        // Render at A4 width for good quality (will be stretched to exact A4 by CSS anyway).
        const scale = A4_WIDTH_PX / initialViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({ canvasContext: context, viewport }).promise;

        pageImageUrls.push(canvas.toDataURL('image/png'));
      }

      // Build a TipTap doc: one paragraph per PDF page, each containing one image node.
      // No extra paragraphs => no unexpected gaps; CSS handles exact A4 sizing/alignment.
      editor.commands.setContent({
        type: 'doc',
        content: pageImageUrls.map((src, idx) => ({
          type: 'paragraph',
          content: [
            {
              type: 'image',
              attrs: {
                src,
                alt: `PDF Page ${idx + 1}`,
                pdfPage: String(idx + 1),
              },
            },
          ],
        })),
      } as any);

      console.log(`Inserted ${pageImageUrls.length} PDF pages.`);
      console.log('PDF upload completed successfully');
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      
      let errorMessage = 'שגיאה בטעינת הקובץ PDF. אנא נסה שוב.';
      
      if (error?.message) {
        if (error.message.includes('Invalid PDF')) {
          errorMessage = 'הקובץ שנבחר אינו קובץ PDF תקין. אנא נסה עם קובץ אחר.';
        } else if (error.message.includes('worker')) {
          errorMessage = 'שגיאה בטעינת ספריית עיבוד PDF. אנא רענן את הדף ונסה שוב.';
        } else if (error.message.includes('Failed to load')) {
          errorMessage = 'שגיאה בטעינת ספריית עיבוד PDF. אנא רענן את הדף ונסה שוב.';
        } else {
          errorMessage = `שגיאה: ${error.message}`;
        }
      }
      
      alert(errorMessage);
      throw error;
    }
  }, [editor]);

  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    uploadPDF,
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
        onUploadPDF={uploadPDF}
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
                // Important: do NOT add padding here.
                // ProseMirror already has padding via editorProps.attributes.style.
                // If we add padding here too, PDF pages get an extra 64px top/left offset (128px total),
                // which causes the "margin" you see and eventually pushes content to the next page.
                width: `${A4_WIDTH_PX}px`,
                padding: `0px`,
                margin: '0 auto',
                minHeight: `${A4_HEIGHT_PX}px`,
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

