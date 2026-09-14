# USICT Attendance

PWA for attendance calculation for students of USICT. Built with Vite + React + TypeScript + Tailwind CSS, installable to home screen (no native build). Backend: Supabase (Auth + PostgreSQL).

## Stack

- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS v4
- **PWA**: vite-plugin-pwa (manifest + service worker, Add to Home Screen)
- **Testing**: Vitest + React Testing Library
- **Backend (future)**: Supabase Auth + PostgreSQL
- **Deploy**: Vercel

## Commands

```
npm run dev        # dev server
npm run build      # typecheck + production build
npm run test       # run tests once
npm run test:watch # watch mode
npm run lint       # oxlint
npm run preview    # preview production build
```

## Phases

- **Phase 0** (current): scaffold, PWA config, Vitest + RTL, Vercel deploy