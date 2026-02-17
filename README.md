# RentWise Frontend

RentWise is a frontend prototype built with React, TypeScript, Vite, and MUI.
It focuses on explainable neighborhood comparison by showing objective metrics and AI-generated Reddit perception summaries side by side.

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

Default local URL (usually):

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

## Implemented Frontend Improvements

- Updated visual theme with clearer color hierarchy and card styling
- Improved typography for better readability and information hierarchy
- Added dashboard explainability enhancements (weight snapshot + top drivers)
- Improved interaction flow:
  - One-click recommended weight application
  - One-click weight reset
  - Warning when both sides select the same neighborhood
- Better mobile readability with responsive spacing and button layout

## Suggested Next Steps

- Connect to real backend APIs and authentication
- Add comparison history (save weight/profile snapshots)
- Add confidence and data freshness indicators to scoring
- Add end-to-end tests (Playwright)

## License

For course and prototype demonstration use only.
