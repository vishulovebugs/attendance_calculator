import type { UserProfile } from '../types'

interface DashboardScreenProps {
  profile: UserProfile
  onOpenSettings?: () => void
  onOpenTimetable?: () => void
  onOpenAttendance?: () => void
}

export default function DashboardScreen({
  profile,
  onOpenSettings,
  onOpenTimetable,
  onOpenAttendance,
}: DashboardScreenProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium text-indigo-600">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Welcome back, {profile.name}!
        </h1>
        <p className="mt-3 text-gray-600">
          Your attendance tracker is on its way. Subjects, labs, and timetable
          will show up here in upcoming phases.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3 text-left">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Branch</p>
            <p className="mt-1 font-semibold text-gray-900">{profile.branch}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Section</p>
            <p className="mt-1 font-semibold text-gray-900">{profile.section}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Group</p>
            <p className="mt-1 font-semibold text-gray-900">{profile.group}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onOpenAttendance ? (
            <button
              type="button"
              onClick={onOpenAttendance}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Mark attendance
            </button>
          ) : null}
          {onOpenTimetable ? (
            <button
              type="button"
              onClick={onOpenTimetable}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Edit timetable
            </button>
          ) : null}
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Settings
            </button>
          ) : null}
        </div>
      </div>
    </main>
  )
}