'use client'

import { useState, useRef, useEffect } from 'react'
import { FieldDefinition, formatFieldValue } from '@/lib/leadFields'
import { updateLead, type LeadUpdate } from '@/lib/api/leads'

interface EditableFieldProps {
  field: FieldDefinition
  value: any
  leadId: number
  onUpdate?: (key: string, value: any) => void
}

export default function EditableField({ field, value, leadId, onUpdate }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  // Initialize edit value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (field.type === 'date' && value) {
        // Format date for input[type="date"]
        const date = value instanceof Date ? value : new Date(value)
        setEditValue(date.toISOString().split('T')[0])
      } else if (field.type === 'boolean') {
        setEditValue(value ? 'true' : 'false')
      } else {
        setEditValue(value || '')
      }
      // Focus input after a short delay to ensure it's rendered
      setTimeout(() => {
        if (field.type === 'textarea' && textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        } else if (field.type === 'boolean' && selectRef.current) {
          selectRef.current.focus()
        } else if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, 10)
    }
  }, [isEditing, field.type, value])

  function validateValue(val: string): boolean {
    if (field.required && !val.trim()) {
      setError('שדה חובה')
      return false
    }

    if (field.type === 'email' && val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(val)) {
        setError('כתובת אימייל לא תקינה')
        return false
      }
    }

    if (field.type === 'phone' && val) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/
      if (!phoneRegex.test(val)) {
        setError('מספר טלפון לא תקין')
        return false
      }
    }

    if (field.type === 'number' && val) {
      if (isNaN(Number(val))) {
        setError('ערך מספרי לא תקין')
        return false
      }
    }

    return true
  }

  async function handleSave() {
    setError(null)

    let processedValue: any = editValue

    // Process value based on type
    if (field.type === 'boolean') {
      processedValue = editValue === 'true'
    } else if (field.type === 'number' && editValue) {
      processedValue = parseFloat(editValue)
      if (isNaN(processedValue)) {
        setError('ערך מספרי לא תקין')
        return
      }
    } else if (field.type === 'date' && editValue) {
      processedValue = editValue
    } else if (!editValue.trim()) {
      processedValue = null
    } else {
      processedValue = editValue.trim()
    }

    // Validate
    if (!validateValue(editValue)) {
      return
    }

    setLoading(true)
    try {
      const updateData: LeadUpdate = {
        [field.key]: processedValue,
      }
      await updateLead(leadId, updateData)
      setIsEditing(false)
      if (onUpdate) {
        onUpdate(field.key, processedValue)
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון השדה')
      console.error('Failed to update field:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setIsEditing(false)
    setEditValue('')
    setError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && field.type !== 'textarea') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const displayValue = formatFieldValue(value, field)
  const isEmpty = value === null || value === undefined || value === ''

  if (isEditing) {
    return (
      <div className="space-y-2">
        {field.type === 'textarea' ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        ) : field.type === 'boolean' ? (
          <select
            ref={selectRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="true">כן</option>
            <option value="false">לא</option>
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            placeholder={field.required ? 'שדה חובה' : ''}
          />
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'שומר...' : 'שמור'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ביטול
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => !loading && setIsEditing(true)}
      className={`group cursor-pointer p-3 rounded-lg transition-colors ${
        isEmpty
          ? 'bg-gray-50 hover:bg-gray-100'
          : 'bg-white hover:bg-blue-50 border border-transparent hover:border-blue-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <p className={`text-gray-900 ${isEmpty ? 'text-gray-400 italic' : ''}`}>
            {displayValue}
          </p>
        </div>
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

