'use client'

import { useState, useEffect } from 'react'
import { getStages, type LeadStage } from '@/lib/api/stages'
import { updateLead } from '@/lib/api/leads'

interface StageChangeDropdownProps {
  currentStageId: number
  leadId: number
  onStageChanged?: (newStageId: number) => void
}

export default function StageChangeDropdown({ currentStageId, leadId, onStageChanged }: StageChangeDropdownProps) {
  const [stages, setStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(false)
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchStages() {
      try {
        const stagesData = await getStages()
        setStages(stagesData.sort((a, b) => a.order - b.order))
      } catch (err) {
        console.error('Failed to fetch stages:', err)
        setError('שגיאה בטעינת השלבים')
      }
    }
    fetchStages()
  }, [])

  async function handleStageChange(newStageId: number) {
    if (newStageId === currentStageId) return

    setSelectedStageId(newStageId)
    setShowConfirm(true)
  }

  async function confirmStageChange() {
    if (!selectedStageId) return

    setChanging(true)
    setError(null)
    try {
      await updateLead(leadId, { stage_id: selectedStageId })
      if (onStageChanged) {
        onStageChanged(selectedStageId)
      }
      setShowConfirm(false)
      setSelectedStageId(null)
    } catch (err: any) {
      setError(err.message || 'שגיאה בשינוי השלב')
      console.error('Failed to change stage:', err)
    } finally {
      setChanging(false)
    }
  }

  function cancelStageChange() {
    setShowConfirm(false)
    setSelectedStageId(null)
    setError(null)
  }

  const currentStage = stages.find(s => s.id === currentStageId)

  if (showConfirm) {
    const selectedStage = stages.find(s => s.id === selectedStageId)
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-3">
          האם לשנות את השלב מ-<strong>{currentStage?.name}</strong> ל-<strong>{selectedStage?.name}</strong>?
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={confirmStageChange}
            disabled={changing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {changing ? 'משנה...' : 'אישור'}
          </button>
          <button
            onClick={cancelStageChange}
            disabled={changing}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ביטול
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        סטטוס
      </label>
      <select
        value={currentStageId}
        onChange={(e) => handleStageChange(parseInt(e.target.value, 10))}
        disabled={loading || changing}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {stages.map(stage => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>
      {error && !showConfirm && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}

