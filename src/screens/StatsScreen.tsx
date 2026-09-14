import { useEffect, useState } from 'react'
import type { AcademicCalendar } from '../data/calendar'
import type { AttendanceRecord } from '../lib/attendance'
import { getAttendance } from '../lib/attendance'
import { getAcademicCalendar } from '../lib/configStore'
import {
  attendancePercent,
  attendanceTotals,
  bunkProjection,
  perSubjectStats,
} from '../lib/stats'
import type { AttendanceTotals, BunkProjection, SubjectStats } from '../lib/stats'

interface StatsScreenProps {
  uid: string
  onBack: () => void
}

interface StatBlockProps {
  ariaLabel: string
  title: string
  totals: AttendanceTotals
  projection?: BunkProjection | null
}

function StatBlock({ ariaLabel, title, totals, projection }: StatBlockProps) {
  const pct = attendancePercent(totals.attended, totals.conducted)
  const pass = pct !== null && pct >= 75
  const barColor = pct === null ? 'bg-gray-200' : pass ? 'bg-green-500' : 'bg-red-500'
  const badgeColor =
    pct === null ? 'text-gray-400' : pass ? 'text-green-700' : 'text-red-700'

  return (
    <div
      aria-label={ariaLabel}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-4"
    >
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-2 text-sm text-gray-600">
        Attended: {totals.attended} · Conducted: {totals.conducted}
      </p>
      <p className="mt-1 text-lg font-bold text-gray-900">
        {pct === null ? 'N/A' : `${pct.toFixed(1)}%`}
      </p>
      <div
        role="progressbar"
        aria-valuenow={pct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100"
      >
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct === null ? 0 : Math.min(100, pct)}%` }}
        />
      </div>
      <p className={`mt-1 text-xs font-medium ${badgeColor}`}>
        {pct === null ? 'No data yet' : pass ? '≥ 75%' : '< 75%'}
      </p>
      {projection !== undefined ? (
        <div className="mt-3 border-t border-gray-100 pt-2">
          {projection === null ? (
            <p className="text-xs text-gray-400">No classes logged yet.</p>
          ) : projection.kind === 'miss' ? (
            <p className="text-xs font-medium text-green-700">
              You can miss up to {projection.count} more classes
            </p>
          ) : (
            <p className="text-xs font-medium text-red-700">
              You need to attend the next {projection.count} classes
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function SubjectCard({ subject }: { subject: SubjectStats }) {
  return (
    <div
      aria-label={subject.subjectCode}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="font-semibold text-gray-900">{subject.subjectName}</p>
        <p className="text-xs text-gray-500">
          {subject.subjectCode} · {subject.type}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatBlock
          ariaLabel={`${subject.subjectCode} till minor1`}
          title="Till Minor 1"
          totals={subject.tillMinor1}
        />
        <StatBlock
          ariaLabel={`${subject.subjectCode} cumulative`}
          title="Cumulative (Total)"
          totals={subject.cumulative}
          projection={bunkProjection(
            subject.cumulative.attended,
            subject.cumulative.conducted,
          )}
        />
      </div>
    </div>
  )
}

export default function StatsScreen({ uid, onBack }: StatsScreenProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [calendar, setCalendar] = useState<AcademicCalendar | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAttendance(uid), getAcademicCalendar()])
      .then(([attended, cal]) => {
        if (cancelled) return
        setRecords(attended)
        setCalendar(cal)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load stats')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p role="status" className="text-gray-500">
          Loading stats…
        </p>
      </main>
    )
  }

  const cutoff = calendar?.minor1.end ?? undefined
  const rows = perSubjectStats(records, cutoff)
  const overall: SubjectStats = {
    subjectCode: 'overall',
    subjectName: 'Overall',
    type: 'Lecture',
    tillMinor1: attendanceTotals(records, cutoff),
    cumulative: attendanceTotals(records),
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Attendance stats</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conducted counts Present and Absent only. No Class and Holiday are excluded.
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="mt-8 text-center text-gray-500">
            No attendance logged yet.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {rows.map((subject) => (
              <SubjectCard key={subject.subjectCode} subject={subject} />
            ))}
          </div>
        )}

        <div className="mt-6">
          <SubjectCard subject={overall} />
        </div>
      </div>
    </main>
  )
}