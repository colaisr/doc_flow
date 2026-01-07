"use client";

import { Editor } from "@tiptap/react";
import { 
  Bold, Italic, Underline, 
  AlignRight, AlignCenter, AlignLeft, 
  List, ListOrdered,
  Undo, Redo,
  FileText, PenTool
} from "lucide-react";
import { useState } from "react";
import MergeFieldsPanel from "./MergeFieldsPanel";

interface GoogleDocsToolbarProps {
  editor: Editor | null;
  onAddSignatureBlock?: (type: 'client' | 'internal') => void;
}

const FONT_SIZES = [
  { label: '8', value: '8' },
  { label: '9', value: '9' },
  { label: '10', value: '10' },
  { label: '11', value: '11' },
  { label: '12', value: '12' },
  { label: '14', value: '14' },
  { label: '16', value: '16' },
  { label: '18', value: '18' },
  { label: '20', value: '20' },
  { label: '24', value: '24' },
  { label: '28', value: '28' },
  { label: '32', value: '32' },
  { label: '36', value: '36' },
  { label: '48', value: '48' },
  { label: '72', value: '72' },
];

export default function GoogleDocsToolbar({ editor, onAddSignatureBlock }: GoogleDocsToolbarProps) {
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);
  const [isMergeFieldsPanelOpen, setIsMergeFieldsPanelOpen] = useState(false);

  if (!editor) {
    return null;
  }

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded hover:bg-gray-200 transition-colors ${
      isActive ? "bg-blue-100 text-blue-700" : "text-gray-700"
    }`;

  const currentFontSize = editor.getAttributes('textStyle').fontSize || '12';

  const handleFontSizeChange = (size: string) => {
    if (!editor) return;
    try {
      if (size === '') {
        editor.chain().focus().unsetFontSize().run();
      } else {
        editor.chain().focus().setFontSize(size).run();
      }
    } catch (error) {
      console.error('Error setting font size:', error);
    }
    setIsFontSizeOpen(false);
  };

  const handleInsertMergeField = (fieldKey: string) => {
    if (!editor) return;
    try {
      editor.chain().focus().insertMergeField(fieldKey).run();
    } catch (error) {
      console.error('Error inserting merge field:', error);
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-300 shadow-sm" dir="rtl">
        <div className="flex items-center gap-1 px-4 py-2 flex-wrap">
          {/* Undo/Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className={buttonClass(false)}
            title="בטל"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className={buttonClass(false)}
            title="בצע שוב"
          >
            <Redo className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Font Size */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFontSizeOpen(!isFontSizeOpen)}
              className={`${buttonClass(false)} min-w-[3rem]`}
              title="גודל גופן"
            >
              <span className="text-sm">{currentFontSize || '12'}px</span>
            </button>
            {isFontSizeOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFontSizeOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto min-w-[80px]" dir="rtl">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => handleFontSizeChange(size.value)}
                      className={`w-full px-3 py-2 text-right hover:bg-gray-100 text-sm ${
                        currentFontSize === size.value ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {size.label}px
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Text Formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={buttonClass(editor.isActive("bold"))}
            title="מודגש"
          >
            <Bold className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={buttonClass(editor.isActive("italic"))}
            title="נטוי"
          >
            <Italic className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            className={buttonClass(editor.isActive("underline"))}
            title="קו תחתון"
          >
            <Underline className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={buttonClass(editor.isActive({ textAlign: 'right' }))}
            title="יישור ימין"
          >
            <AlignRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={buttonClass(editor.isActive({ textAlign: 'center' }))}
            title="יישור מרכז"
          >
            <AlignCenter className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={buttonClass(editor.isActive({ textAlign: 'left' }))}
            title="יישור שמאל"
          >
            <AlignLeft className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={buttonClass(editor.isActive("bulletList"))}
            title="רשימה עם תבליטים"
          >
            <List className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={buttonClass(editor.isActive("orderedList"))}
            title="רשימה ממוספרת"
          >
            <ListOrdered className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Merge Fields */}
          <button
            type="button"
            onClick={() => setIsMergeFieldsPanelOpen(true)}
            className={buttonClass(false)}
            title="הוסף שדה מיזוג"
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* Signature Blocks */}
          {onAddSignatureBlock && (
            <button
              type="button"
              onClick={() => onAddSignatureBlock()}
              className={buttonClass(false)}
              title="הוסף חתימת לקוח"
            >
              <PenTool className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Merge Fields Panel */}
      <MergeFieldsPanel
        isOpen={isMergeFieldsPanelOpen}
        onClose={() => setIsMergeFieldsPanelOpen(false)}
        onSelectField={handleInsertMergeField}
      />
    </>
  );
}

