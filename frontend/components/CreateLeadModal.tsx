'use client'

import { useState, useEffect } from 'react'
import { createLead, type LeadCreate, type LeadStage } from '@/lib/api/leads'
import { getStages } from '@/lib/api/stages'
import { getOrganizationMembers, type OrganizationMember } from '@/lib/api/organizations'
import { useOrganizationContext } from '@/contexts/OrganizationContext'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  const { currentOrganizationId } = useOrganizationContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<LeadStage[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  
  // Form state
  const [formData, setFormData] = useState<LeadCreate>({
    full_name: '',
    client_id: '',
    phone: '',
    address: '',
    email: '',
    birth_date: '',
    stage_id: undefined,
    assigned_user_id: undefined,
    source: 'manual',
  })

  // Fetch stages and members on mount
  useEffect(() => {
    if (isOpen) {
      fetchStages()
      if (currentOrganizationId) {
        fetchMembers()
      }
    }
  }, [isOpen, currentOrganizationId])

  // Set default stage when stages are loaded
  useEffect(() => {
    if (stages.length > 0 && !formData.stage_id) {
      const defaultStage = stages.find(s => s.is_default && s.order === 1) || stages[0]
      setFormData(prev => ({ ...prev, stage_id: defaultStage.id }))
    }
  }, [stages])

  async function fetchStages() {
    try {
      const stagesData = await getStages()
      setStages(stagesData)
    } catch (err) {
      console.error('Failed to fetch stages:', err)
      setError('שגיאה בטעינת השלבים')
    }
  }

  async function fetchMembers() {
    if (!currentOrganizationId) return
    try {
      const membersData = await getOrganizationMembers(currentOrganizationId)
      setMembers(membersData)
    } catch (err) {
      console.error('Failed to fetch members:', err)
      // Don't show error for members, it's optional
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value,
    }))
    setError(null)
  }

  function validateEmail(email: string): boolean {
    if (!email) return true // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  function validatePhone(phone: string): boolean {
    if (!phone) return true // Optional field
    // Basic phone validation (allows digits, spaces, dashes, parentheses, +)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    return phoneRegex.test(phone)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.full_name?.trim()) {
      setError('שם מלא הוא שדה חובה')
      return
    }

    // Validate email format if provided
    if (formData.email && !validateEmail(formData.email)) {
      setError('כתובת אימייל לא תקינה')
      return
    }

    // Validate phone format if provided
    if (formData.phone && !validatePhone(formData.phone)) {
      setError('מספר טלפון לא תקין')
      return
    }

    setLoading(true)
    try {
      // Clean up the data: convert empty strings to undefined, ensure proper types
      const cleanData: LeadCreate = {
        full_name: formData.full_name.trim(),
        source: formData.source || 'manual',
      }
      
      // Only include optional fields if they have values
      if (formData.client_id?.trim()) {
        cleanData.client_id = formData.client_id.trim()
      }
      if (formData.phone?.trim()) {
        cleanData.phone = formData.phone.trim()
      }
      if (formData.address?.trim()) {
        cleanData.address = formData.address.trim()
      }
      if (formData.email?.trim()) {
        cleanData.email = formData.email.trim()
      }
      if (formData.birth_date) {
        cleanData.birth_date = formData.birth_date
      }
      if (formData.stage_id) {
        cleanData.stage_id = formData.stage_id
      }
      if (formData.assigned_user_id) {
        cleanData.assigned_user_id = formData.assigned_user_id
      }
      
      await createLead(cleanData)
      onSuccess()
      onClose()
      // Reset form after closing
      setTimeout(() => {
        setFormData({
          full_name: '',
          client_id: '',
          phone: '',
          address: '',
          email: '',
          birth_date: '',
          stage_id: stages.find(s => s.is_default && s.order === 1)?.id || stages[0]?.id,
          assigned_user_id: undefined,
          source: 'manual',
        })
        setError(null)
      }, 100)
    } catch (err: any) {
      // Extract more detailed error message
      let errorMessage = 'שגיאה ביצירת הליד'
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          // Pydantic validation errors
          const errors = err.response.data.detail.map((e: any) => {
            const field = e.loc?.join('.') || 'field'
            return `${field}: ${e.msg}`
          }).join(', ')
          errorMessage = `שגיאות אימות: ${errors}`
        } else if (typeof err.response.data.detail === 'object') {
          errorMessage = JSON.stringify(err.response.data.detail)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
      console.error('Failed to create lead:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      setFormData({
        full_name: '',
        client_id: '',
        phone: '',
        address: '',
        email: '',
        birth_date: '',
        stage_id: undefined,
        assigned_user_id: undefined,
        source: 'manual',
      })
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              צור ליד חדש
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name - Required */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם מלא <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס שם מלא"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  אימייל
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס כתובת אימייל"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  טלפון
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס מספר טלפון"
                />
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ת.ז
                </label>
                <input
                  type="text"
                  name="client_id"
                  value={formData.client_id || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס ת.ז"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תאריך לידה
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כתובת
                </label>
                <textarea
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס כתובת מגורים"
                />
              </div>

              {/* Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סטטוס
                </label>
                <select
                  name="stage_id"
                  value={formData.stage_id || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      stage_id: value === '' ? undefined : parseInt(value, 10),
                    }))
                    setError(null)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  מוקצה ל
                </label>
                  <select
                  name="assigned_user_id"
                  value={formData.assigned_user_id || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      assigned_user_id: value === '' ? undefined : parseInt(value, 10),
                    }))
                    setError(null)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">לא מוקצה</option>
                  {members.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

