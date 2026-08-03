# NEXA Store OS (v2)

Offline-first point-of-sale and store management platform for Nigerian retail,
restaurant and wholesale businesses. Built with React 19, Vite 7, Tailwind CSS 4
and Firebase (Firestore, Auth, Functions, Storage).

## Production branch

> **`feature/system-admin-workflow` is the production / live branch.**

All production deploys on Vercel are triggered by pushes to
`feature/system-admin-workflow`. Pushes to `main` (or any other branch) will
**not** redeploy the live app.

### Deploying to production

```bash
git push origin feature/system-admin-workflow
```

The Vercel project runs `npm run build` and serves the `dist/` output.

## Tech stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, React Router 7, TanStack Query
- **Backend:** Firebase (Firestore, Auth, Cloud Functions, Storage)
- **Build:** Vite 7 (build-time service worker for offline navigation)
- **Offline:** Firestore `persistentLocalCache` (IndexedDB) + PWA service worker

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Firebase credentials
npm run dev            # http://localhost:8080
```

## Commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | Production build to `dist/`          |
| `npm run lint`    | Run ESLint                           |
| `npx tsc --noEmit`| Type-check the codebase              |

## Deployment

1. Commit and push your changes to `feature/system-admin-workflow`.
2. Vercel picks up the push and runs `npm run build` automatically.
3. The built `dist/` folder is served as the live app.

> See `docs/deployment_guide.md` for detailed deployment notes.
