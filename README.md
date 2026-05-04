# Meal-IT!!

A production-style web app for **meal planning**, **nutrition logging**, **food photo analysis**, and an AI **Chef** assistant. Built with **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS**, and **PostgreSQL** via **Prisma**.

---

## Features

| Area | Description |
|------|-------------|
| **Chef chat** | Full-screen conversational assistant with sessions, message history, voice input (where supported), and browser text-to-speech. |
| **Meal planner** | Intake flow → planner chat; save drafts and planner replies locally for reuse. |
| **Nutrition tracker** | Client-side macro and calorie logging with totals (no server persistence). |
| **Food tracker** | Upload a meal photo; dish classification and estimated nutrition via the **Food AI** HTTP service (optional local CNN pipeline). |
| **Recipes & RAG** | Recipe catalogue in Postgres with optional embeddings for similarity-style retrieval. |
| **Site guide** | Floating in-app assistant for help across routes. |

For architecture, API routes, env vars, and file index, see **`PROJECT_DOCUMENTATION.txt`** in this folder.

---

## Tech stack

- **Framework:** Next.js 16, React 19  
- **Language:** TypeScript  
- **Styling:** Tailwind CSS v4, design tokens (`app/globals.css`)  
- **Database:** PostgreSQL + Prisma (`prisma/schema.prisma`)  
- **Icons:** Tabler Icons  

---

## Prerequisites

- **Node.js** (LTS recommended)  
- **PostgreSQL** with a valid `DATABASE_URL`  
- Optional: **Python** environment for the local Food AI server (`npm run food-ai:*`)  

---

## Environment variables

Create a `.env` (or `.env.local`) with at least:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string for Prisma |
| `GEMINI_API_KEY` | Chef chat, meal planner, site guide, and other conversational AI routes |

Optional:

| Variable | Purpose |
|----------|---------|
| `GEMINI_MODEL` | Override default Gemini model id |
| `FOOD_AI_SERVICE_URL` | Food AI service base URL (default `http://127.0.0.1:8788`) |

---

## Setup

```bash
npm install
npx prisma migrate deploy
```

Seed or load recipe data only if your deployment expects it (see `scripts/` and `PROJECT_DOCUMENTATION.txt`).

---

## Development

```bash
npm run dev
```

Open **http://localhost:3000**.

**Quality gate:**

```bash
npm run lint
npm run build
# or
npm run verify
```

---

## Food AI (optional, local)

For photo analysis via the dedicated ML service:

```bash
npm run food-ai:dev
```

Use `npm run food-ai:venv:win` or `npm run food-ai:venv` to prepare the Python environment, and the `food-ai:init-*` scripts if you need demo model assets (see `PROJECT_DOCUMENTATION.txt`).

---

## Deployment notes

- Set **`DATABASE_URL`** and run **`npx prisma migrate deploy`** on the host.  
- **`GEMINI_API_KEY`** is required for AI chat and site-guide behaviour where those routes call Google Generative AI.  
- The Food AI service is separate; configure **`FOOD_AI_SERVICE_URL`** if the classifier runs remotely instead of on localhost.

---

## Credits

As shown in-app: **Sanidhya, Rajnish, Sachet, Aayush**.

---

## License

Private project (`"private": true` in `package.json`). Adjust if you publish or open-source.
