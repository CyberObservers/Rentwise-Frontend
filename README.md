# RentWise Frontend

React + TypeScript + Vite + MUI frontend for the RentWise neighborhood comparison tool (Irvine, CA).

## Feature Flow

A four-step wizard:

1. **Explore** (`ProfileForm`) — Google Map of Irvine neighborhoods, neighborhood autocomplete, and an LLM chat panel. The chat calls the backend `POST /chat` (OpenAI gpt-4o-mini) to turn natural language into preference weights across five dimensions (safety, transit, convenience, parking, environment). When any dimension deviates from the default, the **Apply** button unlocks and ranks neighborhoods by weighted score.
2. **Insights** (`ConstraintsForm`) — per-metric cards showing the selected neighborhood's raw backend metrics plus top driver dimensions.
3. **Compare** (`Dashboard`) — side-by-side comparison of two neighborhoods with live weight sliders, server-side comparison summary, and recommendation.
4. **Reviews** (`ReviewPage` / `CommunityReviews`) — YouTube and Google Maps reviews for each community, with a word-cloud-driven keyword filter.

Missing data is tolerated: `null` metrics are excluded from weighted scoring.

## Tech Stack

React 19, TypeScript 5, Vite 7, MUI 7, d3-cloud, ESLint 9.

## Quick Start

```bash
npm ci
npm run dev           # http://localhost:5173
```

Also useful:

```bash
npm run build         # tsc -b && vite build
npm run preview       # preview the production build
npm run lint          # ESLint
```

## Environment

Create a `.env` (or `.env.local`) in this directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
```

- `VITE_API_BASE_URL` — backend base URL. If omitted, the app falls back to `http://localhost:8000`.
- `VITE_GOOGLE_MAPS_API_KEY` — required for the interactive map in Step 1. Without it the map area shows an error banner.

The frontend expects the [Rentwise-Backend](../Rentwise-Backend) to be running. If the backend is unreachable, the app gracefully falls back to the hardcoded neighborhood data in `src/data.ts`.

## NPM Registry Troubleshooting

If `npm ci` errors with `ENOTFOUND mirrors.cloud.tencent.com` or similar, your registry is set to an unreachable mirror:

```bash
npm config set registry https://registry.npmjs.org
npm ci
```

## Project Structure

```text
src/
  main.tsx           # entry
  App.tsx            # wizard state + step orchestration
  api.ts             # backend fetch helpers + scoring mapping + postChat
  logic.ts           # scoreNeighborhood, weight normalization, top drivers
  data.ts            # hardcoded neighborhood fallback data
  types.ts           # Dimension, Neighborhood, dimensionLabels
  components/
    ProfileForm.tsx       # Step 1 (map + LLM chat)
    ConstraintsForm.tsx   # Step 2
    Dashboard.tsx         # Step 3 (comparison)
    ReviewPage.tsx        # Step 4
    CommunityReviews.tsx  # review list + word cloud filter
    NavigationStepper.tsx
    Header.tsx
  types/d3-cloud.d.ts
index.html
vite.config.ts
```
