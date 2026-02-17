# RentWise Frontend

Frontend prototype built with React, TypeScript, Vite, and MUI.

## Key Features

- Three-step flow: `Profile -> Constraints -> Dashboard`
- Auto-generated recommendation weights from user profile and constraints
- Manual weight tuning with real-time personalized score recalculation
- Side-by-side neighborhood comparison:
  - Objective API metrics
  - AI-generated Reddit perception summaries
- Structured trade-off summary output
- Missing-data tolerance (`null` metrics are excluded from weighted scoring)

## Tech Stack

- React 19
- TypeScript 5
- Vite 7
- MUI 7 (Material UI)
- ESLint 9

## Quick Start

### 1) Install dependencies

```bash
npm ci
```

### 2) Run the development server

```bash
npm run dev
```

Default local URL:

- `http://127.0.0.1:5173`

### 3) Build for production

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

### 5) Run lint checks

```bash
npm run lint
```

## NPM Registry Troubleshooting

If you see `ENOTFOUND mirrors.cloud.tencent.com` (or similar), your npm registry is likely set to an unreachable mirror.
Switch back to the official registry:

```bash
npm config set registry https://registry.npmjs.org
```

Then run:

```bash
npm ci
```

## Project Structure

```text
Rentwise-Frontend/
├─ public/
├─ src/
│  ├─ App.tsx
│  ├─ App.css
│  ├─ index.css
│  └─ main.tsx
├─ index.html
├─ package.json
└─ vite.config.ts
```
