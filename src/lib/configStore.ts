import { collection, doc, getDoc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import type { AcademicCalendar, Holiday } from '../data/calendar'
import { DEFAULT_CALENDAR, HOLIDAYS } from '../data/calendar'
import { db } from './firebase'

const CONFIG_COLLECTION = 'config'
const CALENDAR_DOC = 'academicCalendar'
const HOLIDAYS_COLLECTION = 'holidays'

export async function getAcademicCalendar(): Promise<AcademicCalendar> {
  const snapshot = await getDoc(doc(db, CONFIG_COLLECTION, CALENDAR_DOC))
  if (!snapshot.exists()) return DEFAULT_CALENDAR
  return snapshot.data() as AcademicCalendar
}

export async function updateAcademicCalendar(calendar: AcademicCalendar): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, CALENDAR_DOC), calendar)
}

export async function getHolidays(): Promise<Holiday[]> {
  const snapshot = await getDocs(collection(db, CONFIG_COLLECTION, HOLIDAYS_COLLECTION))
  return snapshot.docs.map((d) => d.data() as Holiday)
}

export function onAcademicCalendarSnapshot(
  onData: (calendar: AcademicCalendar) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(db, CONFIG_COLLECTION, CALENDAR_DOC),
    (snap) =>
      onData(snap.exists() ? (snap.data() as AcademicCalendar) : DEFAULT_CALENDAR),
    (error) => onError?.(error),
  )
}

export async function seedConfig(): Promise<void> {
  await updateAcademicCalendar(DEFAULT_CALENDAR)
  await Promise.all(
    HOLIDAYS.map((h) => setDoc(doc(db, CONFIG_COLLECTION, HOLIDAYS_COLLECTION, h.date), h)),
  )
}