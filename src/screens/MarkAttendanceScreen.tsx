import { useEffect, useState } from 'react'
import type { Group } from '../types'
import { DAYS } from '../lib/timetable'
import type { Day } from '../lib/timetable'
import { getTimetable } from '../lib/timetable'
import type { AttendanceSlot, AttendanceRecord, AttendanceStatus } from '../lib/attendance'
import {
  ATTENDANCE_STATUSES,
  slotsForWeekday,
  getAttendanceForDate,
  setAttendance,
  defaultStatus,
} from '../lib/attendance'
import { getAcademicCalendar, getHolidays } from '../lib/configStore'
import { weekdayForDate, formatDateLabel, todayISO } from '../lib/dates'

interface MarkAttendanceScreenProps {
  uid: string
  group: Group
  onBack: () => void
  initialDate?: string
}

const STATUS_STYLE: Record<AttendanceStatus, { active: string; inactive: string }> = {
  Present: {
    active: 'bg-green-600 text-white',
    inactive: 'border-green-300 text-green-700 hover:bg-green-50',
  },
  Absent: {
    active: 'bg-red-600 text-white',
    inactive: 'border-red-300 text-red-700 hover:bg-red-50',
  },
  'No Class': {
    active: 'bg-gray-500 text-white',
    inactive: 'border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  Holiday: {
    active: 'bg-amber-500 text-white',
    inactive: 'border-amber-300 text-amber-700 hover:bg-amber-50',
  },
}

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export default function MarkAttendanceScreen({
  uid,
  group,
  onBack,
  initialDate,
}: MarkAttendanceScreenProps) {
  const [date, setDate] = useState(() => initialDate ?? todayISO())
  const [slots, setSlots] = useState<AttendanceSlot[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [holidayPrefill, setHolidayPrefill] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleDateChange(next: string) {
    setDate(next)
    setLoading(true)
    setError(null)
    setSaveError(null)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      const weekday = weekdayForDate(date)
      const isSchoolDay = (DAYS as readonly string[]).includes(weekday as string)

      const [entries, attended, holidays, calendar] = await Promise.all([
        getTimetable(uid),
        getAttendanceForDate(uid, date),
        getHolidays(),
        getAcademicCalendar(),
      ])
      if (cancelled) return

      setSlots(isSchoolDay ? slotsForWeekday(entries, weekday as Day, group) : [])
      setRecords(attended)
      setHolidayPrefill(
        isSchoolDay &&
          defaultStatus(date, holidays, {
            start: calendar.sportsMeet.start,
            end: calendar.sportsMeet.end,
          }) === 'Holiday',
      )
    }

    load()
      .catch(() => setError('Failed to load attendance'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [uid, date, group])

  function effectiveStatus(slot: AttendanceSlot): AttendanceStatus | null {
    const saved = records.find((r) => r.slotId === slot.slotId)
    if (saved) return saved.status
    return holidayPrefill ? 'Holiday' : null
  }

  function handleSetStatus(slot: AttendanceSlot, status: AttendanceStatus) {
    if (effectiveStatus(slot) === status) return
    const record: AttendanceRecord = {
      date,
      slotId: slot.slotId,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectCode: slot.subjectCode,
      subjectName: slot.subjectName,
      type: slot.type,
      group: slot.group,
      status,
    }
    const prev = records.find((r) => r.slotId === slot.slotId)
    setRecords((rs) => [...rs.filter((r) => r.slotId !== slot.slotId), record])
    setSaveError(null)
    void setAttendance(uid, record).catch(() => {
      setRecords((rs) => {
        const rest = rs.filter((r) => r.slotId !== slot.slotId)
        return prev ? [...rest, prev] : rest
      })
      setSaveError('Could not save attendance. Please try again.')
    })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p role="status" className="text-gray-500">
          Loading attendance…
        </p>
      </main>
    )
  }

  const weekday = weekdayForDate(date)
  const weekend = weekday === 'Saturday' || weekday === 'Sunday'

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Mark attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Record present, absent, or no-class for each slot on the selected date.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Select date
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => handleDateChange(e.target.value)}
              className={inputClass}
            />
          </label>
          <p className="mt-5 text-sm text-gray-500">{formatDateLabel(date)}</p>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {saveError ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {saveError}
          </p>
        ) : null}

        {weekend ? (
          <p className="mt-8 text-center text-gray-500">No classes scheduled on weekends.</p>
        ) : slots.length === 0 ? (
          <p className="mt-8 text-center text-gray-500">No classes scheduled for this day.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {slots.map((slot) => {
              const active = effectiveStatus(slot)
              return (
                <div
                  key={slot.slotId}
                  aria-label={slot.slotId}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">
                        {slot.startTime} – {slot.endTime}
                      </p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {slot.subjectCode} · {slot.subjectName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {slot.type}
                        {slot.group ? ` · Group ${slot.group}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ATTENDANCE_STATUSES.map((status) => {
                      const isActive = active === status
                      const style = STATUS_STYLE[status]
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => handleSetStatus(slot, status)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            isActive ? style.active : style.inactive
                          }`}
                        >
                          {status}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}