import { useEffect, useState, type FormEvent } from 'react'
import type { AcademicCalendar } from '../data/calendar'
import { DEFAULT_CALENDAR } from '../data/calendar'
import { getAcademicCalendar, updateAcademicCalendar } from '../lib/configStore'

interface SettingsScreenProps {
  onBack: () => void
}

function toForm(c: AcademicCalendar) {
  return {
    semesterLabel: c.semesterLabel,
    teachingStart: c.teachingStart,
    teachingEnd: c.teachingEnd,
    teachingWeeks: String(c.teachingWeeks),
    examStart: c.examStart,
    examEnd: c.examEnd,
    winterVacationStart: c.winterVacationStart,
    winterVacationEnd: c.winterVacationEnd,
    sportsMeetStart: c.sportsMeet.start ?? '',
    sportsMeetEnd: c.sportsMeet.end ?? '',
    sportsMeetNote: c.sportsMeet.note,
    minor1Start: c.minor1.start ?? '',
    minor1End: c.minor1.end ?? '',
    minor2Start: c.minor2.start ?? '',
    minor2End: c.minor2.end ?? '',
  }
}

function buildCalendar(form: ReturnType<typeof toForm>, original: AcademicCalendar): AcademicCalendar {
  return {
    ...original,
    semesterLabel: form.semesterLabel,
    teachingStart: form.teachingStart,
    teachingEnd: form.teachingEnd,
    teachingWeeks: Number(form.teachingWeeks) || original.teachingWeeks,
    examStart: form.examStart,
    examEnd: form.examEnd,
    winterVacationStart: form.winterVacationStart,
    winterVacationEnd: form.winterVacationEnd,
    sportsMeet: {
      start: form.sportsMeetStart || null,
      end: form.sportsMeetEnd || null,
      note: form.sportsMeetNote,
    },
    minor1: {
      start: form.minor1Start || null,
      end: form.minor1End || null,
      editable: original.minor1.editable,
    },
    minor2: {
      start: form.minor2Start || null,
      end: form.minor2End || null,
      editable: original.minor2.editable,
    },
  }
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [original, setOriginal] = useState<AcademicCalendar>(DEFAULT_CALENDAR)
  const [form, setForm] = useState(() => toForm(DEFAULT_CALENDAR))

  useEffect(() => {
    let cancelled = false
    getAcademicCalendar()
      .then((cal) => {
        if (!cancelled) {
          setOriginal(cal)
          setForm(toForm(cal))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load calendar config')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setField = (key: keyof ReturnType<typeof toForm>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await updateAcademicCalendar(buildCalendar(form, original))
      setOriginal(buildCalendar(form, original))
      setSaved(true)
    } catch {
      setError('Could not save calendar config. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p role="status" className="text-gray-500">
          Loading calendar…
        </p>
      </main>
    )
  }

  const input = 'rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Academic calendar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Edit semester dates, exam windows, and holiday ranges.
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Calendar saved.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <fieldset className="rounded-2xl border border-gray-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-gray-700">Semester</legend>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Semester label
                <input
                  id="semester-label"
                  value={form.semesterLabel}
                  onChange={(e) => setField('semesterLabel', e.target.value)}
                  className={input}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Teaching start
                  <input
                    id="teaching-start"
                    type="date"
                    value={form.teachingStart}
                    onChange={(e) => setField('teachingStart', e.target.value)}
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Teaching end
                  <input
                    id="teaching-end"
                    type="date"
                    value={form.teachingEnd}
                    onChange={(e) => setField('teachingEnd', e.target.value)}
                    className={input}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Teaching weeks
                <input
                  id="teaching-weeks"
                  type="number"
                  min="1"
                  value={form.teachingWeeks}
                  onChange={(e) => setField('teachingWeeks', e.target.value)}
                  className={input}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-gray-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-gray-700">Sports meet</legend>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Sports meet start
                  <input
                    id="sports-meet-start"
                    type="date"
                    value={form.sportsMeetStart}
                    onChange={(e) => setField('sportsMeetStart', e.target.value)}
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-600">
                  Sports meet end
                  <input
                    id="sports-meet-end"
                    type="date"
                    value={form.sportsMeetEnd}
                    onChange={(e) => setField('sportsMeetEnd', e.target.value)}
                    className={input}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Note
                <input
                  id="sports-meet-note"
                  value={form.sportsMeetNote}
                  onChange={(e) => setField('sportsMeetNote', e.target.value)}
                  className={input}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-gray-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-gray-700">Exams</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Exam start
                <input
                  id="exam-start"
                  type="date"
                  value={form.examStart}
                  onChange={(e) => setField('examStart', e.target.value)}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Exam end
                <input
                  id="exam-end"
                  type="date"
                  value={form.examEnd}
                  onChange={(e) => setField('examEnd', e.target.value)}
                  className={input}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-gray-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-gray-700">Winter vacation</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Winter vacation start
                <input
                  id="winter-start"
                  type="date"
                  value={form.winterVacationStart}
                  onChange={(e) => setField('winterVacationStart', e.target.value)}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Winter vacation end
                <input
                  id="winter-end"
                  type="date"
                  value={form.winterVacationEnd}
                  onChange={(e) => setField('winterVacationEnd', e.target.value)}
                  className={input}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-gray-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-gray-700">Minor 1</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Minor 1 start
                <input
                  id="minor1-start"
                  type="date"
                  value={form.minor1Start}
                  onChange={(e) => setField('minor1Start', e.target.value)}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Minor 1 end
                <input
                  id="minor1-end"
                  type="date"
                  value={form.minor1End}
                  onChange={(e) => setField('minor1End', e.target.value)}
                  className={input}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-gray-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-gray-700">Minor 2</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Minor 2 start
                <input
                  id="minor2-start"
                  type="date"
                  value={form.minor2Start}
                  onChange={(e) => setField('minor2Start', e.target.value)}
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Minor 2 end
                <input
                  id="minor2-end"
                  type="date"
                  value={form.minor2End}
                  onChange={(e) => setField('minor2End', e.target.value)}
                  className={input}
                />
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </main>
  )
}