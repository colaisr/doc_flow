'use client'

import { StageHistory } from '@/lib/api/leads'

interface StageTimelineProps {
  stageHistory: StageHistory[]
  currentStageId: number
}

export default function StageTimeline({ stageHistory, currentStageId }: StageTimelineProps) {
  // Sort history by date (newest first for RTL)
  const sortedHistory = [...stageHistory].sort((a, b) => 
    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  )

  if (sortedHistory.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">אין היסטוריית סטטוס</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Horizontal Timeline */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4">
        {sortedHistory.map((history, index) => {
          const isCurrent = history.stage_id === currentStageId
          const isLast = index === sortedHistory.length - 1
          
          return (
            <div key={history.id} className="flex items-center flex-shrink-0">
              {/* Stage Item */}
              <div className="flex flex-col items-center">
                {/* Stage Dot */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all ${
                    isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                      : 'bg-white border-gray-300 text-gray-600'
                  }`}
                >
                  {isCurrent && (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                
                {/* Stage Info */}
                <div className="mt-3 text-center max-w-[150px]">
                  <p
                    className={`font-medium text-sm ${
                      isCurrent ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {history.stage?.name || 'לא ידוע'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(history.changed_at).toLocaleDateString('he-IL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(history.changed_at).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {history.changed_by_user && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {history.changed_by_user.full_name || history.changed_by_user.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`h-1 w-16 mx-2 flex-shrink-0 ${
                    isCurrent ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile Vertical Timeline (hidden on desktop) */}
      <div className="md:hidden space-y-4">
        {sortedHistory.map((history, index) => {
          const isCurrent = history.stage_id === currentStageId
          
          return (
            <div key={history.id} className="flex gap-4">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                    isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600'
                  }`}
                >
                  {isCurrent && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {index < sortedHistory.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-300 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <p
                  className={`font-medium ${
                    isCurrent ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {history.stage?.name || 'לא ידוע'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(history.changed_at).toLocaleString('he-IL')}
                </p>
                {history.changed_by_user && (
                  <p className="text-sm text-gray-400 mt-1">
                    על ידי: {history.changed_by_user.full_name || history.changed_by_user.email}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

