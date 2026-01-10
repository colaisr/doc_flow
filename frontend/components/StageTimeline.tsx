'use client'

import { StageHistory, LeadStage } from '@/lib/api/leads'
import { useEffect, useState } from 'react'
import { getStages } from '@/lib/api/stages'
import { Check, Clock } from 'lucide-react'

interface StageTimelineProps {
  stageHistory: StageHistory[]
  currentStageId: number
}

type StageStatus = 'completed' | 'current' | 'upcoming'

interface StageWithStatus extends LeadStage {
  status: StageStatus
  historyEntry?: StageHistory
}

export default function StageTimeline({ stageHistory, currentStageId }: StageTimelineProps) {
  const [allStages, setAllStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch all stages
  useEffect(() => {
    getStages()
      .then((stages) => {
        setAllStages(stages.filter(s => !s.is_archived)) // Exclude archived stages
      })
      .catch((err) => {
        console.error('Failed to fetch stages:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Find current stage order
  const currentStage = allStages.find(s => s.id === currentStageId)
  const currentOrder = currentStage?.order ?? 0

  // Create map of stage IDs to history entries (get most recent entry per stage)
  const stageHistoryMap = new Map<number, StageHistory>()
  stageHistory.forEach((entry) => {
    const existing = stageHistoryMap.get(entry.stage_id)
    if (!existing || new Date(entry.changed_at) > new Date(existing.changed_at)) {
      stageHistoryMap.set(entry.stage_id, entry)
    }
  })

  // Merge stages with their status
  const stagesWithStatus: StageWithStatus[] = allStages.map((stage) => {
    let status: StageStatus = 'upcoming'
    const historyEntry = stageHistoryMap.get(stage.id)

    if (stage.id === currentStageId) {
      status = 'current'
    } else if (historyEntry) {
      // If there's a history entry, mark as completed regardless of order
      // This allows document uploads to mark stages as complete even if they're after the current stage
      status = 'completed'
    } else {
      status = 'upcoming'
    }

    return {
      ...stage,
      status,
      historyEntry,
    }
  })

  // Sort by order (ascending) - for RTL, we'll reverse display
  const sortedStages = [...stagesWithStatus].sort((a, b) => a.order - b.order)

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">טוען שלבים...</p>
      </div>
    )
  }

  if (sortedStages.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">אין שלבים זמינים</p>
      </div>
    )
  }

  return (
    <div className="relative w-full" dir="rtl">
      {/* Desktop Horizontal Timeline (RTL flow) */}
      <div className="hidden md:block">
        <div className="relative w-full overflow-hidden">
          {/* Stages Container - wrap and fit within container */}
          <div className="relative flex items-start justify-end gap-0 pb-6 px-2 w-full" dir="rtl" style={{ maxWidth: '100%' }}>
            {sortedStages.map((stage, index) => {
              const isLast = index === sortedStages.length - 1
              const isCompleted = stage.status === 'completed'
              const isCurrent = stage.status === 'current'
              const isUpcoming = stage.status === 'upcoming'
              
              // The line connects FROM this stage TO the next stage (on the left in RTL display)
              // Line should be green if this stage (the one we're coming from) has been reached
              // In RTL display: stages flow right-to-left, so line goes from right stage to left stage
              const lineShouldBeActive = isCompleted || isCurrent

              // Calculate dynamic width based on number of stages to fit all within container
              const stageCount = sortedStages.length
              const baseWidth = Math.max(100, Math.floor((100 / stageCount) * 10)) // Responsive width calculation
              const minWidth = Math.min(120, baseWidth) // Cap at 120px, minimum 100px

              return (
                <div key={stage.id} className="flex items-start flex-shrink-0 relative" style={{ width: `${100 / stageCount}%`, minWidth: `${minWidth}px` }}>
                  {/* Connector Line (connects to previous stage on the left in display, which is next in order) */}
                  {!isLast && (
                    <div
                      className={`absolute top-7 h-1 transition-colors z-10 ${
                        lineShouldBeActive
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                      style={{
                        right: '24px', // Start from center of circle (48px / 2)
                        width: 'calc(100% - 48px)',
                        minWidth: '40px',
                      }}
                    />
                  )}

                  {/* Stage Item */}
                  <div className="flex flex-col items-center w-full relative z-20 px-1">
                    {/* Stage Dot */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                          : isCompleted
                          ? 'bg-green-500 border-green-500 text-white shadow-md'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                      style={{ borderWidth: '3px', borderStyle: 'solid' }}
                    >
                      {isCompleted && (
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      )}
                      {isCurrent && (
                        <div className="flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        </div>
                      )}
                      {isUpcoming && (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    {/* Stage Info */}
                    <div className="mt-3 text-center w-full px-1">
                      <p
                        className={`font-semibold text-xs mb-1 leading-tight ${
                          isCurrent
                            ? 'text-blue-600'
                            : isCompleted
                            ? 'text-green-700'
                            : 'text-gray-400'
                        }`}
                      >
                        {stage.name}
                      </p>

                      {/* Show date/time for completed and current stages */}
                      {stage.historyEntry && (isCompleted || isCurrent) && (
                        <div className="space-y-0.5 mt-1.5">
                          <p className="text-[10px] text-gray-600 leading-tight">
                            {new Date(stage.historyEntry.changed_at).toLocaleDateString('he-IL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight">
                            {new Date(stage.historyEntry.changed_at).toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {stage.historyEntry.changed_by_user && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate leading-tight" title={stage.historyEntry.changed_by_user.full_name || stage.historyEntry.changed_by_user.email}>
                              {stage.historyEntry.changed_by_user.full_name || stage.historyEntry.changed_by_user.email}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Status Badge */}
                      {isCurrent && (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800 rounded-full">
                          נוכחי
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded-full">
                          הבא
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile Vertical Timeline */}
      <div className="md:hidden space-y-4">
        {sortedStages.map((stage, index) => {
          const isCompleted = stage.status === 'completed'
          const isCurrent = stage.status === 'current'
          const isUpcoming = stage.status === 'upcoming'

          return (
            <div key={stage.id} className="flex gap-4" dir="rtl">
              {/* Timeline Line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                    isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                      : isCompleted
                      ? 'bg-green-500 border-green-500 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted && (
                    <Check className="w-6 h-6 text-white" strokeWidth={3} />
                  )}
                  {isCurrent && (
                    <div className="flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                  {isUpcoming && (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {index < sortedStages.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 mt-2 ${
                      isCompleted || isCurrent ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p
                    className={`font-semibold ${
                      isCurrent
                        ? 'text-blue-600'
                        : isCompleted
                        ? 'text-green-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {stage.name}
                  </p>
                  {(isCurrent || isUpcoming) && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                        isCurrent
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isCurrent ? 'נוכחי' : 'הבא'}
                    </span>
                  )}
                </div>

                {/* Show date/time for completed and current stages */}
                {stage.historyEntry && (isCompleted || isCurrent) && (
                  <div className="space-y-0.5 mt-2">
                    <p className="text-sm text-gray-600">
                      {new Date(stage.historyEntry.changed_at).toLocaleDateString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}{' '}
                      {new Date(stage.historyEntry.changed_at).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {stage.historyEntry.changed_by_user && (
                      <p className="text-sm text-gray-400">
                        על ידי: {stage.historyEntry.changed_by_user.full_name || stage.historyEntry.changed_by_user.email}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
