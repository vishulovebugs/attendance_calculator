import { Fragment, useEffect, useState, type FormEvent } from 'react'
import type { Group } from '../types'
import { DAYS, LAB_MAX_START } from '../lib/timetable'
import type { Day, HourSlot, SubjectType, TimetableEntry } from '../lib/timetable'
import {
  HOUR_STARTS,
  addHours,
  clickableSlotsFor,
  conflictsWith,
  entryCoversHour,
  entryId,
  getTimetable,
  saveTimetable,
} from '../lib/timetable'

interface EditTimetableScreenProps {
  uid: string
  group: Group
  onBack: () => void
}

interface SlotForm {
  day: Day
  startTime: string
  type: SubjectType
  subjectCode: string
  subjectName: string
}

interface EditorState {
  day: Day
  start: string
}

interface GridCellProps {
  day: Day
  start: string
  covering: TimetableEntry | undefined
  onOpen: () => void
}

interface EditorModalProps {
  form: SlotForm
  formError: string | null
  existing: TimetableEntry | undefined
  group: Group
  onChange: (patch: Partial<SlotForm>) => void
  onSave: (e: FormEvent) => void
  onDelete: () => void
  onCancel: () => void
}

const input =
  'rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

function GridCell({ day, start, covering, onOpen }: GridCellProps) {
  const label = covering ? `Edit ${day} ${start}` : `Add ${day} ${start}`
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      className={`flex min-h-[56px] flex-col justify-center bg-white px-2 text-left transition hover:bg-indigo-50 ${
        covering ? 'border-l-2 border-indigo-500' : ''
      }`}
    >
      {covering ? (
        <>
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-indigo-700">
            <span className="truncate">{covering.subjectCode}</span>
            <span
              className={`shrink-0 rounded px-1 text-[10px] ${
                covering.type === 'Lab' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100'
              }`}
            >
              {covering.type === 'Lab' ? 'Lab' : 'Lec'}
            </span>
          </span>
          <span className="mt-1 block truncate text-xs text-gray-500">
            {covering.subjectName}
          </span>
        </>
      ) : (
        <span className="text-lg leading-none text-gray-300">+</span>
      )}
    </button>
  )
}

function EditorModal({
  form,
  formError,
  existing,
  group,
  onChange,
  onSave,
  onDelete,
  onCancel,
}: EditorModalProps) {
  const startOptions = clickableSlotsFor(form.type)
  const heading = existing ? 'Edit class' : 'Add class'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={onSave}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-gray-900">{heading}</h2>

        {formError ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Day
            <select
              value={form.day}
              onChange={(e) => onChange({ day: e.target.value as Day })}
              className={input}
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Start time
            <select
              value={form.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              className={input}
            >
              {startOptions.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {slot.start}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-gray-700">
          Type
          <select
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value as SubjectType })}
            className={input}
          >
            <option value="Lecture">Lecture</option>
            <option value="Lab">Lab</option>
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Subject code
            <input
              value={form.subjectCode}
              onChange={(e) => onChange({ subjectCode: e.target.value })}
              placeholder="e.g. IT-301"
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Subject name
            <input
              value={form.subjectName}
              onChange={(e) => onChange({ subjectName: e.target.value })}
              placeholder="e.g. Data Structures"
              className={input}
            />
          </label>
        </div>

        {form.type === 'Lab' ? (
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Group:</span> {group} · Lab blocks
            two hours
          </p>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Lecture blocks one hour.</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          {existing ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Delete slot
            </button>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Save slot
          </button>
        </div>
      </form>
    </div>
  )
}

export default function EditTimetableScreen({
  uid,
  group,
  onBack,
}: EditTimetableScreenProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [form, setForm] = useState<SlotForm | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getTimetable(uid)
      .then((result) => {
        if (!cancelled) setEntries(result)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load your timetable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  function hourSlot(start: string): HourSlot {
    return { start, end: addHours(start, 1) }
  }

  function entryAt(day: Day, start: string): TimetableEntry | undefined {
    return entries.find((e) => e.day === day && entryCoversHour(e, hourSlot(start)))
  }

  function openEditor(day: Day, start: string) {
    setSaved(false)
    const existing = entryAt(day, start)
    setEditor({ day, start })
    setForm(
      existing
        ? {
            day: existing.day,
            startTime: existing.startTime,
            type: existing.type,
            subjectCode: existing.subjectCode,
            subjectName: existing.subjectName,
          }
        : {
            day,
            startTime: start,
            type: 'Lecture',
            subjectCode: '',
            subjectName: '',
          },
    )
    setFormError(null)
  }

  function updateForm(patch: Partial<SlotForm>) {
    setForm((prev) => {
      if (!prev) return prev
      let next = { ...prev, ...patch }
      if (next.type === 'Lab' && next.startTime > LAB_MAX_START) {
        next = { ...next, startTime: LAB_MAX_START }
      }
      return next
    })
    setFormError(null)
  }

  function handleSlotSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return

    const units = form.type === 'Lab' ? 2 : 1
    const candidate: TimetableEntry = {
      day: form.day,
      startTime: form.startTime,
      endTime: addHours(form.startTime, units),
      subjectCode: form.subjectCode.trim(),
      subjectName: form.subjectName.trim(),
      type: form.type,
      units,
      group: form.type === 'Lab' ? group : undefined,
    }

    if (!candidate.subjectCode) {
      setFormError('Subject code is required')
      return
    }
    if (!candidate.subjectName) {
      setFormError('Subject name is required')
      return
    }

    const editing = editor ? entryAt(editor.day, editor.start) : undefined
    const withoutEdited = editing
      ? entries.filter((e) => entryId(e) !== entryId(editing))
      : entries

    if (conflictsWith(withoutEdited, candidate)) {
      setFormError('This slot overlaps another class')
      return
    }

    setEntries([...withoutEdited, candidate])
    setEditor(null)
  }

  function handleDeleteSlot() {
    if (!editor) return
    const editing = entryAt(editor.day, editor.start)
    if (editing) {
      setEntries((prev) => prev.filter((e) => entryId(e) !== entryId(editing)))
    }
    setEditor(null)
  }

  async function handleSaveTimetable() {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      await saveTimetable(uid, entries)
      setSaved(true)
    } catch {
      setSaveError('Could not save your timetable. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p role="status" className="text-gray-500">
          Loading timetable…
        </p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit timetable</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tap a slot to add a class. Labs block two hours and are tagged to your
          group ({group}).
        </p>

        {loadError ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {loadError}
          </p>
        ) : null}
        {saveError ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {saveError}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Timetable saved.
          </p>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div
            className="grid min-w-[560px] gap-px bg-gray-200"
            style={{ gridTemplateColumns: '4rem repeat(5, minmax(0, 1fr))' }}
          >
            <div />
            {DAYS.map((day) => (
              <div
                key={day}
                className="bg-white px-2 py-2 text-center text-xs font-semibold text-gray-700"
              >
                {day}
              </div>
            ))}
            {HOUR_STARTS.map((start) => (
              <Fragment key={start}>
                <div className="bg-white px-1 py-2 text-center text-xs text-gray-400">
                  {start}
                </div>
                {DAYS.map((day) => (
                  <GridCell
                    key={`${day}-${start}`}
                    day={day}
                    start={start}
                    covering={entryAt(day, start)}
                    onOpen={() => openEditor(day, start)}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {entries.length} class{entries.length === 1 ? '' : 'es'}
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveTimetable()}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save timetable'}
          </button>
        </div>
      </div>

      {editor && form ? (
        <EditorModal
          form={form}
          formError={formError}
          existing={entryAt(editor.day, editor.start)}
          group={group}
          onChange={updateForm}
          onSave={handleSlotSubmit}
          onDelete={handleDeleteSlot}
          onCancel={() => setEditor(null)}
        />
      ) : null}
    </main>
  )
}