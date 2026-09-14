import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, writeBatch } from 'firebase/firestore'
import { DEFAULT_CALENDAR, HOLIDAYS } from '../src/data/calendar'

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const missing = required.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error(
    `Missing ${missing.join(', ')} in .env\n` +
      'Copy .env.example → .env and fill in your Firebase project values.',
  )
  process.exit(1)
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

const db = getFirestore(app)

const batch = writeBatch(db)

batch.set(doc(db, 'config', 'academicCalendar'), DEFAULT_CALENDAR)

for (const holiday of HOLIDAYS) {
  batch.set(doc(db, 'config', 'holidays', holiday.date), holiday)
}

await batch.commit()

console.log(`Seeded config/academicCalendar (${DEFAULT_CALENDAR.semesterLabel})`)
console.log(`Seeded ${HOLIDAYS.length} holidays to config/holidays`)