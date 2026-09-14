import { useState, type FormEvent } from 'react'
import { BRANCHES, GROUPS, SEMESTERS } from '../types'
import type { Branch, Group, OnboardingInputs } from '../types'

interface OnboardingScreenProps {
  onComplete: (inputs: OnboardingInputs) => void
  error?: string | null
}

const initialValues: OnboardingInputs = {
  name: '',
  semester: SEMESTERS[0],
  branch: BRANCHES[0],
  section: '',
  group: GROUPS[0],
}

type FieldErrors = Partial<Record<keyof OnboardingInputs, string>>

function validate(values: OnboardingInputs): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.name.trim()) {
    errors.name = 'Name is required'
  }
  if (!values.semester) {
    errors.semester = 'Semester is required'
  }
  if (!values.branch) {
    errors.branch = 'Branch is required'
  }
  if (!values.section.trim()) {
    errors.section = 'Section is required'
  }
  if (!values.group) {
    errors.group = 'Group is required'
  }
  return errors
}

export default function OnboardingScreen({ onComplete, error }: OnboardingScreenProps) {
  const [values, setValues] = useState<OnboardingInputs>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})

  const setField = <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      onComplete(values)
    }
  }

  const inputClass =
    'rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
  const errorClass = 'border-red-500 focus:border-red-500 focus:ring-red-200'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-bold text-indigo-600">
          Set up your profile
        </h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Tell us who you are — one time setup
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Name
            <input
              type="text"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className={`${inputClass} ${errors.name ? errorClass : ''}`}
            />
            {errors.name ? <span className="text-xs text-red-600">{errors.name}</span> : null}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Semester
              <select
                value={values.semester}
                onChange={(e) => setField('semester', Number(e.target.value))}
                className={inputClass}
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Group
              <select
                value={values.group}
                onChange={(e) => setField('group', e.target.value as Group)}
                className={inputClass}
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    Group {g}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Branch
            <select
              value={values.branch}
              onChange={(e) => setField('branch', e.target.value as Branch)}
              className={inputClass}
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Section
            <input
              type="text"
              value={values.section}
              onChange={(e) => setField('section', e.target.value)}
              placeholder="e.g. A"
              className={`${inputClass} ${errors.section ? errorClass : ''}`}
            />
            {errors.section ? <span className="text-xs text-red-600">{errors.section}</span> : null}
          </label>

          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
          >
            Finish setup
          </button>
        </form>
      </div>
    </main>
  )
}