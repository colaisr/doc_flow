"use client";

import { useState, useEffect } from "react";
import { getAvailableMergeFields, MergeField } from "@/lib/mergeFields";

interface MergeFieldsPanelProps {
  onSelectField: (fieldKey: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MergeFieldsPanel({
  onSelectField,
  isOpen,
  onClose,
}: MergeFieldsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const allFields = getAvailableMergeFields();
  
  // Group fields by section
  const fieldsBySection = allFields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, MergeField[]>);

  // Initialize all sections as expanded on mount
  useEffect(() => {
    if (isOpen && expandedSections.size === 0) {
      const allSections = Object.keys(fieldsBySection);
      setExpandedSections(new Set(allSections));
    }
  }, [isOpen]);

  // Filter fields based on search
  const filteredFieldsBySection = Object.entries(fieldsBySection).reduce(
    (acc, [section, fields]) => {
      const filtered = fields.filter(
        (field) =>
          field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          field.fieldKey.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[section] = filtered;
      }
      return acc;
    },
    {} as Record<string, MergeField[]>
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">הוסף שדה מיזוג</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="חפש שדה..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </div>

        {/* Fields List */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(filteredFieldsBySection).map(([section, fields]) => (
            <div key={section} className="mb-4">
              <button
                onClick={() => toggleSection(section)}
                className="w-full flex items-center justify-between p-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-right"
              >
                <span>{section}</span>
                <span>{expandedSections.has(section) ? "▼" : "◄"}</span>
              </button>
              
              {expandedSections.has(section) && (
                <div className="mt-2 space-y-1">
                  {fields.map((field) => (
                    <button
                      key={field.fieldKey}
                      onClick={() => {
                        onSelectField(field.fieldKey);
                        onClose();
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-800">
                        {field.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {field.fieldKey}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(filteredFieldsBySection).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              לא נמצאו שדות התואמים לחיפוש
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

