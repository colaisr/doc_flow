'use client'

import { useState, useEffect } from 'react'
import { getOrganizationMembers, type OrganizationMember } from '@/lib/api/organizations'
import { updateLead } from '@/lib/api/leads'
import { useOrganizationContext } from '@/contexts/OrganizationContext'

interface UserAssignmentDropdownProps {
  currentUserId: number | null | undefined
  leadId: number
  onUserChanged?: (newUserId: number | null) => void
}

export default function UserAssignmentDropdown({ currentUserId, leadId, onUserChanged }: UserAssignmentDropdownProps) {
  const { currentOrganizationId } = useOrganizationContext()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(false)
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMembers() {
      if (!currentOrganizationId) return
      setLoading(true)
      try {
        const membersData = await getOrganizationMembers(currentOrganizationId)
        setMembers(membersData)
      } catch (err) {
        console.error('Failed to fetch members:', err)
        setError('שגיאה בטעינת המשתמשים')
      } finally {
        setLoading(false)
      }
    }
    fetchMembers()
  }, [currentOrganizationId])

  async function handleUserChange(newUserId: number | null) {
    if (newUserId === currentUserId) return

    setChanging(true)
    setError(null)
    try {
      await updateLead(leadId, { assigned_user_id: newUserId || null })
      if (onUserChanged) {
        onUserChanged(newUserId)
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בשינוי ההקצאה')
      console.error('Failed to change user assignment:', err)
    } finally {
      setChanging(false)
    }
  }

  const currentMember = members.find(m => m.user_id === currentUserId)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        מוקצה ל
      </label>
      <select
        value={currentUserId || ''}
        onChange={(e) => {
          const value = e.target.value
          handleUserChange(value === '' ? null : parseInt(value, 10))
        }}
        disabled={loading || changing}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">לא מוקצה</option>
        {members.map(member => (
          <option key={member.user_id} value={member.user_id}>
            {member.full_name || member.email}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}

